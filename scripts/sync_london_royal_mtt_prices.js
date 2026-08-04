#!/usr/bin/env node
require('dotenv').config()

const crypto = require('crypto')
const Papa = require('papaparse')
const { PrismaClient } = require('@prisma/client')
const {
  LONDON_AIRPORTS,
  LONDON_DESTINATIONS,
  VEHICLES
} = require('../server/services/londonPricingService')

const prisma = new PrismaClient()
const DRY_RUN = process.env.DRY_RUN === '1'
const APPROVER_EMAIL = String(process.env.APPROVER_EMAIL || '').trim().toLowerCase()
const ALLOWED_APPROVERS = new Set(['demyanov@riderra.com', 'shilin@riderra.com'])
const SHEET_ID = '1rAcXHlZHgutbvhFDFRKNuTRg-HjUFXszkqdR_GWe-0g'
const SHEET_GID = '0'
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit?gid=${SHEET_GID}#gid=${SHEET_GID}`
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`
const ROYAL_SOURCE = 'google_sheet:royal-taxis-london-july-2026'
const MTT_SOURCE = 'manual:mtt-london-user-screenshot-2026-08-04'

const SALE_GRID = [
  ['LHR', 'London City Center', [61, 61, 73, 90]],
  ['LHR', 'NW', [61, 61, 73, 92]],
  ['LHR', 'N', [64, 64, 85, 105]],
  ['LHR', 'SW', [61, 61, 73, 90]],
  ['LHR', 'W', [61, 61, 75, 90]],
  ['LHR', 'E', [64, 64, 85, 105]],
  ['LHR', 'SE', [64, 64, 85, 105]],
  ['LHR', 'LGW', [85, 85, 101, 118]],
  ['LHR', 'Brighton', [124, 124, 135, 152]],
  ['LHR', 'Portsmouth', [124, 124, 140, 166]],
  ['LHR', 'Reading', [72, 72, 80, 90]],
  ['LHR', 'Southhampton', [124, 124, 140, 166]],
  ['LGW', 'NW', [79, 79, 107, 129]],
  ['LGW', 'N', [85, 85, 107, 135]],
  ['LGW', 'SW', [79, 79, 105, 126]],
  ['LGW', 'W', [79, 79, 107, 129]],
  ['LGW', 'E', [88, 88, 110, 135]],
  ['LGW', 'SE', [85, 85, 110, 135]],
  ['LCY', 'NW', [60, 60, 73, 85]],
  ['LCY', 'N', [61, 61, 76, 87]],
  ['LCY', 'SW', [60, 60, 77, 88]],
  ['LCY', 'W', [60, 60, 77, 88]],
  ['LCY', 'E', [60, 60, 77, 88]],
  ['LCY', 'SE', [61, 61, 76, 87]]
]

const SALE_VEHICLES = [VEHICLES.STANDARD, VEHICLES.ELECTRIC, VEHICLES.MPV, VEHICLES.MINIVAN]
const PARKING_RULES = [
  ['LHR', 'arrival', 7.5], ['LHR', 'departure', 7.5],
  ['LGW', 'arrival', 7.5], ['LGW', 'departure', 10],
  ['LCY', 'arrival', 10], ['LCY', 'departure', 10]
]

function money(value) {
  const parsed = Number(String(value || '').replace(/[^\d,.-]/g, '').replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

function canonicalVehicle(value = '') {
  const text = String(value || '').trim().toLowerCase()
  if (text.includes('e-vehicle')) return VEHICLES.ELECTRIC
  if (text.includes('class car')) return VEHICLES.STANDARD
  if (text.includes('mpv')) return VEHICLES.MPV
  if (text.includes('minivan')) return VEHICLES.MINIVAN
  return null
}

function canonicalSheetPoint(value = '') {
  const text = String(value || '').trim()
  const byName = new Map([
    ['London Heathrow Airport (LHR)', LONDON_AIRPORTS.LHR],
    ['London Gatwick Airport (LGW)', LONDON_AIRPORTS.LGW],
    ['London City Airport (LCY)', LONDON_AIRPORTS.LCY],
    ['London City Center', LONDON_DESTINATIONS.CENTER],
    ['London North-West', LONDON_DESTINATIONS.NW],
    ['London North', LONDON_DESTINATIONS.N],
    ['London South-West', LONDON_DESTINATIONS.SW],
    ['London West', LONDON_DESTINATIONS.W],
    ['London East', LONDON_DESTINATIONS.E],
    ['London South-East', LONDON_DESTINATIONS.SE],
    ['Brighton', LONDON_DESTINATIONS.BRIGHTON],
    ['Portsmouth', LONDON_DESTINATIONS.PORTSMOUTH],
    ['Reading', LONDON_DESTINATIONS.READING],
    ['Southhampton', LONDON_DESTINATIONS.SOUTHAMPTON],
    ['Southampton', LONDON_DESTINATIONS.SOUTHAMPTON]
  ])
  return byName.get(text) || null
}

async function loadRoyalRows() {
  const response = await fetch(CSV_URL)
  if (!response.ok) throw new Error(`Royal Taxis sheet download failed: HTTP ${response.status}`)
  const csv = await response.text()
  const parsed = Papa.parse(csv, { skipEmptyLines: false })
  if (parsed.errors?.length) throw new Error(`Royal Taxis CSV parse failed: ${parsed.errors[0].message}`)
  const rows = parsed.data || []
  const headerIndex = rows.findIndex((row) => row.includes('Your best price') && row.includes('Vehilce type'))
  if (headerIndex < 0) throw new Error('Royal Taxis fixed-rate header was not found')
  const header = rows[headerIndex]
  const index = Object.fromEntries(header.map((name, i) => [String(name || '').trim(), i]))
  const result = rows.slice(headerIndex + 1).map((row) => {
    const fromPoint = canonicalSheetPoint(row[index.From])
    const toPoint = canonicalSheetPoint(row[index.To])
    const vehicleType = canonicalVehicle(row[index['Vehilce type']])
    const driverPrice = money(row[index['Your best price']])
    const currency = String(row[index.Currency] || '').trim().toUpperCase()
    if (!fromPoint || !toPoint || !vehicleType || driverPrice == null || currency !== 'GBP') return null
    return {
      fromPoint,
      toPoint,
      vehicleType,
      driverPrice,
      currency,
      passengers: Number(row[index.Pax]) || null,
      distanceMiles: money(row[index['Distance, ml']]),
      distanceKm: money(row[index['Distance, km']])
    }
  }).filter(Boolean)
  const keys = new Set(result.map((row) => `${row.fromPoint}|${row.toPoint}|${row.vehicleType}`))
  if (result.length !== 96 || keys.size !== 96) {
    throw new Error(`Expected 96 unique Royal Taxis fixed rates, received ${result.length} rows and ${keys.size} keys`)
  }
  return result
}

function saleRows() {
  const rows = []
  for (const [from, to, prices] of SALE_GRID) {
    SALE_VEHICLES.forEach((vehicleType, index) => {
      rows.push({ routeFrom: from, routeTo: to, vehicleType, sellPrice: prices[index] })
      rows.push({ routeFrom: to, routeTo: from, vehicleType, sellPrice: prices[index] })
    })
  }
  return rows
}

function normalizedHash(rows) {
  const normalized = [...rows]
    .sort((a, b) => `${a.fromPoint}|${a.toPoint}|${a.vehicleType}`.localeCompare(`${b.fromPoint}|${b.toPoint}|${b.vehicleType}`))
    .map(({ fromPoint, toPoint, vehicleType, driverPrice, currency }) => ({ fromPoint, toPoint, vehicleType, driverPrice, currency }))
  return crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex')
}

async function upsertCompany(tx, tenantId) {
  const sourceSystem = 'google_sheet_supplier_price_list'
  const externalId = 'royal-taxis-london'
  const data = {
    tenantId,
    sourceSystem,
    externalId,
    name: 'Royal Taxis London',
    phone: '+441737371777',
    email: 'info@royaldrive.uk',
    registrationCountry: 'United Kingdom',
    registrationCity: 'London',
    presenceCountries: 'United Kingdom',
    presenceCities: 'London',
    companyType: 'supplier',
    comment: 'Legal name in the supplied Google Sheet: Home James Private Hire Ltd.',
    extraInfo: `source=${ROYAL_SOURCE}\nsourceUrl=${SHEET_URL}\nchildBoosterSeat=22 GBP\nnightSurcharge=15% 22:00-07:00`
  }
  return tx.customerCompany.upsert({ where: { sourceSystem_externalId: { sourceSystem, externalId } }, update: data, create: data })
}

async function upsertDriver(tx, tenantId, company) {
  const existing = await tx.driver.findFirst({
    where: { tenantId, OR: [{ name: { equals: 'Royal Taxis London', mode: 'insensitive' } }, { supplierCompanyId: company.id }] }
  })
  const data = {
    tenantId,
    name: 'Royal Taxis London',
    email: 'info@royaldrive.uk',
    phone: '+441737371777',
    supplierCompanyId: company.id,
    country: 'United Kingdom',
    city: 'London',
    comment: `Approved Royal Taxis net price list. Source: ${SHEET_URL}. Parking is charged separately. Night surcharge: 15% 22:00-07:00.`,
    childSeatPrice: 22,
    pricingCurrency: 'GBP',
    isActive: true,
    verificationStatus: 'verified'
  }
  return existing
    ? tx.driver.update({ where: { id: existing.id }, data })
    : tx.driver.create({ data })
}

async function syncRoyalRoutes(tx, tenantId, driver, rows, sheetHash) {
  const expectedKeys = new Set()
  let created = 0
  let updated = 0
  for (const row of rows) {
    for (const [fromPoint, toPoint, reverse] of [[row.fromPoint, row.toPoint, false], [row.toPoint, row.fromPoint, true]]) {
      const key = `${fromPoint}|${toPoint}|${row.vehicleType}`
      expectedKeys.add(key)
      const existing = await tx.driverRoute.findFirst({ where: { tenantId, driverId: driver.id, fromPoint, toPoint, vehicleType: row.vehicleType } })
      const sourceMeta = {
        source: ROYAL_SOURCE,
        sourceUrl: SHEET_URL,
        sheetHash,
        approvedBy: APPROVER_EMAIL,
        passengers: row.passengers,
        distanceMiles: row.distanceMiles,
        distanceKm: row.distanceKm,
        reverse,
        parking: { LHR: { arrival: 7.5, departure: 7.5 }, LGW: { arrival: 7.5, departure: 10 }, LCY: { arrival: 10, departure: 10 } },
        childBoosterSeat: 22,
        nightSurcharge: { percent: 15, window: '22:00-07:00' }
      }
      const data = {
        tenantId,
        driverId: driver.id,
        fromPoint,
        toPoint,
        vehicleType: row.vehicleType,
        driverPrice: row.driverPrice,
        currency: 'GBP',
        sourceType: 'sheet',
        sourceLabel: 'Royal Taxis London — July 2026 onwards',
        sourceQuotedAt: new Date('2026-07-01T00:00:00.000Z'),
        sourceMessage: `Net price from Royal Taxis Google Sheet. Parking is charged separately. Approved by ${APPROVER_EMAIL}.`,
        sourceStatus: 'approved',
        sourceMetaJson: JSON.stringify(sourceMeta),
        isActive: true
      }
      if (existing) {
        await tx.driverRoute.update({ where: { id: existing.id }, data })
        updated++
      } else {
        await tx.driverRoute.create({ data })
        created++
      }
    }
  }
  const active = await tx.driverRoute.findMany({ where: { tenantId, driverId: driver.id, isActive: true }, select: { id: true, fromPoint: true, toPoint: true, vehicleType: true } })
  const staleIds = active.filter((row) => !expectedKeys.has(`${row.fromPoint}|${row.toPoint}|${row.vehicleType}`)).map((row) => row.id)
  if (staleIds.length) await tx.driverRoute.updateMany({ where: { id: { in: staleIds } }, data: { isActive: false, sourceStatus: 'archived' } })
  return { expected: expectedKeys.size, created, updated, archived: staleIds.length }
}

async function syncMttRules(tx, tenantId) {
  const company = await tx.customerCompany.findFirst({ where: { tenantId, OR: [{ name: { equals: 'My Travel Throu', mode: 'insensitive' } }, { name: { equals: 'MyTravelThru', mode: 'insensitive' } }] } })
  if (!company) throw new Error('MyTravelThru customer company was not found')
  const expectedKeys = new Set()
  let created = 0
  let updated = 0
  for (const row of saleRows()) {
    const key = `${row.routeFrom}|${row.routeTo}|${row.vehicleType}`
    expectedKeys.add(key)
    const existing = await tx.counterpartyPriceRule.findFirst({ where: { tenantId, customerCompanyId: company.id, routeFrom: row.routeFrom, routeTo: row.routeTo, vehicleType: row.vehicleType } })
    const data = {
      tenantId,
      customerCompanyId: company.id,
      counterpartyName: 'My Travel Throu',
      city: 'London',
      routeFrom: row.routeFrom,
      routeTo: row.routeTo,
      vehicleType: row.vehicleType,
      sellPrice: row.sellPrice,
      markupPercent: null,
      minMarginAbs: null,
      currency: 'GBP',
      startsAt: null,
      endsAt: null,
      isActive: true,
      notes: `source=${MTT_SOURCE}\napprovedBy=${APPROVER_EMAIL}\nparking=LHR arrival/departure 7.50 GBP; LGW arrival 7.50 GBP, departure 10 GBP; LCY arrival/departure 10 GBP\nchildBoosterSeat=22 GBP\nnightSurcharge=15% 22:00-07:00`
    }
    if (existing) {
      await tx.counterpartyPriceRule.update({ where: { id: existing.id }, data })
      updated++
    } else {
      await tx.counterpartyPriceRule.create({ data })
      created++
    }
  }
  for (const [airport, direction, price] of PARKING_RULES) {
    const routeFrom = `${airport} ${direction}`
    const routeTo = 'Parking fee'
    const vehicleType = 'Add-on: parking'
    const key = `${routeFrom}|${routeTo}|${vehicleType}`
    expectedKeys.add(key)
    const existing = await tx.counterpartyPriceRule.findFirst({ where: { tenantId, customerCompanyId: company.id, routeFrom, routeTo, vehicleType } })
    const data = { tenantId, customerCompanyId: company.id, counterpartyName: 'My Travel Throu', city: 'London', routeFrom, routeTo, vehicleType, sellPrice: price, markupPercent: null, minMarginAbs: null, currency: 'GBP', startsAt: null, endsAt: null, isActive: true, notes: `source=${MTT_SOURCE}\napprovedBy=${APPROVER_EMAIL}\naddOn=parking_fee` }
    if (existing) await tx.counterpartyPriceRule.update({ where: { id: existing.id }, data })
    else await tx.counterpartyPriceRule.create({ data })
  }
  const specialRules = [
    { routeFrom: 'London', routeTo: 'London', vehicleType: 'Add-on: child/booster seat', sellPrice: 22, markupPercent: null },
    { routeFrom: 'London', routeTo: 'London', vehicleType: 'Surcharge: night 22:00-07:00', sellPrice: null, markupPercent: 15 }
  ]
  for (const row of specialRules) {
    const key = `${row.routeFrom}|${row.routeTo}|${row.vehicleType}`
    expectedKeys.add(key)
    const existing = await tx.counterpartyPriceRule.findFirst({ where: { tenantId, customerCompanyId: company.id, routeFrom: row.routeFrom, routeTo: row.routeTo, vehicleType: row.vehicleType } })
    const data = { tenantId, customerCompanyId: company.id, counterpartyName: 'My Travel Throu', city: 'London', routeFrom: row.routeFrom, routeTo: row.routeTo, vehicleType: row.vehicleType, sellPrice: row.sellPrice, markupPercent: row.markupPercent, minMarginAbs: null, currency: 'GBP', startsAt: null, endsAt: null, isActive: true, notes: `source=${MTT_SOURCE}\napprovedBy=${APPROVER_EMAIL}` }
    if (existing) await tx.counterpartyPriceRule.update({ where: { id: existing.id }, data })
    else await tx.counterpartyPriceRule.create({ data })
  }
  const active = await tx.counterpartyPriceRule.findMany({ where: { tenantId, customerCompanyId: company.id, city: 'London', isActive: true }, select: { id: true, routeFrom: true, routeTo: true, vehicleType: true } })
  const staleIds = active.filter((row) => !expectedKeys.has(`${row.routeFrom}|${row.routeTo}|${row.vehicleType}`)).map((row) => row.id)
  if (staleIds.length) await tx.counterpartyPriceRule.updateMany({ where: { id: { in: staleIds } }, data: { isActive: false } })
  return { expected: expectedKeys.size, created, updated, archived: staleIds.length }
}

async function main() {
  if (!DRY_RUN && !ALLOWED_APPROVERS.has(APPROVER_EMAIL)) {
    throw new Error('APPROVER_EMAIL must be an approved Riderra pricing owner')
  }
  const royalRows = await loadRoyalRows()
  const sheetHash = normalizedHash(royalRows)
  if (DRY_RUN) {
    console.log(JSON.stringify({ dryRun: true, tenant: 'riderra', sheetUrl: SHEET_URL, sheetHash, royalForwardRows: royalRows.length, royalBidirectionalRows: royalRows.length * 2, mttBidirectionalRows: saleRows().length, mttRulesWithAddons: saleRows().length + PARKING_RULES.length + 2, royalExamples: royalRows.slice(0, 4), mttExamples: saleRows().slice(0, 4) }, null, 2))
    return
  }
  const tenant = await prisma.tenant.findUnique({ where: { code: 'riderra' } })
  if (!tenant) throw new Error('Riderra tenant was not found')
  const result = await prisma.$transaction(async (tx) => {
    const company = await upsertCompany(tx, tenant.id)
    const driver = await upsertDriver(tx, tenant.id, company)
    const royal = await syncRoyalRoutes(tx, tenant.id, driver, royalRows, sheetHash)
    const mtt = await syncMttRules(tx, tenant.id)
    await tx.cityPricing.updateMany({ where: { tenantId: null, isActive: true, notes: { contains: 'manual:riderra-base005-london-royal-taxis-mtt-2026-07' } }, data: { isActive: false } })
    return { company: { id: company.id, name: company.name }, driver: { id: driver.id, name: driver.name }, royal, mtt }
  }, { maxWait: 10000, timeout: 120000 })
  console.log(JSON.stringify({ ok: true, approvedBy: APPROVER_EMAIL, tenant: tenant.code, sheetUrl: SHEET_URL, sheetHash, ...result }, null, 2))
}

main().catch((error) => { console.error(error); process.exitCode = 1 }).finally(() => prisma.$disconnect())
