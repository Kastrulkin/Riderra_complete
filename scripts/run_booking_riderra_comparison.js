#!/usr/bin/env node
require('dotenv').config()

const { PrismaClient } = require('@prisma/client')
const {
  BOOKING_DEFAULTS,
  defaultSourceData,
  executePriceComparisonRun,
  nextScheduledServiceAt
} = require('../server/services/priceComparisonService')

const prisma = new PrismaClient()
const tenantId = process.env.BOOKING_CRAWL_TENANT_ID
const customerCompanyId = process.env.BOOKING_CRAWL_COMPANY_ID || null
const actorId = process.env.BOOKING_CRAWL_ACTOR_ID || null

async function main() {
  if (!tenantId) throw new Error('BOOKING_CRAWL_TENANT_ID is required')
  const sourceData = defaultSourceData({ adapterKey: 'booking' })
  const source = await prisma.priceComparisonSource.upsert({
    where: { tenantId_adapterKey: { tenantId, adapterKey: 'booking' } },
    update: { ...sourceData, customerCompanyId },
    create: { tenantId, customerCompanyId, ...sourceData }
  })
  const routeCount = await prisma.cityPricing.count({
    where: {
      tenantId,
      isActive: true,
      fixedPrice: { not: null },
      routeFrom: { not: null },
      routeTo: { not: null },
      vehicleType: { not: null },
      currency: { in: BOOKING_DEFAULTS.supportedCurrencies }
    }
  })
  let run = await prisma.priceComparisonRun.findFirst({
    where: { tenantId, sourceId: source.id, status: { in: ['running', 'needs_review', 'failed'] }, finishedAt: null, scopeJson: { contains: '"type":"riderra_active_price_book"' } },
    orderBy: { createdAt: 'desc' }
  })
  if (!run) {
    run = await prisma.priceComparisonRun.create({
      data: {
        tenantId,
        sourceId: source.id,
        status: 'configured',
        serviceAt: nextScheduledServiceAt(new Date(), BOOKING_DEFAULTS.schedule),
        formulaVersion: BOOKING_DEFAULTS.formulaVersion,
        pricingPolicyJson: JSON.stringify(BOOKING_DEFAULTS.pricingPolicy),
        scopeJson: JSON.stringify({ type: 'riderra_active_price_book', source: '005', currencies: BOOKING_DEFAULTS.supportedCurrencies }),
        routeCount,
        createdByUserId: actorId
      }
    })
    await prisma.auditLog.create({
      data: {
        tenantId,
        actorId,
        actorRole: 'owner',
        action: 'pricing.comparison_run.create',
        resource: 'price_comparison_run',
        resourceId: run.id,
        traceId: `booking-riderra-${run.id}`,
        decision: 'human_approved',
        result: 'ok',
        contextJson: JSON.stringify({ sourceId: source.id, routeCount, formulaVersion: run.formulaVersion, scope: 'riderra_active_price_book' })
      }
    })
  }
  console.log(JSON.stringify({ runId: run.id, sourceId: source.id, routeCount, status: 'starting' }))
  const result = await executePriceComparisonRun({ prisma, runId: run.id })
  console.log(JSON.stringify({ runId: run.id, sourceId: source.id, routeCount, status: result.status, processedCount: result.processedCount, opportunitiesCount: result.opportunitiesCount, needsReviewCount: result.needsReviewCount, failedCount: result.failedCount }))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
}).finally(async () => prisma.$disconnect())
