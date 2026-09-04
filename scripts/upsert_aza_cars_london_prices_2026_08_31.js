#!/usr/bin/env node
require('dotenv').config()

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')

const SOURCE = 'email:aza-cars-london-prices-2026-08-31'
const SOURCE_LABEL = 'AZA Cars / Dr. Khan email, 2026-08-31'
const SOURCE_QUOTED_AT = new Date('2026-08-31T13:23:00.000Z')
const COMPANY_NAME = 'AZA Cars'
const COMPANY_EMAIL = 'info@azacar.com'
const CONTACT_NAME = 'Dr. Khan'
const COMPANY_PHONE = '020 8570 0909'
const MOBILE_PHONE = '07366 241724'
const COMPANY_WEBSITE = 'https://azacar.com/'
const COMPANY_ADDRESS = 'Kiosk 6, 8 Cavendish Parade, Bath Road, Hounslow, Middlesex TW4 7DJ'
const COUNTRY = 'United Kingdom'
const CITY = 'London'
const LHR = 'London Heathrow Airport (LHR)'

const RATE_GROUPS = [
  { destination: 'Hounslow', rates: [35, 48, 48, 58, 68] },
  { destination: 'London E1', rates: [78, 98, 98, 118, 128] },
  { destination: 'London Gatwick Airport (LGW)', rates: [95, 118, 118, 138, 145] },
  { destination: 'London Luton Airport (LTN)', rates: [95, 115, 115, 128, 138] }
]

const VEHICLES = [
  'Standard class car',
  'Executive',
  'People Carrier',
  'Large People Carrier',
  'Executive People Carrier'
]

function appendUnique(existing, block) {
  const current = String(existing || '').trim()
  if (!current) return block
  if (current.includes(block)) return current
  return `${current}\n${block}`
}

function routeRows() {
  return RATE_GROUPS.flatMap(({ destination, rates }) => VEHICLES.flatMap((vehicleType, index) => [
    { fromPoint: LHR, toPoint: destination, vehicleType, driverPrice: rates[index] },
    { fromPoint: destination, toPoint: LHR, vehicleType, driverPrice: rates[index] }
  ]))
}

async function tenant() {
  const row = await prisma.tenant.findUnique({ where: { code: 'riderra' } })
  if (!row) throw new Error('Riderra tenant not found')
  return row
}

async function current(tenantId) {
  const company = await prisma.customerCompany.findFirst({
    where: { tenantId, OR: [
      { externalId: 'manual:carrier:aza-cars:london' },
      { email: { equals: COMPANY_EMAIL, mode: 'insensitive' } },
      { name: { equals: COMPANY_NAME, mode: 'insensitive' } }
    ] }
  })
  const driver = await prisma.driver.findFirst({
    where: { tenantId, OR: [
      ...(company ? [{ supplierCompanyId: company.id }] : []),
      { email: { equals: COMPANY_EMAIL, mode: 'insensitive' } },
      { name: { equals: `${COMPANY_NAME} / ${CONTACT_NAME}`, mode: 'insensitive' } }
    ] }
  })
  const routes = driver ? await prisma.driverRoute.findMany({ where: { tenantId, driverId: driver.id, isActive: true } }) : []
  return { company, driver, routes }
}

async function upsert(tenantId, before) {
  return prisma.$transaction(async (tx) => {
    const commercialTerms = [
      `Pricing source: ${SOURCE_LABEL}.`,
      'Rates exclude VAT.',
      'Rates include airport fees, meet-and-greet and the first 30 minutes of waiting.',
      'Waiting after 30 minutes: 20 GBP/hour, billed in 15-minute intervals.'
    ].join('\n')
    const companyData = {
      name: COMPANY_NAME,
      website: COMPANY_WEBSITE,
      phone: COMPANY_PHONE,
      email: COMPANY_EMAIL,
      registrationCountry: COUNTRY,
      registrationCity: 'Hounslow',
      presenceCountries: COUNTRY,
      presenceCities: 'London, Hounslow, Gatwick, Luton',
      countryPresence: COUNTRY,
      cityPresence: CITY,
      companyType: 'transport_company',
      ownerName: CONTACT_NAME,
      registrationAddress: COMPANY_ADDRESS,
      comment: appendUnique(before.company?.comment, commercialTerms)
    }
    const company = before.company
      ? await tx.customerCompany.update({ where: { id: before.company.id }, data: companyData })
      : await tx.customerCompany.create({ data: {
          tenantId,
          sourceSystem: 'manual_supplier_outreach',
          externalId: 'manual:carrier:aza-cars:london',
          ...companyData
        } })

    await tx.customerCompanySegment.upsert({
      where: { companyId_segment: { companyId: company.id, segment: 'supplier_company' } },
      update: { sourceFile: 'gmail' },
      create: { companyId: company.id, segment: 'supplier_company', sourceFile: 'gmail' }
    })

    let contact = await tx.customerContact.findFirst({
      where: { tenantId, OR: [
        { externalId: 'manual:contact:dr-khan:aza-cars' },
        { email: { equals: COMPANY_EMAIL, mode: 'insensitive' } }
      ] }
    })
    const contactData = {
      fullName: CONTACT_NAME,
      website: COMPANY_WEBSITE,
      phone: MOBILE_PHONE,
      email: COMPANY_EMAIL,
      registrationCountry: COUNTRY,
      registrationCity: 'Hounslow',
      presenceCountries: COUNTRY,
      presenceCities: 'London, Hounslow, Gatwick, Luton',
      countryPresence: COUNTRY,
      cityPresence: CITY,
      position: 'Supplier contact',
      comment: appendUnique(contact?.comment, `AZA Cars pricing contact. Source: ${SOURCE_LABEL}.`)
    }
    contact = contact
      ? await tx.customerContact.update({ where: { id: contact.id }, data: contactData })
      : await tx.customerContact.create({ data: {
          tenantId,
          sourceSystem: 'manual_supplier_outreach',
          externalId: 'manual:contact:dr-khan:aza-cars',
          ...contactData
        } })

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

    let driver = before.driver
    const driverData = {
      tenantId,
      name: `${COMPANY_NAME} / ${CONTACT_NAME}`,
      email: COMPANY_EMAIL,
      phone: COMPANY_PHONE,
      country: COUNTRY,
      city: CITY,
      pricingCurrency: 'GBP',
      verificationStatus: 'verified',
      isActive: true,
      supplierContactId: contact.id,
      supplierCompanyId: company.id,
      comment: appendUnique(driver?.comment, commercialTerms)
    }
    driver = driver
      ? await tx.driver.update({ where: { id: driver.id }, data: driverData })
      : await tx.driver.create({ data: driverData })

    const results = []
    for (const row of routeRows()) {
      const routeData = {
        tenantId,
        driverId: driver.id,
        fromPoint: row.fromPoint,
        toPoint: row.toPoint,
        vehicleType: row.vehicleType,
        driverPrice: row.driverPrice,
        ourPrice: null,
        currency: 'GBP',
        sourceType: 'email',
        sourceLabel: SOURCE_LABEL,
        sourceQuotedAt: SOURCE_QUOTED_AT,
        sourceMessage: `${COMPANY_NAME} quoted ${row.driverPrice.toFixed(2)} GBP excluding VAT for ${row.fromPoint} -> ${row.toPoint}, ${row.vehicleType}; airport fees, meet-and-greet and first 30 minutes waiting included.`,
        sourceStatus: 'approved',
        sourceMetaJson: JSON.stringify({
          source: SOURCE,
          sourceEmail: COMPANY_EMAIL,
          contact: CONTACT_NAME,
          excludesVat: true,
          includesAirportFees: true,
          includesMeetAndGreet: true,
          freeWaitingMinutes: 30,
          extraWaitingGbpPerHour: 20,
          waitingBillingMinutes: 15,
          reverseDirectionConfirmed: true
        }),
        isActive: true
      }
      const existing = await tx.driverRoute.findFirst({
        where: {
          tenantId,
          driverId: driver.id,
          fromPoint: row.fromPoint,
          toPoint: row.toPoint,
          vehicleType: row.vehicleType
        }
      })
      const route = existing
        ? await tx.driverRoute.update({ where: { id: existing.id }, data: routeData })
        : await tx.driverRoute.create({ data: routeData })
      results.push({ action: existing ? 'updated' : 'created', route })
    }
    return { company, contact, driver, results }
  })
}

async function verify(tenantId, driverId) {
  const expected = routeRows()
  const actual = await prisma.driverRoute.findMany({
    where: { tenantId, driverId, isActive: true, sourceLabel: SOURCE_LABEL }
  })
  const missing = expected.filter((item) => !actual.some((row) =>
    row.fromPoint === item.fromPoint &&
    row.toPoint === item.toPoint &&
    row.vehicleType === item.vehicleType &&
    row.currency === 'GBP' &&
    Math.abs(row.driverPrice - item.driverPrice) < 0.001
  ))
  return { expected: expected.length, actual: actual.length, missing: missing.length }
}

async function main() {
  const riderra = await tenant()
  const before = await current(riderra.id)
  const preview = {
    mode: APPLY ? 'apply' : 'preview',
    tenant: { id: riderra.id, code: riderra.code },
    existing: {
      company: before.company ? { id: before.company.id, name: before.company.name } : null,
      driver: before.driver ? { id: before.driver.id, name: before.driver.name } : null,
      activeRoutes: before.routes.length
    },
    proposed: { company: COMPANY_NAME, contact: CONTACT_NAME, routes: routeRows() }
  }
  if (!APPLY) return console.log(JSON.stringify(preview, null, 2))

  const result = await upsert(riderra.id, before)
  const checked = await verify(riderra.id, result.driver.id)
  if (checked.missing || checked.actual !== checked.expected) throw new Error(`Verification failed: ${JSON.stringify(checked)}`)
  console.log(JSON.stringify({
    ...preview,
    result: {
      company: { id: result.company.id, name: result.company.name },
      contact: { id: result.contact.id, fullName: result.contact.fullName },
      driver: { id: result.driver.id, name: result.driver.name },
      created: result.results.filter((item) => item.action === 'created').length,
      updated: result.results.filter((item) => item.action === 'updated').length,
      verification: checked
    }
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
}).finally(() => prisma.$disconnect())
