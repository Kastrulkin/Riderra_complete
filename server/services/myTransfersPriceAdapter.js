const MYTRANSFERS_DEFAULTS = Object.freeze({
  name: 'MyTransfers',
  adapterKey: 'mytransfers',
  baseUrl: 'https://www.mytransfers.com',
  supportedCurrencies: ['EUR'],
  schedule: { weekday: 3, localTime: '12:00', minLeadDays: 7 },
  passengers: { adults: 1, children: 0, returnJourney: false },
  pricingPolicy: { type: 'client_commission', commissionPercent: 30 },
  formulaVersion: 'mytransfers-v1',
  maxConcurrency: 2,
  requestDelayMs: 900
})

const USER_AGENT = 'Mozilla/5.0 (compatible; Riderra public price research/1.0)'

function normalizeKey(value) {
  return String(value || '').toLowerCase().normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function candidateMatches(inputText, row) {
  const input = normalizeKey(inputText)
  const candidate = normalizeKey(`${row.main_text || ''} ${row.description || ''}`)
  if (!input || !candidate) return false
  const iata = String(inputText || '').match(/\(([A-Z]{3})\)/)?.[1]
    || String(inputText || '').match(/\b([A-Z]{3})\b/)?.[1]
  if (iata && new RegExp(`\\b${iata}\\b`, 'i').test(`${row.main_text || ''} ${row.description || ''}`)) return true
  if (candidate === input || candidate.startsWith(`${input} `) || candidate.includes(input)) return true
  const stopwords = new Set(['airport', 'international', 'city', 'centre', 'center', 'downtown', 'hotel', 'station', 'terminal', 'port', 'the', 'of'])
  const tokens = input.split(' ').filter((token) => token && !stopwords.has(token) && token !== iata?.toLowerCase())
  const candidateTokens = new Set(candidate.split(' ').filter(Boolean))
  return tokens.length > 0 && tokens.filter((token) => candidateTokens.has(token)).length / tokens.length >= 0.75
}

function placeType(types = []) {
  if (types.includes('airport')) return 'airport'
  if (types.includes('train_station')) return 'train_station'
  if (types.includes('port')) return 'port'
  return 'address'
}

function encodePlace(row) {
  const place = {
    placeId: row.place_id || null,
    name: row.main_text || row.description || '',
    description: row.description || row.main_text || '',
    latitude: Number(row.lat),
    longitude: Number(row.lng),
    type: placeType(Array.isArray(row.types) ? row.types : [])
  }
  return `mytransfers:${Buffer.from(JSON.stringify(place)).toString('base64url')}`
}

function decodePlace(value) {
  const encoded = String(value || '').match(/^mytransfers:(.+)$/)?.[1]
  if (!encoded) return null
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'))
    if (!Number.isFinite(Number(parsed?.latitude)) || !Number.isFinite(Number(parsed?.longitude)) || !parsed?.name) return null
    return parsed
  } catch (_) {
    return null
  }
}

function formatLocalDateTime(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) throw new Error('MyTransfers service date is invalid')
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')} ${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`
}

function vehicleKey(name, capacity) {
  const family = normalizeKey(name || 'vehicle').replace(/\s+/g, '_')
  const seats = Number(capacity) || 0
  if (/private_(premium_minivan|business_minivan|executive_minivan)/.test(family)) return `businessvan_${seats}`
  if (/private_(sedan|taxi)/.test(family)) return 'standard_car'
  if (/private_(premium|business|executive)/.test(family)) return 'business_car'
  if (/private_(luxury|first)/.test(family)) return 'first_class_car'
  if (/private_(mpv|suv)/.test(family)) return `standard_mpv_${seats}`
  if (/private_minivan/.test(family)) return `standard_minivan_${seats}`
  if (/private_(minibus|bus)/.test(family)) return `standard_minibus_${seats}`
  return `${family}_${seats}`
}

function normalizeQuotes(payload) {
  const rows = payload?.response?.transferPriceList || []
  const byVehicle = new Map()
  for (const row of rows) {
    const price = Number(row.price)
    const currency = String(row.currency || '').toUpperCase()
    if (!Number.isFinite(price) || price < 0 || !currency) continue
    const capacity = Number.isFinite(Number(row.maxPassengers)) ? Number(row.maxPassengers) : null
    const quote = {
      externalVehicleKey: vehicleKey(row.transportName, capacity),
      externalVehicleName: String(row.transportName || 'Vehicle'),
      maxPassengers: capacity,
      price: Math.round((price + Number.EPSILON) * 100) / 100,
      currency,
      transportId: row.transportId || null,
      suitcases: Number.isFinite(Number(row.suitcases)) ? Number(row.suitcases) : null
    }
    const existing = byVehicle.get(quote.externalVehicleKey)
    if (!existing || quote.price < existing.price) byVehicle.set(quote.externalVehicleKey, quote)
  }
  return Array.from(byVehicle.values())
}

class MyTransfersAdapter {
  constructor(config = {}, dependencies = {}) {
    this.baseUrl = String(config.baseUrl || MYTRANSFERS_DEFAULTS.baseUrl).replace(/\/+$/, '')
    this.supportedCurrencies = config.supportedCurrencies || MYTRANSFERS_DEFAULTS.supportedCurrencies
    this.fetchImpl = dependencies.fetchImpl || global.fetch
  }

  async request(url, options = {}) {
    let lastError
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 30000)
      try {
        const response = await this.fetchImpl(url, {
          ...options,
          headers: {
            Accept: 'application/json',
            'Accept-Language': 'en-US,en;q=0.8',
            Referer: `${this.baseUrl}/en/`,
            'User-Agent': USER_AGENT,
            ...(options.headers || {})
          },
          signal: controller.signal
        })
        if (!response.ok) throw new Error(`MyTransfers public source failed: HTTP ${response.status}`)
        return response
      } catch (error) {
        lastError = error
        if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 800 * (2 ** (attempt - 1))))
      } finally {
        clearTimeout(timer)
      }
    }
    throw lastError
  }

  async resolvePlace(inputText, _relatedPlaceId, context = {}) {
    const query = String(inputText || '').trim()
    if (!query) return []
    const url = new URL('/api/search', this.baseUrl)
    url.searchParams.set('query', query)
    url.searchParams.set('lang', 'en')
    const response = await this.request(url)
    const payload = await response.json()
    let predictions = (payload?.response?.predictions || []).filter((row) => candidateMatches(query, row)).slice(0, 12)
    const country = normalizeKey(context.country)
    if (country) {
      const countryMatches = predictions.filter((row) => normalizeKey(row.description).includes(country))
      if (countryMatches.length) predictions = countryMatches
    }
    const iata = query.match(/\(([A-Z]{3})\)/)?.[1] || query.match(/\b([A-Z]{3})\b/)?.[1]
    const exactIata = predictions.filter((row) => iata && new RegExp(`\\b${iata}\\b`, 'i').test(`${row.main_text || ''} ${row.description || ''}`))
    if (exactIata.length === 1) predictions = exactIata
    return predictions.map((row) => ({
      id: encodePlace(row),
      label: [row.main_text, row.description].filter(Boolean).join(', '),
      description: row.description || row.main_text,
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
      main_text: point.zoneName || label,
      description: label,
      lat: Number(point.latitude),
      lng: Number(point.longitude),
      types: airport ? ['airport'] : ['address']
    }
    return { id: encodePlace(row), label, description: label, type: airport ? 'airport' : 'address' }
  }

  extractEvidence({ pickup, dropoff, serviceAt, quotes, sessionId }) {
    return {
      sourceUrl: `${this.baseUrl}/en/search/`,
      publicSearchOnly: true,
      bookingCreated: false,
      endpoint: '/api/list',
      pickup: pickup.label,
      dropoff: dropoff.label,
      serviceAt: formatLocalDateTime(serviceAt),
      quoteCount: quotes.length,
      publicSessionId: sessionId || null
    }
  }

  async fetchQuotes({ pickup, dropoff, serviceAt, currency, passengers = {} }) {
    const normalizedCurrency = String(currency || '').toUpperCase()
    if (!this.supportedCurrencies.includes(normalizedCurrency)) throw new Error(`MyTransfers does not support currency ${normalizedCurrency}`)
    const from = decodePlace(pickup.id)
    const to = decodePlace(dropoff.id)
    if (!from || !to) throw new Error('MyTransfers place mapping is invalid')
    const url = new URL('/api/list', this.baseUrl)
    const params = {
      adults: Math.max(1, Number(passengers.adults || 1)),
      children: Math.max(0, Number(passengers.children || 0)),
      infants: 0,
      arrival_date: formatLocalDateTime(serviceAt),
      arrival_time: '',
      departure_date: '',
      departure_time: '',
      arrival_lat: from.latitude,
      arrival_lng: from.longitude,
      departure_lat: to.latitude,
      departure_lng: to.longitude,
      type: 'oneway',
      lang: 'en',
      transfer: '',
      origin: from.name,
      destination: to.name,
      client_api_key: '',
      coupon: ''
    }
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value))
    const response = await this.request(url)
    const payload = await response.json()
    const quotes = normalizeQuotes(payload).filter((quote) => quote.currency === normalizedCurrency)
    if (!quotes.length) {
      const error = new Error('MyTransfers returned no available vehicles')
      error.code = 'NO_QUOTES'
      throw error
    }
    return {
      quotes,
      evidence: this.extractEvidence({ pickup, dropoff, serviceAt, quotes, sessionId: payload?.response?.sessionId })
    }
  }
}

module.exports = {
  MYTRANSFERS_DEFAULTS,
  MyTransfersAdapter,
  candidateMatches,
  decodePlace,
  encodePlace,
  formatLocalDateTime,
  normalizeQuotes,
  vehicleKey
}
