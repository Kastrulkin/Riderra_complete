#!/usr/bin/env node
require('dotenv').config()

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const SOURCE = 'manual:whatsapp-alex-novoselov-copenhagen-2026-04-04-2026-05-26'
const COUNTRY = 'Denmark'
const AIRPORT = 'Copenhagen Kastrup Airport (CPH)'
const RAW_AIRPORT = 'COPENHAGEN AIRPORT, DK'
const VENDOR_NAME = 'Алекс Новосёловк'
const VEHICLE_TYPE = 'Standard class car'
const CURRENCY = 'EUR'
const MARKUP = 0.2
const PRICE_UPDATED_AT = '2026-06-30T00:00:00.000Z'

const rows = [
  {
    city: 'Hillerod',
    toPoint: 'Hillerod',
    rawToPoint: 'HILLEROD, DK',
    pax: 4,
    netPrice: 195,
    quotedAt: '2026-05-26T12:00:00.000Z',
    sourceMessage: 'WhatsApp from 26 May: Pickup COPENHAGEN AIRPORT, DK; Drop HILLEROD, DK; Passengers 4; 195 EUR.'
  },
  {
    city: 'Odense',
    toPoint: 'Odense',
    rawToPoint: 'ODENSE, DK',
    pax: 3,
    netPrice: 400,
    quotedAt: '2026-04-04T12:00:00.000Z',
    sourceMessage: 'WhatsApp from 4 April: Pickup COPENHAGEN AIRPORT, DK; Drop ODENSE, DK; 3 pax; 400 EUR.'
  }
]

function compact(parts) {
  return parts.filter(Boolean).join('\n')
}

function salePrice(netPrice) {
  return Math.ceil(Number(netPrice) * (1 + MARKUP))
}

async function getTenant() {
  const tenant = await prisma.tenant.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' }
  })
  if (!tenant) throw new Error('Active tenant not found')
  return tenant
}

async function ensureDriver(tenantId) {
  const existing = await prisma.driver.findFirst({
    where: {
      tenantId,
      name: { equals: VENDOR_NAME, mode: 'insensitive' }
    }
  })
  const data = {
    tenantId,
    name: VENDOR_NAME,
    phone: existing?.phone || '',
    country: COUNTRY,
    city: 'Copenhagen',
    pricingCurrency: CURRENCY,
    verificationStatus: existing?.verificationStatus || 'verified',
    isActive: true,
    comment: compact([
      existing?.comment || null,
      `Copenhagen supplier prices imported from WhatsApp. source=${SOURCE}; priceUpdatedAt=${PRICE_UPDATED_AT}.`
    ])
  }
  return existing
    ? prisma.driver.update({ where: { id: existing.id }, data })
    : prisma.driver.create({ data })
}

async function upsertDriverRoute(tenantId, driver, row) {
  const sourceKey = `${SOURCE}:${row.toPoint.toLowerCase()}`
  const sourceMeta = {
    source: SOURCE,
    sourceKey,
    rawPickupName: RAW_AIRPORT,
    rawDropName: row.rawToPoint,
    pax: row.pax,
    netPrice: row.netPrice,
    priceUpdatedAt: PRICE_UPDATED_AT
  }
  const data = {
    tenantId,
    driverId: driver.id,
    fromPoint: AIRPORT,
    toPoint: row.toPoint,
    vehicleType: VEHICLE_TYPE,
    driverPrice: row.netPrice,
    ourPrice: salePrice(row.netPrice),
    currency: CURRENCY,
    sourceType: 'whatsapp',
    sourceLabel: `WhatsApp; ${VENDOR_NAME}; ${SOURCE}`,
    sourceQuotedAt: new Date(row.quotedAt),
    sourceMessage: row.sourceMessage,
    sourceStatus: 'approved',
    sourceMetaJson: JSON.stringify(sourceMeta),
    isActive: true
  }
  const existing = await prisma.driverRoute.findFirst({
    where: {
      tenantId,
      driverId: driver.id,
      sourceMetaJson: { contains: `"sourceKey":"${sourceKey}"` }
    }
  })
  if (existing) {
    await prisma.driverRoute.update({ where: { id: existing.id }, data })
    return 'updated'
  }
  await prisma.driverRoute.create({ data })
  return 'created'
}

async function upsertBasePrice(tenantId, row, direction) {
  const fromPoint = direction === 'OUT' ? AIRPORT : row.toPoint
  const toPoint = direction === 'OUT' ? row.toPoint : AIRPORT
  const sourceKey = `${SOURCE}:riderra-005:${row.toPoint.toLowerCase()}:${direction}`
  const notes = compact([
    `source=${SOURCE}; sourceKey=${sourceKey}`,
    `priceUpdatedAt=${PRICE_UPDATED_AT}; basePriceList=005; markupPercent=${MARKUP * 100}%`,
    `supplier=${VENDOR_NAME}; supplierNet=${row.netPrice} ${CURRENCY}; salePrice=${salePrice(row.netPrice)} ${CURRENCY}`,
    `rawPickupName=${RAW_AIRPORT}; rawDropName=${row.rawToPoint}; pax:${row.pax}`,
    row.sourceMessage
  ])
  const data = {
    tenantId,
    country: COUNTRY,
    city: row.city,
    routeFrom: fromPoint,
    routeTo: toPoint,
    vehicleType: VEHICLE_TYPE,
    fixedPrice: salePrice(row.netPrice),
    pricePerKm: null,
    hourlyRate: null,
    childSeatPrice: null,
    currency: CURRENCY,
    isActive: true,
    notes,
    source: 'manual'
  }
  const existing = await prisma.cityPricing.findFirst({
    where: {
      tenantId,
      notes: { contains: `sourceKey=${sourceKey}` }
    }
  })
  if (existing) {
    await prisma.cityPricing.update({ where: { id: existing.id }, data })
    return 'updated'
  }
  await prisma.cityPricing.create({ data })
  return 'created'
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const payload = rows.map((row) => ({
    ...row,
    routeFrom: AIRPORT,
    vehicleType: VEHICLE_TYPE,
    currency: CURRENCY,
    salePrice: salePrice(row.netPrice)
  }))
  if (dryRun) {
    console.log(JSON.stringify({ ok: true, dryRun: true, source: SOURCE, payload }, null, 2))
    return
  }

  const tenant = await getTenant()
  const driver = await ensureDriver(tenant.id)
  const stats = {
    driverRoutes: { created: 0, updated: 0 },
    basePrices: { created: 0, updated: 0 }
  }
  for (const row of rows) {
    const driverAction = await upsertDriverRoute(tenant.id, driver, row)
    stats.driverRoutes[driverAction] += 1
    for (const direction of ['OUT', 'IN']) {
      const baseAction = await upsertBasePrice(tenant.id, row, direction)
      stats.basePrices[baseAction] += 1
    }
  }

  console.log(JSON.stringify({
    ok: true,
    tenant: { id: tenant.id, code: tenant.code, name: tenant.name },
    driver: { id: driver.id, name: driver.name },
    source: SOURCE,
    stats,
    rows: payload
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
