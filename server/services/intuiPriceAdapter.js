const path = require('path')

const INTUI_DEFAULTS = Object.freeze({
  name: 'Intui',
  adapterKey: 'intui',
  baseUrl: 'https://en.intui.travel',
  supportedCurrencies: ['EUR'],
  schedule: { weekday: 3, localTime: '12:00', minLeadDays: 7 },
  passengers: { adults: 1, children: 0, infants: 0, returnJourney: false },
  pricingPolicy: { type: 'client_commission', commissionPercent: 30 },
  formulaVersion: 'intui-v1',
  maxConcurrency: 1,
  requestDelayMs: 1200
})

const FIND_URL = 'https://find.intui.travel/api:find'
const PLACE_URL = 'https://find.intui.travel/api:place'
const USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36'

function normalizeKey(value) {
  return String(value || '').toLowerCase().normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function candidateMatches(inputText, row) {
  const input = normalizeKey(inputText)
  const label = row?.names?.en || row?.name || ''
  const candidate = normalizeKey(`${label} ${row?.country || ''} ${row?.iata || ''}`)
  if (!input || !candidate) return false
  const iata = String(inputText || '').match(/\(([A-Z]{3})\)/)?.[1]
    || String(inputText || '').match(/\b([A-Z]{3})\b/)?.[1]
  if (iata && String(row?.iata || '').toUpperCase() === iata) return true
  const stopwords = new Set(['airport', 'international', 'city', 'centre', 'center', 'downtown', 'hotel', 'station', 'terminal', 'port', 'the', 'of'])
  const tokens = input.split(' ').filter((token) => token && !stopwords.has(token) && token !== iata?.toLowerCase())
  const candidateTokens = new Set(candidate.split(' ').filter(Boolean))
  return candidate.includes(input) || (tokens.length > 0 && tokens.filter((token) => candidateTokens.has(token)).length / tokens.length >= 0.7)
}

function encodePlace(row) {
  const place = {
    docId: Number(row.docId),
    placeId: String(row.id || ''),
    name: row.names?.en || row.name || '',
    country: row.country || '',
    latitude: Number(row.lat),
    longitude: Number(row.lng),
    type: String(row.type || 'address').toLowerCase()
  }
  return `intui:${Buffer.from(JSON.stringify(place)).toString('base64url')}`
}

function decodePlace(value) {
  const encoded = String(value || '').match(/^intui:(.+)$/)?.[1]
  if (!encoded) return null
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'))
    if (!Number.isFinite(Number(parsed?.docId)) || Number(parsed.docId) <= 0 || !parsed?.name) return null
    return parsed
  } catch (_) {
    return null
  }
}

function serviceDateTime(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) throw new Error('Intui service date is invalid')
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')} ${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}:00`
}

function vehicleKey(row = {}) {
  const name = normalizeKey(row.name)
  const category = normalizeKey(row.type)
  const capacity = Number(row.maxPassengers || name.match(/1\s+(?:to\s+)?(\d+)\s+passenger/)?.[1]) || 0
  const business = /business|premium|executive|mercedes benz e class|mercedes benz s class/.test(`${category} ${name}`)
  if (/minibus|bus/.test(name)) return `standard_minibus_${capacity}`
  if (/minivan|van|v class|vito|transporter|traveller|hiace|caddy|traffic/.test(name)) return business ? `businessvan_${capacity}` : `standard_minivan_${capacity}`
  if (/suv|rav4|niro/.test(name)) return `standard_suv_${capacity}`
  if (business) return 'business_car'
  return 'standard_car'
}

function normalizeQuotes(rows) {
  const byVehicle = new Map()
  for (const row of Array.isArray(rows) ? rows : []) {
    const price = Number(row.price)
    const currency = String(row.currency || '').toUpperCase()
    if (!Number.isFinite(price) || price < 0 || !currency || !row.name) continue
    const capacity = Number(row.maxPassengers || normalizeKey(row.name).match(/1\s+(?:to\s+)?(\d+)\s+passenger/)?.[1]) || null
    const quote = {
      externalVehicleKey: vehicleKey({ ...row, maxPassengers: capacity }),
      externalVehicleName: String(row.name).trim(),
      maxPassengers: capacity,
      price: Math.round((price + Number.EPSILON) * 100) / 100,
      currency,
      offerId: row.offerId || null,
      evidencePath: row.evidencePath || null
    }
    const existing = byVehicle.get(quote.externalVehicleKey)
    if (!existing || quote.price < existing.price) byVehicle.set(quote.externalVehicleKey, quote)
  }
  return Array.from(byVehicle.values())
}

function loadPlaywright() {
  const candidates = [
    process.env.INTUI_PLAYWRIGHT_PATH,
    '/opt/intui-browser/node_modules/playwright'
  ].filter(Boolean)
  for (const candidate of candidates) {
    try { return require(path.resolve(candidate)) } catch (_) {}
  }
  throw new Error('Intui browser runtime is not installed')
}

class IntuiBrowserQuoteProvider {
  constructor() {
    this.browser = null
    this.page = null
  }

  async ensurePage() {
    if (this.page && !this.page.isClosed()) return this.page
    const { chromium } = loadPlaywright()
    this.browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] })
    const context = await this.browser.newContext({ userAgent: USER_AGENT, locale: 'en-US' })
    this.page = await context.newPage()
    return this.page
  }

  async getOffers(url) {
    const page = await this.ensurePage()
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForSelector('#car_list', { timeout: 60000 })
    await page.waitForTimeout(800)
    return page.locator('#car_list .catalog-item').evaluateAll((elements) => elements.map((element) => {
      const name = element.querySelector('h3.title')?.textContent.replace(/\s+/g, ' ').trim() || ''
      const type = element.querySelector('.t-type')?.textContent.replace(/\s+/g, ' ').trim() || ''
      const capacity = Number(name.match(/1\s*(?:-|to)\s*(\d+)\s*passenger/i)?.[1]) || null
      return {
        offerId: element.getAttribute('data-id'),
        name,
        type,
        maxPassengers: capacity,
        price: Number(element.getAttribute('data-pricesort')),
        currency: element.querySelector('.non-agent')?.textContent.trim().split(/\s+/).pop() || '',
        evidencePath: element.querySelector('a.by_tn')?.getAttribute('href') || null
      }
    }))
  }
}

class IntuiAdapter {
  constructor(config = {}, dependencies = {}) {
    this.baseUrl = String(config.baseUrl || INTUI_DEFAULTS.baseUrl).replace(/\/+$/, '')
    this.supportedCurrencies = config.supportedCurrencies || INTUI_DEFAULTS.supportedCurrencies
    this.fetchImpl = dependencies.fetchImpl || global.fetch
    this.quoteProvider = dependencies.browserQuoteProvider || new IntuiBrowserQuoteProvider()
    this.trustUniquePlaceCandidate = true
    this.browserQueue = Promise.resolve()
  }

  async publicPlaceRequest(url, body) {
    const response = await this.fetchImpl(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Origin: this.baseUrl,
        Referer: `${this.baseUrl}/`,
        'User-Agent': USER_AGENT
      },
      body: JSON.stringify(body)
    })
    if (!response.ok) throw new Error(`Intui place search failed: HTTP ${response.status}`)
    return response.json()
  }

  async resolvePlace(inputText, relatedPlaceId, context = {}) {
    const query = String(inputText || '').trim()
    if (!query) return []
    const related = decodePlace(relatedPlaceId)
    const payload = await this.publicPlaceRequest(FIND_URL, { text: query, doc_id: related?.docId || 0, id: related?.placeId || '', ispast: false })
    let rows = (Array.isArray(payload?.data) ? payload.data : []).filter((row) => candidateMatches(query, row)).slice(0, 12)
    const country = normalizeKey(context.country)
    if (country) {
      const matches = rows.filter((row) => normalizeKey(row.country).includes(country))
      if (matches.length) rows = matches
    }
    rows = await Promise.all(rows.map(async (row) => {
      if (Number(row.docId) > 0 || !row.id) return row
      const place = await this.publicPlaceRequest(`${PLACE_URL}?id=${encodeURIComponent(row.id)}`, { id: row.id })
      const resolved = Array.isArray(place?.data) ? place.data[0] : null
      return resolved ? { ...row, ...resolved, names: resolved.names || row.names } : row
    }))
    return rows.map((row) => ({ id: encodePlace(row), label: row.names?.en || row.name, description: `${row.names?.en || row.name}, ${row.country || ''}`, type: String(row.type || 'address').toLowerCase() }))
      .filter((row) => Boolean(decodePlace(row.id)))
  }

  normalizeVehicle(raw) { return raw }

  placeIdIsValid(value) { return Boolean(decodePlace(value)) }

  async fetchQuotes({ pickup, dropoff, serviceAt, currency, passengers = {} }) {
    const normalizedCurrency = String(currency || '').toUpperCase()
    if (!this.supportedCurrencies.includes(normalizedCurrency)) throw new Error(`Intui does not support currency ${normalizedCurrency}`)
    const from = decodePlace(pickup.id)
    const to = decodePlace(dropoff.id)
    if (!from || !to) throw new Error('Intui place mapping is invalid')
    const adults = Math.max(1, Number(passengers.adults || 1))
    const children = Math.max(0, Number(passengers.children || 0))
    const infants = Math.max(0, Number(passengers.infants || 0))
    const routeToken = Buffer.from(`${from.docId};${to.docId};${adults};${children};${infants};${serviceDateTime(serviceAt)}`).toString('base64')
    const searchUrl = `${this.baseUrl}/getoffers/${routeToken}/?forcibly_currency=${encodeURIComponent(normalizedCurrency)}`
    const previous = this.browserQueue
    let release
    this.browserQueue = new Promise((resolve) => { release = resolve })
    await previous
    let rows
    try { rows = await this.quoteProvider.getOffers(searchUrl) } finally { release() }
    const quotes = normalizeQuotes(rows).filter((quote) => quote.currency === normalizedCurrency)
    if (!quotes.length) {
      const error = new Error('Intui returned no available vehicles')
      error.code = 'NO_QUOTES'
      throw error
    }
    return {
      quotes,
      evidence: { sourceUrl: searchUrl, endpoint: '/getoffers/{route}', publicSearchOnly: true, browserCollection: true, bookingCreated: false, pickup: pickup.label, dropoff: dropoff.label, serviceAt: serviceDateTime(serviceAt), rawOfferCount: rows.length, quoteCount: quotes.length }
    }
  }
}

module.exports = {
  INTUI_DEFAULTS,
  IntuiAdapter,
  IntuiBrowserQuoteProvider,
  candidateMatches,
  decodePlace,
  encodePlace,
  normalizeQuotes,
  serviceDateTime,
  vehicleKey
}
