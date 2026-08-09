#!/usr/bin/env node

const crypto = require('crypto')
const fs = require('fs')
const { PrismaClient } = require('@prisma/client')
const {
  executePriceComparisonRun,
  externalRouteKey,
  normalizeTextKey
} = require('../server/services/priceComparisonService')
const { vehicleKey } = require('../server/services/myTravelThruPriceAdapter')

function parseArgs(argv) {
  const args = {}
  for (let index = 2; index < argv.length; index += 1) {
    const value = argv[index]
    if (value === '--input') args.input = argv[++index]
    else if (value === '--tenant-id') args.tenantId = argv[++index]
    else throw new Error(`Unknown argument: ${value}`)
  }
  if (!args.input) throw new Error('--input is required')
  if (!args.tenantId) throw new Error('--tenant-id is required')
  return args
}

function browserPlaceId(label, address) {
  const digest = crypto.createHash('sha256').update(`${label || ''}|${address || ''}`).digest('hex').slice(0, 24)
  return `browser-capture:${digest}`
}

function validatePayload(raw) {
  const payload = raw && typeof raw === 'object' ? raw : {}
  if (!String(payload.captureId || '').trim()) throw new Error('captureId is required')
  const serviceAt = new Date(payload.serviceAt)
  if (Number.isNaN(serviceAt.getTime())) throw new Error('serviceAt is invalid')
  if (!Array.isArray(payload.routes) || !payload.routes.length) throw new Error('routes are required')
  return {
    ...payload,
    captureId: String(payload.captureId).trim(),
    serviceAt,
    passengers: Math.max(1, Number(payload.passengers) || 1),
    routes: payload.routes.map((route, index) => {
      const routeFrom = String(route.routeFrom || '').trim()
      const routeTo = String(route.routeTo || '').trim()
      const currency = String(route.currency || '').toUpperCase()
      if (!routeFrom || !routeTo || !currency) throw new Error(`Route ${index + 1} is incomplete`)
      if (!['quoted', 'no_quote'].includes(route.status)) throw new Error(`Route ${index + 1} has invalid status`)
      if (route.status === 'quoted' && (!Array.isArray(route.quotes) || !route.quotes.length)) {
        throw new Error(`Route ${index + 1} requires quotes`)
      }
      return { ...route, routeFrom, routeTo, currency }
    })
  }
}

async function approveCapturedPlace(prisma, { tenantId, sourceId, inputText, place }) {
  const externalLabel = String(place?.label || place?.address || inputText).trim()
  const externalPlaceId = String(place?.id || browserPlaceId(externalLabel, place?.address)).trim()
  const normalizedInput = normalizeTextKey(inputText)
  const candidatesJson = JSON.stringify([{
    id: externalPlaceId,
    label: externalLabel,
    description: String(place?.address || externalLabel),
    source: 'public_browser_capture'
  }])
  return prisma.priceComparisonPlaceMap.upsert({
    where: { sourceId_normalizedInput: { sourceId, normalizedInput } },
    update: { inputText, externalPlaceId, externalLabel, status: 'approved', candidatesJson, approvedAt: new Date() },
    create: { tenantId, sourceId, inputText, normalizedInput, externalPlaceId, externalLabel, status: 'approved', candidatesJson, approvedAt: new Date() }
  })
}

async function main() {
  const args = parseArgs(process.argv)
  const payload = validatePayload(JSON.parse(fs.readFileSync(args.input, 'utf8')))
  const prisma = new PrismaClient()
  try {
    const source = await prisma.priceComparisonSource.findFirst({
      where: { tenantId: args.tenantId, adapterKey: 'mytravelthru' }
    })
    if (!source) throw new Error('Configured MyTravelThru source not found')

    const routePairs = payload.routes.map(({ routeFrom, routeTo }) => ({ routeFrom, routeTo }))
    let run = await prisma.priceComparisonRun.findFirst({
      where: { tenantId: args.tenantId, sourceId: source.id, scopeJson: { contains: payload.captureId } }
    })
    if (!run) {
      run = await prisma.priceComparisonRun.create({
        data: {
          tenantId: args.tenantId,
          sourceId: source.id,
          status: 'draft',
          serviceAt: payload.serviceAt,
          formulaVersion: source.formulaVersion,
          pricingPolicyJson: source.pricingPolicyJson,
          scopeJson: JSON.stringify({ type: 'route_pairs', routePairs, captureId: payload.captureId, captureMethod: 'public_browser_form' })
        }
      })
    } else {
      let existingScope = {}
      try { existingScope = JSON.parse(run.scopeJson || '{}') } catch (_) {}
      const pairMap = new Map()
      for (const pair of [...(existingScope.routePairs || []), ...routePairs]) {
        if (pair?.routeFrom && pair?.routeTo) pairMap.set(`${pair.routeFrom}\u0000${pair.routeTo}`, pair)
      }
      run = await prisma.priceComparisonRun.update({
        where: { id: run.id },
        data: {
          status: 'draft',
          error: null,
          finishedAt: null,
          scopeJson: JSON.stringify({ ...existingScope, type: 'route_pairs', routePairs: [...pairMap.values()], captureId: payload.captureId, captureMethod: 'public_browser_form' })
        }
      })
    }

    for (const route of payload.routes) {
      const rows = await prisma.cityPricing.findMany({
        where: {
          tenantId: args.tenantId,
          isActive: true,
          routeFrom: route.routeFrom,
          routeTo: route.routeTo,
          currency: route.currency,
          fixedPrice: { not: null },
          vehicleType: { not: null }
        }
      })
      if (!rows.length) throw new Error(`No active Riderra rows for ${route.routeFrom} -> ${route.routeTo} (${route.currency})`)

      const evidence = {
        sourceUrl: 'https://travelthru.com/booking',
        publicSearchOnly: true,
        bookingCreated: false,
        capturedInBrowser: true,
        captureId: payload.captureId,
        serviceAt: payload.serviceAt.toISOString(),
        passengers: payload.passengers,
        currency: route.currency,
        pickup: route.pickup || null,
        dropoff: route.dropoff || null,
        ...(route.evidence || {})
      }

      if (route.status === 'no_quote') {
        for (const row of rows) {
          await prisma.priceComparisonQuote.upsert({
            where: { runId_cityPricingId_externalVehicleKey: { runId: run.id, cityPricingId: row.id, externalVehicleKey: '_no_quote' } },
            update: { status: 'no_quote', error: route.error || 'MyTravelThru public form: Service Not Available for Selected Trip', evidenceJson: JSON.stringify(evidence) },
            create: {
              tenantId: args.tenantId,
              runId: run.id,
              cityPricingId: row.id,
              routeFrom: row.routeFrom,
              routeTo: row.routeTo,
              requestedVehicleType: row.vehicleType,
              riderraSellPrice: row.fixedPrice,
              riderraCurrency: row.currency,
              externalVehicleKey: '_no_quote',
              serviceAt: payload.serviceAt,
              status: 'no_quote',
              error: route.error || 'MyTravelThru public form: Service Not Available for Selected Trip',
              evidenceJson: JSON.stringify(evidence)
            }
          })
        }
        continue
      }

      const pickup = await approveCapturedPlace(prisma, { tenantId: args.tenantId, sourceId: source.id, inputText: route.routeFrom, place: route.pickup })
      const dropoff = await approveCapturedPlace(prisma, { tenantId: args.tenantId, sourceId: source.id, inputText: route.routeTo, place: route.dropoff })
      const routeKey = externalRouteKey(route)
      const quotedAt = route.quotedAt ? new Date(route.quotedAt) : new Date()
      for (const quote of route.quotes) {
        if (!String(quote.name || '').trim() || !Number.isFinite(Number(quote.price)) || Number(quote.price) < 0) {
          throw new Error(`Invalid quote for ${route.routeFrom} -> ${route.routeTo}`)
        }
      }
      await prisma.externalTransferPriceSnapshot.createMany({
        data: route.quotes.map((quote) => ({
          tenantId: args.tenantId,
          sourceId: source.id,
          runId: run.id,
          routeKey,
          routeFrom: route.routeFrom,
          routeTo: route.routeTo,
          pickupPlaceId: pickup.externalPlaceId,
          pickupLabel: pickup.externalLabel,
          dropoffPlaceId: dropoff.externalPlaceId,
          dropoffLabel: dropoff.externalLabel,
          serviceAt: payload.serviceAt,
          passengers: payload.passengers,
          currency: route.currency,
          externalVehicleKey: quote.externalVehicleKey || vehicleKey(quote.name, quote.maxPassengers),
          externalVehicleName: String(quote.name || 'Vehicle'),
          maxPassengers: Number.isFinite(Number(quote.maxPassengers)) ? Number(quote.maxPassengers) : null,
          publicSellPrice: Number(quote.price),
          quoteKind: 'public_sell',
          quotedAt,
          sourceUrl: evidence.sourceUrl,
          evidenceJson: JSON.stringify(evidence)
        })),
        skipDuplicates: true
      })
    }

    const completed = await executePriceComparisonRun({ prisma, runId: run.id })
    await prisma.auditLog.create({
      data: {
        tenantId: args.tenantId,
        action: 'pricing.comparison_run.browser_capture_import',
        resource: 'PriceComparisonRun',
        resourceId: run.id,
        traceId: payload.captureId,
        decision: 'approved_public_read_only_capture',
        result: 'success',
        contextJson: JSON.stringify({ sourceId: source.id, routeCount: payload.routes.length, bookingCreated: false })
      }
    })
    console.log(JSON.stringify({
      runId: completed.id,
      status: completed.status,
      routeCount: completed.routeCount,
      processedCount: completed.processedCount,
      opportunitiesCount: completed.opportunitiesCount,
      needsReviewCount: completed.needsReviewCount,
      failedCount: completed.failedCount
    }, null, 2))
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
