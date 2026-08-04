const LONDON_AIRPORTS = {
  LHR: 'London Heathrow Airport (LHR)',
  LGW: 'London Gatwick Airport (LGW)',
  LCY: 'London City Airport (LCY)'
}

const LONDON_DESTINATIONS = {
  CENTER: 'London City Center',
  NW: 'London North-West',
  N: 'London North',
  SW: 'London South-West',
  W: 'London West',
  E: 'London East',
  SE: 'London South-East',
  BRIGHTON: 'Brighton',
  PORTSMOUTH: 'Portsmouth',
  READING: 'Reading',
  SOUTHAMPTON: 'Southampton'
}

const MTT_ROUTE_TOKENS = {
  [LONDON_AIRPORTS.LHR]: 'LHR',
  [LONDON_AIRPORTS.LGW]: 'LGW',
  [LONDON_AIRPORTS.LCY]: 'LCY',
  [LONDON_DESTINATIONS.CENTER]: 'London City Center',
  [LONDON_DESTINATIONS.NW]: 'NW',
  [LONDON_DESTINATIONS.N]: 'N',
  [LONDON_DESTINATIONS.SW]: 'SW',
  [LONDON_DESTINATIONS.W]: 'W',
  [LONDON_DESTINATIONS.E]: 'E',
  [LONDON_DESTINATIONS.SE]: 'SE',
  [LONDON_DESTINATIONS.BRIGHTON]: 'Brighton',
  [LONDON_DESTINATIONS.PORTSMOUTH]: 'Portsmouth',
  [LONDON_DESTINATIONS.READING]: 'Reading',
  [LONDON_DESTINATIONS.SOUTHAMPTON]: 'Southhampton'
}

const CENTRAL_POSTCODES = new Set([
  'EC1', 'EC2', 'EC3', 'EC4', 'WC1', 'WC2',
  'W1', 'SW1', 'SE1', 'E1', 'N1', 'NW1'
])

const POSTCODE_AREA_TO_ZONE = {
  NW: LONDON_DESTINATIONS.NW,
  N: LONDON_DESTINATIONS.N,
  EN: LONDON_DESTINATIONS.N,
  SW: LONDON_DESTINATIONS.SW,
  KT: LONDON_DESTINATIONS.SW,
  SM: LONDON_DESTINATIONS.SW,
  CR: LONDON_DESTINATIONS.SW,
  W: LONDON_DESTINATIONS.W,
  HA: LONDON_DESTINATIONS.W,
  UB: LONDON_DESTINATIONS.W,
  TW: LONDON_DESTINATIONS.W,
  E: LONDON_DESTINATIONS.E,
  IG: LONDON_DESTINATIONS.E,
  RM: LONDON_DESTINATIONS.E,
  SE: LONDON_DESTINATIONS.SE,
  BR: LONDON_DESTINATIONS.SE,
  DA: LONDON_DESTINATIONS.SE
}

const VEHICLES = {
  STANDARD: 'Standard class car',
  ELECTRIC: 'Standard e-vehicle 3 pax',
  MPV: 'Standard MPV',
  MINIVAN: 'Standard minivan 6 pax'
}

function normalizeSpaces(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function detectLondonAirport(value = '') {
  const text = normalizeSpaces(value).toUpperCase()
  if (/\bLHR\b|HEATHROW/.test(text)) return LONDON_AIRPORTS.LHR
  if (/\bLGW\b|GATWICK/.test(text)) return LONDON_AIRPORTS.LGW
  if (/\bLCY\b|LONDON CITY AIRPORT|CITY AIRPORT/.test(text)) return LONDON_AIRPORTS.LCY
  return null
}

function extractUkPostcode(value = '') {
  const text = String(value || '').toUpperCase()
  const match = text.match(/\b(GIR\s?0AA|[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\b/)
  return match ? normalizeSpaces(match[1]) : null
}

function postcodeDistrictFromPostcode(value = '') {
  const postcode = extractUkPostcode(value)
  return postcode ? postcode.replace(/\s+.*$/, '') : null
}

function normalizeLondonZoneOverrides(overrides = {}) {
  if (!overrides || typeof overrides !== 'object') return {}
  return Object.fromEntries(Object.entries(overrides)
    .map(([district, zone]) => [String(district || '').trim().toUpperCase(), String(zone || '').trim()])
    .filter(([district, zone]) => district && Object.values(LONDON_DESTINATIONS).includes(zone)))
}

function applyLondonPostcodeZoneOverrides(parsed = {}, overrides = {}) {
  const normalized = normalizeLondonZoneOverrides(overrides)
  const fromOverride = parsed.fromDistrict ? normalized[parsed.fromDistrict] : null
  const toOverride = parsed.toDistrict ? normalized[parsed.toDistrict] : null
  return {
    ...parsed,
    fromPoint: fromOverride || parsed.fromPoint,
    toPoint: toOverride || parsed.toPoint,
    appliedZoneOverrides: [
      fromOverride ? parsed.fromDistrict : null,
      toOverride ? parsed.toDistrict : null
    ].filter(Boolean)
  }
}

function londonZoneFromPostcode(value = '', overrides = {}) {
  const postcode = extractUkPostcode(value)
  if (!postcode) return null
  const outward = postcodeDistrictFromPostcode(postcode)
  const override = normalizeLondonZoneOverrides(overrides)[outward]
  if (override) return override
  const district = outward.match(/^([A-Z]{1,2}\d{1,2})/)?.[1] || ''
  if (CENTRAL_POSTCODES.has(district)) return LONDON_DESTINATIONS.CENTER
  const area = outward.match(/^([A-Z]{1,2})/)?.[1] || ''
  return POSTCODE_AREA_TO_ZONE[area] || null
}

function postcodeFromGeocodingResult(result = {}) {
  const bestMatch = result?.bestMatch || result || {}
  if (Array.isArray(bestMatch.address)) {
    const component = bestMatch.address.find((item) => Array.isArray(item?.types) && item.types.includes('postal_code'))
    const postcode = extractUkPostcode(component?.long_name || component?.short_name || '')
    if (postcode) return postcode
  }
  const postcode = extractUkPostcode(bestMatch.address?.postcode || bestMatch.displayName || '')
  return postcode || null
}

function canonicalLondonPoint(value = '', overrides = {}) {
  const text = normalizeSpaces(value)
  const lower = text.toLowerCase()
  const airport = detectLondonAirport(text)
  if (airport) return airport
  if (/\bbrighton\b/.test(lower)) return LONDON_DESTINATIONS.BRIGHTON
  if (/\bportsmouth\b/.test(lower)) return LONDON_DESTINATIONS.PORTSMOUTH
  if (/\breading\b/.test(lower)) return LONDON_DESTINATIONS.READING
  if (/\bsouthampton\b|\bsouthhampton\b/.test(lower)) return LONDON_DESTINATIONS.SOUTHAMPTON
  if (/city\s*cent(?:er|re)|central\s+london/.test(lower)) return LONDON_DESTINATIONS.CENTER
  if (/london\s+north[- ]?west|(?:^|\s)nw(?:\s|$)/i.test(text)) return LONDON_DESTINATIONS.NW
  if (/london\s+south[- ]?west|(?:^|\s)sw(?:\s|$)/i.test(text)) return LONDON_DESTINATIONS.SW
  if (/london\s+south[- ]?east|(?:^|\s)se(?:\s|$)/i.test(text)) return LONDON_DESTINATIONS.SE
  if (/london\s+north|(?:^|\s)n(?:\s|$)/i.test(text)) return LONDON_DESTINATIONS.N
  if (/london\s+west|(?:^|\s)w(?:\s|$)/i.test(text)) return LONDON_DESTINATIONS.W
  if (/london\s+east|(?:^|\s)e(?:\s|$)/i.test(text)) return LONDON_DESTINATIONS.E
  return londonZoneFromPostcode(text, overrides)
}

function parseLabeledValue(text = '', labels = []) {
  const escaped = labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
  if (!escaped) return ''
  const match = String(text || '').match(new RegExp(`(?:^|\\n)\\s*(?:${escaped})\\s*[:\\-–—]\\s*(.+)`, 'i'))
  return normalizeSpaces(match?.[1] || '')
}

function splitRouteText(text = '') {
  const raw = String(text || '').trim()
  const from = parseLabeledValue(raw, ['from', 'pickup', 'pick-up', 'откуда', 'место подачи', 'адрес подачи'])
  const to = parseLabeledValue(raw, ['to', 'destination', 'drop-off', 'dropoff', 'куда', 'место назначения', 'адрес назначения'])
  if (from && to) return { from, to }
  const routeLine = parseLabeledValue(raw, ['route', 'маршрут']) || raw
  const arrow = routeLine.split(/\s*(?:->|→|—>|=>)\s*/)
  if (arrow.length >= 2) return { from: normalizeSpaces(arrow[0]), to: normalizeSpaces(arrow.slice(1).join(' ')) }
  return { from, to }
}

function extractPassengerCount(text = '') {
  const raw = String(text || '')
  const match = raw.match(/\b(\d{1,2})\s*(?:pax|passengers?|пассажир(?:а|ов)?|чел(?:овек|овека)?)\b/i) ||
    raw.match(/(?:pax|passengers?|пассажир(?:ы|ов)?|количество пассажиров)\s*[:\-–—]?\s*(\d{1,2})/i)
  return match ? Number(match[1]) : null
}

function detectLondonVehicle(text = '', passengers = null) {
  const lower = String(text || '').toLowerCase()
  if (/electric|e-vehicle|электро/.test(lower)) return { vehicleType: VEHICLES.ELECTRIC, assumed: false }
  if (/minivan|mini\s*van|6\s*pax|7\s*pax|8\s*pax|минивэн/.test(lower)) return { vehicleType: VEHICLES.MINIVAN, assumed: false }
  if (/people\s*carrier|\bmpv\b|4\s*\*\s*4|suv|внедорожник/.test(lower)) return { vehicleType: VEHICLES.MPV, assumed: false }
  if (/standard|sedan|saloon|economy|седан|стандарт/.test(lower)) return { vehicleType: VEHICLES.STANDARD, assumed: false }
  if (Number(passengers) > 5) return { vehicleType: VEHICLES.MINIVAN, assumed: true }
  if (Number(passengers) > 3) return { vehicleType: VEHICLES.MPV, assumed: true }
  return { vehicleType: VEHICLES.STANDARD, assumed: true }
}

function parseLondonPricingRequest(text = '', extracted = {}, zoneOverrides = {}) {
  const fallbackRoute = splitRouteText(text)
  const fromRaw = normalizeSpaces(extracted.fromPoint || fallbackRoute.from)
  const toRaw = normalizeSpaces(extracted.toPoint || fallbackRoute.to)
  const fromPoint = canonicalLondonPoint(fromRaw, zoneOverrides)
  const toPoint = canonicalLondonPoint(toRaw, zoneOverrides)
  const passengers = extracted.passengers != null ? Number(extracted.passengers) : extractPassengerCount(text)
  const vehicle = detectLondonVehicle(extracted.vehicleType || text, passengers)
  const fromPostcode = extractUkPostcode(fromRaw)
  const toPostcode = extractUkPostcode(toRaw)
  const missing = []
  if (!fromRaw) missing.push('место подачи')
  else if (!fromPoint) missing.push(`лондонская зона для «${fromRaw}»`)
  if (!toRaw) missing.push('место назначения')
  else if (!toPoint) missing.push(`лондонская зона для «${toRaw}»`)
  if (fromPoint && toPoint && !detectLondonAirport(fromPoint) && !detectLondonAirport(toPoint)) {
    missing.push('аэропорт LHR, LGW или LCY в маршруте')
  }
  return {
    fromRaw,
    toRaw,
    fromPoint,
    toPoint,
    passengers,
    fromPostcode,
    toPostcode,
    fromDistrict: postcodeDistrictFromPostcode(fromPostcode),
    toDistrict: postcodeDistrictFromPostcode(toPostcode),
    vehicleType: vehicle.vehicleType,
    vehicleAssumed: vehicle.assumed,
    missing
  }
}

async function resolveLondonPricingRequest(text = '', extracted = {}, geocode = null, zoneOverrides = {}) {
  const initial = parseLondonPricingRequest(text, extracted, zoneOverrides)
  if (typeof geocode !== 'function') return initial
  const resolved = { ...extracted }
  const addressResolution = {}

  for (const field of ['fromPoint', 'toPoint']) {
    const currentPoint = field === 'fromPoint' ? initial.fromPoint : initial.toPoint
    const raw = field === 'fromPoint' ? initial.fromRaw : initial.toRaw
    if (currentPoint || !raw) continue
    const query = /\blondon\b|\bunited kingdom\b|\buk\b/i.test(raw) ? raw : `${raw}, London, UK`
    try {
      const geocoding = await geocode(query, { language: 'en' })
      const postcode = postcodeFromGeocodingResult(geocoding)
      if (!postcode) continue
      resolved[field] = `${raw}, ${postcode}`
      addressResolution[field] = {
        postcode,
        district: postcodeDistrictFromPostcode(postcode),
        displayName: geocoding?.bestMatch?.displayName || null,
        provider: geocoding?.provider || null
      }
    } catch (error) {
      addressResolution[field] = { error: error?.message || String(error) }
    }
  }

  const parsed = parseLondonPricingRequest(text, resolved, zoneOverrides)
  return {
    ...parsed,
    fromRaw: initial.fromRaw,
    toRaw: initial.toRaw,
    fromPostcode: parsed.fromPostcode || addressResolution.fromPoint?.postcode || null,
    toPostcode: parsed.toPostcode || addressResolution.toPoint?.postcode || null,
    fromDistrict: parsed.fromDistrict || addressResolution.fromPoint?.district || null,
    toDistrict: parsed.toDistrict || addressResolution.toPoint?.district || null,
    addressResolution
  }
}

function toMttRouteToken(point = '') {
  return MTT_ROUTE_TOKENS[point] || point
}

function londonParkingFee(fromPoint = '', toPoint = '') {
  const fromAirport = Object.entries(LONDON_AIRPORTS).find(([, name]) => name === fromPoint)?.[0] || null
  const toAirport = Object.entries(LONDON_AIRPORTS).find(([, name]) => name === toPoint)?.[0] || null
  if (fromAirport === 'LHR' || toAirport === 'LHR') return { amount: 7.5, currency: 'GBP', reason: fromAirport ? 'LHR arrival' : 'LHR departure' }
  if (fromAirport === 'LGW') return { amount: 7.5, currency: 'GBP', reason: 'LGW arrival' }
  if (toAirport === 'LGW') return { amount: 10, currency: 'GBP', reason: 'LGW departure' }
  if (fromAirport === 'LCY' || toAirport === 'LCY') return { amount: 10, currency: 'GBP', reason: fromAirport ? 'LCY arrival' : 'LCY departure' }
  return { amount: 0, currency: 'GBP', reason: null }
}

module.exports = {
  LONDON_AIRPORTS,
  LONDON_DESTINATIONS,
  VEHICLES,
  applyLondonPostcodeZoneOverrides,
  canonicalLondonPoint,
  detectLondonAirport,
  detectLondonVehicle,
  extractUkPostcode,
  postcodeDistrictFromPostcode,
  postcodeFromGeocodingResult,
  londonParkingFee,
  londonZoneFromPostcode,
  normalizeLondonZoneOverrides,
  parseLondonPricingRequest,
  resolveLondonPricingRequest,
  toMttRouteToken
}
