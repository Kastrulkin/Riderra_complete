#!/usr/bin/env node
require('dotenv').config()

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const SOURCE = 'manual:april-2026-actual-trip-price-check'
const SPREADSHEET_ID = '1NIPASg-pUOLPcsLOtdRzhVxSmelshTRFc5tsic3NR9E'

const rules = [
  // Rideways: dominant/clean April factual prices.
  ['Rideways', 'Tbilisi International Airport (TBS)', 'Tbilisi', 'Standard class car', 18, 'EUR', 'Observed dominant Tbilisi PT A fare; negative/19.8 rows treated as adjustments.'],
  ['Rideways', 'Tbilisi', 'Tbilisi International Airport (TBS)', 'Standard class car', 18, 'EUR', 'Observed dominant Tbilisi PT D fare.'],
  ['Rideways', 'Tbilisi International Airport (TBS)', 'Tbilisi', 'Business class car', 23, 'EUR', 'Observed Tbilisi MBE A fare.'],
  ['Rideways', 'Tbilisi', 'Tbilisi International Airport (TBS)', 'Business class car', 23, 'EUR', 'Observed Tbilisi MBE D fare.'],
  ['Rideways', 'Tbilisi International Airport (TBS)', 'Tbilisi', 'Standard minivan 6 pax', 31, 'EUR', 'Observed dominant Tbilisi MV/MPV A fare; 36 EUR rows treated as larger/adjusted variants.'],
  ['Rideways', 'Batumi International Airport (BUS)', 'Batumi', 'Standard class car', 19, 'EUR', 'Observed dominant Batumi PT A fare; 20.2/20.9/21.21 rows treated as adjusted variants.'],
  ['Rideways', 'Batumi International Airport (BUS)', 'Batumi', 'Standard minivan 6 pax', 26, 'EUR', 'Observed Batumi MV A fare.'],
  ['Rideways', 'Almaty International Airport (ALA)', 'Almaty', 'Standard class car', 20, 'EUR', 'Observed Almaty PT A fare.'],
  ['Rideways', 'Almaty', 'Almaty International Airport (ALA)', 'Standard class car', 20, 'EUR', 'Observed Almaty PT D fare.'],
  ['Rideways', 'Helsinki-Vantaa Airport (HEL)', 'Helsinki', 'Standard class car', 31.62, 'EUR', 'Observed dominant April HEL PT A fare; 30.04/33.14/34.88/38 rows remain variants.'],
  ['Rideways', 'Helsinki', 'Helsinki-Vantaa Airport (HEL)', 'Standard class car', 31.62, 'EUR', 'Observed dominant April HEL PT D fare; 30.04/32.96/34.69 rows remain variants.'],
  ['Rideways', 'Helsinki-Vantaa Airport (HEL)', 'Helsinki', 'Standard minivan 6 pax', 60, 'EUR', 'Observed HEL MV A fare; 57 EUR row treated as variant.'],
  ['Rideways', 'Helsinki-Vantaa Airport (HEL)', 'Helsinki', 'Standard e-vehicle 3 pax', 50, 'EUR', 'Observed HEL Electric PT A fare.'],
  ['Rideways', 'Helsinki', 'Helsinki-Vantaa Airport (HEL)', 'Standard e-vehicle 3 pax', 50, 'EUR', 'Observed HEL Electric PT D fare.'],
  ['Rideways', 'Kaunas International Airport (KUN)', 'Kaunas', 'Standard class car', 30, 'EUR', 'Observed Kaunas PT A fare.'],
  ['Rideways', 'Kaunas International Airport (KUN)', 'Kaunas', 'Standard MPV', 37, 'EUR', 'Observed Kaunas MV A fare.'],
  ['Rideways', 'Kaunas', 'Kaunas International Airport (KUN)', 'Standard MPV', 37, 'EUR', 'Observed Kaunas MV/MPV D fare.'],
  ['Rideways', 'Zvartnots International Airport (EVN)', 'Yerevan', 'Standard class car', 13, 'EUR', 'Observed dominant Yerevan PT A fare; 13.5 rows remain variants.'],
  ['Rideways', 'Yerevan', 'Zvartnots International Airport (EVN)', 'Standard class car', 13, 'EUR', 'Observed Yerevan PT D fare.'],
  ['Rideways', 'Riga International Airport (RIX)', 'Riga', 'Standard class car', 27, 'EUR', 'Observed Riga city PT A fare; lower/higher Riga-area rows include non-city destinations such as Jurmala.'],

  // Suntransfers: dominant/clean April factual prices.
  ['Suntransfers', 'Copenhagen airport (CPH)', 'Copenhagen', 'Standard class car', 55, 'EUR', 'Observed repeated Copenhagen PT A fare; 70 EUR rows include child seat.'],
  ['Suntransfers', 'Copenhagen', 'Copenhagen airport (CPH)', 'Standard class car', 55, 'EUR', 'Observed repeated Copenhagen PT D fare; 70 EUR rows include child seat.'],
  ['Suntransfers', 'Stockholm Arlanda airport (ARN)', 'Stockholm', 'Standard class car', 70, 'EUR', 'Observed repeated Stockholm PT A fare.'],
  ['Suntransfers', 'Stockholm', 'Stockholm Arlanda airport (ARN)', 'Standard class car', 70, 'EUR', 'Observed repeated Stockholm PT D fare.'],
  ['Suntransfers', 'Helsinki-Vantaa Airport (HEL)', 'Helsinki', 'Standard class car', 40, 'EUR', 'Observed April HEL PT A fare.'],
  ['Suntransfers', 'Helsinki', 'Helsinki-Vantaa Airport (HEL)', 'Standard class car', 40, 'EUR', 'Observed April HEL PT D fare.'],
  ['Suntransfers', 'Rovaniemi', 'Rovaniemi airport (RVN)', 'Standard class car', 65, 'EUR', 'Observed Rovaniemi PT D fare.'],
  ['Suntransfers', 'Gothenburg-Landvetter airport (GOT)', 'Gothenburg', 'Standard class car', 85, 'EUR', 'Observed Gothenburg city PT A fare.'],
  ['Suntransfers', 'Gothenburg', 'Gothenburg-Landvetter airport (GOT)', 'Standard class car', 85, 'EUR', 'Observed Gothenburg city PT D fare.'],
  ['Suntransfers', 'Gothenburg-Landvetter airport (GOT)', 'Marstrand', 'Standard class car', 210, 'EUR', 'Observed Gothenburg airport to Marstrand ferry PT A fare.'],
  ['Suntransfers', 'Marstrand', 'Gothenburg-Landvetter airport (GOT)', 'Standard class car', 210, 'EUR', 'Observed Marstrand ferry to Gothenburg airport PT D fare.'],
  ['Suntransfers', 'Seoul Incheon airport (ICN)', 'Seoul', 'Standard minivan 5 pax', 122, 'EUR', 'Observed repeated Seoul MV 5 pax A fare.'],
  ['Suntransfers', 'Seoul', 'Seoul Incheon airport (ICN)', 'Standard minivan 5 pax', 122, 'EUR', 'Observed repeated Seoul MV 5 pax D fare; 205/255 rows are larger group variants.'],
  ['Suntransfers', 'Seoul Incheon airport (ICN)', 'Seoul', 'Standard class car', 108, 'EUR', 'Observed Seoul PT A fare.'],
  ['Suntransfers', 'Tokyo Cruise Port (JPTYO)', 'Tokyo Haneda airport (HND)', 'Standard minivan 6 pax', 122, 'EUR', 'Observed Tokyo port to Haneda MV D fare.'],
  ['Suntransfers', 'Tokyo Narita airport (NRT)', 'Tokyo Cruise Port (JPTYO)', 'Standard minivan 6 pax', 168, 'EUR', 'Observed Tokyo Narita to port MV A fare.'],
  ['Suntransfers', 'Tokyo Cruise Port (JPTYO)', 'Tokyo', 'Standard class car', 120, 'EUR', 'Observed Tokyo Port PT A fare.'],
  ['Suntransfers', 'Aarhus Airport (AAR)', 'Aarhus', 'Standard class car', 114, 'EUR', 'Observed Aarhus PT A fare.'],

  // Transferz: stable April factual prices and normalized Los Angeles port/LAX cases.
  ['Transferz', 'Helsinki-Vantaa Airport (HEL)', 'Helsinki', 'Standard class car', 35, 'EUR', 'Observed dominant HEL PT A fare; 42/45.5/46.4 rows are area/seat/buffer variants.'],
  ['Transferz', 'Helsinki', 'Helsinki-Vantaa Airport (HEL)', 'Standard class car', 35, 'EUR', 'Observed dominant HEL PT D fare.'],
  ['Transferz', 'Helsinki-Vantaa Airport (HEL)', 'Helsinki', 'Standard minivan 6 pax', 60, 'EUR', 'Observed HEL MV A fare; 78/145 rows are variants/longer destinations.'],
  ['Transferz', 'Helsinki', 'Helsinki-Vantaa Airport (HEL)', 'Standard minivan 6 pax', 60, 'EUR', 'Observed HEL MV D fare.'],
  ['Transferz', 'Kaunas Airport (KUN)', 'Kaunas', 'Standard class car', 30, 'EUR', 'Observed repeated Kaunas PT A fare.'],
  ['Transferz', 'Kaunas Airport (KUN)', 'Kaunas', 'Standard MPV', 36.99, 'EUR', 'Observed Kaunas MV A 5 pax fare.'],
  ['Transferz', 'Vancouver International Airport (YVR)', 'Vancouver', 'Business class car', 41.34, 'CAD', 'Observed repeated Vancouver MBE A fare.'],
  ['Transferz', 'Vancouver International Airport (YVR)', 'Vancouver', 'Standard class car', 46, 'CAD', 'Observed Vancouver PT A fare.'],
  ['Transferz', 'Port of Vancouver', 'Vancouver', 'Business class car', 52, 'CAD', 'Observed Vancouver Port MBE A fare.'],
  ['Transferz', 'Los Angeles Port Cruise Terminal (port)', 'Los Angeles International Airport (LAX)', 'Standard class car', 50.83, 'USD', 'Observed repeated Los Angeles Port -> LAX PT D fare.'],
  ['Transferz', 'Los Angeles Port Cruise Terminal (port)', 'Los Angeles International Airport (LAX)', 'SUV', 63.53, 'USD', 'Observed repeated Los Angeles Port -> LAX SUV D fare.'],
  ['Transferz', 'Los Angeles International Airport (LAX)', 'Los Angeles Port Cruise Terminal (port)', 'SUV', 47.44, 'USD', 'Observed LAX -> Los Angeles Port SUV A fare.'],
  ['Transferz', 'Los Angeles International Airport (LAX)', 'Beverly Hills', 'Standard minivan 6 pax', 50.83, 'USD', 'Observed LAX -> Beverly Hills MV A fare; complaint/cancel rows excluded from confidence.'],
  ['Transferz', 'Beverly Hills', 'Los Angeles Port Cruise Terminal (port)', 'Standard class car', 63.53, 'USD', 'Observed Beverly Hills -> Los Angeles Port PT D fare.'],
  ['Transferz', 'West Hollywood', 'Los Angeles Port Cruise Terminal (port)', 'Standard minivan 6 pax', 95, 'USD', 'Observed West Hollywood -> Los Angeles Port MV D fare.'],
  ['Transferz', 'Santa Monica', 'Los Angeles International Airport (LAX)', 'Standard MPV', 74.21, 'USD', 'Observed Santa Monica -> LAX MPV D fare.']
]

function compact(parts) {
  return parts.filter(Boolean).join('\n')
}

function keyWhere(tenantId, counterpartyName, routeFrom, routeTo, vehicleType) {
  return {
    tenantId,
    counterpartyName,
    routeFrom: { equals: routeFrom, mode: 'insensitive' },
    routeTo: { equals: routeTo, mode: 'insensitive' },
    vehicleType: { equals: vehicleType, mode: 'insensitive' }
  }
}

async function getTenant() {
  const tenant = await prisma.tenant.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' }
  })
  if (!tenant) throw new Error('Active tenant not found')
  return tenant
}

async function getCompany(tenantId, name) {
  let company = await prisma.customerCompany.findFirst({
    where: { tenantId, name: { equals: name, mode: 'insensitive' } }
  })
  if (company) {
    return prisma.customerCompany.update({
      where: { id: company.id },
      data: { companyType: 'client' }
    })
  }
  return prisma.customerCompany.create({
    data: {
      tenantId,
      sourceSystem: 'manual_client_price_list',
      externalId: `${SOURCE}:${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      name,
      companyType: 'client',
      comment: 'Client account created from April 2026 actual trip price reconciliation.'
    }
  })
}

async function upsertRule(tenantId, company, row) {
  const [counterpartyName, routeFrom, routeTo, vehicleType, sellPrice, currency, note] = row
  const data = {
    tenantId,
    customerCompanyId: company.id,
    counterpartyName,
    city: routeTo,
    routeFrom,
    routeTo,
    vehicleType,
    sellPrice,
    markupPercent: null,
    minMarginAbs: null,
    currency,
    startsAt: null,
    endsAt: null,
    isActive: true,
    notes: compact([
      `source=${SOURCE}; spreadsheetId=${SPREADSHEET_ID}`,
      note
    ])
  }

  const existing = await prisma.counterpartyPriceRule.findFirst({
    where: keyWhere(tenantId, counterpartyName, routeFrom, routeTo, vehicleType)
  })

  if (existing) {
    await prisma.counterpartyPriceRule.update({ where: { id: existing.id }, data })
    return 'updated'
  }
  await prisma.counterpartyPriceRule.create({ data })
  return 'created'
}

function normalizePlace(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/airport/g, '')
    .replace(/international/g, '')
    .replace(/-/g, ' ')
    .replace(/[^a-z0-9а-яёäöåøæüéèçğşıİñ]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeVehicle(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim()
}

async function findBase(tenantId, routeFrom, routeTo, vehicleType) {
  const candidates = await prisma.cityPricing.findMany({
    where: {
      tenantId,
      isActive: true,
      OR: [
        { routeFrom: { equals: routeFrom, mode: 'insensitive' }, routeTo: { equals: routeTo, mode: 'insensitive' } },
        { routeFrom: { equals: routeTo, mode: 'insensitive' }, routeTo: { equals: routeFrom, mode: 'insensitive' } },
        { routeFrom: { contains: routeFrom.split(' ')[0], mode: 'insensitive' } },
        { routeTo: { contains: routeTo.split(' ')[0], mode: 'insensitive' } }
      ]
    },
    select: { routeFrom: true, routeTo: true, vehicleType: true, fixedPrice: true, currency: true }
  })

  const fromNorm = normalizePlace(routeFrom)
  const toNorm = normalizePlace(routeTo)
  const vehicleNorm = normalizeVehicle(vehicleType)

  return candidates.find((row) => {
    const a = normalizePlace(row.routeFrom)
    const b = normalizePlace(row.routeTo)
    const v = normalizeVehicle(row.vehicleType)
    return ((a === fromNorm && b === toNorm) || (a === toNorm && b === fromNorm)) && v === vehicleNorm
  }) || null
}

async function compareWithBase(tenantId) {
  const out = []
  for (const row of rules) {
    const [counterpartyName, routeFrom, routeTo, vehicleType, sellPrice, currency] = row
    const base = await findBase(tenantId, routeFrom, routeTo, vehicleType)
    out.push({
      counterpartyName,
      routeFrom,
      routeTo,
      vehicleType,
      clientPrice: sellPrice,
      clientCurrency: currency,
      basePrice: base ? Number(base.fixedPrice) : null,
      baseCurrency: base ? base.currency : null,
      diff: base && base.currency === currency ? Number((sellPrice - Number(base.fixedPrice)).toFixed(2)) : null,
      baseRoute: base ? `${base.routeFrom} -> ${base.routeTo}` : null
    })
  }
  return out
}

async function main() {
  const tenant = await getTenant()
  const companies = new Map()
  const stats = { created: 0, updated: 0 }

  for (const row of rules) {
    const name = row[0]
    if (!companies.has(name)) companies.set(name, await getCompany(tenant.id, name))
    const result = await upsertRule(tenant.id, companies.get(name), row)
    stats[result] += 1
  }

  console.log(JSON.stringify({
    ok: true,
    tenant: { id: tenant.id, code: tenant.code, name: tenant.name },
    source: SOURCE,
    rules: stats,
    baseComparison: await compareWithBase(tenant.id)
  }, null, 2))
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
