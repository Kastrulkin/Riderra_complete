#!/usr/bin/env node
require('dotenv').config()

const crypto = require('crypto')
const http = require('http')
const jwt = require('jsonwebtoken')
const { PrismaClient } = require('@prisma/client')
const {
  OPENCLAW_CONTRACT_VERSION,
  validateOpenClawPayload
} = require('../server/openclaw_contract')

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
  headers['idempotency-key'] = `openclaw-contract-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

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
  const requestKinds = []
  const requestVersions = []

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
      const routeToKind = {
        '/riderra/order-draft/build': 'build',
        '/riderra/order-draft/send': 'send',
        '/riderra/order-draft/classify': 'classify',
        '/riderra/order-draft/extract-validate': 'extract'
      }
      const kind = routeToKind[req.url]
      if (!kind) {
        res.writeHead(404, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ error: 'not_found' }))
        return
      }

      const errors = validateOpenClawPayload(kind, body)
      if (errors.length) {
        res.writeHead(422, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ error: 'invalid_contract', errors }))
        return
      }

      requestKinds.push(kind)
      requestVersions.push(body.contract_version)

      let responseBody = null
      if (kind === 'build') {
        responseBody = {
          contract_version: OPENCLAW_CONTRACT_VERSION,
          result: { text: 'Здравствуйте! Пожалуйста, уточните багаж по поездке.' }
        }
      } else if (kind === 'send') {
        responseBody = {
          contract_version: OPENCLAW_CONTRACT_VERSION,
          accepted: true,
          provider_message_id: `mock-send-${Date.now()}`
        }
      } else if (kind === 'classify') {
        responseBody = {
          contract_version: OPENCLAW_CONTRACT_VERSION,
          result: { class: 'answer', confidence: 0.92, requires_human: false }
        }
      } else {
        responseBody = {
          contract_version: OPENCLAW_CONTRACT_VERSION,
          result: {
            valid: true,
            confidence: 0.93,
            field: 'luggage',
            value: '2 suitcases'
          }
        }
      }

      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify(responseBody))
    })
  })

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${address.port}`,
        stats: {
          requestKinds,
          requestVersions
        }
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
    data: { code: `ci_openclaw_contract_${Date.now()}`, name: `CI OpenClaw Contract ${Date.now()}` }
  })
  await prisma.rolePermission.createMany({
    data: [
      { roleId: role.id, permissionId: permOpsManage.id },
      { roleId: role.id, permissionId: permOrdersRead.id }
    ]
  })

  const user = await prisma.user.create({
    data: {
      email: `ci-openclaw-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`,
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
      source: 'openclaw_contract_smoke',
      externalKey: `openclaw-contract-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      fromPoint: 'Airport',
      toPoint: 'Hotel',
      clientPrice: 175,
      vehicleType: 'business',
      status: 'assigned',
      needsInfo: true,
      infoReason: 'Уточнить багаж'
    }
  })

  const agent = await prisma.chatAgentConfig.create({
    data: {
      tenantId: tenant.id,
      code: `ci_openclaw_agent_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: 'CI OpenClaw Agent',
      type: 'order_completion',
      taskType: 'clarification',
      promptText: 'CI prompt',
      isActive: true,
      requiresApproval: false
    }
  })

  const task = await prisma.chatTask.create({
    data: {
      tenantId: tenant.id,
      orderId: order.id,
      taskType: 'clarification',
      state: 'missing_data_detected',
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

    const buildRes = await requestJson(baseUrl, `/api/admin/chats/tasks/${task.id}/build`, {
      method: 'POST',
      token,
      tenantCode,
      body: { bodyText: 'Уточните багаж' }
    })
    assert(buildRes.status === 200, `expected build status 200, got ${buildRes.status}`)
    assert(buildRes.data?.runtime?.ok === true, 'build runtime must be ok')
    const builtMessageId = buildRes.data?.message?.id
    assert(builtMessageId, 'build must return message.id')

    const sendRes = await requestJson(baseUrl, `/api/admin/chats/messages/${builtMessageId}/send`, {
      method: 'POST',
      token,
      tenantCode,
      body: {}
    })
    assert(sendRes.status === 200, `expected send status 200, got ${sendRes.status}`)
    assert(sendRes.data?.runtime?.ok === true, 'send runtime must be ok')

    const inboundRes = await requestJson(baseUrl, `/api/admin/chats/tasks/${task.id}/inbound`, {
      method: 'POST',
      token,
      tenantCode,
      body: { bodyText: 'Багаж: 2 чемодана.' }
    })
    assert(inboundRes.status === 200, `expected inbound status 200, got ${inboundRes.status}`)
    assert(inboundRes.data?.runtime?.classify?.ok === true, 'classify runtime must be ok')
    assert(inboundRes.data?.runtime?.extract?.ok === true, 'extract runtime must be ok')

    const kinds = mock.stats.requestKinds.slice().sort()
    assert(kinds.join(',') === ['build', 'classify', 'extract', 'send'].sort().join(','), `expected all OpenClaw kinds, got ${kinds.join(',')}`)
    assert(mock.stats.requestVersions.every((v) => v === OPENCLAW_CONTRACT_VERSION), 'all requests must use the same contract_version')

    console.log(JSON.stringify({
      ok: true,
      contractVersion: OPENCLAW_CONTRACT_VERSION,
      requestKinds: mock.stats.requestKinds,
      requestVersions: mock.stats.requestVersions
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
