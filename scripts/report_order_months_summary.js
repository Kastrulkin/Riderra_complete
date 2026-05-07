#!/usr/bin/env node
require('dotenv').config()

const fs = require('fs')
const path = require('path')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

function parsePayload(rawPayload) {
  try {
    return JSON.parse(rawPayload || '{}')
  } catch (_error) {
    return {}
  }
}

function csvEscape(value) {
  const raw = value === null || value === undefined ? '' : String(value)
  return /[",\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw
}

async function main() {
  const outDir = process.argv[2] || path.join('reports', 'order-sync')
  const tenant = await prisma.tenant.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' }
  })
  if (!tenant) throw new Error('Active tenant not found')

  const sources = await prisma.sheetSource.findMany({
    where: { tenantId: tenant.id, isActive: true },
    orderBy: [{ monthLabel: 'asc' }, { updatedAt: 'asc' }]
  })
  const rows = []
  for (const source of sources) {
    const snapshots = await prisma.orderSourceSnapshot.findMany({
      where: { tenantId: tenant.id, sheetSourceId: source.id },
      orderBy: [{ sourceRow: 'asc' }, { createdAt: 'desc' }]
    })
    const seenRows = new Set()
    const stat = {
      month_label: source.monthLabel,
      source_name: source.name,
      total: 0,
      completed: 0,
      cancelled: 0,
      pending: 0,
      complaints: 0,
      issue_count: 0,
      gross_eur: 0,
      gross_usd: 0,
      gross_gbp: 0,
      gross_cad: 0,
      gross_rub: 0,
      drivers: new Set(),
      counterparties: new Set()
    }
    for (const snapshot of snapshots) {
      if (seenRows.has(snapshot.sourceRow)) continue
      seenRows.add(snapshot.sourceRow)
      const row = parsePayload(snapshot.rawPayload)
      const status = row.status || 'pending'
      const currency = String(row.currency || 'EUR').toLowerCase()
      const grossKey = `gross_${currency}`
      stat.total += 1
      stat[status] = (stat[status] || 0) + 1
      stat.complaints += row.has_complaint ? 1 : 0
      stat.issue_count += Array.isArray(row.issue_flags) ? row.issue_flags.length : 0
      if (Object.prototype.hasOwnProperty.call(stat, grossKey)) {
        stat[grossKey] += Number(row.client_price || 0)
      }
      if (row.driver) stat.drivers.add(row.driver)
      if (row.counterparty) stat.counterparties.add(row.counterparty)
    }
    rows.push({
      ...stat,
      gross_eur: Number(stat.gross_eur.toFixed(2)),
      gross_usd: Number(stat.gross_usd.toFixed(2)),
      gross_gbp: Number(stat.gross_gbp.toFixed(2)),
      gross_cad: Number(stat.gross_cad.toFixed(2)),
      gross_rub: Number(stat.gross_rub.toFixed(2)),
      drivers: stat.drivers.size,
      counterparties: stat.counterparties.size
    })
  }

  fs.mkdirSync(outDir, { recursive: true })
  const outPath = path.join(outDir, 'all_months_order_summary.csv')
  const fields = ['month_label', 'source_name', 'total', 'completed', 'cancelled', 'pending', 'complaints', 'issue_count', 'gross_eur', 'gross_usd', 'gross_gbp', 'gross_cad', 'gross_rub', 'drivers', 'counterparties']
  fs.writeFileSync(outPath, [
    fields.join(','),
    ...rows.map((row) => fields.map((field) => csvEscape(row[field])).join(','))
  ].join('\n'), 'utf8')
  console.log(JSON.stringify({ ok: true, output: outPath, rows }, null, 2))
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => prisma.$disconnect())
