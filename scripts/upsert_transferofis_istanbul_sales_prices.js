#!/usr/bin/env node
require('dotenv').config()

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const SOURCE = 'manual:transferofis-istanbul-sales-eur-2026-05-06'
const NET_SOURCE = 'manual:transferofis-istanbul-usd-price-list'
const FX_USD_EUR = 0.8535
const MARKUP = 0.3
const COUNTRY = 'Turkey'
const CITY = 'Istanbul'
const CURRENCY = 'EUR'

function salesVehicleType(vehicleType) {
  const raw = String(vehicleType || '').trim()
  if (/minibus\s*13/i.test(raw)) return 'Standard Minibus 13pax'
  return raw
}

function paxForVehicle(vehicleType) {
  if (/13/.test(String(vehicleType || ''))) return 13
  if (/6/.test(String(vehicleType || ''))) return 6
  return null
}

function salePriceFromNetUsd(netUsd) {
  return Math.ceil(Number(netUsd) * FX_USD_EUR * (1 + MARKUP))
}

function compact(parts) {
  return parts.filter(Boolean).join('\n')
}

async function getTenant() {
  const tenant = await prisma.tenant.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' }
  })
  if (!tenant) throw new Error('Active tenant not found')
  return tenant
}

async function getTransferofisDriver(tenantId) {
  const driver = await prisma.driver.findFirst({
    where: {
      tenantId,
      name: { equals: 'Transferofis / Murat Ozbek', mode: 'insensitive' }
    },
    select: { id: true, name: true }
  })
  if (!driver) throw new Error('Transferofis / Murat Ozbek driver not found')
  return driver
}

async function upsertCityPrice(tenantId, row) {
  const vehicleType = salesVehicleType(row.vehicleType)
  const fixedPrice = salePriceFromNetUsd(row.driverPrice)
  const notes = compact([
    `source=${SOURCE}`,
    `netSource=${NET_SOURCE}`,
    `net=${row.driverPrice} USD`,
    `fxUsdEur=${FX_USD_EUR}`,
    `markup=${MARKUP * 100}%`,
    `supplier=Transferofis`,
    `manager=Murat Ozbek`,
    `driverRouteId=${row.id}`
  ])
  const data = {
    tenantId,
    country: COUNTRY,
    city: CITY,
    routeFrom: row.fromPoint,
    routeTo: row.toPoint,
    vehicleType,
    fixedPrice,
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
      routeFrom: { equals: row.fromPoint, mode: 'insensitive' },
      routeTo: { equals: row.toPoint, mode: 'insensitive' },
      vehicleType: { equals: vehicleType, mode: 'insensitive' },
      notes: { contains: `netSource=${NET_SOURCE}` }
    },
    select: { id: true, fixedPrice: true, currency: true }
  })

  if (existing) {
    await prisma.cityPricing.update({ where: { id: existing.id }, data })
    return { action: 'updated', fixedPrice, vehicleType, previousPrice: existing.fixedPrice }
  }
  await prisma.cityPricing.create({ data })
  return { action: 'created', fixedPrice, vehicleType, previousPrice: null }
}

async function main() {
  const tenant = await getTenant()
  const driver = await getTransferofisDriver(tenant.id)
  const netRows = await prisma.driverRoute.findMany({
    where: {
      tenantId: tenant.id,
      driverId: driver.id,
      isActive: true,
      sourceLabel: { contains: 'manual-transferofis-istanbul-usd-price-list' }
    },
    select: {
      id: true,
      fromPoint: true,
      toPoint: true,
      vehicleType: true,
      driverPrice: true,
      currency: true,
      sourceMetaJson: true
    },
    orderBy: [{ fromPoint: 'asc' }, { toPoint: 'asc' }, { vehicleType: 'asc' }]
  })

  const stats = { created: 0, updated: 0, skipped: 0 }
  const rows = []

  for (const row of netRows) {
    if (row.currency !== 'USD') {
      stats.skipped += 1
      continue
    }
    const result = await upsertCityPrice(tenant.id, row)
    stats[result.action] += 1
    rows.push({
      country: COUNTRY,
      from: row.fromPoint,
      to: row.toPoint,
      type: result.vehicleType,
      pax: paxForVehicle(result.vehicleType),
      price: result.fixedPrice,
      currency: CURRENCY,
      netUsd: row.driverPrice,
      fxUsdEur: FX_USD_EUR,
      markup: MARKUP,
      action: result.action,
      previousPrice: result.previousPrice
    })
  }

  const negative = rows.filter((row) => row.price < Math.ceil(Number(row.netUsd) * FX_USD_EUR))

  console.log(JSON.stringify({
    ok: true,
    tenant: { id: tenant.id, code: tenant.code, name: tenant.name },
    driver,
    source: SOURCE,
    fxUsdEur: FX_USD_EUR,
    markup: MARKUP,
    stats,
    rows,
    checks: {
      sourceNetRows: netRows.length,
      salesRows: rows.length,
      negativeCount: negative.length
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
