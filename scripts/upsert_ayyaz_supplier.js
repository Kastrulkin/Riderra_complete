#!/usr/bin/env node
require('dotenv').config()

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const SOURCE_LABEL = 'WhatsApp, 23.04.2026 18:46-18:47'
const SOURCE_QUOTED_AT = new Date('2026-04-23T18:47:16+03:00')
const SOURCE_MESSAGE = `[23.04.2026, 18:46:51] Ayyaz Dk: From airport 2 copenhagen 
Kr 500
[23.04.2026, 18:47:16] Ayyaz Dk: From city 2 the airport kr500`

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
        { phone: '+45 20 89 11 89' },
        { fullName: { equals: 'Ayyaz', mode: 'insensitive' } }
      ]
    }
  })

  const comment = [
    'Supplier contact in Copenhagen.',
    `Price source: ${SOURCE_LABEL}.`,
    'Confirmed rates:',
    '- Airport -> Copenhagen city: 500 DKK',
    '- City -> Airport: 500 DKK',
    'Cars seen in fleet: Mercedes EQV, Mercedes EQS.'
  ].join('\n')

  if (contact) {
    contact = await prisma.customerContact.update({
      where: { id: contact.id },
      data: {
        fullName: 'Ayyaz',
        phone: '+45 20 89 11 89',
        registrationCountry: 'Denmark',
        registrationCity: 'Copenhagen',
        presenceCountries: 'Denmark',
        presenceCities: 'Copenhagen',
        countryPresence: 'Denmark',
        cityPresence: 'Copenhagen',
        comment
      }
    })
  } else {
    contact = await prisma.customerContact.create({
      data: {
        tenantId,
        sourceSystem: 'manual_supplier',
        externalId: 'manual:ayyaz:copenhagen',
        fullName: 'Ayyaz',
        phone: '+45 20 89 11 89',
        registrationCountry: 'Denmark',
        registrationCity: 'Copenhagen',
        presenceCountries: 'Denmark',
        presenceCities: 'Copenhagen',
        countryPresence: 'Denmark',
        cityPresence: 'Copenhagen',
        comment
      }
    })
  }

  await prisma.customerContactSegment.upsert({
    where: {
      contactId_segment: {
        contactId: contact.id,
        segment: 'supplier_contact'
      }
    },
    update: { sourceFile: 'manual_ui' },
    create: {
      contactId: contact.id,
      segment: 'supplier_contact',
      sourceFile: 'manual_ui'
    }
  })

  return contact
}

async function upsertDriver(tenantId, supplierContactId) {
  let driver = await prisma.driver.findFirst({
    where: {
      tenantId,
      OR: [
        { supplierContactId },
        { phone: '+45 20 89 11 89' },
        { name: { equals: 'Ayyaz', mode: 'insensitive' } }
      ]
    }
  })

  const comment = [
    'Linked supplier contact: Ayyaz, Copenhagen.',
    `Primary source: ${SOURCE_LABEL}.`,
    'Use supplier route prices for pre-assignment margin checks.',
    'Cars seen in fleet: Mercedes EQV (BL 99 351), Mercedes EQS (BN 98 458).',
    'Current route rates are generic for airport-city and city-airport; class-specific split is not yet confirmed.'
  ].join('\n')

  if (driver) {
    driver = await prisma.driver.update({
      where: { id: driver.id },
      data: {
        name: 'Ayyaz',
        phone: '+45 20 89 11 89',
        country: 'Denmark',
        city: 'Copenhagen',
        pricingCurrency: 'DKK',
        verificationStatus: 'verified',
        isActive: true,
        supplierContactId,
        comment
      }
    })
  } else {
    driver = await prisma.driver.create({
      data: {
        tenantId,
        name: 'Ayyaz',
        email: null,
        phone: '+45 20 89 11 89',
        country: 'Denmark',
        city: 'Copenhagen',
        pricingCurrency: 'DKK',
        verificationStatus: 'verified',
        isActive: true,
        supplierContactId,
        comment
      }
    })
  }

  return driver
}

async function upsertRoute(driverId, tenantId, fromPoint, toPoint, driverPrice) {
  const existing = await prisma.driverRoute.findFirst({
    where: {
      tenantId,
      driverId,
      fromPoint,
      toPoint,
      vehicleType: null
    }
  })

  const data = {
    tenantId,
    driverId,
    fromPoint,
    toPoint,
    vehicleType: null,
    driverPrice,
    ourPrice: null,
    currency: 'DKK',
    sourceType: 'whatsapp',
    sourceLabel: SOURCE_LABEL,
    sourceQuotedAt: SOURCE_QUOTED_AT,
    sourceMessage: SOURCE_MESSAGE,
    sourceStatus: 'approved'
  }

  if (existing) {
    return prisma.driverRoute.update({
      where: { id: existing.id },
      data
    })
  }

  return prisma.driverRoute.create({ data })
}

async function upsertVehicle(tenantId, driverId, vehicleClass, brand, model, plateNumber, seats) {
  const existing = await prisma.fleetVehicle.findFirst({
    where: {
      tenantId,
      plateNumber
    }
  })

  const data = {
    tenantId,
    driverId,
    vehicleClass,
    brand,
    model,
    plateNumber,
    seats,
    color: 'Black',
    notes: `Supplier vehicle for Ayyaz. Source photos received 23.04.2026.`
  }

  if (existing) {
    return prisma.fleetVehicle.update({
      where: { id: existing.id },
      data
    })
  }

  return prisma.fleetVehicle.create({ data })
}

async function main() {
  const tenant = await getTenant()
  const contact = await upsertSupplierContact(tenant.id)
  const driver = await upsertDriver(tenant.id, contact.id)
  const routeAirport = await upsertRoute(driver.id, tenant.id, 'Airport', 'Copenhagen City', 500)
  const routeCity = await upsertRoute(driver.id, tenant.id, 'Copenhagen City', 'Airport', 500)
  const eqv = await upsertVehicle(tenant.id, driver.id, 'van', 'Mercedes-Benz', 'EQV 300', 'BL 99 351', 6)
  const eqs = await upsertVehicle(tenant.id, driver.id, 'sedan', 'Mercedes-Benz', 'EQS 450+', 'BN 98 458', 3)

  console.log(JSON.stringify({
    ok: true,
    contact: { id: contact.id, fullName: contact.fullName, phone: contact.phone },
    driver: { id: driver.id, name: driver.name, city: driver.city, country: driver.country },
    routes: [
      { id: routeAirport.id, fromPoint: routeAirport.fromPoint, toPoint: routeAirport.toPoint, driverPrice: routeAirport.driverPrice, currency: routeAirport.currency },
      { id: routeCity.id, fromPoint: routeCity.fromPoint, toPoint: routeCity.toPoint, driverPrice: routeCity.driverPrice, currency: routeCity.currency }
    ],
    vehicles: [
      { id: eqv.id, vehicleClass: eqv.vehicleClass, model: eqv.model, plateNumber: eqv.plateNumber },
      { id: eqs.id, vehicleClass: eqs.vehicleClass, model: eqs.model, plateNumber: eqs.plateNumber }
    ]
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
