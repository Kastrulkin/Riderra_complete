#!/usr/bin/env node
require('dotenv').config()

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const SOURCE = 'manual:march-2026-actual-trip-price-check'
const SPREADSHEET_ID = '1o_dgC5Fb5Lv0ofSh5C65YpDZhLllY4jb7AWNrSCNNws'

const rules = [
  // Transferz: actual clean March prices from trip sheet.
  ['Transferz', 'Helsinki-Vantaa Airport (HEL)', 'Helsinki', 'Standard class car', 35, 'EUR', 'Observed HEL PT A clean fare. 45.x rows treated as buffers/surcharges unless approved.'],
  ['Transferz', 'Helsinki', 'Helsinki-Vantaa Airport (HEL)', 'Standard class car', 35, 'EUR', 'Observed HEL PT D clean fare. 45.x rows treated as buffers/surcharges unless approved.'],
  ['Transferz', 'Helsinki-Vantaa Airport (HEL)', 'Helsinki', 'Standard minivan 6 pax', 60, 'EUR', 'Observed HEL MV A clean fare. Higher rows include child seats/buffers.'],
  ['Transferz', 'Helsinki', 'Helsinki-Vantaa Airport (HEL)', 'Standard minivan 6 pax', 60, 'EUR', 'Observed HEL MV D clean fare. Higher rows include child seats/buffers.'],
  ['Transferz', 'Helsinki-Vantaa Airport (HEL)', 'Helsinki', 'Business class car', 50, 'EUR', 'Observed HEL MBE A clean fare.'],
  ['Transferz', 'Kaunas Airport (KUN)', 'Kaunas', 'Standard class car', 30, 'EUR', 'Observed Kaunas PT A clean fare.'],
  ['Transferz', 'Vancouver International Airport (YVR)', 'Vancouver', 'Standard minivan 6 pax', 52.5, 'EUR', 'Observed Vancouver MV A clean fares around 52.31-52.73; 60.59 has booster note.'],

  // Suntransfers: actual clean March prices from trip sheet.
  ['Suntransfers', 'Helsinki-Vantaa Airport (HEL)', 'Helsinki', 'Standard class car', 38, 'EUR', 'Corrected to Riderra base, not March received 40.'],
  ['Suntransfers', 'Helsinki', 'Helsinki-Vantaa Airport (HEL)', 'Standard class car', 38, 'EUR', 'Corrected to Riderra base, not March received 40.'],
  ['Suntransfers', 'Helsinki-Vantaa Airport (HEL)', 'Helsinki', 'Standard minivan 6 pax', 70, 'EUR', 'Clean HEL MV A base; 75/95 rows include direction, child seats, or extra stops.'],
  ['Suntransfers', 'Helsinki', 'Helsinki-Vantaa Airport (HEL)', 'Standard minivan 6 pax', 75, 'EUR', 'Observed HEL MV D clean fare.'],
  ['Suntransfers', 'Copenhagen airport (CPH)', 'Copenhagen', 'Standard class car', 55, 'EUR', 'Observed repeated Copenhagen PT A fare.'],
  ['Suntransfers', 'Copenhagen', 'Copenhagen airport (CPH)', 'Standard class car', 55, 'EUR', 'Observed repeated Copenhagen PT D fare.'],
  ['Suntransfers', 'Rovaniemi airport (RVN)', 'Rovaniemi', 'Standard class car', 65, 'EUR', 'Observed repeated Rovaniemi PT A fare.'],
  ['Suntransfers', 'Rovaniemi', 'Rovaniemi airport (RVN)', 'Standard class car', 65, 'EUR', 'Observed repeated Rovaniemi PT D fare.'],
  ['Suntransfers', 'Rovaniemi airport (RVN)', 'Rovaniemi', 'Standard minivan 6 pax', 85, 'EUR', 'Observed longer/local Rovaniemi MV/PT factual fare; verify for exact hotel zones.'],
  ['Suntransfers', 'Kittila Airport (KTT)', 'Levi', 'Standard class car', 85, 'EUR', 'Observed Kittila PT A fare.'],
  ['Suntransfers', 'Levi', 'Kittila Airport (KTT)', 'Standard class car', 85, 'EUR', 'Observed Kittila PT D fare.'],
  ['Suntransfers', 'Kittila Airport (KTT)', 'Levi', 'Standard minivan 6 pax', 98, 'EUR', 'Observed Kittila MV D fare; 113 row includes child seat note.'],
  ['Suntransfers', 'Levi', 'Kittila Airport (KTT)', 'Standard minivan 6 pax', 98, 'EUR', 'Observed Kittila MV D fare; 113 row includes child seat note.'],
  ['Suntransfers', 'Seoul Incheon airport (ICN)', 'Seoul', 'Standard minivan 7 pax', 205, 'EUR', 'Observed Seoul MV A fare; notes mention 6-8 pax/10-seater.'],
  ['Suntransfers', 'Tokyo Cruise Port (JPTYO)', 'Tokyo', 'Standard class car', 120, 'EUR', 'Observed Tokyo Port PT A fare.'],
  ['Suntransfers', 'Tokyo', 'Tokyo Cruise Port (JPTYO)', 'Standard class car', 120, 'EUR', 'Observed Tokyo Port PT D fare.'],
  ['Suntransfers', 'Aarhus Airport (AAR)', 'Aarhus', 'Standard class car', 114, 'EUR', 'Observed Aarhus PT A fare.'],
  ['Suntransfers', 'Aarhus', 'Aarhus Airport (AAR)', 'Standard class car', 114, 'EUR', 'Observed Aarhus PT D fare.'],
  ['Suntransfers', 'Oslo-Gardermoen airport (OSL)', 'Oslo', 'Standard Minibus 16pax', 296, 'EUR', 'Observed Oslo Sprinter A fare.'],
  ['Suntransfers', 'Oslo', 'Oslo-Gardermoen airport (OSL)', 'Standard Minibus 16pax', 296, 'EUR', 'Observed Oslo Sprinter D fare.'],
  ['Suntransfers', 'Gothenburg-Landvetter airport (GOT)', 'Gothenburg', 'Standard minivan 7 pax', 130, 'EUR', 'Updated from actual Gothenburg MV fare.'],
  ['Suntransfers', 'Gothenburg', 'Gothenburg-Landvetter airport (GOT)', 'Standard minivan 7 pax', 130, 'EUR', 'Updated from actual Gothenburg MV fare.'],
  ['Suntransfers', 'Jönköping', 'Gothenburg-Landvetter airport (GOT)', 'Standard minivan 6 pax', 270, 'EUR', 'Observed confirmed/manual Gothenburg-Jönköping MV note; complaint rows are not base fares.'],

  // Rideways: client price list created from repeated March factual prices.
  ['Rideways', 'Tbilisi International Airport (TBS)', 'Tbilisi', 'Standard class car', 18, 'EUR', 'Observed dominant Tbilisi PT A fare; 19.8 rows treated as non-base/adjusted cases.'],
  ['Rideways', 'Tbilisi', 'Tbilisi International Airport (TBS)', 'Standard class car', 18, 'EUR', 'Observed Tbilisi PT D fare.'],
  ['Rideways', 'Tbilisi International Airport (TBS)', 'Tbilisi', 'Business class car', 23, 'EUR', 'Observed Tbilisi MBE A fare.'],
  ['Rideways', 'Tbilisi', 'Tbilisi International Airport (TBS)', 'Business class car', 23, 'EUR', 'Observed Tbilisi MBE D fare.'],
  ['Rideways', 'Tbilisi International Airport (TBS)', 'Tbilisi', 'Standard minivan 6 pax', 31, 'EUR', 'Observed Tbilisi MV A fare.'],
  ['Rideways', 'Batumi International Airport (BUS)', 'Batumi', 'Standard class car', 19, 'EUR', 'Observed dominant Batumi PT A fare; 20.9 row treated as adjusted case.'],
  ['Rideways', 'Batumi', 'Batumi International Airport (BUS)', 'Standard class car', 18.5, 'EUR', 'Observed Batumi PT D fare.'],
  ['Rideways', 'Batumi International Airport (BUS)', 'Batumi', 'Standard minivan 6 pax', 26, 'EUR', 'Observed Batumi MV A fare.'],
  ['Rideways', 'Almaty International Airport (ALA)', 'Almaty', 'Standard class car', 20, 'EUR', 'Observed dominant Almaty PT A fare; 27.01/31.55 rows treated as non-base.'],
  ['Rideways', 'Almaty', 'Almaty International Airport (ALA)', 'Standard class car', 20, 'EUR', 'Observed Almaty PT D fare.'],
  ['Rideways', 'Helsinki-Vantaa Airport (HEL)', 'Helsinki', 'Standard class car', 38, 'EUR', 'Observed HEL PT A fare.'],
  ['Rideways', 'Helsinki', 'Helsinki-Vantaa Airport (HEL)', 'Standard class car', 38, 'EUR', 'Observed HEL PT D fare.'],
  ['Rideways', 'Helsinki-Vantaa Airport (HEL)', 'Helsinki', 'Business class car', 55, 'EUR', 'Observed HEL MBE A fare.'],
  ['Rideways', 'Helsinki', 'Helsinki-Vantaa Airport (HEL)', 'Business class car', 55, 'EUR', 'Observed HEL MBE D fare.'],
  ['Rideways', 'Helsinki-Vantaa Airport (HEL)', 'Helsinki', 'Standard minivan 6 pax', 60, 'EUR', 'Observed HEL MV A fare.'],
  ['Rideways', 'Helsinki-Vantaa Airport (HEL)', 'Helsinki', 'Standard e-vehicle 3 pax', 50, 'EUR', 'Observed HEL Electric A fare.'],
  ['Rideways', 'Kaunas International Airport (KUN)', 'Kaunas', 'Standard class car', 30, 'EUR', 'Observed Kaunas PT A fare.'],
  ['Rideways', 'Kaunas', 'Kaunas International Airport (KUN)', 'Standard class car', 30, 'EUR', 'Observed Kaunas PT D fare.'],
  ['Rideways', 'Kaunas International Airport (KUN)', 'Kaunas', 'Standard MPV', 37, 'EUR', 'Observed Kaunas MV A fare.'],
  ['Rideways', 'Kaunas', 'Kaunas International Airport (KUN)', 'Standard MPV', 37, 'EUR', 'Observed Kaunas MV D fare.'],
  ['Rideways', 'Kutaisi International Airport (KUT)', 'Kutaisi', 'Standard minivan 6 pax', 55, 'EUR', 'Observed Kutaisi MV A fare.'],
  ['Rideways', 'Zvartnots International Airport (EVN)', 'Yerevan', 'Standard class car', 13, 'EUR', 'Observed dominant Yerevan PT A fare; 13.5 rows noted but kept out as adjusted/non-base until approved.'],
  ['Rideways', 'Yerevan', 'Zvartnots International Airport (EVN)', 'Standard class car', 13, 'EUR', 'Observed Yerevan PT D fare; 9.69 rows treated as non-base adjusted cases.'],
  ['Rideways', 'Riga International Airport (RIX)', 'Riga', 'Standard class car', 27, 'EUR', 'Observed Riga PT A fare.'],
  ['Rideways', 'Vilnius International Airport (VNO)', 'Vilnius', 'Business class car', 45, 'EUR', 'Observed single Vilnius MBE D fare; note says Camry via Benas 40 EUR, so verify before commercial change.'],
  ['Rideways', 'Los Angeles International Airport (LAX)', 'Anaheim', 'Standard MPV', 70, 'USD', 'Observed Rideways Los Angeles MPV A/D factual fare. LA route normalized to base district Anaheim.'],
  ['Rideways', 'Anaheim', 'Los Angeles International Airport (LAX)', 'Standard MPV', 70, 'USD', 'Observed Rideways Los Angeles MPV D factual fare. LA route normalized to base district Anaheim.'],
  ['Rideways', 'Los Angeles International Airport (LAX)', 'Port of LA', 'Standard MPV', 67.08, 'USD', 'Observed LAX -> San Pedro/Port of LA MPV factual fare.'],
  ['Rideways', 'Inglewood', 'Port of LA', 'Standard MPV', 89.44, 'USD', 'Observed Inglewood/LAX hotel -> San Pedro World Cruise Center MPV factual fare; route kept district-to-port, not airport.'],
  ['Rideways', 'Marrakech Menara Airport (RAK)', 'Marrakech', 'First class car', 46.71, 'EUR', 'Observed Marrakech LUXC A/D fare.'],
  ['Rideways', 'Marrakech', 'Marrakech Menara Airport (RAK)', 'First class car', 46.71, 'EUR', 'Observed Marrakech LUXC D fare.'],
  ['Rideways', 'Marrakech Menara Airport (RAK)', 'Marrakech', 'Standard minivan 6 pax', 20.08, 'EUR', 'Observed repeated Marrakech MV A fare.'],

  // Talixo: client price list created from March factual prices.
  ['Talixo', 'Helsinki-Vantaa Airport (HEL)', 'Helsinki', 'Standard class car', 38.25, 'EUR', 'Observed dominant Talixo HEL PT A fare; 34/37.25/38.24/39.88 rows treated as non-base variants.'],
  ['Talixo', 'Helsinki', 'Helsinki-Vantaa Airport (HEL)', 'Standard class car', 38.25, 'EUR', 'Observed dominant Talixo HEL PT D fare; 34/38.24 variants treated as non-base.'],
  ['Talixo', 'Helsinki Main Train Station', 'Helsinki', 'Standard class car', 38.25, 'EUR', 'Observed HEL RSt PT D fare; 32.66 row treated as non-base adjustment.'],

  // Airports Taxi Transfers: client price list created from March factual prices.
  ['Airports Taxi Transfers', 'Helsinki-Vantaa Airport (HEL)', 'Helsinki', 'Standard class car', 38, 'EUR', 'Observed HEL PT A clean fare.'],
  ['Airports Taxi Transfers', 'Helsinki', 'Helsinki-Vantaa Airport (HEL)', 'Standard class car', 40, 'EUR', 'Observed HEL PT D fare.'],
  ['Airports Taxi Transfers', 'Helsinki Main Train Station', 'Helsinki', 'Standard class car', 40, 'EUR', 'Observed HEL RSt PT A fare.'],
  ['Airports Taxi Transfers', 'Helsinki', 'Helsinki Main Train Station', 'Standard class car', 40, 'EUR', 'Observed HEL RSt PT D fare.'],
  ['Airports Taxi Transfers', 'Helsinki-Vantaa Airport (HEL)', 'Porvoo', 'Standard class car', 75, 'EUR', 'Observed HEL-Porvoo PT A fare; driver note 60 EUR is supplier cost.'],
  ['Airports Taxi Transfers', 'Porvoo', 'Helsinki-Vantaa Airport (HEL)', 'Standard class car', 75, 'EUR', 'Observed HEL-Porvoo PT D fare; driver note 60 EUR is supplier cost.'],
  ['Airports Taxi Transfers', 'Helsinki-Vantaa Airport (HEL)', 'Hämeenlinna', 'Standard class car', 117.5, 'EUR', 'Observed HEL-Hämeenlinna PT A fare; driver note 95 EUR is supplier cost.'],
  ['Airports Taxi Transfers', 'Hämeenlinna', 'Helsinki-Vantaa Airport (HEL)', 'Standard class car', 117.5, 'EUR', 'Observed HEL-Hämeenlinna PT D fare; driver note 95 EUR is supplier cost.'],
  ['Airports Taxi Transfers', 'Helsinki-Vantaa Airport (HEL)', 'Turku', 'Business class car', 225, 'EUR', 'Observed HEL-Turku MBE A fare; driver note 180 EUR is supplier cost.'],
  ['Airports Taxi Transfers', 'Tbilisi International Airport (TBS)', 'Tbilisi', 'Standard minivan 6 pax', 32, 'EUR', 'Observed Tbilisi MV A fare.'],
  ['Airports Taxi Transfers', 'Tbilisi', 'Tbilisi International Airport (TBS)', 'Standard minivan 6 pax', 32, 'EUR', 'Observed Tbilisi MV D fare.'],
  ['Airports Taxi Transfers', 'Zvartnots International Airport (EVN)', 'Yerevan', 'Standard class car', 25, 'EUR', 'Observed Yerevan PT A fare.'],
  ['Airports Taxi Transfers', 'Phuket', 'Phuket Airport (HKT)', 'Standard class car', 25, 'USD', 'Observed Phuket PT D fare; supplier note USD 20.00.']
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
      comment: 'Client account created from March 2026 actual trip price reconciliation.'
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

async function addTransferzSuvAliases(tenantId, company) {
  const mpvRules = await prisma.counterpartyPriceRule.findMany({
    where: {
      tenantId,
      counterpartyName: 'Transferz',
      isActive: true,
      vehicleType: { equals: 'MPV', mode: 'insensitive' },
      OR: [
        { routeFrom: { contains: 'Los Angeles', mode: 'insensitive' } },
        { routeTo: { contains: 'Los Angeles', mode: 'insensitive' } },
        { routeFrom: { contains: 'LAX', mode: 'insensitive' } },
        { routeTo: { contains: 'LAX', mode: 'insensitive' } },
        { routeFrom: { contains: 'Long Beach', mode: 'insensitive' } },
        { routeTo: { contains: 'Long Beach', mode: 'insensitive' } }
      ]
    }
  })

  let created = 0
  let updated = 0
  for (const rule of mpvRules) {
    const result = await upsertRule(tenantId, company, [
      'Transferz',
      rule.routeFrom,
      rule.routeTo,
      'SUV',
      Number(rule.sellPrice),
      rule.currency,
      `SUV alias copied from Transferz MPV for Los Angeles reconciliation. Source MPV rule id=${rule.id}.`
    ])
    if (result === 'created') created += 1
    if (result === 'updated') updated += 1
  }
  return { created, updated }
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
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
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
    const sameDirection = a === fromNorm && b === toNorm
    const reverseDirection = a === toNorm && b === fromNorm
    return (sameDirection || reverseDirection) && v === vehicleNorm
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

  const transferzCompany = companies.get('Transferz') || await getCompany(tenant.id, 'Transferz')
  const suvAliases = await addTransferzSuvAliases(tenant.id, transferzCompany)
  const baseComparison = await compareWithBase(tenant.id)

  console.log(JSON.stringify({
    ok: true,
    tenant: { id: tenant.id, code: tenant.code, name: tenant.name },
    rules: stats,
    transferzSuvAliases: suvAliases,
    baseComparison
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
