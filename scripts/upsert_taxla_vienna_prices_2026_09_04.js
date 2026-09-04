#!/usr/bin/env node
require('dotenv').config()

const crypto = require('crypto')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')

const SOURCE = 'email:taxla-vienna-prices-reviewed-2026-09-04'
const SOURCE_LABEL = 'TAXLA / Mr. Zino email rates, reviewed 2026-09-04'
const COMPANY_NAME = 'TAXLA'
const COMPANY_EMAIL = 'office@taxla.at'
const COMPANY_WEBSITE = 'https://taxla.at/'
const CONTACT_NAME = 'Mr. Zino'
const COUNTRY = 'Austria'
const CITY = 'Vienna'
const AIRPORT = 'Vienna Schwechat Airport (VIE)'

const RATES = [
  { sourceVehicle: 'Sedan', vehicleType: 'Standard class car', passengers: 3, price: 48 },
  { sourceVehicle: 'Station Wagon', vehicleType: 'Station Wagon', passengers: null, price: 55 },
  { sourceVehicle: 'Minivan', vehicleType: 'Standard minivan 6 pax', passengers: 6, price: 65 },
  { sourceVehicle: 'Van/Bus', vehicleType: 'Large People Carrier', passengers: 7, price: 75 }
]

function appendUnique(existing, block) {
  const current = String(existing || '').trim()
  if (!current) return block
  if (current.includes(block)) return current
  return `${current}\n${block}`
}

function sourceKey(rate) {
  const raw = [SOURCE, AIRPORT, CITY, rate.sourceVehicle].join('|').toLowerCase()
  return `${SOURCE}:${crypto.createHash('sha256').update(raw).digest('hex').slice(0, 24)}`
}

async function getTenant() {
  const tenant = await prisma.tenant.findUnique({ where: { code: 'riderra' } })
  if (!tenant) throw new Error('Riderra tenant not found')
  return tenant
}

async function findExisting(tenantId) {
  const company = await prisma.customerCompany.findFirst({
    where: {
      tenantId,
      OR: [
        { externalId: 'manual:carrier:taxla:vienna' },
        { email: { equals: COMPANY_EMAIL, mode: 'insensitive' } },
        { name: { equals: COMPANY_NAME, mode: 'insensitive' } }
      ]
    }
  })
  const driver = await prisma.driver.findFirst({
    where: {
      tenantId,
      OR: [
        ...(company ? [{ supplierCompanyId: company.id }] : []),
        { email: { equals: COMPANY_EMAIL, mode: 'insensitive' } },
        { name: { equals: `${COMPANY_NAME} / ${CONTACT_NAME}`, mode: 'insensitive' } }
      ]
    }
  })
  return { company, driver }
}

async function upsert(tenantId, before) {
  return prisma.$transaction(async (tx) => {
    const terms = [
      `Pricing source: ${SOURCE_LABEL}.`,
      'Net rates quoted for Vienna airport to Vienna.',
      'Return direction and general booking terms are not yet confirmed.'
    ].join('\n')

    const companyData = {
      name: COMPANY_NAME,
      website: COMPANY_WEBSITE,
      phone: before.company?.phone || null,
      email: COMPANY_EMAIL,
      registrationCountry: COUNTRY,
      registrationCity: CITY,
      presenceCountries: COUNTRY,
      presenceCities: CITY,
      countryPresence: COUNTRY,
      cityPresence: CITY,
      companyType: 'transport_company',
      ownerName: CONTACT_NAME,
      comment: appendUnique(before.company?.comment, terms)
    }
    const company = before.company
      ? await tx.customerCompany.update({ where: { id: before.company.id }, data: companyData })
      : await tx.customerCompany.create({ data: {
          tenantId,
          sourceSystem: 'manual_supplier_outreach',
          externalId: 'manual:carrier:taxla:vienna',
          ...companyData
        } })

    await tx.customerCompanySegment.upsert({
      where: { companyId_segment: { companyId: company.id, segment: 'supplier_company' } },
      update: { sourceFile: 'gmail' },
      create: { companyId: company.id, segment: 'supplier_company', sourceFile: 'gmail' }
    })

    let contact = await tx.customerContact.findFirst({
      where: {
        tenantId,
        OR: [
          { externalId: 'manual:contact:mr-zino:taxla' },
          { email: { equals: COMPANY_EMAIL, mode: 'insensitive' } }
        ]
      }
    })
    const contactData = {
      fullName: CONTACT_NAME,
      website: COMPANY_WEBSITE,
      phone: contact?.phone || null,
      email: COMPANY_EMAIL,
      registrationCountry: COUNTRY,
      registrationCity: CITY,
      presenceCountries: COUNTRY,
      presenceCities: CITY,
      countryPresence: COUNTRY,
      cityPresence: CITY,
      position: 'Supplier contact',
      comment: appendUnique(contact?.comment, `TAXLA pricing contact. Source: ${SOURCE_LABEL}.`)
    }
    contact = contact
      ? await tx.customerContact.update({ where: { id: contact.id }, data: contactData })
      : await tx.customerContact.create({ data: {
          tenantId,
          sourceSystem: 'manual_supplier_outreach',
          externalId: 'manual:contact:mr-zino:taxla',
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

    const driverData = {
      tenantId,
      name: `${COMPANY_NAME} / ${CONTACT_NAME}`,
      email: COMPANY_EMAIL,
      phone: before.driver?.phone || 'not provided',
      country: COUNTRY,
      city: CITY,
      pricingCurrency: 'EUR',
      verificationStatus: 'verified',
      isActive: true,
      supplierContactId: contact.id,
      supplierCompanyId: company.id,
      comment: appendUnique(before.driver?.comment, terms)
    }
    const driver = before.driver
      ? await tx.driver.update({ where: { id: before.driver.id }, data: driverData })
      : await tx.driver.create({ data: driverData })

    const activeKeys = []
    for (const rate of RATES) {
      const key = sourceKey(rate)
      activeKeys.push(key)
      const notes = [
        `Source vehicle category: ${rate.sourceVehicle}.`,
        'Only VIE to Vienna is confirmed.',
        'Canonical vehicle mapping is retained alongside the exact source category.'
      ].join('\n')
      const ruleData = {
        tenantId,
        supplierCompanyId: company.id,
        sourceKey: key,
        category: 'airport_transfer',
        routeFrom: AIRPORT,
        routeTo: CITY,
        vehicleType: rate.vehicleType,
        passengers: rate.passengers,
        supplierPrice: rate.price,
        currency: 'EUR',
        priceType: 'net',
        sourceType: 'email',
        sourceLabel: SOURCE_LABEL,
        sourceStatus: 'approved',
        notes,
        isActive: true
      }
      await tx.supplierPriceRule.upsert({
        where: { supplierCompanyId_sourceKey: { supplierCompanyId: company.id, sourceKey: key } },
        create: ruleData,
        update: ruleData
      })

      const routeData = {
        tenantId,
        driverId: driver.id,
        fromPoint: AIRPORT,
        toPoint: CITY,
        vehicleType: rate.vehicleType,
        driverPrice: rate.price,
        ourPrice: null,
        currency: 'EUR',
        sourceType: 'email',
        sourceLabel: key,
        sourceMessage: `${COMPANY_NAME}: ${AIRPORT} -> ${CITY}, ${rate.sourceVehicle}, ${rate.price.toFixed(2)} EUR net.`,
        sourceStatus: 'approved',
        sourceMetaJson: JSON.stringify({
          source: SOURCE,
          sourceEmail: COMPANY_EMAIL,
          contact: CONTACT_NAME,
          sourceVehicle: rate.sourceVehicle,
          canonicalVehicleType: rate.vehicleType,
          reverseDirectionConfirmed: false,
          termsConfirmed: false
        }),
        isActive: true
      }
      const existingRoute = await tx.driverRoute.findFirst({
        where: { tenantId, driverId: driver.id, sourceLabel: key },
        select: { id: true }
      })
      if (existingRoute) {
        await tx.driverRoute.update({ where: { id: existingRoute.id }, data: routeData })
      } else {
        await tx.driverRoute.create({ data: routeData })
      }
    }

    await tx.supplierPriceRule.updateMany({
      where: {
        tenantId,
        supplierCompanyId: company.id,
        sourceKey: { startsWith: `${SOURCE}:`, notIn: activeKeys }
      },
      data: { isActive: false, sourceStatus: 'archived' }
    })
    await tx.driverRoute.updateMany({
      where: {
        tenantId,
        driverId: driver.id,
        sourceLabel: { startsWith: `${SOURCE}:`, notIn: activeKeys }
      },
      data: { isActive: false, sourceStatus: 'archived' }
    })

    return { company, contact, driver, activeKeys }
  })
}

async function verify(tenantId, result) {
  const [rules, routes] = await Promise.all([
    prisma.supplierPriceRule.findMany({
      where: {
        tenantId,
        supplierCompanyId: result.company.id,
        sourceKey: { in: result.activeKeys },
        isActive: true
      },
      orderBy: { supplierPrice: 'asc' }
    }),
    prisma.driverRoute.findMany({
      where: {
        tenantId,
        driverId: result.driver.id,
        sourceLabel: { in: result.activeKeys },
        isActive: true
      },
      orderBy: { driverPrice: 'asc' }
    })
  ])
  if (rules.length !== RATES.length || routes.length !== RATES.length) {
    throw new Error(`Verification failed: supplier rules=${rules.length}, driver routes=${routes.length}`)
  }
  return { rules, routes }
}

async function main() {
  const tenant = await getTenant()
  const before = await findExisting(tenant.id)
  const preview = {
    mode: APPLY ? 'apply' : 'preview',
    tenant: { id: tenant.id, code: tenant.code },
    existing: {
      company: before.company ? { id: before.company.id, name: before.company.name } : null,
      driver: before.driver ? { id: before.driver.id, name: before.driver.name } : null
    },
    proposed: RATES
  }
  if (!APPLY) return console.log(JSON.stringify(preview, null, 2))

  const result = await upsert(tenant.id, before)
  const verified = await verify(tenant.id, result)
  console.log(JSON.stringify({
    ...preview,
    result: {
      company: { id: result.company.id, name: result.company.name },
      contact: { id: result.contact.id, fullName: result.contact.fullName },
      driver: { id: result.driver.id, name: result.driver.name },
      supplierRules: verified.rules.map((row) => ({
        vehicleType: row.vehicleType,
        price: row.supplierPrice,
        currency: row.currency
      })),
      driverRoutes: verified.routes.length
    }
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
}).finally(() => prisma.$disconnect())
