const GLOBAL_AIRPORT_TAXI_DEFAULTS = Object.freeze({
  name: 'Global Airport Taxi',
  adapterKey: 'global-airport-taxi',
  baseUrl: 'https://globalairporttaxi.com',
  supportedCurrencies: ['EUR', 'GBP', 'USD', 'AED'],
  schedule: { weekday: 3, localTime: '12:00', minLeadDays: 7 },
  passengers: { adults: 1, children: 0, luggage: 1, returnJourney: false },
  pricingPolicy: { type: 'client_commission', commissionPercent: 30 },
  formulaVersion: 'global-airport-taxi-v1',
  maxConcurrency: 1,
  requestDelayMs: 3000
})

const SEARCH_HOST = 'https://globalqss.qmhtech.com'
const USER_AGENT = 'Mozilla/5.0 (compatible; Riderra public price research/1.0)'

function decodeHtml(value) {
  return String(value || '')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&pound;|&#163;/gi, '£')
    .replace(/&euro;|&#8364;/gi, '€')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&apos;/gi, "'")
}

function stripHtml(value) { return decodeHtml(String(value || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim() }

function normalizeKey(value) {
  return stripHtml(value).toLowerCase().normalize('NFKD')
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
  if (!place.label) return null
  return `global-airport-taxi:${Buffer.from(JSON.stringify(place)).toString('base64url')}`
}

function decodePlace(value) {
  const encoded = String(value || '').match(/^global-airport-taxi:(.+)$/)?.[1]
  if (!encoded) return null
  try {
    const place = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'))
    return place?.label ? place : null
  } catch (_) {
    return null
  }
}

function candidateMatches(inputText, candidate = {}) {
  const iata = extractIata(inputText)
  if (iata && new RegExp(`\\(${iata}\\)|\\b${iata}\\b`, 'i').test(candidate.address || '')) return true
  const input = normalizeKey(inputText)
  const text = normalizeKey(candidate.address)
  if (!input || !text) return false
  if (text.includes(input) || input.includes(text)) return true
  const stopwords = new Set(['airport', 'international', 'city', 'centre', 'center', 'downtown', 'hotel', 'station', 'terminal', 'the', 'of'])
  const tokens = input.split(' ').filter((token) => token && !stopwords.has(token))
  const candidateTokens = new Set(text.split(' ').filter(Boolean))
  return tokens.length > 0 && tokens.filter((token) => candidateTokens.has(token)).length / tokens.length >= 0.6
}

function vehicleKey(name, capacity) {
  const normalized = normalizeKey(name)
  if (/executive mpv|executive van|business van|v class/.test(normalized)) return `businessvan_${capacity || 7}`
  if (/executive|business|e class/.test(normalized)) return 'business_car'
  if (/mpv|people carrier|minivan|van/.test(normalized)) return `standard_minivan_${capacity || 0}`
  if (/minibus|bus|coach/.test(normalized)) return `standard_minibus_${capacity || 0}`
  if (/suv/.test(normalized)) return `standard_suv_${capacity || 0}`
  if (/saloon|sedan|standard|economy/.test(normalized)) return 'standard_car'
  return `${normalized.replace(/\s+/g, '_') || 'vehicle'}_${capacity || 0}`
}

function parseGlobalAirportTaxiQuotes(html) {
  const quotes = []
  const cards = String(html || '').split(/<div class="pjTbs-car pjTbs-box"/i).slice(1)
  for (const card of cards) {
    const name = stripHtml(card.match(/class="pjTbs-car-title"[^>]*>([\s\S]*?)<\/div>/i)?.[1])
    const price = Number(card.match(/itemprop="price"\s*content="([0-9.,]+)"/i)?.[1]?.replace(',', '.'))
    const currency = String(card.match(/itemprop="priceCurrency"\s*content="([A-Z]{3})"/i)?.[1] || '').toUpperCase()
    const passengerText = stripHtml(card.match(/pjTbs-car-meta[\s\S]{0,1000}?(?:Passenger|Passengers)[\s\S]{0,120}?(\d+)/i)?.[1])
    const capacity = Number(passengerText) || null
    if (!name || !Number.isFinite(price) || price < 0 || !currency) continue
    quotes.push({ externalVehicleKey: vehicleKey(name, capacity), externalVehicleName: name, maxPassengers: capacity, price, currency })
  }
  return quotes
}

function serviceDate(value) {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) throw new Error('Global Airport Taxi service date is invalid')
  return `${String(date.getUTCDate()).padStart(2, '0')}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${date.getUTCFullYear()}`
}

function slug(value) {
  return normalizeKey(value).replace(/\s+/g, '-').slice(0, 180)
}

class GlobalAirportTaxiAdapter {
  constructor(config = {}, dependencies = {}) {
    this.baseUrl = String(config.baseUrl || GLOBAL_AIRPORT_TAXI_DEFAULTS.baseUrl).replace(/\/+$/, '')
    this.supportedCurrencies = config.supportedCurrencies || GLOBAL_AIRPORT_TAXI_DEFAULTS.supportedCurrencies
    this.fetchImpl = dependencies.fetchImpl || global.fetch
    this.minRequestIntervalMs = Math.max(0, Number(config.requestDelayMs ?? GLOBAL_AIRPORT_TAXI_DEFAULTS.requestDelayMs))
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
    await this.waitForRateSlot()
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 40000)
    try {
      const response = await this.fetchImpl(url, {
        redirect: 'follow',
        ...options,
        headers: { Accept: '*/*', 'Accept-Language': 'en-US,en;q=0.8', 'User-Agent': USER_AGENT, ...(options.headers || {}) },
        signal: controller.signal
      })
      if (!response.ok) {
        const error = new Error(`Global Airport Taxi public source failed: HTTP ${response.status}`)
        error.status = response.status
        throw error
      }
      return response
    } finally { clearTimeout(timer) }
  }

  async resolvePlace(inputText) {
    const label = String(inputText || '').trim()
    if (!label) return []
    return [{ id: encodePlace({ label }), label, description: label, type: /airport|\b[A-Z]{3}\b/.test(label) ? 'airport' : 'address' }]
  }

  createBenchmarkPlace(point = {}) {
    const zoneLooksLikeAirport = /\bairport\b|\([A-Z]{3}\)|\b[A-Z]{3}\b/.test(String(point.zoneName || ''))
    const label = zoneLooksLikeAirport
      ? (point.pickupAddress || point.geocodedAddress || point.destinationAddress || point.zoneName)
      : (point.destinationAddress || point.geocodedAddress || point.pickupAddress || point.zoneName)
    return label ? { id: encodePlace({ label }), label, description: label, type: zoneLooksLikeAirport ? 'airport' : 'address' } : null
  }

  placeIdIsValid(value) { return Boolean(decodePlace(value)) }
  normalizeVehicle(raw) { return raw }

  async startSession() {
    const response = await this.request(`${this.baseUrl}/`)
    const html = await response.text()
    const sessionId = html.match(/session_id=([a-z0-9]+)/i)?.[1]
      || response.headers.get('set-cookie')?.match(/PHPSESSID=([^;,]+)/i)?.[1]
    if (!sessionId) throw new Error('Global Airport Taxi public search session is missing')
    return sessionId
  }

  async searchAddress(query, target, sessionId, regionCode = '') {
    const safeQuery = String(query || '').replace(/["()]/g, ' ').replace(/\s+/g, ' ').trim()
    const url = new URL('/index.php', SEARCH_HOST)
    url.searchParams.set('controller', 'pjFrontPublic')
    url.searchParams.set('action', 'pjActionGetInternalLocations')
    url.searchParams.set('q', safeQuery)
    url.searchParams.set('t', target)
    if (target === 'return_address') {
      url.searchParams.set('pa', 'pickup_address_postcode')
      if (regionCode) url.searchParams.set('r', regionCode)
    }
    url.searchParams.set('session_id', sessionId)
    const response = await this.request(url, {
      headers: {
        Cookie: `PHPSESSID=${sessionId}`,
        Origin: this.baseUrl,
        Referer: `${this.baseUrl}/`,
        'X-Requested-With': 'XMLHttpRequest'
      }
    })
    const payload = await response.json()
    const rows = Array.isArray(payload.addresses) ? payload.addresses : []
    return rows.filter((row) => candidateMatches(query, row))
  }

  async fetchQuotes({ pickup, dropoff, serviceAt, currency, passengers = {} }) {
    const requestedCurrency = String(currency || '').toUpperCase()
    const from = decodePlace(pickup.id)
    const to = decodePlace(dropoff.id)
    if (!from || !to) throw new Error('Global Airport Taxi place mapping is invalid')
    const sessionId = await this.startSession()
    let fromRows = await this.searchAddress(from.label, 'pickup_address', sessionId)
    if (!fromRows.length && extractIata(from.label)) fromRows = await this.searchAddress(extractIata(from.label), 'pickup_address', sessionId)
    const selectedFrom = fromRows[0]
    if (!selectedFrom) {
      const error = new Error(`Global Airport Taxi does not list pickup: ${from.label}`)
      error.code = 'NO_QUOTES'
      throw error
    }
    let toRows = await this.searchAddress(to.label, 'return_address', sessionId, selectedFrom.region_code)
    if (!toRows.length) toRows = await this.searchAddress(String(to.label).split(',')[0], 'return_address', sessionId, selectedFrom.region_code)
    const selectedTo = toRows.find((row) => row.region_code === selectedFrom.region_code) || toRows[0]
    if (!selectedTo || selectedTo.region_code !== selectedFrom.region_code) {
      const error = new Error(`Global Airport Taxi does not list same-country drop-off: ${to.label}`)
      error.code = 'NO_QUOTES'
      throw error
    }
    const date = serviceDate(serviceAt)
    const passengerCount = Math.max(1, Number(passengers.adults || 1) + Number(passengers.children || 0))
    const form = new URLSearchParams({
      _search: '1',
      pickup_address_postcode: selectedFrom.region_code === 'UK' ? selectedFrom.postcode : selectedFrom.address,
      return_address_postcode: selectedTo.region_code === 'UK' ? selectedTo.postcode : selectedTo.address,
      region_code: selectedFrom.region_code,
      nextStage: 'getFleets',
      sitecode: 'globalairporttaxi.com',
      paymentcode: 'qmh',
      route: 'airport-taxi',
      'trip-type': '0',
      pickup_address: selectedFrom.address,
      return_address: selectedTo.address,
      booking_date_one_way: date,
      hour_one_way: '12:00',
      passengers: String(passengerCount),
      suitcase: String(Math.max(1, Number(passengers.luggage) || 1)),
      luggage: '1'
    })
    const resultUrl = `${this.baseUrl}/airport-taxi/from-${slug(selectedFrom.address)}-to-${slug(selectedTo.address)}`
    const html = await (await this.request(resultUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8', Cookie: `PHPSESSID=${sessionId}`, Referer: `${this.baseUrl}/` },
      body: form
    })).text()
    const allQuotes = parseGlobalAirportTaxiQuotes(html)
    const quotes = allQuotes.filter((quote) => quote.currency === requestedCurrency)
    if (!quotes.length) {
      const error = new Error(allQuotes.length ? `Global Airport Taxi returned ${allQuotes[0].currency} prices, Riderra route is ${requestedCurrency}` : 'Global Airport Taxi returned no available vehicles')
      error.code = allQuotes.length ? 'CURRENCY_MISMATCH' : 'NO_QUOTES'
      throw error
    }
    return {
      quotes,
      evidence: {
        sourceUrl: resultUrl,
        endpoint: 'public QSS search form',
        publicSearchOnly: true,
        bookingCreated: false,
        pickup: selectedFrom.address,
        dropoff: selectedTo.address,
        serviceAt: new Date(serviceAt).toISOString(),
        passengerCount,
        quoteCount: quotes.length
      }
    }
  }
}

module.exports = {
  GLOBAL_AIRPORT_TAXI_DEFAULTS,
  GlobalAirportTaxiAdapter,
  candidateMatches,
  decodePlace,
  encodePlace,
  parseGlobalAirportTaxiQuotes,
  serviceDate,
  vehicleKey
}
