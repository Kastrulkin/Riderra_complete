#!/usr/bin/env node

require('dotenv').config()
const crypto = require('crypto')
const fs = require('fs/promises')
const path = require('path')
const { PrismaClient } = require('@prisma/client')
const { representativePointForZone } = require('../server/services/benchmarkPointResolutionService')
const {
  canonicalCityName,
  extractKmlZones,
  mergeZoneCatalogWithOverlay,
  normalizeKey
} = require('../server/services/geoZoneBenchmarkEnrichmentService')
const {
  canonicalCountry,
  countryMatches,
  endpointMatchesGeocoding,
  geocodedRegion,
  isAirportEndpoint,
  isSpecificGeocodingMatch,
  parseDistanceBandEndpoint,
  regionMatchesContext,
  routeEndpointKind,
  routeEndpointQuery,
  selectDistanceBandPoint
} = require('../server/services/routeBenchmarkSeedService')

function parseArgs(argv) {
  const args = { tenantId: null, limit: 2000, delayMs: 150, recheckDirect: false }
  for (let index = 2; index < argv.length; index += 1) {
    if (argv[index] === '--tenant-id') args.tenantId = argv[++index]
    else if (argv[index] === '--limit') args.limit = Math.max(1, Math.min(5000, Number(argv[++index]) || 2000))
    else if (argv[index] === '--delay-ms') args.delayMs = Math.max(0, Number(argv[++index]) || 0)
    else if (argv[index] === '--recheck-direct') args.recheckDirect = true
    else throw new Error(`Unknown argument: ${argv[index]}`)
  }
  if (!args.tenantId) throw new Error('Use --tenant-id <id>')
  return args
}

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)) }

async function googleGeocode({ address, latitude, longitude, apiKey }) {
  const url = new URL(`${String(process.env.GOOGLE_MAPS_GEOCODING_BASE_URL || 'https://maps.googleapis.com/maps/api/geocode').replace(/\/+$/, '')}/json`)
  if (Number.isFinite(latitude) && Number.isFinite(longitude)) url.searchParams.set('latlng', `${latitude},${longitude}`)
  else url.searchParams.set('address', address)
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
      if (!response.ok || !['OK', 'ZERO_RESULTS'].includes(String(payload.status || ''))) throw new Error(`Google geocoding failed: ${payload.status || `HTTP ${response.status}`}`)
      const row = payload.results?.[0]
      return row ? {
        displayName: row.formatted_address || null,
        lat: Number(row.geometry?.location?.lat),
        lon: Number(row.geometry?.location?.lng),
        placeId: row.place_id || null,
        addressComponents: (row.address_components || []).map((item) => ({
          longName: item.long_name,
          shortName: item.short_name,
          types: item.types || []
        })),
        types: row.types || []
      } : null
    } catch (error) {
      lastError = error
      if (attempt < 3) await sleep(750 * attempt)
    }
  }
  throw lastError
}

function normalizedKey(zone, country) {
  return crypto.createHash('sha256').update(`route-zone|${normalizeKey(zone.id || zone.name)}|${normalizeKey(country)}`).digest('hex')
}

async function savePoint(prisma, { tenantId, endpoint, zone, match, status, error, method, reviewNote }) {
  const now = new Date()
  const exactAddress = match?.displayName || `Representative point for ${endpoint.name}`
  const data = {
    country: endpoint.country || null,
    city: canonicalCityName(endpoint.name, zone?.name || endpoint.name),
    pickupAddress: exactAddress,
    destinationAddress: exactAddress,
    zoneId: zone?.id || null,
    zoneName: endpoint.name,
    latitude: Number.isFinite(Number(match?.lat)) ? Number(match.lat) : null,
    longitude: Number.isFinite(Number(match?.lon)) ? Number(match.lon) : null,
    googlePlaceId: match?.placeId || null,
    geocodingProvider: match ? 'google_maps' : null,
    geocodedAddress: match?.displayName || null,
    geocodedAt: match ? now : null,
    source: 'riderra_geo_zone',
    resolutionError: error || null,
    reviewNote: reviewNote || null,
    resolvedAt: now,
    verificationMethod: status === 'verified' ? method : null,
    status,
    verifiedAt: status === 'verified' ? now : null,
    verifiedByUserId: null
  }
  const existing = await prisma.geoZoneBenchmarkPoint.findFirst({
    where: { tenantId, source: 'riderra_geo_zone', zoneName: endpoint.name }
  })
  if (existing) return prisma.geoZoneBenchmarkPoint.update({ where: { id: existing.id }, data })
  return prisma.geoZoneBenchmarkPoint.upsert({
    where: { tenantId_normalizedKey: { tenantId, normalizedKey: normalizedKey(zone || { name: endpoint.name }, endpoint.country) } },
    update: data,
    create: { tenantId, normalizedKey: normalizedKey(zone || { name: endpoint.name }, endpoint.country), ...data }
  })
}

async function main() {
  const args = parseArgs(process.argv)
  const apiKey = String(process.env.GOOGLE_MAPS_API_KEY || process.env.MAPS_API_KEY || '').trim()
  if (!apiKey) throw new Error('Google Maps geocoding key is not configured')
  const basePath = path.join(process.cwd(), 'reports', 'eto-sync', 'riderra_master_geozones.kml')
  const overlayPath = path.join(process.cwd(), 'reports', 'eto-sync', 'london_postcode_districts.kml')
  const baseZones = extractKmlZones(await fs.readFile(basePath, 'utf8'))
  const overlayZones = await fs.readFile(overlayPath, 'utf8').then(extractKmlZones).catch(() => [])
  const zones = mergeZoneCatalogWithOverlay(baseZones, overlayZones)
  const zoneMap = new Map(zones.map((zone) => [normalizeKey(zone.name), zone]))
  const prisma = new PrismaClient()
  try {
    const priceRows = await prisma.cityPricing.findMany({
      where: { tenantId: args.tenantId, isActive: true, fixedPrice: { not: null }, routeFrom: { not: null }, routeTo: { not: null }, vehicleType: { not: null } },
      select: { country: true, city: true, routeFrom: true, routeTo: true }
    })
    const endpoints = new Map()
    for (const row of priceRows) {
      for (const name of [row.routeFrom, row.routeTo]) {
        if (!name || isAirportEndpoint(name)) continue
        const key = normalizeKey(name)
        if (!endpoints.has(key)) endpoints.set(key, { name, country: row.country || null, context: new Set() })
        const related = name === row.routeFrom ? row.routeTo : row.routeFrom
        if (related && related !== name) endpoints.get(key).context.add(related)
      }
    }
    const existing = await prisma.geoZoneBenchmarkPoint.findMany({
      where: { tenantId: args.tenantId, source: 'riderra_geo_zone', status: 'verified', zoneName: { not: null } },
      select: { zoneName: true }
    })
    const verified = new Set(existing.map((row) => normalizeKey(row.zoneName)))
    const pending = [...endpoints.values()].filter((endpoint) => {
      const hasPolygon = zoneMap.has(normalizeKey(endpoint.name))
      if (args.recheckDirect) return !hasPolygon
      return !verified.has(normalizeKey(endpoint.name))
    }).slice(0, args.limit)
    const totals = { selected: pending.length, polygonVerified: 0, directVerified: 0, needsReview: 0, failed: 0 }
    const airportContextCache = new Map()
    for (const endpoint of pending) {
      const zone = zoneMap.get(normalizeKey(endpoint.name)) || null
      try {
        if (zone) {
          const point = representativePointForZone(zone)
          if (!point) throw new Error('KML polygon has no safe representative point')
          const match = await googleGeocode({ latitude: point.lat, longitude: point.lon, apiKey })
          await savePoint(prisma, {
            tenantId: args.tenantId,
            endpoint,
            zone,
            match: { ...(match || {}), lat: point.lat, lon: point.lon },
            status: 'verified',
            method: 'automatic_route_zone_polygon'
          })
          totals.polygonVerified += 1
        } else if (routeEndpointKind(endpoint.name) === 'distance_band') {
          const band = parseDistanceBandEndpoint(endpoint.name)
          const relatedAirport = [...endpoint.context].find(isAirportEndpoint)
          const airportMatch = relatedAirport ? await googleGeocode({ address: routeEndpointQuery(relatedAirport, endpoint.country), apiKey }) : null
          const candidates = await prisma.geoZoneBenchmarkPoint.findMany({
            where: {
              tenantId: args.tenantId,
              source: 'booking_workbook',
              latitude: { not: null },
              longitude: { not: null },
              OR: [
                { city: { contains: band.baseName, mode: 'insensitive' } },
                { destinationAddress: { contains: band.baseName, mode: 'insensitive' } }
              ]
            },
            take: 500
          })
          const selected = selectDistanceBandPoint(candidates, airportMatch, band)
          if (!selected) {
            await savePoint(prisma, { tenantId: args.tenantId, endpoint, zone: null, match: null, status: 'needs_review', error: 'No verified address falls inside the route distance band' })
            totals.needsReview += 1
          } else {
            const candidate = selected.candidate
            await savePoint(prisma, {
              tenantId: args.tenantId,
              endpoint,
              zone: null,
              match: { displayName: candidate.geocodedAddress || candidate.destinationAddress, lat: candidate.latitude, lon: candidate.longitude, placeId: candidate.googlePlaceId },
              status: 'verified',
              method: 'automatic_distance_band_booking_point',
              reviewNote: `Booking benchmark address; straight-line distance ${selected.distanceMiles.toFixed(1)} miles from ${relatedAirport}`
            })
            totals.directVerified += 1
          }
        } else if (routeEndpointKind(endpoint.name) !== 'place') {
          await savePoint(prisma, { tenantId: args.tenantId, endpoint, zone: null, match: null, status: 'needs_review', error: `Route endpoint is ${routeEndpointKind(endpoint.name).replace('_', ' ')}` })
          totals.needsReview += 1
        } else {
          const airportMatches = []
          const contextHints = []
          for (const relatedAirport of [...endpoint.context].filter(isAirportEndpoint)) {
            const cacheKey = `${relatedAirport}|${endpoint.country}`
            if (!airportContextCache.has(cacheKey)) {
              airportContextCache.set(cacheKey, await googleGeocode({ address: routeEndpointQuery(relatedAirport, endpoint.country), apiKey }))
            }
            const airportMatch = airportContextCache.get(cacheKey)
            airportMatches.push(airportMatch)
            const regionHint = geocodedRegion(airportMatch)
            if (regionHint) contextHints.push(regionHint)
          }
          let match = await googleGeocode({ address: routeEndpointQuery(endpoint.name, endpoint.country), apiKey })
          const enforceRegion = canonicalCountry(endpoint.country) === 'united states'
          let valid = match && countryMatches(endpoint.country, match) && isSpecificGeocodingMatch(match) && endpointMatchesGeocoding(endpoint.name, match) && (!enforceRegion || regionMatchesContext(match, airportMatches))
          if (!valid && contextHints.length) {
            const contextualMatch = await googleGeocode({ address: routeEndpointQuery(endpoint.name, endpoint.country, contextHints), apiKey })
            const contextualValid = contextualMatch && countryMatches(endpoint.country, contextualMatch) && isSpecificGeocodingMatch(contextualMatch) && endpointMatchesGeocoding(endpoint.name, contextualMatch)
            if (contextualValid || !match) match = contextualMatch
            valid = contextualValid
          }
          await savePoint(prisma, {
            tenantId: args.tenantId,
            endpoint,
            zone: null,
            match,
            status: valid ? 'verified' : 'needs_review',
            error: valid
              ? null
              : (match
                  ? (countryMatches(endpoint.country, match) ? 'Google result is too broad or does not match the route endpoint name' : 'Google result country does not match the Riderra price row')
                  : 'Google geocoding: place not found'),
            method: 'automatic_route_endpoint_geocode'
          })
          if (valid) totals.directVerified += 1
          else totals.needsReview += 1
        }
      } catch (error) {
        totals.failed += 1
        await savePoint(prisma, { tenantId: args.tenantId, endpoint, zone, match: null, status: 'needs_review', error: String(error.message || error).slice(0, 2000) })
      }
      if (args.delayMs) await sleep(args.delayMs)
    }
    await prisma.auditLog.create({
      data: {
        tenantId: args.tenantId,
        actorRole: 'system',
        action: 'directions.riderra_route_points.seed',
        resource: 'geo_zone_benchmark_point',
        resourceId: 'active_city_pricing_endpoints',
        traceId: `route-zone-seed-${crypto.randomUUID()}`,
        decision: 'human_approved',
        result: totals.failed ? 'partial' : 'ok',
        contextJson: JSON.stringify({ ...totals, recheckDirect: args.recheckDirect, priceRows: priceRows.length, endpointCount: endpoints.size })
      }
    })
    console.log(JSON.stringify({ ...totals, priceRows: priceRows.length, endpointCount: endpoints.size, polygonCatalog: zones.length }, null, 2))
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
