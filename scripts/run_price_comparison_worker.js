#!/usr/bin/env node

const crypto = require('crypto')
const { PrismaClient } = require('@prisma/client')
const {
  executePriceComparisonRun,
  nextScheduledServiceAt
} = require('../server/services/priceComparisonService')

function parseArgs(argv) {
  const args = {}
  for (let index = 2; index < argv.length; index += 1) {
    const value = argv[index]
    if (value === '--run-id') args.runId = argv[++index]
    else if (value === '--tenant-id') args.tenantId = argv[++index]
    else if (value === '--adapter-key') args.adapterKey = argv[++index]
    else throw new Error(`Unknown argument: ${value}`)
  }
  if (!args.runId && (!args.tenantId || !args.adapterKey)) {
    throw new Error('Use --run-id or provide --tenant-id and --adapter-key')
  }
  return args
}

function parseJson(value, fallback) {
  try { return JSON.parse(value) } catch (_) { return fallback }
}

async function createFullRun(prisma, { tenantId, adapterKey }) {
  const source = await prisma.priceComparisonSource.findUnique({
    where: { tenantId_adapterKey: { tenantId, adapterKey } }
  })
  if (!source?.isActive) throw new Error(`Active source ${adapterKey} was not found`)
  const currencies = parseJson(source.supportedCurrenciesJson, [])
  const routeCount = await prisma.cityPricing.count({
    where: {
      tenantId,
      isActive: true,
      fixedPrice: { not: null },
      routeFrom: { not: null },
      routeTo: { not: null },
      vehicleType: { not: null },
      ...(currencies.length ? { currency: { in: currencies } } : {})
    }
  })
  const serviceAt = nextScheduledServiceAt(new Date(), parseJson(source.scheduleJson, {}))
  const run = await prisma.priceComparisonRun.create({
    data: {
      tenantId,
      sourceId: source.id,
      status: 'configured',
      serviceAt,
      formulaVersion: source.formulaVersion,
      pricingPolicyJson: source.pricingPolicyJson,
      routeCount
    }
  })
  const traceId = `price-worker-${crypto.randomUUID()}`
  await prisma.auditLog.createMany({
    data: [
      {
        tenantId,
        actorRole: 'system',
        action: 'pricing.comparison_run.create',
        resource: 'price_comparison_run',
        resourceId: run.id,
        traceId,
        decision: 'human_approved',
        result: 'ok',
        contextJson: JSON.stringify({ sourceId: source.id, adapterKey, serviceAt, routeCount, scope: 'all_active_routes' })
      },
      {
        tenantId,
        actorRole: 'system',
        action: 'pricing.comparison_run.execute',
        resource: 'price_comparison_run',
        resourceId: run.id,
        traceId,
        decision: 'human_approved',
        result: 'accepted',
        contextJson: JSON.stringify({ adapterKey, scope: 'all_active_routes' })
      }
    ]
  })
  return run
}

async function main() {
  const args = parseArgs(process.argv)
  const prisma = new PrismaClient()
  try {
    const run = args.runId
      ? await prisma.priceComparisonRun.findUnique({ where: { id: args.runId } })
      : await createFullRun(prisma, args)
    if (!run) throw new Error('Price comparison run not found')
    console.log(JSON.stringify({ event: 'started', runId: run.id, routeCount: run.routeCount }))
    const result = await executePriceComparisonRun({ prisma, runId: run.id })
    console.log(JSON.stringify({ event: 'completed', runId: run.id, result }))
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
