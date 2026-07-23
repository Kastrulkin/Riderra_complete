#!/usr/bin/env node
require('dotenv').config()

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const COUNTRY = 'United States of America'
const CITY = 'Los Angeles'
const BASE_HUB = 'Los Angeles Airport (LAX)'
const HUB_ALIASES = [
  'Los Angeles Airport (LAX)',
  'Los Angeles International Airport (LAX)',
  'Los Angeles International Airport',
  'Los Angeles Airport'
]

const TRANSFERZ_SOURCE = 'manual:riderra-base005-transferz-lax-sales-2026-06'
const TRANSFERZ_SPREADSHEET_ID = '1CF2sXZTrt2NfcVNkxigE4l0zOqSLZKyka3ovZkHHTfI'
const TRANSFERZ_SHEET_TITLE = '06.2026 Los_Angeles_International_Airport_(LAX)_Fares (22)'
const TRANSFERZ_TAB = 'Sheet1'

const BESLAN_SOURCE = 'manual:circassian-sky-beslan-lax-current-2026-06'
const BESLAN_SPREADSHEET_ID = '1wFQnZqUZplzoyO56Jg3W9McJ96QZ5Y4ZWcJ5az3SyQo'
const BESLAN_SHEET_TITLE = 'Беслан Лос Анджелес'
const BESLAN_TAB = 'Information'
const BESLAN_COMPANY_NAME = 'Circassian Sky'
const BESLAN_CONTACT_NAME = 'Беслан'
const BESLAN_QUOTED_AT = new Date('2026-06-25T12:00:00.000Z')
const PRICE_UPDATED_AT = '2026-06-29T00:00:00.000Z'

const VEHICLE_BY_TRANSFERZ_COLUMN = {
  SEDAN: { vehicleType: 'Standard class car', pax: 3 },
  MINIVAN: { vehicleType: 'Standard minivan 6 pax', pax: 6 },
  MPV: { vehicleType: 'Standard MPV', pax: 5 },
  STANDARD_E_VEHICLE: { vehicleType: 'Standard e-vehicle 3 pax', pax: 3 }
}

const BESLAN_VEHICLE_META = {
  'Standard class car': { vehicleType: 'Standard class car', pax: 3 },
  'Standard MPV': { vehicleType: 'Standard MPV', pax: 5 },
  'Standard e-vehicle 3 pax': { vehicleType: 'Standard e-vehicle 3 pax', pax: 3 }
}

const ROUTE_ALIASES = {
  '1.2 Santa Monica': 'Santa Monica',
  'Long Beach': 'Long Beach, California',
  'New Zone 1 - Torrance + LAX + Venice/Mar vista': 'Torrance',
  'New Zone 10 - Jurupa Valley': 'Jurupa Valley',
  'New Zone 2 - Los Angeles Downtown': 'Los Angeles Downtown',
  'New Zone 3.1 - Hollywood': 'Hollywood, California',
  'New Zone 3.2 - Hollywood': 'Hollywood, California',
  'New Zone 4 - Pasadena, Burbank': 'Pasadena',
  'New Zone 5 - Universal City and Glendale': 'Universal City',
  'New Zone 6 - Anaheim 6.1': 'Anaheim',
  'New Zone 6 - Anaheim 6.2': 'Anaheim',
  'New Zone 7.2- San Fernando': 'San Fernando',
  'New Zone 8.1 - Orange': 'Orange',
  'Zone 1.1 - Inglewood': 'Inglewood',
  'Zone 2.2 - Beverly Hills': 'Beverly Hills',
  'Montage Laguna Beach': 'Laguna Beach'
}

const TRANSFERZ_ROWS = [
  { row: 2, geoZoneId: 101630, zone: '1.2 Santa Monica', prices: { SEDAN: 68, MINIVAN: 68, MPV: 73, STANDARD_E_VEHICLE: 150 } },
  { row: 7, geoZoneId: 69164, zone: 'Las Vegas', prices: { SEDAN: 600, MINIVAN: 660, MPV: 672, STANDARD_E_VEHICLE: 900 } },
  { row: 8, geoZoneId: 66727, zone: 'Long Beach', prices: { SEDAN: 75, MINIVAN: 80, MPV: 80, STANDARD_E_VEHICLE: 170 } },
  { row: 9, geoZoneId: 31880, zone: 'Montage Laguna Beach', prices: { MINIVAN: 303, MPV: 336 } },
  { row: 11, geoZoneId: 27598, zone: 'New Zone 1 - Torrance + LAX + Venice/Mar vista', prices: { MINIVAN: 68, MPV: 79 } },
  { row: 12, geoZoneId: 27771, zone: 'New Zone 10 - Jurupa Valley', prices: { MINIVAN: 336, MPV: 392 } },
  { row: 14, geoZoneId: 55077, zone: 'New Zone 2 - Los Angeles Downtown', prices: { SEDAN: 68, MINIVAN: 70, MPV: 68, STANDARD_E_VEHICLE: 140 } },
  { row: 15, geoZoneId: 10973, zone: 'New Zone 3.1 - Hollywood', prices: { SEDAN: 68, MINIVAN: 84, MPV: 96, STANDARD_E_VEHICLE: 160 } },
  { row: 16, geoZoneId: 109956, zone: 'New Zone 3.2 - Hollywood', prices: { SEDAN: 68, MINIVAN: 84, MPV: 96, STANDARD_E_VEHICLE: 160 } },
  { row: 17, geoZoneId: 28643, zone: 'New Zone 4 - Pasadena, Burbank', prices: { MINIVAN: 80, MPV: 80 } },
  { row: 18, geoZoneId: 55082, zone: 'New Zone 5 - Universal City and Glendale', prices: { MINIVAN: 80, MPV: 79 } },
  { row: 19, geoZoneId: 109952, zone: 'New Zone 6 - Anaheim 6.1', prices: { SEDAN: 85, MINIVAN: 90, MPV: 97, STANDARD_E_VEHICLE: 200 } },
  { row: 20, geoZoneId: 27768, zone: 'New Zone 6 - Anaheim 6.2', prices: { SEDAN: 85, MINIVAN: 90, MPV: 97, STANDARD_E_VEHICLE: 200 } },
  { row: 22, geoZoneId: 109725, zone: 'New Zone 7.2- San Fernando', prices: { MINIVAN: 101, MPV: 107 } },
  { row: 23, geoZoneId: 26632, zone: 'New Zone 8.1 - Orange', prices: { MINIVAN: 101, MPV: 191 } },
  { row: 31, geoZoneId: 69165, zone: 'San Diego', prices: { SEDAN: 350, MPV: 350, STANDARD_E_VEHICLE: 470 } },
  { row: 38, geoZoneId: 55131, zone: 'Zone 1.1 - Inglewood', prices: { MINIVAN: 62, MPV: 76 } },
  { row: 39, geoZoneId: 55132, zone: 'Zone 2.2 - Beverly Hills', prices: { SEDAN: 68, MINIVAN: 68, MPV: 73, STANDARD_E_VEHICLE: 160 } }
]

const BESLAN_ROWS = [
  { to: 'Anaheim', prices: { 'Standard class car': 75, 'Standard MPV': 80, 'Standard e-vehicle 3 pax': 160 } },
  { to: 'Beverly Hills', prices: { 'Standard class car': 58, 'Standard MPV': 60, 'Standard e-vehicle 3 pax': 120 } },
  { to: 'Burbank', prices: { 'Standard MPV': 70 } },
  { to: 'Glendale', prices: { 'Standard MPV': 60 } },
  { to: 'Hollywood, California', prices: { 'Standard class car': 58, 'Standard MPV': 60, 'Standard e-vehicle 3 pax': 120 } },
  { to: 'Inglewood', prices: { 'Standard MPV': 54 } },
  { to: 'Jurupa Valley', prices: { 'Standard MPV': 175 } },
  { to: 'Laguna Beach', prices: { 'Standard MPV': 140 } },
  { to: 'Las Vegas', prices: { 'Standard class car': 550, 'Standard MPV': 650, 'Standard e-vehicle 3 pax': 850 } },
  { to: 'Long Beach, California', prices: { 'Standard class car': 65, 'Standard MPV': 70, 'Standard e-vehicle 3 pax': 140 } },
  { to: 'Los Angeles Downtown', prices: { 'Standard class car': 58, 'Standard MPV': 60, 'Standard e-vehicle 3 pax': 120 } },
  { to: 'Malibu', prices: { 'Standard MPV': 80 } },
  { to: 'Orange', prices: { 'Standard MPV': 69 } },
  { to: 'Pasadena', prices: { 'Standard MPV': 60 } },
  { to: 'Port of Los Angeles', prices: { 'Standard class car': 60, 'Standard MPV': 70, 'Standard e-vehicle 3 pax': 140 } },
  { to: 'San Diego', prices: { 'Standard class car': 280, 'Standard MPV': 300, 'Standard e-vehicle 3 pax': 400 } },
  { to: 'San Fernando', prices: { 'Standard MPV': 75 } },
  { to: 'Santa Monica', prices: { 'Standard class car': 58, 'Standard MPV': 60, 'Standard e-vehicle 3 pax': 120 } },
  { to: 'Torrance', prices: { 'Standard MPV': 50 } },
  { to: 'Universal City', prices: { 'Standard MPV': 70 } }
]

function compact(parts) {
  return parts.filter(Boolean).join('\n')
}

function norm(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[()]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function sameText(a, b) {
  return norm(a) === norm(b)
}

function pointMatchesAny(value, candidates) {
  const token = norm(value)
  return candidates.some((candidate) => {
    const candidateToken = norm(candidate)
    return token === candidateToken || token.includes(candidateToken) || candidateToken.includes(token)
  })
}

function sourceKey(prefix, parts) {
  return `${prefix}:${parts.map((part) => norm(part).replace(/\s+/g, '-')).join(':')}`
}

function routeFor(toPoint, direction) {
  if (direction === 'IN') return { routeFrom: toPoint, routeTo: BASE_HUB }
  return { routeFrom: BASE_HUB, routeTo: toPoint }
}

function buildTransferzBaseRows() {
  const out = []
  for (const row of TRANSFERZ_ROWS) {
    const toPoint = ROUTE_ALIASES[row.zone] || row.zone
    for (const [sourceVehicle, price] of Object.entries(row.prices)) {
      const vehicle = VEHICLE_BY_TRANSFERZ_COLUMN[sourceVehicle]
      if (!vehicle || !Number.isFinite(Number(price))) continue
      for (const direction of ['OUT', 'IN']) {
        const route = routeFor(toPoint, direction)
        out.push({
          ...route,
          city: toPoint,
          vehicleType: vehicle.vehicleType,
          pax: vehicle.pax,
          fixedPrice: Number(price),
          currency: 'USD',
          sourceVehicle,
          sourceRow: row.row,
          sourceZone: row.zone,
          geoZoneId: row.geoZoneId,
          direction,
          sourceKey: sourceKey(TRANSFERZ_SOURCE, [row.row, row.zone, sourceVehicle, direction])
        })
      }
    }
  }
  return out
}

function buildBeslanRoutes() {
  const out = []
  for (const row of BESLAN_ROWS) {
    for (const [vehicleType, price] of Object.entries(row.prices)) {
      const vehicle = BESLAN_VEHICLE_META[vehicleType]
      if (!vehicle || !Number.isFinite(Number(price))) continue
      out.push({
        fromPoint: BASE_HUB,
        toPoint: row.to,
        vehicleType: vehicle.vehicleType,
        pax: vehicle.pax,
        driverPrice: Number(price),
        currency: 'USD',
        sourceKey: sourceKey(BESLAN_SOURCE, [row.to, vehicle.vehicleType])
      })
    }
  }
  return out
}

async function getTenant() {
  const tenant = await prisma.tenant.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' }
  })
  if (!tenant) throw new Error('Active tenant not found')
  return tenant
}

async function archiveOldBaseRows(tenantId, transferzRows) {
  const routeNames = [...new Set(transferzRows.flatMap((row) => [row.routeFrom, row.routeTo]).filter((value) => !pointMatchesAny(value, HUB_ALIASES)))]
  const candidates = await prisma.cityPricing.findMany({
    where: {
      tenantId,
      isActive: true,
      country: { equals: COUNTRY, mode: 'insensitive' },
      OR: [
        ...HUB_ALIASES.map((hub) => ({ routeFrom: { contains: hub, mode: 'insensitive' } })),
        ...HUB_ALIASES.map((hub) => ({ routeTo: { contains: hub, mode: 'insensitive' } })),
        { notes: { contains: 'Los Angeles', mode: 'insensitive' } },
        { city: { contains: 'Los Angeles', mode: 'insensitive' } }
      ]
    }
  })

  let archived = 0
  for (const row of candidates) {
    const isCreatedByThisScript = String(row.notes || '').includes(`source=${TRANSFERZ_SOURCE}`)
    if (isCreatedByThisScript) continue

    const touchesHub = pointMatchesAny(row.routeFrom, HUB_ALIASES) || pointMatchesAny(row.routeTo, HUB_ALIASES)
    const touchesRoute = routeNames.some((routeName) => pointMatchesAny(row.routeFrom, [routeName]) || pointMatchesAny(row.routeTo, [routeName]) || sameText(row.city, routeName))
    if (!touchesHub || !touchesRoute) continue

    const notes = compact([
      row.notes || null,
      `status=stale; staleReason=Replaced by Transferz LAX sales prices for Riderra base price list 005; staleAt=2026-06-30; replacementSource=${TRANSFERZ_SOURCE}`
    ])
    await prisma.cityPricing.update({
      where: { id: row.id },
      data: {
        isActive: false,
        notes
      }
    })
    archived += 1
  }
  return archived
}

async function upsertBaseRow(tenantId, row) {
  const notes = compact([
    `source=${TRANSFERZ_SOURCE}; sourceKey=${row.sourceKey}`,
    `priceUpdatedAt=${PRICE_UPDATED_AT}`,
    `sourceSheet=${TRANSFERZ_SHEET_TITLE}; sourceTab=${TRANSFERZ_TAB}; spreadsheetId=${TRANSFERZ_SPREADSHEET_ID}`,
    `basePriceList=005; oldLosAngelesRowsWereMarkedStale=true`,
    `sourceGeoZoneId=${row.geoZoneId}; sourceGeoZone=${row.sourceZone}; sourceVehicle=${row.sourceVehicle}; sourceRow=${row.sourceRow}; direction=${row.direction}`,
    `pax:${row.pax}`
  ])
  const data = {
    tenantId,
    country: COUNTRY,
    city: row.city,
    routeFrom: row.routeFrom,
    routeTo: row.routeTo,
    vehicleType: row.vehicleType,
    fixedPrice: row.fixedPrice,
    pricePerKm: null,
    hourlyRate: null,
    childSeatPrice: null,
    currency: row.currency,
    isActive: true,
    notes,
    source: 'manual'
  }
  const existingBySource = await prisma.cityPricing.findFirst({
    where: {
      tenantId,
      notes: { contains: `sourceKey=${row.sourceKey}` }
    }
  })
  if (existingBySource) {
    await prisma.cityPricing.update({ where: { id: existingBySource.id }, data })
    return 'updated'
  }
  await prisma.cityPricing.create({ data })
  return 'created'
}

async function ensureBeslanDriver(tenantId) {
  let company = await prisma.customerCompany.findFirst({
    where: {
      tenantId,
      OR: [
        { name: { equals: BESLAN_COMPANY_NAME, mode: 'insensitive' } },
        { name: { equals: 'Circassian sky', mode: 'insensitive' } }
      ]
    }
  })
  if (!company) {
    company = await prisma.customerCompany.create({
      data: {
        tenantId,
        sourceSystem: 'manual_supplier',
        externalId: 'manual:carrier:circassian-sky:los-angeles',
        name: BESLAN_COMPANY_NAME,
        companyType: 'transport_company',
        registrationCountry: COUNTRY,
        registrationCity: CITY,
        presenceCountries: COUNTRY,
        presenceCities: CITY,
        ownerName: BESLAN_CONTACT_NAME,
        comment: `Supplier company imported from ${BESLAN_SHEET_TITLE}.`
      }
    })
  }

  let driver = await prisma.driver.findFirst({
    where: {
      tenantId,
      OR: [
        { supplierCompanyId: company.id },
        { name: { equals: BESLAN_CONTACT_NAME, mode: 'insensitive' } },
        { name: { equals: 'Beslan', mode: 'insensitive' } }
      ]
    }
  })
  const data = {
    tenantId,
    name: BESLAN_CONTACT_NAME,
    phone: driver?.phone || '',
    country: COUNTRY,
    city: CITY,
    pricingCurrency: 'USD',
    verificationStatus: 'verified',
    isActive: true,
    supplierCompanyId: company.id,
    supplierContactId: driver?.supplierContactId || null,
    comment: compact([
      driver?.comment || null,
      `Current supplier LAX prices synced from ${BESLAN_SHEET_TITLE}; spreadsheetId=${BESLAN_SPREADSHEET_ID}.`
    ])
  }
  driver = driver
    ? await prisma.driver.update({ where: { id: driver.id }, data })
    : await prisma.driver.create({ data })
  return { company, driver }
}

async function archiveOldBeslanRoutes(tenantId, driverId, currentRows) {
  const routeNames = [...new Set(currentRows.map((row) => row.toPoint))]
  const existing = await prisma.driverRoute.findMany({
    where: {
      tenantId,
      driverId,
      isActive: true,
      OR: [
        ...HUB_ALIASES.map((hub) => ({ fromPoint: { contains: hub, mode: 'insensitive' } })),
        ...HUB_ALIASES.map((hub) => ({ toPoint: { contains: hub, mode: 'insensitive' } })),
        { sourceLabel: { contains: 'Беслан', mode: 'insensitive' } },
        { sourceLabel: { contains: 'Circassian', mode: 'insensitive' } }
      ]
    }
  })
  let archived = 0
  for (const row of existing) {
    if (String(row.sourceMetaJson || '').includes(`"source":"${BESLAN_SOURCE}"`)) continue
    const touchesRoute = routeNames.some((routeName) => pointMatchesAny(row.fromPoint, [routeName]) || pointMatchesAny(row.toPoint, [routeName]))
    const touchesHub = pointMatchesAny(row.fromPoint, HUB_ALIASES) || pointMatchesAny(row.toPoint, HUB_ALIASES)
    if (!touchesHub && !touchesRoute) continue
    await prisma.driverRoute.update({
      where: { id: row.id },
      data: {
        isActive: false,
        sourceStatus: 'archived',
        sourceMessage: compact([
          row.sourceMessage || null,
          `Archived on 2026-06-30 before syncing current Circassian Sky / Beslan LAX supplier prices. Replacement source: ${BESLAN_SOURCE}.`
        ])
      }
    })
    archived += 1
  }
  return archived
}

async function upsertBeslanRoute(tenantId, driverId, row) {
  const sourceMeta = {
    source: BESLAN_SOURCE,
    sourceKey: row.sourceKey,
    sourceSheetId: BESLAN_SPREADSHEET_ID,
    sourceSheetTitle: BESLAN_SHEET_TITLE,
    sourceSheetTab: BESLAN_TAB,
    pax: row.pax,
    priceUpdatedAt: PRICE_UPDATED_AT
  }
  const data = {
    tenantId,
    driverId,
    fromPoint: row.fromPoint,
    toPoint: row.toPoint,
    vehicleType: row.vehicleType,
    driverPrice: row.driverPrice,
    ourPrice: null,
    currency: row.currency,
    sourceType: 'google_sheet',
    sourceLabel: `${BESLAN_SHEET_TITLE}; current supplier prices; ${BESLAN_SOURCE}`,
    sourceQuotedAt: BESLAN_QUOTED_AT,
    sourceMessage: compact([
      'Circassian Sky / Beslan current Los Angeles supplier prices.',
      `Spreadsheet ID: ${BESLAN_SPREADSHEET_ID}; tab: ${BESLAN_TAB}.`,
      `Price updated at: ${PRICE_UPDATED_AT}.`,
      'Only rows with a filled "Your best price" were imported.'
    ]),
    sourceStatus: 'approved',
    sourceMetaJson: JSON.stringify(sourceMeta),
    isActive: true
  }
  const existingBySource = await prisma.driverRoute.findFirst({
    where: {
      tenantId,
      driverId,
      sourceMetaJson: { contains: `"sourceKey":"${row.sourceKey}"` }
    }
  })
  if (existingBySource) {
    await prisma.driverRoute.update({ where: { id: existingBySource.id }, data })
    return 'updated'
  }
  await prisma.driverRoute.create({ data })
  return 'created'
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const baseRows = buildTransferzBaseRows()
  const beslanRoutes = buildBeslanRoutes()
  if (dryRun) {
    console.log(JSON.stringify({
      ok: true,
      dryRun,
      transferz: {
        source: TRANSFERZ_SOURCE,
        rowsPrepared: baseRows.length
      },
      beslan: {
        source: BESLAN_SOURCE,
        rowsPrepared: beslanRoutes.length
      },
      sampleBaseRows: baseRows.slice(0, 10),
      sampleBeslanRoutes: beslanRoutes.slice(0, 10)
    }, null, 2))
    return
  }

  const tenant = await getTenant()
  const summary = {
    ok: true,
    dryRun,
    tenant: { id: tenant.id, code: tenant.code, name: tenant.name },
    transferz: {
      source: TRANSFERZ_SOURCE,
      rowsPrepared: baseRows.length,
      archivedOldBaseRows: 0,
      created: 0,
      updated: 0
    },
    beslan: {
      source: BESLAN_SOURCE,
      rowsPrepared: beslanRoutes.length,
      archivedOldSupplierRoutes: 0,
      created: 0,
      updated: 0
    }
  }

  summary.transferz.archivedOldBaseRows = await archiveOldBaseRows(tenant.id, baseRows)
  for (const row of baseRows) {
    const action = await upsertBaseRow(tenant.id, row)
    summary.transferz[action] += 1
  }

  const { company, driver } = await ensureBeslanDriver(tenant.id)
  summary.beslan.company = { id: company.id, name: company.name }
  summary.beslan.driver = { id: driver.id, name: driver.name }
  summary.beslan.archivedOldSupplierRoutes = await archiveOldBeslanRoutes(tenant.id, driver.id, beslanRoutes)
  for (const row of beslanRoutes) {
    const action = await upsertBeslanRoute(tenant.id, driver.id, row)
    summary.beslan[action] += 1
  }

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
