#!/usr/bin/env node
require('dotenv').config()

const fs = require('fs')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

function parseArgs(argv) {
  const args = {}
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i]
    if (!key.startsWith('--')) continue
    const next = argv[i + 1]
    if (!next || next.startsWith('--')) {
      args[key.slice(2)] = true
    } else {
      args[key.slice(2)] = next
      i += 1
    }
  }
  return args
}

function requireArg(args, name) {
  if (!args[name]) throw new Error(`Missing --${name}`)
  return args[name]
}

function toDate(value) {
  return value ? new Date(value) : null
}

function convertDates(row, fields) {
  const next = { ...row }
  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(next, field)) {
      next[field] = toDate(next[field])
    }
  }
  return next
}

function chunk(items, size = 500) {
  const chunks = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

async function createMany(model, rows, dateFields) {
  let count = 0
  for (const batch of chunk(rows)) {
    const data = batch.map((row) => convertDates(row, dateFields))
    await model.createMany({ data, skipDuplicates: true })
    count += data.length
  }
  return count
}

async function main() {
  const args = parseArgs(process.argv)
  const inputPath = requireArg(args, 'input')
  const replaceGoogleSheet = Boolean(args['replace-google-sheet'])
  const payload = JSON.parse(fs.readFileSync(inputPath, 'utf8'))

  const tenant = await prisma.tenant.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' }
  })
  if (!tenant) throw new Error('Active tenant not found')
  if (payload.tenant?.code && payload.tenant.code !== tenant.code) {
    throw new Error(`Tenant code mismatch: export=${payload.tenant.code}, db=${tenant.code}`)
  }

  if (replaceGoogleSheet) {
    await prisma.orderSourceSnapshot.deleteMany({ where: { tenantId: tenant.id } })
    await prisma.order.deleteMany({ where: { tenantId: tenant.id, source: 'google_sheet' } })
    await prisma.sheetSource.deleteMany({ where: { tenantId: tenant.id } })
  }

  const sources = payload.sources.map((source) => ({ ...source, tenantId: tenant.id }))
  const orders = payload.orders.map((order) => ({ ...order, tenantId: tenant.id }))
  const snapshots = payload.snapshots.map((snapshot) => ({ ...snapshot, tenantId: tenant.id }))
  const signals = payload.signals.map((signal) => ({ ...signal, tenantId: tenant.id }))

  const result = {
    sources: await createMany(prisma.sheetSource, sources, ['createdAt', 'updatedAt', 'lastSyncAt']),
    orders: await createMany(prisma.order, orders, [
      'createdAt',
      'pickupAt',
      'updatedAt',
      'flightCheckedAt',
      'flightArrivalScheduled',
      'flightArrivalEstimated',
      'flightArrivalActual',
      'addressCheckedAt'
    ]),
    snapshots: await createMany(prisma.orderSourceSnapshot, snapshots, ['createdAt']),
    signals: await createMany(prisma.orderQualitySignal, signals, ['createdAt', 'updatedAt'])
  }

  const months = await prisma.sheetSource.findMany({
    where: { tenantId: tenant.id, isActive: true },
    orderBy: [{ monthLabel: 'asc' }],
    select: { monthLabel: true, name: true, googleSheetId: true }
  })

  console.log(JSON.stringify({
    ok: true,
    tenant: { id: tenant.id, code: tenant.code, name: tenant.name },
    imported: result,
    db: {
      sources: await prisma.sheetSource.count({ where: { tenantId: tenant.id } }),
      orders: await prisma.order.count({ where: { tenantId: tenant.id, source: 'google_sheet' } }),
      snapshots: await prisma.orderSourceSnapshot.count({ where: { tenantId: tenant.id } }),
      signals: await prisma.orderQualitySignal.count({ where: { tenantId: tenant.id } })
    },
    months
  }, null, 2))
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => prisma.$disconnect())
