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
  const previousRuntimeToken = process.env.OPENCLAW_RUNTIME_TOKEN
  const previousSendPath = process.env.OPENCLAW_RUNTIME_SEND_PATH

  process.env.OPENCLAW_RUNTIME_TOKEN = runtimeToken
  process.env.OPENCLAW_RUNTIME_SEND_PATH = '/riderra/order-draft/send'

  const app = require('../server/index')
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
              name: 'baggage_request',
              label: 'Baggage request',
              languages: ['en'],
              variables: ['booking_number', 'route_from', 'route_to']
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
          templateName: 'baggage_request',
          language: 'ru',
          variables: {
            booking_number: order.externalKey,
            route_from: order.fromPoint,
            route_to: order.toPoint
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
          templateName: 'baggage_request',
          language: 'en',
          variables: {
            booking_number: order.externalKey
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
          templateName: 'baggage_request',
          language: 'en',
          variables: {
            booking_number: order.externalKey,
            route_from: order.fromPoint,
            route_to: order.toPoint
          }
        }
      }
    })
    assert(sent.status === 200, `valid template send should return 200, got ${sent.status}: ${JSON.stringify(sent.data)}`)
    assert(sent.data?.message?.approvalStatus === 'sent', `message should be sent, got ${sent.data?.message?.approvalStatus}`)
    assert(sent.data?.taskState === 'request_sent', `task state should be request_sent, got ${sent.data?.taskState}`)
    assert(mock.requests.length === 1, `OpenClaw mock should receive exactly one valid send, got ${mock.requests.length}`)

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
      checks: 10,
      blockedAuditCount,
      policyGuardMessages,
      openclawSends: mock.requests.length
    }))
  } finally {
    if (appServer) await new Promise((resolve) => appServer.close(resolve))
    if (mock?.server) await new Promise((resolve) => mock.server.close(resolve))
    restoreEnv('OPENCLAW_RUNTIME_BASE_URL', previousRuntimeBase)
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
