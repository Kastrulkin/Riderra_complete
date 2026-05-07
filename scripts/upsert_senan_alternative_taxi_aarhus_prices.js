#!/usr/bin/env node
require('dotenv').config()

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const SOURCE = 'manual:senan-alternative-taxi-aarhus-2026-05-05'
const COMPANY_NAME = 'Alternative Taxi'
const DRIVER_NAME = 'Senan / Alternative Taxi'
const COUNTRY = 'Denmark'
const CITY = 'Aarhus'
const CURRENCY = 'EUR'
const VEHICLE_TYPE = 'Standard class car'

const rules = [
  ['Aarhus Airport (AAR)', 'Aarhus city center', 110, 'day', '06:00-18:00'],
  ['Aarhus Airport (AAR)', 'Aarhus outside city center', 120, 'day', '06:00-18:00'],
  ['Aarhus city center', 'Aarhus Airport (AAR)', 110, 'day', '06:00-18:00'],
  ['Aarhus Airport (AAR)', 'Aarhus city center', 120, 'night', '18:00-06:00'],
  ['Aarhus Airport (AAR)', 'Aarhus outside city center', 140, 'night', '18:00-06:00'],
  ['Aarhus city center', 'Aarhus Airport (AAR)', 120, 'night', '18:00-06:00'],
  ['Billund Airport (BLL)', 'Aarhus city', 185, 'day', '06:00-18:00'],
  ['Billund Airport (BLL)', 'Silkeborg', 170, 'day', '06:00-18:00'],
  ['Billund Airport (BLL)', 'Horsens', 170, 'day', '06:00-18:00'],
  ['Billund Airport (BLL)', 'Aarhus city', 230, 'night', '18:00-06:00'],
  ['Billund Airport (BLL)', 'Silkeborg', 200, 'night', '18:00-06:00'],
  ['Billund Airport (BLL)', 'Horsens', 200, 'night', '18:00-06:00']
]

function compact(parts) {
  return parts.filter(Boolean).join('\n')
}

function normalizePlace(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\((aar|bll)\)/g, '')
    .replace(/airport/g, '')
    .replace(/city centre/g, 'city center')
    .replace(/city center/g, '')
    .replace(/\bcity\b/g, '')
    .replace(/outside center/g, 'outside')
    .replace(/outside city center/g, 'outside')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeVehicle(value) {
  const raw = String(value || '').toLowerCase()
  if (raw.includes('standard') && !raw.includes('minivan')) return 'standard'
  return raw.replace(/\s+/g, ' ').trim()
}

async function getTenant() {
  const tenant = await prisma.tenant.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' }
  })
  if (!tenant) throw new Error('Active tenant not found')
  return tenant
}

async function getSupplierCompany(tenantId) {
  let company = await prisma.customerCompany.findFirst({
    where: {
      tenantId,
      OR: [
        { name: { equals: COMPANY_NAME, mode: 'insensitive' } },
        { name: { equals: 'Alternativ Taxi', mode: 'insensitive' } },
        { name: { contains: 'Alternative Taxi', mode: 'insensitive' } }
      ]
    }
  })

  const data = {
    name: COMPANY_NAME,
    companyType: 'supplier',
    ownerName: 'Senan',
    comment: compact([
      company?.comment,
      `Supplier prices imported from Senan Aarhus screenshots. source=${SOURCE}`
    ])
  }

  if (company) {
    return prisma.customerCompany.update({ where: { id: company.id }, data })
  }

  return prisma.customerCompany.create({
    data: {
      tenantId,
      sourceSystem: 'manual_supplier_price_list',
      externalId: SOURCE,
      ...data
    }
  })
}

async function getDriver(tenantId, company) {
  let driver = await prisma.driver.findFirst({
    where: {
      tenantId,
      OR: [
        { name: { equals: DRIVER_NAME, mode: 'insensitive' } },
        { name: { contains: 'Senan', mode: 'insensitive' } },
        { supplierCompanyId: company.id }
      ]
    }
  })

  const data = {
    tenantId,
    name: DRIVER_NAME,
    phone: 'not provided',
    country: COUNTRY,
    city: CITY,
    supplierCompanyId: company.id,
    isActive: true,
    verificationStatus: 'verified',
    pricingCurrency: CURRENCY,
    comment: compact([
      driver?.comment,
      `Manager: Senan. Supplier company: ${COMPANY_NAME}. Latest Aarhus/Billund prices source=${SOURCE}.`
    ])
  }

  if (driver) {
    return prisma.driver.update({ where: { id: driver.id }, data })
  }

  return prisma.driver.create({ data })
}

async function findBaseSalePrice(tenantId, routeFrom, routeTo) {
  const candidates = await prisma.cityPricing.findMany({
    where: {
      tenantId,
      isActive: true,
      OR: [
        { city: { contains: 'Aarhus', mode: 'insensitive' } },
        { routeFrom: { contains: 'Aarhus', mode: 'insensitive' } },
        { routeTo: { contains: 'Aarhus', mode: 'insensitive' } },
        { routeFrom: { contains: 'Billund', mode: 'insensitive' } },
        { routeTo: { contains: 'Billund', mode: 'insensitive' } }
      ]
    },
    select: { id: true, routeFrom: true, routeTo: true, vehicleType: true, fixedPrice: true, currency: true }
  })

  const fromNorm = normalizePlace(routeFrom)
  const toNorm = normalizePlace(routeTo)
  const vehicleNorm = normalizeVehicle(VEHICLE_TYPE)

  return candidates.find((row) => {
    const a = normalizePlace(row.routeFrom)
    const b = normalizePlace(row.routeTo)
    const v = normalizeVehicle(row.vehicleType)
    return v === vehicleNorm && ((a === fromNorm && b === toNorm) || (a === toNorm && b === fromNorm))
  }) || null
}

function saleFloorRules() {
  const grouped = new Map()
  for (const [routeFrom, routeTo, driverPrice] of rules) {
    const key = `${normalizePlace(routeFrom)}->${normalizePlace(routeTo)}`
    const existing = grouped.get(key)
    if (!existing || driverPrice > existing.fixedPrice) {
      grouped.set(key, { routeFrom, routeTo, fixedPrice: driverPrice })
    }
  }
  return [...grouped.values()]
}

async function ensureBaseSaleFloor(tenantId, row) {
  const existing = await findBaseSalePrice(tenantId, row.routeFrom, row.routeTo)
  const notes = compact([
    existing?.notes,
    `saleFloorSource=${SOURCE}; supplier=${COMPANY_NAME}; manager=Senan; floorReason=avoid_negative_margin`
  ])

  if (existing) {
    if (existing.currency === CURRENCY && Number(existing.fixedPrice || 0) >= row.fixedPrice) {
      return { action: 'unchanged', row: existing }
    }
    const updated = await prisma.cityPricing.update({
      where: { id: existing.id },
      data: {
        fixedPrice: row.fixedPrice,
        currency: CURRENCY,
        notes
      }
    })
    return { action: 'updated', previous: existing, row: updated }
  }

  const created = await prisma.cityPricing.create({
    data: {
      tenantId,
      country: COUNTRY,
      city: CITY,
      routeFrom: row.routeFrom,
      routeTo: row.routeTo,
      vehicleType: VEHICLE_TYPE,
      fixedPrice: row.fixedPrice,
      currency: CURRENCY,
      isActive: true,
      source: 'manual',
      notes
    }
  })
  return { action: 'created', row: created }
}

async function upsertDriverRoute(tenantId, driver, rule) {
  const [fromPoint, toPoint, driverPrice, period, timeWindow] = rule
  const sourceLabel = `${SOURCE}:${period}:${fromPoint}->${toPoint}`
  const base = await findBaseSalePrice(tenantId, fromPoint, toPoint)
  const data = {
    tenantId,
    driverId: driver.id,
    fromPoint,
    toPoint,
    vehicleType: VEHICLE_TYPE,
    driverPrice,
    ourPrice: base?.fixedPrice === null || base?.fixedPrice === undefined ? null : Number(base.fixedPrice),
    currency: CURRENCY,
    sourceType: 'manual',
    sourceLabel,
    sourceQuotedAt: new Date('2026-05-05T00:00:00.000Z'),
    sourceMessage: `Senan / ${COMPANY_NAME} Aarhus screenshot: ${fromPoint} -> ${toPoint}, ${period} ${timeWindow}, ${driverPrice} ${CURRENCY}.`,
    sourceStatus: 'approved',
    sourceMetaJson: JSON.stringify({ source: SOURCE, period, timeWindow, supplierCompany: COMPANY_NAME, manager: 'Senan' }),
    isActive: true
  }

  const existing = await prisma.driverRoute.findFirst({
    where: { tenantId, driverId: driver.id, sourceLabel },
    select: { id: true, driverPrice: true, ourPrice: true, currency: true }
  })

  if (existing) {
    await prisma.driverRoute.update({ where: { id: existing.id }, data })
    return { action: 'updated', previous: existing, current: data, base }
  }

  await prisma.driverRoute.create({ data })
  return { action: 'created', previous: null, current: data, base }
}

async function main() {
  const tenant = await getTenant()
  const company = await getSupplierCompany(tenant.id)
  const driver = await getDriver(tenant.id, company)
  const stats = { created: 0, updated: 0 }
  const saleFloorStats = { created: 0, updated: 0, unchanged: 0 }
  const saleFloors = []
  const comparisons = []
  const negativeSales = []
  const missingSales = []

  for (const row of saleFloorRules()) {
    const result = await ensureBaseSaleFloor(tenant.id, row)
    saleFloorStats[result.action] += 1
    saleFloors.push({
      routeFrom: row.routeFrom,
      routeTo: row.routeTo,
      floorPrice: row.fixedPrice,
      action: result.action,
      previousPrice: result.previous?.fixedPrice ?? null
    })
  }

  for (const rule of rules) {
    const result = await upsertDriverRoute(tenant.id, driver, rule)
    stats[result.action] += 1

    const margin = result.base && result.base.currency === CURRENCY && result.base.fixedPrice !== null
      ? Number((Number(result.base.fixedPrice) - Number(result.current.driverPrice)).toFixed(2))
      : null
    const comparison = {
      routeFrom: result.current.fromPoint,
      routeTo: result.current.toPoint,
      period: JSON.parse(result.current.sourceMetaJson).period,
      driverPrice: result.current.driverPrice,
      currency: result.current.currency,
      previousDriverPrice: result.previous?.driverPrice ?? null,
      baseSalePrice: result.base?.fixedPrice ?? null,
      baseSaleCurrency: result.base?.currency ?? null,
      margin
    }
    comparisons.push(comparison)

    if (!result.base) missingSales.push(comparison)
    else if (margin !== null && margin < 0) negativeSales.push(comparison)
  }

  console.log(JSON.stringify({
    ok: true,
    tenant: { id: tenant.id, code: tenant.code, name: tenant.name },
    supplierCompany: { id: company.id, name: company.name, ownerName: company.ownerName },
    driver: { id: driver.id, name: driver.name },
    source: SOURCE,
    stats,
    saleFloorStats,
    saleFloors,
    comparisons,
    salePriceCheck: {
      checkedAgainstBaseSaleRules: comparisons.length,
      missingSaleRules: missingSales.length,
      negativeMarginRules: negativeSales.length,
      missingSales,
      negativeSales
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
