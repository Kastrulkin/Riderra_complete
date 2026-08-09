const HEYCARS_DEFAULTS = Object.freeze({
  name: 'Heycars',
  adapterKey: 'heycars',
  baseUrl: 'https://www.heycars.travel',
  supportedCurrencies: ['EUR'],
  schedule: { weekday: 3, localTime: '12:00', minLeadDays: 7 },
  passengers: { adults: 1, children: 0, returnJourney: false },
  pricingPolicy: { type: 'client_commission', commissionPercent: 30 },
  formulaVersion: 'heycars-v1',
  maxConcurrency: 2,
  requestDelayMs: 1000
})

const USER_AGENT = 'Mozilla/5.0 (compatible; Riderra public price research/1.0)'

function normalizeKey(value) {
  return String(value || '').toLowerCase().normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
}

function meaningfulTokens(value) {
  const ignored = new Set(['airport', 'international', 'city', 'centre', 'center', 'downtown', 'hotel', 'station', 'terminal', 'port', 'the', 'of'])
  return normalizeKey(value).split(' ').filter((token) => token && !ignored.has(token) && !/^[a-z]{3}$/.test(token))
}

function candidateMatches(inputText, candidate, country = '') {
  const haystack = normalizeKey(`${candidate?.display || ''} ${candidate?.value || ''} ${candidate?.name || ''}`)
  if (!haystack) return false
  if (country && !haystack.includes(normalizeKey(country))) return false
  const iata = String(inputText || '').match(/\(([A-Z]{3})\)/)?.[1]
    || String(inputText || '').match(/\b([A-Z]{3})\b/)?.[1]
  if (iata) return candidate?.type === 'AIRPORT' && String(candidate?.value || '').toUpperCase() === iata
  const inputTokens = meaningfulTokens(inputText)
  const candidateTokens = new Set(meaningfulTokens(haystack))
  return inputTokens.length > 0 && inputTokens.filter((token) => candidateTokens.has(token)).length / inputTokens.length >= 0.75
}

function encodePlace(place) {
  return `heycars:${Buffer.from(JSON.stringify(place)).toString('base64url')}`
}

function decodePlace(value) {
  const encoded = String(value || '').match(/^heycars:(.+)$/)?.[1]
  if (!encoded) return null
  try {
    const place = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'))
    if (!place?.addressName || !place?.type || (!place?.placeId && (!Number.isFinite(Number(place?.latitude)) || !Number.isFinite(Number(place?.longitude))))) return null
    return place
  } catch (_) { return null }
}

function toPlace(candidate) {
  const airport = candidate?.type === 'AIRPORT'
  return {
    ...(airport && candidate?.value ? { airportCode: String(candidate.value).toUpperCase() } : {}),
    addressName: candidate?.display || candidate?.value || candidate?.name || '',
    ...(candidate?.lat != null ? { latitude: candidate.lat } : {}),
    ...(candidate?.lng != null ? { longitude: candidate.lng } : {}),
    ...(candidate?.placeId ? { placeId: candidate.placeId } : {}),
    type: airport ? 'AIRPORT' : 'PLACE'
  }
}

function formatServiceAt(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) throw new Error('Heycars service date is invalid')
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}T${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}:00`
}

function vehicleKey(vehicle = {}) {
  const category = normalizeKey(vehicle.vehicleCategory || vehicle.vehicleName || 'vehicle').replace(/\s+/g, '_')
  const capacity = Number(vehicle.maxPassengerCount) || 0
  const name = normalizeKey(vehicle.vehicleName)
  if (category === 'economy' && capacity >= 4) return `economy_minivan_${capacity}`
  if (category === 'comfort') return `comfort_${capacity}`
  if (category === 'premium') return `premium_${capacity}`
  if (category === 'economy') return `economy_${capacity}`
  if (/van|minivan|people/.test(name)) return `${category}_minivan_${capacity}`
  return `${category}_${capacity}`
}

function normalizeQuotes(payload) {
  const byVehicle = new Map()
  for (const row of Array.isArray(payload?.data) ? payload.data : []) {
    const vehicle = row?.vehicle || {}
    const price = Number(row?.price)
    const currency = String(row?.currencyName || '').toUpperCase()
    if (!Number.isFinite(price) || price <= 0 || !currency || !vehicle.vehicleName) continue
    const maxPassengers = Number(vehicle.maxPassengerCount) || null
    const quote = {
      externalVehicleKey: vehicleKey(vehicle),
      externalVehicleName: String(vehicle.vehicleName),
      maxPassengers,
      price: Math.round((price + Number.EPSILON) * 100) / 100,
      currency,
      vehicleId: vehicle.vehicleId || null,
      vehicleCategory: vehicle.vehicleCategory || null,
      brandName: vehicle.brandName || null,
      maxLuggageCount: Number(vehicle.maxLuggageCount) || null
    }
    const existing = byVehicle.get(quote.externalVehicleKey)
    if (!existing || quote.price < existing.price) byVehicle.set(quote.externalVehicleKey, quote)
  }
  return Array.from(byVehicle.values())
}

class HeyCarsAdapter {
  constructor(config = {}, dependencies = {}) {
    this.baseUrl = String(config.baseUrl || HEYCARS_DEFAULTS.baseUrl).replace(/\/+$/, '')
    this.supportedCurrencies = config.supportedCurrencies || HEYCARS_DEFAULTS.supportedCurrencies
    this.fetchImpl = dependencies.fetchImpl || global.fetch
    this.minRequestIntervalMs = Math.max(0, Number(config.requestDelayMs ?? HEYCARS_DEFAULTS.requestDelayMs))
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

  async request(path, body) {
    let lastError
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      await this.waitForRateSlot()
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 30000)
      try {
        const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Language: 'en',
            Source: '',
            Referer: `${this.baseUrl}/`,
            'User-Agent': USER_AGENT
          },
          body: JSON.stringify(body),
          signal: controller.signal
        })
        if (!response.ok) {
          const error = new Error(`Heycars public source failed: HTTP ${response.status}`)
          error.status = response.status
          throw error
        }
        return response.json()
      } catch (error) {
        lastError = error
        if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, [429, 503].includes(Number(error.status)) ? 5000 * attempt : 800 * (2 ** (attempt - 1))))
      } finally { clearTimeout(timer) }
    }
    throw lastError
  }

  async resolvePlace(inputText, relatedPlaceId, context = {}) {
    const query = String(inputText || '').trim()
    if (!query) return []
    const related = decodePlace(relatedPlaceId)
    const payload = await this.request('/api/rest/common/place/autocomplete', {
      input: query,
      language: 'en',
      lat: related?.latitude ?? '',
      lng: related?.longitude ?? '',
      ...(related?.placeId ? { placeId: related.placeId } : {})
    })
    if (!payload?.success || !Array.isArray(payload.data)) return []
    let candidates = payload.data.filter((row) => candidateMatches(query, row, context.country)).slice(0, 8)
    const iata = query.match(/\(([A-Z]{3})\)/)?.[1] || query.match(/\b([A-Z]{3})\b/)?.[1]
    const exactIata = candidates.filter((row) => iata && row.type === 'AIRPORT' && String(row.value).toUpperCase() === iata)
    if (exactIata.length === 1) candidates = exactIata
    return candidates.map((row) => {
      const place = toPlace(row)
      return { id: encodePlace(place), label: place.addressName, description: place.addressName, type: place.type === 'AIRPORT' ? 'airport' : 'address' }
    })
  }

  createBenchmarkPlace(point) {
    if (!Number.isFinite(Number(point?.latitude)) || !Number.isFinite(Number(point?.longitude))) return null
    const label = point.geocodedAddress || point.destinationAddress || point.pickupAddress || point.zoneName
    if (!label) return null
    const airport = Boolean(point.airportIata || /\bairport\b/i.test(`${point.zoneName || ''} ${label}`))
    const place = {
      ...(point.airportIata ? { airportCode: String(point.airportIata).toUpperCase() } : {}),
      addressName: label,
      latitude: Number(point.latitude),
      longitude: Number(point.longitude),
      ...(point.googlePlaceId ? { placeId: point.googlePlaceId } : {}),
      type: airport ? 'AIRPORT' : 'PLACE'
    }
    return { id: encodePlace(place), label, description: label, type: airport ? 'airport' : 'address' }
  }

  placeIdIsValid(value) { return Boolean(decodePlace(value)) }
  normalizeVehicle(raw) { return raw }

  extractEvidence({ pickup, dropoff, serviceAt, quotes }) {
    return {
      sourceUrl: `${this.baseUrl}/`,
      endpoint: '/api/rest/transfer/quote',
      publicSearchOnly: true,
      bookingCreated: false,
      pickup: pickup.label,
      dropoff: dropoff.label,
      serviceAt: formatServiceAt(serviceAt),
      quoteCount: quotes.length
    }
  }

  async fetchQuotes({ pickup, dropoff, serviceAt, currency, passengers = {} }) {
    const requestedCurrency = String(currency || '').toUpperCase()
    if (!this.supportedCurrencies.includes(requestedCurrency)) throw new Error(`Heycars does not support currency ${requestedCurrency}`)
    const departAddress = decodePlace(pickup.id)
    const arrivalAddress = decodePlace(dropoff.id)
    if (!departAddress || !arrivalAddress) throw new Error('Heycars place mapping is invalid')
    const payload = await this.request('/api/rest/transfer/quote', {
      language: 'en',
      currencyName: requestedCurrency,
      journeyType: 'ONE_WAY',
      passengerInfo: { passengerCount: Math.max(1, Number(passengers.adults || 1)) },
      departTime: formatServiceAt(serviceAt),
      departAddress,
      arrivalAddress
    })
    const quotes = normalizeQuotes(payload).filter((quote) => quote.currency === requestedCurrency)
    if (!payload?.success || !quotes.length) {
      const error = new Error(`Heycars returned no available vehicles${payload?.code ? ` (code ${payload.code})` : ''}`)
      error.code = 'NO_QUOTES'
      throw error
    }
    return { quotes, evidence: this.extractEvidence({ pickup, dropoff, serviceAt, quotes }) }
  }
}

module.exports = {
  HEYCARS_DEFAULTS,
  HeyCarsAdapter,
  candidateMatches,
  decodePlace,
  encodePlace,
  formatServiceAt,
  normalizeQuotes,
  vehicleKey
}
