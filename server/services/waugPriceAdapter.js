const crypto = require('crypto')

const WAUG_DEFAULTS = Object.freeze({
  name: 'Waug',
  adapterKey: 'waug',
  baseUrl: 'https://www.waug.com',
  supportedCurrencies: ['USD'],
  schedule: { weekday: 3, localTime: '12:00', minLeadDays: 7 },
  passengers: { adults: 1, children: 0, returnJourney: false },
  pricingPolicy: { type: 'client_commission', commissionPercent: 30 },
  formulaVersion: 'waug-v1',
  maxConcurrency: 1,
  requestDelayMs: 1000
})

function decodeHtml(value) {
  return String(value || '')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&apos;/gi, "'")
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
}

function stripHtml(value) {
  return decodeHtml(String(value || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
}

function normalize(value) {
  return stripHtml(value).toLowerCase().normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function parseUsd(value) {
  const match = stripHtml(value).match(/(?:US\$|USD)\s*([0-9][0-9,.]*)/i)
  if (!match) return null
  const parsed = Number(match[1].replace(/,/g, ''))
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

function cleanActivityTitle(value) {
  return stripHtml(value).replace(/^(?:\[[^\]]+\]\s*)+/, '').trim()
}

function inferredRoute(title) {
  const cleaned = cleanActivityTitle(title)
  const explicit = cleaned.match(/^(.+?\bAirport(?:s)?(?:\s*\([A-Z]{3}\))?)\s+[–—-]\s+(.+?)(?:\s+(?:Private|Premium)?\s*(?:Pick-?up|Transfer|Service).*)?$/i)
  if (explicit) {
    return { routeFrom: explicit[1].trim(), routeTo: explicit[2].trim(), precision: 'title_direction' }
  }
  const airport = cleaned.match(/^(.+?\bAirport(?:s)?(?:\s*\([A-Z]{3}\))?)/i)?.[1]
  if (airport) {
    const city = airport.replace(/\b(?:International\s+)?Airport(?:s)?\b.*$/i, '').trim()
    return {
      routeFrom: airport.trim(),
      routeTo: `${city || 'Destination'} service area`,
      precision: 'catalog_service_area'
    }
  }
  return { routeFrom: cleaned, routeTo: 'Destination options', precision: 'catalog_product_only' }
}

function stablePlaceId(activityId, endpoint, label) {
  const hash = crypto.createHash('sha1').update(`${activityId}|${endpoint}|${normalize(label)}`).digest('hex').slice(0, 20)
  return `waug:${endpoint}:${hash}`
}

function parseWaugActivityCards(html, baseUrl = WAUG_DEFAULTS.baseUrl) {
  const rows = []
  const seen = new Set()
  const pattern = /<a\b[^>]*href="\/en\/activities\/(\d+)\/?"[^>]*>([\s\S]*?)<\/article>\s*<\/a>/gi
  let match
  while ((match = pattern.exec(String(html || '')))) {
    const activityId = match[1]
    if (seen.has(activityId)) continue
    const card = match[2]
    const rawTitle = card.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)?.[1]
      || card.match(/<img[^>]+alt="([^"]+)"/i)?.[1]
    const title = stripHtml(rawTitle)
    const sourceUrl = new URL(`/en/activities/${activityId}`, baseUrl).toString()
    const originalPrice = parseUsd(card.match(/<del[^>]*>([\s\S]*?)<\/del>/i)?.[1])
    const salePrice = parseUsd(card.match(/class="[^"]*__origin[^"]*"[^>]*>([\s\S]*?)(?:<svg|<\/div>)/i)?.[1])
    const publicSellPrice = salePrice ?? originalPrice
    if (!title || publicSellPrice === null) continue
    seen.add(activityId)
    const route = inferredRoute(title)
    rows.push({
      routeFrom: route.routeFrom,
      routeTo: route.routeTo,
      pickupPlaceId: stablePlaceId(activityId, 'pickup', route.routeFrom),
      pickupLabel: route.routeFrom,
      dropoffPlaceId: stablePlaceId(activityId, 'dropoff', route.routeTo),
      dropoffLabel: route.routeTo,
      currency: 'USD',
      externalVehicleKey: `activity_${activityId}_starting_price`,
      externalVehicleName: 'Published starting price — vehicle and option require review',
      maxPassengers: null,
      price: publicSellPrice,
      sourceUrl,
      evidence: {
        sourceUrl,
        catalogUrl: `${String(baseUrl).replace(/\/+$/, '')}/en/specials/airporttransfers`,
        activityId,
        title,
        routePrecision: route.precision,
        priceBasis: 'public_catalog_starting_price',
        originalPrice,
        publicSellPrice,
        discountPercent: originalPrice && originalPrice > publicSellPrice
          ? Math.round((1 - publicSellPrice / originalPrice) * 10000) / 100
          : 0,
        exactVehicleDisclosed: false,
        requiresReviewBeforeOpportunity: true
      }
    })
  }
  return rows
}

function candidateMatches(inputText, candidateLabel) {
  const input = normalize(inputText)
  const candidate = normalize(candidateLabel)
  if (!input || !candidate) return false
  const inputIata = String(inputText || '').match(/\(([A-Z]{3})\)/)?.[1]
  if (inputIata && new RegExp(`\\b${inputIata}\\b`, 'i').test(String(candidateLabel || ''))) return true
  if (input === candidate) return true
  const ignored = new Set(['airport', 'international', 'city', 'centre', 'center', 'service', 'area', 'hotel', 'terminal'])
  const tokens = input.split(' ').filter((token) => token && !ignored.has(token))
  const candidateTokens = new Set(candidate.split(' ').filter(Boolean))
  return tokens.length > 0 && tokens.every((token) => candidateTokens.has(token))
}

class WaugAdapter {
  constructor(config = {}, dependencies = {}) {
    this.baseUrl = String(config.baseUrl || WAUG_DEFAULTS.baseUrl).replace(/\/+$/, '')
    this.supportedCurrencies = config.supportedCurrencies || WAUG_DEFAULTS.supportedCurrencies
    this.fetchImpl = dependencies.fetchImpl || global.fetch
    this.catalogRows = []
    this.placeResolutionIsLocal = true
    this.quoteLookupIsLocal = true
  }

  async request(url) {
    let lastError
    for (let attempt = 1; attempt <= 3; attempt++) {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 25000)
      try {
        const response = await this.fetchImpl(url, {
          headers: {
            Accept: 'text/html,application/xhtml+xml',
            'Accept-Language': 'en-US,en;q=0.9',
            'User-Agent': 'Mozilla/5.0 (compatible; Riderra public price research/1.0)'
          },
          signal: controller.signal
        })
        if (!response.ok) throw new Error(`Waug public catalog failed: HTTP ${response.status}`)
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

  async collectCatalog({ currency = 'USD', skipSourceUrls = new Set(), onPage = async () => {} } = {}) {
    const normalizedCurrency = String(currency || '').toUpperCase()
    if (!this.supportedCurrencies.includes(normalizedCurrency)) throw new Error(`Waug source does not support currency ${normalizedCurrency}`)
    const catalogUrl = `${this.baseUrl}/en/specials/airporttransfers`
    if (skipSourceUrls.has(catalogUrl)) return { totalPages: 1, skippedPages: 1, collectedPages: 0, collectedQuotes: 0, errors: [] }
    try {
      const response = await this.request(catalogUrl)
      const rows = parseWaugActivityCards(await response.text(), this.baseUrl)
      await onPage({ sourceUrl: catalogUrl }, rows)
      return { totalPages: 1, skippedPages: 0, collectedPages: 1, collectedQuotes: rows.length, errors: [] }
    } catch (error) {
      return { totalPages: 1, skippedPages: 0, collectedPages: 0, collectedQuotes: 0, errors: [{ sourceUrl: catalogUrl, error: String(error.message || error) }] }
    }
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
      const place = relatedPlaceId
        ? { id: row.dropoffPlaceId, label: row.dropoffLabel }
        : { id: row.pickupPlaceId, label: row.pickupLabel }
      if (place.id && place.label && candidateMatches(inputText, place.label)) {
        candidates.set(place.id, { ...place, description: place.label })
      }
    }
    return Array.from(candidates.values()).slice(0, 20)
  }

  normalizeVehicle(raw) {
    return raw
  }

  async fetchQuotes({ pickup, dropoff, currency }) {
    const normalizedCurrency = String(currency || '').toUpperCase()
    const matches = this.catalogRows.filter((row) => row.pickupPlaceId === pickup.id && row.dropoffPlaceId === dropoff.id && row.currency === normalizedCurrency)
    if (!matches.length) {
      const error = new Error('Waug does not publish an exact matching catalog product')
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
      evidence: { ...matches[0].evidence, restoredFromPublicCatalog: true }
    }
  }
}

module.exports = {
  WAUG_DEFAULTS,
  WaugAdapter,
  candidateMatches,
  inferredRoute,
  parseUsd,
  parseWaugActivityCards
}
