#!/usr/bin/env node
require('dotenv').config()

const crypto = require('crypto')
const http = require('http')
const jwt = require('jsonwebtoken')
const { PrismaClient } = require('@prisma/client')
const { OPENCLAW_CONTRACT_VERSION } = require('../server/openclaw_contract')

const prisma = new PrismaClient()
const TEMPLATE_REGISTRY_KEY = 'whatsapp_template_registry'

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

function restoreEnv(name, value) {
  if (typeof value === 'undefined') {
    delete process.env[name]
  } else {
    process.env[name] = value
  }
}

function startOpenClawMock(expectedToken) {
  const requests = []
  const server = http.createServer((req, res) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => {
      if (req.headers['x-openclaw-internal-token'] !== expectedToken) {
        res.writeHead(401, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ error: 'unauthorized' }))
        return
      }

      const raw = Buffer.concat(chunks).toString('utf8')
      const body = raw ? JSON.parse(raw) : {}
      requests.push({ url: req.url, body })

      if (req.method !== 'POST' || req.url !== '/riderra/order-draft/send') {
        res.writeHead(404, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ error: 'not_found' }))
        return
      }

      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({
        contract_version: OPENCLAW_CONTRACT_VERSION,
        accepted: true,
        provider_message_id: `mock-whatsapp-${Date.now()}`
      }))
    })
  })

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${address.port}`,
        requests
      })
    })
  })
}

async function main() {
  const jwtSecret = process.env.JWT_SECRET || 'ci-jwt-secret'
  const tenantCode = `ci-whatsapp-policy-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const runtimeToken = `mock-${crypto.randomUUID()}`
  const previousRuntimeBase = process.env.OPENCLAW_RUNTIME_BASE_URL
  const previousRuntimeSendBase = process.env.OPENCLAW_RUNTIME_SEND_BASE_URL
  const previousRuntimeToken = process.env.OPENCLAW_RUNTIME_TOKEN
  const previousSendPath = process.env.OPENCLAW_RUNTIME_SEND_PATH

  process.env.OPENCLAW_RUNTIME_TOKEN = runtimeToken
  process.env.OPENCLAW_RUNTIME_SEND_PATH = '/riderra/order-draft/send'

  let app = null
  let appServer = null
  let mock = null
  const created = {
    roleId: null,
    userId: null,
    tenantId: null,
    orderId: null,
    agentId: null,
    taskId: null,
    messageId: null,
    promptTemplateId: null
  }

  try {
    mock = await startOpenClawMock(runtimeToken)
    process.env.OPENCLAW_RUNTIME_BASE_URL = mock.baseUrl
    process.env.OPENCLAW_RUNTIME_SEND_BASE_URL = mock.baseUrl
    app = require('../server/index')

    const tenant = await prisma.tenant.create({
      data: { code: tenantCode, name: 'CI WhatsApp Policy', isActive: true }
    })
    created.tenantId = tenant.id

    const [permOpsManage, permOrdersRead] = await Promise.all([
      ensurePermission('ops.manage', 'Operate orders'),
      ensurePermission('orders.read', 'Read orders')
    ])

    const role = await prisma.role.create({
      data: { code: `ci_whatsapp_policy_${Date.now()}`, name: `CI WhatsApp Policy ${Date.now()}` }
    })
    created.roleId = role.id
    await prisma.rolePermission.createMany({
      data: [
        { roleId: role.id, permissionId: permOpsManage.id },
        { roleId: role.id, permissionId: permOrdersRead.id }
      ]
    })

    const user = await prisma.user.create({
      data: {
        email: `ci-whatsapp-policy-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`,
        password: crypto.randomUUID(),
        role: 'staff',
        isActive: true,
        abacCountries: 'all',
        abacCities: 'all',
        abacTeams: 'all'
      }
    })
    created.userId = user.id
    await prisma.userRole.create({ data: { userId: user.id, roleId: role.id } })
    await prisma.tenantMembership.create({
      data: { tenantId: tenant.id, userId: user.id, role: 'staff', isActive: true }
    })

    const promptTemplate = await prisma.promptTemplate.create({
      data: {
        tenantId: tenant.id,
        key: TEMPLATE_REGISTRY_KEY,
        title: 'CI WhatsApp template registry',
        description: 'Temporary template registry for CI smoke',
        isActive: true
      }
    })
    created.promptTemplateId = promptTemplate.id
    await prisma.promptTemplateVersion.create({
      data: {
        templateId: promptTemplate.id,
        version: 1,
        isActive: true,
        content: JSON.stringify({
          templates: [
            {
              name: 'riderra_baggage_request',
              label: 'Baggage request',
              languages: ['en'],
              variables: ['city', 'pickup_date']
            }
          ]
        })
      }
    })

    const order = await prisma.order.create({
      data: {
        tenantId: tenant.id,
        source: 'whatsapp_policy_smoke',
        externalKey: `WA-POLICY-${Date.now()}`,
        fromPoint: 'LAX Airport',
        toPoint: 'Anaheim',
        clientPrice: 150,
        vehicleType: 'standard',
        status: 'pending_dispatch',
        needsInfo: true,
        infoReason: 'Уточнить багаж'
      }
    })
    created.orderId = order.id

    const agent = await prisma.chatAgentConfig.create({
      data: {
        tenantId: tenant.id,
        code: `ci_whatsapp_agent_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: 'CI WhatsApp Agent',
        type: 'order_completion',
        taskType: 'clarification',
        promptText: 'CI prompt',
        isActive: true,
        requiresApproval: false
      }
    })
    created.agentId = agent.id

    const task = await prisma.chatTask.create({
      data: {
        tenantId: tenant.id,
        orderId: order.id,
        taskType: 'clarification',
        state: 'notify_draft',
        priority: 1,
        channel: 'whatsapp',
        customerActorId: '+12025550123',
        agentConfigId: agent.id,
        agentPaused: false
      }
    })
    created.taskId = task.id

    const message = await prisma.chatMessage.create({
      data: {
        tenantId: tenant.id,
        chatTaskId: task.id,
        direction: 'outbound',
        source: 'operator',
        channel: 'whatsapp',
        bodyText: 'Please confirm your luggage for the transfer.',
        approvalStatus: 'approved'
      }
    })
    created.messageId = message.id

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, jwtSecret, { expiresIn: '10m' })
    appServer = app.listen(0)
    const baseUrl = `http://127.0.0.1:${appServer.address().port}`

    const freeTextBlocked = await requestJson(baseUrl, `/api/admin/chats/messages/${message.id}/send`, {
      method: 'POST',
      token,
      tenantCode,
      idempotencyKey: `ci-wa-free-text-${Date.now()}`,
      body: {}
    })
    assert(freeTextBlocked.status === 409, `free text should be blocked with 409, got ${freeTextBlocked.status}`)
    assert(freeTextBlocked.data?.code === 'WHATSAPP_TEMPLATE_REQUIRED', `expected WHATSAPP_TEMPLATE_REQUIRED, got ${freeTextBlocked.data?.code}`)

    const unknownTemplateBlocked = await requestJson(baseUrl, `/api/admin/chats/messages/${message.id}/send`, {
      method: 'POST',
      token,
      tenantCode,
      idempotencyKey: `ci-wa-unknown-template-${Date.now()}`,
      body: {
        delivery: {
          mode: 'template',
          templateName: 'missing_template',
          language: 'en',
          variables: {}
        }
      }
    })
    assert(unknownTemplateBlocked.status === 409, `unknown template should be blocked with 409, got ${unknownTemplateBlocked.status}`)
    assert(unknownTemplateBlocked.data?.code === 'WHATSAPP_TEMPLATE_NOT_REGISTERED', `expected WHATSAPP_TEMPLATE_NOT_REGISTERED, got ${unknownTemplateBlocked.data?.code}`)

    const languageBlocked = await requestJson(baseUrl, `/api/admin/chats/messages/${message.id}/send`, {
      method: 'POST',
      token,
      tenantCode,
      idempotencyKey: `ci-wa-language-${Date.now()}`,
      body: {
        delivery: {
          mode: 'template',
          templateName: 'riderra_baggage_request',
          language: 'ru',
          variables: {
            city: 'Los Angeles',
            pickup_date: '2 June'
          }
        }
      }
    })
    assert(languageBlocked.status === 409, `wrong language should be blocked with 409, got ${languageBlocked.status}`)
    assert(languageBlocked.data?.code === 'WHATSAPP_TEMPLATE_LANGUAGE_NOT_APPROVED', `expected WHATSAPP_TEMPLATE_LANGUAGE_NOT_APPROVED, got ${languageBlocked.data?.code}`)

    const missingVariablesBlocked = await requestJson(baseUrl, `/api/admin/chats/messages/${message.id}/send`, {
      method: 'POST',
      token,
      tenantCode,
      idempotencyKey: `ci-wa-vars-${Date.now()}`,
      body: {
        delivery: {
          mode: 'template',
          templateName: 'riderra_baggage_request',
          language: 'en',
          variables: {
            city: 'Los Angeles'
          }
        }
      }
    })
    assert(missingVariablesBlocked.status === 400, `missing variables should be blocked with 400, got ${missingVariablesBlocked.status}`)
    assert(missingVariablesBlocked.data?.code === 'WHATSAPP_TEMPLATE_VARIABLES_MISSING', `expected WHATSAPP_TEMPLATE_VARIABLES_MISSING, got ${missingVariablesBlocked.data?.code}`)

    const sent = await requestJson(baseUrl, `/api/admin/chats/messages/${message.id}/send`, {
      method: 'POST',
      token,
      tenantCode,
      idempotencyKey: `ci-wa-valid-${Date.now()}`,
      body: {
        delivery: {
          mode: 'template',
          templateName: 'riderra_baggage_request',
          language: 'en',
          variables: {
            city: 'Los Angeles',
            pickup_date: '2 June'
          }
        }
      }
    })
    assert(sent.status === 200, `valid template send should return 200, got ${sent.status}: ${JSON.stringify(sent.data)}`)
    assert(sent.data?.message?.approvalStatus === 'sent', `message should be sent, got ${sent.data?.message?.approvalStatus}`)
    assert(sent.data?.taskState === 'request_sent', `task state should be request_sent, got ${sent.data?.taskState}`)
    assert(mock.requests.length === 1, `OpenClaw mock should receive exactly one valid send, got ${mock.requests.length}`)

    const repeatedSend = await requestJson(baseUrl, `/api/admin/chats/messages/${message.id}/send`, {
      method: 'POST',
      token,
      tenantCode,
      idempotencyKey: `ci-wa-repeat-${Date.now()}`,
      body: {
        delivery: {
          mode: 'template',
          templateName: 'riderra_baggage_request',
          language: 'en',
          variables: { city: 'Los Angeles', pickup_date: '2 June' }
        }
      }
    })
    assert(repeatedSend.status === 200, `repeated send should be a safe 200, got ${repeatedSend.status}`)
    assert(repeatedSend.data?.alreadySent === true, 'repeated send should report alreadySent=true')
    assert(mock.requests.length === 1, `repeated send must not call OpenClaw again, got ${mock.requests.length} calls`)

    const approveSent = await requestJson(baseUrl, `/api/admin/chats/messages/${message.id}/approve`, {
      method: 'POST', token, tenantCode, body: {}
    })
    assert(approveSent.status === 409, `sent message must not be approved again, got ${approveSent.status}`)
    assert(approveSent.data?.code === 'MESSAGE_ALREADY_SENT', `expected MESSAGE_ALREADY_SENT, got ${approveSent.data?.code}`)

    const repeatedQueue = await requestJson(baseUrl, '/api/admin/chats/queue-order', {
      method: 'POST',
      token,
      tenantCode,
      idempotencyKey: `ci-wa-queue-repeat-${Date.now()}`,
      body: { orderId: order.id, taskType: 'clarification', assignToMe: false }
    })
    assert(repeatedQueue.status === 200, `repeated queue should return 200, got ${repeatedQueue.status}`)
    assert(repeatedQueue.data?.queueStatus === 'already_in_progress', `expected already_in_progress, got ${repeatedQueue.data?.queueStatus}`)
    assert(repeatedQueue.data?.task?.state === 'request_sent', `queue must preserve request_sent, got ${repeatedQueue.data?.task?.state}`)

    const repeatedBulkQueue = await requestJson(baseUrl, '/api/admin/chats/queue-marked', {
      method: 'POST',
      token,
      tenantCode,
      idempotencyKey: `ci-wa-bulk-repeat-${Date.now()}`,
      body: { orderIds: [order.id] }
    })
    assert(repeatedBulkQueue.status === 200, `repeated bulk queue should return 200, got ${repeatedBulkQueue.status}`)
    assert(repeatedBulkQueue.data?.created === 0, `repeated bulk queue must create 0 tasks, got ${repeatedBulkQueue.data?.created}`)
    assert(repeatedBulkQueue.data?.alreadyInProgress === 1, `expected one in-progress task, got ${repeatedBulkQueue.data?.alreadyInProgress}`)
    const taskAfterBulkQueue = await prisma.chatTask.findUnique({ where: { id: task.id } })
    assert(taskAfterBulkQueue?.state === 'request_sent', `bulk queue must preserve request_sent, got ${taskAfterBulkQueue?.state}`)

    const dispatchText = 'Your confirmed trip details are ready.'
    const firstDispatch = await requestJson(baseUrl, '/api/admin/chats/dispatch-one-click', {
      method: 'POST',
      token,
      tenantCode,
      idempotencyKey: `ci-dispatch-first-${Date.now()}`,
      body: { orderId: order.id, messageText: dispatchText, confirmed: true }
    })
    assert(firstDispatch.status === 200, `first one-click dispatch should return 200, got ${firstDispatch.status}: ${JSON.stringify(firstDispatch.data)}`)
    assert(firstDispatch.data?.alreadySent !== true, 'first one-click dispatch must be a real send')
    assert(mock.requests.length === 2, `first one-click dispatch should add one OpenClaw call, got ${mock.requests.length}`)

    const repeatedDispatch = await requestJson(baseUrl, '/api/admin/chats/dispatch-one-click', {
      method: 'POST',
      token,
      tenantCode,
      idempotencyKey: `ci-dispatch-repeat-${Date.now()}`,
      body: { orderId: order.id, messageText: dispatchText, confirmed: true }
    })
    assert(repeatedDispatch.status === 200, `repeated one-click dispatch should return 200, got ${repeatedDispatch.status}`)
    assert(repeatedDispatch.data?.alreadySent === true, 'repeated one-click dispatch should report alreadySent=true')
    assert(mock.requests.length === 2, `repeated one-click dispatch must not call OpenClaw again, got ${mock.requests.length}`)

    const blockedAuditCount = await prisma.auditLog.count({
      where: {
        tenantId: tenant.id,
        action: 'chat_message.send.blocked'
      }
    })
    assert(blockedAuditCount >= 4, `expected at least 4 blocked audit rows, got ${blockedAuditCount}`)

    const policyGuardMessages = await prisma.chatMessage.count({
      where: {
        tenantId: tenant.id,
        chatTaskId: task.id,
        direction: 'internal',
        bodyJson: { contains: 'policy_guard' }
      }
    })
    assert(policyGuardMessages >= 4, `expected at least 4 policy guard messages, got ${policyGuardMessages}`)

    console.log(JSON.stringify({
      ok: true,
      checks: 28,
      blockedAuditCount,
      policyGuardMessages,
      openclawSends: mock.requests.length
    }))
  } finally {
    if (appServer) await new Promise((resolve) => appServer.close(resolve))
    if (mock?.server) await new Promise((resolve) => mock.server.close(resolve))
    restoreEnv('OPENCLAW_RUNTIME_BASE_URL', previousRuntimeBase)
    restoreEnv('OPENCLAW_RUNTIME_SEND_BASE_URL', previousRuntimeSendBase)
    restoreEnv('OPENCLAW_RUNTIME_TOKEN', previousRuntimeToken)
    restoreEnv('OPENCLAW_RUNTIME_SEND_PATH', previousSendPath)

    if (created.tenantId) {
      await prisma.aiLearningEvent.deleteMany({ where: { tenantId: created.tenantId } }).catch(() => null)
      await prisma.auditLog.deleteMany({ where: { tenantId: created.tenantId } }).catch(() => null)
      await prisma.idempotencyKey.deleteMany({ where: { tenantId: created.tenantId } }).catch(() => null)
      await prisma.chatMessage.deleteMany({ where: { tenantId: created.tenantId } }).catch(() => null)
      await prisma.chatTask.deleteMany({ where: { tenantId: created.tenantId } }).catch(() => null)
      await prisma.chatAgentConfig.deleteMany({ where: { tenantId: created.tenantId } }).catch(() => null)
      await prisma.order.deleteMany({ where: { tenantId: created.tenantId } }).catch(() => null)
      if (created.promptTemplateId) await prisma.promptTemplate.delete({ where: { id: created.promptTemplateId } }).catch(() => null)
      if (created.userId) {
        await prisma.tenantMembership.deleteMany({ where: { userId: created.userId } }).catch(() => null)
        await prisma.userRole.deleteMany({ where: { userId: created.userId } }).catch(() => null)
        await prisma.user.delete({ where: { id: created.userId } }).catch(() => null)
      }
      if (created.roleId) {
        await prisma.rolePermission.deleteMany({ where: { roleId: created.roleId } }).catch(() => null)
        await prisma.role.delete({ where: { id: created.roleId } }).catch(() => null)
      }
      await prisma.tenant.delete({ where: { id: created.tenantId } }).catch(() => null)
    }
    await prisma.$disconnect()
  }
}

main().catch(async (error) => {
  console.error(error)
  await prisma.$disconnect().catch(() => null)
  process.exitCode = 1
})
