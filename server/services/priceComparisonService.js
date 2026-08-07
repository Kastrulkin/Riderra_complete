const crypto = require('crypto')
const { CIVITATIS_DEFAULTS, CivitatisAdapter } = require('./civitatisPriceAdapter')
const { BOOKING_DEFAULTS, BookingAdapter } = require('./bookingPriceAdapter')
const { JAMTRANSFER_DEFAULTS, JamTransferAdapter } = require('./jamTransferPriceAdapter')
const { SUNTRANSFERS_DEFAULTS, SuntransfersAdapter } = require('./suntransfersPriceAdapter')
const { TRANSFERZ_DEFAULTS, TransferzAdapter } = require('./transferzPriceAdapter')

const ACTIVE_RUNS = new Set()

class NoQuotesError extends Error {}

const SMART_RYDE_DEFAULTS = Object.freeze({
  name: 'SmartRyde',
  adapterKey: 'smart-ryde',
  baseUrl: 'https://smart-ryde.com',
  supportedCurrencies: ['USD', 'CAD', 'EUR', 'GBP', 'TWD', 'THB', 'JPY', 'VND', 'CNY', 'SGD', 'AUD', 'NZD', 'HKD', 'PLN', 'ILS', 'IDR', 'ZAR', 'BGN', 'RON', 'DKK', 'NOK', 'SEK', 'CZK', 'CHF', 'HUF', 'KRW', 'MYR', 'INR'],
  schedule: { weekday: 3, localTime: '12:00', minLeadDays: 7 },
  passengers: { adults: 1, children: 0, returnJourney: false },
  pricingPolicy: { type: 'client_commission', commissionPercent: 30 },
  formulaVersion: 'smart-ryde-v2',
  maxConcurrency: 2,
  requestDelayMs: 1000
})

function safeJsonParse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback
  } catch (_) {
    return fallback
  }
}

function normalizeTextKey(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

function placeCandidateMatches(inputText, candidateLabel) {
  const input = normalizeTextKey(inputText)
  const candidate = normalizeTextKey(candidateLabel)
  if (!input || !candidate) return false
  if (input === candidate) return true

  const inputIata = String(inputText || '').match(/\(([A-Z]{3})\)/)?.[1]
  if (inputIata && new RegExp(`\\b${inputIata}\\b`, 'i').test(String(candidateLabel || ''))) return true

  const tokens = (value) => normalizeTextKey(value)
    .replace(/[^a-z0-9\p{L}]+/gu, ' ')
    .split(' ')
    .filter(Boolean)
  const inputTokens = tokens(input)
  const candidateTokens = new Set(tokens(candidate))
  const stopwords = new Set(['airport', 'international', 'city', 'centre', 'center', 'downtown', 'hotel', 'station', 'terminal'])
  const meaningful = inputTokens.filter((token) => !stopwords.has(token) && token !== inputIata?.toLowerCase())
  if (!meaningful.length) return false

  if (/(?:city|centre|center|downtown)/i.test(input) && meaningful.length === 1) {
    return candidateTokens.has(meaningful[0])
  }
  if (meaningful.length === 1) return false
  const overlap = meaningful.filter((token) => candidateTokens.has(token)).length
  return overlap / meaningful.length >= 0.75
}

function selectPlaceCandidate(inputText, candidates) {
  const matches = (Array.isArray(candidates) ? candidates : [])
    .filter((candidate) => placeCandidateMatches(inputText, candidate.label))
  return matches.length === 1 ? matches[0] : null
}

function externalRouteKey({ routeFrom, routeTo, currency }) {
  return crypto.createHash('sha256')
    .update([normalizeTextKey(routeFrom), normalizeTextKey(routeTo), String(currency || '').toUpperCase()].join('|'))
    .digest('hex')
}

function externalCatalogRouteKey({ sourceUrl, routeFrom, routeTo, currency }) {
  return crypto.createHash('sha256')
    .update([String(sourceUrl || ''), normalizeTextKey(routeFrom), normalizeTextKey(routeTo), String(currency || '').toUpperCase()].join('|'))
    .digest('hex')
}

function comparisonRunScopeWhere(scopeJson) {
  const scope = safeJsonParse(scopeJson, null)
  const routePairs = Array.isArray(scope?.routePairs) ? scope.routePairs : []
  const normalized = routePairs
    .map((pair) => ({ routeFrom: String(pair?.routeFrom || '').trim(), routeTo: String(pair?.routeTo || '').trim() }))
    .filter((pair) => pair.routeFrom && pair.routeTo)
  return normalized.length ? { OR: normalized } : {}
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100
}

function applyPricingPolicy(riderraSellPrice, policy = {}) {
  const price = Number(riderraSellPrice)
  if (!Number.isFinite(price) || price < 0) throw new Error('Invalid Riderra sell price')

  let factor = 1
  if (policy.type === 'percentage_discount') {
    const discount = Number(policy.discountPercent)
    if (!Number.isFinite(discount) || discount < 0 || discount >= 100) throw new Error('Invalid discountPercent')
    factor = 1 - (discount / 100)
  } else if (policy.type === 'client_commission') {
    const commission = Number(policy.commissionPercent)
    if (!Number.isFinite(commission) || commission < 0 || commission >= 100) throw new Error('Invalid commissionPercent')
    factor = 1 - (commission / 100)
  } else if (policy.type === 'sequential_deductions') {
    const deductions = Array.isArray(policy.deductions) ? policy.deductions : []
    if (!deductions.length) throw new Error('Sequential deductions are required')
    factor = deductions.reduce((current, raw) => {
      const deduction = Number(raw)
      if (!Number.isFinite(deduction) || deduction < 0 || deduction >= 100) throw new Error('Invalid sequential deduction')
      return current * (1 - (deduction / 100))
    }, 1)
  } else {
    throw new Error(`Unsupported pricing policy: ${policy.type || 'missing'}`)
  }

  return roundMoney(price * factor)
}

function buildComparison({ riderraSellPrice, clientSellPrice, policy }) {
  const riderraPrice = Number(riderraSellPrice)
  if (!Number.isFinite(riderraPrice) || riderraPrice < 0) throw new Error('Invalid Riderra sell price')
  const clientPrice = Number(clientSellPrice)
  if (!Number.isFinite(clientPrice) || clientPrice < 0) throw new Error('Invalid client sell price')
  const clientBased = policy?.type === 'client_commission' || (policy?.type === 'sequential_deductions' && policy?.basis === 'client_sell')
  const targetPrice = applyPricingPolicy(clientBased ? clientPrice : riderraPrice, policy)
  const opportunityGapAbs = clientBased
    ? roundMoney(targetPrice - riderraPrice)
    : roundMoney(clientPrice - targetPrice)
  return {
    targetPrice,
    opportunityGapAbs,
    opportunityGapPct: (clientBased ? targetPrice : clientPrice) > 0
      ? roundMoney((opportunityGapAbs / (clientBased ? targetPrice : clientPrice)) * 100)
      : null,
    status: clientBased
      ? (riderraPrice < targetPrice ? 'opportunity' : 'not_opportunity')
      : (targetPrice < clientPrice ? 'opportunity' : 'not_opportunity')
  }
}

function nextScheduledServiceAt(now = new Date(), schedule = SMART_RYDE_DEFAULTS.schedule) {
  const minLeadDays = Math.max(0, Number(schedule.minLeadDays) || 0)
  const weekday = Number.isInteger(Number(schedule.weekday)) ? Number(schedule.weekday) : 3
  const [hour, minute] = String(schedule.localTime || '12:00').split(':').map(Number)
  const candidate = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + minLeadDays,
    Number.isFinite(hour) ? hour : 12,
    Number.isFinite(minute) ? minute : 0,
    0,
    0
  ))
  const addDays = (weekday - candidate.getUTCDay() + 7) % 7
  candidate.setUTCDate(candidate.getUTCDate() + addDays)
  return candidate
}

function decodeHtmlAttribute(value) {
  return String(value || '')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function smartRydeVehicleKey(name) {
  return normalizeTextKey(name).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'unknown'
}

function parseSmartRydeQuotes(html) {
  const quotes = []
  const seen = new Set()
  const pattern = /data-car="([^"]+)"/g
  let match
  while ((match = pattern.exec(String(html || '')))) {
    let car
    try {
      car = JSON.parse(decodeHtmlAttribute(match[1]))
    } catch (_) {
      continue
    }
    const price = Number(car.price)
    if (!car.name || !Number.isFinite(price)) continue
    const externalVehicleKey = smartRydeVehicleKey(car.name)
    if (seen.has(externalVehicleKey)) continue
    seen.add(externalVehicleKey)
    quotes.push({
      externalVehicleKey,
      externalVehicleName: String(car.name),
      maxPassengers: Number.isFinite(Number(car.max_passenger)) ? Number(car.max_passenger) : null,
      price,
      formattedPrice: car.format_price || null,
      exampleVehicle: car.explain || null
    })
  }
  return quotes
}

function extractSetCookies(headers) {
  if (headers && typeof headers.getSetCookie === 'function') return headers.getSetCookie()
  const combined = headers?.get?.('set-cookie') || ''
  return combined ? combined.split(/,(?=\s*[^;,]+=)/) : []
}

class HttpSession {
  constructor(fetchImpl = global.fetch) {
    this.fetchImpl = fetchImpl
    this.cookies = new Map()
  }

  async request(url, options = {}, timeoutMs = 20000) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const cookie = Array.from(this.cookies.entries()).map(([key, value]) => `${key}=${value}`).join('; ')
      const response = await this.fetchImpl(url, {
        ...options,
        headers: { ...(options.headers || {}), ...(cookie ? { Cookie: cookie } : {}) },
        signal: controller.signal
      })
      for (const raw of extractSetCookies(response.headers)) {
        const pair = String(raw).split(';')[0]
        const index = pair.indexOf('=')
        if (index > 0) this.cookies.set(pair.slice(0, index).trim(), pair.slice(index + 1).trim())
      }
      return response
    } finally {
      clearTimeout(timer)
    }
  }
}

async function retry(fn, attempts = 3) {
  let lastError
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn(attempt)
    } catch (error) {
      lastError = error
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 500 * (2 ** (attempt - 1))))
    }
  }
  throw lastError
}

async function fetchWithTimeout(fetchImpl, url, options = {}, timeoutMs = 20000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetchImpl(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

class SmartRydeAdapter {
  constructor(config = {}, dependencies = {}) {
    this.baseUrl = String(config.baseUrl || SMART_RYDE_DEFAULTS.baseUrl).replace(/\/+$/, '')
    this.supportedCurrencies = config.supportedCurrencies || SMART_RYDE_DEFAULTS.supportedCurrencies
    this.fetchImpl = dependencies.fetchImpl || global.fetch
  }

  async resolvePlace(inputText, relatedPlaceId = null) {
    const query = new URLSearchParams({ term: String(inputText || '').trim() })
    if (relatedPlaceId) query.set('place_id', relatedPlaceId)
    const response = await retry(() => fetchWithTimeout(this.fetchImpl, `${this.baseUrl}/search-places?${query}`, {
      headers: { Accept: 'application/json', 'User-Agent': 'Riderra price comparison/1.0' }
    }, 20000))
    if (!response.ok) throw new Error(`SmartRyde place search failed: HTTP ${response.status}`)
    const rows = await response.json()
    return (Array.isArray(rows) ? rows : []).map((row) => ({
      id: row.place_id,
      label: row.label || row.value || row.description,
      description: row.description || row.label || row.value
    })).filter((row) => row.id && row.label)
  }

  normalizeVehicle(raw) {
    return { ...raw, externalVehicleKey: raw.externalVehicleKey || smartRydeVehicleKey(raw.externalVehicleName) }
  }

  extractEvidence({ searchUrl, html, quotes }) {
    return {
      sourceUrl: searchUrl,
      quoteCount: quotes.length,
      responseLength: String(html || '').length,
      vehicles: quotes.map((quote) => ({
        key: quote.externalVehicleKey,
        name: quote.externalVehicleName,
        maxPassengers: quote.maxPassengers,
        formattedPrice: quote.formattedPrice,
        exampleVehicle: quote.exampleVehicle
      }))
    }
  }

  async fetchQuotes({ pickup, dropoff, serviceAt, currency, passengers = {} }) {
    const normalizedCurrency = String(currency || '').toUpperCase()
    if (!this.supportedCurrencies.includes(normalizedCurrency)) {
      throw new Error(`SmartRyde does not support currency ${normalizedCurrency}`)
    }

    const session = new HttpSession(this.fetchImpl)
    const params = new URLSearchParams({
      pickupLocation: pickup.label,
      dropoffLocation: dropoff.label,
      inputDate: serviceAt.toISOString().slice(0, 10),
      inputTime: '12:00',
      selectAdult: String(passengers.adults || 1),
      selectChild: String(passengers.children || 0),
      pickupPlaceId: pickup.id,
      dropoffPlaceId: dropoff.id,
      flightNumber: '',
      couponCode: '',
      aff: ''
    })
    const searchUrl = `${this.baseUrl}/search?${params}`

    const initialPageHtml = await retry(async () => {
      const response = await session.request(searchUrl, { headers: { 'User-Agent': 'Riderra price comparison/1.0' } })
      if (!response.ok) throw new Error(`SmartRyde initial search page failed: HTTP ${response.status}`)
      return response.text()
    })
    const initialCsrfToken = initialPageHtml.match(/<meta name="csrf-token" content="([^"]+)"/)?.[1]
    if (!initialCsrfToken) throw new Error('SmartRyde CSRF token was not found')

    await retry(async () => {
      const response = await session.request(`${this.baseUrl}/change-currency/${encodeURIComponent(normalizedCurrency)}`, {
        headers: { 'X-CSRF-TOKEN': initialCsrfToken, 'X-Requested-With': 'XMLHttpRequest', Referer: searchUrl, 'User-Agent': 'Riderra price comparison/1.0' }
      })
      if (!response.ok) throw new Error(`SmartRyde currency setup failed: HTTP ${response.status}`)
    })

    const pageHtml = await retry(async () => {
      const response = await session.request(searchUrl, { headers: { 'User-Agent': 'Riderra price comparison/1.0' } })
      if (!response.ok) throw new Error(`SmartRyde search page failed: HTTP ${response.status}`)
      return response.text()
    })
    const csrfToken = pageHtml.match(/<meta name="csrf-token" content="([^"]+)"/)?.[1]
    if (!csrfToken) throw new Error('SmartRyde CSRF token was not found')

    const html = await retry(async () => {
      const response = await session.request(`${this.baseUrl}/search-car`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-CSRF-TOKEN': csrfToken,
          'X-Requested-With': 'XMLHttpRequest',
          Referer: searchUrl,
          'User-Agent': 'Riderra price comparison/1.0'
        },
        body: params.toString()
      })
      if (!response.ok) throw new Error(`SmartRyde quote search failed: HTTP ${response.status}`)
      return response.text()
    })
    const quotes = parseSmartRydeQuotes(html).map((quote) => this.normalizeVehicle(quote))
    if (!quotes.length) throw new NoQuotesError('SmartRyde returned no available vehicles')
    return { quotes, evidence: this.extractEvidence({ searchUrl, html, quotes }) }
  }
}

function createAdapter(source, dependencies = {}) {
  const supportedCurrencies = safeJsonParse(source.supportedCurrenciesJson, SMART_RYDE_DEFAULTS.supportedCurrencies)
  const config = {
    baseUrl: source.baseUrl,
    supportedCurrencies,
    maxConcurrency: source.maxConcurrency,
    requestDelayMs: source.requestDelayMs
  }
  if (source.adapterKey === 'smart-ryde') return new SmartRydeAdapter(config, dependencies)
  if (source.adapterKey === 'civitatis') return new CivitatisAdapter(config, dependencies)
  if (source.adapterKey === 'booking') return new BookingAdapter(config, dependencies)
  if (source.adapterKey === 'jamtransfer') return new JamTransferAdapter(config, dependencies)
  if (source.adapterKey === 'suntransfers') return new SuntransfersAdapter(config, dependencies)
  if (source.adapterKey === 'transferz') return new TransferzAdapter(config, dependencies)
  throw new Error(`Unknown price comparison adapter: ${source.adapterKey}`)
}

function smartRydeVehicleMatches(externalVehicleKey, riderraVehicleType) {
  const external = normalizeTextKey(externalVehicleKey).replace(/\s+/g, '_')
  const internal = normalizeTextKey(riderraVehicleType)
  if (external === 'standard_5_seat') {
    return /(standard class car|standard sedan|sedan|saloon)/i.test(internal)
      && !/(executive|business|first|mini.?van|mpv|mini.?bus|bus|coach|e-vehicle|electric)/i.test(internal)
  }
  if (external === 'lengthened_5_seat') return /(executive|business)/i.test(internal)
  if (external === 'standard_7_seat') return /(mini.?van [67]|mpv|people carrier|6 seat|7 seat)/i.test(internal)
  if (external === '8_seat_bus') return /(standard minivan 8|8 seat|large people|standard mini.?bus)/i.test(internal)
  if (external === '10_seat_bus') return /(standard mini.?bus 9|9 seat|10 seat)/i.test(internal)
  return external === smartRydeVehicleKey(internal)
}

function externalVehicleMatches(adapterKey, externalVehicleKey, riderraVehicleType) {
  if (adapterKey === 'civitatis' && externalVehicleKey === 'private_vehicle_base') {
    return /(standard class car|standard sedan|sedan|saloon)/i.test(String(riderraVehicleType || ''))
      && !/(executive|business|first|mini.?van|mpv|mini.?bus|bus|coach|electric)/i.test(String(riderraVehicleType || ''))
  }
  if (adapterKey === 'booking') {
    const external = normalizeTextKey(externalVehicleKey).replace(/\s+/g, '_')
    const internal = normalizeTextKey(riderraVehicleType)
    if (external === 'standard') return /(standard class car|standard sedan|sedan|saloon)/i.test(internal) && !/(executive|business|first|electric|e-vehicle|mini.?van|mpv|bus)/i.test(internal)
    if (external === 'electric_standard') return /(electric|e-vehicle)/i.test(internal) && /(standard|sedan|car)/i.test(internal)
    if (external === 'executive') return /(executive|business class car|business sedan)/i.test(internal) && !/(van|people|mpv)/i.test(internal)
    if (external === 'luxury' || external === 'electric_luxury') return /(first class|luxury)/i.test(internal)
    if (external === 'people_carrier') return /(mini.?van [34]|mpv 4|people carrier 4)/i.test(internal)
    if (external === 'large_people_carrier') return /(mini.?van [567]|mpv [567]|people carrier [567]|businessvan 6)/i.test(internal)
    if (external === 'executive_people_carrier') return /(businessvan|executive.*van|executive people)/i.test(internal)
    if (external === 'minibus') return /(mini.?bus|8 seat|9 seat|10 seat|large people)/i.test(internal)
    return false
  }
  if (adapterKey === 'jamtransfer') {
    const match = String(externalVehicleKey || '').match(/^(standard|premium|first_class)_(\d+)$/)
    if (!match) return false
    const category = match[1]
    const capacity = Number(match[2])
    const internal = normalizeTextKey(riderraVehicleType)
    const internalCapacity = Number(internal.match(/(\d+)\s*pax/)?.[1])
    if (category === 'first_class') return /(first class|luxury)/i.test(internal) && capacity === 3
    if (category === 'premium') {
      if (/(business class car|business sedan)/i.test(internal) && !/(van|people|mpv)/i.test(internal)) return capacity === 3
      return /(businessvan|executive.*van|business.*van)/i.test(internal) && Number.isFinite(internalCapacity) && capacity === internalCapacity
    }
    if (/(standard class car|standard sedan|sedan|saloon)/i.test(internal) && !/(electric|mini.?van|mpv|bus)/i.test(internal)) return capacity === 3
    if (/standard mpv/i.test(internal)) return capacity === 4
    if (/(mini.?van|mini.?bus|coach)/i.test(internal) && Number.isFinite(internalCapacity)) return capacity === internalCapacity
    return false
  }
  if (adapterKey === 'suntransfers') {
    const external = normalizeTextKey(externalVehicleKey).replace(/\s+/g, '_')
    const internal = normalizeTextKey(riderraVehicleType)
    const vehicle = external.match(/^(premtx|tx|premmv|mv|mb|mch)(\d+)$/)
    const capacity = Number(vehicle?.[2])
    const internalCapacity = Number(internal.match(/(\d+)\s*pax/)?.[1])
    if (vehicle?.[1] === 'tx') return /(standard class car|standard sedan|sedan|saloon)/i.test(internal) && !/(executive|business|first|electric|mini.?van|mpv|bus)/i.test(internal)
    if (vehicle?.[1] === 'premtx') return /(business class car|business sedan|executive)/i.test(internal) && !/(van|mpv)/i.test(internal)
    if (vehicle?.[1] === 'mv') {
      if (/standard mpv/i.test(internal)) return capacity === 4
      return /standard mini.?van/i.test(internal) && Number.isFinite(internalCapacity) && capacity === internalCapacity
    }
    if (vehicle?.[1] === 'premmv') return /(businessvan|business.*van|executive.*van)/i.test(internal) && Number.isFinite(internalCapacity) && capacity === internalCapacity
    if (['mb', 'mch'].includes(vehicle?.[1])) return /standard mini.?bus/i.test(internal) && Number.isFinite(internalCapacity) && capacity === internalCapacity
    if (external.startsWith('wav')) return /(wheelchair|accessible)/i.test(internal)
    return false
  }
  if (adapterKey === 'transferz') {
    const external = normalizeTextKey(externalVehicleKey).replace(/\s+/g, '_')
    const internal = normalizeTextKey(riderraVehicleType)
    const internalCapacity = Number(internal.match(/(\d+)\s*pax/)?.[1])
    if (external === 'sedan_3') return /(standard class car|standard sedan|sedan|saloon)/i.test(internal) && !/(executive|business|first|electric|mini.?van|mpv|bus)/i.test(internal)
    if (external === 'business_sedan_3') return /(business class car|business sedan|executive)/i.test(internal) && !/(van|mpv)/i.test(internal)
    if (external === 'luxury_sedan_3') return /(first class|luxury)/i.test(internal) && !/(van|mpv)/i.test(internal)
    if (external === 'standard_electric_car_3') return /(electric|e-vehicle)/i.test(internal) && /(standard|sedan|car)/i.test(internal)
    if (external === 'high_end_electric_car_4') return /(electric|e-vehicle)/i.test(internal) && /(first|luxury|business)/i.test(internal)
    if (external === 'suv_4') return /standard mpv/i.test(internal) && internalCapacity === 4
    if (external === 'minivan_5') return /standard mini.?van/i.test(internal) && internalCapacity === 5
    if (external === 'mpv_6') return /standard mini.?van/i.test(internal) && internalCapacity === 6
    if (external === 'van_7') return /standard mini.?van/i.test(internal) && internalCapacity === 7
    if (external === 'exclusive_minivan_5') return /(businessvan|business.*van|executive.*van)/i.test(internal) && internalCapacity === 5
    if (external === 'minibus_9') return /standard mini.?bus/i.test(internal) && internalCapacity === 9
    return false
  }
  return smartRydeVehicleMatches(externalVehicleKey, riderraVehicleType)
}

async function resolveStoredPlace({ prisma, source, adapter, tenantId, inputText, relatedPlaceId }) {
  const normalizedInput = normalizeTextKey(inputText)
  const existing = await prisma.priceComparisonPlaceMap.findUnique({
    where: { sourceId_normalizedInput: { sourceId: source.id, normalizedInput } }
  })
  if (existing?.status === 'approved' && existing.externalPlaceId && existing.externalLabel) {
    return { ok: true, id: existing.externalPlaceId, label: existing.externalLabel, mapping: existing, externalRequest: false }
  }
  if (existing?.status === 'needs_review' && !adapter.placeResolutionIsLocal) {
    return {
      ok: false,
      mapping: existing,
      candidates: safeJsonParse(existing.candidatesJson, []),
      externalRequest: false
    }
  }

  const candidates = await adapter.resolvePlace(inputText, relatedPlaceId)
  const selected = selectPlaceCandidate(inputText, candidates)
  // A previously reviewed ambiguous mapping must stay behind the review gate.
  // Fresh candidates may change between requests, so only brand-new mappings
  // are eligible for automatic selection. Existing mappings are approved via
  // the explicit mapping workflow.
  const autoApprove = !!selected && !existing
  const mapping = await prisma.priceComparisonPlaceMap.upsert({
    where: { sourceId_normalizedInput: { sourceId: source.id, normalizedInput } },
    update: {
      inputText,
      externalPlaceId: selected?.id || existing?.externalPlaceId || null,
      externalLabel: selected?.label || existing?.externalLabel || null,
      status: autoApprove ? 'approved' : 'needs_review',
      candidatesJson: JSON.stringify(candidates),
      approvedAt: autoApprove ? new Date() : existing?.approvedAt || null
    },
    create: {
      tenantId,
      sourceId: source.id,
      inputText,
      normalizedInput,
      externalPlaceId: selected?.id || null,
      externalLabel: selected?.label || null,
      status: autoApprove ? 'approved' : 'needs_review',
      candidatesJson: JSON.stringify(candidates),
      approvedAt: autoApprove ? new Date() : null
    }
  })
  return autoApprove
    ? { ok: true, id: selected.id, label: selected.label, mapping, externalRequest: !adapter.placeResolutionIsLocal }
    : { ok: false, mapping, candidates, externalRequest: !adapter.placeResolutionIsLocal }
}

async function resolveBenchmarkPlace({ prisma, tenantId, zoneName, endpoint }) {
  const point = await prisma.geoZoneBenchmarkPoint.findFirst({
    where: { tenantId, source: 'riderra_geo_zone', zoneName, status: 'verified' },
    orderBy: { verifiedAt: 'desc' }
  })
  if (!point) return null
  const isDropoff = endpoint === 'dropoff'
  const id = isDropoff ? point.smartRydeDropoffPlaceId : point.smartRydePickupPlaceId
  const label = isDropoff ? point.smartRydeDropoffLabel : point.smartRydePickupLabel
  return id && label ? { ok: true, id, label, benchmarkPointId: point.id } : null
}

async function upsertQuote(prisma, data) {
  const key = {
    runId_cityPricingId_externalVehicleKey: {
      runId: data.runId,
      cityPricingId: data.cityPricingId,
      externalVehicleKey: data.externalVehicleKey
    }
  }
  return prisma.priceComparisonQuote.upsert({ where: key, update: data, create: data })
}

async function markRouteIssue({ prisma, run, row, status, error, evidence }) {
  return upsertQuote(prisma, {
    tenantId: run.tenantId,
    runId: run.id,
    cityPricingId: row.id,
    routeFrom: row.routeFrom,
    routeTo: row.routeTo,
    requestedVehicleType: row.vehicleType,
    riderraSellPrice: row.fixedPrice,
    riderraCurrency: row.currency,
    externalVehicleKey: status === 'failed' ? '_error' : (status === 'no_quote' ? '_no_quote' : '_route_resolution'),
    serviceAt: run.serviceAt,
    status,
    error,
    evidenceJson: evidence ? JSON.stringify(evidence) : null
  })
}

async function hasFinalComparison(prisma, runId, cityPricingId) {
  return prisma.priceComparisonQuote.findFirst({
    where: {
      runId,
      cityPricingId,
      status: { in: ['compared', 'no_quote'] },
      externalVehicleKey: { not: '_route_resolution' }
    },
    select: { id: true }
  })
}

async function applyFetchedQuotesToRow({ prisma, run, source, row, policy, pickup, dropoff, fetched, quotedAt }) {
  const finalExisting = await prisma.priceComparisonQuote.findFirst({
    where: {
      runId: run.id,
      cityPricingId: row.id,
      status: 'compared',
      externalVehicleKey: { notIn: ['_route_resolution', '_error'] }
    }
  })
  if (finalExisting) return

  const approvedMappings = await prisma.priceComparisonVehicleMap.findMany({
    where: { sourceId: source.id, riderraVehicleType: row.vehicleType, status: 'approved' }
  })
  let selected = fetched.quotes.find((quote) => approvedMappings.some((mapping) => mapping.externalVehicleKey === quote.externalVehicleKey))
  const automaticMatches = fetched.quotes.filter((quote) => externalVehicleMatches(source.adapterKey, quote.externalVehicleKey, row.vehicleType))
  if (!selected && automaticMatches.length === 1) {
    selected = automaticMatches[0]
    await prisma.priceComparisonVehicleMap.upsert({
      where: {
        sourceId_externalVehicleKey_riderraVehicleType: {
          sourceId: source.id,
          externalVehicleKey: selected.externalVehicleKey,
          riderraVehicleType: row.vehicleType
        }
      },
      update: { externalVehicleName: selected.externalVehicleName, status: 'approved', approvedAt: new Date() },
      create: {
        tenantId: run.tenantId,
        sourceId: source.id,
        externalVehicleKey: selected.externalVehicleKey,
        externalVehicleName: selected.externalVehicleName,
        riderraVehicleType: row.vehicleType,
        status: 'approved',
        approvedAt: new Date()
      }
    })
  }

  for (const externalQuote of fetched.quotes) {
    const isSelected = selected?.externalVehicleKey === externalQuote.externalVehicleKey
    const quote = await upsertQuote(prisma, {
      tenantId: run.tenantId,
      runId: run.id,
      cityPricingId: row.id,
      routeFrom: row.routeFrom,
      routeTo: row.routeTo,
      requestedVehicleType: row.vehicleType,
      riderraSellPrice: row.fixedPrice,
      riderraCurrency: row.currency,
      pickupPlaceId: pickup.id,
      pickupLabel: pickup.label,
      dropoffPlaceId: dropoff.id,
      dropoffLabel: dropoff.label,
      externalVehicleKey: externalQuote.externalVehicleKey,
      externalVehicleName: externalQuote.externalVehicleName,
      maxPassengers: externalQuote.maxPassengers,
      clientSellPrice: externalQuote.price,
      clientCurrency: row.currency,
      serviceAt: run.serviceAt,
      quotedAt,
      status: selected ? (isSelected ? 'compared' : 'ignored') : 'needs_review',
      error: selected ? null : 'Vehicle mapping requires review',
      evidenceJson: JSON.stringify(fetched.evidence)
    })
    if (isSelected) {
      const comparison = buildComparison({ riderraSellPrice: row.fixedPrice, clientSellPrice: externalQuote.price, policy })
      await prisma.priceComparisonResult.upsert({
        where: { quoteId: quote.id },
        update: { formulaVersion: run.formulaVersion, ...comparison },
        create: { tenantId: run.tenantId, runId: run.id, quoteId: quote.id, formulaVersion: run.formulaVersion, ...comparison }
      })
    }
  }
  await prisma.priceComparisonQuote.updateMany({
    where: { runId: run.id, cityPricingId: row.id, externalVehicleKey: { in: ['_route_resolution', '_error'] } },
    data: { status: 'ignored', error: null }
  })
}

async function processRouteGroup({ prisma, run, source, adapter, rows, policy, passengers }) {
  const pending = []
  for (const row of rows) {
    if (!await hasFinalComparison(prisma, run.id, row.id)) pending.push(row)
  }
  if (!pending.length) return

  const representative = pending[0]
  try {
    const pickup = (source.adapterKey === 'smart-ryde' && await resolveBenchmarkPlace({ prisma, tenantId: run.tenantId, zoneName: representative.routeFrom, endpoint: 'pickup' }))
      || await resolveStoredPlace({ prisma, source, adapter, tenantId: run.tenantId, inputText: representative.routeFrom })
    if (!pickup.ok) {
      await Promise.all(pending.map((row) => markRouteIssue({ prisma, run, row, status: 'needs_review', error: 'Pickup place requires review', evidence: { candidates: pickup.candidates } })))
      return !!pickup.externalRequest
    }
    const dropoff = (source.adapterKey === 'smart-ryde' && await resolveBenchmarkPlace({ prisma, tenantId: run.tenantId, zoneName: representative.routeTo, endpoint: 'dropoff' }))
      || await resolveStoredPlace({ prisma, source, adapter, tenantId: run.tenantId, inputText: representative.routeTo, relatedPlaceId: pickup.id })
    if (!dropoff.ok) {
      await Promise.all(pending.map((row) => markRouteIssue({ prisma, run, row, status: 'needs_review', error: 'Drop-off place requires review', evidence: { candidates: dropoff.candidates } })))
      return !!pickup.externalRequest || !!dropoff.externalRequest
    }

    const routeKey = externalRouteKey(representative)
    const stored = await prisma.externalTransferPriceSnapshot.findMany({
      where: { runId: run.id, routeKey },
      orderBy: { externalVehicleKey: 'asc' }
    })
    let fetched
    let quotedAt
    if (stored.length) {
      quotedAt = stored[0].quotedAt
      fetched = {
        quotes: stored.map((quote) => ({
          externalVehicleKey: quote.externalVehicleKey,
          externalVehicleName: quote.externalVehicleName,
          maxPassengers: quote.maxPassengers,
          price: quote.publicSellPrice
        })),
        evidence: safeJsonParse(stored[0].evidenceJson, { sourceUrl: stored[0].sourceUrl, restoredFromSnapshot: true })
      }
    } else {
      fetched = await adapter.fetchQuotes({ pickup, dropoff, serviceAt: run.serviceAt, currency: representative.currency, passengers })
      quotedAt = new Date()
      // Catalog-backed adapters already persisted immutable public evidence in
      // collectAdapterCatalog. Do not duplicate the same evidence under the
      // per-route lookup key while comparing Riderra rows.
      if (!adapter.quoteLookupIsLocal) await prisma.externalTransferPriceSnapshot.createMany({
        data: fetched.quotes.map((quote) => ({
          tenantId: run.tenantId,
          sourceId: source.id,
          runId: run.id,
          routeKey,
          routeFrom: representative.routeFrom,
          routeTo: representative.routeTo,
          pickupPlaceId: pickup.id,
          pickupLabel: pickup.label,
          dropoffPlaceId: dropoff.id,
          dropoffLabel: dropoff.label,
          serviceAt: run.serviceAt,
          passengers: Number(passengers.adults || 1) + Number(passengers.children || 0),
          currency: representative.currency,
          externalVehicleKey: quote.externalVehicleKey,
          externalVehicleName: quote.externalVehicleName,
          maxPassengers: quote.maxPassengers,
          publicSellPrice: quote.price,
          quoteKind: 'public_sell',
          quotedAt,
          sourceUrl: fetched.evidence?.sourceUrl || source.baseUrl,
          evidenceJson: JSON.stringify(fetched.evidence)
        })),
        skipDuplicates: true
      })
    }

    for (const row of pending) {
      await applyFetchedQuotesToRow({ prisma, run, source, row, policy, pickup, dropoff, fetched, quotedAt })
    }
    return !adapter.quoteLookupIsLocal
  } catch (error) {
    const status = error instanceof NoQuotesError || error?.code === 'NO_QUOTES' ? 'no_quote' : (error?.code === 'CATALOG_ROUTE_NOT_LISTED' ? 'needs_review' : 'failed')
    await Promise.all(pending.map((row) => markRouteIssue({ prisma, run, row, status, error: String(error.message || error).slice(0, 1000) })))
    if (status === 'no_quote') {
      await prisma.priceComparisonQuote.updateMany({
        where: { runId: run.id, cityPricingId: { in: pending.map((row) => row.id) }, externalVehicleKey: { in: ['_error', '_route_resolution'] } },
        data: { status: 'ignored', error: null }
      })
    }
    return !adapter.quoteLookupIsLocal
  }
}

async function collectAdapterCatalog({ prisma, run, source, adapter, passengers }) {
  if (typeof adapter.collectCatalog !== 'function') return null
  const scope = safeJsonParse(run.scopeJson, {})
  if (scope.catalog?.complete) {
    const snapshots = await prisma.externalTransferPriceSnapshot.findMany({ where: { runId: run.id } })
    adapter.loadCatalogSnapshots(snapshots)
    return scope.catalog
  }
  const existing = await prisma.externalTransferPriceSnapshot.findMany({
    where: { runId: run.id },
    select: { sourceUrl: true }
  })
  const skipSourceUrls = new Set(existing.map((row) => row.sourceUrl).filter(Boolean))
  const currency = safeJsonParse(source.supportedCurrenciesJson, CIVITATIS_DEFAULTS.supportedCurrencies)[0] || 'EUR'
  const stats = await adapter.collectCatalog({
    currency,
    skipSourceUrls,
    onPage: async (_page, rows) => {
      const quotedAt = new Date()
      if (!rows.length) return
      await prisma.externalTransferPriceSnapshot.createMany({
        data: rows.map((row) => ({
          tenantId: run.tenantId,
          sourceId: source.id,
          runId: run.id,
          routeKey: externalCatalogRouteKey(row),
          routeFrom: row.routeFrom,
          routeTo: row.routeTo,
          pickupPlaceId: row.pickupPlaceId,
          pickupLabel: row.pickupLabel,
          dropoffPlaceId: row.dropoffPlaceId,
          dropoffLabel: row.dropoffLabel,
          serviceAt: run.serviceAt,
          passengers: Number(passengers.adults || 1) + Number(passengers.children || 0),
          currency: row.currency,
          externalVehicleKey: row.externalVehicleKey,
          externalVehicleName: row.externalVehicleName,
          maxPassengers: row.maxPassengers,
          publicSellPrice: row.price,
          quoteKind: 'public_sell',
          quotedAt,
          sourceUrl: row.sourceUrl,
          evidenceJson: JSON.stringify(row.evidence || {})
        })),
        skipDuplicates: true
      })
    }
  })
  const snapshots = await prisma.externalTransferPriceSnapshot.findMany({ where: { runId: run.id } })
  adapter.loadCatalogSnapshots(snapshots)
  const catalog = {
    ...stats,
    complete: stats.errors.length === 0 && stats.collectedPages + stats.skippedPages === stats.totalPages,
    errors: stats.errors.slice(0, 200)
  }
  await prisma.priceComparisonRun.update({
    where: { id: run.id },
    data: {
      scopeJson: JSON.stringify({ ...scope, catalog }),
      error: stats.errors.length ? `${source.name} catalog: ${stats.errors.length} pages failed` : null
    }
  })
  return stats
}

async function refreshRunCounters(prisma, runId) {
  const quotes = await prisma.priceComparisonQuote.findMany({ where: { runId }, select: { cityPricingId: true, status: true } })
  const results = await prisma.priceComparisonResult.findMany({ where: { runId }, select: { status: true } })
  const processed = new Set(quotes.map((quote) => quote.cityPricingId))
  const needsReview = new Set(quotes.filter((quote) => quote.status === 'needs_review').map((quote) => quote.cityPricingId))
  const failed = new Set(quotes.filter((quote) => quote.status === 'failed').map((quote) => quote.cityPricingId))
  const opportunitiesCount = results.filter((result) => result.status === 'opportunity').length
  const current = await prisma.priceComparisonRun.findUnique({ where: { id: runId }, select: { routeCount: true } })
  const complete = processed.size >= (current?.routeCount || 0)
  const status = !complete ? 'running' : (needsReview.size ? 'needs_review' : (failed.size ? 'failed' : 'ready'))
  return prisma.priceComparisonRun.update({
    where: { id: runId },
    data: {
      status,
      processedCount: processed.size,
      opportunitiesCount,
      needsReviewCount: needsReview.size,
      failedCount: failed.size,
      finishedAt: complete ? new Date() : null
    }
  })
}

async function executePriceComparisonRun({ prisma, runId, fetchImpl }) {
  if (ACTIVE_RUNS.has(runId)) return { alreadyRunning: true }
  ACTIVE_RUNS.add(runId)
  try {
    const run = await prisma.priceComparisonRun.findUnique({ where: { id: runId }, include: { source: true } })
    if (!run) throw new Error('Price comparison run not found')
    const source = run.source
    const policy = safeJsonParse(run.pricingPolicyJson, {})
    const passengers = safeJsonParse(source.passengerConfigJson, SMART_RYDE_DEFAULTS.passengers)
    const adapter = createAdapter(source, fetchImpl ? { fetchImpl } : {})
    const supportedCurrencies = safeJsonParse(source.supportedCurrenciesJson, [])
    const rows = await prisma.cityPricing.findMany({
      where: {
        tenantId: run.tenantId,
        isActive: true,
        fixedPrice: { not: null },
        routeFrom: { not: null },
        routeTo: { not: null },
        vehicleType: { not: null },
        ...(supportedCurrencies.length ? { currency: { in: supportedCurrencies } } : {}),
        ...comparisonRunScopeWhere(run.scopeJson)
      },
      orderBy: [{ country: 'asc' }, { city: 'asc' }, { routeFrom: 'asc' }, { routeTo: 'asc' }, { vehicleType: 'asc' }]
    })
    await prisma.priceComparisonRun.update({
      where: { id: run.id },
      data: { status: 'running', routeCount: rows.length, startedAt: run.startedAt || new Date(), error: null }
    })

    await collectAdapterCatalog({ prisma, run, source, adapter, passengers })

    const grouped = new Map()
    for (const row of rows) {
      const key = externalRouteKey(row)
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key).push(row)
    }
    const routeGroups = Array.from(grouped.values())
    let cursor = 0
    const concurrency = Math.max(1, Math.min(2, Number(source.maxConcurrency) || 1))
    const workers = Array.from({ length: concurrency }, async () => {
      while (cursor < routeGroups.length) {
        const routeRows = routeGroups[cursor++]
        const usedExternalRequest = await processRouteGroup({ prisma, run, source, adapter, rows: routeRows, policy, passengers })
        await refreshRunCounters(prisma, run.id)
        if (usedExternalRequest && source.requestDelayMs > 0) await new Promise((resolve) => setTimeout(resolve, source.requestDelayMs))
      }
    })
    await Promise.all(workers)
    return refreshRunCounters(prisma, run.id)
  } catch (error) {
    await prisma.priceComparisonRun.update({
      where: { id: runId },
      data: { status: 'failed', error: String(error.message || error).slice(0, 2000), finishedAt: new Date() }
    }).catch(() => {})
    throw error
  } finally {
    ACTIVE_RUNS.delete(runId)
  }
}

function defaultSourceData(overrides = {}) {
  const defaults = overrides.adapterKey === 'civitatis'
    ? CIVITATIS_DEFAULTS
    : (overrides.adapterKey === 'booking'
        ? BOOKING_DEFAULTS
        : (overrides.adapterKey === 'jamtransfer'
            ? JAMTRANSFER_DEFAULTS
            : (overrides.adapterKey === 'suntransfers'
                ? SUNTRANSFERS_DEFAULTS
                : (overrides.adapterKey === 'transferz' ? TRANSFERZ_DEFAULTS : SMART_RYDE_DEFAULTS))))
  return {
    name: overrides.name || defaults.name,
    adapterKey: overrides.adapterKey || defaults.adapterKey,
    baseUrl: overrides.baseUrl || defaults.baseUrl,
    supportedCurrenciesJson: JSON.stringify(overrides.supportedCurrencies || defaults.supportedCurrencies),
    scheduleJson: JSON.stringify(overrides.schedule || defaults.schedule),
    passengerConfigJson: JSON.stringify(overrides.passengers || defaults.passengers),
    pricingPolicyJson: JSON.stringify(overrides.pricingPolicy || defaults.pricingPolicy),
    formulaVersion: overrides.formulaVersion || defaults.formulaVersion,
    maxConcurrency: Math.max(1, Math.min(2, Number(overrides.maxConcurrency) || defaults.maxConcurrency)),
    requestDelayMs: Math.max(0, Number(overrides.requestDelayMs) || defaults.requestDelayMs),
    isActive: overrides.isActive !== false
  }
}

module.exports = {
  SMART_RYDE_DEFAULTS,
  CIVITATIS_DEFAULTS,
  BOOKING_DEFAULTS,
  JAMTRANSFER_DEFAULTS,
  SUNTRANSFERS_DEFAULTS,
  TRANSFERZ_DEFAULTS,
  BookingAdapter,
  JamTransferAdapter,
  SuntransfersAdapter,
  TransferzAdapter,
  SmartRydeAdapter,
  applyPricingPolicy,
  buildComparison,
  comparisonRunScopeWhere,
  createAdapter,
  defaultSourceData,
  executePriceComparisonRun,
  externalVehicleMatches,
  externalRouteKey,
  externalCatalogRouteKey,
  hasFinalComparison,
  nextScheduledServiceAt,
  normalizeTextKey,
  parseSmartRydeQuotes,
  placeCandidateMatches,
  refreshRunCounters,
  resolveStoredPlace,
  selectPlaceCandidate,
  smartRydeVehicleMatches
}
