const crypto = require('crypto')

const AIRPORT_TRANSFER_PORTAL_DEFAULTS = Object.freeze({
  name: 'Airport Transfer Portal',
  adapterKey: 'airport-transfer-portal',
  baseUrl: 'https://www.airporttransferportal.com',
  supportedCurrencies: ['EUR'],
  schedule: { weekday: 3, localTime: '12:00', minLeadDays: 7 },
  passengers: { adults: 1, children: 0, luggage: 1, returnJourney: false },
  pricingPolicy: { type: 'client_commission', commissionPercent: 30 },
  formulaVersion: 'airport-transfer-portal-v1',
  maxConcurrency: 1,
  requestDelayMs: 2500
})

const USER_AGENT = 'Mozilla/5.0 (compatible; Riderra public price research/1.0)'

function normalizeKey(value) {
  return String(value || '').toLowerCase().normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function extractIata(value) {
  return String(value || '').match(/\(([A-Z]{3})\)/)?.[1]
    || String(value || '').match(/\b([A-Z]{3})\b/)?.[1]
    || null
}

function encodePlace(place = {}) {
  if (!place.kind || !place.label) return null
  return `airport-transfer-portal:${Buffer.from(JSON.stringify(place)).toString('base64url')}`
}

function decodePlace(value) {
  const encoded = String(value || '').match(/^airport-transfer-portal:(.+)$/)?.[1]
  if (!encoded) return null
  try {
    const place = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'))
    return place?.kind && place?.label ? place : null
  } catch (_) {
    return null
  }
}

function vehicleKey(type, capacity) {
  const normalized = normalizeKey(type).replace(/\s+/g, '_')
  if (normalized === 'sedan' || normalized === 'hatchback') return 'standard_car'
  if (normalized === 'luxury_sedan' || normalized === 'limousine' || normalized === 'vip') return 'business_car'
  if (normalized === 'suv' || normalized === 'jeep' || normalized === 'landcruiser') return `standard_suv_${capacity || 4}`
  if (normalized === 'van' || normalized === 'minivan' || normalized === 'wheelchair_van') return `standard_minivan_${capacity || 7}`
  if (normalized === 'minibus' || normalized === 'coaster' || normalized === 'bus') return `standard_minibus_${capacity || 0}`
  return `${normalized || 'vehicle'}_${capacity || 0}`
}

function parseOptions(payload = {}) {
  return (Array.isArray(payload.options) ? payload.options : []).map((option) => ({
    externalVehicleKey: vehicleKey(option.vehicleType, Number(option.maxPax) || null),
    externalVehicleName: String(option.vehicleType || '').replace(/_/g, ' '),
    maxPassengers: Number(option.maxPax) || null,
    maxLuggage: Number(option.maxLuggage) || null,
    price: Number(option.totalPrice),
    currency: String(option.currency || payload.currency || '').toUpperCase()
  })).filter((quote) => quote.externalVehicleName && Number.isFinite(quote.price) && quote.price >= 0 && quote.currency)
}

class AirportTransferPortalAdapter {
  constructor(config = {}, dependencies = {}) {
    this.baseUrl = String(config.baseUrl || AIRPORT_TRANSFER_PORTAL_DEFAULTS.baseUrl).replace(/\/+$/, '')
    this.supportedCurrencies = config.supportedCurrencies || AIRPORT_TRANSFER_PORTAL_DEFAULTS.supportedCurrencies
    this.fetchImpl = dependencies.fetchImpl || global.fetch
    this.minRequestIntervalMs = Math.max(0, Number(config.requestDelayMs ?? AIRPORT_TRANSFER_PORTAL_DEFAULTS.requestDelayMs))
    this.nextRequestAt = 0
    this.requestQueue = Promise.resolve()
    this.airports = null
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

  async request(path, options = {}) {
    let lastError
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      await this.waitForRateSlot()
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 35000)
      try {
        const response = await this.fetchImpl(new URL(path, this.baseUrl), {
          ...options,
          headers: { Accept: 'application/json', 'Accept-Language': 'en-US,en;q=0.8', 'User-Agent': USER_AGENT, ...(options.headers || {}) },
          signal: controller.signal
        })
        if (!response.ok) {
          const detail = await response.text().catch(() => '')
          const error = new Error(`Airport Transfer Portal public source failed: HTTP ${response.status}${detail ? ` ${detail.slice(0, 180)}` : ''}`)
          error.status = response.status
          throw error
        }
        return response
      } catch (error) {
        lastError = error
        if (attempt < 3 && Number(error.status) !== 400) await new Promise((resolve) => setTimeout(resolve, 800 * (2 ** (attempt - 1))))
        else if (attempt >= 3 || Number(error.status) === 400) break
      } finally {
        clearTimeout(timer)
      }
    }
    throw lastError
  }

  async loadAirports() {
    if (!this.airports) this.airports = await (await this.request('/api/public/airports')).json()
    return Array.isArray(this.airports) ? this.airports : []
  }

  async resolvePlace(inputText) {
    const query = String(inputText || '').trim()
    if (!query) return []
    const iata = extractIata(query)
    const normalized = normalizeKey(query)
    return (await this.loadAirports()).filter((airport) => {
      if (iata) return String(airport.code).toUpperCase() === iata
      const haystack = normalizeKey(`${airport.code} ${airport.name} ${airport.city} ${airport.country}`)
      return haystack.includes(normalized) || normalized.includes(normalizeKey(airport.city))
    }).slice(0, 12).map((airport) => ({
      id: encodePlace({ kind: 'airport', airportId: airport.id, iata: airport.code, label: `${airport.name} (${airport.code})` }),
      label: `${airport.name} (${airport.code})`,
      description: `${airport.city}, ${airport.country}`,
      type: 'airport'
    }))
  }

  createBenchmarkPlace(point = {}) {
    const text = `${point.zoneName || ''} ${point.pickupAddress || ''} ${point.destinationAddress || ''} ${point.geocodedAddress || ''}`
    const iata = extractIata(text)
    const zoneNameHasAirport = /\bairport\b/i.test(String(point.zoneName || '')) || Boolean(extractIata(point.zoneName))
    if (iata && zoneNameHasAirport) {
      const label = point.zoneName || point.pickupAddress || point.geocodedAddress || iata
      return { id: encodePlace({ kind: 'airport', iata, label }), label, description: label, type: 'airport' }
    }
    const latitude = Number(point.latitude)
    const longitude = Number(point.longitude)
    const label = point.geocodedAddress || point.destinationAddress || point.pickupAddress || point.zoneName
    if (!label || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
    return { id: encodePlace({ kind: 'address', latitude, longitude, label }), label, description: label, type: 'address' }
  }

  placeIdIsValid(value) { return Boolean(decodePlace(value)) }
  normalizeVehicle(raw) { return raw }

  async resolveAirport(place) {
    if (place.airportId) return place
    const airport = (await this.loadAirports()).find((row) => String(row.code).toUpperCase() === String(place.iata || '').toUpperCase())
    if (!airport) {
      const error = new Error(`Airport Transfer Portal does not list airport ${place.iata || place.label}`)
      error.code = 'NO_QUOTES'
      throw error
    }
    return { ...place, airportId: airport.id, iata: airport.code, label: `${airport.name} (${airport.code})` }
  }

  async getSearchToken() {
    const challenge = await (await this.request('/api/public/search-token')).json()
    const prefix = '0'.repeat(Math.max(1, Number(challenge.difficulty) || 1))
    let nonce = 0
    while (!crypto.createHash('sha256').update(`${challenge.challenge}${nonce}`).digest('hex').startsWith(prefix)) {
      nonce += 1
      if (nonce % 1000 === 0) await new Promise((resolve) => setImmediate(resolve))
    }
    return (await (await this.request('/api/public/search-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challenge: challenge.challenge, nonce: String(nonce) })
    })).json()).token
  }

  async fetchQuotes({ pickup, dropoff, serviceAt, currency, passengers = {} }) {
    const requestedCurrency = String(currency || '').toUpperCase()
    if (!this.supportedCurrencies.includes(requestedCurrency)) throw new Error(`Airport Transfer Portal does not support Riderra currency ${requestedCurrency}`)
    let from = decodePlace(pickup.id)
    let to = decodePlace(dropoff.id)
    if (!from || !to) throw new Error('Airport Transfer Portal place mapping is invalid')
    const airportAtPickup = from.kind === 'airport'
    const airportAtDropoff = to.kind === 'airport'
    if (airportAtPickup === airportAtDropoff) {
      const error = new Error('Airport Transfer Portal quotes require exactly one airport endpoint')
      error.code = 'NO_QUOTES'
      throw error
    }
    const airport = await this.resolveAirport(airportAtPickup ? from : to)
    const address = airportAtPickup ? to : from
    if (!Number.isFinite(Number(address.latitude)) || !Number.isFinite(Number(address.longitude))) throw new Error('Airport Transfer Portal destination coordinates are missing')
    const matchUrl = `/api/public/zones/match?lat=${encodeURIComponent(address.latitude)}&lng=${encodeURIComponent(address.longitude)}&airportId=${airport.airportId}&address=${encodeURIComponent(address.label)}`
    const match = await (await this.request(matchUrl)).json()
    if (!match.matched || !match.zone?.id) {
      const error = new Error(match.message || 'Airport Transfer Portal returned no priced zone')
      error.code = 'NO_QUOTES'
      throw error
    }
    const date = new Date(serviceAt)
    if (!Number.isFinite(date.getTime())) throw new Error('Airport Transfer Portal service date is invalid')
    const pickupTime = date.toISOString().slice(0, 19)
    const token = await this.getSearchToken()
    const payload = {
      airportId: Number(airport.airportId),
      zoneId: Number(match.zone.id),
      direction: airportAtPickup ? 'FROM_AIRPORT' : 'TO_AIRPORT',
      pickupTime,
      paxAdults: Math.max(1, Number(passengers.adults) || 1),
      paxChildren: Math.max(0, Number(passengers.children) || 0),
      luggage: Math.max(0, Number(passengers.luggage) || 1),
      currency: requestedCurrency,
      currencyExplicit: true
    }
    const result = await (await this.request('/api/public/search-transfers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-search-token': token },
      body: JSON.stringify(payload)
    })).json()
    const quotes = parseOptions(result).filter((quote) => quote.currency === requestedCurrency)
    if (!quotes.length) {
      const error = new Error(result.noResultsReason || 'Airport Transfer Portal returned no available vehicles')
      error.code = 'NO_QUOTES'
      throw error
    }
    const sourceUrl = new URL('/search', this.baseUrl)
    Object.entries(payload).forEach(([key, value]) => sourceUrl.searchParams.set(key, String(value)))
    return {
      quotes,
      evidence: {
        sourceUrl: sourceUrl.toString(),
        endpoint: '/api/public/search-transfers',
        publicSearchOnly: true,
        bookingCreated: false,
        airport: airport.label,
        zone: match.zone.name,
        zoneId: match.zone.id,
        direction: payload.direction,
        serviceAt: date.toISOString(),
        quoteCount: quotes.length
      }
    }
  }
}

module.exports = {
  AIRPORT_TRANSFER_PORTAL_DEFAULTS,
  AirportTransferPortalAdapter,
  decodePlace,
  encodePlace,
  extractIata,
  parseOptions,
  vehicleKey
}
