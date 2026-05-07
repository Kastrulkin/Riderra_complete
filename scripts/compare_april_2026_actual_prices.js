#!/usr/bin/env node
require('dotenv').config()

const fs = require('fs')
const path = require('path')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()
const IN_PATH = process.argv[2] || path.join('reports', 'order-sync', 'april_2026_actual_price_groups.csv')
const OUT_PATH = process.argv[3] || path.join('reports', 'order-sync', 'april_2026_actual_vs_counterparty_rules.csv')

const PLACE_BY_CODE = {
  HEL: { airport: 'Helsinki-Vantaa Airport (HEL)', city: 'Helsinki' },
  Tbilisi: { airport: 'Tbilisi International Airport (TBS)', city: 'Tbilisi' },
  Batumi: { airport: 'Batumi International Airport (BUS)', city: 'Batumi' },
  Almaty: { airport: 'Almaty International Airport (ALA)', city: 'Almaty' },
  Yerevan: { airport: 'Zvartnots International Airport (EVN)', city: 'Yerevan' },
  Riga: { airport: 'Riga International Airport (RIX)', city: 'Riga' },
  Copenhagen: { airport: 'Copenhagen airport (CPH)', city: 'Copenhagen' },
  STOCK: { airport: 'Stockholm Arlanda airport (ARN)', city: 'Stockholm' },
  Kaunas: { airport: 'Kaunas Airport (KUN)', city: 'Kaunas' },
  Seoul: { airport: 'Seoul Incheon airport (ICN)', city: 'Seoul' },
  Tokyo: { airport: 'Tokyo Cruise Port (JPTYO)', city: 'Tokyo' },
  Gothenburg: { airport: 'Gothenburg-Landvetter airport (GOT)', city: 'Gothenburg' },
  Aarhus: { airport: 'Aarhus Airport (AAR)', city: 'Aarhus' },
  Rovaniemi: { airport: 'Rovaniemi airport (RVN)', city: 'Rovaniemi' },
  Vancouver: { airport: 'Vancouver International Airport (YVR)', city: 'Vancouver' },
  'Vancouver Port': { airport: 'Port of Vancouver', city: 'Vancouver' },
  'Los Angeles': { airport: 'Los Angeles International Airport (LAX)', city: 'Los Angeles' },
  'Los Angeles Port': { airport: 'Los Angeles Port Cruise Terminal (port)', city: 'Los Angeles' },
  London: { airport: 'Heathrow Airport (LHR)', city: 'London' }
}

const COUNTERPARTY_ALIAS = {
  MyTravelThru: 'My Travel Throu'
}

function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (ch === '"') {
        quoted = false
      } else {
        field += ch
      }
    } else if (ch === '"') {
      quoted = true
    } else if (ch === ',') {
      row.push(field)
      field = ''
    } else if (ch === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (ch !== '\r') {
      field += ch
    }
  }
  if (field || row.length) {
    row.push(field)
    rows.push(row)
  }
  const headers = rows.shift()
  return rows.filter((r) => r.length && r.some(Boolean)).map((values) => Object.fromEntries(headers.map((h, i) => [h, values[i] || ''])))
}

function csvEscape(value) {
  const raw = value === null || value === undefined ? '' : String(value)
  return /[",\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw
}

function norm(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/[^a-z0-9а-яё]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function routeFor(group) {
  const places = PLACE_BY_CODE[group.city_code]
  if (!places) return null
  if (group.direction === 'D') return { from: places.city, to: places.airport }
  return { from: places.airport, to: places.city }
}

function routeMatches(rule, route) {
  if (!route) return false
  const from = norm(rule.routeFrom)
  const to = norm(rule.routeTo)
  return from.includes(norm(route.from)) && to.includes(norm(route.to))
}

async function main() {
  const groups = parseCsv(fs.readFileSync(IN_PATH, 'utf8'))
  const rules = await prisma.counterpartyPriceRule.findMany({
    where: { isActive: true },
    select: {
      counterpartyName: true,
      routeFrom: true,
      routeTo: true,
      vehicleType: true,
      sellPrice: true,
      currency: true
    }
  })

  const out = []
  for (const group of groups) {
    const counterparty = COUNTERPARTY_ALIAS[group.counterparty] || group.counterparty
    const completed = Number(group.completed || 0)
    const dominantPrice = Number(group.dominant_price || 0)
    const dominantCount = Number(group.dominant_count || 0)
    const dominance = completed > 0 ? dominantCount / completed : 0
    const route = routeFor(group)
    const candidates = rules.filter((rule) =>
      norm(rule.counterpartyName) === norm(counterparty) &&
      norm(rule.vehicleType) === norm(group.vehicle_type) &&
      String(rule.currency || 'EUR').toUpperCase() === String(group.currency || 'EUR').toUpperCase() &&
      routeMatches(rule, route)
    )
    const exact = candidates.find((rule) => Math.abs(Number(rule.sellPrice || 0) - dominantPrice) < 0.01)
    const closest = candidates
      .slice()
      .sort((a, b) => Math.abs(Number(a.sellPrice || 0) - dominantPrice) - Math.abs(Number(b.sellPrice || 0) - dominantPrice))[0]
    let status = 'ok'
    if (!route) status = 'needs_route_mapping'
    else if (completed === 0 || dominantPrice <= 0 || dominance < 0.7 || Number(group.complaints || 0) > 0) status = 'needs_review'
    else if (!candidates.length) status = 'missing_rule'
    else if (!exact) status = 'price_mismatch'

    out.push({
      status,
      counterparty: group.counterparty,
      city_code: group.city_code,
      direction: group.direction,
      vehicle_type: group.vehicle_type,
      currency: group.currency,
      completed,
      complaints: group.complaints,
      dominant_price: group.dominant_price,
      dominant_count: group.dominant_count,
      dominance: dominance.toFixed(2),
      db_price: exact ? exact.sellPrice : closest ? closest.sellPrice : '',
      db_route: exact ? `${exact.routeFrom} -> ${exact.routeTo}` : closest ? `${closest.routeFrom} -> ${closest.routeTo}` : '',
      distinct_prices: group.distinct_prices,
      examples: group.examples
    })
  }

  const fields = Object.keys(out[0] || {})
  fs.writeFileSync(OUT_PATH, [
    fields.join(','),
    ...out.map((row) => fields.map((field) => csvEscape(row[field])).join(','))
  ].join('\n'), 'utf8')

  const summary = out.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] || 0) + 1
    return acc
  }, {})
  console.log(JSON.stringify({ ok: true, output: OUT_PATH, summary }, null, 2))
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => prisma.$disconnect())
