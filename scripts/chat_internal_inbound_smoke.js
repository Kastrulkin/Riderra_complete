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

async function requestJson(baseUrl, path, { method = 'GET', token = null, tenantCode = null, internalToken = null, body = null, idempotencyKey = null } = {}) {
  const headers = { 'content-type': 'application/json' }
  if (token) headers.authorization = `Bearer ${token}`
  if (tenantCode) headers['x-tenant-code'] = tenantCode
  if (internalToken) headers['x-openclaw-internal-token'] = internalToken
  headers['idempotency-key'] = idempotencyKey || `chat-internal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

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
  const stats = { requestKinds: [] }
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
        stats.requestKinds.push('classify')
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify({
          contract_version: OPENCLAW_CONTRACT_VERSION,
          result: { class: 'answer', confidence: 0.91, requires_human: false }
        }))
        return
      }

      if (req.url === '/riderra/order-draft/extract-validate') {
        stats.requestKinds.push('extract')
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify({
          contract_version: OPENCLAW_CONTRACT_VERSION,
          result: {
            valid: true,
            confidence: 0.92,
            field: 'luggage',
            value: '1 suitcase',
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
      resolve({ server, stats, baseUrl: `http://127.0.0.1:${address.port}` })
    })
  })
}

async function main() {
  const jwtSecret = process.env.JWT_SECRET || 'ci-jwt-secret'
  const tenantCode = process.env.TENANT_CODE || 'riderra'
  const runtimeToken = `runtime-${crypto.randomUUID()}`
  const internalToken = `internal-${crypto.randomUUID()}`

  const previousRuntimeBase = process.env.OPENCLAW_RUNTIME_BASE_URL
  const previousRuntimeToken = process.env.OPENCLAW_RUNTIME_TOKEN
  const previousInternalToken = process.env.OPENCLAW_INTERNAL_TOKEN

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
    data: { code: `ci_chat_internal_${Date.now()}`, name: `CI Chat Internal ${Date.now()}` }
  })
  await prisma.rolePermission.createMany({
    data: [
      { roleId: role.id, permissionId: permOpsManage.id },
      { roleId: role.id, permissionId: permOrdersRead.id }
    ]
  })

  const user = await prisma.user.create({
    data: {
      email: `ci-chat-internal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`,
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
      source: 'chat_internal_smoke',
      externalKey: `chat-internal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      fromPoint: 'Airport',
      toPoint: 'Hotel',
      clientPrice: 140,
      vehicleType: 'standard',
      status: 'pending_dispatch',
      needsInfo: true,
      infoReason: 'Уточнить багаж'
    }
  })

  const agent = await prisma.chatAgentConfig.create({
    data: {
      tenantId: tenant.id,
      code: `ci_internal_clarifier_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: 'CI Internal Clarifier',
      type: 'order_completion',
      taskType: 'clarification',
      promptText: 'CI internal prompt',
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
      channel: 'whatsapp',
      agentConfigId: agent.id,
      agentPaused: false
    }
  })

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, jwtSecret, { expiresIn: '10m' })

  let appServer = null
  let mock = null
  try {
    mock = await startOpenClawMock(runtimeToken)
    process.env.OPENCLAW_RUNTIME_BASE_URL = mock.baseUrl
    process.env.OPENCLAW_RUNTIME_TOKEN = runtimeToken
    process.env.OPENCLAW_INTERNAL_TOKEN = internalToken

    const app = require('../server/index')
    appServer = app.listen(0)
    const appPort = appServer.address().port
    const baseUrl = `http://127.0.0.1:${appPort}`

    const unauthorized = await requestJson(baseUrl, '/api/internal/chats/inbound', {
      method: 'POST',
      tenantCode,
      internalToken: 'wrong-token',
      body: { taskId: task.id, bodyText: 'Багаж: 1 чемодан.' }
    })
    assert(unauthorized.status === 401, `expected 401 for wrong internal token, got ${unauthorized.status}`)

    const inboundKey = `chat-internal-inbound-${crypto.randomUUID()}`
    const inboundBody = {
      taskId: task.id,
      bodyText: 'Багаж: 1 чемодан.',
      channel: 'whatsapp',
      externalMessageId: `wa-${crypto.randomUUID()}`,
      from: '+79214224843'
    }
    const inbound = await requestJson(baseUrl, '/api/internal/chats/inbound', {
      method: 'POST',
      tenantCode,
      internalToken,
      body: inboundBody,
      idempotencyKey: inboundKey
    })
    assert(inbound.status === 200, `expected 200 from internal inbound API, got ${inbound.status}`)
    assert(inbound.data?.success === true, 'internal inbound must return success=true')
    assert(inbound.data?.taskState === 'pending_update_approval', `expected taskState=pending_update_approval, got ${inbound.data?.taskState}`)
    assert(inbound.data?.pendingOrderPatch?.needsInfo === false, 'pendingOrderPatch.needsInfo must be false')
    assert(inbound.data?.pendingOrderPatch?.luggage === 1, `pendingOrderPatch.luggage must be 1, got ${inbound.data?.pendingOrderPatch?.luggage}`)
    assert(inbound.data?.acknowledgementDraft?.approvalStatus === 'pending_human', 'clear answer must create thank-you draft for human approval')
    assert(inbound.data?.acknowledgementDraft?.bodyText?.startsWith('Thank you!'), 'thank-you draft must be customer-facing')

    const acknowledgementBody = JSON.parse(inbound.data?.acknowledgementDraft?.bodyJson || '{}')
    assert(acknowledgementBody.kind === 'customer_reply_ack', 'thank-you draft kind must be customer_reply_ack')
    assert(acknowledgementBody.closesTaskOnSend === true, 'thank-you draft must close task only after send')

    const replay = await requestJson(baseUrl, '/api/internal/chats/inbound', {
      method: 'POST',
      tenantCode,
      internalToken,
      body: inboundBody,
      idempotencyKey: inboundKey
    })
    assert(replay.status === 200, `expected 200 from internal inbound replay, got ${replay.status}`)
    assert(replay.data?.idempotent === true, 'internal inbound replay must be idempotent=true')

    const inboundCount = await prisma.chatMessage.count({
      where: { tenantId: tenant.id, chatTaskId: task.id, direction: 'inbound' }
    })
    assert(inboundCount === 1, `internal inbound replay must not create duplicate messages, got ${inboundCount}`)

    const orderBeforeApply = await prisma.order.findUnique({ where: { id: order.id } })
    assert(orderBeforeApply?.needsInfo === true, 'order.needsInfo must remain true before human approval')

    const apply = await requestJson(baseUrl, `/api/admin/chats/tasks/${task.id}/apply-inbound-update`, {
      method: 'POST',
      token,
      tenantCode,
      body: {},
      idempotencyKey: `chat-internal-apply-${crypto.randomUUID()}`
    })
    assert(apply.status === 200, `expected 200 from apply API, got ${apply.status}`)
    assert(apply.data?.taskState === 'order_complete', `expected applied taskState=order_complete, got ${apply.data?.taskState}`)
    assert(apply.data?.order?.luggage === 1, `applied order.luggage must be 1, got ${apply.data?.order?.luggage}`)

    const kinds = mock.stats.requestKinds.slice().sort().join(',')
    assert(kinds === 'classify,extract', `expected classify,extract runtime calls, got ${kinds}`)

    const auditInbound = await prisma.auditLog.findFirst({
      where: {
        tenantId: tenant.id,
        action: 'chat_task.inbound.openclaw',
        resourceId: task.id,
        decision: 'policy_allowed'
      }
    })
    assert(Boolean(auditInbound), 'internal inbound audit log must exist')

    console.log(JSON.stringify({
      ok: true,
      checks: 18,
      taskState: apply.data.taskState,
      inboundIdempotentReplay: replay.data?.idempotent === true,
      runtimeKinds: mock.stats.requestKinds
    }))
  } finally {
    if (appServer) appServer.close()
    if (mock && mock.server) mock.server.close()

    if (previousRuntimeBase === undefined) delete process.env.OPENCLAW_RUNTIME_BASE_URL
    else process.env.OPENCLAW_RUNTIME_BASE_URL = previousRuntimeBase
    if (previousRuntimeToken === undefined) delete process.env.OPENCLAW_RUNTIME_TOKEN
    else process.env.OPENCLAW_RUNTIME_TOKEN = previousRuntimeToken
    if (previousInternalToken === undefined) delete process.env.OPENCLAW_INTERNAL_TOKEN
    else process.env.OPENCLAW_INTERNAL_TOKEN = previousInternalToken

    await prisma.auditLog.deleteMany({ where: { tenantId: tenant.id, resourceId: task.id } })
    await prisma.idempotencyKey.deleteMany({ where: { tenantId: tenant.id, key: { startsWith: 'chat-internal-' } } })
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
