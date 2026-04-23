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

async function upsertSupplierCompany(tenantId, contactId) {
  let company = await prisma.customerCompany.findFirst({
    where: {
      tenantId,
      OR: [
        { externalId: 'manual:carrier:ayyaz:copenhagen' },
        { name: { equals: 'Ayyaz', mode: 'insensitive' } }
      ]
    }
  })

  const comment = [
    'Individual carrier in Copenhagen.',
    `Price source: ${SOURCE_LABEL}.`,
    'Classes covered: business (EQS), minivan (EQV).'
  ].join('\n')

  const data = {
    tenantId,
    sourceSystem: 'manual_supplier',
    externalId: 'manual:carrier:ayyaz:copenhagen',
    name: 'Ayyaz',
    phone: '+45 20 89 11 89',
    registrationCountry: 'Denmark',
    registrationCity: 'Copenhagen',
    presenceCountries: 'Denmark',
    presenceCities: 'Copenhagen',
    countryPresence: 'Denmark',
    cityPresence: 'Copenhagen',
    companyType: 'individual_carrier',
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
    update: { sourceFile: 'manual_ui' },
    create: {
      companyId: company.id,
      segment: 'supplier_company',
      sourceFile: 'manual_ui'
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
      source: 'manual_ui',
      matchType: 'contact_name'
    },
    create: {
      companyId: company.id,
      contactId,
      source: 'manual_ui',
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
    'Current route rates are confirmed одинаковыми для business (EQS) и minivan (EQV).'
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
        supplierCompanyId,
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
        supplierCompanyId,
        comment
      }
    })
  }

  return driver
}

async function upsertRoute(driverId, tenantId, fromPoint, toPoint, vehicleType, driverPrice) {
  const existing = await prisma.driverRoute.findFirst({
    where: {
      tenantId,
      driverId,
      fromPoint,
      toPoint,
      vehicleType
    }
  })

  const data = {
    tenantId,
    driverId,
    fromPoint,
    toPoint,
    vehicleType,
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
  const company = await upsertSupplierCompany(tenant.id, contact.id)
  const driver = await upsertDriver(tenant.id, contact.id, company.id)
  await prisma.driverRoute.deleteMany({
    where: {
      tenantId: tenant.id,
      driverId: driver.id,
      fromPoint: { in: ['Airport', 'Copenhagen City'] },
      toPoint: { in: ['Airport', 'Copenhagen City'] },
      vehicleType: null
    }
  })
  const routeAirportBusiness = await upsertRoute(driver.id, tenant.id, 'Airport', 'Copenhagen City', 'business', 500)
  const routeAirportVan = await upsertRoute(driver.id, tenant.id, 'Airport', 'Copenhagen City', 'van', 500)
  const routeCityBusiness = await upsertRoute(driver.id, tenant.id, 'Copenhagen City', 'Airport', 'business', 500)
  const routeCityVan = await upsertRoute(driver.id, tenant.id, 'Copenhagen City', 'Airport', 'van', 500)
  const eqv = await upsertVehicle(tenant.id, driver.id, 'van', 'Mercedes-Benz', 'EQV 300', 'BL 99 351', 6)
  const eqs = await upsertVehicle(tenant.id, driver.id, 'sedan', 'Mercedes-Benz', 'EQS 450+', 'BN 98 458', 3)

  console.log(JSON.stringify({
    ok: true,
    company: { id: company.id, name: company.name, companyType: company.companyType },
    contact: { id: contact.id, fullName: contact.fullName, phone: contact.phone },
    driver: { id: driver.id, name: driver.name, city: driver.city, country: driver.country },
    routes: [
      { id: routeAirportBusiness.id, vehicleType: routeAirportBusiness.vehicleType, fromPoint: routeAirportBusiness.fromPoint, toPoint: routeAirportBusiness.toPoint, driverPrice: routeAirportBusiness.driverPrice, currency: routeAirportBusiness.currency },
      { id: routeAirportVan.id, vehicleType: routeAirportVan.vehicleType, fromPoint: routeAirportVan.fromPoint, toPoint: routeAirportVan.toPoint, driverPrice: routeAirportVan.driverPrice, currency: routeAirportVan.currency },
      { id: routeCityBusiness.id, vehicleType: routeCityBusiness.vehicleType, fromPoint: routeCityBusiness.fromPoint, toPoint: routeCityBusiness.toPoint, driverPrice: routeCityBusiness.driverPrice, currency: routeCityBusiness.currency },
      { id: routeCityVan.id, vehicleType: routeCityVan.vehicleType, fromPoint: routeCityVan.fromPoint, toPoint: routeCityVan.toPoint, driverPrice: routeCityVan.driverPrice, currency: routeCityVan.currency }
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
