#!/usr/bin/env node
require('dotenv').config()

const fs = require('fs')
const crypto = require('crypto')
const { PrismaClient } = require('@prisma/client')
const { CityAirportTaxisAdapter, CITY_AIRPORT_TAXIS_DEFAULTS } = require('../server/services/cityAirportTaxisPriceAdapter')
const { nextScheduledServiceAt } = require('../server/services/priceComparisonService')
const { catalogContentHash, normalizeCatalogMatrix } = require('../server/services/externalPriceCatalogService')

const prisma = new PrismaClient()
const tenantId = process.env.CAT_CRAWL_TENANT_ID
const actorId = process.env.CAT_CRAWL_ACTOR_ID || null
const sourceIdOverride = process.env.CAT_CRAWL_SOURCE_ID || null
const minFreeBytes = Math.max(100, Number(process.env.CAT_CRAWL_MIN_FREE_MB || 150)) * 1024 * 1024
const processLimit = Math.max(0, Number(process.env.CAT_CRAWL_LIMIT || 0))
let stopRequested = false

process.on('SIGINT', () => { stopRequested = true })
process.on('SIGTERM', () => { stopRequested = true })

function routeKey(route) {
  return crypto.createHash('sha256').update(route.sourceUrl).digest('hex')
}

function freeDiskBytes() {
  const stats = fs.statfsSync('/')
  return Number(stats.bavail) * Number(stats.bsize)
}

async function saveRoute({ crawl, source, route, serviceAt, passengers, currencies, adapter }) {
  const common = {
    tenantId,
    sourceId: source.id,
    latestCrawlId: crawl.id,
    routeKey: routeKey(route),
    sourceUrl: route.sourceUrl,
    routeFrom: route.pickupLabel,
    routeTo: route.dropoffLabel,
    pickupPlaceId: route.pickupPlaceId,
    dropoffPlaceId: route.dropoffPlaceId,
    serviceAt,
    passengers: Number(passengers.adults || 1) + Number(passengers.children || 0),
    currenciesJson: JSON.stringify(currencies)
  }
  try {
    const fetched = await adapter.fetchCatalogRoute({ route, serviceAt, currencies, passengers })
    const matrix = normalizeCatalogMatrix(fetched.matrices)
    const data = {
      ...common,
      status: 'quoted',
      priceMatrixJson: JSON.stringify(matrix),
      quoteCount: matrix.length,
      contentHash: catalogContentHash(matrix),
      quotedAt: new Date(),
      error: null
    }
    await prisma.externalPriceCatalogRoute.upsert({
      where: { sourceId_sourceUrl: { sourceId: source.id, sourceUrl: route.sourceUrl } },
      update: data,
      create: data
    })
    return { status: 'quoted', quoteCount: matrix.length }
  } catch (error) {
    const status = error?.code === 'NO_QUOTES' ? 'no_quote' : 'failed'
    const data = {
      ...common,
      status,
      priceMatrixJson: '[]',
      quoteCount: 0,
      contentHash: catalogContentHash([]),
      quotedAt: new Date(),
      error: String(error.message || error).slice(0, 1000)
    }
    await prisma.externalPriceCatalogRoute.upsert({
      where: { sourceId_sourceUrl: { sourceId: source.id, sourceUrl: route.sourceUrl } },
      update: data,
      create: data
    })
    return { status, quoteCount: 0 }
  }
}

async function main() {
  if (!tenantId) throw new Error('CAT_CRAWL_TENANT_ID is required')
  const source = sourceIdOverride
    ? await prisma.priceComparisonSource.findFirst({ where: { id: sourceIdOverride, tenantId, adapterKey: 'city-airport-taxis', isActive: true } })
    : await prisma.priceComparisonSource.findFirst({ where: { tenantId, adapterKey: 'city-airport-taxis', isActive: true } })
  if (!source) throw new Error('Configured City Airport Taxis comparison source was not found')
  const currencies = JSON.parse(source.supportedCurrenciesJson || '[]').filter((value) => ['EUR', 'USD'].includes(value))
  const passengers = JSON.parse(source.passengerConfigJson || '{}')
  const schedule = JSON.parse(source.scheduleJson || '{}')
  let crawl = await prisma.externalPriceCatalogCrawl.findFirst({
    where: { tenantId, sourceId: source.id, status: { in: ['configured', 'running', 'paused', 'failed'] } },
    orderBy: { createdAt: 'desc' }
  })
  if (!crawl) {
    crawl = await prisma.externalPriceCatalogCrawl.create({ data: {
      tenantId,
      sourceId: source.id,
      status: 'configured',
      serviceAt: nextScheduledServiceAt(new Date(), schedule),
      currenciesJson: JSON.stringify(currencies),
      createdByUserId: actorId
    } })
  }
  const adapter = new CityAirportTaxisAdapter({ baseUrl: source.baseUrl, supportedCurrencies: currencies, maxConcurrency: 2, requestDelayMs: source.requestDelayMs })
  const routes = await adapter.initialize()
  let cursor = Math.min(crawl.cursor, routes.length)
  const processEnd = processLimit ? Math.min(routes.length, cursor + processLimit) : routes.length
  let quotedRoutes = crawl.quotedRoutes
  let noQuoteRoutes = crawl.noQuoteRoutes
  let failedRoutes = crawl.failedRoutes
  await prisma.externalPriceCatalogCrawl.update({ where: { id: crawl.id }, data: { status: 'running', totalRoutes: routes.length, startedAt: crawl.startedAt || new Date(), finishedAt: null, error: null } })
  console.log(JSON.stringify({ crawlId: crawl.id, sourceId: source.id, totalRoutes: routes.length, cursor, serviceAt: crawl.serviceAt, currencies }))

  while (cursor < processEnd && !stopRequested) {
    if (cursor % 500 === 0 && freeDiskBytes() < minFreeBytes) {
      stopRequested = true
      break
    }
    const batch = routes.slice(cursor, Math.min(cursor + 2, processEnd))
    const results = await Promise.all(batch.map((route) => saveRoute({ crawl, source, route, serviceAt: crawl.serviceAt, passengers, currencies, adapter })))
    for (const result of results) {
      if (result.status === 'quoted') quotedRoutes++
      else if (result.status === 'no_quote') noQuoteRoutes++
      else failedRoutes++
    }
    cursor += batch.length
    if (cursor % 20 === 0 || cursor === routes.length) {
      await prisma.externalPriceCatalogCrawl.update({ where: { id: crawl.id }, data: { cursor, processedRoutes: cursor, quotedRoutes, noQuoteRoutes, failedRoutes } })
    }
    if (source.requestDelayMs > 0) await new Promise((resolve) => setTimeout(resolve, source.requestDelayMs))
  }
  const complete = cursor >= routes.length
  const diskGuard = !complete && freeDiskBytes() < minFreeBytes
  const status = complete ? (failedRoutes ? 'needs_review' : 'ready') : 'paused'
  const error = diskGuard
    ? `Paused: free disk space is below ${Math.round(minFreeBytes / 1024 / 1024)} MB`
    : (stopRequested && !complete ? 'Paused by signal' : (processLimit && !complete ? `Paused after configured batch limit ${processLimit}` : null))
  const final = await prisma.externalPriceCatalogCrawl.update({ where: { id: crawl.id }, data: { status, cursor, processedRoutes: cursor, quotedRoutes, noQuoteRoutes, failedRoutes, finishedAt: complete ? new Date() : null, error } })
  await prisma.auditLog.create({ data: { tenantId, actorId, actorRole: 'owner', action: 'pricing.external_catalog.crawl', resource: 'external_price_catalog_crawl', resourceId: crawl.id, traceId: `cat-catalog-${crawl.id}`, decision: 'human_approved', result: status, contextJson: JSON.stringify({ sourceId: source.id, totalRoutes: routes.length, cursor, quotedRoutes, noQuoteRoutes, failedRoutes, currencies, serviceAt: crawl.serviceAt, bookingCreated: false }) } })
  console.log(JSON.stringify(final))
}

main().catch((error) => { console.error(error); process.exitCode = 1 }).finally(async () => prisma.$disconnect())
