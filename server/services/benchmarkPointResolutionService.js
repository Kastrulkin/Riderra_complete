const { createAdapter, normalizeTextKey, selectPlaceCandidate } = require('./priceComparisonService')
const crypto = require('crypto')

const ACTIVE_TENANTS = new Set()

function compactQuery(parts = []) {
  const seen = new Set()
  return parts.map((part) => String(part || '').trim()).filter((part) => {
    const key = normalizeTextKey(part)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  }).join(', ')
}

function candidateCountryMatches(country, candidate) {
  const expected = normalizeTextKey(country)
  if (!expected) return true
  const haystack = normalizeTextKey(`${candidate?.label || ''} ${candidate?.description || ''}`)
  return haystack.includes(expected)
}

function selectBenchmarkPlaceCandidate(inputText, candidates, country = '') {
  const standard = selectPlaceCandidate(inputText, candidates)
  if (standard) return standard
  const input = normalizeTextKey(inputText)
  const explicit = (Array.isArray(candidates) ? candidates : []).filter((candidate) => {
    const label = normalizeTextKey(candidate?.label)
    return label.length >= 4 && input.includes(label) && candidateCountryMatches(country, candidate)
  })
  return explicit.length === 1 ? explicit[0] : null
}

function resolutionMessages({ geo, zone, pickup, dropoff }) {
  const messages = []
  if (!geo?.found || !geo?.bestMatch) messages.push('Google: address not found')
  if (geo?.bestMatch && !zone) messages.push('Riderra: point is outside imported KML zones')
  if (!pickup) messages.push('SmartRyde: pickup needs review')
  if (!dropoff) messages.push('SmartRyde: destination needs review')
  return messages
}

function pointInRing(lon, lat, ring = []) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = Number(ring[i]?.[0]); const yi = Number(ring[i]?.[1])
    const xj = Number(ring[j]?.[0]); const yj = Number(ring[j]?.[1])
    if (![xi, yi, xj, yj].every(Number.isFinite)) continue
    const intersects = ((yi > lat) !== (yj > lat)) && (lon < ((xj - xi) * (lat - yi)) / ((yj - yi) || Number.EPSILON) + xi)
    if (intersects) inside = !inside
  }
  return inside
}

function pointInPolygon(lon, lat, rings = []) {
  if (!rings.length || !pointInRing(lon, lat, rings[0])) return false
  return !rings.slice(1).some((hole) => pointInRing(lon, lat, hole))
}

function ringArea(ring = []) {
  let area = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) area += Number(ring[j]?.[0]) * Number(ring[i]?.[1]) - Number(ring[i]?.[0]) * Number(ring[j]?.[1])
  return Math.abs(area / 2)
}

function representativePointForZone(zone) {
  const polygons = Array.isArray(zone?.polygons) ? zone.polygons.filter((rings) => rings?.[0]?.length >= 3) : []
  const rings = polygons.sort((a, b) => ringArea(b[0]) - ringArea(a[0]))[0]
  if (!rings) return null
  const outer = rings[0]
  const lons = outer.map((point) => Number(point[0])).filter(Number.isFinite)
  const lats = outer.map((point) => Number(point[1])).filter(Number.isFinite)
  if (!lons.length || !lats.length) return null
  const minLon = Math.min(...lons); const maxLon = Math.max(...lons)
  const minLat = Math.min(...lats); const maxLat = Math.max(...lats)
  const center = { lon: (minLon + maxLon) / 2, lat: (minLat + maxLat) / 2 }
  if (pointInPolygon(center.lon, center.lat, rings)) return center
  for (let y = 1; y < 10; y += 1) {
    for (let x = 1; x < 10; x += 1) {
      const point = { lon: minLon + ((maxLon - minLon) * x / 10), lat: minLat + ((maxLat - minLat) * y / 10) }
      if (pointInPolygon(point.lon, point.lat, rings)) return point
    }
  }
  return null
}

function zoneNormalizedKey(zone) {
  return crypto.createHash('sha256').update(`zone|${normalizeTextKey(zone.id || zone.name)}`).digest('hex')
}

async function generateZoneBenchmarkBatch({ prisma, tenantId, limit = 10, loadGeoZoneIndex, geocodeAddress, delayMs = 1000 }) {
  if (ACTIVE_TENANTS.has(tenantId)) return { accepted: false, reason: 'already_running' }
  ACTIVE_TENANTS.add(tenantId)
  try {
    const [source, index, existing] = await Promise.all([
      prisma.priceComparisonSource.findFirst({ where: { tenantId, adapterKey: 'smart-ryde', isActive: true } }),
      loadGeoZoneIndex(tenantId),
      prisma.geoZoneBenchmarkPoint.findMany({ where: { tenantId, source: 'riderra_geo_zone' }, select: { zoneId: true, zoneName: true } })
    ])
    if (!source) throw new Error('Active SmartRyde comparison source is not configured')
    const adapter = createAdapter(source)
    const existingKeys = new Set(existing.flatMap((row) => [row.zoneId, row.zoneName].filter(Boolean).map(normalizeTextKey)))
    const zones = (index?.zones || []).filter((zone) => !existingKeys.has(normalizeTextKey(zone.id)) && !existingKeys.has(normalizeTextKey(zone.name))).slice(0, Math.min(Math.max(Number(limit) || 10, 1), 100))
    let verified = 0
    let needsReview = 0
    for (const zone of zones) {
      const point = representativePointForZone(zone)
      if (!point) continue
      let geo = null
      let candidates = []
      let selected = null
      let error = null
      try {
        geo = await geocodeAddress(`${point.lat},${point.lon}`, { language: 'en' })
        const exactAddress = geo?.bestMatch?.displayName
        if (!exactAddress) throw new Error('Google reverse geocoding returned no address')
        candidates = await adapter.resolvePlace(exactAddress)
        selected = selectBenchmarkPlaceCandidate(exactAddress, candidates)
        if (!selected) error = 'SmartRyde: representative address needs review'
      } catch (resolveError) {
        error = String(resolveError.message || resolveError).slice(0, 2000)
      }
      const exactAddress = geo?.bestMatch?.displayName || `Representative point inside ${zone.name}`
      const status = selected ? 'verified' : 'needs_review'
      await prisma.geoZoneBenchmarkPoint.upsert({
        where: { tenantId_normalizedKey: { tenantId, normalizedKey: zoneNormalizedKey(zone) } },
        update: {},
        create: {
          tenantId,
          country: null,
          city: zone.name || null,
          pickupAddress: exactAddress,
          destinationAddress: exactAddress,
          normalizedKey: zoneNormalizedKey(zone),
          zoneId: zone.id || null,
          zoneName: zone.name || null,
          latitude: point.lat,
          longitude: point.lon,
          source: 'riderra_geo_zone',
          googlePlaceId: geo?.bestMatch?.placeId || null,
          geocodingProvider: geo?.provider || null,
          geocodedAddress: geo?.bestMatch?.displayName || null,
          geocodedAt: geo?.checkedAt ? new Date(geo.checkedAt) : null,
          smartRydePickupPlaceId: selected?.id || null,
          smartRydePickupLabel: selected?.label || null,
          smartRydeDropoffPlaceId: selected?.id || null,
          smartRydeDropoffLabel: selected?.label || null,
          smartRydePickupCandidatesJson: JSON.stringify(candidates),
          smartRydeDropoffCandidatesJson: JSON.stringify(candidates),
          resolutionError: error,
          resolvedAt: new Date(),
          verificationMethod: selected ? 'automatic_zone_point_and_partner' : null,
          status,
          verifiedAt: selected ? new Date() : null
        }
      })
      if (selected) verified += 1
      else needsReview += 1
      if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
    return { accepted: true, processed: zones.length, verified, needsReview }
  } finally {
    ACTIVE_TENANTS.delete(tenantId)
  }
}

async function resolveBenchmarkPoint({ prisma, point, source, geocodeAddress, findGeoZoneForGeoResult }) {
  const adapter = createAdapter(source)
  const destinationQuery = compactQuery([point.destinationAddress, point.city, point.country])
  const pickupQuery = compactQuery([
    `${point.pickupAddress}${point.airportIata ? ` (${point.airportIata})` : ''}`,
    point.country
  ])

  let geo = null
  let zone = null
  let pickupCandidates = []
  let dropoffCandidates = []
  let pickup = null
  let dropoff = null
  try {
    geo = await geocodeAddress(destinationQuery, { language: 'en' })
    if (geo?.bestMatch) zone = await findGeoZoneForGeoResult(point.tenantId, geo.bestMatch)
    pickupCandidates = await adapter.resolvePlace(pickupQuery)
    pickup = selectBenchmarkPlaceCandidate(pickupQuery, pickupCandidates, point.country)
    dropoffCandidates = await adapter.resolvePlace(destinationQuery, pickup?.id || null)
    dropoff = selectBenchmarkPlaceCandidate(destinationQuery, dropoffCandidates, point.country)

    const messages = resolutionMessages({ geo, zone, pickup, dropoff })
    const verified = Boolean(geo?.bestMatch && zone && pickup && dropoff)
    return prisma.geoZoneBenchmarkPoint.update({
      where: { id: point.id },
      data: {
        latitude: geo?.bestMatch?.lat ?? null,
        longitude: geo?.bestMatch?.lon ?? null,
        googlePlaceId: geo?.bestMatch?.placeId || null,
        geocodingProvider: geo?.provider || null,
        geocodedAddress: geo?.bestMatch?.displayName || null,
        geocodedAt: geo?.checkedAt ? new Date(geo.checkedAt) : new Date(),
        zoneId: zone?.id || null,
        zoneName: zone?.name || null,
        smartRydePickupPlaceId: pickup?.id || null,
        smartRydePickupLabel: pickup?.label || null,
        smartRydeDropoffPlaceId: dropoff?.id || null,
        smartRydeDropoffLabel: dropoff?.label || null,
        smartRydePickupCandidatesJson: JSON.stringify(pickupCandidates),
        smartRydeDropoffCandidatesJson: JSON.stringify(dropoffCandidates),
        resolutionError: messages.length ? messages.join('; ') : null,
        resolvedAt: new Date(),
        verificationMethod: verified ? 'automatic_geo_and_partner' : null,
        status: verified ? 'verified' : 'needs_review',
        verifiedAt: verified ? new Date() : null,
        verifiedByUserId: null
      }
    })
  } catch (error) {
    return prisma.geoZoneBenchmarkPoint.update({
      where: { id: point.id },
      data: {
        status: 'needs_review',
        resolutionError: String(error.message || error).slice(0, 2000),
        resolvedAt: new Date(),
        smartRydePickupCandidatesJson: pickupCandidates.length ? JSON.stringify(pickupCandidates) : null,
        smartRydeDropoffCandidatesJson: dropoffCandidates.length ? JSON.stringify(dropoffCandidates) : null
      }
    })
  }
}

async function executeBenchmarkResolutionBatch({ prisma, tenantId, limit = 10, geocodeAddress, findGeoZoneForGeoResult, delayMs = 1000 }) {
  if (ACTIVE_TENANTS.has(tenantId)) return { accepted: false, reason: 'already_running' }
  ACTIVE_TENANTS.add(tenantId)
  try {
    const source = await prisma.priceComparisonSource.findFirst({ where: { tenantId, adapterKey: 'smart-ryde', isActive: true } })
    if (!source) throw new Error('Active SmartRyde comparison source is not configured')
    const points = await prisma.geoZoneBenchmarkPoint.findMany({
      where: { tenantId, status: { in: ['candidate', 'resolving'] } },
      orderBy: [{ country: 'asc' }, { city: 'asc' }, { sourceRowNumber: 'asc' }],
      take: Math.min(Math.max(Number(limit) || 10, 1), 100)
    })
    for (const point of points) {
      await prisma.geoZoneBenchmarkPoint.update({ where: { id: point.id }, data: { status: 'resolving', resolutionError: null } })
      await resolveBenchmarkPoint({ prisma, point, source, geocodeAddress, findGeoZoneForGeoResult })
      if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
    return { accepted: true, processed: points.length }
  } finally {
    ACTIVE_TENANTS.delete(tenantId)
  }
}

function isBenchmarkResolutionRunning(tenantId) {
  return ACTIVE_TENANTS.has(tenantId)
}

module.exports = {
  compactQuery,
  executeBenchmarkResolutionBatch,
  generateZoneBenchmarkBatch,
  isBenchmarkResolutionRunning,
  representativePointForZone,
  resolveBenchmarkPoint,
  selectBenchmarkPlaceCandidate
}
