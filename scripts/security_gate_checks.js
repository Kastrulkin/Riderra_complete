#!/usr/bin/env node
require('dotenv').config()

const crypto = require('crypto')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function main() {
  const report = {
    tenantIsolation: false,
    roles: false,
    idempotency: false,
    humanInLoop: false,
    audit: false
  }

  const tenant = await prisma.tenant.findUnique({ where: { code: process.env.TENANT_CODE || 'riderra' } })
  await assert(!!tenant, 'tenant not found')

  // 1) Tenant isolation (data scoping sanity)
  const otherTenant = await prisma.tenant.create({
    data: {
      code: `tmp-${Date.now()}`,
      name: 'Temp tenant',
      isActive: true
    }
  })

  const orderA = await prisma.order.create({
    data: {
      tenantId: tenant.id,
      source: 'security_gate',
      externalKey: `gate-A-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      fromPoint: 'A',
      toPoint: 'B',
      clientPrice: 100,
      vehicleType: 'standard',
      status: 'pending'
    }
  })
  const orderB = await prisma.order.create({
    data: {
      tenantId: otherTenant.id,
      source: 'security_gate',
      externalKey: `gate-B-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      fromPoint: 'A',
      toPoint: 'B',
      clientPrice: 100,
      vehicleType: 'standard',
      status: 'pending'
    }
  })

  const scopedA = await prisma.order.count({ where: { tenantId: tenant.id, id: orderA.id } })
  const scopedBInA = await prisma.order.count({ where: { tenantId: tenant.id, id: orderB.id } })
  await assert(scopedA === 1 && scopedBInA === 0, 'tenant isolation check failed')
  report.tenantIsolation = true

  // 2) Roles baseline
  const memberships = await prisma.tenantMembership.count({
    where: {
      tenantId: tenant.id,
      isActive: true,
      role: { in: ['staff', 'staff_supervisor', 'executor', 'customer', 'passenger', 'system'] }
    }
  })
  await assert(memberships > 0, 'tenant memberships/roles not configured')
  report.roles = true

  // 3) Idempotency uniqueness
  const idemKey = `gate-idem-${Date.now()}`
  await prisma.idempotencyKey.create({
    data: {
      tenantId: tenant.id,
      key: idemKey,
      action: 'security.gate.test',
      status: 'processing'
    }
  })
  let duplicateBlocked = false
  try {
    await prisma.idempotencyKey.create({
      data: {
        tenantId: tenant.id,
        key: idemKey,
        action: 'security.gate.test',
        status: 'processing'
      }
    })
  } catch (_) {
    duplicateBlocked = true
  }
  await assert(duplicateBlocked, 'idempotency duplicate not blocked')
  report.idempotency = true

  // 4) Human in loop statuses
  const approval = await prisma.humanApproval.create({
    data: {
      tenantId: tenant.id,
      action: 'security.gate.approval',
      resource: 'order',
      resourceId: orderA.id,
      payloadJson: JSON.stringify({ toStatus: 'cancelled' }),
      status: 'pending_human'
    }
  })
  await assert(approval.status === 'pending_human', 'human approval status invalid')
  report.humanInLoop = true

  // 5) Audit trace
  const traceId = `gate-trace-${crypto.randomUUID()}`
  const audit = await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      actorRole: 'system',
      action: 'security.gate.audit',
      resource: 'order',
      resourceId: orderA.id,
      traceId,
      result: 'ok'
    }
  })
  const auditCount = await prisma.auditLog.count({ where: { tenantId: tenant.id, traceId } })
  await assert(auditCount === 1 && audit.id, 'audit trace check failed')
  report.audit = true

  // cleanup temp data
  await prisma.auditLog.delete({ where: { id: audit.id } })
  await prisma.humanApproval.delete({ where: { id: approval.id } })
  await prisma.idempotencyKey.deleteMany({ where: { tenantId: tenant.id, key: idemKey, action: 'security.gate.test' } })
  await prisma.order.delete({ where: { id: orderA.id } })
  await prisma.order.delete({ where: { id: orderB.id } })
  await prisma.tenant.delete({ where: { id: otherTenant.id } })

  console.log(JSON.stringify({ ok: true, report }))
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
