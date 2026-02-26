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

async function requestJson(baseUrl, path, { method = 'GET', token = null, tenantCode = null, body = null } = {}) {
  const headers = { 'content-type': 'application/json' }
  if (token) headers.authorization = `Bearer ${token}`
  if (tenantCode) headers['x-tenant-code'] = tenantCode

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

  const permission = await ensurePermission('orders.assign', 'Assign drivers to orders')
  const roleCode = `ci_dispatch_${Date.now()}`
  const role = await prisma.role.create({
    data: { code: roleCode, name: `CI Dispatcher ${Date.now()}` }
  })
  await prisma.rolePermission.create({
    data: {
      roleId: role.id,
      permissionId: permission.id
    }
  })

  const user = await prisma.user.create({
    data: {
      email: `ci-human-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`,
      password: crypto.randomUUID(),
      role: 'staff',
      isActive: true,
      abacCountries: 'all',
      abacCities: 'all',
      abacTeams: 'all'
    }
  })

  await prisma.userRole.create({
    data: {
      userId: user.id,
      roleId: role.id
    }
  })

  await prisma.tenantMembership.create({
    data: {
      tenantId: tenant.id,
      userId: user.id,
      role: 'staff',
      isActive: true
    }
  })

  const order = await prisma.order.create({
    data: {
      tenantId: tenant.id,
      source: 'security_smoke',
      externalKey: `human-smoke-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      fromPoint: 'Airport',
      toPoint: 'Hotel',
      clientPrice: 120,
      vehicleType: 'standard',
      status: 'assigned'
    }
  })

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, jwtSecret, { expiresIn: '10m' })

  const appServer = app.listen(0)
  const port = appServer.address().port
  const baseUrl = `http://127.0.0.1:${port}`

  try {
    const transition = await requestJson(baseUrl, `/api/admin/orders/${order.id}/status`, {
      method: 'PUT',
      token,
      tenantCode: tenant.code,
      body: {
        toStatus: 'cancelled',
        reason: 'CI human-in-loop smoke'
      }
    })

    assert(transition.status === 409, `expected 409 pending_human, got ${transition.status}`)
    assert(transition.data && transition.data.code === 'pending_human', 'expected pending_human code in response')
    assert(transition.data && transition.data.approvalId, 'expected approvalId in pending_human response')

    const approval = await prisma.humanApproval.findFirst({
      where: {
        id: transition.data.approvalId,
        tenantId: tenant.id,
        action: 'order.status.transition',
        resource: 'order',
        resourceId: order.id,
        status: 'pending_human'
      }
    })
    assert(!!approval, 'pending human approval row not created')

    const orderAfter = await prisma.order.findUnique({ where: { id: order.id } })
    assert(orderAfter && String(orderAfter.status).toLowerCase() === 'assigned', 'order status must remain unchanged without approval')

    console.log(JSON.stringify({ ok: true, checks: 3 }))
  } finally {
    appServer.close()
    await prisma.humanApproval.deleteMany({ where: { tenantId: tenant.id, resourceId: order.id, action: 'order.status.transition' } })
    await prisma.orderStatusHistory.deleteMany({ where: { orderId: order.id } })
    await prisma.order.delete({ where: { id: order.id } })
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
