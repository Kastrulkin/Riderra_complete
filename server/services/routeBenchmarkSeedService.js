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
  return String(value || '').toLowerCase().normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
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
  geocodedCountry,
  geocodingContextHints,
  isAirportEndpoint,
  isSpecificGeocodingMatch,
  normalize,
  routeEndpointKind,
  routeEndpointQuery
}
