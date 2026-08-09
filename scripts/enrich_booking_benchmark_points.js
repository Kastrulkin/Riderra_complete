#!/usr/bin/env node

require('dotenv').config()
const crypto = require('crypto')
const fs = require('fs/promises')
const path = require('path')
const { PrismaClient } = require('@prisma/client')
const {
  buildGeocodingQuery,
  enrichmentData,
  extractKmlZones
} = require('../server/services/geoZoneBenchmarkEnrichmentService')

function parseArgs(argv) {
  const args = { tenantId: null, limit: 100, delayMs: 250 }
  for (let index = 2; index < argv.length; index += 1) {
    if (argv[index] === '--tenant-id') args.tenantId = argv[++index]
    else if (argv[index] === '--limit') args.limit = Math.max(1, Math.min(5000, Number(argv[++index]) || 100))
    else if (argv[index] === '--delay-ms') args.delayMs = Math.max(0, Number(argv[++index]) || 0)
    else throw new Error(`Unknown argument: ${argv[index]}`)
  }
  if (!args.tenantId) throw new Error('Use --tenant-id <id>')
  return args
}

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)) }

async function geocodeGoogle(query, apiKey) {
  const url = new URL(`${String(process.env.GOOGLE_MAPS_GEOCODING_BASE_URL || 'https://maps.googleapis.com/maps/api/geocode').replace(/\/+$/, '')}/json`)
  url.searchParams.set('address', query)
  url.searchParams.set('key', apiKey)
  url.searchParams.set('language', 'en')
  let lastError
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 30000)
      const response = await fetch(url, { signal: controller.signal })
      clearTimeout(timer)
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !['OK', 'ZERO_RESULTS'].includes(String(payload.status || ''))) {
        const error = new Error(`Google geocoding failed: ${payload.status || `HTTP ${response.status}`}`)
        error.status = response.status
        throw error
      }
      const row = payload.results?.[0]
      return {
        provider: 'google_maps',
        checkedAt: new Date().toISOString(),
        bestMatch: row ? {
          displayName: row.formatted_address || null,
          lat: Number(row.geometry?.location?.lat),
          lon: Number(row.geometry?.location?.lng),
          placeId: row.place_id || null
        } : null
      }
    } catch (error) {
      lastError = error
      if (attempt < 3) await sleep(750 * attempt)
    }
  }
  throw lastError
}

async function main() {
  const args = parseArgs(process.argv)
  const apiKey = String(process.env.GOOGLE_MAPS_API_KEY || process.env.MAPS_API_KEY || '').trim()
  if (!apiKey) throw new Error('Google Maps geocoding key is not configured')
  const kmlPath = path.join(process.cwd(), 'reports', 'eto-sync', 'riderra_master_geozones.kml')
  const zones = extractKmlZones(await fs.readFile(kmlPath, 'utf8'))
  if (!zones.length) throw new Error('Riderra master geo-zone polygons were not loaded')
  const prisma = new PrismaClient()
  try {
    const rows = await prisma.geoZoneBenchmarkPoint.findMany({
      where: {
        tenantId: args.tenantId,
        source: 'booking_workbook',
        OR: [
          { status: 'candidate' },
          { status: 'resolving' },
          { status: 'needs_review', latitude: null }
        ]
      },
      orderBy: [{ country: 'asc' }, { city: 'asc' }, { sourceRowNumber: 'asc' }],
      take: args.limit
    })
    const totals = { selected: rows.length, verified: 0, needsReview: 0, failed: 0 }
    for (const point of rows) {
      await prisma.geoZoneBenchmarkPoint.update({ where: { id: point.id }, data: { status: 'resolving', resolutionError: null } })
      try {
        const geocoding = await geocodeGoogle(buildGeocodingQuery(point), apiKey)
        const data = enrichmentData(point, geocoding, zones)
        await prisma.geoZoneBenchmarkPoint.update({ where: { id: point.id }, data })
        if (data.status === 'verified') totals.verified += 1
        else totals.needsReview += 1
      } catch (error) {
        totals.failed += 1
        await prisma.geoZoneBenchmarkPoint.update({
          where: { id: point.id },
          data: { status: 'needs_review', resolutionError: String(error.message || error).slice(0, 2000), resolvedAt: new Date() }
        })
      }
      if (args.delayMs) await sleep(args.delayMs)
    }
    await prisma.auditLog.create({
      data: {
        tenantId: args.tenantId,
        actorRole: 'system',
        action: 'directions.booking_benchmark_points.enrich',
        resource: 'geo_zone_benchmark_point',
        resourceId: 'booking_workbook_batch',
        traceId: `booking-zone-enrichment-${crypto.randomUUID()}`,
        decision: 'human_approved',
        result: totals.failed ? 'partial' : 'ok',
        contextJson: JSON.stringify({ ...totals, rule: 'Google address plus coordinate inside Riderra master polygon' })
      }
    })
    const remaining = await prisma.geoZoneBenchmarkPoint.count({
      where: { tenantId: args.tenantId, source: 'booking_workbook', status: 'candidate' }
    })
    console.log(JSON.stringify({ ...totals, remainingCandidates: remaining, polygonZones: zones.length }, null, 2))
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
