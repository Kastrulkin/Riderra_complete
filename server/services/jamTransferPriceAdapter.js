const crypto = require('crypto')

const JAMTRANSFER_DEFAULTS = Object.freeze({
  name: 'JamTransfer',
  adapterKey: 'jamtransfer',
  baseUrl: 'https://www.jamtransfer.com',
  supportedCurrencies: ['EUR'],
  schedule: { weekday: 3, localTime: '12:00', minLeadDays: 7 },
  passengers: { adults: 1, children: 0, returnJourney: false },
  pricingPolicy: { type: 'client_commission', commissionPercent: 30 },
  formulaVersion: 'jamtransfer-v1',
  maxConcurrency: 2,
  requestDelayMs: 600
})

const API_BASE_URL = 'https://prod.jamtransfer.com/api'
const USER_AGENT = 'Mozilla/5.0 (compatible; Riderra public price research/1.0)'

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
  return decodeHtml(String(value || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' '))
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim()
}

function normalizeKey(value) {
  return stripHtml(value).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
}

function placeId(endpoint, label) {
  const id = crypto.createHash('sha1').update(`${endpoint}|${normalizeKey(label)}`).digest('hex').slice(0, 20)
  return `jamtransfer:${id}`
}

function parsePrice(value) {
  const parsed = Number(String(value || '').replace(/,/g, ''))
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

function parseJamTransferOrigins(payload, baseUrl = JAMTRANSFER_DEFAULTS.baseUrl) {
  const pages = []
  const seen = new Set()
  for (const [country, group] of Object.entries(payload || {})) {
    for (const item of group?.items || []) {
      const slug = String(item?.slug || '').trim()
      const pickupLabel = String(item?.name || '').trim()
      if (!slug || !pickupLabel) continue
      const sourceUrl = new URL(`/taxi-transfers-from-${slug}`, baseUrl).toString()
      if (seen.has(sourceUrl)) continue
      seen.add(sourceUrl)
      pages.push({ sourceUrl, pickupLabel, country, externalPickupId: item.id || null })
    }
  }
  return pages
}

function vehicleKey(category, capacity) {
  return `${normalizeKey(category).replace(/\s+/g, '_')}_${capacity}`
}

function parseJamTransferPricePage(html, page = {}) {
  const source = String(html || '')
  const blocks = source.match(/<div class="faq-answer-content">[\s\S]*?<\/div>/gi) || []
  const rows = []
  const seen = new Map()
  for (const block of blocks) {
    const text = stripHtml(block)
    const route = text.match(/Transfer from (.+?) to (.+?) starts at €[\d,.]+\./i)
    if (!route) continue
    const routeFrom = route[1].trim()
    const routeTo = route[2].trim()
    const pricePattern = /(Standard|Premium|First Class),\s*(\d+) passengers Price is:\s*€([\d,]+(?:\.\d+)?)/gi
    let match
    while ((match = pricePattern.exec(text))) {
      const category = match[1].replace(/\s+/g, ' ').trim()
      const maxPassengers = Number(match[2])
      const price = parsePrice(match[3])
      if (price === null || !Number.isFinite(maxPassengers)) continue
      const externalVehicleKey = vehicleKey(category, maxPassengers)
      const rowKey = `${normalizeKey(routeFrom)}\u0000${normalizeKey(routeTo)}\u0000${externalVehicleKey}`
      const row = {
        routeFrom,
        routeTo,
        pickupPlaceId: placeId('pickup', routeFrom),
        pickupLabel: routeFrom,
        dropoffPlaceId: placeId('dropoff', routeTo),
        dropoffLabel: routeTo,
        currency: 'EUR',
        externalVehicleKey,
        externalVehicleName: `${category}, up to ${maxPassengers} passengers`,
        maxPassengers,
        price,
        sourceUrl: page.sourceUrl,
        evidence: {
          sourceUrl: page.sourceUrl,
          country: page.country || null,
          externalPickupId: page.externalPickupId || null,
          disclosure: 'Published base price per vehicle',
          finalPriceDependsOnDateTime: true,
          surchargesNotApplied: true
        }
      }
      const existingIndex = seen.get(rowKey)
      if (existingIndex === undefined) {
        seen.set(rowKey, rows.length)
        rows.push(row)
      } else if (row.price < rows[existingIndex].price) {
        rows[existingIndex] = row
      }
    }
  }
  return rows
}

function candidateMatches(inputText, candidateLabel) {
  const input = normalizeKey(inputText)
  const candidate = normalizeKey(candidateLabel)
  if (!input || !candidate) return false
  if (input === candidate || input.includes(candidate) || candidate.includes(input)) return true
  const iata = String(inputText || '').match(/\(([A-Z]{3})\)/)?.[1]
  if (iata && new RegExp(`\\b${iata}\\b`, 'i').test(String(candidateLabel || ''))) return true
  const stopwords = new Set(['airport', 'international', 'city', 'centre', 'center', 'downtown', 'hotel', 'station', 'terminal', 'the', 'of'])
  const meaningful = input.split(' ').filter((token) => token && !stopwords.has(token) && token !== iata?.toLowerCase())
  const candidateTokens = new Set(candidate.split(' ').filter(Boolean))
  return meaningful.length > 0 && meaningful.filter((token) => candidateTokens.has(token)).length / meaningful.length >= 0.6
}

class JamTransferAdapter {
  constructor(config = {}, dependencies = {}) {
    this.baseUrl = String(config.baseUrl || JAMTRANSFER_DEFAULTS.baseUrl).replace(/\/+$/, '')
    this.apiBaseUrl = String(config.apiBaseUrl || API_BASE_URL).replace(/\/+$/, '')
    this.supportedCurrencies = config.supportedCurrencies || JAMTRANSFER_DEFAULTS.supportedCurrencies
    this.requestDelayMs = Math.max(250, Number(config.requestDelayMs) || JAMTRANSFER_DEFAULTS.requestDelayMs)
    this.maxConcurrency = Math.max(1, Math.min(2, Number(config.maxConcurrency) || JAMTRANSFER_DEFAULTS.maxConcurrency))
    this.fetchImpl = dependencies.fetchImpl || global.fetch
    this.catalogRows = []
    this.catalogPages = null
    this.placeResolutionIsLocal = true
    this.quoteLookupIsLocal = true
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
            Accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en',
            'X-Country': 'en',
            Origin: this.baseUrl,
            Referer: `${this.baseUrl}/`,
            'User-Agent': USER_AGENT,
            ...(options.headers || {})
          },
          signal: controller.signal
        })
        if (!response.ok) throw new Error(`JamTransfer public source failed: HTTP ${response.status}`)
        return response
      } catch (error) {
        lastError = error
        if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 750 * (2 ** (attempt - 1))))
      } finally {
        clearTimeout(timer)
      }
    }
    throw lastError
  }

  async initialize(currency = 'EUR') {
    const normalizedCurrency = String(currency || '').toUpperCase()
    if (!this.supportedCurrencies.includes(normalizedCurrency)) throw new Error(`JamTransfer source does not support currency ${normalizedCurrency}`)
    const response = await this.request(`${this.apiBaseUrl}/countries`, { headers: { Accept: 'application/json' } })
    this.catalogPages = parseJamTransferOrigins(await response.json(), this.baseUrl)
    return this.catalogPages
  }

  async collectCatalog({ currency = 'EUR', skipSourceUrls = new Set(), onPage = async () => {} } = {}) {
    const pages = this.catalogPages || await this.initialize(currency)
    const pending = pages.filter((page) => !skipSourceUrls.has(page.sourceUrl))
    const errors = []
    let cursor = 0
    let collectedPages = 0
    let collectedQuotes = 0
    const workers = Array.from({ length: this.maxConcurrency }, async () => {
      while (cursor < pending.length) {
        const page = pending[cursor++]
        try {
          const response = await this.request(page.sourceUrl)
          const rows = parseJamTransferPricePage(await response.text(), page)
          await onPage(page, rows)
          collectedPages++
          collectedQuotes += rows.length
        } catch (error) {
          errors.push({ sourceUrl: page.sourceUrl, error: String(error.message || error) })
        }
        await new Promise((resolve) => setTimeout(resolve, this.requestDelayMs))
      }
    })
    await Promise.all(workers)
    return { totalPages: pages.length, skippedPages: pages.length - pending.length, collectedPages, collectedQuotes, errors }
  }

  loadCatalogSnapshots(rows) {
    this.catalogRows = Array.isArray(rows) ? rows.map((row) => ({
      pickupPlaceId: row.pickupPlaceId,
      pickupLabel: row.pickupLabel,
      dropoffPlaceId: row.dropoffPlaceId,
      dropoffLabel: row.dropoffLabel,
      currency: row.currency,
      externalVehicleKey: row.externalVehicleKey,
      externalVehicleName: row.externalVehicleName,
      maxPassengers: row.maxPassengers,
      price: row.publicSellPrice,
      sourceUrl: row.sourceUrl,
      evidence: (() => { try { return JSON.parse(row.evidenceJson || '{}') } catch (_) { return {} } })()
    })) : []
  }

  async resolvePlace(inputText, relatedPlaceId = null) {
    const candidates = new Map()
    for (const row of this.catalogRows) {
      if (relatedPlaceId && row.pickupPlaceId !== relatedPlaceId) continue
      const places = relatedPlaceId
        ? [{ id: row.dropoffPlaceId, label: row.dropoffLabel }]
        : [{ id: row.pickupPlaceId, label: row.pickupLabel }]
      for (const place of places) {
        if (place.id && place.label && candidateMatches(inputText, place.label)) candidates.set(place.id, { ...place, description: place.label })
      }
    }
    const rows = Array.from(candidates.values()).slice(0, 20)
    if (rows.length === 1) return [{ ...rows[0], label: String(inputText || '').trim(), description: rows[0].label }]
    return rows
  }

  normalizeVehicle(raw) { return raw }

  extractEvidence({ row }) {
    return { ...row.evidence, sourceUrl: row.sourceUrl, restoredFromPublicCatalog: true }
  }

  async fetchQuotes({ pickup, dropoff, currency }) {
    const normalizedCurrency = String(currency || '').toUpperCase()
    const matches = this.catalogRows.filter((row) => row.pickupPlaceId === pickup.id && row.dropoffPlaceId === dropoff.id && row.currency === normalizedCurrency)
    if (!matches.length) {
      const error = new Error('JamTransfer does not publish this exact direction in its public catalog')
      error.code = 'CATALOG_ROUTE_NOT_LISTED'
      throw error
    }
    return {
      quotes: matches.map((row) => ({
        externalVehicleKey: row.externalVehicleKey,
        externalVehicleName: row.externalVehicleName,
        maxPassengers: row.maxPassengers,
        price: row.price
      })),
      evidence: this.extractEvidence({ row: matches[0] })
    }
  }
}

module.exports = {
  JAMTRANSFER_DEFAULTS,
  JamTransferAdapter,
  candidateMatches,
  parseJamTransferOrigins,
  parseJamTransferPricePage,
  vehicleKey
}
