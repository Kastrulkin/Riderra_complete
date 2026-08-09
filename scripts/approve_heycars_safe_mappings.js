#!/usr/bin/env node

const crypto = require('crypto')
const { PrismaClient } = require('@prisma/client')
const { HeyCarsAdapter, decodePlace } = require('../server/services/heyCarsPriceAdapter')

function normalize(value) {
  return String(value || '').toLowerCase().normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
}

function parseArgs(argv) {
  const sourceIdIndex = argv.indexOf('--source-id')
  const sourceId = sourceIdIndex >= 0 ? argv[sourceIdIndex + 1] : null
  if (!sourceId) throw new Error('Use --source-id <id>')
  return { sourceId }
}

async function main() {
  const { sourceId } = parseArgs(process.argv)
  const prisma = new PrismaClient()
  try {
    const source = await prisma.priceComparisonSource.findUnique({ where: { id: sourceId } })
    if (!source || source.adapterKey !== 'heycars') throw new Error('Heycars source was not found')
    const adapter = new HeyCarsAdapter({
      baseUrl: source.baseUrl,
      supportedCurrencies: JSON.parse(source.supportedCurrenciesJson),
      requestDelayMs: source.requestDelayMs
    })
    const mappings = await prisma.priceComparisonPlaceMap.findMany({ where: { sourceId, status: 'needs_review' } })
    const approved = []
    for (const mapping of mappings) {
      const iata = mapping.inputText.match(/\(([A-Z]{3})\)/)?.[1]
        || mapping.inputText.match(/\b([A-Z]{3})\b/)?.[1]
      let exact = []
      if (iata) {
        const candidates = await adapter.resolvePlace(mapping.inputText)
        exact = candidates.filter((candidate) => {
          const place = decodePlace(candidate.id)
          return place?.type === 'AIRPORT' && place.airportCode === iata
        })
      } else {
        const rows = await prisma.cityPricing.findMany({
          where: {
            tenantId: source.tenantId,
            isActive: true,
            OR: [{ routeFrom: mapping.inputText }, { routeTo: mapping.inputText }]
          },
          select: { country: true }
        })
        const countries = [...new Set(rows.map((row) => normalize(row.country)).filter(Boolean))]
        if (countries.length === 1) {
          const candidates = JSON.parse(mapping.candidatesJson || '[]')
          exact = candidates.filter((candidate) => (
            normalize(String(candidate.label || '').split(',')[0]) === normalize(mapping.inputText)
            && normalize(candidate.label).includes(countries[0])
          ))
        }
      }
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
      approved.push(mapping.inputText)
    }
    if (approved.length) {
      await prisma.auditLog.create({
        data: {
          tenantId: source.tenantId,
          actorRole: 'system',
          action: 'pricing.comparison_mapping.place.approve_safe_batch',
          resource: 'price_comparison_place_map',
          resourceId: sourceId,
          traceId: `heycars-safe-map-${crypto.randomUUID()}`,
          decision: 'human_approved',
          result: 'ok',
          contextJson: JSON.stringify({
            rule: 'unique exact IATA or exact city plus single Riderra country',
            approved
          })
        }
      })
    }
    console.log(JSON.stringify({ reviewed: mappings.length, approved: approved.length, approvedInputs: approved }, null, 2))
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
