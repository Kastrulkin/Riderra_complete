function normalizeKey(value) {
  return String(value || '').toLowerCase().normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&(?:amp;)?/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function decodeXmlEntities(value = '') {
  return String(value)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
}

function stripXmlTags(value = '') {
  return decodeXmlEntities(String(value).replace(/<[^>]+>/g, '')).trim()
}

function extractKmlDataValue(placemark = '', key = '') {
  const safeKey = String(key).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = String(placemark).match(new RegExp(`<Data\\s+name=["']${safeKey}["'][^>]*>[\\s\\S]*?<value[^>]*>([\\s\\S]*?)<\\/value>[\\s\\S]*?<\\/Data>`, 'i'))
  return stripXmlTags(match?.[1] || '')
}

function parseKmlCoordinateList(value = '') {
  return String(value).trim().split(/\s+/).map((token) => {
    const [lonRaw, latRaw] = token.split(',')
    const lon = Number(lonRaw); const lat = Number(latRaw)
    return Number.isFinite(lat) && Number.isFinite(lon) ? [lon, lat] : null
  }).filter(Boolean)
}

function extractKmlZones(text = '') {
  const zones = []
  for (const match of String(text).matchAll(/<Placemark\b[\s\S]*?<\/Placemark>/gi)) {
    const placemark = match[0]
    const name = stripXmlTags(placemark.match(/<name\b[^>]*>([\s\S]*?)<\/name>/i)?.[1] || '')
    const polygons = [...placemark.matchAll(/<Polygon\b[\s\S]*?<\/Polygon>/gi)].map((polygonMatch) => {
      const rings = [...polygonMatch[0].matchAll(/<coordinates\b[^>]*>([\s\S]*?)<\/coordinates>/gi)]
        .map((coordinateMatch) => parseKmlCoordinateList(decodeXmlEntities(coordinateMatch[1] || '')))
        .filter((ring) => ring.length >= 3)
      return rings.length ? rings : null
    }).filter(Boolean)
    if (name && polygons.length) {
      zones.push({
        id: extractKmlDataValue(placemark, 'zoneId') || null,
        name,
        description: stripXmlTags(placemark.match(/<description\b[^>]*>([\s\S]*?)<\/description>/i)?.[1] || ''),
        polygons
      })
    }
  }
  return zones
}

function pointInRing(lon, lat, ring = []) {
  let inside = false
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const xi = Number(ring[index]?.[0]); const yi = Number(ring[index]?.[1])
    const xj = Number(ring[previous]?.[0]); const yj = Number(ring[previous]?.[1])
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

function findContainingZone(zones, latitude, longitude) {
  const lat = Number(latitude); const lon = Number(longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
  return (Array.isArray(zones) ? zones : []).find((zone) => (
    zone.polygons.some((rings) => pointInPolygon(lon, lat, rings))
  )) || null
}

function canonicalCityName(city, zoneName = '') {
  const raw = String(city || '').replace(/\u00a0/g, ' ').trim()
  const zone = String(zoneName || '').trim()
  const directionalLondon = /^london\s+(?:city\s+cent(?:er|re)|east|west|north|south|north[- ]?west|south[- ]?west|south[- ]?east)$/i
  if (directionalLondon.test(zone) || /^london\s+(?:cent(?:er|re)|downtown)$/i.test(raw)) return 'London'
  return raw
    .replace(/\s+(?:city\s+)?cent(?:er|re)$/i, '')
    .replace(/\s+downtown$/i, '')
    .trim() || raw
}

function buildGeocodingQuery(point) {
  const parts = [point.destinationAddress, point.city, point.country]
  const seen = new Set()
  return parts.map((part) => String(part || '').trim()).filter((part) => {
    const key = normalizeKey(part)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  }).join(', ')
}

function enrichmentData(point, geocoding, zones, now = new Date()) {
  const match = geocoding?.bestMatch || null
  if (!match || !Number.isFinite(Number(match.lat)) || !Number.isFinite(Number(match.lon))) {
    return {
      status: 'needs_review',
      resolutionError: 'Geocoding: address not found',
      resolvedAt: now,
      verificationMethod: null,
      verifiedAt: null,
      verifiedByUserId: null
    }
  }
  const zone = findContainingZone(zones, match.lat, match.lon)
  const verified = Boolean(zone)
  return {
    city: canonicalCityName(point.city, zone?.name),
    latitude: Number(match.lat),
    longitude: Number(match.lon),
    googlePlaceId: match.placeId || null,
    geocodingProvider: geocoding.provider || null,
    geocodedAddress: match.displayName || null,
    geocodedAt: geocoding.checkedAt ? new Date(geocoding.checkedAt) : now,
    zoneId: zone?.id || null,
    zoneName: zone?.name || null,
    resolutionError: verified ? null : 'Riderra: geocoded point is outside imported polygon zones',
    resolvedAt: now,
    verificationMethod: verified ? 'automatic_geocode_and_polygon' : null,
    status: verified ? 'verified' : 'needs_review',
    verifiedAt: verified ? now : null,
    verifiedByUserId: null
  }
}

module.exports = {
  buildGeocodingQuery,
  canonicalCityName,
  enrichmentData,
  extractKmlZones,
  findContainingZone,
  normalizeKey,
  pointInPolygon
}
