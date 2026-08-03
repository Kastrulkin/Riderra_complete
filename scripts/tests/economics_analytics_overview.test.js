#!/usr/bin/env node
require('dotenv').config()

const assert = require('assert')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const { PrismaClient } = require('@prisma/client')

process.env.JWT_SECRET = process.env.JWT_SECRET || 'economics-analytics-test-secret'

const prisma = new PrismaClient()

async function requestJson(baseUrl, path, token, tenantCode) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      authorization: `Bearer ${token}`,
      'x-tenant-code': tenantCode
    }
  })
  const body = await response.json().catch(() => ({}))
  return { status: response.status, body }
}

async function main() {
  const suffix = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`
  const tenantCode = `economics-test-${suffix}`
  const monthLabel = '2099-01'
  const app = require('../../server/index')

  const tenant = await prisma.tenant.create({
    data: { code: tenantCode, name: `Economics test ${suffix}`, isActive: true }
  })
  const permission = await prisma.permission.upsert({
    where: { code: 'orders.read' },
    update: {},
    create: { code: 'orders.read', name: 'Read orders' }
  })
  const role = await prisma.role.create({
    data: { code: `economics_test_${suffix}`, name: `Economics test ${suffix}` }
  })
  await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } })
  const user = await prisma.user.create({
    data: {
      email: `economics-test-${suffix}@example.com`,
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

  const source = await prisma.sheetSource.create({
    data: {
      tenantId: tenant.id,
      name: `Archived source ${suffix}`,
      monthLabel,
      googleSheetId: `sheet-${suffix}`,
      isActive: false,
      syncEnabled: false,
      lastSyncStatus: 'success'
    }
  })
  const oldOrder = await prisma.order.create({
    data: {
      tenantId: tenant.id,
      externalKey: `economics-old-${suffix}`,
      fromPoint: 'Airport',
      toPoint: 'Hotel',
      clientPrice: 100,
      driverPrice: 60,
      status: 'completed',
      vehicleType: 'standard',
      sourceCurrency: 'EUR'
    }
  })
  const currentOrder = await prisma.order.create({
    data: {
      tenantId: tenant.id,
      externalKey: `economics-current-${suffix}`,
      fromPoint: 'Airport',
      toPoint: 'Hotel',
      clientPrice: 150,
      driverPrice: 90,
      status: 'completed',
      vehicleType: 'standard',
      sourceCurrency: 'EUR'
    }
  })
  await prisma.orderSourceSnapshot.createMany({
    data: [
      {
        tenantId: tenant.id,
        sheetSourceId: source.id,
        sourceRow: 2,
        orderId: oldOrder.id,
        rowHash: `old-${suffix}`,
        rawPayload: '{}',
        createdAt: new Date('2099-01-01T10:00:00.000Z')
      },
      {
        tenantId: tenant.id,
        sheetSourceId: source.id,
        sourceRow: 2,
        orderId: currentOrder.id,
        rowHash: `current-${suffix}`,
        rawPayload: '{}',
        createdAt: new Date('2099-01-01T11:00:00.000Z')
      }
    ]
  })

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '10m' }
  )
  const appServer = app.listen(0)
  const baseUrl = `http://127.0.0.1:${appServer.address().port}`

  try {
    const result = await requestJson(
      baseUrl,
      `/api/admin/economics/analytics/overview?status=archived&fromMonth=${monthLabel}&toMonth=${monthLabel}`,
      token,
      tenantCode
    )

    assert.strictEqual(result.status, 200, `analytics endpoint returned ${result.status}: ${JSON.stringify(result.body)}`)
    assert.strictEqual(result.body.summary.total, 1, 'one source row with two snapshots must count as one trip')
    assert.strictEqual(result.body.summary.grossByCurrency.EUR, 150, 'analytics must use the latest snapshot value')
    console.log('economics_analytics_overview tests passed')
  } finally {
    await new Promise((resolve) => appServer.close(resolve))
    await prisma.orderSourceSnapshot.deleteMany({ where: { tenantId: tenant.id } })
    await prisma.order.deleteMany({ where: { tenantId: tenant.id } })
    await prisma.sheetSource.deleteMany({ where: { tenantId: tenant.id } })
    await prisma.tenantMembership.deleteMany({ where: { userId: user.id } })
    await prisma.userRole.deleteMany({ where: { userId: user.id } })
    await prisma.user.delete({ where: { id: user.id } })
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } })
    await prisma.role.delete({ where: { id: role.id } })
    await prisma.tenant.delete({ where: { id: tenant.id } })
    await prisma.$disconnect()
  }
}

main().catch(async (error) => {
  console.error(error)
  process.exitCode = 1
  await prisma.$disconnect()
})
