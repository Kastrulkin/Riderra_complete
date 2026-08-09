const crypto = require('crypto')

const MYTRAVELTHRU_DEFAULTS = Object.freeze({
  name: 'MyTravelThru',
  adapterKey: 'mytravelthru',
  baseUrl: 'https://travelthru.com',
  supportedCurrencies: ['USD', 'EUR', 'GBP'],
  schedule: { weekday: 3, localTime: '12:00', minLeadDays: 7 },
  passengers: { adults: 1, children: 0, returnJourney: false },
  pricingPolicy: { type: 'client_commission', commissionPercent: 30 },
  formulaVersion: 'mytravelthru-v1',
  maxConcurrency: 2,
  requestDelayMs: 900
})

const ENTITIES_API_URL = 'https://eu-entities-api.limolink.net'
const EXTERNAL_API_URL = 'https://external.limolink.net'
const COMPANY_CLIENT_ID = 'cea3ed8e-8cfe-4f1e-9666-8e595e83bae2'
const COMPANY_COMPANY_ID = 'e3f9eca9-c7c1-4717-8a0c-45505f9ecc37'
// Public widget configuration shipped to every TravelThru booking-page visitor.
const PUBLIC_WIDGET_API_KEY = '92e017f9-3c31-4045-bb60-d1d0f3615e33'
// This value and the signing algorithm are shipped to every visitor in the
// public TravelThru booking widget. It is not an account credential.
const PUBLIC_SCANNER_KEY = 'lkvHGWjWpmYJMRLV2lkvHGWjWpmYJMRLV27HsuLSxys1FMNqR7HsuLSxys1FMNqR'
const USER_AGENT = 'Mozilla/5.0 (compatible; Riderra public price research/1.0)'

function normalizeKey(value) {
  return String(value || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
}

function candidateMatches(inputText, candidate) {
  const input = normalizeKey(inputText)
  const label = normalizeKey(`${candidate.main_text || candidate.label || ''} ${candidate.secondary_text || candidate.description || ''}`)
  if (!input || !label) return false
  const iata = String(inputText || '').match(/\(([A-Z]{3})\)/)?.[1] || String(inputText || '').match(/\b([A-Z]{3})\b/)?.[1]
  if (iata) return new RegExp(`\\b${iata}\\b`, 'i').test(`${candidate.main_text || ''} ${candidate.secondary_text || ''}`)
  if (input === label || label.startsWith(`${input} `) || label.includes(input)) return true
  const stopwords = new Set(['airport', 'international', 'city', 'centre', 'center', 'downtown', 'hotel', 'station', 'terminal', 'the', 'of'])
  const tokens = input.split(' ').filter((token) => token && !stopwords.has(token) && token !== iata?.toLowerCase())
  const candidateTokens = new Set(label.split(' ').filter(Boolean))
  return tokens.length > 0 && tokens.filter((token) => candidateTokens.has(token)).length / tokens.length >= 0.75
}

function encodePlace(place) {
  return `mytravelthru:${Buffer.from(JSON.stringify(place)).toString('base64url')}`
}

function decodePlace(value) {
  const encoded = String(value || '').match(/^mytravelthru:(.+)$/)?.[1]
  if (!encoded) return null
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'))
    if (!parsed?.placeId || !Number.isFinite(Number(parsed.latitude)) || !Number.isFinite(Number(parsed.longitude))) return null
    return parsed
  } catch (_) {
    return null
  }
}

function dayOfYearLikeWidget(date) {
  const start = new Date(date.getUTCFullYear(), 0, 0)
  return Math.floor((date.getTime() - start.getTime()) / 86400000)
}

function scannerHeaders(url, method = 'GET', now = new Date(), secret = PUBLIC_SCANNER_KEY) {
  const timestamp = Math.floor(now.getTime() / 1000).toString()
  const rotatingInput = `${now.getUTCHours()}:${dayOfYearLikeWidget(now)}:${secret.length}`
  const rotatingFactor = crypto.createHmac('sha256', secret).update(rotatingInput).digest('base64').substring(0, 16)
  const pathname = new URL(url).pathname
  const token = crypto.createHmac('sha256', secret)
    .update(`${timestamp}:${pathname}:${String(method).toUpperCase()}:${rotatingFactor}`)
    .digest('base64')
  return { 'X-Scanner-Token': token, 'X-Scanner-Timestamp': timestamp }
}

function formatLocalDateTime(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) throw new Error('MyTravelThru service date is invalid')
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}T${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}:00.000`
}

function vehicleKey(name, capacity) {
  return `${normalizeKey(name || 'vehicle').replace(/\s+/g, '_')}_${Number(capacity) || 0}`
}

function normalizeQuotes(payload, currency) {
  const vehicles = payload?.data?.outwardTrip?.vehicles || payload?.outwardTrip?.vehicles || []
  return vehicles.map((vehicle) => ({
    externalVehicleKey: vehicleKey(vehicle.name, vehicle.maxNumberOfPassengers),
    externalVehicleName: String(vehicle.name || 'Vehicle'),
    maxPassengers: Number.isFinite(Number(vehicle.maxNumberOfPassengers)) ? Number(vehicle.maxNumberOfPassengers) : null,
    price: Math.round((Number(vehicle.servicePrice) + Number.EPSILON) * 100) / 100,
    currency: String(vehicle.currency || currency || '').toUpperCase(),
    vehicleModels: vehicle.equivalentDescription || null,
    externalGuid: vehicle.guid || null
  })).filter((quote) => Number.isFinite(quote.price) && quote.price >= 0 && quote.currency)
}

class MyTravelThruAdapter {
  constructor(config = {}, dependencies = {}) {
    this.baseUrl = String(config.baseUrl || MYTRAVELTHRU_DEFAULTS.baseUrl).replace(/\/+$/, '')
    this.entitiesApiUrl = String(config.entitiesApiUrl || ENTITIES_API_URL).replace(/\/+$/, '')
    this.externalApiUrl = String(config.externalApiUrl || EXTERNAL_API_URL).replace(/\/+$/, '')
    this.companyClientId = config.companyClientId || COMPANY_CLIENT_ID
    this.companyCompanyId = config.companyCompanyId || COMPANY_COMPANY_ID
    this.publicWidgetApiKey = config.publicWidgetApiKey || PUBLIC_WIDGET_API_KEY
    this.supportedCurrencies = config.supportedCurrencies || MYTRAVELTHRU_DEFAULTS.supportedCurrencies
    this.fetchImpl = dependencies.fetchImpl || global.fetch
  }

  async request(url, options = {}) {
    let lastError
    for (let attempt = 1; attempt <= 3; attempt++) {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 30000)
      try {
        const method = options.method || 'GET'
        const response = await this.fetchImpl(url, {
          ...options,
          headers: {
            Accept: 'application/json',
            'Accept-Language': 'en-US,en;q=0.8',
            'Cache-Control': 'no-cache',
            Origin: this.baseUrl,
            Referer: `${this.baseUrl}/booking`,
            'User-Agent': USER_AGENT,
            ...scannerHeaders(url, method),
            ...(options.headers || {})
          },
          signal: controller.signal
        })
        if (!response.ok) {
          const body = await response.text().catch(() => '')
          const error = new Error(`MyTravelThru public source failed: HTTP ${response.status}${body ? ` ${body.slice(0, 500)}` : ''}`)
          error.status = response.status
          throw error
        }
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

  async resolvePlace(inputText) {
    const query = String(inputText || '').trim()
    if (!query) return []
    const url = new URL('/api/Place/fastautocomplete', this.entitiesApiUrl)
    url.searchParams.set('text', query)
    url.searchParams.set('language', 'en')
    const response = await this.request(url)
    const payload = await response.json()
    const predictions = (payload?.predictions || []).filter((row) => candidateMatches(query, row)).slice(0, 8)
    const candidates = []
    for (const prediction of predictions) {
      const detailsUrl = new URL('/api/Place/details', this.entitiesApiUrl)
      detailsUrl.searchParams.set('placeId', prediction.place_id)
      const detailsResponse = await this.request(detailsUrl)
      const detailsPayload = await detailsResponse.json()
      const details = detailsPayload?.result || detailsPayload
      if (!Number.isFinite(Number(details?.lat)) || !Number.isFinite(Number(details?.lng))) continue
      const place = {
        placeId: prediction.place_id,
        name: [prediction.main_text, prediction.secondary_text].filter(Boolean).join(', '),
        address: details.formatted_address || prediction.secondary_text || prediction.main_text,
        latitude: Number(details.lat),
        longitude: Number(details.lng)
      }
      candidates.push({
        id: encodePlace(place),
        label: prediction.main_text || place.address,
        description: place.address
      })
    }
    const iata = query.match(/\(([A-Z]{3})\)/)?.[1] || query.match(/\b([A-Z]{3})\b/)?.[1]
    const exactIata = candidates.filter((row) => iata && new RegExp(`\\b${iata}\\b`, 'i').test(`${row.label} ${row.description}`))
    return exactIata.length === 1 ? exactIata : candidates
  }

  normalizeVehicle(raw) { return raw }

  extractEvidence({ pickup, dropoff, quotes, serviceAt }) {
    return {
      sourceUrl: `${this.baseUrl}/booking`,
      publicSearchOnly: true,
      bookingCreated: false,
      endpoint: '/connect/getBookingPrice',
      pickup: pickup.label,
      dropoff: dropoff.label,
      serviceAt: formatLocalDateTime(serviceAt),
      quoteCount: quotes.length
    }
  }

  async fetchQuotes({ pickup, dropoff, serviceAt, currency, passengers = {} }) {
    const normalizedCurrency = String(currency || '').toUpperCase()
    if (!this.supportedCurrencies.includes(normalizedCurrency)) throw new Error(`MyTravelThru does not support currency ${normalizedCurrency}`)
    const from = decodePlace(pickup.id)
    const to = decodePlace(dropoff.id)
    if (!from || !to) throw new Error('MyTravelThru place mapping is invalid')
    const url = `${this.externalApiUrl}/connect/getBookingPrice`
    const body = {
      type: 1,
      companyId: this.companyCompanyId,
      clientId: this.companyClientId,
      apiKey: this.publicWidgetApiKey,
      pickupDateTime: formatLocalDateTime(serviceAt),
      language: 'en',
      promoCode: null,
      hasMeetAndGreet: false,
      from: { name: from.name, address: from.address, latitude: from.latitude, longitude: from.longitude },
      to: { name: to.name, address: to.address, latitude: to.latitude, longitude: to.longitude },
      passengers: {
        adults: Math.max(1, Number(passengers.adults || 1)),
        children: Math.max(0, Number(passengers.children || 0)),
        infants: 0
      },
      features: [],
      currency: normalizedCurrency,
      viaPoints: [],
      version: 'v2'
    }
    const response = await this.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    const payload = await response.json()
    const quotes = normalizeQuotes(payload, normalizedCurrency)
    if (!quotes.length) {
      const error = new Error('MyTravelThru returned no available vehicles')
      error.code = 'NO_QUOTES'
      throw error
    }
    return { quotes, evidence: this.extractEvidence({ pickup, dropoff, quotes, serviceAt }) }
  }
}

module.exports = {
  MYTRAVELTHRU_DEFAULTS,
  PUBLIC_WIDGET_API_KEY,
  MyTravelThruAdapter,
  candidateMatches,
  decodePlace,
  encodePlace,
  formatLocalDateTime,
  normalizeQuotes,
  scannerHeaders,
  vehicleKey
}
