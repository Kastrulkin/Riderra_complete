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
    args[key.slice(2)] = argv[i + 1]
    i += 1
  }
  return args
}

function required(args, name) {
  if (!args[name]) throw new Error(`Missing --${name}`)
  return args[name]
}

function csvEscape(value) {
  const raw = value === null || value === undefined ? '' : String(value)
  return /[",\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw
}

function writeCsv(filePath, rows, fields) {
  fs.writeFileSync(filePath, [
    fields.join(','),
    ...rows.map((row) => fields.map((field) => csvEscape(row[field])).join(','))
  ].join('\n'), 'utf8')
}

function parsePayload(snapshot) {
  try {
    return JSON.parse(snapshot.rawPayload)
  } catch (_error) {
    return {}
  }
}

function emptyStats(nameField, name) {
  return {
    [nameField]: name || '(empty)',
    total: 0,
    completed: 0,
    cancelled: 0,
    pending: 0,
    complaints: 0,
    issue_count: 0,
    issue_rate: 0,
    gross_amount: 0,
    currency: '',
    top_cities: new Map(),
    top_counterparties: new Map(),
    top_drivers: new Map(),
    top_routes: new Map()
  }
}

function incrementMap(map, key) {
  if (!key) return
  map.set(key, (map.get(key) || 0) + 1)
}

function topMap(map, limit = 5) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([name, count]) => `${name} x${count}`)
    .join('; ')
}

function finalizeStats(stats) {
  return stats.map((row) => ({
    ...row,
    gross_amount: Number(row.gross_amount.toFixed(2)),
    issue_rate: row.total ? Number((row.issue_count / row.total).toFixed(4)) : 0,
    top_cities: topMap(row.top_cities),
    top_counterparties: topMap(row.top_counterparties),
    top_drivers: topMap(row.top_drivers),
    top_routes: topMap(row.top_routes)
  }))
}

function routeName(row) {
  return [row.from_point, row.to_point].filter(Boolean).join(' -> ')
}

async function snapshotsForSource(tenantId, spreadsheetId, monthLabel) {
  const source = await prisma.sheetSource.findFirst({
    where: { tenantId, googleSheetId: spreadsheetId, monthLabel, tabName: 'таблица' }
  })
  if (!source) throw new Error(`SheetSource not found for ${monthLabel} / ${spreadsheetId}`)
  const snapshots = await prisma.orderSourceSnapshot.findMany({
    where: { tenantId, sheetSourceId: source.id },
    orderBy: { sourceRow: 'asc' }
  })
  return { source, snapshots }
}

async function main() {
  const args = parseArgs(process.argv)
  const spreadsheetId = required(args, 'spreadsheet-id')
  const monthLabel = required(args, 'month-label')
  const slug = required(args, 'slug')
  const outDir = args['out-dir'] || path.join('reports', 'order-sync')

  const tenant = await prisma.tenant.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' }
  })
  if (!tenant) throw new Error('Active tenant not found')

  const { source, snapshots } = await snapshotsForSource(tenant.id, spreadsheetId, monthLabel)
  const byDriver = new Map()
  const byCounterparty = new Map()
  const byCurrency = new Map()
  const summary = {
    spreadsheet_id: spreadsheetId,
    sheet_source_id: source.id,
    month_label: monthLabel,
    source_name: source.name,
    total: 0,
    completed: 0,
    cancelled: 0,
    pending: 0,
    complaints: 0,
    issue_count: 0,
    gross_by_currency: {}
  }

  for (const snapshot of snapshots) {
    const row = parsePayload(snapshot)
    const status = row.status || 'pending'
    const amount = Number(row.client_price || 0)
    const currency = row.currency || 'EUR'
    const driverName = row.driver || '(empty)'
    const counterpartyName = row.counterparty || '(empty)'
    const issueFlags = Array.isArray(row.issue_flags) ? row.issue_flags : []

    summary.total += 1
    summary[status] = (summary[status] || 0) + 1
    summary.complaints += row.has_complaint ? 1 : 0
    summary.issue_count += issueFlags.length
    summary.gross_by_currency[currency] = Number(((summary.gross_by_currency[currency] || 0) + amount).toFixed(2))
    byCurrency.set(currency, (byCurrency.get(currency) || 0) + amount)

    if (!byDriver.has(driverName)) byDriver.set(driverName, emptyStats('driver', driverName))
    const driver = byDriver.get(driverName)
    driver.total += 1
    driver[status] += 1
    driver.complaints += row.has_complaint ? 1 : 0
    driver.issue_count += issueFlags.length
    driver.gross_amount += amount
    driver.currency = currency
    incrementMap(driver.top_cities, row.city_code)
    incrementMap(driver.top_counterparties, counterpartyName)
    incrementMap(driver.top_routes, routeName(row))

    if (!byCounterparty.has(counterpartyName)) byCounterparty.set(counterpartyName, emptyStats('counterparty', counterpartyName))
    const counterparty = byCounterparty.get(counterpartyName)
    counterparty.total += 1
    counterparty[status] += 1
    counterparty.complaints += row.has_complaint ? 1 : 0
    counterparty.issue_count += issueFlags.length
    counterparty.gross_amount += amount
    counterparty.currency = currency
    incrementMap(counterparty.top_cities, row.city_code)
    incrementMap(counterparty.top_drivers, driverName)
    incrementMap(counterparty.top_routes, routeName(row))
  }

  const driverRows = finalizeStats([...byDriver.values()])
  const counterpartyRows = finalizeStats([...byCounterparty.values()])
  const driverFields = [
    'driver', 'total', 'completed', 'cancelled', 'pending', 'complaints', 'issue_count', 'issue_rate',
    'gross_amount', 'currency', 'top_cities', 'top_counterparties', 'top_routes'
  ]
  const counterpartyFields = [
    'counterparty', 'total', 'completed', 'cancelled', 'pending', 'complaints', 'issue_count', 'issue_rate',
    'gross_amount', 'currency', 'top_cities', 'top_drivers', 'top_routes'
  ]

  fs.mkdirSync(outDir, { recursive: true })
  const driverStatsPath = path.join(outDir, `${slug}_db_driver_stats.csv`)
  const counterpartyPath = path.join(outDir, `${slug}_db_counterparty_revenue.csv`)
  const monthlyPath = path.join(outDir, `${slug}_monthly_stats.json`)
  writeCsv(driverStatsPath, driverRows.sort((a, b) => b.completed - a.completed || b.gross_amount - a.gross_amount || a.driver.localeCompare(b.driver)), driverFields)
  writeCsv(counterpartyPath, counterpartyRows.sort((a, b) => b.gross_amount - a.gross_amount || b.completed - a.completed || a.counterparty.localeCompare(b.counterparty)), counterpartyFields)

  const topDrivers = driverRows
    .filter((row) => row.driver !== '(empty)')
    .sort((a, b) => b.completed - a.completed || b.gross_amount - a.gross_amount)
    .slice(0, 10)
  const bottomDrivers = driverRows
    .filter((row) => row.driver !== '(empty)' && row.completed > 0)
    .sort((a, b) => a.completed - b.completed || a.issue_rate - b.issue_rate)
    .slice(0, 10)
  const worstQualityDrivers = driverRows
    .filter((row) => row.driver !== '(empty)' && row.issue_count > 0)
    .sort((a, b) => b.issue_count - a.issue_count || b.issue_rate - a.issue_rate)
    .slice(0, 10)
  const topClients = counterpartyRows
    .filter((row) => row.counterparty !== '(empty)')
    .sort((a, b) => b.gross_amount - a.gross_amount || b.completed - a.completed)
    .slice(0, 10)

  const result = {
    ...summary,
    gross_by_currency: Object.fromEntries([...byCurrency.entries()].map(([currency, value]) => [currency, Number(value.toFixed(2))])),
    outputs: {
      driver_stats: driverStatsPath,
      counterparty_revenue: counterpartyPath,
      monthly_stats: monthlyPath
    },
    top_drivers_by_completed: topDrivers,
    bottom_drivers_by_completed: bottomDrivers,
    worst_quality_drivers: worstQualityDrivers,
    top_clients_by_gross: topClients
  }
  fs.writeFileSync(monthlyPath, JSON.stringify(result, null, 2), 'utf8')

  console.log(JSON.stringify({
    ok: true,
    summary: {
      total: result.total,
      completed: result.completed,
      cancelled: result.cancelled,
      pending: result.pending,
      complaints: result.complaints,
      issue_count: result.issue_count,
      gross_by_currency: result.gross_by_currency
    },
    outputs: result.outputs,
    top_driver: topDrivers[0] || null,
    top_client: topClients[0] || null
  }, null, 2))
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => prisma.$disconnect())
