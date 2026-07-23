#!/usr/bin/env node
require('dotenv').config()

const fs = require('fs')
const path = require('path')
const { PrismaClient } = require('@prisma/client')
const {
  fetchValues,
  getGoogleAccessToken,
  parseSheetRows
} = require('./sync_order_sheets_from_manifest')

const prisma = new PrismaClient()
const APPROVERS = new Set(['demyanov@riderra.com', 'shilin@riderra.com'])
const BATCH_SIZE = 500

function parseArgs(argv) {
  const args = {}
  for (let index = 2; index < argv.length; index += 1) {
    const key = argv[index]
    if (!key.startsWith('--')) continue
    const next = argv[index + 1]
    if (!next || next.startsWith('--')) args[key.slice(2)] = true
    else {
      args[key.slice(2)] = next
      index += 1
    }
  }
  return args
}

function chunks(items, size = BATCH_SIZE) {
  const result = []
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size))
  return result
}

function inRange(monthLabel, from, to) {
  if (from && monthLabel < from) return false
  if (to && monthLabel > to) return false
  return true
}

async function currentOrdersByExternalKey(tenantId, externalKeys) {
  const result = new Map()
  for (const batch of chunks(externalKeys)) {
    const orders = await prisma.order.findMany({
      where: { tenantId, externalKey: { in: batch } },
      select: { id: true, externalKey: true, sourceCurrency: true }
    })
    for (const order of orders) result.set(order.externalKey, order)
  }
  return result
}

async function applyCorrections(tenantId, corrections, approvedBy) {
  const changedAt = new Date()
  for (const batch of chunks(corrections)) {
    const byCurrency = new Map()
    for (const correction of batch) {
      if (!byCurrency.has(correction.to)) byCurrency.set(correction.to, [])
      byCurrency.get(correction.to).push(correction.orderId)
    }
    const updates = [...byCurrency.entries()].map(([sourceCurrency, ids]) => prisma.order.updateMany({
      where: { tenantId, id: { in: ids } },
      data: { sourceCurrency }
    }))
    await prisma.$transaction([
      ...updates,
      prisma.orderChangeLog.createMany({
        data: batch.map((correction) => ({
          tenantId,
          orderId: correction.orderId,
          actorEmail: approvedBy,
          actorRole: approvedBy === 'shilin@riderra.com' ? 'financial' : 'owner',
          reason: 'Repair source currency from the original monthly Google Sheet',
          changesJson: JSON.stringify({ sourceCurrency: { from: correction.from, to: correction.to } }),
          beforeJson: JSON.stringify({ sourceCurrency: correction.from }),
          afterJson: JSON.stringify({ sourceCurrency: correction.to }),
          createdAt: changedAt
        }))
      })
    ])
  }
}

async function main() {
  const args = parseArgs(process.argv)
  const apply = Boolean(args.apply)
  const approvedBy = String(args['approved-by'] || '').trim().toLowerCase()
  if (apply && !APPROVERS.has(approvedBy)) {
    throw new Error('Applying currency corrections requires --approved-by with an authorized owner or financial user')
  }

  const manifestPath = args.manifest || path.join(__dirname, 'order_month_sources_manifest.json')
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    .filter((item) => inRange(item.monthLabel, args.from || '', args.to || ''))
    .sort((a, b) => a.monthLabel.localeCompare(b.monthLabel))
  const tenant = await prisma.tenant.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'asc' } })
  if (!tenant) throw new Error('Active tenant not found')

  const accessToken = await getGoogleAccessToken()
  const report = []
  const allCorrections = []
  for (const item of manifest) {
    const fetched = await fetchValues(accessToken, item.spreadsheetId, item.tableTab || 'таблица', item)
    const parsed = parseSheetRows({ ...item, tableTab: fetched.tabName }, fetched.values)
    const uniqueRows = [...new Map(parsed.rows.map((row) => [row.external_key, row])).values()]
    const current = await currentOrdersByExternalKey(tenant.id, uniqueRows.map((row) => row.external_key))
    const corrections = []
    const targetCurrencies = {}
    const evidence = {}
    for (const row of uniqueRows) {
      targetCurrencies[row.currency] = (targetCurrencies[row.currency] || 0) + 1
      evidence[row.currency_evidence] = (evidence[row.currency_evidence] || 0) + 1
      const order = current.get(row.external_key)
      if (!order || order.sourceCurrency === row.currency) continue
      corrections.push({
        orderId: order.id,
        externalKey: row.external_key,
        from: order.sourceCurrency,
        to: row.currency,
        evidence: row.currency_evidence
      })
    }
    allCorrections.push(...corrections)
    const monthReport = {
      monthLabel: item.monthLabel,
      format: parsed.format,
      sourceRows: uniqueRows.length,
      matchedOrders: current.size,
      missingOrders: uniqueRows.length - current.size,
      corrections: corrections.length,
      targetCurrencies,
      currencyEvidence: evidence
    }
    report.push(monthReport)
    console.log(JSON.stringify(monthReport))
  }

  const summary = {
    mode: apply ? 'apply' : 'preview',
    months: report.length,
    sourceRows: report.reduce((sum, row) => sum + row.sourceRows, 0),
    matchedOrders: report.reduce((sum, row) => sum + row.matchedOrders, 0),
    missingOrders: report.reduce((sum, row) => sum + row.missingOrders, 0),
    corrections: allCorrections.length
  }
  console.log(JSON.stringify(summary, null, 2))

  if (apply && allCorrections.length) {
    await applyCorrections(tenant.id, allCorrections, approvedBy)
    console.log(JSON.stringify({ ok: true, updatedOrders: allCorrections.length, approvedBy }))
  }
}

main()
  .catch((error) => {
    console.error(error.message || error)
    process.exitCode = 1
  })
  .finally(async () => prisma.$disconnect())
