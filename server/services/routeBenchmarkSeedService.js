const COUNTRY_ALIASES = new Map([
  ['united states of america', 'united states'],
  ['usa', 'united states'],
  ['us', 'united states'],
  ['united arab emirates', 'united arab emirates'],
  ['uae', 'united arab emirates'],
  ['uk', 'united kingdom'],
  ['great britain', 'united kingdom']
])

function normalize(value) {
  return String(value || '').toLowerCase()
    .replace(/ø/g, 'o').replace(/æ/g, 'ae').replace(/œ/g, 'oe').replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function editDistance(left, right) {
  const a = String(left || ''); const b = String(right || '')
  const row = Array.from({ length: b.length + 1 }, (_, index) => index)
  for (let i = 1; i <= a.length; i += 1) {
    let previous = row[0]
    row[0] = i
    for (let j = 1; j <= b.length; j += 1) {
      const current = row[j]
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1))
      previous = current
    }
  }
  return row[b.length]
}

function canonicalCountry(value) {
  const key = normalize(value)
  return COUNTRY_ALIASES.get(key) || key
}

function isAirportEndpoint(value) {
  return /\([A-Z]{3}\)/.test(String(value || '')) || /\bairport\b/i.test(String(value || ''))
}

function routeEndpointKind(value) {
  const text = String(value || '')
  if (isAirportEndpoint(text)) return 'airport'
  if (/\bto delete\b/i.test(text) || /\bdisposal\b/i.test(text) || /\bfull day\b/i.test(text)) return 'non_geographic'
  if (/\(\s*\d+\s*[-–]\s*\d+\s*miles?\s*\)/i.test(text)) return 'distance_band'
  return 'place'
}

function isManualBenchmarkVerification(value) {
  return /^manual_/i.test(String(value || ''))
}

function parseDistanceBandEndpoint(value) {
  const match = String(value || '').match(/^(.*?)\s*\(\s*(\d+)\s*[-–]\s*(\d+)\s*miles?\s*\)\s*$/i)
  return match ? { baseName: match[1].trim(), minMiles: Number(match[2]), maxMiles: Number(match[3]) } : null
}

function distanceBandSearchTerm(baseName) {
  return String(baseName || '')
    .replace(/\bcity\s+cent(?:er|re)\b/ig, ' ')
    .replace(/\b(?:usa|united states(?: of america)?)\b/ig, ' ')
    .replace(/\s*,\s*|\s+/g, ' ')
    .trim()
}

function radialDistanceBandCoordinates(origin, band) {
  const lat = Number(origin?.lat); const lon = Number(origin?.lon)
  if (![lat, lon, band?.minMiles, band?.maxMiles].every(Number.isFinite)) return []
  const angularDistance = ((band.minMiles + band.maxMiles) / 2) / 3958.8
  const latitude = lat * Math.PI / 180
  const longitude = lon * Math.PI / 180
  return [0, 45, 90, 135, 180, 225, 270, 315].map((bearingDegrees) => {
    const bearing = bearingDegrees * Math.PI / 180
    const targetLatitude = Math.asin(Math.sin(latitude) * Math.cos(angularDistance) + Math.cos(latitude) * Math.sin(angularDistance) * Math.cos(bearing))
    const targetLongitude = longitude + Math.atan2(Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latitude), Math.cos(angularDistance) - Math.sin(latitude) * Math.sin(targetLatitude))
    return { lat: targetLatitude * 180 / Math.PI, lon: targetLongitude * 180 / Math.PI }
  })
}

function haversineMiles(left, right) {
  const lat1 = Number(left?.lat); const lon1 = Number(left?.lon)
  const lat2 = Number(right?.lat); const lon2 = Number(right?.lon)
  if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return null
  const radians = (value) => value * Math.PI / 180
  const latitudeDelta = radians(lat2 - lat1); const longitudeDelta = radians(lon2 - lon1)
  const value = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(longitudeDelta / 2) ** 2
  return 3958.8 * 2 * Math.asin(Math.sqrt(value))
}

function selectDistanceBandPoint(candidates, origin, band) {
  if (!band) return null
  const midpoint = (band.minMiles + band.maxMiles) / 2
  return (Array.isArray(candidates) ? candidates : []).map((candidate) => {
    const distanceMiles = haversineMiles(origin, { lat: candidate.latitude, lon: candidate.longitude })
    return Number.isFinite(distanceMiles) ? { candidate, distanceMiles } : null
  }).filter((item) => item && item.distanceMiles >= band.minMiles && item.distanceMiles <= band.maxMiles)
    .sort((left, right) => Math.abs(left.distanceMiles - midpoint) - Math.abs(right.distanceMiles - midpoint))[0] || null
}

function geocodedCountry(match) {
  const component = (match?.addressComponents || []).find((item) => (item.types || []).includes('country'))
  return component?.longName || component?.shortName || null
}

function countryMatches(expected, match) {
  const actual = geocodedCountry(match)
  if (!expected || !actual) return false
  return canonicalCountry(expected) === canonicalCountry(actual)
}

function isSpecificGeocodingMatch(match) {
  const types = new Set(match?.types || [])
  if (!types.size) return false
  if (types.has('airport')) return false
  return ![...types].every((type) => ['country', 'political', 'continent', 'administrative_area_level_1'].includes(type))
}

function geocodingContextHints(match) {
  const components = match?.addressComponents || []
  const value = (type) => components.find((item) => (item.types || []).includes(type))?.longName
  return [value('locality'), value('administrative_area_level_1')].filter(Boolean)
}

function geocodedRegion(match) {
  const component = (match?.addressComponents || []).find((item) => (item.types || []).includes('administrative_area_level_1'))
  return component?.longName || component?.shortName || null
}

function regionMatchesContext(match, contextMatches = []) {
  const region = canonicalCountry(geocodedRegion(match))
  const expected = contextMatches.map(geocodedRegion).filter(Boolean).map(canonicalCountry)
  return !region || !expected.length || expected.includes(region)
}

function endpointMatchesGeocoding(endpointName, match) {
  const types = new Set(match?.types || [])
  if (['establishment', 'lodging', 'premise', 'tourist_attraction'].some((type) => types.has(type))) return true
  const haystack = normalize(match?.displayName)
  const ignored = new Set(['city', 'center', 'centre', 'downtown', 'district', 'area', 'resort', 'hotel', 'island'])
  const tokens = normalize(endpointName).split(' ').filter((token) => token.length >= 4 && !ignored.has(token))
  const haystackTokens = haystack.split(' ')
  return Boolean(haystack && tokens.length && tokens.some((token) => (
    haystack.includes(token) || (token.length >= 6 && haystackTokens.some((candidate) => editDistance(token, candidate) <= 1))
  )))
}

function routeEndpointQuery(name, country, context = []) {
  const seen = new Set()
  return [name, ...(Array.isArray(context) ? context : []), country]
    .map((item) => String(item || '').trim())
    .filter((item) => {
      const key = normalize(item)
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
    .join(', ')
}

module.exports = {
  canonicalCountry,
  countryMatches,
  distanceBandSearchTerm,
  endpointMatchesGeocoding,
  editDistance,
  geocodedCountry,
  geocodedRegion,
  geocodingContextHints,
  isAirportEndpoint,
  isManualBenchmarkVerification,
  isSpecificGeocodingMatch,
  haversineMiles,
  normalize,
  parseDistanceBandEndpoint,
  radialDistanceBandCoordinates,
  regionMatchesContext,
  routeEndpointKind,
  routeEndpointQuery,
  selectDistanceBandPoint
}
