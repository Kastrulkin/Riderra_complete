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
      const requestBody = Buffer.concat(chunks).toString('utf8')
      const isIncompleteClarification = /Okay|Hope this is helpful/i.test(requestBody)
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
          result: isIncompleteClarification ? {
            valid: false,
            confidence: 0.92,
            field: 'flightNumber',
            value: null,
            reason: 'The flight number was not provided.'
          } : {
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

  const followupOrder = await prisma.order.create({
    data: {
      tenantId: tenant.id,
      source: 'chat_internal_smoke',
      externalKey: `chat-followup-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      fromPoint: 'Los Angeles International Airport',
      toPoint: 'Hotel',
      clientPrice: 53,
      vehicleType: 'standard',
      status: 'pending_dispatch',
      needsInfo: true,
      infoReason: 'Уточнить рейс'
    }
  })

  const followupTask = await prisma.chatTask.create({
    data: {
      tenantId: tenant.id,
      orderId: followupOrder.id,
      taskType: 'clarification',
      state: 'request_sent',
      priority: 1,
      channel: 'whatsapp',
      customerActorId: '+447415353038',
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

    const apply = await requestJson(baseUrl, `/api/admin/chats/tasks/${task.id}/confirm-inbound-comment`, {
      method: 'POST',
      token,
      tenantCode,
      body: {},
      idempotencyKey: `chat-internal-apply-${crypto.randomUUID()}`
    })
    assert(apply.status === 200, `expected 200 from apply API, got ${apply.status}`)
    assert(apply.data?.taskState === 'order_complete', `expected applied taskState=order_complete, got ${apply.data?.taskState}`)
    assert(apply.data?.order?.luggage == null, `order.luggage must not be changed, got ${apply.data?.order?.luggage}`)
    assert(String(apply.data?.order?.comment || '').includes('Ответ клиента'), 'customer reply must be appended to order.comment')

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

    const firstIncompleteKey = `chat-internal-followup-${crypto.randomUUID()}`
    const firstIncompleteBody = {
      taskId: followupTask.id,
      bodyText: 'Okay',
      channel: 'whatsapp',
      externalMessageId: `wa-${crypto.randomUUID()}`,
      from: '+447415353038'
    }
    const firstIncomplete = await requestJson(baseUrl, '/api/internal/chats/inbound', {
      method: 'POST',
      tenantCode,
      internalToken,
      body: firstIncompleteBody,
      idempotencyKey: firstIncompleteKey
    })
    assert(firstIncomplete.status === 200, `expected 200 for first incomplete reply, got ${firstIncomplete.status}`)
    assert(firstIncomplete.data?.followUpAttempt === 1, `first incomplete reply must set followUpAttempt=1, got ${firstIncomplete.data?.followUpAttempt}`)
    assert(firstIncomplete.data?.followUpDraft?.approvalStatus === 'pending_human', 'first incomplete reply must create one follow-up draft for human approval')
    assert(/flight number/i.test(String(firstIncomplete.data?.followUpDraft?.bodyText || '')), 'follow-up draft must politely repeat the missing flight-number question')

    const firstIncompleteReplay = await requestJson(baseUrl, '/api/internal/chats/inbound', {
      method: 'POST',
      tenantCode,
      internalToken,
      body: firstIncompleteBody,
      idempotencyKey: firstIncompleteKey
    })
    assert(firstIncompleteReplay.data?.idempotent === true, 'incomplete reply replay must be idempotent')
    const firstFollowupDraftCount = await prisma.chatMessage.count({
      where: { tenantId: tenant.id, chatTaskId: followupTask.id, direction: 'outbound', idempotencyKey: { startsWith: 'clarification-followup:' } }
    })
    assert(firstFollowupDraftCount === 1, `first incomplete reply must create exactly one follow-up draft, got ${firstFollowupDraftCount}`)

    const manualRetry = await requestJson(baseUrl, `/api/admin/chats/tasks/${followupTask.id}/retry-clarification`, {
      method: 'POST',
      token,
      tenantCode,
      body: {},
      idempotencyKey: `chat-internal-manual-retry-${crypto.randomUUID()}`
    })
    assert(manualRetry.status === 200, `manual retry endpoint must return 200, got ${manualRetry.status}`)
    assert(manualRetry.data?.followUpDraft?.id === firstIncomplete.data.followUpDraft.id, 'manual retry must reuse the existing pending follow-up draft')
    assert(manualRetry.data?.idempotent === true, 'manual retry must report that the existing draft was reused')

    await prisma.chatMessage.update({
      where: { id: firstIncomplete.data.followUpDraft.id },
      data: { approvalStatus: 'sent', deliveryStatus: 'delivered' }
    })
    await prisma.chatTask.update({ where: { id: followupTask.id }, data: { state: 'request_sent' } })

    const secondIncomplete = await requestJson(baseUrl, '/api/internal/chats/inbound', {
      method: 'POST',
      tenantCode,
      internalToken,
      body: {
        taskId: followupTask.id,
        bodyText: 'Hope this is helpful',
        channel: 'whatsapp',
        externalMessageId: `wa-${crypto.randomUUID()}`,
        from: '+447415353038'
      },
      idempotencyKey: `chat-internal-followup-${crypto.randomUUID()}`
    })
    assert(secondIncomplete.status === 200, `expected 200 for second incomplete reply, got ${secondIncomplete.status}`)
    assert(secondIncomplete.data?.followUpAttempt === 2, `second incomplete reply must set followUpAttempt=2, got ${secondIncomplete.data?.followUpAttempt}`)
    assert(secondIncomplete.data?.taskState === 'handoff_human', `second incomplete reply must hand off to an operator, got ${secondIncomplete.data?.taskState}`)
    assert(!secondIncomplete.data?.followUpDraft, 'second incomplete reply must not create another customer message')

    console.log(JSON.stringify({
      ok: true,
      checks: 31,
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

    await prisma.auditLog.deleteMany({ where: { tenantId: tenant.id, resourceId: { in: [task.id, followupTask.id] } } })
    await prisma.idempotencyKey.deleteMany({ where: { tenantId: tenant.id, key: { startsWith: 'chat-internal-' } } })
    await prisma.chatMessage.deleteMany({ where: { chatTaskId: { in: [task.id, followupTask.id] } } })
    await prisma.chatTask.deleteMany({ where: { id: { in: [task.id, followupTask.id] } } })
    await prisma.chatAgentConfig.deleteMany({ where: { id: agent.id } })
    await prisma.orderStatusHistory.deleteMany({ where: { orderId: { in: [order.id, followupOrder.id] } } })
    await prisma.order.deleteMany({ where: { id: { in: [order.id, followupOrder.id] } } })
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
