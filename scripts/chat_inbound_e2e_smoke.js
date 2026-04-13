#!/usr/bin/env node
require('dotenv').config()

const crypto = require('crypto')
const http = require('http')
const jwt = require('jsonwebtoken')
const { PrismaClient } = require('@prisma/client')
const { OPENCLAW_CONTRACT_VERSION } = require('../server/openclaw_contract')

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

async function requestJson(baseUrl, path, { method = 'GET', token = null, tenantCode = null, body = null } = {}) {
  const headers = { 'content-type': 'application/json' }
  if (token) headers.authorization = `Bearer ${token}`
  if (tenantCode) headers['x-tenant-code'] = tenantCode
  headers['idempotency-key'] = `chat-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

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

function startOpenClawMock(expectedToken) {
  const server = http.createServer((req, res) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => {
      if (req.headers['x-openclaw-internal-token'] !== expectedToken) {
        res.writeHead(401, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ error: 'unauthorized' }))
        return
      }

      if (req.method !== 'POST') {
        res.writeHead(405, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ error: 'method_not_allowed' }))
        return
      }

      if (req.url === '/riderra/order-draft/classify') {
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify({
          contract_version: OPENCLAW_CONTRACT_VERSION,
          result: { class: 'answer', confidence: 0.93, requires_human: false }
        }))
        return
      }

      if (req.url === '/riderra/order-draft/extract-validate') {
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify({
          contract_version: OPENCLAW_CONTRACT_VERSION,
          result: {
            valid: true,
            confidence: 0.94,
            field: 'luggage',
            value: '2 suitcases',
            reason: null
          }
        }))
        return
      }

      res.writeHead(404, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ error: 'not_found' }))
    })
  })

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${address.port}`
      })
    })
  })
}

async function main() {
  const jwtSecret = process.env.JWT_SECRET || 'ci-jwt-secret'
  const tenantCode = process.env.TENANT_CODE || 'riderra'
  const mockToken = `mock-${crypto.randomUUID()}`

  const previousRuntimeBase = process.env.OPENCLAW_RUNTIME_BASE_URL
  const previousRuntimeToken = process.env.OPENCLAW_RUNTIME_TOKEN

  const tenant = await prisma.tenant.upsert({
    where: { code: tenantCode },
    update: { isActive: true, name: 'Riderra' },
    create: { code: tenantCode, name: 'Riderra', isActive: true }
  })

  const [permOpsManage, permOrdersRead] = await Promise.all([
    ensurePermission('ops.manage', 'Operate orders'),
    ensurePermission('orders.read', 'Read orders')
  ])

  const role = await prisma.role.create({
    data: { code: `ci_chat_ops_${Date.now()}`, name: `CI Chat Ops ${Date.now()}` }
  })
  await prisma.rolePermission.createMany({
    data: [
      { roleId: role.id, permissionId: permOpsManage.id },
      { roleId: role.id, permissionId: permOrdersRead.id }
    ]
  })

  const user = await prisma.user.create({
    data: {
      email: `ci-chat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`,
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

  const order = await prisma.order.create({
    data: {
      tenantId: tenant.id,
      source: 'chat_e2e_smoke',
      externalKey: `chat-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      fromPoint: 'Airport',
      toPoint: 'Hotel',
      clientPrice: 150,
      vehicleType: 'standard',
      status: 'pending_dispatch',
      needsInfo: true,
      infoReason: 'Уточнить багаж'
    }
  })

  const agent = await prisma.chatAgentConfig.create({
    data: {
      tenantId: tenant.id,
      code: `ci_clarifier_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: 'CI Clarifier',
      type: 'order_completion',
      taskType: 'clarification',
      promptText: 'CI prompt',
      isActive: true,
      requiresApproval: true
    }
  })

  const task = await prisma.chatTask.create({
    data: {
      tenantId: tenant.id,
      orderId: order.id,
      taskType: 'clarification',
      state: 'request_sent',
      priority: 1,
      channel: 'telegram',
      agentConfigId: agent.id,
      agentPaused: false
    }
  })

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, jwtSecret, { expiresIn: '10m' })

  let appServer = null
  let mock = null
  try {
    mock = await startOpenClawMock(mockToken)
    process.env.OPENCLAW_RUNTIME_BASE_URL = mock.baseUrl
    process.env.OPENCLAW_RUNTIME_TOKEN = mockToken

    const app = require('../server/index')
    appServer = app.listen(0)
    const appPort = appServer.address().port
    const baseUrl = `http://127.0.0.1:${appPort}`

    const inbound = await requestJson(baseUrl, `/api/admin/chats/tasks/${task.id}/inbound`, {
      method: 'POST',
      token,
      tenantCode,
      body: { bodyText: 'Багаж: 2 больших чемодана.' }
    })

    assert(inbound.status === 200, `expected 200 from inbound API, got ${inbound.status}`)
    assert(inbound.data?.classification?.class === 'answer', 'classification must be answer')
    assert(inbound.data?.extraction?.valid === true, 'extraction must be valid=true')
    assert(inbound.data?.taskState === 'order_complete', `expected taskState=order_complete, got ${inbound.data?.taskState}`)
    assert(inbound.data?.orderUpdate?.needsInfo === false, 'orderUpdate.needsInfo must be false')

    const orderAfter = await prisma.order.findUnique({ where: { id: order.id } })
    const taskAfter = await prisma.chatTask.findUnique({ where: { id: task.id } })
    assert(orderAfter && orderAfter.needsInfo === false, 'order.needsInfo must be false after inbound')
    assert(taskAfter && String(taskAfter.state) === 'order_complete', `chatTask.state must be order_complete, got ${taskAfter?.state}`)

    console.log(JSON.stringify({
      ok: true,
      checks: 7,
      taskState: taskAfter.state,
      classification: inbound.data.classification,
      extraction: inbound.data.extraction
    }))
  } finally {
    if (appServer) appServer.close()
    if (mock && mock.server) mock.server.close()

    if (previousRuntimeBase === undefined) delete process.env.OPENCLAW_RUNTIME_BASE_URL
    else process.env.OPENCLAW_RUNTIME_BASE_URL = previousRuntimeBase
    if (previousRuntimeToken === undefined) delete process.env.OPENCLAW_RUNTIME_TOKEN
    else process.env.OPENCLAW_RUNTIME_TOKEN = previousRuntimeToken

    await prisma.chatMessage.deleteMany({ where: { chatTaskId: task.id } })
    await prisma.chatTask.deleteMany({ where: { id: task.id } })
    await prisma.chatAgentConfig.deleteMany({ where: { id: agent.id } })
    await prisma.orderStatusHistory.deleteMany({ where: { orderId: order.id } })
    await prisma.order.deleteMany({ where: { id: order.id } })
    await prisma.tenantMembership.deleteMany({ where: { userId: user.id } })
    await prisma.userRole.deleteMany({ where: { userId: user.id } })
    await prisma.user.deleteMany({ where: { id: user.id } })
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } })
    await prisma.role.deleteMany({ where: { id: role.id } })
    await prisma.$disconnect()
  }
}

main().catch(async (error) => {
  console.error(error)
  process.exitCode = 1
  await prisma.$disconnect()
})
