#!/usr/bin/env node
require('dotenv').config()

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const SOURCE = 'manual:transferz-lax-price-sheet-stale-2026-06'
const SPREADSHEET_ID = '1CF2sXZTrt2NfcVNkxigE4l0zOqSLZKyka3ovZkHHTfI'
const SOURCE_FILE = '06. 2026 старые Los_Angeles_International_Airport_(LAX)_Fares (22)'
const SOURCE_TAB = 'Sheet1'
const COUNTERPARTY = 'Transferz'
const HUB = 'Los Angeles International Airport (LAX)'
const COUNTRY = 'United States of America'
const CURRENCY = 'USD'
const STALE_MONTH = '2026-06'
const ENDS_AT = new Date('2026-06-30T23:59:59.000Z')

const columns = [
  ['ECONOMY_SEDAN_IN', 'ECONOMY_SEDAN', 'IN'],
  ['ECONOMY_SEDAN_OUT', 'ECONOMY_SEDAN', 'OUT'],
  ['SEDAN_IN', 'SEDAN', 'IN'],
  ['SEDAN_OUT', 'SEDAN', 'OUT'],
  ['BUSINESS_SEDAN_IN', 'BUSINESS_SEDAN', 'IN'],
  ['BUSINESS_SEDAN_OUT', 'BUSINESS_SEDAN', 'OUT'],
  ['SUV_IN', 'SUV', 'IN'],
  ['SUV_OUT', 'SUV', 'OUT'],
  ['MINIVAN_IN', 'MINIVAN', 'IN'],
  ['MINIVAN_OUT', 'MINIVAN', 'OUT'],
  ['MPV_IN', 'MPV', 'IN'],
  ['MPV_OUT', 'MPV', 'OUT'],
  ['VAN_IN', 'VAN', 'IN'],
  ['VAN_OUT', 'VAN', 'OUT']
]

const rows = [
  [2, 101630, '1.2 Santa Monica', ['', '', '', '', '', '', 55, 55, 68, 68, 73, 73, 224, 224]],
  [7, 69164, 'Las Vegas', ['', '', '', '', '', '', 594, 594, 639, 639, 672, 672, 1120, 1120]],
  [8, 66727, 'Long Beach', ['', '', '', '', '', '', 56, 56, 62, 62, 73, 73, 236, 236]],
  [9, 31880, 'Montage Laguna Beach', ['', '', '', '', '', '', 224, 224, 303, 303, 336, 336, 392, 392]],
  [10, 92641, 'Montrose', ['', '', '', '', '', '', 79, 79, 90, 90, 96, 96, 269, 269]],
  [11, 27598, 'New Zone 1 - Torrance + LAX + Venice/Mar vista', ['', '', '', '', '', '', 53, 53, 68, 68, 79, 79, 168, 168]],
  [12, 27771, 'New Zone 10 - Jurupa Valley', ['', '', '', '', '', '', '', '', 336, 336, 392, 392, '', '']],
  [13, 26633, 'New Zone 11 - San Bernardino', ['', '', '', '', '', '', '', '', '', '', 448, 448, 1008, 1008]],
  [14, 55077, 'New Zone 2 - Los Angeles Downtown', ['', '', '', '', '', '', 54, 54, 62, 62, 68, 68, 180, 180]],
  [15, 10973, 'New Zone 3.1 - Hollywood', ['', '', '', '', '', '', 56, 56, 84, 84, 96, 96, 202, 202]],
  [16, 109956, 'New Zone 3.2 - Hollywood', ['', '', '', '', '', '', '', '', 84, 84, 96, 96, 202, 202]],
  [17, 28643, 'New Zone 4 - Pasadena, Burbank', ['', '', '', '', '', '', 64, 64, 68, 68, 73, 73, 247, 247]],
  [18, 55082, 'New Zone 5 - Universal City and Glendale', ['', '', '', '', '', '', 64, 64, 73, 73, 79, 79, 224, 224]],
  [19, 109952, 'New Zone 6 - Anaheim 6.1', ['', '', '', '', '', '', 84, 84, 84, 84, 97, 97, 280, 280]],
  [20, 27768, 'New Zone 6 - Anaheim 6.2', ['', '', '', '', '', '', '', '', 84, 84, 97, 97, 280, 280]],
  [21, 26631, 'New Zone 7 - Calabasas and Malibu', ['', '', '', '', '', '', 101, 101, 101, 101, 107, 107, 280, 280]],
  [22, 109725, 'New Zone 7.2- San Fernando', ['', '', '', '', '', '', '', '', 101, 101, 107, 107, 280, 280]],
  [23, 26632, 'New Zone 8.1 - Orange', ['', '', '', '', '', '', 96, 96, 101, 101, 191, 191, 314, 314]],
  [24, 109724, 'New Zone 8.2- Pomona', ['', '', '', '', '', '', '', '', 101, 101, 191, 191, 314, 314]],
  [25, 27770, 'New Zone 9 - Ontario', ['', '', '', '', '', '', 180, 180, 191, 191, 202, 202, 392, 392]],
  [27, 104946, 'Oxnard+ Ventura + Camarillo', ['', '', '', '', 280, 280, '', '', 224, 224, 224, 224, '', '']],
  [29, 104778, 'San Ana+ Irvine+ Huntington Beach', ['', '', '', '', 168, 168, 96, 96, 101, 101, 135, 135, 280, 280]],
  [30, 104777, 'San Clemente+ Mission Viejo+ Lake Forest', ['', '', '', '', 280, 280, 280, 280, 280, 280, 280, 280, 426, 426]],
  [33, 104690, 'San Marcos+ Rancho Santa Fe+ Escondido', ['', '', '', '', 314, 314, 314, 314, 314, 314, 314, 314, 448, 448]],
  [35, 104937, 'Santa Clarita', ['', '', '', '', 202, 202, 101, 101, 112, 112, 135, 135, 280, 280]],
  [36, 104936, 'Sunland+ Tujunga', ['', '', '', '', 168, 168, 112, 112, 112, 112, 112, 112, 224, 224]],
  [37, 104940, 'Thousand Oaks+ Simi Valley', ['', '', '', '', 191, 191, 112, 112, 135, 135, 135, 135, 314, 314]],
  [38, 55131, 'Zone 1.1 - Inglewood', ['', '', '', '', '', '', 53, 53, 62, 62, 76, 76, 180, 180]],
  [39, 55132, 'Zone 2.2 - Beverly Hills', ['', '', '', '', '', '', 61, 61, 68, 68, 73, 73, 224, 224]]
]

function compact(parts) {
  return parts.filter(Boolean).join('\n')
}

function routeFor(geozone, direction) {
  if (direction === 'IN') return { routeFrom: geozone, routeTo: HUB }
  return { routeFrom: HUB, routeTo: geozone }
}

function buildRules() {
  const rules = []
  for (const [sourceRow, geoZoneId, geozone, values] of rows) {
    values.forEach((rawPrice, index) => {
      if (rawPrice === '' || rawPrice === null || rawPrice === undefined) return
      const [sourceColumn, vehicleType, direction] = columns[index]
      const price = Number(rawPrice)
      if (!Number.isFinite(price)) return
      const { routeFrom, routeTo } = routeFor(geozone, direction)
      rules.push({
        sourceKey: `${SOURCE}:row-${sourceRow}:col-${sourceColumn}`,
        sourceRow,
        sourceColumn,
        geoZoneId,
        geozone,
        routeFrom,
        routeTo,
        vehicleType,
        direction,
        sellPrice: price
      })
    })
  }
  return rules
}

async function getTenant() {
  const tenant = await prisma.tenant.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' }
  })
  if (!tenant) throw new Error('Active tenant not found')
  return tenant
}

async function getTransferzCompany(tenantId) {
  const externalId = `${SOURCE}:transferz`
  const existing = await prisma.customerCompany.findFirst({
    where: {
      tenantId,
      OR: [
        { sourceSystem: 'manual_client_price_list', externalId },
        { name: { equals: COUNTERPARTY, mode: 'insensitive' } }
      ]
    }
  })
  const comment = compact([
    'Client account created/updated from Transferz LAX historical price sheet.',
    `Source file: ${SOURCE_FILE}.`,
    `Spreadsheet ID: ${SPREADSHEET_ID}.`,
    'Rows are stored in CounterpartyPriceRule as inactive stale client sell prices.'
  ])
  if (existing) {
    return prisma.customerCompany.update({
      where: { id: existing.id },
      data: {
        companyType: 'client',
        comment: existing.comment || comment
      }
    })
  }
  return prisma.customerCompany.create({
    data: {
      tenantId,
      sourceSystem: 'manual_client_price_list',
      externalId,
      name: COUNTERPARTY,
      companyType: 'client',
      comment,
      extraInfo: `clientPriceListKey=transferz; historicalPriceList=${SOURCE}`
    }
  })
}

async function upsertRule(tenantId, company, row) {
  const notes = compact([
    `source=${SOURCE}; sourceKey=${row.sourceKey}`,
    `status=stale; staleMonth=${STALE_MONTH}; inactiveArchive=true`,
    `sourceFile=${SOURCE_FILE}; sourceTab=${SOURCE_TAB}; spreadsheetId=${SPREADSHEET_ID}`,
    `country=${COUNTRY}; geoZoneId=${row.geoZoneId}; geozone=${row.geozone}; direction=${row.direction}; sourceColumn=${row.sourceColumn}; sourceRow=${row.sourceRow}`,
    'Transferz price sheet was current before Circassian Sky / Beslan updated selling prices in June 2026.'
  ])
  const data = {
    tenantId,
    customerCompanyId: company.id,
    counterpartyName: COUNTERPARTY,
    city: row.geozone,
    routeFrom: row.routeFrom,
    routeTo: row.routeTo,
    vehicleType: row.vehicleType,
    sellPrice: row.sellPrice,
    markupPercent: null,
    minMarginAbs: null,
    currency: CURRENCY,
    startsAt: null,
    endsAt: ENDS_AT,
    isActive: false,
    notes
  }
  const existing = await prisma.counterpartyPriceRule.findFirst({
    where: {
      tenantId,
      counterpartyName: COUNTERPARTY,
      notes: { contains: `sourceKey=${row.sourceKey}` }
    }
  })
  if (existing) {
    await prisma.counterpartyPriceRule.update({ where: { id: existing.id }, data })
    return 'updated'
  }
  await prisma.counterpartyPriceRule.create({ data })
  return 'created'
}

async function main() {
  const tenant = await getTenant()
  const company = await getTransferzCompany(tenant.id)
  const rules = buildRules()
  const stats = { created: 0, updated: 0 }

  for (const row of rules) {
    const result = await upsertRule(tenant.id, company, row)
    stats[result] += 1
  }

  const verifyCount = await prisma.counterpartyPriceRule.count({
    where: {
      tenantId: tenant.id,
      counterpartyName: COUNTERPARTY,
      isActive: false,
      notes: { contains: `source=${SOURCE}` }
    }
  })

  console.log(JSON.stringify({
    ok: true,
    tenant: { id: tenant.id, code: tenant.code, name: tenant.name },
    source: SOURCE,
    spreadsheetId: SPREADSHEET_ID,
    rulesInPayload: rules.length,
    rules: stats,
    inactiveStaleRulesInDb: verifyCount
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
