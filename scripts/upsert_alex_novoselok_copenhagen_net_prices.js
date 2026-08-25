#!/usr/bin/env node
require('dotenv').config()

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const VENDOR_NAME = 'Алекс Новосёлок'
const COUNTRY = 'Denmark'
const CITY = 'Copenhagen'
const CURRENCY = 'EUR'
const SOURCE = 'manual:alex-novoselok-copenhagen-net-2026-08-20'
const AIRPORT = 'Copenhagen Kastrup Airport (CPH)'
const CITY_CENTER = 'Copenhagen'
const CRUISE_PORT = 'Copenhagen Cruise Port'
const NIGHT_SURCHARGE = {
  amount: 5,
  currency: CURRENCY,
  fromLocalTime: '01:00',
  toLocalTime: '05:00',
  timezone: 'Europe/Copenhagen'
}

const routeGroups = [
  {
    fromPoint: AIRPORT,
    toPoint: CITY_CENTER,
    prices: [
      { vehicleType: 'Standard class car', passengers: 3, netPrice: 45 },
      { vehicleType: 'Standard minivan 6 pax', passengers: 6, netPrice: 90 }
    ],
    quotedAt: '2026-08-20T12:00:00.000Z',
    sourceMessage: 'Confirmed by user: airport - city 45 EUR net; minivan is two standard cars.'
  },
  {
    fromPoint: AIRPORT,
    toPoint: CRUISE_PORT,
    prices: [
      { vehicleType: 'Standard class car', passengers: 3, netPrice: 50 },
      { vehicleType: 'Standard minivan 6 pax', passengers: 6, netPrice: 100 }
    ],
    quotedAt: '2026-08-20T12:00:00.000Z',
    sourceMessage: 'Confirmed by user: airport - port 50 EUR net; minivan is two standard cars.'
  },
  {
    fromPoint: CITY_CENTER,
    toPoint: CRUISE_PORT,
    prices: [
      { vehicleType: 'Standard class car', passengers: 3, netPrice: 45 },
      { vehicleType: 'Standard minivan 6 pax', passengers: 6, netPrice: 90 }
    ],
    quotedAt: '2026-08-20T12:00:00.000Z',
    sourceMessage: 'Confirmed by user: city - port 45 EUR net; minivan is two standard cars.'
  },
  {
    fromPoint: AIRPORT,
    toPoint: 'Hillerod',
    prices: [{ vehicleType: 'Standard class car', passengers: 4, netPrice: 195 }],
    quotedAt: '2026-05-26T12:00:00.000Z',
    sourceMessage: 'WhatsApp from 26 May: CPH Airport - Hillerod; 4 passengers; 195 EUR net.'
  },
  {
    fromPoint: AIRPORT,
    toPoint: 'Odense',
    prices: [{ vehicleType: 'Standard class car', passengers: 3, netPrice: 400 }],
    quotedAt: '2026-04-04T12:00:00.000Z',
    sourceMessage: 'WhatsApp from 4 April: CPH Airport - Odense; 3 passengers; 400 EUR net.'
  },
  {
    fromPoint: AIRPORT,
    toPoint: 'Malmö / Malmo',
    prices: [{ vehicleType: 'Standard class car', passengers: 3, netPrice: 180 }],
    quotedAt: '2026-08-20T12:00:00.000Z',
    sourceMessage: 'Confirmed by user: CPH Airport - Malmö; Standard; 180 EUR net.'
  }
]

function routeKey(fromPoint, toPoint, vehicleType) {
  return [SOURCE, fromPoint, toPoint, vehicleType]
    .join(':')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function buildRows() {
  return routeGroups.flatMap((group) => {
    const directions = [
      [group.fromPoint, group.toPoint],
      [group.toPoint, group.fromPoint]
    ]
    return directions.flatMap(([fromPoint, toPoint]) =>
      group.prices.map((price) => ({
        ...price,
        fromPoint,
        toPoint,
        quotedAt: group.quotedAt,
        sourceMessage: group.sourceMessage
      }))
    )
  })
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
      OR: [
        { name: { equals: VENDOR_NAME, mode: 'insensitive' } },
        { name: { equals: 'Алекс Новосёловк', mode: 'insensitive' } }
      ]
    }
  })
  const commentLines = new Set(String(existing?.comment || '').split('\n').filter(Boolean))
  commentLines.add(`Current Copenhagen supplier net prices confirmed on 2026-08-20. source=${SOURCE}.`)
  commentLines.add('Night surcharge: +5 EUR for pickups from 01:00 through 05:00 local Copenhagen time.')
  const data = {
    tenantId,
    name: VENDOR_NAME,
    phone: existing?.phone || '',
    country: COUNTRY,
    city: CITY,
    pricingCurrency: CURRENCY,
    verificationStatus: existing?.verificationStatus || 'verified',
    isActive: true,
    comment: [...commentLines].join('\n')
  }
  return existing
    ? prisma.driver.update({ where: { id: existing.id }, data })
    : prisma.driver.create({ data })
}

async function upsertRoute(tenantId, driverId, row) {
  const sourceKey = routeKey(row.fromPoint, row.toPoint, row.vehicleType)
  const data = {
    tenantId,
    driverId,
    fromPoint: row.fromPoint,
    toPoint: row.toPoint,
    vehicleType: row.vehicleType,
    driverPrice: row.netPrice,
    ourPrice: null,
    currency: CURRENCY,
    sourceType: 'manual',
    sourceLabel: `User-confirmed supplier net prices; ${SOURCE}`,
    sourceQuotedAt: new Date(row.quotedAt),
    sourceMessage: row.sourceMessage,
    sourceStatus: 'approved',
    sourceMetaJson: JSON.stringify({
      source: SOURCE,
      sourceKey,
      passengers: row.passengers,
      netPrice: row.netPrice,
      confirmedAt: '2026-08-20T12:00:00.000Z',
      nightSurcharge: NIGHT_SURCHARGE
    }),
    isActive: true
  }
  const existing = await prisma.driverRoute.findFirst({
    where: {
      tenantId,
      driverId,
      sourceMetaJson: { contains: `\"sourceKey\":\"${sourceKey}\"` }
    }
  })
  if (existing) {
    await prisma.driverRoute.update({ where: { id: existing.id }, data })
    return 'updated'
  }
  await prisma.driverRoute.create({ data })
  return 'created'
}

async function main() {
  const rows = buildRows()
  if (process.argv.includes('--dry-run')) {
    console.log(JSON.stringify({ ok: true, dryRun: true, vendor: VENDOR_NAME, rows }, null, 2))
    return
  }

  const tenant = await getTenant()
  const driver = await ensureDriver(tenant.id)
  const stats = { created: 0, updated: 0 }
  for (const row of rows) {
    const action = await upsertRoute(tenant.id, driver.id, row)
    stats[action] += 1
  }

  console.log(JSON.stringify({
    ok: true,
    tenant: { id: tenant.id, code: tenant.code },
    driver: { id: driver.id, name: driver.name },
    source: SOURCE,
    stats,
    rows
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
