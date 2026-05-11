#!/usr/bin/env node
require('dotenv').config()

const fs = require('fs')
const path = require('path')
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

function inRange(monthLabel, from, to) {
  if (from && monthLabel < from) return false
  if (to && monthLabel > to) return false
  return true
}

function defaultColumnMapping() {
  return JSON.stringify({
    orderNumber: 'Номер заказа',
    date: 'Дата',
    fromPoint: ' Откуда',
    toPoint: 'Куда',
    sum: 'Сумма',
    counterparty: 'Контрагент',
    driverName: 'Водители',
    comment: 'Комментарий (то, что было в скобках, водитель вендора, машина и т.д.)'
  })
}

async function main() {
  const args = parseArgs(process.argv)
  const manifestPath = args.manifest || path.join(__dirname, 'order_month_sources_manifest.json')
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  const tenant = await prisma.tenant.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' }
  })
  if (!tenant) throw new Error('Active tenant not found')

  const selected = manifest
    .filter((item) => inRange(item.monthLabel, args.from || '', args.to || ''))
    .sort((a, b) => a.monthLabel.localeCompare(b.monthLabel))

  const stats = { created: 0, updated: 0, skipped: 0 }
  const rows = []
  for (const item of selected) {
    const existing = await prisma.sheetSource.findFirst({
      where: {
        tenantId: tenant.id,
        monthLabel: item.monthLabel,
        googleSheetId: item.spreadsheetId,
        tabName: item.tableTab || 'таблица'
      }
    })
    const data = {
      tenantId: tenant.id,
      name: item.sourceName,
      monthLabel: item.monthLabel,
      googleSheetId: item.spreadsheetId,
      tabName: item.tableTab || 'таблица',
      detailsTabName: item.detailsTab || 'подробности',
      columnMapping: defaultColumnMapping(),
      isActive: true,
      syncEnabled: true,
      lastSyncStatus: null,
      lastSyncError: null
    }
    if (existing) {
      if (args['no-update']) {
        stats.skipped += 1
        rows.push({ monthLabel: item.monthLabel, sourceName: item.sourceName, action: 'skipped', id: existing.id })
        continue
      }
      const updated = await prisma.sheetSource.update({ where: { id: existing.id }, data })
      stats.updated += 1
      rows.push({ monthLabel: item.monthLabel, sourceName: item.sourceName, action: 'updated', id: updated.id })
    } else {
      const created = await prisma.sheetSource.create({ data })
      stats.created += 1
      rows.push({ monthLabel: item.monthLabel, sourceName: item.sourceName, action: 'created', id: created.id })
    }
  }

  console.log(JSON.stringify({
    ok: true,
    tenant: { id: tenant.id, code: tenant.code, name: tenant.name },
    selected: selected.length,
    stats,
    rows
  }, null, 2))
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => prisma.$disconnect())
