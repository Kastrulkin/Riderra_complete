#!/usr/bin/env node
require('dotenv').config()

const crypto = require('crypto')
const { PrismaClient } = require('@prisma/client')
const dataset = require('../server/data/bookingPriceRoutes.json')
const { defaultSourceData } = require('../server/services/priceComparisonService')

const prisma = new PrismaClient()
const tenantId = process.env.BOOKING_CRAWL_TENANT_ID
const customerCompanyId = process.env.BOOKING_CRAWL_COMPANY_ID || null
const actorId = process.env.BOOKING_CRAWL_ACTOR_ID || null

const vehicleNames = {
  standard: 'Standard',
  executive: 'Executive',
  luxury: 'VIP / Luxury',
  people_carrier: 'People Carrier',
  executive_people_carrier: 'Executive People Carrier',
  large_people_carrier: 'Large People Carrier',
  minibus: 'Minibus',
  electric_standard: 'Electric Standard',
  electric_luxury: 'Electric Executive / VIP'
}

function hash(value) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

async function main() {
  if (!tenantId) throw new Error('BOOKING_CRAWL_TENANT_ID is required')
  const sourceData = defaultSourceData({ adapterKey: 'booking' })
  const source = await prisma.priceComparisonSource.upsert({
    where: { tenantId_adapterKey: { tenantId, adapterKey: 'booking' } },
    update: { ...sourceData, customerCompanyId },
    create: { tenantId, customerCompanyId, ...sourceData }
  })
  const scopeType = 'booking_historical_workbook'
  let run = await prisma.priceComparisonRun.findFirst({
    where: { tenantId, sourceId: source.id, scopeJson: { contains: `"type":"${scopeType}"` } },
    orderBy: { createdAt: 'desc' }
  })
  if (run) {
    const snapshots = await prisma.externalTransferPriceSnapshot.count({ where: { runId: run.id } })
    console.log(JSON.stringify({ runId: run.id, sourceId: source.id, status: run.status, snapshots, replayed: true }))
    return
  }
  const updatedDates = dataset.routes.map((row) => row.historicalUpdatedAt).filter(Boolean).sort()
  const serviceAt = new Date(updatedDates.at(-1) || '2024-01-01T12:00:00.000Z')
  run = await prisma.priceComparisonRun.create({
    data: {
      tenantId,
      sourceId: source.id,
      status: 'running',
      serviceAt,
      formulaVersion: source.formulaVersion,
      pricingPolicyJson: source.pricingPolicyJson,
      scopeJson: JSON.stringify({ type: scopeType, datasetVersion: dataset.version, sourceFile: 'Simon_Global Price Comparison.xlsm', routeCount: dataset.routes.length }),
      routeCount: dataset.routes.length,
      startedAt: new Date(),
      createdByUserId: actorId
    }
  })
  let processed = 0
  let snapshots = 0
  for (const batchStart of Array.from({ length: Math.ceil(dataset.routes.length / 100) }, (_, index) => index * 100)) {
    const batch = dataset.routes.slice(batchStart, batchStart + 100)
    const data = batch.flatMap((row) => Object.entries(row.historicalPrices || {}).map(([externalVehicleKey, publicSellPrice]) => {
      const routeIdentity = `${row.routeFrom.trim().toLowerCase()}|${row.routeTo.trim().toLowerCase()}|EUR`
      const quotedAt = new Date(row.historicalUpdatedAt || serviceAt)
      return {
        tenantId,
        sourceId: source.id,
        runId: run.id,
        routeKey: hash(routeIdentity),
        routeFrom: row.routeFrom,
        routeTo: row.routeTo,
        pickupPlaceId: `booking-file:${hash(row.routeFrom).slice(0, 24)}`,
        pickupLabel: row.routeFrom,
        dropoffPlaceId: `booking-file:${hash(row.routeTo).slice(0, 24)}`,
        dropoffLabel: row.routeTo,
        serviceAt: quotedAt,
        passengers: 1,
        currency: 'EUR',
        externalVehicleKey,
        externalVehicleName: vehicleNames[externalVehicleKey] || externalVehicleKey,
        maxPassengers: null,
        publicSellPrice: Number(publicSellPrice),
        quoteKind: 'historical_file',
        quotedAt,
        sourceUrl: 'workbook:Simon_Global Price Comparison.xlsm',
        evidenceJson: JSON.stringify({ sourceFile: 'Simon_Global Price Comparison.xlsm', sheet: 'BCOM Price Data Entry', iata: row.iata, city: row.city, country: row.country, distanceKm: row.distanceKm, updatedAt: row.historicalUpdatedAt, updatedBy: row.historicalUpdatedBy })
      }
    }))
    if (data.length) await prisma.externalTransferPriceSnapshot.createMany({ data, skipDuplicates: true })
    processed += batch.length
    snapshots += data.length
    await prisma.priceComparisonRun.update({ where: { id: run.id }, data: { processedCount: processed } })
  }
  run = await prisma.priceComparisonRun.update({ where: { id: run.id }, data: { status: 'ready', processedCount: dataset.routes.length, finishedAt: new Date() } })
  await prisma.auditLog.create({
    data: {
      tenantId,
      actorId,
      actorRole: 'owner',
      action: 'pricing.booking_historical_prices.import',
      resource: 'price_comparison_run',
      resourceId: run.id,
      traceId: `booking-history-${run.id}`,
      decision: 'human_approved',
      result: 'ok',
      contextJson: JSON.stringify({ sourceFile: 'Simon_Global Price Comparison.xlsm', routes: dataset.routes.length, snapshots })
    }
  })
  console.log(JSON.stringify({ runId: run.id, sourceId: source.id, status: run.status, routes: dataset.routes.length, snapshots, replayed: false }))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
}).finally(async () => prisma.$disconnect())
