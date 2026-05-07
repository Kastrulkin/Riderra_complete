#!/usr/bin/env node
require('dotenv').config()

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const SOURCE = 'manual:mtt-lhr-dec-2025-price-list'
const SOURCE_FILE = 'Pricing List - LHR 12.2025.xlsx'
const CLIENT_NAME = 'My Travel Throu'
const CLIENT_KEY = 'mtt'
const COUNTRY = 'United Kingdom'
const CITY = 'London'
const CURRENCY = 'GBP'

const EXTRAS = {
  airportParkingFee: 7,
  childBoosterSeat: 22,
  nightSurchargePercent: 15,
  nightSurchargeWindow: '22:00-07:00'
}

const vehicleColumns = [
  ['Standard sedan', 'Standard class car'],
  ['Electric standard sedan', 'Standard e-vehicle 3 pax'],
  ['People carrier (4*4)', 'Standard MPV'],
  ['Minivan (6*6)', 'Standard minivan 6 pax']
]

const routeRows = [
  ['LHR', 'London City Center', [52, 52, 65, 84]],
  ['LHR', 'NW', [55, 55, 68, 85]],
  ['LHR', 'N', [55, 55, 72, 90]],
  ['LHR', 'SW', [52, 52, 65, 84]],
  ['LHR', 'W', [52, 52, 65, 88]],
  ['LHR', 'E', [71, 71, 80, 95]],
  ['LHR', 'SE', [55, 55, 72, 92]],
  ['LHR', 'LGW', [76, 76, 90, 105]],
  ['LHR', 'Brighton', [108, 108, 120, 135]],
  ['LHR', 'Portsmouth', [110, 110, 130, 135]],
  ['LHR', 'Reading', [69, 69, 76, 88]],
  ['LHR', 'Southhampton', [110, 110, 130, 140]],
  ['LGW', 'NW', [76, 76, 90, 125]],
  ['LGW', 'N', [79, 79, 92, 125]],
  ['LGW', 'SW', [76, 76, 89, 120]],
  ['LGW', 'W', [74, 74, 90, 115]],
  ['LGW', 'E', [83, 83, 83, 120]],
  ['LGW', 'SE', [78, 78, 91, 130]],
  ['LCY', 'NW', [55, 55, 68, 86]],
  ['LCY', 'N', [55, 55, 66, 70]],
  ['LCY', 'SW', [55, 56, 66, 72]],
  ['LCY', 'W', [55, 56, 66, 85]],
  ['LCY', 'E', [55, 55, 68, 68]],
  ['LCY', 'SE', [55, 55, 68, 68]]
]

function compact(parts) {
  return parts.filter(Boolean).join('\n')
}

async function getTenant() {
  const tenant = await prisma.tenant.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' }
  })
  if (!tenant) throw new Error('Active tenant not found')
  return tenant
}

async function getCompany(tenantId) {
  const externalId = `manual:client-price-list:${CLIENT_KEY}`
  let company = await prisma.customerCompany.findFirst({
    where: {
      tenantId,
      OR: [
        { sourceSystem: 'manual_client_price_list', externalId },
        { name: { equals: CLIENT_NAME, mode: 'insensitive' } },
        { name: { equals: 'MyTravelThru', mode: 'insensitive' } },
        { name: { equals: 'Mytravelthru', mode: 'insensitive' } },
        { name: { equals: 'MTT', mode: 'insensitive' } }
      ]
    }
  })

  const comment = compact([
    'Client account for MTT / MyTravelThru.',
    `Latest London LHR pricing source: ${SOURCE_FILE}.`,
    'London customer prices are stored in CounterpartyPriceRule in GBP.'
  ])

  if (company) {
    return prisma.customerCompany.update({
      where: { id: company.id },
      data: {
        name: CLIENT_NAME,
        companyType: 'client',
        comment: company.comment || comment,
        extraInfo: compact([
          company.extraInfo,
          `clientPriceListKey=${CLIENT_KEY}`,
          `latestMttLondonSource=${SOURCE}`
        ])
      }
    })
  }

  return prisma.customerCompany.create({
    data: {
      tenantId,
      sourceSystem: 'manual_client_price_list',
      externalId,
      name: CLIENT_NAME,
      companyType: 'client',
      comment,
      extraInfo: `clientPriceListKey=${CLIENT_KEY}\nlatestMttLondonSource=${SOURCE}`
    }
  })
}

function priceNotes(sourceLabel, extra = null) {
  return compact([
    `source=${SOURCE}; sourceFile=${SOURCE_FILE}; sourceTab=Sheet1; sourceLabel=${sourceLabel}`,
    `country=${COUNTRY}`,
    `city=${CITY}`,
    `airportAirportParkingFee=${EXTRAS.airportParkingFee} ${CURRENCY}`,
    `childBoosterSeat=${EXTRAS.childBoosterSeat} ${CURRENCY}`,
    `nightSurcharge=${EXTRAS.nightSurchargePercent}% ${EXTRAS.nightSurchargeWindow}`,
    extra
  ])
}

function routeRules() {
  const rows = []
  for (const [routeFrom, routeTo, prices] of routeRows) {
    vehicleColumns.forEach(([sourceVehicle, vehicleType], idx) => {
      const sellPrice = prices[idx]
      const sourceLabel = `${routeFrom} - ${routeTo} / ${sourceVehicle}`
      rows.push({ routeFrom, routeTo, vehicleType, sellPrice, notes: priceNotes(sourceLabel, `sourceVehicle=${sourceVehicle}`) })
      rows.push({ routeFrom: routeTo, routeTo: routeFrom, vehicleType, sellPrice, notes: priceNotes(`${routeTo} - ${routeFrom} / ${sourceVehicle}`, `sourceVehicle=${sourceVehicle}; viceVersa=true`) })
    })
  }
  return rows
}

function addonRules() {
  return [
    {
      routeFrom: 'London airports',
      routeTo: 'London airports',
      vehicleType: 'Add-on: airport-airport parking fee',
      sellPrice: EXTRAS.airportParkingFee,
      markupPercent: null,
      notes: priceNotes('AIRPORT-AIRPORT PARKING FEE', 'addOn=airport_airport_parking_fee')
    },
    {
      routeFrom: 'London',
      routeTo: 'London',
      vehicleType: 'Add-on: child/booster seat',
      sellPrice: EXTRAS.childBoosterSeat,
      markupPercent: null,
      notes: priceNotes('CHILD/BOOSTER SEAT', 'addOn=child_booster_seat')
    },
    {
      routeFrom: 'London',
      routeTo: 'London',
      vehicleType: 'Surcharge: night 22:00-07:00',
      sellPrice: null,
      markupPercent: EXTRAS.nightSurchargePercent,
      notes: priceNotes('NIGHT SURCHARGE 22:00-7:00: 15%', 'addOn=night_surcharge')
    }
  ]
}

async function deactivateOldLondonRules(tenantId, companyId) {
  const routeTokens = ['LHR', 'LGW', 'LCY', 'London', 'NW', 'N', 'SW', 'W', 'E', 'SE', 'Brighton', 'Portsmouth', 'Reading', 'Southhampton']
  const rows = await prisma.counterpartyPriceRule.findMany({
    where: {
      tenantId,
      customerCompanyId: companyId,
      counterpartyName: { equals: CLIENT_NAME, mode: 'insensitive' },
      isActive: true,
      NOT: { notes: { contains: `source=${SOURCE}` } }
    },
    select: { id: true, routeFrom: true, routeTo: true, notes: true }
  })

  const ids = rows
    .filter((row) => {
      const haystack = `${row.routeFrom || ''} ${row.routeTo || ''} ${row.notes || ''}`.toLowerCase()
      return routeTokens.some((token) => haystack.includes(token.toLowerCase()))
    })
    .map((row) => row.id)

  if (ids.length === 0) return 0
  const result = await prisma.counterpartyPriceRule.updateMany({
    where: { id: { in: ids } },
    data: { isActive: false }
  })
  return result.count
}

async function upsertRule(tenantId, company, row) {
  const data = {
    tenantId,
    customerCompanyId: company.id,
    counterpartyName: CLIENT_NAME,
    city: CITY,
    routeFrom: row.routeFrom,
    routeTo: row.routeTo,
    vehicleType: row.vehicleType,
    sellPrice: row.sellPrice,
    markupPercent: row.markupPercent === undefined ? null : row.markupPercent,
    minMarginAbs: null,
    currency: CURRENCY,
    startsAt: null,
    endsAt: null,
    isActive: true,
    notes: row.notes
  }

  const existing = await prisma.counterpartyPriceRule.findFirst({
    where: {
      tenantId,
      counterpartyName: { equals: CLIENT_NAME, mode: 'insensitive' },
      routeFrom: { equals: row.routeFrom, mode: 'insensitive' },
      routeTo: { equals: row.routeTo, mode: 'insensitive' },
      vehicleType: { equals: row.vehicleType, mode: 'insensitive' }
    },
    select: { id: true }
  })

  if (existing) {
    await prisma.counterpartyPriceRule.update({ where: { id: existing.id }, data })
    return 'updated'
  }
  await prisma.counterpartyPriceRule.create({ data })
  return 'created'
}

async function verify(tenantId) {
  const expected = [...routeRules(), ...addonRules()]
  const missing = []
  const wrongCurrency = []

  for (const row of expected) {
    const found = await prisma.counterpartyPriceRule.findFirst({
      where: {
        tenantId,
        counterpartyName: { equals: CLIENT_NAME, mode: 'insensitive' },
        routeFrom: { equals: row.routeFrom, mode: 'insensitive' },
        routeTo: { equals: row.routeTo, mode: 'insensitive' },
        vehicleType: { equals: row.vehicleType, mode: 'insensitive' },
        isActive: true
      },
      select: { id: true, sellPrice: true, markupPercent: true, currency: true }
    })
    if (!found) {
      missing.push(row)
      continue
    }
    if (found.currency !== CURRENCY) wrongCurrency.push({ ...row, actualCurrency: found.currency })
  }

  return {
    expected: expected.length,
    missing: missing.length,
    wrongCurrency: wrongCurrency.length,
    missingExamples: missing.slice(0, 5),
    wrongCurrencyExamples: wrongCurrency.slice(0, 5)
  }
}

async function main() {
  const tenant = await getTenant()
  const company = await getCompany(tenant.id)
  const stats = { created: 0, updated: 0, staleDeactivated: 0 }

  stats.staleDeactivated = await deactivateOldLondonRules(tenant.id, company.id)

  for (const row of [...routeRules(), ...addonRules()]) {
    const result = await upsertRule(tenant.id, company, row)
    stats[result] += 1
  }

  console.log(JSON.stringify({
    ok: true,
    tenant: { id: tenant.id, code: tenant.code, name: tenant.name },
    company: { id: company.id, name: company.name },
    source: SOURCE,
    currency: CURRENCY,
    extras: EXTRAS,
    stats,
    verification: await verify(tenant.id)
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
