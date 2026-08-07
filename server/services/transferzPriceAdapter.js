const TRANSFERZ_DEFAULTS = Object.freeze({
  name: 'Transferz',
  adapterKey: 'transferz',
  baseUrl: 'https://www.taxi2airport.com',
  supportedCurrencies: ['EUR', 'USD', 'CAD'],
  schedule: { weekday: 3, localTime: '12:00', minLeadDays: 7 },
  passengers: { adults: 1, children: 0, returnJourney: false },
  pricingPolicy: { type: 'client_commission', commissionPercent: 30 },
  formulaVersion: 'transferz-v1',
  maxConcurrency: 2,
  requestDelayMs: 650
})

const BOOKING_BASE_URL = 'https://booking.taxi2airport.com'
const PARTNER_ID = 18
const USER_AGENT = 'Mozilla/5.0 (compatible; Riderra public price research/1.0)'

function normalizeKey(value) {
  return String(value || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
}

function encodePlace(row) {
  const payload = {
    type: row.type || 'ADDRESS',
    hubId: Number.isFinite(Number(row.hubId)) ? Number(row.hubId) : null,
    googlePlaceId: row.googlePlaceId || null,
    formattedAddress: row.formattedAddress || row.title || ''
  }
  return `transferz:${Buffer.from(JSON.stringify(payload)).toString('base64url')}`
}

function decodePlace(value) {
  const encoded = String(value || '').match(/^transferz:(.+)$/)?.[1]
  if (!encoded) return null
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'))
    if (!parsed?.formattedAddress) return null
    return parsed
  } catch (_) {
    return null
  }
}

function candidateMatches(inputText, row) {
  const input = normalizeKey(inputText)
  const title = normalizeKey(row.title)
  const formatted = normalizeKey(row.formattedAddress)
  if (!input || (!title && !formatted)) return false
  const iata = String(inputText || '').match(/\(([A-Z]{3})\)/)?.[1]
    || String(inputText || '').match(/\b([A-Z]{3})\b/)?.[1]
  if (iata && row.type === 'AIRPORT' && new RegExp(`\\b${iata}\\b`, 'i').test(`${row.title} ${row.formattedAddress}`)) return true
  if (input === title || input === formatted || title.startsWith(`${input} `)) return true
  const stopwords = new Set(['airport', 'international', 'city', 'centre', 'center', 'downtown', 'hotel', 'station', 'terminal', 'port', 'the', 'of'])
  const tokens = input.split(' ').filter((token) => token && !stopwords.has(token) && token !== iata?.toLowerCase())
  const candidateTokens = new Set(`${title} ${formatted}`.split(' ').filter(Boolean))
  return tokens.length > 1 && tokens.filter((token) => candidateTokens.has(token)).length / tokens.length >= 0.8
}

function vehicleKey(category, capacity) {
  const normalized = String(category || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
  return `${normalized}_${Number(capacity) || 0}`
}

function formatLocalDateTime(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) throw new Error('Transferz service date is invalid')
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}T${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}:00`
}

function normalizeQuotes(rows) {
  return (Array.isArray(rows) ? rows : []).map((row) => ({
    externalVehicleKey: vehicleKey(row.vehicleCategory, row.passengerCapacity),
    externalVehicleName: String(row.vehicleCategory || 'Vehicle').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()),
    maxPassengers: Number.isFinite(Number(row.passengerCapacity)) ? Number(row.passengerCapacity) : null,
    price: Math.round((Number(row.price) + Number.EPSILON) * 100) / 100,
    currency: String(row.currencyCode || '').toUpperCase(),
    vehicleModels: row.vehicleModels || null,
    requestId: row.requestId || null
  })).filter((row) => Number.isFinite(row.price) && row.price >= 0 && row.currency)
}

class TransferzAdapter {
  constructor(config = {}, dependencies = {}) {
    this.baseUrl = String(config.baseUrl || TRANSFERZ_DEFAULTS.baseUrl).replace(/\/+$/, '')
    this.bookingBaseUrl = String(config.bookingBaseUrl || BOOKING_BASE_URL).replace(/\/+$/, '')
    this.partnerId = Number(config.partnerId) || PARTNER_ID
    this.supportedCurrencies = config.supportedCurrencies || TRANSFERZ_DEFAULTS.supportedCurrencies
    this.fetchImpl = dependencies.fetchImpl || global.fetch
  }

  async request(url, options = {}) {
    let lastError
    for (let attempt = 1; attempt <= 3; attempt++) {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 25000)
      try {
        const response = await this.fetchImpl(url, {
          ...options,
          headers: {
            Accept: 'application/json',
            'Accept-Language': 'en-US,en;q=0.8',
            Origin: this.bookingBaseUrl,
            Referer: `${this.bookingBaseUrl}/`,
            'User-Agent': USER_AGENT,
            ...(options.headers || {})
          },
          signal: controller.signal
        })
        if (!response.ok) throw new Error(`Transferz public source failed: HTTP ${response.status}`)
        return response
      } catch (error) {
        lastError = error
        if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 700 * (2 ** (attempt - 1))))
      } finally {
        clearTimeout(timer)
      }
    }
    throw lastError
  }

  async resolvePlace(inputText) {
    const query = String(inputText || '').trim()
    if (!query) return []
    const url = new URL('/api/widget/autocomplete', this.baseUrl)
    url.searchParams.set('text', query)
    url.searchParams.set('language', 'en-US')
    url.searchParams.set('size', '20')
    url.searchParams.set('mode', 'FULL')
    const response = await this.request(url)
    const payload = await response.json()
    const candidates = (Array.isArray(payload) ? payload : []).filter((row) => candidateMatches(query, row))
    const iata = query.match(/\(([A-Z]{3})\)/)?.[1] || query.match(/\b([A-Z]{3})\b/)?.[1]
    const exactHubs = candidates.filter((row) => row.hubId && (
      (iata && new RegExp(`\\b${iata}\\b`, 'i').test(`${row.title} ${row.formattedAddress}`))
      || (/\b(?:port|station)\b/i.test(query) && normalizeKey(row.title) === normalizeKey(query))
    ))
    const uniqueExactHubs = Array.from(new Map(exactHubs.map((row) => [String(row.hubId), row])).values())
    const selectedRows = uniqueExactHubs.length === 1 ? uniqueExactHubs : candidates
    return selectedRows.map((row) => ({
      id: encodePlace(row),
      label: row.title || row.formattedAddress,
      description: row.formattedAddress || row.subtitle || row.title,
      type: row.type,
      hubId: row.hubId || null
    }))
  }

  normalizeVehicle(raw) { return raw }

  extractEvidence({ pickup, dropoff, quotes }) {
    return {
      sourceUrl: `${this.bookingBaseUrl}/booking/vehicle-selection`,
      publicSearchOnly: true,
      bookingCreated: false,
      partnerId: this.partnerId,
      pickup: pickup.label,
      dropoff: dropoff.label,
      quoteCount: quotes.length,
      requestIds: Array.from(new Set(quotes.map((quote) => quote.requestId).filter(Boolean)))
    }
  }

  async fetchQuotes({ pickup, dropoff, serviceAt, currency, passengers = {} }) {
    const normalizedCurrency = String(currency || '').toUpperCase()
    if (!this.supportedCurrencies.includes(normalizedCurrency)) throw new Error(`Transferz does not support currency ${normalizedCurrency}`)
    const pickupPlace = decodePlace(pickup.id)
    const dropoffPlace = decodePlace(dropoff.id)
    if (!pickupPlace || !dropoffPlace) throw new Error('Transferz place mapping is invalid')
    const pickupIsHub = pickupPlace.hubId !== null && Number.isFinite(Number(pickupPlace.hubId))
    const dropoffIsHub = dropoffPlace.hubId !== null && Number.isFinite(Number(dropoffPlace.hubId))
    if (pickupIsHub === dropoffIsHub) {
      const error = new Error('Transferz requires exactly one airport, station, or seaport in a public quote request')
      error.code = 'CATALOG_ROUTE_NOT_LISTED'
      throw error
    }
    const serviceDateTime = formatLocalDateTime(serviceAt)
    const directionality = pickupIsHub ? 'OUTBOUND' : 'INBOUND'
    const hub = pickupIsHub ? pickupPlace : dropoffPlace
    const destination = pickupIsHub ? dropoffPlace : pickupPlace
    const query = `query Quotes($params: RetrieveQuotesParams!) {
      quotes(params: $params) {
        vehicleCategory passengerCapacity luggageCapacity price currencyCode vehicleModels requestId
      }
    }`
    const params = {
      partnerId: this.partnerId,
      hub: Number(hub.hubId),
      directionality,
      destination: destination.formattedAddress,
      isRoundTrip: false,
      adultPassengerCount: Math.max(1, Number(passengers.adults || 1)),
      childPassengerCount: Math.max(0, Number(passengers.children || 0)),
      luggage: 1,
      inboundPickup: directionality === 'INBOUND' ? serviceDateTime : '',
      outboundPickup: directionality === 'OUTBOUND' ? serviceDateTime : '',
      preferredCurrencyCode: normalizedCurrency
    }
    const response = await this.request(`${this.bookingBaseUrl}/graphql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operationName: 'Quotes', variables: { params }, query })
    })
    const payload = await response.json()
    if (payload?.errors?.length) throw new Error(`Transferz quote search failed: ${payload.errors[0].message || 'GraphQL error'}`)
    const quotes = normalizeQuotes(payload?.data?.quotes)
    if (!quotes.length) {
      const error = new Error('Transferz returned no available vehicles')
      error.code = 'NO_QUOTES'
      throw error
    }
    return { quotes, evidence: this.extractEvidence({ pickup, dropoff, quotes }) }
  }
}

module.exports = {
  TRANSFERZ_DEFAULTS,
  TransferzAdapter,
  candidateMatches,
  decodePlace,
  encodePlace,
  formatLocalDateTime,
  normalizeQuotes,
  vehicleKey
}
