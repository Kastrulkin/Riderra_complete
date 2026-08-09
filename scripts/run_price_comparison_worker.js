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
    else if (value === '--max-passes') args.maxPasses = Math.max(1, Math.min(5, Number(argv[++index]) || 1))
    else throw new Error(`Unknown argument: ${value}`)
  }
  if (!args.runId && (!args.tenantId || !args.adapterKey)) {
    throw new Error('Use --run-id or provide --tenant-id and --adapter-key')
  }
  return args
}

function normalize(value) {
  return String(value || '').toLowerCase().normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
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

async function approveSafePlaceMappings(prisma, run) {
  const mappings = await prisma.priceComparisonPlaceMap.findMany({
    where: { sourceId: run.sourceId, status: 'needs_review' }
  })
  const approved = []
  for (const mapping of mappings) {
    const rows = await prisma.cityPricing.findMany({
      where: {
        tenantId: run.tenantId,
        isActive: true,
        OR: [{ routeFrom: mapping.inputText }, { routeTo: mapping.inputText }]
      },
      select: { country: true }
    })
    const countries = [...new Set(rows.map((row) => String(row.country || '').trim()).filter(Boolean))]
    if (countries.length !== 1) continue
    const candidates = parseJson(mapping.candidatesJson, [])
    const exact = candidates.filter((candidate) => (
      normalize(candidate.label) === normalize(mapping.inputText)
      && normalize(`${candidate.description || ''} ${candidate.label || ''}`).includes(normalize(countries[0]))
    ))
    if (exact.length !== 1) continue
    await prisma.priceComparisonPlaceMap.update({
      where: { id: mapping.id },
      data: {
        externalPlaceId: exact[0].id,
        externalLabel: exact[0].label,
        status: 'approved',
        approvedAt: new Date()
      }
    })
    approved.push({ inputText: mapping.inputText, country: countries[0], label: exact[0].label })
  }
  if (approved.length) {
    await prisma.auditLog.create({
      data: {
        tenantId: run.tenantId,
        actorRole: 'system',
        action: 'pricing.comparison_mapping.place.approve_safe_batch',
        resource: 'price_comparison_place_map',
        resourceId: run.id,
        traceId: `price-worker-${crypto.randomUUID()}`,
        decision: 'human_approved',
        result: 'ok',
        contextJson: JSON.stringify({ rule: 'exact label plus single Riderra country', approved })
      }
    })
  }
  return approved
}

async function main() {
  const args = parseArgs(process.argv)
  const prisma = new PrismaClient()
  try {
    const run = args.runId
      ? await prisma.priceComparisonRun.findUnique({ where: { id: args.runId } })
      : await createFullRun(prisma, args)
    if (!run) throw new Error('Price comparison run not found')
    const maxPasses = args.maxPasses || 3
    for (let pass = 1; pass <= maxPasses; pass += 1) {
      console.log(JSON.stringify({ event: 'started', runId: run.id, routeCount: run.routeCount, pass, maxPasses }))
      const result = await executePriceComparisonRun({ prisma, runId: run.id })
      const approved = await approveSafePlaceMappings(prisma, run)
      const current = await prisma.priceComparisonRun.findUnique({ where: { id: run.id } })
      console.log(JSON.stringify({ event: 'pass_completed', runId: run.id, pass, approvedMappings: approved.length, result: current || result }))
      if (!approved.length && !current?.failedCount) break
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
