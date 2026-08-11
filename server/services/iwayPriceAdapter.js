const IWAY_DEFAULTS = Object.freeze({
  name: 'iWay',
  adapterKey: 'iway',
  baseUrl: 'https://ng-api.iwayex.com',
  supportedCurrencies: ['EUR'],
  schedule: { weekday: 3, localTime: '12:00', minLeadDays: 7 },
  passengers: { adults: 1, children: 0, returnJourney: false },
  pricingPolicy: { type: 'client_commission', commissionPercent: 30 },
  formulaVersion: 'iway-v1',
  maxConcurrency: 2,
  requestDelayMs: 900
})

const PUBLIC_FRAME_USER_ID = '8587'
const USER_AGENT = 'Mozilla/5.0 (compatible; Riderra public price research/1.0)'

function normalizeKey(value) {
  return String(value || '').toLowerCase().normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function candidateMatches(inputText, row) {
  const input = normalizeKey(inputText)
  const text = normalizeKey(`${row.description || ''} ${row.formatted_address || ''} ${row.country || ''} ${row.iata || ''}`)
  if (!input || !text) return false
  const iata = String(inputText || '').match(/\(([A-Z]{3})\)/)?.[1]
    || String(inputText || '').match(/\b([A-Z]{3})\b/)?.[1]
  if (iata && String(row.iata || '').toUpperCase() === iata) return true
  const stopwords = new Set(['airport', 'international', 'city', 'centre', 'center', 'downtown', 'hotel', 'station', 'terminal', 'port', 'the', 'of'])
  const tokens = input.split(' ').filter((token) => token && !stopwords.has(token) && token !== iata?.toLowerCase())
  const candidateTokens = new Set(text.split(' ').filter(Boolean))
  return text.includes(input) || (tokens.length > 0 && tokens.filter((token) => candidateTokens.has(token)).length / tokens.length >= 0.75)
}

function placeType(types = []) {
  if (types.includes('airport')) return 'airport'
  if (types.includes('train_station')) return 'train_station'
  if (types.includes('port')) return 'port'
  return 'address'
}

function encodePlace(row) {
  const location = row.geometry?.location || row.location || {}
  const place = {
    placeId: row.place_id || row.placeId || null,
    name: row.description || row.formatted_address || row.name || '',
    description: row.formatted_address || row.description || row.name || '',
    latitude: Number(location.lat ?? row.latitude ?? row.lat),
    longitude: Number(location.lng ?? row.longitude ?? row.lng),
    type: placeType(Array.isArray(row.types) ? row.types : [])
  }
  return `iway:${Buffer.from(JSON.stringify(place)).toString('base64url')}`
}

function decodePlace(value) {
  const encoded = String(value || '').match(/^iway:(.+)$/)?.[1]
  if (!encoded) return null
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'))
    if (!Number.isFinite(Number(parsed?.latitude)) || !Number.isFinite(Number(parsed?.longitude)) || !parsed?.name) return null
    return parsed
  } catch (_) {
    return null
  }
}

function vehicleKey(carClass = {}) {
  const title = normalizeKey(carClass.title).replace(/\s+/g, '_')
  const capacity = Number(carClass.capacity) || 0
  if (title === 'standard') return 'standard_car'
  if (title === 'comfort') return 'comfort_car'
  if (title === 'business_light') return 'business_light_car'
  if (title === 'business') return 'business_car'
  if (/^(luxury|first_class)$/.test(title)) return 'first_class_car'
  if (/business.*(van|minivan)|minivan.*vip/.test(title)) return `businessvan_${capacity}`
  if (/minibus|bus/.test(title)) return `standard_minibus_${capacity}`
  if (/suv/.test(title)) return `standard_suv_${capacity}`
  if (/minivan|mpv/.test(title)) return `standard_minivan_${capacity}`
  return `${title || 'vehicle'}_${capacity}`
}

function normalizeQuotes(payload) {
  const rows = Array.isArray(payload) ? payload : (Array.isArray(payload?.result) ? payload.result : [])
  const byVehicle = new Map()
  for (const row of rows) {
    const price = Number(row.price)
    const currency = String(row.currency || '').toUpperCase()
    if (!Number.isFinite(price) || price < 0 || !currency || !row.car_class) continue
    const capacity = Number.isFinite(Number(row.car_class.capacity)) ? Number(row.car_class.capacity) : null
    const models = Array.isArray(row.car_class.models) ? row.car_class.models.filter(Boolean) : []
    const quote = {
      externalVehicleKey: vehicleKey(row.car_class),
      externalVehicleName: [row.car_class.title, models.length ? `(${models.join(', ')})` : ''].filter(Boolean).join(' '),
      maxPassengers: capacity,
      price: Math.round((price + Number.EPSILON) * 100) / 100,
      currency,
      luggage: Number.isFinite(Number(row.car_class.luggage_capacity)) ? Number(row.car_class.luggage_capacity) : null,
      distanceKm: Number.isFinite(Number(row.distance)) ? Number(row.distance) : null,
      priceId: row.price_id || null
    }
    const existing = byVehicle.get(quote.externalVehicleKey)
    if (!existing || quote.price < existing.price) byVehicle.set(quote.externalVehicleKey, quote)
  }
  return Array.from(byVehicle.values())
}

class IwayAdapter {
  constructor(config = {}, dependencies = {}) {
    this.baseUrl = String(config.baseUrl || IWAY_DEFAULTS.baseUrl).replace(/\/+$/, '')
    this.supportedCurrencies = config.supportedCurrencies || IWAY_DEFAULTS.supportedCurrencies
    this.fetchImpl = dependencies.fetchImpl || global.fetch
    this.minRequestIntervalMs = Math.max(0, Number(config.minRequestIntervalMs ?? 900))
    this.nextRequestAt = 0
    this.requestQueue = Promise.resolve()
    this.trustUniquePlaceCandidate = true
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

  commonParams(currency = 'EUR') {
    return { module_type: 'frameng', lang: 'en', user_id: PUBLIC_FRAME_USER_ID, currency }
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
          headers: {
            Accept: 'application/json',
            'Accept-Language': 'en-US,en;q=0.8',
            Referer: 'https://booking.iway.io/',
            Origin: 'https://booking.iway.io',
            'User-Agent': USER_AGENT
          },
          signal: controller.signal
        })
        if (!response.ok) {
          const body = await response.text().catch(() => '')
          const error = new Error(`iWay public source failed: HTTP ${response.status}${body ? ` ${body.slice(0, 300)}` : ''}`)
          error.status = response.status
          throw error
        }
        return response.json()
      } catch (error) {
        lastError = error
        if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, [405, 429].includes(Number(error.status)) ? 60000 : 800 * (2 ** (attempt - 1))))
      } finally {
        clearTimeout(timer)
      }
    }
    throw lastError
  }

  async resolvePlace(inputText, _relatedPlaceId, context = {}) {
    const query = String(inputText || '').trim()
    if (!query) return []
    const currency = this.supportedCurrencies[0] || 'EUR'
    const search = async (path) => {
      const payload = await this.request(path, { ...this.commonParams(currency), term: query })
      return Array.isArray(payload?.result) ? payload.result : []
    }
    let rows = await search('/v1/transport-nodes')
    if (!rows.length) rows = await search('/v1/places/find')
    rows = rows.filter((row) => candidateMatches(query, row)).slice(0, 12)
    const country = normalizeKey(context.country)
    if (country) {
      const matches = rows.filter((row) => normalizeKey(row.country || row.formatted_address).includes(country))
      if (matches.length) rows = matches
    }
    return rows
      .filter((row) => Number.isFinite(Number(row.geometry?.location?.lat)) && Number.isFinite(Number(row.geometry?.location?.lng)))
      .map((row) => ({
        id: encodePlace(row),
        label: row.description || row.formatted_address,
        description: row.formatted_address || row.description,
        type: placeType(Array.isArray(row.types) ? row.types : [])
      }))
  }

  normalizeVehicle(raw) { return raw }

  placeIdIsValid(value) { return Boolean(decodePlace(value)) }

  createBenchmarkPlace(point) {
    if (!Number.isFinite(Number(point?.latitude)) || !Number.isFinite(Number(point?.longitude))) return null
    const label = point.geocodedAddress || point.destinationAddress || point.pickupAddress || point.zoneName
    if (!label) return null
    const airport = Boolean(point.airportIata || /\bairport\b/i.test(`${point.zoneName || ''} ${label}`))
    const row = {
      place_id: point.googlePlaceId || null,
      description: label,
      formatted_address: label,
      geometry: { location: { lat: Number(point.latitude), lng: Number(point.longitude) } },
      types: airport ? ['airport'] : ['address']
    }
    return { id: encodePlace(row), label, description: label, type: airport ? 'airport' : 'address' }
  }

  extractEvidence({ pickup, dropoff, quotes }) {
    const from = decodePlace(pickup.id)
    const to = decodePlace(dropoff.id)
    return {
      sourceUrl: 'https://booking.iway.io/',
      publicSearchOnly: true,
      bookingCreated: false,
      endpoint: '/v1/prices',
      pickup: pickup.label,
      dropoff: dropoff.label,
      startPlacePoint: `${from.latitude},${from.longitude}`,
      finishPlacePoint: `${to.latitude},${to.longitude}`,
      quoteCount: quotes.length,
      distanceKm: quotes.find((row) => Number.isFinite(row.distanceKm))?.distanceKm || null
    }
  }

  async fetchQuotes({ pickup, dropoff, currency }) {
    const normalizedCurrency = String(currency || '').toUpperCase()
    if (!this.supportedCurrencies.includes(normalizedCurrency)) throw new Error(`iWay does not support currency ${normalizedCurrency}`)
    const from = decodePlace(pickup.id)
    const to = decodePlace(dropoff.id)
    if (!from || !to) throw new Error('iWay place mapping is invalid')
    const payload = await this.request('/v1/prices', {
      ...this.commonParams(normalizedCurrency),
      start_place_point: `${from.latitude},${from.longitude}`,
      finish_place_point: `${to.latitude},${to.longitude}`
    })
    const quotes = normalizeQuotes(payload).filter((quote) => quote.currency === normalizedCurrency)
    if (!quotes.length) {
      const error = new Error('iWay returned no available vehicles')
      error.code = 'NO_QUOTES'
      throw error
    }
    return { quotes, evidence: this.extractEvidence({ pickup, dropoff, quotes }) }
  }
}

module.exports = {
  IWAY_DEFAULTS,
  IwayAdapter,
  candidateMatches,
  decodePlace,
  encodePlace,
  normalizeQuotes,
  vehicleKey
}
