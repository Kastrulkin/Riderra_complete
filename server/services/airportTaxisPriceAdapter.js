const AIRPORT_TAXIS_DEFAULTS = Object.freeze({
  name: 'AirportTaxis.com',
  adapterKey: 'airporttaxis-com',
  baseUrl: 'https://airporttaxis.com',
  supportedCurrencies: ['EUR'],
  schedule: { weekday: 3, localTime: '12:00', minLeadDays: 7 },
  passengers: { adults: 1, children: 0, returnJourney: false },
  pricingPolicy: { type: 'client_commission', commissionPercent: 30 },
  formulaVersion: 'airporttaxis-com-v1',
  maxConcurrency: 2,
  requestDelayMs: 900
})

const USER_AGENT = 'Mozilla/5.0 (compatible; Riderra public price research/1.0)'

function normalizeKey(value) {
  return String(value || '').toLowerCase().normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
}

function encodePlace(row) {
  return `airporttaxis-com:${Buffer.from(JSON.stringify(row)).toString('base64url')}`
}

function decodePlace(value) {
  const encoded = String(value || '').match(/^airporttaxis-com:(.+)$/)?.[1]
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

function vehicleKey(name, seats) {
  const normalized = normalizeKey(name).replace(/\s+/g, '_')
  if (normalized === 'saloon') return 'saloon_3'
  if (normalized === 'estate') return 'estate_4'
  if (/mercedes_e/.test(normalized)) return 'mercedes_e_3'
  if (/mercedes_v/.test(normalized)) return 'mercedes_v_7'
  if (/mercedes_s/.test(normalized)) return 'mercedes_s_3'
  if (/minibus/.test(normalized)) return `minibus_${Number(seats) || 0}`
  return `${normalized || 'vehicle'}_${Number(seats) || 0}`
}

function normalizeQuotes(payload) {
  const quotes = []
  for (const row of Array.isArray(payload?.data) ? payload.data : []) {
    const price = Number(row?.calculated?.converted_total ?? row?.calculated?.total)
    const currency = String(row?.calculated?.currency?.code?.value || '').toUpperCase()
    if (!Number.isFinite(price) || price <= 0 || !currency) continue
    quotes.push({
      externalVehicleKey: vehicleKey(row.name, row.seats),
      externalVehicleName: String(row.name || 'Vehicle'),
      maxPassengers: Number(row.seats) || null,
      price: Math.round((price + Number.EPSILON) * 100) / 100,
      currency,
      luggage: Number(row.luggage) || null
    })
  }
  return quotes
}

function serviceDate(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) throw new Error('AirportTaxis.com service date is invalid')
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')} ${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`
}

class AirportTaxisAdapter {
  constructor(config = {}, dependencies = {}) {
    this.baseUrl = String(config.baseUrl || AIRPORT_TAXIS_DEFAULTS.baseUrl).replace(/\/+$/, '')
    this.apiBaseUrl = 'https://app.airporttaxis.com/api'
    this.supportedCurrencies = config.supportedCurrencies || AIRPORT_TAXIS_DEFAULTS.supportedCurrencies
    this.fetchImpl = dependencies.fetchImpl || global.fetch
    this.googleMapsApiKey = String(dependencies.googleMapsApiKey || process.env.GOOGLE_MAPS_API_KEY || process.env.MAPS_API_KEY || '').trim()
    this.minRequestIntervalMs = Math.max(0, Number(config.requestDelayMs ?? AIRPORT_TAXIS_DEFAULTS.requestDelayMs))
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
          if (response.status === 422) {
            const body = await response.text().catch(() => '')
            let payload = {}
            try { payload = JSON.parse(body) } catch (_) {}
            if (/do not provide|requested area|not available|unavailable/i.test(String(payload?.message || body))) {
              return { ok: true, status: response.status, json: async () => payload, text: async () => body }
            }
          }
          const error = new Error(`AirportTaxis.com public source failed: HTTP ${response.status}`)
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

  async resolvePlace(inputText, _relatedPlaceId, context = {}) {
    if (!this.googleMapsApiKey) throw new Error('AirportTaxis.com coordinate resolver is not configured')
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
    if (!this.supportedCurrencies.includes(requestedCurrency)) throw new Error(`AirportTaxis.com does not support currency ${requestedCurrency}`)
    const origin = decodePlace(pickup.id)
    const destination = decodePlace(dropoff.id)
    if (!origin || !destination) throw new Error('AirportTaxis.com place mapping is invalid')
    const payload = {
      pickup_date: serviceDate(serviceAt),
      route: {
        origin: { address: origin.label, latlng: `${origin.latitude},${origin.longitude}` },
        destination: { address: destination.label, latlng: `${destination.latitude},${destination.longitude}` }
      },
      details: { passengers: Math.max(1, Number(passengers.adults || 1)), animals: 0 },
      is_shared: false,
      currency: requestedCurrency,
      ride_type: 'city_taxi'
    }
    const response = await this.request(`${this.apiBaseUrl}/booking-process/vehicles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer null', Origin: this.baseUrl, Referer: `${this.baseUrl}/` },
      body: JSON.stringify(payload)
    })
    const raw = await response.json()
    const quotes = normalizeQuotes(raw)
    if (!quotes.length) { const error = new Error('AirportTaxis.com returned no available vehicles'); error.code = 'NO_QUOTES'; throw error }
    return { quotes, evidence: { sourceUrl: `${this.baseUrl}/`, endpoint: '/api/booking-process/vehicles', publicSearchOnly: true, bookingCreated: false, pickup: origin.label, dropoff: destination.label, serviceAt: payload.pickup_date, quoteCount: quotes.length } }
  }
}

module.exports = { AIRPORT_TAXIS_DEFAULTS, AirportTaxisAdapter, decodePlace, encodePlace, normalizeQuotes, safeGeocodeCandidate, vehicleKey }
