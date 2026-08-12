const crypto = require('crypto')

const JAYRIDE_DEFAULTS = Object.freeze({
  name: 'Jayride',
  adapterKey: 'jayride',
  baseUrl: 'https://platform-api.jayride.com',
  supportedCurrencies: ['EUR', 'USD'],
  schedule: { weekday: 3, localTime: '12:00', minLeadDays: 7 },
  passengers: { adults: 1, children: 0, returnJourney: false },
  pricingPolicy: { type: 'client_commission', commissionPercent: 30 },
  formulaVersion: 'jayride-v1',
  maxConcurrency: 2,
  requestDelayMs: 1000
})

const USER_AGENT = 'Mozilla/5.0 (compatible; Riderra public price research/1.0)'

function normalizeKey(value) {
  return String(value || '').toLowerCase().normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function countryCodeFromDetails(details = {}) {
  const row = (details.addressComponents || []).find((item) => (item.types || []).includes('country'))
  return String(row?.shortName || '').toUpperCase()
}

function cityFromDetails(details = {}) {
  const levels = ['locality', 'administrative_area_level_2', 'administrative_area_level_1']
  for (const level of levels) {
    const row = (details.addressComponents || []).find((item) => (item.types || []).includes(level))
    if (row?.longName) return String(row.longName)
  }
  return ''
}

function placeType(types = []) {
  if (types.some((type) => /airport/.test(type))) return 'airport'
  if (types.includes('train_station')) return 'train_station'
  if (types.includes('transit_station')) return 'station'
  return 'address'
}

function encodePlace(row = {}) {
  const location = row.geometry?.location || row.location || {}
  const place = {
    placeId: String(row.placeId || '').trim(),
    label: String(row.formattedAddress || row.description || row.label || row.name || '').trim(),
    latitude: Number(location.lat ?? row.latitude ?? row.lat),
    longitude: Number(location.lng ?? row.longitude ?? row.lng),
    countryCode: String(row.countryCode || countryCodeFromDetails(row) || '').toUpperCase(),
    city: String(row.city || cityFromDetails(row) || '').trim(),
    timeZone: String(row.timeZone || '').trim(),
    types: Array.isArray(row.types) ? row.types : []
  }
  if (!place.label || !Number.isFinite(place.latitude) || !Number.isFinite(place.longitude)) return null
  return `jayride:${Buffer.from(JSON.stringify(place)).toString('base64url')}`
}

function decodePlace(value) {
  const encoded = String(value || '').match(/^jayride:(.+)$/)?.[1]
  if (!encoded) return null
  try {
    const place = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'))
    if (!place?.label || !Number.isFinite(Number(place.latitude)) || !Number.isFinite(Number(place.longitude))) return null
    return place
  } catch (_) {
    return null
  }
}

function candidateMatches(inputText, row = {}) {
  const input = normalizeKey(inputText)
  const candidate = normalizeKey(`${row.description || ''} ${row.mainText || ''} ${row.secondaryText || ''}`)
  if (!input || !candidate) return false
  const iata = String(inputText || '').match(/\(([A-Z]{3})\)/)?.[1]
    || String(inputText || '').match(/\b([A-Z]{3})\b/)?.[1]
  if (iata && new RegExp(`\\b${iata}\\b`, 'i').test(`${row.description || ''} ${row.mainText || ''}`)) return true
  if (candidate.includes(input)) return true
  const stopwords = new Set(['airport', 'international', 'city', 'centre', 'center', 'downtown', 'hotel', 'station', 'terminal', 'port', 'the', 'of'])
  const tokens = input.split(' ').filter((token) => token && !stopwords.has(token) && token !== iata?.toLowerCase())
  const candidateTokens = new Set(candidate.split(' ').filter(Boolean))
  return tokens.length > 0 && tokens.filter((token) => candidateTokens.has(token)).length / tokens.length >= 0.75
}

function vehicleKey(row = {}) {
  const slug = normalizeKey(row.slug || row.name).replace(/\s+/g, '_')
  const capacity = Number(row.passengerCapacity) || 0
  if (['economy', 'economy_plus', 'standard'].includes(slug)) return 'standard_car'
  if (['premium', 'business', 'executive'].includes(slug)) return 'business_car'
  if (['luxury', 'first_class'].includes(slug)) return 'first_class_car'
  if (/business.*(van|minivan)|premium.*(van|minivan)/.test(slug)) return `businessvan_${capacity}`
  if (/suv/.test(slug)) return `standard_suv_${capacity}`
  if (/bus|coach/.test(slug) || (/van|minivan/.test(slug) && capacity > 7)) return `standard_minibus_${capacity}`
  if (/van|minivan|mpv/.test(slug)) return `standard_minivan_${capacity}`
  return `${slug || 'vehicle'}_${capacity}`
}

function normalizeQuotes(payload) {
  const rows = Array.isArray(payload?.data) ? payload.data : (Array.isArray(payload) ? payload : [])
  const byVehicle = new Map()
  for (const row of rows) {
    const price = Number(row.customerPrice ?? row.customerTotal)
    const currency = String(row.customerCurrency || '').toUpperCase()
    if (!row.name || !Number.isFinite(price) || price < 0 || !currency) continue
    const quote = {
      externalVehicleKey: vehicleKey(row),
      externalVehicleName: String(row.name),
      maxPassengers: Number.isFinite(Number(row.passengerCapacity)) ? Number(row.passengerCapacity) : null,
      price: Math.round((price + Number.EPSILON) * 100) / 100,
      currency,
      maxLuggage: Number.isFinite(Number(row.luggageCapacity)) ? Number(row.luggageCapacity) : null,
      pricingMethod: row.pricingMethod || null,
      source: row.source || null
    }
    const existing = byVehicle.get(quote.externalVehicleKey)
    if (!existing || quote.price < existing.price) byVehicle.set(quote.externalVehicleKey, quote)
  }
  return Array.from(byVehicle.values())
}

class JayrideAdapter {
  constructor(config = {}, dependencies = {}) {
    this.baseUrl = String(config.baseUrl || JAYRIDE_DEFAULTS.baseUrl).replace(/\/+$/, '')
    this.supportedCurrencies = config.supportedCurrencies || JAYRIDE_DEFAULTS.supportedCurrencies
    this.fetchImpl = dependencies.fetchImpl || global.fetch
    this.minRequestIntervalMs = Math.max(0, Number(config.requestDelayMs ?? JAYRIDE_DEFAULTS.requestDelayMs))
    this.nextRequestAt = 0
    this.requestQueue = Promise.resolve()
    this.trustUniquePlaceCandidate = true
    this.placeDetailsCache = new Map()
  }

  async waitForRateSlot() {
    const previous = this.requestQueue
    let release
    this.requestQueue = new Promise((resolve) => { release = resolve })
    await previous
    try {
      const waitMs = Math.max(0, this.nextRequestAt - Date.now())
      if (waitMs) await new Promise((resolve) => setTimeout(resolve, waitMs))
      this.nextRequestAt = Date.now() + this.minRequestIntervalMs
    } finally {
      release()
    }
  }

  async request(path, params = {}) {
    const url = new URL(path, this.baseUrl)
    for (const [key, value] of Object.entries(params)) if (value !== null && value !== undefined && value !== '') url.searchParams.set(key, String(value))
    let lastError
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      await this.waitForRateSlot()
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 30000)
      try {
        const response = await this.fetchImpl(url, {
          method: 'GET',
          headers: { Accept: 'application/json', 'Accept-Language': 'en-US,en;q=0.8', Origin: 'https://portal.jayride.com', Referer: 'https://portal.jayride.com/', 'User-Agent': USER_AGENT },
          signal: controller.signal
        })
        if (!response.ok) {
          const error = new Error(`Jayride public source failed: HTTP ${response.status}`)
          error.status = response.status
          throw error
        }
        return response.json()
      } catch (error) {
        lastError = error
        if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, Number(error.status) === 429 ? 60000 : 800 * (2 ** (attempt - 1))))
      } finally {
        clearTimeout(timer)
      }
    }
    throw lastError
  }

  async resolvePlace(inputText, _relatedPlaceId, context = {}) {
    const query = String(inputText || '').trim()
    if (!query) return []
    const sessiontoken = crypto.randomUUID()
    const payload = await this.request('/places/autocomplete', { input: query, sessiontoken })
    let rows = (Array.isArray(payload?.data) ? payload.data : []).filter((row) => candidateMatches(query, row)).slice(0, 12)
    const country = normalizeKey(context.country)
    if (country) {
      const matching = rows.filter((row) => normalizeKey(`${row.description || ''} ${row.secondaryText || ''}`).includes(country))
      if (matching.length) rows = matching
    }
    const resolved = await Promise.all(rows.map(async (row) => {
      const details = await this.request(`/places/details/${encodeURIComponent(row.placeId)}`, { sessiontoken })
      const place = details?.data
      const id = encodePlace(place)
      return id ? { id, label: place.formattedAddress || row.description, description: place.formattedAddress || row.description, type: placeType(place.types || row.types || []) } : null
    }))
    return resolved.filter(Boolean)
  }

  normalizeVehicle(raw) { return raw }

  placeIdIsValid(value) { return Boolean(decodePlace(value)) }

  createBenchmarkPlace(point) {
    if (!Number.isFinite(Number(point?.latitude)) || !Number.isFinite(Number(point?.longitude))) return null
    const label = point.geocodedAddress || point.destinationAddress || point.pickupAddress || point.zoneName
    if (!label) return null
    const airport = Boolean(point.airportIata || /\bairport\b/i.test(`${point.zoneName || ''} ${label}`))
    const id = encodePlace({
      placeId: point.googlePlaceId || '',
      formattedAddress: label,
      location: { lat: Number(point.latitude), lng: Number(point.longitude) },
      countryCode: '',
      city: point.city || point.zoneName || '',
      types: airport ? ['airport'] : ['address']
    })
    return id ? { id, label, description: label, type: airport ? 'airport' : 'address' } : null
  }

  async enrichPlace(place) {
    if (!place || (place.countryCode && place.city) || !place.placeId) return place
    if (!this.placeDetailsCache.has(place.placeId)) {
      this.placeDetailsCache.set(place.placeId, this.request(`/places/details/${encodeURIComponent(place.placeId)}`, { sessiontoken: crypto.randomUUID() })
        .then((payload) => decodePlace(encodePlace(payload?.data || {})))
        .catch(() => null))
    }
    const details = await this.placeDetailsCache.get(place.placeId)
    return details ? { ...place, ...details } : place
  }

  async fetchQuotes({ pickup, dropoff, currency }) {
    const requestedCurrency = String(currency || '').toUpperCase()
    if (!this.supportedCurrencies.includes(requestedCurrency)) throw new Error(`Jayride does not support Riderra currency ${requestedCurrency}`)
    const from = await this.enrichPlace(decodePlace(pickup.id))
    const to = await this.enrichPlace(decodePlace(dropoff.id))
    if (!from || !to) throw new Error('Jayride place mapping is invalid')
    const payload = await this.request('/public/portal/bookings/tiers', {
      pickupLat: from.latitude,
      pickupLng: from.longitude,
      dropoffLat: to.latitude,
      dropoffLng: to.longitude,
      countryCode: from.countryCode,
      city: from.city,
      pickupLabel: from.label,
      dropoffLabel: to.label,
      dropoffCity: to.city,
      pickupPlaceId: from.placeId,
      dropoffPlaceId: to.placeId
    })
    const allQuotes = normalizeQuotes(payload)
    const quotes = allQuotes.filter((quote) => quote.currency === requestedCurrency)
    if (!quotes.length) {
      const error = new Error(allQuotes.length
        ? `Jayride returned ${allQuotes[0].currency} prices, Riderra route is ${requestedCurrency}`
        : 'Jayride returned no available vehicles')
      error.code = allQuotes.length ? 'CURRENCY_MISMATCH' : 'NO_QUOTES'
      throw error
    }
    return {
      quotes,
      evidence: {
        sourceUrl: 'https://portal.jayride.com/ride',
        endpoint: '/public/portal/bookings/tiers',
        publicSearchOnly: true,
        bookingCreated: false,
        pickup: from.label,
        dropoff: to.label,
        quoteRequestId: payload?.meta?.quoteRequestId || null,
        pickupAirportCode: payload?.meta?.pickupAirportCode || null,
        estimatedDistanceKm: payload?.meta?.estimatedDistanceKm ?? null,
        estimatedDurationMinutes: payload?.meta?.estimatedDurationMinutes ?? null,
        quoteCount: quotes.length
      }
    }
  }
}

module.exports = {
  JAYRIDE_DEFAULTS,
  JayrideAdapter,
  candidateMatches,
  decodePlace,
  encodePlace,
  normalizeQuotes,
  vehicleKey
}
