#!/usr/bin/env node
require('dotenv').config()

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const SOURCE = 'manual:transferofis-istanbul-usd-price-list'
const SOURCE_FILE = 'ISTANBUL USD PRICE LIST.xlsx'
const COMPANY_NAME = 'Transferofis'
const MANAGER_NAME = 'Murat Ozbek'
const DRIVER_NAME = 'Transferofis / Murat Ozbek'
const COUNTRY = 'Turkey'
const CITY = 'Istanbul'
const CURRENCY = 'USD'

const vehicles = [
  ['MERCEDES VITO 6 Pax', 'Standard minivan 6 pax'],
  ['MERCEDES SPRINTER 13 Pax', 'Minibus 13 pax']
]

const airportBlocks = [
  {
    origin: 'Istanbul Airport (IST)',
    sourceHeader: 'ISTANBUL AIRPORT (IST) FROM / TO',
    rows: [
      ['European Side Central (Levent, Besiktas, Maslak, Taksim, Ortakoy)', 57.142857142857146, 74.40476190476191],
      ['Tarabya, Sariyer, Zekeriyakoy', 57.142857142857146, 74.40476190476191],
      ['Ikitelli, Bakirkoy, Bahcelievler, Beylikduzu', 57.142857142857146, 74.40476190476191],
      ['Asian Side Central (Kavacik, Atasehir, Umraniye, Kadikoy, Uskudar)', 64.28571428571428, 81.8452380952381],
      ['Asian Side Outskirts (Maltepe, Kartal, Kurtkoy, Sabiha Gokcen Airport)', 78.57142857142857, 89.28571428571429],
      ['Gebze - Dilovasi', 74.28571428571428, 89.28571428571429]
    ]
  },
  {
    origin: 'Istanbul Sabiha Gokcen Airport (SAW)',
    sourceHeader: 'ISTANBUL SABIHA GOKCEN AIRPORT (SAW) FROM / TO',
    rows: [
      ['European Side Central (Levent, Besiktas, Maslak, Taksim, Ortakoy)', 71.42857142857143, 89.28571428571429],
      ['Tarabya, Sariyer, Zekeriyakoy', 71.42857142857143, 96.72619047619048],
      ['Ikitelli, Bakirkoy, Bahcelievler, Beylikduzu', 78.57142857142857, 104.16666666666666],
      ['Asian Side Central (Kavacik, Atasehir, Umraniye, Kadikoy, Uskudar)', 57.142857142857146, 81.8452380952381],
      ['Asian Side Outskirts (Maltepe, Kartal, Kurtkoy, Sabiha Gokcen Airport)', 64.28571428571428, 81.8452380952381],
      ['Gebze - Dilovasi', 57.142857142857146, 66.96428571428571]
    ]
  }
]

const europeanSideDepartures = [
  ['European Side', 'European Side Central (Levent, Besiktas, Sisli, Maslak, Taksim, Ortakoy)', 50, 61.904761904761905],
  ['European Side', 'Asian Side Central (Kavacik, Atasehir, Umraniye, Kadikoy, Uskudar)', 50, 61.904761904761905]
]

const disposalAndOtherRoutes = [
  ['Istanbul', 'Disposal up to 8 hours / 100 km within Istanbul', 242.85714285714283, 293.45238095238096],
  ['Istanbul', 'Full day disposal up to 12 hours / 120 km classic Istanbul tour', 257.1428571428571, 345.23809523809524],
  ['European Side', 'Night tour within European Side restaurant round trip', 142.85714285714286, 207.14285714285714],
  ['European Side', 'Night tour European Side to Asian Side restaurant round trip', 157.14285714285714, 201.1904761904762],
  ['European Side', 'Cerkezkoy daily trip', 342.85714285714283, 414.2857142857143],
  ['Istanbul Airport (IST)', 'Cerkezkoy transfer', 171.42857142857142, 241.66666666666666],
  ['Istanbul Sabiha Gokcen Airport (SAW)', 'Cerkezkoy transfer', 228.57142857142858, 310.71428571428567],
  ['Istanbul', 'Bursa daily trip', 399.99999999999994, 552.3809523809524],
  ['Bursa', 'Anadolu transfer', 285.7142857142857, 414.2857142857143]
]

function compact(parts) {
  return parts.filter(Boolean).join('\n')
}

function roundPrice(value) {
  return Math.round(Number(value) * 100) / 100
}

function ruleKey(routeFrom, routeTo, vehicleType, serviceKind) {
  return `${SOURCE}:${serviceKind}:${routeFrom}->${routeTo}:${vehicleType}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function buildRules() {
  const out = []

  for (const block of airportBlocks) {
    for (const [destination, vito, sprinter] of block.rows) {
      vehicles.forEach(([sourceVehicle, vehicleType], idx) => {
        const driverPrice = roundPrice(idx === 0 ? vito : sprinter)
        for (const [routeFrom, routeTo, viceVersa] of [
          [block.origin, destination, false],
          [destination, block.origin, true]
        ]) {
          out.push({
            routeFrom,
            routeTo,
            vehicleType,
            driverPrice,
            serviceKind: 'airport-transfer',
            sourceVehicle,
            sourceHeader: block.sourceHeader,
            viceVersa
          })
        }
      })
    }
  }

  for (const [routeFrom, routeTo, vito, sprinter] of europeanSideDepartures) {
    vehicles.forEach(([sourceVehicle, vehicleType], idx) => {
      out.push({
        routeFrom,
        routeTo,
        vehicleType,
        driverPrice: roundPrice(idx === 0 ? vito : sprinter),
        serviceKind: 'european-side-departure',
        sourceVehicle,
        sourceHeader: 'FREQUENTLY USED ROUTES - DEPARTING FROM THE EUROPEAN SIDE',
        viceVersa: false
      })
    })
  }

  for (const [routeFrom, routeTo, vito, sprinter] of disposalAndOtherRoutes) {
    vehicles.forEach(([sourceVehicle, vehicleType], idx) => {
      out.push({
        routeFrom,
        routeTo,
        vehicleType,
        driverPrice: roundPrice(idx === 0 ? vito : sprinter),
        serviceKind: 'disposal-other-route',
        sourceVehicle,
        sourceHeader: 'DISPOSAL / OTHER ROUTES',
        viceVersa: false
      })
    })
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

async function getSupplierCompany(tenantId) {
  let company = await prisma.customerCompany.findFirst({
    where: {
      tenantId,
      OR: [
        { name: { equals: COMPANY_NAME, mode: 'insensitive' } },
        { name: { equals: 'Transfer Ofis', mode: 'insensitive' } },
        { name: { equals: 'TransferOffice', mode: 'insensitive' } },
        { ownerName: { equals: MANAGER_NAME, mode: 'insensitive' } }
      ]
    }
  })

  const data = {
    name: COMPANY_NAME,
    companyType: 'supplier',
    ownerName: MANAGER_NAME,
    comment: compact([
      company?.comment,
      `Supplier prices imported from ${SOURCE_FILE}. source=${SOURCE}`
    ])
  }

  if (company) {
    return prisma.customerCompany.update({ where: { id: company.id }, data })
  }

  return prisma.customerCompany.create({
    data: {
      tenantId,
      sourceSystem: 'manual_supplier_price_list',
      externalId: SOURCE,
      ...data
    }
  })
}

async function getDriver(tenantId, company) {
  let driver = await prisma.driver.findFirst({
    where: {
      tenantId,
      OR: [
        { name: { equals: DRIVER_NAME, mode: 'insensitive' } },
        { name: { contains: 'Transferofis', mode: 'insensitive' } },
        { supplierCompanyId: company.id }
      ]
    }
  })

  const data = {
    tenantId,
    name: DRIVER_NAME,
    phone: 'not provided',
    country: COUNTRY,
    city: CITY,
    supplierCompanyId: company.id,
    isActive: true,
    verificationStatus: 'verified',
    pricingCurrency: CURRENCY,
    comment: compact([
      driver?.comment,
      `Manager: ${MANAGER_NAME}. Supplier company: ${COMPANY_NAME}. Latest Istanbul USD prices source=${SOURCE}.`
    ])
  }

  if (driver) {
    return prisma.driver.update({ where: { id: driver.id }, data })
  }

  return prisma.driver.create({ data })
}

async function upsertDriverRoute(tenantId, driver, row) {
  const sourceLabel = ruleKey(row.routeFrom, row.routeTo, row.vehicleType, row.serviceKind)
  const data = {
    tenantId,
    driverId: driver.id,
    fromPoint: row.routeFrom,
    toPoint: row.routeTo,
    vehicleType: row.vehicleType,
    driverPrice: row.driverPrice,
    ourPrice: null,
    currency: CURRENCY,
    sourceType: 'manual',
    sourceLabel,
    sourceQuotedAt: new Date('2026-05-06T00:00:00.000Z'),
    sourceMessage: `${COMPANY_NAME} Istanbul USD price list: ${row.routeFrom} -> ${row.routeTo}, ${row.sourceVehicle}, ${row.driverPrice} ${CURRENCY}.`,
    sourceStatus: 'approved',
    sourceMetaJson: JSON.stringify({
      source: SOURCE,
      sourceFile: SOURCE_FILE,
      sourceHeader: row.sourceHeader,
      serviceKind: row.serviceKind,
      sourceVehicle: row.sourceVehicle,
      supplierCompany: COMPANY_NAME,
      manager: MANAGER_NAME,
      viceVersa: row.viceVersa
    }),
    isActive: true
  }

  const existing = await prisma.driverRoute.findFirst({
    where: { tenantId, driverId: driver.id, sourceLabel },
    select: { id: true, driverPrice: true, currency: true }
  })

  if (existing) {
    await prisma.driverRoute.update({ where: { id: existing.id }, data })
    return { action: 'updated', previous: existing }
  }

  await prisma.driverRoute.create({ data })
  return { action: 'created', previous: null }
}

async function verify(tenantId, driverId) {
  const expected = buildRules()
  const missing = []
  const wrongCurrency = []

  for (const row of expected) {
    const sourceLabel = ruleKey(row.routeFrom, row.routeTo, row.vehicleType, row.serviceKind)
    const found = await prisma.driverRoute.findFirst({
      where: { tenantId, driverId, sourceLabel, isActive: true },
      select: { id: true, driverPrice: true, currency: true }
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
  const company = await getSupplierCompany(tenant.id)
  const driver = await getDriver(tenant.id, company)
  const stats = { created: 0, updated: 0 }

  for (const row of buildRules()) {
    const result = await upsertDriverRoute(tenant.id, driver, row)
    stats[result.action] += 1
  }

  console.log(JSON.stringify({
    ok: true,
    tenant: { id: tenant.id, code: tenant.code, name: tenant.name },
    supplierCompany: { id: company.id, name: company.name, ownerName: company.ownerName },
    driver: { id: driver.id, name: driver.name },
    source: SOURCE,
    currency: CURRENCY,
    stats,
    verification: await verify(tenant.id, driver.id)
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
