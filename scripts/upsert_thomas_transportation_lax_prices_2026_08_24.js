#!/usr/bin/env node
require('dotenv').config()

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')

const SOURCE = 'email:thomas-transportation-lax-prices-2026-08-24'
const SOURCE_LABEL = 'Thomas Transportation email confirmation, 2026-08-24'
const SOURCE_QUOTED_AT = new Date('2026-08-24T16:10:00.000Z')
const COMPANY_EMAIL = 'thomastransportationla@gmail.com'
const COMPANY_NAME = 'Thomas Transportation'
const CONTACT_NAME = 'Blayne'
const COMPANY_PHONE = '888-851-9551'
const COMPANY_WEBSITE = 'https://thomastransportla.com/'
const COUNTRY = 'United States of America'
const CITY = 'Los Angeles'
const AIRPORT = 'Los Angeles Airport (LAX)'
const VEHICLE_TYPE = 'Standard minibus 10 pax'

const acceptedRates = [
  { destination: 'Los Angeles Downtown', price: 145.18 },
  { destination: 'Long Beach, California', price: 137.01 },
  { destination: 'Pasadena', price: 165.67 }
]

function appendUnique(existing, block) {
  const current = String(existing || '').trim()
  if (!current) return block
  if (current.includes(block)) return current
  return `${current}\n${block}`
}

function buildRouteRows() {
  return acceptedRates.flatMap(({ destination, price }) => [
    { fromPoint: AIRPORT, toPoint: destination, driverPrice: price, direction: 'airport_to_city' },
    { fromPoint: destination, toPoint: AIRPORT, driverPrice: price, direction: 'city_to_airport' }
  ])
}

async function getTenant() {
  const tenant = await prisma.tenant.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' }
  })
  if (!tenant) throw new Error('Active tenant not found')
  return tenant
}

async function findCurrent(tenantId) {
  const company = await prisma.customerCompany.findFirst({
    where: {
      tenantId,
      OR: [
        { email: { equals: COMPANY_EMAIL, mode: 'insensitive' } },
        { name: { equals: COMPANY_NAME, mode: 'insensitive' } },
        { externalId: 'manual:carrier:thomas-transportation:los-angeles' }
      ]
    }
  })
  const driver = await prisma.driver.findFirst({
    where: {
      tenantId,
      OR: [
        ...(company ? [{ supplierCompanyId: company.id }] : []),
        { email: { equals: COMPANY_EMAIL, mode: 'insensitive' } },
        { name: { contains: 'Thomas Transportation', mode: 'insensitive' } }
      ]
    }
  })
  const routes = driver
    ? await prisma.driverRoute.findMany({ where: { tenantId, driverId: driver.id, isActive: true } })
    : []
  return { company, driver, routes }
}

async function applyUpdate(tenantId) {
  return prisma.$transaction(async (tx) => {
    let company = await tx.customerCompany.findFirst({
      where: {
        tenantId,
        OR: [
          { email: { equals: COMPANY_EMAIL, mode: 'insensitive' } },
          { name: { equals: COMPANY_NAME, mode: 'insensitive' } },
          { externalId: 'manual:carrier:thomas-transportation:los-angeles' }
        ]
      }
    })

    const companyCommentBlock = [
      `Supplier pricing source: ${SOURCE_LABEL}.`,
      'Ford Transit passenger van: up to 10 passengers; airport capacity is subject to luggage.',
      'Accepted Ford Transit net rates apply in both directions for Downtown Los Angeles, Long Beach and Pasadena.',
      'LAX ↔ Anaheim: proposed 157.02 EUR was declined; exact supplier rate remains pending.',
      'Drivers should be able to use the Riderra app; workflow review requested at onboarding.',
      'Bank transfer to the company account is accepted; supplier requests receipt of the agreed net amount without transfer or FX deductions.'
    ].join('\n')
    const otherClassesCommentBlock = [
      'Pricing clarification recorded on 2026-08-25:',
      'Honda Odyssey / Xpress Class is the comparison vehicle for Booking Large People Carrier (up to 5 passengers).',
      'Negotiation range: Booking supplier target converted to USD plus 15–20 USD per trip.',
      'These are scenario bounds, not exact approved route prices; keep pending clarification until Thomas accepts a specific amount.'
    ].join('\n')

    const companyData = {
      name: COMPANY_NAME,
      website: COMPANY_WEBSITE,
      phone: COMPANY_PHONE,
      email: COMPANY_EMAIL,
      registrationCountry: COUNTRY,
      registrationCity: CITY,
      presenceCountries: COUNTRY,
      presenceCities: 'Los Angeles, Long Beach, Pasadena, Anaheim',
      countryPresence: COUNTRY,
      cityPresence: CITY,
      companyType: 'transport_company',
      ownerName: CONTACT_NAME,
      comment: appendUnique(appendUnique(company?.comment, companyCommentBlock), otherClassesCommentBlock)
    }

    company = company
      ? await tx.customerCompany.update({ where: { id: company.id }, data: companyData })
      : await tx.customerCompany.create({
          data: {
            tenantId,
            sourceSystem: 'manual_supplier_outreach',
            externalId: 'manual:carrier:thomas-transportation:los-angeles',
            ...companyData
          }
        })

    await tx.customerCompanySegment.upsert({
      where: { companyId_segment: { companyId: company.id, segment: 'supplier_company' } },
      update: { sourceFile: 'gmail' },
      create: { companyId: company.id, segment: 'supplier_company', sourceFile: 'gmail' }
    })

    let contact = await tx.customerContact.findFirst({
      where: {
        tenantId,
        OR: [
          { email: { equals: COMPANY_EMAIL, mode: 'insensitive' } },
          { externalId: 'manual:contact:blayne-thomas-transportation-la' }
        ]
      }
    })
    const contactData = {
      fullName: CONTACT_NAME,
      website: COMPANY_WEBSITE,
      phone: COMPANY_PHONE,
      email: COMPANY_EMAIL,
      registrationCountry: COUNTRY,
      registrationCity: CITY,
      presenceCountries: COUNTRY,
      presenceCities: 'Los Angeles, Long Beach, Pasadena, Anaheim',
      countryPresence: COUNTRY,
      cityPresence: CITY,
      position: 'Supplier contact',
      comment: appendUnique(contact?.comment, `Thomas Transportation contact. Pricing source: ${SOURCE_LABEL}.`)
    }
    contact = contact
      ? await tx.customerContact.update({ where: { id: contact.id }, data: contactData })
      : await tx.customerContact.create({
          data: {
            tenantId,
            sourceSystem: 'manual_supplier_outreach',
            externalId: 'manual:contact:blayne-thomas-transportation-la',
            ...contactData
          }
        })

    await tx.customerContactSegment.upsert({
      where: { contactId_segment: { contactId: contact.id, segment: 'supplier_contact' } },
      update: { sourceFile: 'gmail' },
      create: { contactId: contact.id, segment: 'supplier_contact', sourceFile: 'gmail' }
    })
    await tx.customerCompanyContact.upsert({
      where: { companyId_contactId: { companyId: company.id, contactId: contact.id } },
      update: { source: 'gmail', matchType: 'email' },
      create: { companyId: company.id, contactId: contact.id, source: 'gmail', matchType: 'email' }
    })

    let driver = await tx.driver.findFirst({
      where: {
        tenantId,
        OR: [
          { supplierCompanyId: company.id },
          { email: { equals: COMPANY_EMAIL, mode: 'insensitive' } },
          { name: { contains: 'Thomas Transportation', mode: 'insensitive' } }
        ]
      }
    })
    const driverData = {
      tenantId,
      name: 'Thomas Transportation / Blayne',
      email: COMPANY_EMAIL,
      phone: COMPANY_PHONE,
      country: COUNTRY,
      city: CITY,
      pricingCurrency: 'EUR',
      verificationStatus: 'verified',
      isActive: true,
      supplierContactId: contact.id,
      supplierCompanyId: company.id,
      comment: appendUnique(driver?.comment, `Ford Transit 10 pax supplier rates confirmed by email on 2026-08-24. source=${SOURCE}.`)
    }
    driver = driver
      ? await tx.driver.update({ where: { id: driver.id }, data: driverData })
      : await tx.driver.create({ data: driverData })

    const routeResults = []
    for (const row of buildRouteRows()) {
      const sourceKey = `${SOURCE}:${row.direction}:${row.toPoint.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
      const sourceMetaJson = JSON.stringify({
        source: SOURCE,
        sourceKey,
        supplierCompany: COMPANY_NAME,
        contact: CONTACT_NAME,
        vehicle: 'Ford Transit Passenger Van',
        passengers: 10,
        finalCapacitySubjectToLuggage: true,
        reverseDirectionConfirmed: true,
        direction: row.direction,
        sourceEmail: COMPANY_EMAIL,
        sourceConfirmedAt: SOURCE_QUOTED_AT.toISOString()
      })
      const routeData = {
        tenantId,
        driverId: driver.id,
        fromPoint: row.fromPoint,
        toPoint: row.toPoint,
        vehicleType: VEHICLE_TYPE,
        driverPrice: row.driverPrice,
        ourPrice: null,
        currency: 'EUR',
        sourceType: 'email',
        sourceLabel: SOURCE_LABEL,
        sourceQuotedAt: SOURCE_QUOTED_AT,
        sourceMessage: `${COMPANY_NAME} accepted ${row.driverPrice.toFixed(2)} EUR net for ${row.fromPoint} -> ${row.toPoint}, Ford Transit up to 10 passengers.`,
        sourceStatus: 'approved',
        sourceMetaJson,
        isActive: true
      }
      const existing = await tx.driverRoute.findFirst({
        where: {
          tenantId,
          driverId: driver.id,
          fromPoint: row.fromPoint,
          toPoint: row.toPoint,
          vehicleType: VEHICLE_TYPE
        }
      })
      const route = existing
        ? await tx.driverRoute.update({ where: { id: existing.id }, data: routeData })
        : await tx.driverRoute.create({ data: routeData })
      routeResults.push({ action: existing ? 'updated' : 'created', route })
    }

    return { company, contact, driver, routeResults }
  })
}

async function verify(tenantId, driverId) {
  const expected = buildRouteRows()
  const rows = await prisma.driverRoute.findMany({
    where: { tenantId, driverId, isActive: true, sourceLabel: SOURCE_LABEL },
    orderBy: [{ fromPoint: 'asc' }, { toPoint: 'asc' }]
  })
  const missing = expected.filter((item) => !rows.some((row) =>
    row.fromPoint === item.fromPoint &&
    row.toPoint === item.toPoint &&
    row.vehicleType === VEHICLE_TYPE &&
    row.currency === 'EUR' &&
    Math.abs(row.driverPrice - item.driverPrice) < 0.001
  ))
  return { expected: expected.length, actual: rows.length, missing: missing.length, rows }
}

async function main() {
  const tenant = await getTenant()
  const before = await findCurrent(tenant.id)
  const preview = {
    mode: APPLY ? 'apply' : 'preview',
    tenant: { id: tenant.id, code: tenant.code, name: tenant.name },
    existing: {
      company: before.company ? { id: before.company.id, name: before.company.name, email: before.company.email } : null,
      driver: before.driver ? { id: before.driver.id, name: before.driver.name } : null,
      activeRoutes: before.routes.length
    },
    proposed: {
      company: COMPANY_NAME,
      contact: CONTACT_NAME,
      vehicleType: VEHICLE_TYPE,
      rows: buildRouteRows(),
      pendingWithoutPrice: [{ route: 'LAX ↔ Anaheim', status: 'pending_clarification', rejectedProposedRate: 157.02, currency: 'EUR' }]
    }
  }

  if (!APPLY) {
    console.log(JSON.stringify(preview, null, 2))
    return
  }

  const applied = await applyUpdate(tenant.id)
  const verification = await verify(tenant.id, applied.driver.id)
  if (verification.missing !== 0 || verification.actual !== verification.expected) {
    throw new Error(`Verification failed: ${JSON.stringify(verification)}`)
  }
  console.log(JSON.stringify({
    ...preview,
    result: {
      company: { id: applied.company.id, name: applied.company.name, email: applied.company.email },
      contact: { id: applied.contact.id, fullName: applied.contact.fullName },
      driver: { id: applied.driver.id, name: applied.driver.name },
      created: applied.routeResults.filter((row) => row.action === 'created').length,
      updated: applied.routeResults.filter((row) => row.action === 'updated').length,
      verification: {
        expected: verification.expected,
        actual: verification.actual,
        missing: verification.missing,
        rows: verification.rows.map((row) => ({
          fromPoint: row.fromPoint,
          toPoint: row.toPoint,
          vehicleType: row.vehicleType,
          driverPrice: row.driverPrice,
          currency: row.currency
        }))
      }
    }
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
