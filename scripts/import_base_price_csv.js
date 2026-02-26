#!/usr/bin/env node
require('dotenv').config()

const fs = require('fs')
const Papa = require('papaparse')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

function norm(v) {
  return String(v || '').replace(/\u00a0/g, ' ').trim()
}

function toInt(v) {
  const s = norm(v)
  if (!s) return null
  const n = parseInt(s.replace(/[^\d-]/g, ''), 10)
  return Number.isFinite(n) ? n : null
}

function toFloat(v) {
  const s = norm(v)
  if (!s) return null
  const n = parseFloat(s.replace(',', '.').replace(/[^\d.-]/g, ''))
  return Number.isFinite(n) ? n : null
}

async function main () {
  const input = process.argv[2]
  if (!input) {
    console.error('Usage: node scripts/import_base_price_csv.js <path-to-csv>')
    process.exit(1)
  }

  const raw = fs.readFileSync(input, 'utf8').replace(/^\uFEFF/, '')
  const parsed = Papa.parse(raw, { header: true, delimiter: ';', skipEmptyLines: true })
  const rows = parsed.data || []

  const prepared = []
  for (const row of rows) {
    const country = norm(row.Country || row.country)
    const from = norm(row.From || row.from)
    const to = norm(row.To || row.to)
    const price = toFloat(row.Price || row.price)
    const currency = norm(row.Currency || row.currency) || 'EUR'
    const vehicleType = norm(row.Type || row.type) || 'standard'
    const pax = toInt(row.Pax || row.pax)

    if (!country || !from || !to || price === null) continue

    prepared.push({
      country,
      city: to,
      routeFrom: from,
      routeTo: to,
      vehicleType,
      fixedPrice: price,
      currency,
      notes: pax ? `pax:${pax}` : null,
      source: 'base_price_xlsx',
      isActive: true
    })
  }

  await prisma.cityPricing.deleteMany({ where: { source: 'base_price_xlsx' } })

  const batchSize = 500
  for (let i = 0; i < prepared.length; i += batchSize) {
    await prisma.cityPricing.createMany({
      data: prepared.slice(i, i + batchSize)
    })
  }

  console.log(JSON.stringify({ ok: true, imported: prepared.length }, null, 2))
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
