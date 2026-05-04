#!/usr/bin/env node
require('dotenv').config()

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const SOURCE_LABEL = 'Google Sheet "Беслан Лос Анджелес", updated from WhatsApp prices, 27.04.2026'
const SOURCE_QUOTED_AT = new Date('2026-04-27T22:50:00+03:00')
const SOURCE_MESSAGE = [
  'Circassian sky / Beslan Los Angeles supplier prices.',
  'Source prices were provided on 27.04.2026 for routes From/To LAX and LAX - Las Vegas / San Diego.',
  'Values were written to Google Sheet column "Your best price" and highlighted green.',
  'MPV 6pax is mapped to Standard MPV with 5 passengers, not Businessvan 6 pax.',
  'Business class (e-vehicle) is mapped to Standard e-vehicle 3 pax.',
  'Currency: USD.'
].join('\n')

const COMPANY_NAME = 'Circassian sky'
const CONTACT_NAME = 'Беслан'
const COUNTRY = 'United States of America'
const CITY = 'Los Angeles'
const AIRPORT = 'Los Angeles Airport (LAX)'

const VEHICLE_META = {
  sedan: {
    dbVehicleType: 'sedan',
    aliases: ['sedan'],
    sourceClass: 'sedan 3pax',
    sheetVehicleType: 'Standard class car',
    passengers: 3
  },
  standard_mpv: {
    dbVehicleType: 'Standard MPV',
    aliases: ['standard_mpv', 'Standard MPV'],
    sourceClass: 'MPV 6pax',
    sheetVehicleType: 'Standard MPV',
    passengers: 5,
    note: 'User clarified MPV 6pax should be stored as Standard MPV with Pax=5.'
  },
  standard_e_vehicle: {
    dbVehicleType: 'Standard e-vehicle 3 pax',
    aliases: ['standard_e_vehicle', 'Standard e-vehicle 3 pax'],
    sourceClass: 'business class (e-vehicle)',
    sheetVehicleType: 'Standard e-vehicle 3 pax',
    passengers: 3
  }
}

const routePrices = [
  {
    toPoint: 'Hollywood, California',
    sourceRouteLabel: 'New Zone 3.1 - Hollywood',
    directionNote: 'From/To LAX',
    prices: { sedan: 58, standard_mpv: 60, standard_e_vehicle: 120 }
  },
  {
    toPoint: 'Beverly Hills',
    sourceRouteLabel: 'Zone 2.2 - Beverly Hills',
    directionNote: 'From/To LAX',
    prices: { sedan: 58, standard_mpv: 60, standard_e_vehicle: 120 }
  },
  {
    toPoint: 'Anaheim',
    sourceRouteLabel: 'New Zone 6 - Anaheim 6.1',
    directionNote: 'From/To LAX',
    prices: { sedan: 75, standard_mpv: 80, standard_e_vehicle: 160 }
  },
  {
    toPoint: 'Los Angeles Downtown',
    sourceRouteLabel: 'New Zone 2 - Los Angeles Downtown',
    directionNote: 'From/To LAX',
    prices: { sedan: 58, standard_mpv: 60, standard_e_vehicle: 120 }
  },
  {
    toPoint: 'Santa Monica',
    sourceRouteLabel: 'Santa Monica',
    directionNote: 'From/To LAX',
    prices: { sedan: 58, standard_mpv: 60, standard_e_vehicle: 120 }
  },
  {
    toPoint: 'Long Beach, California',
    sourceRouteLabel: 'Long Beach',
    directionNote: 'From/To LAX',
    prices: { sedan: 65, standard_mpv: 70, standard_e_vehicle: 140 }
  },
  {
    toPoint: 'Port of Los Angeles',
    sourceRouteLabel: 'Port of LA',
    directionNote: 'From/To LAX; rows were added to the source sheet because no exact LAX-Port rows existed.',
    prices: { sedan: 60, standard_mpv: 70, standard_e_vehicle: 140 }
  },
  {
    toPoint: 'Las Vegas',
    sourceRouteLabel: 'LAX - Las Vegas',
    directionNote: 'LAX - Las Vegas',
    prices: { sedan: 550, standard_mpv: 650, standard_e_vehicle: 850 }
  },
  {
    toPoint: 'San Diego',
    sourceRouteLabel: 'LAX - San Diego',
    directionNote: 'LAX - San Diego; rows were added to the source sheet because no exact LAX-San Diego rows existed.',
    prices: { sedan: 280, standard_mpv: 300, standard_e_vehicle: 400 }
  }
]

async function getTenant() {
  const tenant = await prisma.tenant.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' }
  })
  if (!tenant) throw new Error('Active tenant not found')
  return tenant
}

async function upsertSupplierContact(tenantId) {
  let contact = await prisma.customerContact.findFirst({
    where: {
      tenantId,
      OR: [
        { externalId: 'manual:beslan:los-angeles' },
        { fullName: { equals: CONTACT_NAME, mode: 'insensitive' } }
      ]
    }
  })

  const comment = [
    'Supplier contact for Circassian sky in Los Angeles.',
    `Price source: ${SOURCE_LABEL}.`,
    'Phone/email were not provided in the pricing source.',
    'Rates are stored in DriverRoute by route and class.'
  ].join('\n')

  const data = {
    tenantId,
    sourceSystem: 'manual_supplier',
    externalId: 'manual:beslan:los-angeles',
    fullName: CONTACT_NAME,
    phone: null,
    registrationCountry: COUNTRY,
    registrationCity: CITY,
    presenceCountries: COUNTRY,
    presenceCities: 'Los Angeles, Anaheim, Beverly Hills, Hollywood, Las Vegas, Long Beach, Port of Los Angeles, San Diego, Santa Monica',
    countryPresence: COUNTRY,
    cityPresence: CITY,
    comment
  }

  contact = contact
    ? await prisma.customerContact.update({ where: { id: contact.id }, data })
    : await prisma.customerContact.create({ data })

  await prisma.customerContactSegment.upsert({
    where: {
      contactId_segment: {
        contactId: contact.id,
        segment: 'supplier_contact'
      }
    },
    update: { sourceFile: 'google_sheet' },
    create: {
      contactId: contact.id,
      segment: 'supplier_contact',
      sourceFile: 'google_sheet'
    }
  })

  return contact
}

async function upsertSupplierCompany(tenantId, contactId) {
  let company = await prisma.customerCompany.findFirst({
    where: {
      tenantId,
      OR: [
        { externalId: 'manual:carrier:circassian-sky:los-angeles' },
        { name: { equals: COMPANY_NAME, mode: 'insensitive' } }
      ]
    }
  })

  const comment = [
    'Transport company in Los Angeles.',
    `Manager/contact: ${CONTACT_NAME}.`,
    `Price source: ${SOURCE_LABEL}.`,
    'Classes covered: sedan 3pax, Standard MPV 5 pax, Standard e-vehicle 3 pax.'
  ].join('\n')

  const data = {
    tenantId,
    sourceSystem: 'manual_supplier',
    externalId: 'manual:carrier:circassian-sky:los-angeles',
    name: COMPANY_NAME,
    phone: null,
    registrationCountry: COUNTRY,
    registrationCity: CITY,
    presenceCountries: COUNTRY,
    presenceCities: 'Los Angeles, Anaheim, Beverly Hills, Hollywood, Las Vegas, Long Beach, Port of Los Angeles, San Diego, Santa Monica',
    countryPresence: COUNTRY,
    cityPresence: CITY,
    companyType: 'transport_company',
    ownerName: CONTACT_NAME,
    comment
  }

  company = company
    ? await prisma.customerCompany.update({ where: { id: company.id }, data })
    : await prisma.customerCompany.create({ data })

  await prisma.customerCompanySegment.upsert({
    where: {
      companyId_segment: {
        companyId: company.id,
        segment: 'supplier_company'
      }
    },
    update: { sourceFile: 'google_sheet' },
    create: {
      companyId: company.id,
      segment: 'supplier_company',
      sourceFile: 'google_sheet'
    }
  })

  await prisma.customerCompanyContact.upsert({
    where: {
      companyId_contactId: {
        companyId: company.id,
        contactId
      }
    },
    update: {
      source: 'google_sheet',
      matchType: 'contact_name'
    },
    create: {
      companyId: company.id,
      contactId,
      source: 'google_sheet',
      matchType: 'contact_name'
    }
  })

  return company
}

async function upsertDriver(tenantId, supplierContactId, supplierCompanyId) {
  let driver = await prisma.driver.findFirst({
    where: {
      tenantId,
      OR: [
        { supplierContactId },
        { supplierCompanyId },
        { name: { equals: CONTACT_NAME, mode: 'insensitive' } }
      ]
    }
  })

  const comment = [
    `Linked supplier company: ${COMPANY_NAME}.`,
    `Manager/contact: ${CONTACT_NAME}.`,
    `Primary source: ${SOURCE_LABEL}.`,
    'Phone is not provided in the pricing source.',
    'Use supplier route prices for pre-assignment margin checks.',
    'MPV source class is stored as Standard MPV with 5 passengers.'
  ].join('\n')

  const data = {
    tenantId,
    name: CONTACT_NAME,
    email: driver?.email || null,
    phone: driver?.phone || '',
    country: COUNTRY,
    city: CITY,
    pricingCurrency: 'USD',
    verificationStatus: 'verified',
    isActive: true,
    supplierContactId,
    supplierCompanyId,
    comment
  }

  driver = driver
    ? await prisma.driver.update({ where: { id: driver.id }, data })
    : await prisma.driver.create({ data })

  return driver
}

function buildRouteRows() {
  const rows = []

  for (const route of routePrices) {
    for (const [vehicleType, driverPrice] of Object.entries(route.prices)) {
      const vehicle = VEHICLE_META[vehicleType]
      rows.push({
        fromPoint: AIRPORT,
        toPoint: route.toPoint,
        vehicleType: vehicle.dbVehicleType,
        driverPrice,
        aliases: vehicle.aliases,
        meta: {
          country: COUNTRY,
          city: CITY,
          currency: 'USD',
          source: 'google_sheet',
          sourceSheetId: '1wFQnZqUZplzoyO56Jg3W9McJ96QZ5Y4ZWcJ5az3SyQo',
          sourceSheetTitle: 'Беслан Лос Анджелес',
          sourceSheetTab: 'Information',
          sourceBestPriceColumn: 'J',
          sourceRouteLabel: route.sourceRouteLabel,
          directionNote: route.directionNote,
          sourceClass: vehicle.sourceClass,
          sheetVehicleType: vehicle.sheetVehicleType,
          passengers: vehicle.passengers,
          note: vehicle.note || null
        }
      })
    }
  }

  return rows
}

async function upsertRoute(driverId, tenantId, row) {
  const existing = await prisma.driverRoute.findFirst({
    where: {
      tenantId,
      driverId,
      fromPoint: row.fromPoint,
      toPoint: row.toPoint,
      vehicleType: { in: row.aliases || [row.vehicleType] }
    }
  })

  const data = {
    tenantId,
    driverId,
    fromPoint: row.fromPoint,
    toPoint: row.toPoint,
    vehicleType: row.vehicleType,
    driverPrice: row.driverPrice,
    ourPrice: null,
    currency: 'USD',
    sourceType: 'google_sheet',
    sourceLabel: SOURCE_LABEL,
    sourceQuotedAt: SOURCE_QUOTED_AT,
    sourceMessage: SOURCE_MESSAGE,
    sourceStatus: 'approved',
    sourceMetaJson: JSON.stringify(row.meta),
    isActive: true
  }

  if (existing) {
    return prisma.driverRoute.update({
      where: { id: existing.id },
      data
    })
  }

  return prisma.driverRoute.create({ data })
}

async function main() {
  const tenant = await getTenant()
  const contact = await upsertSupplierContact(tenant.id)
  const company = await upsertSupplierCompany(tenant.id, contact.id)
  const driver = await upsertDriver(tenant.id, contact.id, company.id)
  const routeRows = buildRouteRows()
  const routes = []

  for (const row of routeRows) {
    routes.push(await upsertRoute(driver.id, tenant.id, row))
  }

  console.log(JSON.stringify({
    ok: true,
    tenant: { id: tenant.id, code: tenant.code, name: tenant.name },
    company: { id: company.id, name: company.name, companyType: company.companyType, ownerName: company.ownerName },
    contact: { id: contact.id, fullName: contact.fullName, phone: contact.phone },
    driver: { id: driver.id, name: driver.name, city: driver.city, country: driver.country },
    routesUpserted: routes.length,
    routes: routes.map((route) => ({
      id: route.id,
      fromPoint: route.fromPoint,
      toPoint: route.toPoint,
      vehicleType: route.vehicleType,
      driverPrice: route.driverPrice,
      currency: route.currency
    }))
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
