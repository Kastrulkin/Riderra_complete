#!/usr/bin/env node
require('dotenv').config()

const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function ensurePermission(code, name = code) {
  return prisma.permission.upsert({
    where: { code },
    update: { name },
    create: { code, name }
  })
}

async function requestJson(baseUrl, path, { method = 'GET', token = null, tenantCode = null, idempotencyKey = null, body = null } = {}) {
  const headers = { 'content-type': 'application/json' }
  if (token) headers.authorization = `Bearer ${token}`
  if (tenantCode) headers['x-tenant-code'] = tenantCode
  if (idempotencyKey) headers['idempotency-key'] = idempotencyKey

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  })

  const text = await response.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch (_) {
    data = { raw: text }
  }
  return { status: response.status, data }
}

async function main() {
  const jwtSecret = process.env.JWT_SECRET || 'ci-jwt-secret'
  const tenantCode = process.env.TENANT_CODE || 'riderra'
  const app = require('../server/index')

  const tenant = await prisma.tenant.upsert({
    where: { code: tenantCode },
    update: { isActive: true, name: 'Riderra' },
    create: { code: tenantCode, name: 'Riderra', isActive: true }
  })

  const permission = await ensurePermission('settings.manage', 'Manage settings and integrations')
  const role = await prisma.role.create({
    data: { code: `ci_agent_consistency_${Date.now()}`, name: `CI Agent Consistency ${Date.now()}` }
  })
  await prisma.rolePermission.create({
    data: {
      roleId: role.id,
      permissionId: permission.id
    }
  })

  const user = await prisma.user.create({
    data: {
      email: `ci-agent-consistency-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`,
      password: crypto.randomUUID(),
      role: 'staff',
      isActive: true,
      abacCountries: 'all',
      abacCities: 'all',
      abacTeams: 'all'
    }
  })

  await prisma.userRole.create({ data: { userId: user.id, roleId: role.id } })
  await prisma.tenantMembership.create({
    data: {
      tenantId: tenant.id,
      userId: user.id,
      role: 'staff',
      isActive: true
    }
  })

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, jwtSecret, { expiresIn: '10m' })
  const server = app.listen(0)
  const baseUrl = `http://127.0.0.1:${server.address().port}`

  const code = `ci_agent_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  let createdAgentId = null

  try {
    const createBody = {
      code,
      name: 'CI Agent',
      type: 'order_completion',
      taskType: 'clarification',
      promptText: 'CI prompt',
      workflow: { version: 1, steps: ['draft'] },
      restrictions: { channel: 'telegram' },
      variables: { tone: 'short' },
      isActive: true,
      requiresApproval: true
    }

    const createKey = `ci-agent-create-${Date.now()}`
    const firstCreate = await requestJson(baseUrl, '/api/admin/ai-agents', {
      method: 'POST',
      token,
      tenantCode,
      idempotencyKey: createKey,
      body: createBody
    })
    assert(firstCreate.status === 200, `first create expected 200, got ${firstCreate.status}`)
    assert(firstCreate.data?.agent?.id, 'first create must return agent.id')
    assert(firstCreate.data?.idempotent === false, 'first create must not be idempotent replay')
    createdAgentId = firstCreate.data.agent.id

    const secondCreate = await requestJson(baseUrl, '/api/admin/ai-agents', {
      method: 'POST',
      token,
      tenantCode,
      idempotencyKey: createKey,
      body: createBody
    })
    assert(secondCreate.status === 200, `second create expected 200, got ${secondCreate.status}`)
    assert(secondCreate.data?.agent?.id === createdAgentId, 'idempotent create must return same agent id')
    assert(secondCreate.data?.idempotent === true, 'second create must be idempotent replay')

    const updateBody = {
      name: 'CI Agent Updated',
      workflow: { version: 2, steps: ['draft', 'approval'] },
      variables: { tone: 'short', locale: 'ru' }
    }
    const updateKey = `ci-agent-update-${Date.now()}`
    const firstUpdate = await requestJson(baseUrl, `/api/business/${tenant.code}/ai-agents/manage/${createdAgentId}`, {
      method: 'PUT',
      token,
      tenantCode,
      idempotencyKey: updateKey,
      body: updateBody
    })
    assert(firstUpdate.status === 200, `first update expected 200, got ${firstUpdate.status}`)
    assert(firstUpdate.data?.agent?.name === 'CI Agent Updated', 'first update must apply new name')
    assert(firstUpdate.data?.idempotent === false, 'first update must not be replay')

    const secondUpdate = await requestJson(baseUrl, `/api/business/${tenant.code}/ai-agents/manage/${createdAgentId}`, {
      method: 'PUT',
      token,
      tenantCode,
      idempotencyKey: updateKey,
      body: updateBody
    })
    assert(secondUpdate.status === 200, `second update expected 200, got ${secondUpdate.status}`)
    assert(secondUpdate.data?.agent?.id === createdAgentId, 'idempotent update must return same agent id')
    assert(secondUpdate.data?.idempotent === true, 'second update must be idempotent replay')

    const deleteKey = `ci-agent-delete-${Date.now()}`
    const firstDelete = await requestJson(baseUrl, `/api/admin/ai-agents/${createdAgentId}`, {
      method: 'DELETE',
      token,
      tenantCode,
      idempotencyKey: deleteKey
    })
    assert(firstDelete.status === 200, `first delete expected 200, got ${firstDelete.status}`)
    assert(firstDelete.data?.idempotent === false, 'first delete must not be replay')

    const secondDelete = await requestJson(baseUrl, `/api/admin/ai-agents/${createdAgentId}`, {
      method: 'DELETE',
      token,
      tenantCode,
      idempotencyKey: deleteKey
    })
    assert(secondDelete.status === 200, `second delete expected 200, got ${secondDelete.status}`)
    assert(secondDelete.data?.idempotent === true, 'second delete must be idempotent replay')

    const remaining = await prisma.chatAgentConfig.count({
      where: { tenantId: tenant.id, code }
    })
    assert(remaining === 0, `agent row must be deleted, found ${remaining}`)

    const auditCount = await prisma.auditLog.count({
      where: {
        tenantId: tenant.id,
        action: {
          in: ['admin.ai_agent.create', 'business.ai_agent.update', 'admin.ai_agent.delete']
        }
      }
    })
    assert(auditCount >= 3, `expected at least 3 audit log rows, got ${auditCount}`)

    console.log(JSON.stringify({ ok: true, checks: 8 }))
  } finally {
    server.close()
    await prisma.chatAgentConfig.deleteMany({ where: { tenantId: tenant.id, code } })
    await prisma.idempotencyKey.deleteMany({
      where: {
        tenantId: tenant.id,
        action: { in: ['admin.ai_agent.create', 'business.ai_agent.update', 'admin.ai_agent.delete'] }
      }
    })
    await prisma.auditLog.deleteMany({
      where: {
        tenantId: tenant.id,
        action: { in: ['admin.ai_agent.create', 'business.ai_agent.update', 'admin.ai_agent.delete'] }
      }
    })
    await prisma.tenantMembership.deleteMany({ where: { userId: user.id } })
    await prisma.userRole.deleteMany({ where: { userId: user.id } })
    await prisma.user.delete({ where: { id: user.id } })
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } })
    await prisma.role.delete({ where: { id: role.id } })
    await prisma.$disconnect()
  }
}

main().catch(async (error) => {
  console.error(error)
  process.exitCode = 1
  await prisma.$disconnect()
})
