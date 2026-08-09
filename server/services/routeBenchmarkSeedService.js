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
  endpointMatchesGeocoding,
  editDistance,
  geocodedCountry,
  geocodedRegion,
  geocodingContextHints,
  isAirportEndpoint,
  isSpecificGeocodingMatch,
  normalize,
  regionMatchesContext,
  routeEndpointKind,
  routeEndpointQuery
}
