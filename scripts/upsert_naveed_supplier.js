#!/usr/bin/env node
require('dotenv').config()

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const SOURCE_QUOTED_AT = new Date('2026-04-23T18:47:00+03:00')
const SOURCE_LABEL = 'WhatsApp, 23.04.2026 18:47'
const SOURCE_MESSAGE = `Hi Alex.
Hope you are doing well.

For you still same price if you can give volume

90 Euro van CPH - City and other way.

80 Euro Sedan CPH - City and other way

Ocean Quay 110 Euro
Van and sedan`

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
        { phone: '+45 25 30 17 86' },
        { fullName: { equals: 'Naveed', mode: 'insensitive' } }
      ]
    }
  })

  const comment = [
    'Supplier contact in Copenhagen.',
    `Price source: ${SOURCE_LABEL}.`,
    'Confirmed rates:',
    '- Sedan CPH ↔ City: 80 EUR',
    '- Van CPH ↔ City: 90 EUR',
    '- Ocean Quay 110 EUR for van and sedan was mentioned, but route direction still needs clarification.'
  ].join('\n')

  if (contact) {
    contact = await prisma.customerContact.update({
      where: { id: contact.id },
      data: {
        fullName: 'Naveed',
        phone: '+45 25 30 17 86',
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
        externalId: 'manual:naveed:copenhagen',
        fullName: 'Naveed',
        phone: '+45 25 30 17 86',
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
        { externalId: 'manual:carrier:naveed:copenhagen' },
        { name: { equals: 'Naveed', mode: 'insensitive' } }
      ]
    }
  })

  const comment = [
    'Individual carrier in Copenhagen.',
    `Price source: ${SOURCE_LABEL}.`,
    'Classes covered: sedan, minivan.'
  ].join('\n')

  const data = {
    tenantId,
    sourceSystem: 'manual_supplier',
    externalId: 'manual:carrier:naveed:copenhagen',
    name: 'Naveed',
    phone: '+45 25 30 17 86',
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
        { phone: '+45 25 30 17 86' },
        { name: { equals: 'Naveed', mode: 'insensitive' } }
      ]
    }
  })

  const comment = [
    'Linked supplier contact: Naveed, Copenhagen.',
    `Primary source: ${SOURCE_LABEL}.`,
    'Use supplier route prices for pre-assignment margin checks.',
    'Ocean Quay price is stored as note only until route direction is clarified.'
  ].join('\n')

  if (driver) {
    driver = await prisma.driver.update({
      where: { id: driver.id },
      data: {
        name: 'Naveed',
        email: driver.email || null,
        phone: '+45 25 30 17 86',
        country: 'Denmark',
        city: 'Copenhagen',
        pricingCurrency: 'EUR',
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
        name: 'Naveed',
        email: null,
        phone: '+45 25 30 17 86',
        country: 'Denmark',
        city: 'Copenhagen',
        pricingCurrency: 'EUR',
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

async function upsertRoute(driverId, tenantId, vehicleType, driverPrice) {
  const existing = await prisma.driverRoute.findFirst({
    where: {
      tenantId,
      driverId,
      fromPoint: 'CPH',
      toPoint: 'City',
      vehicleType
    }
  })

  const data = {
    tenantId,
    driverId,
    fromPoint: 'CPH',
    toPoint: 'City',
    vehicleType,
    driverPrice,
    ourPrice: null,
    currency: 'EUR',
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

async function main() {
  const tenant = await getTenant()
  const contact = await upsertSupplierContact(tenant.id)
  const company = await upsertSupplierCompany(tenant.id, contact.id)
  const driver = await upsertDriver(tenant.id, contact.id, company.id)
  const sedan = await upsertRoute(driver.id, tenant.id, 'sedan', 80)
  const van = await upsertRoute(driver.id, tenant.id, 'van', 90)

  console.log(JSON.stringify({
    ok: true,
    tenant: { id: tenant.id, code: tenant.code, name: tenant.name },
    company: { id: company.id, name: company.name, companyType: company.companyType },
    contact: { id: contact.id, fullName: contact.fullName, phone: contact.phone },
    driver: { id: driver.id, name: driver.name, city: driver.city, country: driver.country },
    routes: [
      { id: sedan.id, vehicleType: sedan.vehicleType, fromPoint: sedan.fromPoint, toPoint: sedan.toPoint, driverPrice: sedan.driverPrice },
      { id: van.id, vehicleType: van.vehicleType, fromPoint: van.fromPoint, toPoint: van.toPoint, driverPrice: van.driverPrice }
    ],
    note: 'Ocean Quay 110 EUR stored in comments only until route direction is clarified.'
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
