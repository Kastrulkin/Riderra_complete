#!/usr/bin/env node
require('dotenv').config()

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const APPLY = process.argv.includes('--apply')
const ROUTE_FROM = 'Rovaniemi Airport (RVN)'
const SUPPLIER_SOURCE_PREFIX = 'manual:etaxi-rovaniemi-rvn-2026-03'
const SALE_SOURCE = 'manual:riderra-base005-etaxi-rovaniemi-min15-2026-08-10'
const MARKUP_RATE = 0.15
const ROUNDING_STEP = 5

const destinationOverrides = {
  'Kiruna Area': 'Kiruna'
}

const countryByDestination = {
  Kiruna: 'Sweden',
  Harads: 'Sweden',
  Kirkenes: 'Norway',
  'Tromssa Area': 'Norway'
}

function normalize(value) {
  return String(value || '').trim().toLocaleLowerCase('en-US')
}

function roundUpToStep(value, step = ROUNDING_STEP) {
  return Math.ceil((Number(value) - Number.EPSILON) / step) * step
}

function appendNote(existing, note) {
  const current = String(existing || '').trim()
  if (current.includes(note)) return current
  return [current, note].filter(Boolean).join('\n')
}

function canonicalDestination(value) {
  return destinationOverrides[value] || value
}

function countryFor(destination) {
  return countryByDestination[destination] || 'Finland'
}

async function loadContext(client) {
  const tenant = await client.tenant.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true, code: true, name: true }
  })
  if (!tenant) throw new Error('Active tenant not found')

  const supplierRoutes = await client.driverRoute.findMany({
    where: {
      tenantId: tenant.id,
      isActive: true,
      sourceStatus: 'approved',
      sourceLabel: { startsWith: SUPPLIER_SOURCE_PREFIX },
      driver: {
        isActive: true,
        supplierCompany: { name: { equals: 'eTaxi Rovaniemi', mode: 'insensitive' } }
      }
    },
    include: { driver: { include: { supplierCompany: true } } },
    orderBy: [{ toPoint: 'asc' }, { vehicleType: 'asc' }]
  })
  if (supplierRoutes.length !== 82) {
    throw new Error(`Expected 82 approved eTaxi supplier rows, found ${supplierRoutes.length}`)
  }

  const existingSales = await client.cityPricing.findMany({
    where: {
      tenantId: tenant.id,
      isActive: true,
      routeFrom: { equals: ROUTE_FROM, mode: 'insensitive' }
    },
    orderBy: [{ routeTo: 'asc' }, { vehicleType: 'asc' }]
  })

  const candidates = supplierRoutes.map((supplierRoute) => {
    const destination = canonicalDestination(supplierRoute.toPoint)
    const existing = existingSales.find((sale) =>
      normalize(sale.routeTo) === normalize(destination) &&
      normalize(sale.vehicleType) === normalize(supplierRoute.vehicleType)
    ) || null
    const netPrice = Number(supplierRoute.driverPrice)
    const minimumSellPrice = roundUpToStep(netPrice * (1 + MARKUP_RATE))
    const currentSellPrice = existing?.fixedPrice == null ? null : Number(existing.fixedPrice)
    const finalSellPrice = currentSellPrice == null ? minimumSellPrice : Math.max(currentSellPrice, minimumSellPrice)
    const action = existing == null ? 'create' : finalSellPrice > currentSellPrice ? 'update' : 'unchanged'
    const markupPct = ((finalSellPrice - netPrice) / netPrice) * 100
    return {
      supplierRoute,
      existing,
      destination,
      country: countryFor(destination),
      netPrice,
      minimumSellPrice,
      currentSellPrice,
      finalSellPrice,
      markupPct,
      action
    }
  })

  const duplicateKeys = candidates
    .map((row) => `${normalize(row.destination)}|${normalize(row.supplierRoute.vehicleType)}`)
    .filter((key, index, all) => all.indexOf(key) !== index)
  if (duplicateKeys.length > 0) {
    throw new Error(`Duplicate sale candidates: ${[...new Set(duplicateKeys)].join(', ')}`)
  }

  return { tenant, supplierRoutes, existingSales, candidates }
}

function summarize(context) {
  const actions = context.candidates.reduce((acc, row) => {
    acc[row.action] = (acc[row.action] || 0) + 1
    return acc
  }, {})
  return {
    tenant: context.tenant,
    rule: {
      formula: 'max(currentSell, ceilTo5(netEUR * 1.15))',
      markupRate: MARKUP_RATE,
      roundingStep: ROUNDING_STEP,
      keepHigherExistingPrices: true
    },
    counts: {
      supplierRows: context.supplierRoutes.length,
      destinations: new Set(context.candidates.map((row) => row.destination)).size,
      existingRvnSalesBefore: context.existingSales.length,
      ...actions
    },
    changed: context.candidates
      .filter((row) => row.action !== 'unchanged')
      .map((row) => ({
        action: row.action,
        country: row.country,
        routeFrom: ROUTE_FROM,
        routeTo: row.destination,
        vehicleType: row.supplierRoute.vehicleType,
        netPrice: row.netPrice,
        currentSellPrice: row.currentSellPrice,
        finalSellPrice: row.finalSellPrice,
        markupPct: Number(row.markupPct.toFixed(2))
      })),
    belowMinimum: context.candidates
      .filter((row) => row.markupPct + 1e-9 < MARKUP_RATE * 100)
      .map((row) => ({ routeTo: row.destination, vehicleType: row.supplierRoute.vehicleType, markupPct: row.markupPct }))
  }
}

async function applyChanges(context) {
  return prisma.$transaction(async (tx) => {
    const stats = { created: 0, updated: 0, unchanged: 0, supplierTargetsUpdated: 0 }
    const savedRows = []
    for (const row of context.candidates) {
      const auditNote = [
        `basePriceList=005`,
        `pricingSource=${SALE_SOURCE}`,
        `supplier=eTaxi Rovaniemi`,
        `supplierRouteId=${row.supplierRoute.id}`,
        `supplierNet=${row.netPrice} EUR`,
        `pricingRule=ceilTo5(netEUR*1.15)`,
        `minimumMarkupPercent=15`,
        `approvedInCodex=2026-08-10`
      ].join('; ')

      let saved
      if (row.action === 'create') {
        saved = await tx.cityPricing.create({
          data: {
            tenantId: context.tenant.id,
            country: row.country,
            city: row.destination,
            routeFrom: ROUTE_FROM,
            routeTo: row.destination,
            vehicleType: row.supplierRoute.vehicleType,
            fixedPrice: row.finalSellPrice,
            pricePerKm: null,
            hourlyRate: null,
            childSeatPrice: null,
            currency: 'EUR',
            isActive: true,
            source: SALE_SOURCE,
            notes: `${normalize(row.supplierRoute.vehicleType).includes('minivan') ? 'pax:7' : 'pax:3'}\n${auditNote}`
          }
        })
        stats.created += 1
      } else if (row.action === 'update') {
        saved = await tx.cityPricing.update({
          where: { id: row.existing.id },
          data: {
            fixedPrice: row.finalSellPrice,
            currency: 'EUR',
            source: SALE_SOURCE,
            notes: appendNote(row.existing.notes, auditNote)
          }
        })
        stats.updated += 1
      } else {
        saved = row.existing
        stats.unchanged += 1
      }

      if (row.supplierRoute.ourPrice !== row.finalSellPrice) {
        await tx.driverRoute.update({ where: { id: row.supplierRoute.id }, data: { ourPrice: row.finalSellPrice } })
        stats.supplierTargetsUpdated += 1
      }
      savedRows.push(saved)
    }
    return { stats, savedIds: savedRows.map((row) => row.id) }
  })
}

async function verify(client, tenantId) {
  const context = await loadContext(client)
  const saleKeys = context.existingSales.map((row) => `${normalize(row.routeFrom)}|${normalize(row.routeTo)}|${normalize(row.vehicleType)}`)
  const duplicateSales = [...new Set(saleKeys.filter((key, index, all) => all.indexOf(key) !== index))]
  const summary = summarize(context)
  return {
    activeRvnSales: context.existingSales.length,
    distinctDestinations: new Set(context.existingSales.map((row) => row.routeTo)).size,
    belowMinimum: summary.belowMinimum,
    duplicateSales,
    sourceRows: context.existingSales.filter((row) => row.source === SALE_SOURCE).length
  }
}

async function main() {
  const context = await loadContext(prisma)
  const preview = { mode: APPLY ? 'apply' : 'preview', ...summarize(context) }
  if (!APPLY) {
    console.log(JSON.stringify(preview, null, 2))
    return
  }
  const applied = await applyChanges(context)
  const verified = await verify(prisma, context.tenant.id)
  console.log(JSON.stringify({ ...preview, applied, verified }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
}).finally(async () => prisma.$disconnect())
