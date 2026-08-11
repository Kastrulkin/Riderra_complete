const crypto = require('crypto')

const KIWITAXI_DEFAULTS = Object.freeze({
  name: 'Kiwitaxi',
  adapterKey: 'kiwitaxi',
  baseUrl: 'https://kiwitaxi.com',
  supportedCurrencies: ['EUR'],
  schedule: { weekday: 3, localTime: '12:00', minLeadDays: 7 },
  passengers: { adults: 1, children: 0, returnJourney: false },
  pricingPolicy: { type: 'competitor_public_price' },
  formulaVersion: 'kiwitaxi-competitor-v1',
  maxConcurrency: 1,
  requestDelayMs: 2000
})

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36'

function decodeHtml(value) {
  return String(value || '')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&euro;|&#8364;/gi, '€')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&apos;/gi, "'")
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
}

function stripHtml(value) {
  return decodeHtml(String(value || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
}

function normalizeKey(value) {
  return stripHtml(value).toLowerCase().normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function encodePlace(row = {}) {
  const place = {
    id: String(row.id || '').trim(),
    type: String(row.type || 'address').trim(),
    title: String(row.title || row.label || '').trim(),
    address: String(row.address || row.description || row.title || row.label || '').trim()
  }
  if (!place.id || !place.title) return null
  return `kiwitaxi:${Buffer.from(JSON.stringify(place)).toString('base64url')}`
}

function decodePlace(value) {
  const encoded = String(value || '').match(/^kiwitaxi:(.+)$/)?.[1]
  if (!encoded) return null
  try {
    const place = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'))
    return place?.id && place?.title ? place : null
  } catch (_) {
    return null
  }
}

function candidateMatches(inputText, candidate = {}) {
  const input = normalizeKey(inputText)
  const text = normalizeKey(`${candidate.title || ''} ${candidate.address || ''}`)
  if (!input || !text) return false
  const iata = String(inputText || '').match(/\(([A-Z]{3})\)/)?.[1]
    || String(inputText || '').match(/\b([A-Z]{3})\b/)?.[1]
  if (iata && new RegExp(`\\b${iata}\\b`, 'i').test(`${candidate.title || ''} ${candidate.address || ''}`)) return true
  if (text.includes(input) || input.includes(normalizeKey(candidate.title))) return true
  const stopwords = new Set(['airport', 'international', 'city', 'centre', 'center', 'downtown', 'hotel', 'station', 'terminal', 'port', 'the', 'of'])
  const tokens = input.split(' ').filter((token) => token && !stopwords.has(token) && token !== iata?.toLowerCase())
  const candidateTokens = new Set(text.split(' ').filter(Boolean))
  return tokens.length > 0 && tokens.filter((token) => candidateTokens.has(token)).length / tokens.length >= 0.75
}

function vehicleKey(name, capacity) {
  const normalized = normalizeKey(name).replace(/\s+/g, '_')
  if (['micro', 'economy'].includes(normalized)) return 'standard_car'
  if (normalized === 'comfort') return 'comfort_car'
  if (normalized === 'business') return 'business_car'
  if (normalized === 'premium') return 'first_class_car'
  if (normalized === 'minivan_4pax') return 'standard_mpv_4'
  if (normalized === 'premium_minibus') return `businessvan_${capacity || 6}`
  if (normalized === 'minibus_7pax') return 'standard_minivan_7'
  if (/^minibus_(10|13|16|19)pax$/.test(normalized)) return `standard_minibus_${capacity}`
  if (normalized === 'suv') return `standard_suv_${capacity || 4}`
  if (normalized === 'luxury_suv') return `first_class_suv_${capacity || 3}`
  return `${normalized || 'vehicle'}_${capacity || 0}`
}

function parsePrice(value) {
  const number = Number(String(value || '').replace(/[^0-9.,-]/g, '').replace(/,/g, ''))
  return Number.isFinite(number) && number >= 0 ? Math.round((number + Number.EPSILON) * 100) / 100 : null
}

function parseKiwitaxiQuotes(html, currency = 'EUR') {
  const rows = []
  const seen = new Map()
  const cards = String(html || '').match(/<form class="car-class-card[\s\S]*?<\/form>/gi) || []
  for (const card of cards) {
    const name = stripHtml(card.match(/class="car-class-name"[^>]*>([\s\S]*?)<\/p>/i)?.[1])
    const capacity = Number(stripHtml(card.match(/class="car-class-pax"[^>]*>([\s\S]*?)<\/p>/i)?.[1]))
    const rawPrice = stripHtml(card.match(/class="car-class-select-button desktop[^>]*>([\s\S]*?)<\/button>/i)?.[1])
    const price = parsePrice(rawPrice)
    const symbolCurrency = rawPrice.includes('€') ? 'EUR' : rawPrice.includes('$') ? 'USD' : null
    if (!name || price === null || !Number.isFinite(capacity) || symbolCurrency !== currency) continue
    const quote = {
      externalVehicleKey: vehicleKey(name, capacity),
      externalVehicleName: name,
      maxPassengers: capacity,
      price,
      currency
    }
    const existing = seen.get(quote.externalVehicleKey)
    if (existing === undefined) {
      seen.set(quote.externalVehicleKey, rows.length)
      rows.push(quote)
    } else if (quote.price < rows[existing].price) {
      rows[existing] = quote
    }
  }
  return rows
}

class KiwitaxiAdapter {
  constructor(config = {}, dependencies = {}) {
    this.baseUrl = String(config.baseUrl || KIWITAXI_DEFAULTS.baseUrl).replace(/\/+$/, '')
    this.supportedCurrencies = config.supportedCurrencies || KIWITAXI_DEFAULTS.supportedCurrencies
    this.fetchImpl = dependencies.fetchImpl || global.fetch
    this.minRequestIntervalMs = Math.max(0, Number(config.requestDelayMs ?? KIWITAXI_DEFAULTS.requestDelayMs))
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

  async request(url, { accept = 'application/json', currency = 'EUR' } = {}) {
    let lastError
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      await this.waitForRateSlot()
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 30000)
      try {
        const response = await this.fetchImpl(url, {
          method: 'GET',
          redirect: 'follow',
          headers: {
            Accept: accept,
            'Accept-Language': 'en-US,en;q=0.8',
            Cookie: `userCurrencyCode=${currency}`,
            Referer: `${this.baseUrl}/`,
            'User-Agent': USER_AGENT
          },
          signal: controller.signal
        })
        if (!response.ok) {
          const error = new Error(`Kiwitaxi public source failed: HTTP ${response.status}`)
          error.status = response.status
          throw error
        }
        return response
      } catch (error) {
        lastError = error
        if (Number(error.status) === 404) break
        if (attempt < 3) {
          const retryDelayMs = Number(error.status) === 429 ? 60000 : 800 * (2 ** (attempt - 1))
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs))
        }
      } finally {
        clearTimeout(timer)
      }
    }
    throw lastError
  }

  async resolvePlace(inputText, relatedPlaceId, context = {}) {
    const query = String(inputText || '').trim()
    if (!query) return []
    const related = decodePlace(relatedPlaceId)
    const url = new URL('/en/search/autocomplete', this.baseUrl)
    url.searchParams.set('language', 'en')
    url.searchParams.set('searchSession', crypto.randomUUID())
    url.searchParams.set('input', query)
    if (related?.id) url.searchParams.set('pairId', related.id)
    const response = await this.request(url, { accept: 'application/json', currency: this.supportedCurrencies[0] || 'EUR' })
    let rows = await response.json()
    rows = (Array.isArray(rows) ? rows : []).filter((row) => candidateMatches(query, row))
    const country = normalizeKey(context.country)
    if (country) {
      const countryRows = rows.filter((row) => normalizeKey(row.address).includes(country))
      if (countryRows.length) rows = countryRows
    }
    const unique = new Map()
    for (const row of rows) {
      const id = encodePlace(row)
      if (id) unique.set(row.id, { id, label: row.title, description: row.address || row.title, type: row.type || 'address' })
    }
    return Array.from(unique.values()).slice(0, 12)
  }

  normalizeVehicle(raw) { return raw }

  placeIdIsValid(value) { return Boolean(decodePlace(value)) }

  createBenchmarkPlace(point) {
    const label = point?.geocodedAddress || point?.destinationAddress || point?.pickupAddress || point?.zoneName
    if (!point?.googlePlaceId || !label) return null
    const airport = Boolean(point.airportIata || /\bairport\b/i.test(`${point.zoneName || ''} ${label}`))
    const id = encodePlace({ id: point.googlePlaceId, title: label, address: label, type: airport ? 'airport' : 'address' })
    return id ? { id, label, description: label, type: airport ? 'airport' : 'address' } : null
  }

  extractEvidence({ pickup, dropoff, sourceUrl, quotes, serviceAt }) {
    return {
      sourceUrl,
      publicSearchOnly: true,
      bookingCreated: false,
      endpoints: ['/en/search/autocomplete', '/en/product-search-v2'],
      pickup: pickup.label,
      dropoff: dropoff.label,
      serviceAt: serviceAt.toISOString(),
      quoteCount: quotes.length
    }
  }

  async fetchQuotes({ pickup, dropoff, currency, serviceAt, passengers = {} }) {
    const normalizedCurrency = String(currency || '').toUpperCase()
    if (!this.supportedCurrencies.includes(normalizedCurrency)) throw new Error(`Kiwitaxi does not support currency ${normalizedCurrency}`)
    const from = decodePlace(pickup.id)
    const to = decodePlace(dropoff.id)
    if (!from || !to) throw new Error('Kiwitaxi place mapping is invalid')
    const passengerCount = Math.max(1, Number(passengers.adults || 0) + Number(passengers.children || 0))
    const url = new URL('/en/product-search-v2', this.baseUrl)
    const params = {
      search_session: crypto.randomUUID(),
      from: from.title,
      place_from_id: from.id,
      place_from_address: from.address,
      to: to.title,
      place_to_id: to.id,
      place_to_address: to.address,
      all_passenger_count: passengerCount,
      passenger_count: passengerCount,
      date_start: serviceAt.toISOString().slice(0, 10)
    }
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value || ''))
    let response
    try {
      response = await this.request(url, {
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        currency: normalizedCurrency
      })
    } catch (error) {
      if (Number(error.status) === 404) {
        error.code = 'NO_QUOTES'
        throw error
      }
      throw error
    }
    const html = await response.text()
    const quotes = parseKiwitaxiQuotes(html, normalizedCurrency)
    if (!quotes.length) {
      const error = new Error('Kiwitaxi returned no available vehicles')
      error.code = 'NO_QUOTES'
      throw error
    }
    const sourceUrl = response.url || url.toString()
    return { quotes, evidence: this.extractEvidence({ pickup, dropoff, sourceUrl, quotes, serviceAt }) }
  }
}

module.exports = {
  KIWITAXI_DEFAULTS,
  KiwitaxiAdapter,
  candidateMatches,
  decodePlace,
  encodePlace,
  parseKiwitaxiQuotes,
  vehicleKey
}
