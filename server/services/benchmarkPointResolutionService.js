const { createAdapter, normalizeTextKey, selectPlaceCandidate } = require('./priceComparisonService')

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
  isBenchmarkResolutionRunning,
  resolveBenchmarkPoint,
  selectBenchmarkPlaceCandidate
}
