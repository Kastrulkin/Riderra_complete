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

function csvEscape(value) {
  const raw = value === null || value === undefined ? '' : String(value)
  return /[",\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw
}

async function main() {
  const args = parseArgs(process.argv)
  const manifestPath = args.manifest || path.join(__dirname, 'order_month_sources_manifest.json')
  const outputPath = args.output || path.join('reports', 'order-import-coverage.csv')
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  const tenant = await prisma.tenant.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'asc' } })
  if (!tenant) throw new Error('Active tenant not found')

  const sources = await prisma.sheetSource.findMany({
    where: { tenantId: tenant.id },
    include: { _count: { select: { snapshots: true } } },
    orderBy: [{ monthLabel: 'asc' }, { name: 'asc' }]
  })
  const sourcesByMonth = new Map()
  for (const source of sources) {
    if (!sourcesByMonth.has(source.monthLabel)) sourcesByMonth.set(source.monthLabel, [])
    sourcesByMonth.get(source.monthLabel).push(source)
  }

  const rows = manifest.map((item) => {
    const monthSources = sourcesByMonth.get(item.monthLabel) || []
    const matchingSource = monthSources.find((source) => source.googleSheetId === item.spreadsheetId) || monthSources[0] || null
    return {
      month_label: item.monthLabel,
      expected_source: item.sourceName,
      expected_sheet_id: item.spreadsheetId,
      expected_tab: item.tableTab || '',
      db_source: matchingSource?.name || '',
      db_sheet_id: matchingSource?.googleSheetId || '',
      db_tab: matchingSource?.tabName || '',
      snapshots: matchingSource?._count?.snapshots || 0,
      status: matchingSource && matchingSource._count.snapshots > 0 ? 'loaded' : 'missing'
    }
  })

  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  const fields = ['month_label', 'status', 'snapshots', 'expected_source', 'expected_sheet_id', 'expected_tab', 'db_source', 'db_sheet_id', 'db_tab']
  fs.writeFileSync(outputPath, [
    fields.join(','),
    ...rows.map((row) => fields.map((field) => csvEscape(row[field])).join(','))
  ].join('\n'), 'utf8')

  console.log(JSON.stringify({
    ok: true,
    output: outputPath,
    expectedMonths: rows.length,
    loadedMonths: rows.filter((row) => row.status === 'loaded').length,
    missingMonths: rows.filter((row) => row.status === 'missing').map((row) => row.month_label)
  }, null, 2))
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => prisma.$disconnect())
