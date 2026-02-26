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

async function requestJson(baseUrl, path, {
  method = 'GET',
  token = null,
  tenantCode = null,
  traceId = null,
  idempotencyKey = null,
  body = null
} = {}) {
  const headers = { 'content-type': 'application/json' }
  if (token) headers.authorization = `Bearer ${token}`
  if (tenantCode) headers['x-tenant-code'] = tenantCode
  if (traceId) headers['x-trace-id'] = traceId
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
  const app = require('../server/index')

  const tenant = await prisma.tenant.upsert({
    where: { code: process.env.TENANT_CODE || 'riderra' },
    update: { isActive: true, name: 'Riderra' },
    create: { code: process.env.TENANT_CODE || 'riderra', name: 'Riderra', isActive: true }
  })

  const permission = await ensurePermission('settings.manage', 'Manage settings and integrations')
  const roleCode = `ci_audit_${Date.now()}`
  const role = await prisma.role.create({ data: { code: roleCode, name: `CI Audit ${Date.now()}` } })
  await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } })

  const user = await prisma.user.create({
    data: {
      email: `ci-audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`,
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
    data: { tenantId: tenant.id, userId: user.id, role: 'staff', isActive: true }
  })

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, jwtSecret, { expiresIn: '10m' })

  const appServer = app.listen(0)
  const port = appServer.address().port
  const baseUrl = `http://127.0.0.1:${port}`

  const sourceName = `CI Audit ${Date.now()}`
  const traceId = `ci-audit-trace-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

  try {
    const created = await requestJson(baseUrl, '/api/admin/sheet-sources', {
      method: 'POST',
      token,
      tenantCode: tenant.code,
      traceId,
      idempotencyKey: `ci-audit-idem-${Date.now()}`,
      body: {
        name: sourceName,
        monthLabel: '2026-02',
        googleSheetId: '1RK8Vgz5C4yta6AMAn0EVbHLrL1GynmUrObRZwd8epyY',
        tabName: 'таблица',
        detailsTabName: 'подробности'
      }
    })

    assert(created.status === 200, `expected 200 from create sheet source, got ${created.status}`)
    assert(created.data && created.data.id, 'sheet source id missing')

    const logs = await prisma.auditLog.findMany({
      where: {
        tenantId: tenant.id,
        traceId,
        action: 'sheet_source.create',
        resource: 'sheet_source',
        resourceId: created.data.id
      }
    })

    assert(logs.length === 1, `expected one audit row for traceId, got ${logs.length}`)
    assert(logs[0].result === 'ok', `expected audit result=ok, got ${logs[0].result}`)

    console.log(JSON.stringify({ ok: true, checks: 3 }))
  } finally {
    appServer.close()
    await prisma.auditLog.deleteMany({ where: { tenantId: tenant.id, traceId } })
    await prisma.sheetSource.deleteMany({ where: { tenantId: tenant.id, name: sourceName } })
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
