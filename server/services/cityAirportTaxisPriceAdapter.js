const crypto = require('crypto')

const CITY_AIRPORT_TAXIS_DEFAULTS = Object.freeze({
  name: 'City Airport Taxis',
  adapterKey: 'city-airport-taxis',
  baseUrl: 'https://city-airport-taxis.com',
  supportedCurrencies: ['EUR', 'USD'],
  schedule: { weekday: 3, localTime: '12:00', minLeadDays: 7 },
  passengers: { adults: 1, children: 0, returnJourney: false },
  pricingPolicy: { type: 'client_commission', commissionPercent: 30 },
  formulaVersion: 'city-airport-taxis-v1',
  maxConcurrency: 2,
  requestDelayMs: 650
})

const USER_AGENT = 'Mozilla/5.0 (compatible; Riderra public price research/1.0)'

function decodeHtml(value) {
  return String(value || '')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
}

function stripHtml(value) {
  return decodeHtml(String(value || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
}

function normalizeKey(value) {
  return stripHtml(value).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
}

function routePlaceId(endpoint, label) {
  return `city-airport-taxis:${endpoint}:${crypto.createHash('sha1').update(normalizeKey(label)).digest('hex').slice(0, 20)}`
}

function routeLabelFromSlug(value) {
  return decodeURIComponent(String(value || '')).replace(/-/g, ' ').replace(/\s+/g, ' ').trim()
}

function parseSitemapRoutes(xml, baseUrl = CITY_AIRPORT_TAXIS_DEFAULTS.baseUrl) {
  const routes = []
  const seen = new Set()
  for (const match of String(xml || '').matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)) {
    const sourceUrl = decodeHtml(match[1]).trim()
    let url
    try { url = new URL(sourceUrl, baseUrl) } catch (_) { continue }
    const slug = url.pathname.match(/\/airporttransfers\/reservations\/taxi-from-(.+)$/i)?.[1]
    const separator = slug?.indexOf('-to-') ?? -1
    if (!slug || separator <= 0 || separator >= slug.length - 4 || seen.has(url.toString())) continue
    const pickupLabel = routeLabelFromSlug(slug.slice(0, separator))
    const dropoffLabel = routeLabelFromSlug(slug.slice(separator + 4))
    if (!pickupLabel || !dropoffLabel) continue
    seen.add(url.toString())
    routes.push({
      sourceUrl: url.toString(),
      pickupLabel,
      dropoffLabel,
      pickupPlaceId: routePlaceId('pickup', pickupLabel),
      dropoffPlaceId: routePlaceId('dropoff', dropoffLabel)
    })
  }
  return routes
}

function meaningfulTokens(value) {
  const stopwords = new Set(['airport', 'international', 'city', 'centre', 'center', 'downtown', 'hotel', 'station', 'terminal', 'the', 'of'])
  return normalizeKey(value).split(' ').filter((token) => token && !stopwords.has(token))
}

function routeCandidateMatches(inputText, candidateLabel) {
  const input = normalizeKey(inputText)
  const candidate = normalizeKey(candidateLabel)
  if (!input || !candidate) return false
  if (input === candidate || input.startsWith(`${candidate} `) || candidate.startsWith(`${input} `)) return true
  const iata = String(inputText || '').match(/\(([A-Z]{3})\)/)?.[1]
  const inputTokens = meaningfulTokens(inputText).filter((token) => token !== iata?.toLowerCase())
  const candidateTokens = new Set(meaningfulTokens(candidateLabel))
  const overlap = inputTokens.filter((token) => candidateTokens.has(token)).length
  if (/\bairport\b/i.test(inputText) && /\bairport\b/i.test(candidateLabel)) return overlap >= 1
  return inputTokens.length > 0 && overlap / inputTokens.length >= 0.75
}

function candidateScore(inputText, candidateLabel) {
  const input = normalizeKey(inputText)
  const candidate = normalizeKey(candidateLabel)
  if (!input || !candidate) return 0
  if (input === candidate) return 100
  const iata = String(inputText || '').match(/\(([A-Z]{3})\)/)?.[1]?.toLowerCase()
  const inputTokens = meaningfulTokens(inputText).filter((token) => token !== iata)
  const candidateTokens = meaningfulTokens(candidateLabel)
  const candidateSet = new Set(candidateTokens)
  const overlap = inputTokens.filter((token) => candidateSet.has(token)).length
  let score = inputTokens.length ? (overlap / inputTokens.length) * 50 : 0
  const inputAirport = /\bairport\b/i.test(inputText)
  const candidateAirport = /\bairport\b/i.test(candidateLabel)
  const inputCity = /\b(city|centre|center|downtown)\b/i.test(inputText) || inputTokens.length === 1
  const candidateCity = /\b(city|centre|center|downtown)\b/i.test(candidateLabel)
  if (inputAirport === candidateAirport) score += 30
  else score -= 25
  if (inputCity && candidateCity) score += 15
  if (candidate.startsWith(`${input} `) || input.startsWith(`${candidate} `)) score += 10
  score -= Math.max(0, candidateTokens.length - inputTokens.length) * 2
  return score
}

function parseExchangeRates(html) {
  const raw = String(html || '').match(/var\s+currency\s*=\s*(\{[\s\S]*?\});/)?.[1]
  if (!raw) return {}
  try { return JSON.parse(raw) } catch (_) { return {} }
}

function parseCityAirportTaxisQuotes(html, requestedCurrency) {
  const source = String(html || '')
  const targetCurrency = String(requestedCurrency || '').toUpperCase()
  const exchangeRates = parseExchangeRates(source)
  const blocks = source.split(/<div class="vehicle_select selection-box__tile">/i).slice(1)
  const quotes = []
  for (const block of blocks) {
    const externalVehicleName = stripHtml(block.match(/<h2 class="vehicle--name">([\s\S]*?)<\/h2>/i)?.[1])
    const serviceClass = stripHtml(block.match(/<span class="vehicle--class">([\s\S]*?)<\/span>/i)?.[1])
    const priceMatch = stripHtml(block.match(/<span class="total-price biggest-text"[^>]*>([\s\S]*?)<\/span>/i)?.[1]).match(/^([A-Z]{3})\s+([\d,.]+)/)
    const passengerMatch = block.match(/passengers[\s\S]*?<span class="car-more--value"[^>]*>\s*(\d+)\s*<\/span>/i)
    if (!externalVehicleName || !priceMatch) continue
    const baseCurrency = priceMatch[1]
    const basePrice = Number(priceMatch[2].replace(/,/g, ''))
    const maxPassengers = Number(passengerMatch?.[1]) || Number(externalVehicleName.match(/(\d+)\s*pax/i)?.[1]) || null
    if (!Number.isFinite(basePrice) || basePrice < 0) continue
    let price = basePrice
    if (targetCurrency && targetCurrency !== baseCurrency) {
      const rate = Number(exchangeRates?.[baseCurrency]?.[targetCurrency])
      if (!Number.isFinite(rate) || rate <= 0) continue
      price = basePrice * rate * 1.03
    }
    const keyName = normalizeKey(externalVehicleName).replace(/\s+/g, '_')
    quotes.push({
      externalVehicleKey: keyName,
      externalVehicleName: serviceClass ? `${externalVehicleName} — ${serviceClass}` : externalVehicleName,
      maxPassengers,
      price: Math.round((price + Number.EPSILON) * 100) / 100,
      baseCurrency,
      basePrice
    })
  }
  return quotes
}

function extractLocationIds(html) {
  return {
    loc1: String(html || '').match(/<input type="hidden" id="loc1" value="([^"]+)"/i)?.[1] || null,
    loc2: String(html || '').match(/<input type="hidden" id="loc2" value="([^"]+)"/i)?.[1] || null,
    loc1Name: decodeHtml(String(html || '').match(/id="select_loc1" value="([^"]+)"/i)?.[1] || ''),
    loc2Name: decodeHtml(String(html || '').match(/id="select_loc2"[^>]*value="([^"]+)"/i)?.[1] || String(html || '').match(/value="([^"]+)"[^>]*id="select_loc2"/i)?.[1] || '')
  }
}

function serviceDateParts(serviceAt) {
  const date = serviceAt instanceof Date ? serviceAt : new Date(serviceAt)
  if (Number.isNaN(date.getTime())) throw new Error('City Airport Taxis service date is invalid')
  return {
    date: `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${date.getUTCFullYear()}`,
    time: `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`
  }
}

class CityAirportTaxisAdapter {
  constructor(config = {}, dependencies = {}) {
    this.baseUrl = String(config.baseUrl || CITY_AIRPORT_TAXIS_DEFAULTS.baseUrl).replace(/\/+$/, '')
    this.supportedCurrencies = config.supportedCurrencies || CITY_AIRPORT_TAXIS_DEFAULTS.supportedCurrencies
    this.fetchImpl = dependencies.fetchImpl || global.fetch
    this.routes = []
    this.initializePromise = null
    this.placeResolutionIsLocal = true
    this.trustUniquePlaceCandidate = true
    this.quoteLookupIsLocal = false
  }

  async request(url, options = {}) {
    let lastError
    for (let attempt = 1; attempt <= 3; attempt++) {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 30000)
      try {
        const response = await this.fetchImpl(url, {
          ...options,
          headers: { Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', 'Accept-Language': 'en', 'User-Agent': USER_AGENT, ...(options.headers || {}) },
          signal: controller.signal
        })
        if (!response.ok) throw new Error(`City Airport Taxis public source failed: HTTP ${response.status}`)
        return response
      } catch (error) {
        lastError = error
        if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 750 * (2 ** (attempt - 1))))
      } finally { clearTimeout(timer) }
    }
    throw lastError
  }

  async initialize() {
    if (this.routes.length) return this.routes
    if (this.initializePromise) return this.initializePromise
    this.initializePromise = (async () => {
      const indexResponse = await this.request(`${this.baseUrl}/sitemap.xml`)
      const indexXml = await indexResponse.text()
      const sitemapUrls = [...indexXml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)].map((row) => decodeHtml(row[1]).trim()).filter(Boolean)
      const routeSets = await Promise.all(sitemapUrls.map(async (url) => parseSitemapRoutes(await (await this.request(url)).text(), this.baseUrl)))
      this.routes = routeSets.flat()
      if (!this.routes.length) throw new Error('City Airport Taxis route sitemap is empty')
      return this.routes
    })()
    try { return await this.initializePromise } finally { this.initializePromise = null }
  }

  async resolvePlace(inputText, relatedPlaceId = null) {
    const routes = await this.initialize()
    const candidates = new Map()
    for (const route of routes) {
      if (relatedPlaceId && route.pickupPlaceId !== relatedPlaceId) continue
      const candidate = relatedPlaceId
        ? { id: route.dropoffPlaceId, label: route.dropoffLabel }
        : { id: route.pickupPlaceId, label: route.pickupLabel }
      if (routeCandidateMatches(inputText, candidate.label)) candidates.set(candidate.id, candidate)
    }
    const ranked = [...candidates.values()]
      .map((candidate) => ({ ...candidate, score: candidateScore(inputText, candidate.label) }))
      .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
    if (!ranked.length || ranked[0].score < 40) return []
    const topScore = ranked[0].score
    return ranked.filter((candidate) => candidate.score >= topScore - 3).slice(0, 20).map(({ score, ...candidate }) => candidate)
  }

  normalizeVehicle(raw) { return raw }

  extractEvidence({ route, requestedUrl, quotes, requestedCurrency, serviceAt, passengers }) {
    return {
      sourceUrl: requestedUrl,
      catalogUrl: route.sourceUrl,
      publicSearchOnly: true,
      bookingCreated: false,
      serviceAt: new Date(serviceAt).toISOString(),
      passengers: Number(passengers?.adults || 1),
      requestedCurrency,
      quoteCount: quotes.length,
      currencyConversion: quotes.some((quote) => quote.baseCurrency !== requestedCurrency) ? 'Published page exchange rate plus the site-disclosed 3% conversion adjustment' : null
    }
  }

  async fetchQuotes({ pickup, dropoff, serviceAt, currency, passengers = {} }) {
    const requestedCurrency = String(currency || '').toUpperCase()
    if (!this.supportedCurrencies.includes(requestedCurrency)) throw new Error(`City Airport Taxis does not support currency ${requestedCurrency}`)
    const routes = await this.initialize()
    const route = routes.find((row) => row.pickupPlaceId === pickup.id && row.dropoffPlaceId === dropoff.id)
    if (!route) {
      const error = new Error('City Airport Taxis route is not listed in the public sitemap')
      error.code = 'CATALOG_ROUTE_NOT_LISTED'
      throw error
    }
    const landingHtml = await (await this.request(route.sourceUrl)).text()
    const location = extractLocationIds(landingHtml)
    if (!location.loc1 || !location.loc2) throw new Error('City Airport Taxis location identifiers were not found')
    const service = serviceDateParts(serviceAt)
    const url = new URL(route.sourceUrl)
    url.searchParams.set('single', '1')
    url.searchParams.set('loc1_name', location.loc1Name || pickup.label)
    url.searchParams.set('loc2_name', location.loc2Name || dropoff.label)
    url.searchParams.set('loc1', location.loc1)
    url.searchParams.set('loc2', location.loc2)
    url.searchParams.set('pax1', String(Math.max(1, Number(passengers.adults || 1))))
    url.searchParams.set('date1', service.date)
    url.searchParams.set('time1', service.time)
    url.searchParams.set('quote', '1')
    const html = await (await this.request(url)).text()
    const quotes = parseCityAirportTaxisQuotes(html, requestedCurrency)
    if (!quotes.length) {
      const error = new Error('City Airport Taxis returned no available vehicles')
      error.code = 'NO_QUOTES'
      throw error
    }
    return { quotes, evidence: this.extractEvidence({ route, requestedUrl: url.toString(), quotes, requestedCurrency, serviceAt, passengers }) }
  }
}

module.exports = {
  CITY_AIRPORT_TAXIS_DEFAULTS,
  CityAirportTaxisAdapter,
  extractLocationIds,
  parseCityAirportTaxisQuotes,
  parseSitemapRoutes,
  routeCandidateMatches,
  serviceDateParts
}
