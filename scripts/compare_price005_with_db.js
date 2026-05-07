#!/usr/bin/env node
require('dotenv').config()

const fs = require('fs')
const path = require('path')
const Papa = require('papaparse')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()
const OUT_DIR = path.join('reports', 'eto-sync')
const SHEET_CSV = path.join(OUT_DIR, 'price005_actual_full.csv')

function normCell(value) {
  return String(value ?? '').replace(/\u00a0/g, ' ').trim()
}

function normKey(value) {
  return normCell(value)
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9а-яё]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

function writeCsv(filePath, headers, rows) {
  const lines = [headers.map(csvCell).join(',')]
  for (const row of rows) {
    lines.push(headers.map((h) => csvCell(row[h])).join(','))
  }
  fs.writeFileSync(filePath, `${lines.join('\n')}\n`)
}

function parseCsv(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '')
  return Papa.parse(raw, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => normCell(h)
  }).data
}

function parsePrice(value) {
  const raw = normCell(value)
  if (!raw) return null
  const cleaned = raw
    .replace(/[€$£₽]/g, '')
    .replace(/\s/g, '')
    .replace(',', '.')
    .replace(/[^0-9.-]/g, '')
  if (!cleaned) return null
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : null
}

function parsePaxFromNotes(notes) {
  const match = normCell(notes).match(/\bpax\s*:\s*(\d+)/i)
  return match ? match[1] : ''
}

function keyFor(row) {
  return [
    row.country,
    row.routeFrom,
    row.routeTo,
    row.vehicleType
  ].map(normKey).join('\t')
}

function priceCurrencyToken(row) {
  return `${Number(row.price).toFixed(2)} ${normCell(row.currency || 'EUR').toUpperCase()}`
}

function sortedTokens(rows) {
  return rows.map(priceCurrencyToken).sort()
}

function sameTokenSet(aRows, bRows) {
  const a = sortedTokens(aRows)
  const b = sortedTokens(bRows)
  return a.length === b.length && a.every((token, idx) => token === b[idx])
}

function duplicateRows(rows, source) {
  const grouped = new Map()
  for (const row of rows) {
    const key = keyFor(row)
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key).push(row)
  }
  const out = []
  for (const [key, items] of grouped) {
    if (items.length <= 1) continue
    const prices = [...new Set(items.map((row) => `${row.price}|${row.currency}`))]
    for (const row of items) {
      out.push({
        source,
        key,
        duplicateCount: items.length,
        distinctPriceCurrencyCount: prices.length,
        country: row.country,
        routeFrom: row.routeFrom,
        routeTo: row.routeTo,
        vehicleType: row.vehicleType,
        pax: row.pax,
        price: row.price,
        currency: row.currency,
        rowId: row.rowId || ''
      })
    }
  }
  return out
}

function indexedByKey(rows) {
  const map = new Map()
  for (const row of rows) {
    const key = keyFor(row)
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(row)
  }
  return map
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })

  const tenant = await prisma.tenant.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true, code: true, name: true }
  })
  if (!tenant) throw new Error('Active tenant not found')

  const dbRawRows = await prisma.cityPricing.findMany({
    where: {
      tenantId: tenant.id,
      isActive: true,
      fixedPrice: { not: null }
    },
    orderBy: [
      { country: 'asc' },
      { routeFrom: 'asc' },
      { routeTo: 'asc' },
      { vehicleType: 'asc' }
    ]
  })

  const sheetRows = parseCsv(SHEET_CSV)
    .map((row, idx) => ({
      rowId: idx + 2,
      country: normCell(row.Country),
      routeFrom: normCell(row.From),
      routeTo: normCell(row.To),
      vehicleType: normCell(row.Type),
      pax: normCell(row.Pax),
      price: parsePrice(row.Price),
      currency: normCell(row.Currency || 'EUR')
    }))
    .filter((row) => row.country || row.routeFrom || row.routeTo || row.vehicleType || row.price !== null)

  const dbRows = dbRawRows.map((row) => ({
    rowId: row.id,
    country: normCell(row.country),
    routeFrom: normCell(row.routeFrom),
    routeTo: normCell(row.routeTo),
    vehicleType: normCell(row.vehicleType),
    pax: parsePaxFromNotes(row.notes),
    price: parsePrice(row.fixedPrice),
    currency: normCell(row.currency || 'EUR'),
    source: normCell(row.source),
    notes: normCell(row.notes)
  }))

  writeCsv(path.join(OUT_DIR, 'price005_sheet_normalized.csv'), ['rowId', 'country', 'routeFrom', 'routeTo', 'vehicleType', 'pax', 'price', 'currency'], sheetRows)
  writeCsv(path.join(OUT_DIR, 'price005_db_normalized.csv'), ['rowId', 'country', 'routeFrom', 'routeTo', 'vehicleType', 'pax', 'price', 'currency', 'source', 'notes'], dbRows)

  const sheetIndex = indexedByKey(sheetRows)
  const dbIndex = indexedByKey(dbRows)
  const allKeys = new Set([...sheetIndex.keys(), ...dbIndex.keys()])
  const diffs = []
  let matched = 0
  let exactMatchedRows = 0

  for (const key of [...allKeys].sort()) {
    const sItems = sheetIndex.get(key) || []
    const dItems = dbIndex.get(key) || []
    if (!sItems.length) {
      for (const row of dItems) {
        diffs.push({ status: 'only_in_db', key, sheetRowId: '', dbRowId: row.rowId, country: row.country, routeFrom: row.routeFrom, routeTo: row.routeTo, vehicleType: row.vehicleType, pax: row.pax, sheetPrice: '', dbPrice: row.price, sheetCurrency: '', dbCurrency: row.currency })
      }
      continue
    }
    if (!dItems.length) {
      for (const row of sItems) {
        diffs.push({ status: 'only_in_sheet', key, sheetRowId: row.rowId, dbRowId: '', country: row.country, routeFrom: row.routeFrom, routeTo: row.routeTo, vehicleType: row.vehicleType, pax: row.pax, sheetPrice: row.price, dbPrice: '', sheetCurrency: row.currency, dbCurrency: '' })
      }
      continue
    }

    const s = sItems[0]
    const d = dItems[0]
    const pricesSame = sameTokenSet(sItems, dItems)
    const paxSame = sortedTokens(sItems.map((row) => ({ price: row.pax || 0, currency: '' }))).join('|') === sortedTokens(dItems.map((row) => ({ price: row.pax || 0, currency: '' }))).join('|')
    if (pricesSame && paxSame && sItems.length === 1 && dItems.length === 1) {
      matched += 1
      exactMatchedRows += 1
      continue
    }
    const status = !pricesSame
      ? 'price_set_mismatch'
      : !paxSame
        ? 'pax_metadata_mismatch'
        : 'duplicate_key_same_values'
    diffs.push({
      status,
      key,
      sheetRowId: sItems.map((row) => row.rowId).join('|'),
      dbRowId: dItems.map((row) => row.rowId).join('|'),
      country: s.country || d.country,
      routeFrom: s.routeFrom || d.routeFrom,
      routeTo: s.routeTo || d.routeTo,
      vehicleType: s.vehicleType || d.vehicleType,
      pax: s.pax || d.pax,
      sheetPrice: sortedTokens(sItems).join('|'),
      dbPrice: sortedTokens(dItems).join('|'),
      sheetCurrency: sItems.map((row) => row.currency).join('|'),
      dbCurrency: dItems.map((row) => row.currency).join('|')
    })
  }

  const duplicateDetails = [
    ...duplicateRows(sheetRows, 'sheet'),
    ...duplicateRows(dbRows, 'db')
  ]
  const blockerStatuses = new Set(['price_set_mismatch', 'only_in_sheet', 'only_in_db'])
  const blockerDiffs = diffs.filter((row) => blockerStatuses.has(row.status))

  const diffHeaders = ['status', 'key', 'sheetRowId', 'dbRowId', 'country', 'routeFrom', 'routeTo', 'vehicleType', 'pax', 'sheetPrice', 'dbPrice', 'sheetCurrency', 'dbCurrency']
  writeCsv(path.join(OUT_DIR, 'price005_vs_db_diffs.csv'), diffHeaders, diffs)
  writeCsv(path.join(OUT_DIR, 'price005_vs_db_blockers.csv'), diffHeaders, blockerDiffs)
  writeCsv(path.join(OUT_DIR, 'price005_duplicates.csv'), ['source', 'key', 'duplicateCount', 'distinctPriceCurrencyCount', 'country', 'routeFrom', 'routeTo', 'vehicleType', 'pax', 'price', 'currency', 'rowId'], duplicateDetails)

  const byStatus = diffs.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] || 0) + 1
    return acc
  }, {})
  const summary = {
    spreadsheet: {
      id: '17YqqHe0TgDvUgXDNq0FeYe7113R2LTZza4musWLjEUo',
      title: '005 price list',
      sheet: 'Актуальный полный',
      sourceCsv: SHEET_CSV
    },
    tenant,
    sheetRows: sheetRows.length,
    dbRows: dbRows.length,
    matchedKeysWithoutDiffs: matched,
    exactMatchedRows,
    diffRows: diffs.length,
    diffRowsByStatus: byStatus,
    blockingDiffRows: blockerDiffs.length,
    duplicateRows: duplicateDetails.length,
    outputs: {
      sheetNormalized: path.join(OUT_DIR, 'price005_sheet_normalized.csv'),
      dbNormalized: path.join(OUT_DIR, 'price005_db_normalized.csv'),
      diffs: path.join(OUT_DIR, 'price005_vs_db_diffs.csv'),
      blockers: path.join(OUT_DIR, 'price005_vs_db_blockers.csv'),
      duplicates: path.join(OUT_DIR, 'price005_duplicates.csv')
    }
  }

  fs.writeFileSync(path.join(OUT_DIR, 'price005_vs_db_summary.json'), JSON.stringify(summary, null, 2))
  console.log(JSON.stringify(summary, null, 2))
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
