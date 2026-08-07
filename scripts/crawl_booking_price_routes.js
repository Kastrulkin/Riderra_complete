#!/usr/bin/env node
require('dotenv').config()

const crypto = require('crypto')
const { PrismaClient } = require('@prisma/client')
const routeDataset = require('../server/data/bookingPriceRoutes.json')
const { BookingAdapter, BOOKING_DEFAULTS } = require('../server/services/bookingPriceAdapter')
const { defaultSourceData, nextScheduledServiceAt, placeCandidateMatches } = require('../server/services/priceComparisonService')

const prisma = new PrismaClient()
const tenantId = process.env.BOOKING_CRAWL_TENANT_ID
const customerCompanyId = process.env.BOOKING_CRAWL_COMPANY_ID || null
const actorId = process.env.BOOKING_CRAWL_ACTOR_ID || null
const onlyOpenCities = process.argv.includes('--open-cities')

function routeKey(row) {
  return crypto.createHash('sha256').update(`${row.routeFrom.trim().toLowerCase()}|${row.routeTo.trim().toLowerCase()}|EUR`).digest('hex')
}

function selectCandidate(inputText, candidates, iata = null) {
  const rows = Array.isArray(candidates) ? candidates : []
  const iataMatches = iata ? rows.filter((row) => new RegExp(`\\b${iata}\\b`, 'i').test(row.label)) : []
  if (iataMatches.length === 1) return iataMatches[0]
  const semanticMatches = rows.filter((row) => placeCandidateMatches(inputText, row.label))
  if (semanticMatches.length === 1) return semanticMatches[0]
  return rows.length === 1 ? rows[0] : null
}

async function audit(action, resourceId, context, result = 'ok') {
  await prisma.auditLog.create({
    data: {
      tenantId,
      actorId,
      actorRole: 'owner',
      action,
      resource: 'price_comparison_run',
      resourceId,
      traceId: `booking-crawl-${resourceId}`,
      decision: 'human_approved',
      result,
      contextJson: JSON.stringify(context)
    }
  })
}

async function main() {
  if (!tenantId) throw new Error('BOOKING_CRAWL_TENANT_ID is required')
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } })
  if (!tenant) throw new Error('Tenant not found')
  if (customerCompanyId) {
    const company = await prisma.customerCompany.findFirst({ where: { id: customerCompanyId, tenantId }, select: { id: true } })
    if (!company) throw new Error('Booking customer company was not found in this tenant')
  }

  const sourceDefaults = defaultSourceData({ adapterKey: 'booking' })
  const source = await prisma.priceComparisonSource.upsert({
    where: { tenantId_adapterKey: { tenantId, adapterKey: 'booking' } },
    update: { ...sourceDefaults, customerCompanyId },
    create: { tenantId, customerCompanyId, ...sourceDefaults }
  })
  const routes = routeDataset.routes
    .filter((row) => !onlyOpenCities || row.openCity)
    .sort((left, right) => Number(right.openCity) - Number(left.openCity))
  const scopeType = onlyOpenCities ? 'booking_file_open_cities' : 'booking_file_all_routes'
  let run = await prisma.priceComparisonRun.findFirst({
    where: { tenantId, sourceId: source.id, status: { in: ['running', 'needs_review', 'failed'] }, scopeJson: { contains: `"type":"${scopeType}"` } },
    orderBy: { createdAt: 'desc' }
  })
  if (!run) {
    run = await prisma.priceComparisonRun.create({
      data: {
        tenantId,
        sourceId: source.id,
        status: 'running',
        serviceAt: nextScheduledServiceAt(new Date(), BOOKING_DEFAULTS.schedule),
        formulaVersion: BOOKING_DEFAULTS.formulaVersion,
        pricingPolicyJson: JSON.stringify(BOOKING_DEFAULTS.pricingPolicy),
        scopeJson: JSON.stringify({ type: scopeType, datasetVersion: routeDataset.version, routeCount: routes.length, sourceFile: 'Simon_Global Price Comparison.xlsm' }),
        routeCount: routes.length,
        startedAt: new Date(),
        createdByUserId: actorId
      }
    })
    await audit('pricing.booking_catalog_crawl.create', run.id, { routeCount: routes.length, scopeType, datasetVersion: routeDataset.version })
  }

  const existingKeys = new Set((await prisma.externalTransferPriceSnapshot.findMany({ where: { runId: run.id }, distinct: ['routeKey'], select: { routeKey: true } })).map((row) => row.routeKey))
  const adapter = new BookingAdapter({ ...BOOKING_DEFAULTS, supportedCurrencies: ['EUR'] })
  const errors = []
  let processed = existingKeys.size
  let succeeded = existingKeys.size
  for (const row of routes) {
    const key = routeKey(row)
    if (existingKeys.has(key)) continue
    try {
      const pickupCandidates = await adapter.resolvePlace(row.routeFrom)
      const pickup = selectCandidate(row.routeFrom, pickupCandidates, row.iata)
      if (!pickup) throw new Error(`Pickup needs review (${pickupCandidates.length} candidates)`)
      const dropoffCandidates = await adapter.resolvePlace(row.routeTo)
      const dropoff = selectCandidate(row.routeTo, dropoffCandidates)
      if (!dropoff) throw new Error(`Drop-off needs review (${dropoffCandidates.length} candidates)`)
      const fetched = await adapter.fetchQuotes({ pickup, dropoff, serviceAt: run.serviceAt, currency: 'EUR', passengers: BOOKING_DEFAULTS.passengers })
      const quotedAt = new Date()
      await prisma.externalTransferPriceSnapshot.createMany({
        data: fetched.quotes.map((quote) => ({
          tenantId,
          sourceId: source.id,
          runId: run.id,
          routeKey: key,
          routeFrom: row.routeFrom,
          routeTo: row.routeTo,
          pickupPlaceId: pickup.id,
          pickupLabel: pickup.label,
          dropoffPlaceId: dropoff.id,
          dropoffLabel: dropoff.label,
          serviceAt: run.serviceAt,
          passengers: 1,
          currency: 'EUR',
          externalVehicleKey: quote.externalVehicleKey,
          externalVehicleName: quote.externalVehicleName,
          maxPassengers: quote.maxPassengers,
          publicSellPrice: quote.price,
          quoteKind: 'public_sell',
          quotedAt,
          sourceUrl: fetched.evidence.sourceUrl,
          evidenceJson: JSON.stringify({ ...fetched.evidence, dataset: { ...row, origin: undefined } })
        })),
        skipDuplicates: true
      })
      succeeded++
    } catch (error) {
      errors.push({ iata: row.iata, routeFrom: row.routeFrom, routeTo: row.routeTo, error: String(error.message || error).slice(0, 500) })
    }
    processed++
    await prisma.priceComparisonRun.update({
      where: { id: run.id },
      data: {
        status: 'running',
        processedCount: processed,
        failedCount: errors.length,
        needsReviewCount: errors.filter((row) => /needs review/i.test(row.error)).length,
        error: errors.length ? JSON.stringify(errors.slice(-20)) : null
      }
    })
    if (processed % 25 === 0) console.log(JSON.stringify({ runId: run.id, processed, total: routes.length, succeeded, errors: errors.length }))
    await new Promise((resolve) => setTimeout(resolve, BOOKING_DEFAULTS.requestDelayMs))
  }

  const status = errors.length ? 'needs_review' : 'ready'
  run = await prisma.priceComparisonRun.update({
    where: { id: run.id },
    data: {
      status,
      processedCount: processed,
      failedCount: errors.length,
      needsReviewCount: errors.filter((row) => /needs review/i.test(row.error)).length,
      finishedAt: new Date(),
      error: errors.length ? JSON.stringify(errors.slice(-100)) : null,
      scopeJson: JSON.stringify({ type: scopeType, datasetVersion: routeDataset.version, routeCount: routes.length, sourceFile: 'Simon_Global Price Comparison.xlsm', succeeded, errors: errors.length })
    }
  })
  await audit('pricing.booking_catalog_crawl.complete', run.id, { status, processed, succeeded, errors: errors.length }, errors.length ? 'partial' : 'ok')
  console.log(JSON.stringify({ runId: run.id, sourceId: source.id, status, processed, succeeded, errors: errors.length }))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
}).finally(async () => prisma.$disconnect())
