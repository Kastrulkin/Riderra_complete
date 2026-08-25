#!/usr/bin/env node
require('dotenv').config()

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const APPLY = process.argv.includes('--apply')
const ROUTE_FROM = 'Rovaniemi Airport (RVN)'
const AGREED_AT = '2026-08-25'
const CLIENT = 'Suntransfers'
const AUDIT_NOTE = [
  `priceAgreedAt=${AGREED_AT}`,
  'priceAgreedBy=Alexander Demyanov',
  `priceSharedWith=${CLIENT}`,
  `priceSharedAt=${AGREED_AT}`
].join('; ')

function normalize(value) {
  return String(value || '').trim().toLocaleLowerCase('en-US')
}

function appendNote(existing, note) {
  const current = String(existing || '').trim()
  if (current.includes(note)) return current
  return [current, note].filter(Boolean).join('\n')
}

async function loadRows(client) {
  const tenant = await client.tenant.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true, code: true, name: true }
  })
  if (!tenant) throw new Error('Active tenant not found')

  const rows = await client.cityPricing.findMany({
    where: {
      tenantId: tenant.id,
      isActive: true,
      routeFrom: { equals: ROUTE_FROM, mode: 'insensitive' }
    },
    select: {
      id: true,
      routeTo: true,
      vehicleType: true,
      fixedPrice: true,
      currency: true,
      notes: true
    },
    orderBy: [{ routeTo: 'asc' }, { vehicleType: 'asc' }]
  })

  if (rows.length !== 82) throw new Error(`Expected 82 active Rovaniemi prices, found ${rows.length}`)
  if (new Set(rows.map((row) => row.routeTo)).size !== 41) throw new Error('Expected 41 Rovaniemi destinations')
  if (rows.some((row) => row.currency !== 'EUR' || row.fixedPrice == null)) {
    throw new Error('All Rovaniemi rows must have an EUR fixed price')
  }

  const keys = rows.map((row) => `${normalize(row.routeTo)}|${normalize(row.vehicleType)}`)
  const duplicates = [...new Set(keys.filter((key, index, all) => all.indexOf(key) !== index))]
  if (duplicates.length) throw new Error(`Duplicate route/class rows: ${duplicates.join(', ')}`)

  return { tenant, rows }
}

async function main() {
  const before = await loadRows(prisma)
  const pending = before.rows.filter((row) => !String(row.notes || '').includes(AUDIT_NOTE))

  if (!APPLY) {
    console.log(JSON.stringify({
      mode: 'preview',
      tenant: before.tenant,
      routeFrom: ROUTE_FROM,
      activeRows: before.rows.length,
      destinations: new Set(before.rows.map((row) => row.routeTo)).size,
      rowsToUpdate: pending.length,
      auditNote: AUDIT_NOTE
    }, null, 2))
    return
  }

  const pricesBefore = new Map(before.rows.map((row) => [row.id, row.fixedPrice]))
  await prisma.$transaction(async (tx) => {
    for (const row of pending) {
      await tx.cityPricing.update({
        where: { id: row.id },
        data: { notes: appendNote(row.notes, AUDIT_NOTE) }
      })
    }
  })

  const after = await loadRows(prisma)
  const missingAudit = after.rows.filter((row) => !String(row.notes || '').includes(AUDIT_NOTE))
  const priceChanges = after.rows.filter((row) => pricesBefore.get(row.id) !== row.fixedPrice)

  if (missingAudit.length) throw new Error(`Audit note missing from ${missingAudit.length} rows`)
  if (priceChanges.length) throw new Error(`Unexpected price changes in ${priceChanges.length} rows`)

  console.log(JSON.stringify({
    mode: 'apply',
    updatedRows: pending.length,
    verifiedRows: after.rows.length,
    destinations: new Set(after.rows.map((row) => row.routeTo)).size,
    missingAudit: missingAudit.length,
    priceChanges: priceChanges.length,
    auditNote: AUDIT_NOTE
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
}).finally(async () => prisma.$disconnect())
