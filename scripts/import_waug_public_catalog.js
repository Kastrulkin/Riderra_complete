#!/usr/bin/env node

const crypto = require('crypto')
const { PrismaClient } = require('@prisma/client')
const { externalCatalogRouteKey } = require('../server/services/priceComparisonService')

function runIdFromArgs(argv) {
  const index = argv.indexOf('--run-id')
  const runId = index >= 0 ? String(argv[index + 1] || '').trim() : ''
  if (!runId) throw new Error('Use --run-id <id>')
  return runId
}

async function readStdin() {
  const chunks = []
  for await (const chunk of process.stdin) chunks.push(chunk)
  const body = Buffer.concat(chunks).toString('utf8')
  if (body.length > 5_000_000) throw new Error('Waug capture is too large')
  const rows = JSON.parse(body)
  if (!Array.isArray(rows) || !rows.length || rows.length > 1000) throw new Error('Waug capture rows are invalid')
  return rows
}

function validRow(row) {
  return row
    && /^https:\/\/www\.waug\.com\/en\/activities\/\d+\/?$/i.test(String(row.sourceUrl || ''))
    && String(row.currency || '').toUpperCase() === 'USD'
    && Number.isFinite(Number(row.price))
    && Number(row.price) >= 0
    && row.routeFrom
    && row.routeTo
    && row.pickupPlaceId
    && row.dropoffPlaceId
    && row.externalVehicleKey
}

async function main() {
  const runId = runIdFromArgs(process.argv)
  const rows = await readStdin()
  if (!rows.every(validRow)) throw new Error('Waug capture contains an invalid row')

  const prisma = new PrismaClient()
  try {
    const run = await prisma.priceComparisonRun.findUnique({ where: { id: runId }, include: { source: true } })
    if (!run || run.source.adapterKey !== 'waug') throw new Error('Waug comparison run was not found')
    const quotedAt = new Date()
    const inserted = await prisma.externalTransferPriceSnapshot.createMany({
      data: rows.map((row) => ({
        tenantId: run.tenantId,
        sourceId: run.sourceId,
        runId: run.id,
        routeKey: externalCatalogRouteKey(row),
        routeFrom: String(row.routeFrom),
        routeTo: String(row.routeTo),
        pickupPlaceId: String(row.pickupPlaceId),
        pickupLabel: String(row.pickupLabel || row.routeFrom),
        dropoffPlaceId: String(row.dropoffPlaceId),
        dropoffLabel: String(row.dropoffLabel || row.routeTo),
        serviceAt: run.serviceAt,
        passengers: 1,
        currency: 'USD',
        externalVehicleKey: String(row.externalVehicleKey),
        externalVehicleName: String(row.externalVehicleName || 'Published starting price — review required'),
        maxPassengers: Number.isFinite(Number(row.maxPassengers)) ? Number(row.maxPassengers) : null,
        publicSellPrice: Number(row.price),
        quoteKind: 'public_sell',
        quotedAt,
        sourceUrl: String(row.sourceUrl),
        evidenceJson: JSON.stringify({ ...(row.evidence || {}), captureMethod: 'public_page_local_fetch', capturedAt: quotedAt.toISOString() })
      })),
      skipDuplicates: true
    })
    let scope = {}
    try { scope = JSON.parse(run.scopeJson || '{}') } catch (_) {}
    await prisma.priceComparisonRun.update({
      where: { id: run.id },
      data: {
        status: 'configured',
        error: null,
        finishedAt: null,
        scopeJson: JSON.stringify({
          ...scope,
          catalog: {
            totalPages: 1,
            skippedPages: 0,
            collectedPages: 1,
            collectedQuotes: rows.length,
            errors: [],
            complete: true,
            captureMethod: 'public_page_local_fetch',
            capturedAt: quotedAt.toISOString()
          }
        })
      }
    })
    await prisma.auditLog.create({
      data: {
        tenantId: run.tenantId,
        actorRole: 'system',
        action: 'pricing.waug_catalog.import',
        resource: 'price_comparison_run',
        resourceId: run.id,
        traceId: `waug-import-${crypto.randomUUID()}`,
        decision: 'human_approved',
        result: 'ok',
        contextJson: JSON.stringify({ rows: rows.length, inserted: inserted.count, captureMethod: 'public_page_local_fetch' })
      }
    })
    console.log(JSON.stringify({ runId: run.id, rows: rows.length, inserted: inserted.count, quotedAt }))
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error.message || error)
  process.exitCode = 1
})
