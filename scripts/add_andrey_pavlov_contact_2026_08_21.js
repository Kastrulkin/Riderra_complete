#!/usr/bin/env node
require('dotenv').config()

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const PHONE = '+79219873555'
const ROUTE_FROM = 'Saint-Petersburg Pulkovo Airport (LED)'
const ROUTE_TO = 'Saint Petersburg'
const VEHICLE_TYPE = 'Standard minivan 8 pax'
const SOURCE = 'manual:andrey-pavlov-whatsapp-2026-08-21'

async function main() {
  const tenant = await prisma.tenant.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true, code: true, name: true }
  })
  if (!tenant) throw new Error('Active tenant not found')

  const result = await prisma.$transaction(async (tx) => {
    const company = await tx.customerCompany.findFirst({
      where: {
        tenantId: tenant.id,
        OR: [
          { sourceSystem: 'manual_supplier', externalId: 'andrey-pavlov-saint-petersburg' },
          { name: { equals: 'Андрей Павлов', mode: 'insensitive' } }
        ]
      }
    })
    if (!company) throw new Error('Andrey Pavlov supplier company not found')

    const savedCompany = await tx.customerCompany.update({
      where: { id: company.id },
      data: {
        phone: PHONE,
        comment: String(company.comment || '').includes('WhatsApp')
          ? company.comment
          : [company.comment, `Primary contact: WhatsApp ${PHONE}. Source=${SOURCE}.`].filter(Boolean).join('\n')
      }
    })

    const existingContact = await tx.customerContact.findFirst({
      where: {
        tenantId: tenant.id,
        OR: [
          { sourceSystem: 'manual_supplier_contact', externalId: 'andrey-pavlov-whatsapp' },
          { phone: PHONE }
        ]
      }
    })
    const contactData = {
      tenantId: tenant.id,
      fullName: 'Андрей Павлов',
      phone: PHONE,
      registrationCountry: 'Russia',
      registrationCity: 'Saint Petersburg',
      presenceCountries: 'Russia',
      presenceCities: 'Russia: Saint Petersburg',
      countryPresence: 'Russia',
      cityPresence: 'Saint Petersburg',
      position: 'Supplier / driver; WhatsApp contact',
      comment: `Primary communication channel: WhatsApp ${PHONE}. Vehicle: Mercedes Viano.`
    }
    const contact = existingContact
      ? await tx.customerContact.update({ where: { id: existingContact.id }, data: contactData })
      : await tx.customerContact.create({
          data: {
            sourceSystem: 'manual_supplier_contact',
            externalId: 'andrey-pavlov-whatsapp',
            ...contactData
          }
        })

    await tx.customerCompanyContact.upsert({
      where: { companyId_contactId: { companyId: savedCompany.id, contactId: contact.id } },
      update: { source: 'manual', matchType: 'confirmed_whatsapp' },
      create: { companyId: savedCompany.id, contactId: contact.id, source: 'manual', matchType: 'confirmed_whatsapp' }
    })

    const existingDriver = await tx.driver.findFirst({
      where: {
        tenantId: tenant.id,
        OR: [
          { supplierCompanyId: savedCompany.id },
          { phone: PHONE }
        ]
      }
    })
    const driverData = {
      tenantId: tenant.id,
      name: 'Андрей Павлов',
      phone: PHONE,
      country: 'Russia',
      city: 'Saint Petersburg',
      supplierCompanyId: savedCompany.id,
      supplierContactId: contact.id,
      isActive: true,
      verificationStatus: 'verified',
      pricingCurrency: 'RUB',
      comment: `WhatsApp: ${PHONE}. Vehicle: Mercedes Viano. Approved LED-city net price: 7000 RUB.`
    }
    const driver = existingDriver
      ? await tx.driver.update({ where: { id: existingDriver.id }, data: driverData })
      : await tx.driver.create({ data: driverData })

    const existingRoute = await tx.driverRoute.findFirst({
      where: {
        tenantId: tenant.id,
        driverId: driver.id,
        isActive: true,
        fromPoint: ROUTE_FROM,
        toPoint: ROUTE_TO,
        vehicleType: VEHICLE_TYPE
      }
    })
    const routeData = {
      tenantId: tenant.id,
      driverId: driver.id,
      fromPoint: ROUTE_FROM,
      toPoint: ROUTE_TO,
      vehicleType: VEHICLE_TYPE,
      driverPrice: 7000,
      ourPrice: 8400,
      currency: 'RUB',
      sourceType: 'manual',
      sourceLabel: SOURCE,
      sourceQuotedAt: new Date('2026-08-21T00:00:00.000Z'),
      sourceMessage: 'Andrey Pavlov, Mercedes Viano: LED Airport to Saint Petersburg, 7000 RUB net. WhatsApp +79219873555.',
      sourceStatus: 'approved',
      sourceMetaJson: JSON.stringify({ vehicle: 'Mercedes Viano', netRub: 7000, markupPercent: 20, sellRub: 8400, sellEur005: 93 }),
      isActive: true
    }
    const route = existingRoute
      ? await tx.driverRoute.update({ where: { id: existingRoute.id }, data: routeData })
      : await tx.driverRoute.create({ data: routeData })

    return {
      companyId: savedCompany.id,
      contactId: contact.id,
      driverId: driver.id,
      routeId: route.id
    }
  })

  const verification = await prisma.driverRoute.findUnique({
    where: { id: result.routeId },
    include: {
      driver: {
        include: {
          supplierCompany: true,
          supplierContact: true
        }
      }
    }
  })

  console.log(JSON.stringify({ tenant, result, verification }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
}).finally(async () => prisma.$disconnect())
