#!/usr/bin/env node
require('dotenv').config()

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const VENDOR_NAME = 'Александр Чурперка'
const SOURCE = 'manual:alexander-churperka-krakow-net-2026-08-20'
const AIRPORT = 'Krakow Airport (KRK)'
const CITY = 'Krakow City'
const VEHICLE_TYPE = 'Standard class car'
const NET_PRICE = 28
const CURRENCY = 'EUR'
const MARKUP = 0.2
const SALE_PRICE = Math.ceil(NET_PRICE * (1 + MARKUP))

function sourceKey(fromPoint, toPoint) {
  return [SOURCE, fromPoint, toPoint, VEHICLE_TYPE]
    .join(':')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

async function main() {
  const tenant = await prisma.tenant.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' }
  })
  if (!tenant) throw new Error('Active tenant not found')

  const existingDriver = await prisma.driver.findFirst({
    where: {
      tenantId: tenant.id,
      OR: [
        { name: { equals: VENDOR_NAME, mode: 'insensitive' } },
        { name: { contains: 'Чурпер', mode: 'insensitive' } },
        { name: { contains: 'Churper', mode: 'insensitive' } }
      ]
    }
  })
  const driverData = {
    tenantId: tenant.id,
    name: VENDOR_NAME,
    phone: existingDriver?.phone || '',
    country: 'Poland',
    city: 'Krakow',
    pricingCurrency: CURRENCY,
    verificationStatus: existingDriver?.verificationStatus || 'verified',
    isActive: true,
    comment: [
      existingDriver?.comment,
      `Current Krakow supplier net price confirmed on 2026-08-20. source=${SOURCE}.`
    ].filter(Boolean).join('\n')
  }
  const driver = existingDriver
    ? await prisma.driver.update({ where: { id: existingDriver.id }, data: driverData })
    : await prisma.driver.create({ data: driverData })

  const rows = [
    { fromPoint: AIRPORT, toPoint: CITY },
    { fromPoint: CITY, toPoint: AIRPORT }
  ]
  const stats = { created: 0, updated: 0 }
  const price005Stats = { created: 0, updated: 0 }

  for (const row of rows) {
    const key = sourceKey(row.fromPoint, row.toPoint)
    const data = {
      tenantId: tenant.id,
      driverId: driver.id,
      fromPoint: row.fromPoint,
      toPoint: row.toPoint,
      vehicleType: VEHICLE_TYPE,
      driverPrice: NET_PRICE,
      ourPrice: null,
      currency: CURRENCY,
      sourceType: 'manual',
      sourceLabel: `User-confirmed supplier net price; ${SOURCE}`,
      sourceQuotedAt: new Date('2026-08-20T12:00:00.000Z'),
      sourceMessage: 'Confirmed by user: Krakow Airport - Krakow City; Standard class; 28 EUR net.',
      sourceStatus: 'approved',
      sourceMetaJson: JSON.stringify({
        source: SOURCE,
        sourceKey: key,
        passengers: 3,
        netPrice: NET_PRICE,
        confirmedAt: '2026-08-20T12:00:00.000Z'
      }),
      isActive: true
    }
    const existingRoute = await prisma.driverRoute.findFirst({
      where: {
        tenantId: tenant.id,
        driverId: driver.id,
        sourceMetaJson: { contains: `\"sourceKey\":\"${key}\"` }
      }
    })
    if (existingRoute) {
      await prisma.driverRoute.update({ where: { id: existingRoute.id }, data })
      stats.updated += 1
    } else {
      await prisma.driverRoute.create({ data })
      stats.created += 1
    }

    const price005SourceKey = `${SOURCE}:riderra-005:${key}`
    const price005Data = {
      tenantId: tenant.id,
      country: 'Poland',
      city: 'Krakow',
      routeFrom: row.fromPoint,
      routeTo: row.toPoint,
      vehicleType: VEHICLE_TYPE,
      fixedPrice: SALE_PRICE,
      pricePerKm: null,
      hourlyRate: null,
      childSeatPrice: null,
      currency: CURRENCY,
      isActive: true,
      source: 'manual',
      notes: [
        `source=${SOURCE}; sourceKey=${price005SourceKey}`,
        `basePriceList=005; markupPercent=${MARKUP * 100}%`,
        `supplier=${VENDOR_NAME}; supplierNet=${NET_PRICE} ${CURRENCY}; salePrice=${SALE_PRICE} ${CURRENCY}`,
        'pax:3'
      ].join('\n')
    }
    const existingPrice005 = await prisma.cityPricing.findFirst({
      where: {
        tenantId: tenant.id,
        notes: { contains: `sourceKey=${price005SourceKey}` }
      },
      select: { id: true }
    })
    if (existingPrice005) {
      await prisma.cityPricing.update({
        where: { id: existingPrice005.id },
        data: price005Data,
        select: { id: true }
      })
      price005Stats.updated += 1
    } else {
      await prisma.cityPricing.create({ data: price005Data, select: { id: true } })
      price005Stats.created += 1
    }
  }

  console.log(JSON.stringify({
    ok: true,
    driver: { id: driver.id, name: driver.name },
    stats,
    price005: {
      ...price005Stats,
      markupPercent: MARKUP * 100,
      salePrice: SALE_PRICE,
      currency: CURRENCY
    },
    routes: rows.map((row) => ({
      ...row,
      vehicleType: VEHICLE_TYPE,
      netPrice: NET_PRICE,
      currency: CURRENCY
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
