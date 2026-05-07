#!/usr/bin/env node
require('dotenv').config()

const crypto = require('crypto')
const fs = require('fs')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

function parseArgs(argv) {
  const args = {}
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i]
    if (!key.startsWith('--')) continue
    args[key.slice(2)] = argv[i + 1]
    i += 1
  }
  return args
}

function required(args, name) {
  if (!args[name]) throw new Error(`Missing --${name}`)
  return args[name]
}

function hash(value) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function parseOptionalDate(value) {
  if (!value) return null
  const parsed = new Date(value)
  if (!Number.isNaN(parsed.getTime())) return parsed
  const match = String(value).trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?$/)
  if (!match) return null
  const [, day, month, yearRaw, hour = '0', minute = '0'] = match
  const year = Number(yearRaw.length === 2 ? `20${yearRaw}` : yearRaw)
  const fallback = new Date(year, Number(month) - 1, Number(day), Number(hour), Number(minute), 0)
  return Number.isNaN(fallback.getTime()) ? null : fallback
}

async function getTenant() {
  const tenant = await prisma.tenant.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' }
  })
  if (!tenant) throw new Error('Active tenant not found')
  return tenant
}

async function upsertSheetSource(tenantId, args) {
  const spreadsheetId = required(args, 'spreadsheet-id')
  const monthLabel = required(args, 'month-label')
  const tabName = args['table-tab'] || 'таблица'
  const detailsTabName = args['details-tab'] || 'подробности'
  const existing = await prisma.sheetSource.findFirst({
    where: { tenantId, googleSheetId: spreadsheetId, monthLabel, tabName }
  })
  const data = {
    tenantId,
    name: required(args, 'source-name'),
    monthLabel,
    googleSheetId: spreadsheetId,
    tabName,
    detailsTabName,
    columnMapping: JSON.stringify({
      orderNumber: 'Номер заказа',
      date: 'Дата',
      fromPoint: ' Откуда',
      toPoint: 'Куда',
      sum: 'Сумма',
      counterparty: 'Контрагент',
      driverName: 'Водители',
      comment: 'Комментарий (то, что было в скобках, водитель вендора, машина и т.д.)'
    }),
    isActive: true,
    syncEnabled: true,
    lastSyncAt: new Date(),
    lastSyncStatus: 'success',
    lastSyncError: null
  }
  if (existing) return prisma.sheetSource.update({ where: { id: existing.id }, data })
  return prisma.sheetSource.create({ data })
}

async function main() {
  const args = parseArgs(process.argv)
  const spreadsheetId = required(args, 'spreadsheet-id')
  const tableTab = args['table-tab'] || 'таблица'
  const rowsPath = required(args, 'rows')
  const rows = JSON.parse(fs.readFileSync(rowsPath, 'utf8'))
  const tenant = await getTenant()
  const source = await upsertSheetSource(tenant.id, args)
  const stats = { created: 0, updated: 0, snapshots: 0, skipped: 0, errors: 0 }
  const externalKeyPrefix = `google_sheet:${spreadsheetId}:${tableTab}:`

  await prisma.orderSourceSnapshot.deleteMany({ where: { sheetSourceId: source.id } })
  await prisma.order.deleteMany({
    where: {
      tenantId: tenant.id,
      source: 'google_sheet',
      externalKey: { startsWith: externalKeyPrefix }
    }
  })

  for (const row of rows) {
    const rawPayload = row.raw_payload || JSON.stringify(row)
    const rowHash = hash(rawPayload)
    try {
      const data = {
        tenantId: tenant.id,
        source: 'google_sheet',
        externalKey: row.external_key,
        sourceRow: row.source_row,
        pickupAt: parseOptionalDate(row.pickup_at),
        fromPoint: row.from_point || 'UNKNOWN',
        toPoint: row.to_point || 'UNKNOWN',
        clientPrice: Number(row.client_price || 0),
        driverPrice: null,
        commission: null,
        status: row.status || 'pending',
        vehicleType: row.vehicle_type || 'standard',
        comment: [
          row.counterparty ? `counterparty=${row.counterparty}` : null,
          row.driver ? `driver=${row.driver}` : null,
          row.comment || null,
          row.city_code || row.vehicle_code || row.direction ? `orderMeta=${[row.city_code, row.vehicle_code, row.direction].filter(Boolean).join(' ')}` : null
        ].filter(Boolean).join('\n') || null
      }

      const existing = await prisma.order.findUnique({ where: { externalKey: row.external_key } })
      const order = existing
        ? await prisma.order.update({ where: { id: existing.id }, data })
        : await prisma.order.create({ data })
      stats[existing ? 'updated' : 'created'] += 1

      await prisma.orderSourceSnapshot.create({
        data: {
          tenantId: tenant.id,
          orderId: order.id,
          sheetSourceId: source.id,
          sourceRow: row.source_row,
          rowHash,
          rawPayload
        }
      })
      stats.snapshots += 1
    } catch (error) {
      stats.errors += 1
      console.error(`Row ${row.source_row} failed: ${error.message}`)
    }
  }

  const dbStats = {
    orders: await prisma.order.count({ where: { tenantId: tenant.id, source: 'google_sheet', externalKey: { startsWith: externalKeyPrefix } } }),
    completed: await prisma.order.count({ where: { tenantId: tenant.id, source: 'google_sheet', externalKey: { startsWith: externalKeyPrefix }, status: 'completed' } }),
    cancelled: await prisma.order.count({ where: { tenantId: tenant.id, source: 'google_sheet', externalKey: { startsWith: externalKeyPrefix }, status: 'cancelled' } }),
    pending: await prisma.order.count({ where: { tenantId: tenant.id, source: 'google_sheet', externalKey: { startsWith: externalKeyPrefix }, status: 'pending' } })
  }

  console.log(JSON.stringify({
    ok: stats.errors === 0,
    tenant: { id: tenant.id, code: tenant.code, name: tenant.name },
    sheetSource: { id: source.id, name: source.name, monthLabel: source.monthLabel },
    import: stats,
    dbStats
  }, null, 2))
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => prisma.$disconnect())
