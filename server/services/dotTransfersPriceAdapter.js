const DOTTRANSFERS_DEFAULTS = Object.freeze({
  name: 'Dottransfers',
  adapterKey: 'dottransfers',
  baseUrl: 'https://booking.dottransfers.com',
  supportedCurrencies: ['EUR'],
  schedule: { weekday: 3, localTime: '12:00', minLeadDays: 7 },
  passengers: { adults: 1, children: 0, returnJourney: false },
  pricingPolicy: { type: 'client_commission', commissionPercent: 30 },
  formulaVersion: 'dottransfers-v1',
  maxConcurrency: 2,
  requestDelayMs: 900
})

const API_BASE_URL = 'https://api.mozio.com/v2'
const USER_AGENT = 'Mozilla/5.0 (compatible; Riderra public price research/1.0)'

function normalizeKey(value) {
  return String(value || '').toLowerCase().normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
}

function encodePlace(row) {
  return `dottransfers:${Buffer.from(JSON.stringify(row)).toString('base64url')}`
}

function decodePlace(value) {
  const encoded = String(value || '').match(/^dottransfers:(.+)$/)?.[1]
  if (!encoded) return null
  try {
    const row = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'))
    return row?.label && Number.isFinite(Number(row.latitude)) && Number.isFinite(Number(row.longitude)) ? row : null
  } catch (_) { return null }
}

function meaningfulTokens(value) {
  const ignored = new Set(['airport', 'international', 'city', 'centre', 'center', 'downtown', 'the', 'of'])
  return normalizeKey(value).split(' ').filter((token) => token && !ignored.has(token) && !/^[a-z]{3}$/.test(token))
}

function safeGeocodeCandidate(inputText, result, country = '') {
  const label = String(result?.formatted_address || '')
  const types = Array.isArray(result?.types) ? result.types : []
  if (!label || !result?.geometry?.location) return false
  if (country && !normalizeKey(label).includes(normalizeKey(country))) return false
  const inputAirport = /\bairport\b/i.test(inputText) || /\([A-Z]{3}\)/.test(inputText)
  if (inputAirport && !types.includes('airport')) return false
  if (!inputAirport && types.some((type) => ['restaurant', 'lodging', 'hospital', 'school', 'shopping_mall'].includes(type))) return false
  const inputTokens = meaningfulTokens(inputText)
  const labelTokens = new Set(meaningfulTokens(label))
  const overlap = inputTokens.filter((token) => labelTokens.has(token)).length
  return inputAirport ? overlap >= 1 : inputTokens.length > 0 && overlap / inputTokens.length >= 0.75
}

function serviceDate(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) throw new Error('Dottransfers service date is invalid')
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}T${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}:00`
}

function vehicleKey(vehicle = {}) {
  const typeName = normalizeKey(vehicle?.vehicle_type?.name || '').replace(/\s+/g, '_')
  const className = normalizeKey(vehicle?.vehicle_class_detail?.display_name || 'standard').replace(/\s+/g, '_')
  const capacity = Number(vehicle?.max_passengers) || 0
  if (typeName === 'sedan') return `${className}_sedan_${capacity}`
  if (typeName === 'private_van') return `${className}_van_${capacity}`
  if (typeName === 'private_bus') return `${className}_minibus_${capacity}`
  return `${className}_${typeName || 'vehicle'}_${capacity}`
}

function normalizeQuotes(results) {
  const byVehicle = new Map()
  for (const row of Array.isArray(results) ? results : []) {
    const details = (row.steps || []).find((step) => step?.main)?.details || row.steps?.[0]?.details || {}
    const vehicle = details.vehicle || {}
    const total = row?.total_price?.total_price || {}
    const price = Number(total.value)
    const currency = String(total.currency || '').toUpperCase()
    if (!Number.isFinite(price) || price <= 0 || !currency || !vehicle?.vehicle_type?.name) continue
    const capacity = Number(vehicle.max_passengers) || null
    const className = String(vehicle?.vehicle_class_detail?.display_name || 'Standard')
    const typeName = String(vehicle?.vehicle_type?.name || 'Vehicle')
    const key = vehicleKey(vehicle)
    const quote = {
      externalVehicleKey: key,
      externalVehicleName: `${className} ${typeName}${capacity ? ` (${capacity} pax)` : ''}`,
      maxPassengers: capacity,
      price: Math.round((price + Number.EPSILON) * 100) / 100,
      currency,
      maxBags: Number(vehicle.max_bags) || null,
      make: vehicle.make || null,
      model: vehicle.model || null,
      technicalPlatform: 'Mozio'
    }
    const existing = byVehicle.get(key)
    if (!existing || quote.price < existing.price) byVehicle.set(key, quote)
  }
  return Array.from(byVehicle.values())
}

function parsePublicConfig(html) {
  const apiKey = String(html || '').match(/"MOZIO_API_KEY":"([^"]+)"/)?.[1]
  const partnerRef = String(html || '').match(/"PARTNER_REF":"([^"]*)"/)?.[1] || ''
  if (!apiKey) throw new Error('Dottransfers public search configuration is unavailable')
  return { apiKey, partnerRef }
}

class DotTransfersAdapter {
  constructor(config = {}, dependencies = {}) {
    this.baseUrl = String(config.baseUrl || DOTTRANSFERS_DEFAULTS.baseUrl).replace(/\/+$/, '')
    this.apiBaseUrl = API_BASE_URL
    this.supportedCurrencies = config.supportedCurrencies || DOTTRANSFERS_DEFAULTS.supportedCurrencies
    this.fetchImpl = dependencies.fetchImpl || global.fetch
    this.googleMapsApiKey = String(dependencies.googleMapsApiKey || process.env.GOOGLE_MAPS_API_KEY || process.env.MAPS_API_KEY || '').trim()
    this.minRequestIntervalMs = Math.max(0, Number(config.requestDelayMs ?? DOTTRANSFERS_DEFAULTS.requestDelayMs))
    this.pollDelayMs = Math.max(0, Number(config.pollDelayMs ?? 900))
    this.maxPolls = Math.max(1, Math.min(20, Number(config.maxPolls) || 12))
    this.nextRequestAt = 0
    this.requestQueue = Promise.resolve()
    this.publicConfig = null
    this.publicConfigExpiresAt = 0
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
    } finally { release() }
  }

  async request(url, options = {}) {
    let lastError
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      await this.waitForRateSlot()
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 30000)
      try {
        const response = await this.fetchImpl(url, {
          ...options,
          headers: { Accept: 'application/json', 'Accept-Language': 'en', 'User-Agent': USER_AGENT, ...(options.headers || {}) },
          signal: controller.signal
        })
        if (!response.ok) {
          const error = new Error(`Dottransfers public source failed: HTTP ${response.status}`)
          error.status = response.status
          throw error
        }
        return response
      } catch (error) {
        lastError = error
        if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, [429, 503].includes(Number(error.status)) ? 5000 * attempt : 750 * (2 ** (attempt - 1))))
      } finally { clearTimeout(timer) }
    }
    throw lastError
  }

  async getPublicConfig(force = false) {
    if (!force && this.publicConfig && Date.now() < this.publicConfigExpiresAt) return this.publicConfig
    const response = await this.request(`${this.baseUrl}/?campaign=book-now`, { headers: { Accept: 'text/html' } })
    this.publicConfig = parsePublicConfig(await response.text())
    this.publicConfigExpiresAt = Date.now() + 10 * 60 * 1000
    return this.publicConfig
  }

  publicHeaders(config, extra = {}) {
    return {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'Api-Key': config.apiKey,
      Lang: 'en',
      Ref: config.partnerRef,
      Origin: this.baseUrl,
      Referer: `${this.baseUrl}/`,
      ...extra
    }
  }

  async resolvePlace(inputText, _relatedPlaceId, context = {}) {
    if (!this.googleMapsApiKey) throw new Error('Dottransfers coordinate resolver is not configured')
    const query = [String(inputText || '').trim(), String(context.country || '').trim()].filter(Boolean).join(', ')
    if (!query) return []
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json')
    url.searchParams.set('address', query)
    url.searchParams.set('language', 'en')
    url.searchParams.set('key', this.googleMapsApiKey)
    const payload = await (await this.request(url)).json()
    if (payload?.status !== 'OK') return []
    return (payload.results || []).filter((row) => safeGeocodeCandidate(inputText, row, context.country)).slice(0, 5).map((row) => {
      const place = { label: row.formatted_address, latitude: Number(row.geometry.location.lat), longitude: Number(row.geometry.location.lng), placeId: row.place_id || null, types: row.types || [] }
      return { id: encodePlace(place), label: place.label, description: place.label, type: place.types.includes('airport') ? 'airport' : 'address' }
    })
  }

  createBenchmarkPlace(point) {
    if (!Number.isFinite(Number(point?.latitude)) || !Number.isFinite(Number(point?.longitude))) return null
    const label = point.geocodedAddress || point.destinationAddress || point.pickupAddress || point.zoneName
    if (!label) return null
    const place = { label, latitude: Number(point.latitude), longitude: Number(point.longitude), placeId: point.googlePlaceId || null, types: point.airportIata ? ['airport'] : ['address'] }
    return { id: encodePlace(place), label, description: label, type: point.airportIata ? 'airport' : 'address' }
  }

  placeIdIsValid(value) { return Boolean(decodePlace(value)) }
  normalizeVehicle(raw) { return raw }

  async fetchQuotes({ pickup, dropoff, serviceAt, currency, passengers = {} }) {
    const requestedCurrency = String(currency || '').toUpperCase()
    if (!this.supportedCurrencies.includes(requestedCurrency)) throw new Error(`Dottransfers does not support currency ${requestedCurrency}`)
    const origin = decodePlace(pickup.id)
    const destination = decodePlace(dropoff.id)
    if (!origin || !destination) throw new Error('Dottransfers place mapping is invalid')
    const publicConfig = await this.getPublicConfig()
    const payload = {
      pickup_datetime: serviceDate(serviceAt),
      mode: 'one_way',
      booking_mode: 'one_way',
      num_passengers: Math.max(1, Number(passengers.adults || 1)),
      currency: requestedCurrency,
      start_address: origin.label,
      start_name: origin.label,
      start_lat: String(origin.latitude),
      start_lng: String(origin.longitude),
      end_address: destination.label,
      end_name: destination.label,
      end_lat: String(destination.latitude),
      end_lng: String(destination.longitude),
      marketing: { campaign: 'book-now' }
    }
    const initial = await (await this.request(`${this.apiBaseUrl}/search/`, {
      method: 'POST', headers: this.publicHeaders(publicConfig), body: JSON.stringify(payload)
    })).json()
    if (!initial?.search_id) throw new Error('Dottransfers public search did not return a search id')
    const results = Array.isArray(initial.results) ? [...initial.results] : []
    let moreComing = Boolean(initial.more_coming)
    let pollCount = 0
    while (moreComing && pollCount < this.maxPolls) {
      if (this.pollDelayMs) await new Promise((resolve) => setTimeout(resolve, this.pollDelayMs))
      const next = await (await this.request(`${this.apiBaseUrl}/search/${encodeURIComponent(initial.search_id)}/poll/`, {
        headers: this.publicHeaders(publicConfig, { 'Accept-Version': 'v2.1' })
      })).json()
      if (Array.isArray(next.results)) results.push(...next.results)
      moreComing = Boolean(next.more_coming)
      pollCount += 1
    }
    if (moreComing) throw new Error(`Dottransfers public search did not finish after ${this.maxPolls} polls`)
    const quotes = normalizeQuotes(results)
    if (!quotes.length) { const error = new Error('Dottransfers returned no available vehicles'); error.code = 'NO_QUOTES'; throw error }
    return {
      quotes,
      evidence: {
        sourceUrl: `${this.baseUrl}/?campaign=book-now`,
        endpoint: '/v2/search/ + /v2/search/:id/poll/',
        publicSearchOnly: true,
        bookingCreated: false,
        technicalPlatform: 'Mozio white-label',
        pickup: origin.label,
        dropoff: destination.label,
        serviceAt: payload.pickup_datetime,
        quoteCount: quotes.length,
        publicResultCount: results.length,
        pollCount
      }
    }
  }
}

module.exports = {
  DOTTRANSFERS_DEFAULTS,
  DotTransfersAdapter,
  decodePlace,
  encodePlace,
  normalizeQuotes,
  parsePublicConfig,
  safeGeocodeCandidate,
  vehicleKey
}
