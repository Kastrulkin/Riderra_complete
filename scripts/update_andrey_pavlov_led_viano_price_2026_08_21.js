#!/usr/bin/env node
require('dotenv').config()

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')

const ROUTE_FROM = 'Saint-Petersburg Pulkovo Airport (LED)'
const ROUTE_TO = 'Saint Petersburg'
const VEHICLE_TYPE = 'Standard minivan 8 pax'
const SUPPLIER_NET_RUB = 7000
const MARKUP_RATE = 0.2
const RUB_TO_EUR = 0.011
const SELL_RUB = SUPPLIER_NET_RUB * (1 + MARKUP_RATE)
const SELL_EUR = Math.ceil(SELL_RUB * RUB_TO_EUR)
const SOURCE = 'manual:andrey-pavlov-led-viano-2026-08-21'

async function main() {
  const tenant = await prisma.tenant.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true, code: true, name: true }
  })
  if (!tenant) throw new Error('Active tenant not found')

  const currentRows = await prisma.$queryRawUnsafe(
    'SELECT id, "fixedPrice", currency, source, notes FROM "CityPricing" WHERE "tenantId"=$1 AND "isActive"=true AND "routeFrom"=$2 AND "routeTo"=$3 AND "vehicleType"=$4',
    tenant.id,
    ROUTE_FROM,
    ROUTE_TO,
    VEHICLE_TYPE
  )
  if (currentRows.length !== 1) throw new Error(`Expected one active 005 row, found ${currentRows.length}`)

  const preview = {
    tenant,
    supplier: 'Андрей Павлов',
    vehicle: 'Mercedes Viano',
    routeFrom: ROUTE_FROM,
    routeTo: ROUTE_TO,
    net: `${SUPPLIER_NET_RUB} RUB`,
    formula: `${SUPPLIER_NET_RUB} RUB * 1.20 = ${SELL_RUB} RUB; ${SELL_RUB} RUB * ${RUB_TO_EUR} = ${(SELL_RUB * RUB_TO_EUR).toFixed(2)} EUR; ceil = ${SELL_EUR} EUR`,
    current005: `${currentRows[0].fixedPrice} ${currentRows[0].currency}`,
    new005: `${SELL_EUR} EUR`
  }

  if (!APPLY) {
    console.log(JSON.stringify({ mode: 'preview', ...preview }, null, 2))
    return
  }

  const result = await prisma.$transaction(async (tx) => {
    const existingCompany = await tx.customerCompany.findFirst({
      where: {
        tenantId: tenant.id,
        OR: [
          { sourceSystem: 'manual_supplier', externalId: 'andrey-pavlov-saint-petersburg' },
          { name: { equals: 'Андрей Павлов', mode: 'insensitive' } },
          { name: { equals: 'Andrey Pavlov', mode: 'insensitive' } }
        ]
      }
    })
    const comment = `Supplier in Saint Petersburg. Vehicle: Mercedes Viano. Approved net price: ${SUPPLIER_NET_RUB} RUB for ${ROUTE_FROM} -> ${ROUTE_TO}. Source=${SOURCE}.`
    const company = existingCompany
      ? await tx.customerCompany.update({
          where: { id: existingCompany.id },
          data: {
            name: 'Андрей Павлов',
            registrationCountry: 'Russia',
            registrationCity: 'Saint Petersburg',
            presenceCountries: 'Russia',
            presenceCities: 'Russia: Saint Petersburg',
            countryPresence: 'Russia',
            cityPresence: 'Saint Petersburg',
            companyType: 'supplier',
            comment: [existingCompany.comment, comment].filter(Boolean).join('\n')
          }
        })
      : await tx.customerCompany.create({
          data: {
            tenantId: tenant.id,
            sourceSystem: 'manual_supplier',
            externalId: 'andrey-pavlov-saint-petersburg',
            name: 'Андрей Павлов',
            registrationCountry: 'Russia',
            registrationCity: 'Saint Petersburg',
            presenceCountries: 'Russia',
            presenceCities: 'Russia: Saint Petersburg',
            countryPresence: 'Russia',
            cityPresence: 'Saint Petersburg',
            companyType: 'supplier',
            comment
          }
        })

    const auditNote = `pax:8\nbasePriceList=005; supplier=Андрей Павлов; supplierCompanyId=${company.id}; vehicle=Mercedes Viano; supplierNet=${SUPPLIER_NET_RUB} RUB; markupPercent=20; sellLocal=${SELL_RUB} RUB; rubToEur=${RUB_TO_EUR}; sellPrice=${SELL_EUR} EUR; approvedInCodex=2026-08-21`
    await tx.$executeRawUnsafe(
      'UPDATE "CityPricing" SET "fixedPrice"=$1, currency=$2, source=$3, notes=$4, "updatedAt"=CURRENT_TIMESTAMP WHERE id=$5',
      SELL_EUR,
      'EUR',
      SOURCE,
      auditNote,
      currentRows[0].id
    )
    return { companyId: company.id, pricingId: currentRows[0].id }
  })

  const verified = await prisma.$queryRawUnsafe(
    'SELECT "routeFrom", "routeTo", "vehicleType", "fixedPrice", currency, source, notes FROM "CityPricing" WHERE id=$1',
    result.pricingId
  )
  console.log(JSON.stringify({ mode: 'apply', ...preview, result, verified }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
}).finally(async () => prisma.$disconnect())
