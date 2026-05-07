#!/usr/bin/env node
require('dotenv').config()

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const SPREADSHEET_ID = '1NIPASg-pUOLPcsLOtdRzhVxSmelshTRFc5tsic3NR9E'
const MONTH_LABEL = '2026-04'
const SOURCE_NAME = 'Апрель 2026'
const ROWS_PATH = path.join('reports', 'order-sync', 'april_2026_trip_rows.json')
const EXTERNAL_KEY_PREFIX = `google_sheet:${SPREADSHEET_ID}:таблица:`

function hash(value) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

async function getTenant() {
  const tenant = await prisma.tenant.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' }
  })
  if (!tenant) throw new Error('Active tenant not found')
  return tenant
}

async function upsertSheetSource(tenantId) {
  const existing = await prisma.sheetSource.findFirst({
    where: { tenantId, googleSheetId: SPREADSHEET_ID, monthLabel: MONTH_LABEL, tabName: 'таблица' }
  })
  const data = {
    tenantId,
    name: SOURCE_NAME,
    monthLabel: MONTH_LABEL,
    googleSheetId: SPREADSHEET_ID,
    tabName: 'таблица',
    detailsTabName: 'подробности',
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
  const rows = JSON.parse(fs.readFileSync(ROWS_PATH, 'utf8'))
  const tenant = await getTenant()
  const source = await upsertSheetSource(tenant.id)
  const stats = { created: 0, updated: 0, snapshots: 0, skipped: 0, errors: 0 }

  await prisma.orderSourceSnapshot.deleteMany({ where: { sheetSourceId: source.id } })
  await prisma.order.deleteMany({
    where: {
      tenantId: tenant.id,
      source: 'google_sheet',
      externalKey: { startsWith: EXTERNAL_KEY_PREFIX }
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
        pickupAt: row.pickup_at ? new Date(row.pickup_at) : null,
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

      const latest = await prisma.orderSourceSnapshot.findFirst({
        where: { sheetSourceId: source.id, sourceRow: row.source_row },
        orderBy: { createdAt: 'desc' }
      })
      if (!latest || latest.rowHash !== rowHash || latest.orderId !== order.id) {
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
      }
    } catch (error) {
      stats.errors += 1
      console.error(`Row ${row.source_row} failed: ${error.message}`)
    }
  }

  const dbStats = {
    orders: await prisma.order.count({ where: { tenantId: tenant.id, source: 'google_sheet', externalKey: { startsWith: `google_sheet:${SPREADSHEET_ID}:таблица:` } } }),
    completed: await prisma.order.count({ where: { tenantId: tenant.id, source: 'google_sheet', externalKey: { startsWith: `google_sheet:${SPREADSHEET_ID}:таблица:` }, status: 'completed' } }),
    cancelled: await prisma.order.count({ where: { tenantId: tenant.id, source: 'google_sheet', externalKey: { startsWith: `google_sheet:${SPREADSHEET_ID}:таблица:` }, status: 'cancelled' } })
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
