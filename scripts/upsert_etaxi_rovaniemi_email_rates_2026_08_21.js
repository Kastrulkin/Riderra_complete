#!/usr/bin/env node
require('dotenv').config()

const { PrismaClient } = require('@prisma/client')
const { randomUUID } = require('crypto')

const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')

const SOURCE = 'manual:etaxi-rovaniemi-email-2026-08-21'
const ROUTE_FROM = 'Rovaniemi Airport (RVN)'
const MARKUP_RATE = 0.15
const ROUNDING_STEP = 5

const quotedRates = [
  { destination: 'Levi / Sirkka', vehicleType: 'Standard class car', pax: 3, netPrice: 370 },
  { destination: 'Levi / Sirkka', vehicleType: 'Standard minivan 7 pax', pax: 7, netPrice: 435 },
  { destination: 'Ivalo', vehicleType: 'Standard class car', pax: 3, netPrice: 620 },
  { destination: 'Ivalo', vehicleType: 'Standard minivan 7 pax', pax: 7, netPrice: 695 },
  { destination: 'Ruka', vehicleType: 'Standard class car', pax: 3, netPrice: 430 },
  { destination: 'Ruka', vehicleType: 'Standard minivan 7 pax', pax: 7, netPrice: 500 }
].map((row) => ({
  ...row,
  sellPrice: Math.ceil((row.netPrice * (1 + MARKUP_RATE) - Number.EPSILON) / ROUNDING_STEP) * ROUNDING_STEP
}))

async function loadTenant() {
  const tenant = await prisma.tenant.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true, code: true, name: true }
  })
  if (!tenant) throw new Error('Active tenant not found')
  return tenant
}

async function preview(tenantId) {
  const sales = await prisma.$queryRawUnsafe(
    'SELECT id, "routeTo", "vehicleType", "fixedPrice", source FROM "CityPricing" WHERE "tenantId"=$1 AND "isActive"=true AND "routeFrom"=$2',
    tenantId,
    ROUTE_FROM
  )

  return quotedRates.map((row) => {
    const existing = sales.find((sale) => sale.routeTo === row.destination && sale.vehicleType === row.vehicleType)
    return {
      ...row,
      currentSellPrice: existing?.fixedPrice ?? null,
      action: existing ? (Number(existing.fixedPrice) === row.sellPrice ? 'unchanged' : 'update') : 'create'
    }
  })
}

async function apply(tenantId) {
  return prisma.$transaction(async (tx) => {
    const existingCompany = await tx.customerCompany.findFirst({
      where: {
        tenantId,
        OR: [
          { sourceSystem: 'manual_supplier', externalId: 'etaxi-rovaniemi' },
          { name: { equals: 'eTaxi Rovaniemi', mode: 'insensitive' } }
        ]
      }
    })

    const company = existingCompany
      ? await tx.customerCompany.update({
          where: { id: existingCompany.id },
          data: {
            name: 'eTaxi Rovaniemi',
            registrationCountry: 'Finland',
            registrationCity: 'Rovaniemi',
            companyType: 'supplier'
          }
        })
      : await tx.customerCompany.create({
          data: {
            tenantId,
            sourceSystem: 'manual_supplier',
            externalId: 'etaxi-rovaniemi',
            name: 'eTaxi Rovaniemi',
            phone: '+358405056600',
            registrationCountry: 'Finland',
            registrationCity: 'Rovaniemi',
            presenceCountries: 'Finland',
            presenceCities: 'Finland: Rovaniemi',
            countryPresence: 'Finland',
            cityPresence: 'Rovaniemi',
            companyType: 'supplier'
          }
        })

    const existingDriver = await tx.driver.findFirst({
      where: { tenantId, supplierCompanyId: company.id }
    })
    const driver = existingDriver
      ? await tx.driver.update({
          where: { id: existingDriver.id },
          data: { isActive: true, verificationStatus: 'verified', pricingCurrency: 'EUR' }
        })
      : await tx.driver.create({
          data: {
            tenantId,
            name: 'eTaxi Rovaniemi',
            phone: company.phone || '+358405056600',
            country: 'Finland',
            city: 'Rovaniemi',
            supplierCompanyId: company.id,
            isActive: true,
            verificationStatus: 'verified',
            pricingCurrency: 'EUR'
          }
        })

    const stats = { supplierCreated: 0, supplierUpdated: 0, salesCreated: 0, salesUpdated: 0 }

    for (const row of quotedRates) {
      const supplierRoute = await tx.driverRoute.findFirst({
        where: {
          tenantId,
          driverId: driver.id,
          isActive: true,
          fromPoint: ROUTE_FROM,
          toPoint: row.destination,
          vehicleType: row.vehicleType
        }
      })
      const supplierData = {
        tenantId,
        driverId: driver.id,
        fromPoint: ROUTE_FROM,
        toPoint: row.destination,
        vehicleType: row.vehicleType,
        driverPrice: row.netPrice,
        ourPrice: row.sellPrice,
        currency: 'EUR',
        sourceType: 'email',
        sourceLabel: `${SOURCE}:${row.destination.toLowerCase().replace(/[^a-z0-9]+/g, '-')}:${row.pax}pax`,
        sourceQuotedAt: new Date('2026-08-21T00:00:00.000Z'),
        sourceMessage: `Current eTaxi Rovaniemi rate received by email: ${ROUTE_FROM} to ${row.destination}, ${row.vehicleType}, ${row.netPrice} EUR net.`,
        sourceStatus: 'approved',
        sourceMetaJson: JSON.stringify({ source: SOURCE, netPrice: row.netPrice, markupRate: MARKUP_RATE, roundingStep: ROUNDING_STEP }),
        isActive: true
      }
      if (supplierRoute) {
        await tx.driverRoute.update({ where: { id: supplierRoute.id }, data: supplierData })
        stats.supplierUpdated += 1
      } else {
        await tx.driverRoute.create({ data: supplierData })
        stats.supplierCreated += 1
      }

      const saleRows = await tx.$queryRawUnsafe(
        'SELECT id FROM "CityPricing" WHERE "tenantId"=$1 AND "isActive"=true AND "routeFrom"=$2 AND "routeTo"=$3 AND "vehicleType"=$4 LIMIT 1',
        tenantId,
        ROUTE_FROM,
        row.destination,
        row.vehicleType
      )
      const sale = saleRows[0] || null
      const saleNotes = `pax:${row.pax}\nbasePriceList=005; supplier=eTaxi Rovaniemi; supplierCompanyId=${company.id}; supplierNet=${row.netPrice} EUR; pricingRule=ceilTo5(netEUR*1.15); minimumMarkupPercent=15; approvedInCodex=2026-08-21`
      const saleData = {
        tenantId,
        country: 'Finland',
        city: row.destination,
        routeFrom: ROUTE_FROM,
        routeTo: row.destination,
        vehicleType: row.vehicleType,
        fixedPrice: row.sellPrice,
        pricePerKm: null,
        hourlyRate: null,
        childSeatPrice: null,
        currency: 'EUR',
        isActive: true,
        source: SOURCE,
        notes: saleNotes
      }
      if (sale) {
        await tx.$executeRawUnsafe(
          'UPDATE "CityPricing" SET country=$1, city=$2, "routeFrom"=$3, "routeTo"=$4, "vehicleType"=$5, "fixedPrice"=$6, "pricePerKm"=NULL, "hourlyRate"=NULL, "childSeatPrice"=NULL, currency=$7, "isActive"=true, source=$8, notes=$9, "updatedAt"=CURRENT_TIMESTAMP WHERE id=$10',
          saleData.country,
          saleData.city,
          saleData.routeFrom,
          saleData.routeTo,
          saleData.vehicleType,
          saleData.fixedPrice,
          saleData.currency,
          saleData.source,
          saleData.notes,
          sale.id
        )
        stats.salesUpdated += 1
      } else {
        await tx.$executeRawUnsafe(
          'INSERT INTO "CityPricing" (id, "tenantId", "createdAt", "updatedAt", country, city, "routeFrom", "routeTo", "vehicleType", "fixedPrice", "pricePerKm", "hourlyRate", "childSeatPrice", currency, "isActive", source, notes) VALUES ($1,$2,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,$3,$4,$5,$6,$7,$8,NULL,NULL,NULL,$9,true,$10,$11)',
          randomUUID(),
          tenantId,
          saleData.country,
          saleData.city,
          saleData.routeFrom,
          saleData.routeTo,
          saleData.vehicleType,
          saleData.fixedPrice,
          saleData.currency,
          saleData.source,
          saleData.notes
        )
        stats.salesCreated += 1
      }
    }

    return stats
  })
}

async function verify(tenantId) {
  const rows = await prisma.$queryRawUnsafe(
    'SELECT "routeTo", "vehicleType", "fixedPrice", currency, notes FROM "CityPricing" WHERE "tenantId"=$1 AND "isActive"=true AND "routeFrom"=$2 AND source=$3 ORDER BY "routeTo", "vehicleType"',
    tenantId,
    ROUTE_FROM,
    SOURCE
  )
  if (rows.length !== quotedRates.length) throw new Error(`Expected ${quotedRates.length} sales rows, found ${rows.length}`)
  return rows
}

async function main() {
  const tenant = await loadTenant()
  const rows = await preview(tenant.id)
  if (!APPLY) {
    console.log(JSON.stringify({ mode: 'preview', tenant, formula: 'ceilTo5(netEUR*1.15)', rows }, null, 2))
    return
  }
  const stats = await apply(tenant.id)
  const verified = await verify(tenant.id)
  console.log(JSON.stringify({ mode: 'apply', tenant, formula: 'ceilTo5(netEUR*1.15)', stats, verified }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
}).finally(async () => prisma.$disconnect())
