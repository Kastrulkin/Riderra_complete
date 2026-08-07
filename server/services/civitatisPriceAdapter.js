const crypto = require('crypto')

const CIVITATIS_DEFAULTS = Object.freeze({
  name: 'Civitatis',
  adapterKey: 'civitatis',
  baseUrl: 'https://www.civitatis.com',
  supportedCurrencies: ['EUR'],
  schedule: { weekday: 3, localTime: '12:00', minLeadDays: 7 },
  passengers: { adults: 1, children: 0, returnJourney: false },
  pricingPolicy: { type: 'client_commission', commissionPercent: 30 },
  formulaVersion: 'civitatis-v1',
  maxConcurrency: 2,
  requestDelayMs: 800
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

function normalizeKey(value) {
  return stripHtml(value).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
}

function parseMoney(value) {
  let raw = stripHtml(value).replace(/[^0-9.,-]/g, '')
  if (!raw) return null
  const comma = raw.lastIndexOf(',')
  const dot = raw.lastIndexOf('.')
  if (comma > dot) raw = raw.replace(/\./g, '').replace(',', '.')
  else raw = raw.replace(/,/g, '')
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

function parseCivitatisCatalogPages(html, baseUrl = CIVITATIS_DEFAULTS.baseUrl) {
  const pages = []
  const seen = new Set()
  const pattern = /<a\s+href="[^"]+\/transfers\/"\s+class="a-title--destination-country"\s+title="([^"]+)"|<a\s+href="([^"]+\/transfers\/)"\s+class="a-link--destination"\s+title="([^"]+)"/gi
  let match
  let country = null
  while ((match = pattern.exec(String(html || '')))) {
    if (match[1]) {
      country = decodeHtml(match[1]).trim() || null
      continue
    }
    const sourceUrl = new URL(decodeHtml(match[2]), baseUrl).toString()
    if (seen.has(sourceUrl)) continue
    seen.add(sourceUrl)
    pages.push({ sourceUrl, city: decodeHtml(match[3]).trim(), country })
  }
  return pages
}

function parseLocationOptions(html) {
  const options = []
  const select = String(html || '').match(/<select[^>]+id="departure"[\s\S]*?<\/select>/i)?.[0] || ''
  const pattern = /<option\s+value="([^"]+)"\s+class="([^"]+)"[^>]*>([\s\S]*?)<\/option>/gi
  let match
  while ((match = pattern.exec(select))) {
    const label = stripHtml(match[3])
    if (label) options.push({ id: match[1], type: match[2], label, normalized: normalizeKey(label) })
  }
  return options
}

function locationForLabel(label, options, page, endpoint) {
  const normalized = normalizeKey(label)
  const iata = String(label || '').match(/\(([A-Z]{3})\)/)?.[1]
  let option = iata ? options.find((row) => new RegExp(`\\b${iata}\\b`, 'i').test(row.label)) : null
  if (!option) option = options.find((row) => row.normalized === normalized || row.normalized.startsWith(`${normalized} `) || normalized.startsWith(`${row.normalized} `))
  if (!option && endpoint === 'dropoff') {
    const city = normalizeKey(page.city)
    option = options.find((row) => row.type === 'tipo-5' && row.normalized.includes(city) && /downtown|centre|center|city/.test(row.normalized))
  }
  // Civitatis repeats the same regional table on several destination pages.
  // Page-scoped IDs make one airport look like dozens of ambiguous places.
  // Keep the endpoint in the key so pickup and drop-off roles stay distinct.
  const id = crypto.createHash('sha1').update(`${endpoint}|${normalized}`).digest('hex').slice(0, 20)
  const displayLabel = option?.label || label
  return { id: `civitatis:${id}`, label: displayLabel }
}

function parseCivitatisTransferPage(html, page = {}) {
  const source = String(html || '')
  const currency = source.match(/id="currencySelectorButton"[^>]+data-value="([A-Z]{3})"/i)?.[1] || null
  const options = parseLocationOptions(source)
  const rows = []
  const seen = new Set()
  const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  let rowMatch
  while ((rowMatch = rowPattern.exec(source))) {
    const rowHtml = rowMatch[1]
    const pickupText = rowHtml.match(/class="a-airport-transfer"[^>]*>([\s\S]*?)<\/td>/i)?.[1]
    const dropoffText = rowHtml.match(/class="a-city-transfer"[^>]*>([\s\S]*?)<\/td>/i)?.[1]
    const priceText = rowHtml.match(/class="a-text--price-transfer(?:__wrapper)?"[^>]*>([\s\S]*?)<\/td>/i)?.[1]
    const routeFrom = stripHtml(pickupText)
    const routeTo = stripHtml(dropoffText)
    const price = parseMoney(priceText)
    if (!currency || !routeFrom || !routeTo || price === null) continue
    const key = `${normalizeKey(routeFrom)}\u0000${normalizeKey(routeTo)}\u0000${currency}`
    if (seen.has(key)) continue
    seen.add(key)
    const pickup = locationForLabel(routeFrom, options, page, 'pickup')
    const dropoff = locationForLabel(routeTo, options, page, 'dropoff')
    rows.push({
      routeFrom,
      routeTo,
      pickupPlaceId: pickup.id,
      pickupLabel: pickup.label,
      dropoffPlaceId: dropoff.id,
      dropoffLabel: dropoff.label,
      currency,
      externalVehicleKey: 'private_vehicle_base',
      externalVehicleName: 'Private vehicle — published base price',
      maxPassengers: null,
      price,
      sourceUrl: page.sourceUrl,
      evidence: {
        sourceUrl: page.sourceUrl,
        country: page.country || null,
        city: page.city || null,
        disclosure: 'Total price per vehicle',
        capacityDisclosed: false,
        direction: 'published_airport_to_city'
      }
    })
  }
  return rows
}

function candidateMatches(inputText, candidateLabel) {
  const input = normalizeKey(inputText)
  const candidate = normalizeKey(candidateLabel)
  if (!input || !candidate) return false
  if (input === candidate) return true
  const inputIata = String(inputText || '').match(/\(([A-Z]{3})\)/)?.[1]
  if (inputIata && new RegExp(`\\b${inputIata}\\b`, 'i').test(String(candidateLabel || ''))) return true
  const stopwords = new Set(['airport', 'international', 'city', 'centre', 'center', 'downtown', 'hotel', 'station', 'terminal', 'of'])
  const meaningful = input.split(' ').filter((token) => token && !stopwords.has(token) && token !== inputIata?.toLowerCase())
  const candidateTokens = new Set(candidate.split(' ').filter(Boolean))
  if (meaningful.length === 1 && /city|centre|center|downtown/.test(candidate)) return candidateTokens.has(meaningful[0])
  if (!meaningful.length) return false
  return meaningful.filter((token) => candidateTokens.has(token)).length / meaningful.length >= 0.6
}

function extractCookies(headers) {
  if (typeof headers?.getSetCookie === 'function') return headers.getSetCookie()
  const combined = headers?.get?.('set-cookie') || ''
  return combined ? combined.split(/,(?=\s*[^;,]+=)/) : []
}

class CivitatisAdapter {
  constructor(config = {}, dependencies = {}) {
    this.baseUrl = String(config.baseUrl || CIVITATIS_DEFAULTS.baseUrl).replace(/\/+$/, '')
    this.supportedCurrencies = config.supportedCurrencies || CIVITATIS_DEFAULTS.supportedCurrencies
    this.requestDelayMs = Math.max(250, Number(config.requestDelayMs) || CIVITATIS_DEFAULTS.requestDelayMs)
    this.maxConcurrency = Math.max(1, Math.min(2, Number(config.maxConcurrency) || CIVITATIS_DEFAULTS.maxConcurrency))
    this.fetchImpl = dependencies.fetchImpl || global.fetch
    this.cookies = new Map()
    this.catalogRows = []
    this.catalogPages = null
    this.placeResolutionIsLocal = true
    this.quoteLookupIsLocal = true
  }

  cookieHeader() {
    return Array.from(this.cookies.entries()).map(([key, value]) => `${key}=${value}`).join('; ')
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
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'User-Agent': 'Mozilla/5.0 (compatible; Riderra public price research/1.0)',
            ...(this.cookieHeader() ? { Cookie: this.cookieHeader() } : {}),
            ...(options.headers || {})
          },
          signal: controller.signal
        })
        for (const raw of extractCookies(response.headers)) {
          const pair = String(raw).split(';')[0]
          const index = pair.indexOf('=')
          if (index > 0) this.cookies.set(pair.slice(0, index).trim(), pair.slice(index + 1).trim())
        }
        if (!response.ok) throw new Error(`Civitatis public page failed: HTTP ${response.status}`)
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
    if (!this.supportedCurrencies.includes(normalizedCurrency)) throw new Error(`Civitatis source does not support currency ${normalizedCurrency}`)
    const indexUrl = `${this.baseUrl}/en/transfers/`
    let response = await this.request(indexUrl)
    await response.text()
    this.cookies.set('currency', normalizedCurrency)
    this.cookies.set('civ_lang', 'en')
    response = await this.request(indexUrl, { headers: { Referer: indexUrl } })
    const html = await response.text()
    const servedCurrency = response.headers.get('x-currency') || html.match(/id="currencySelectorButton"[^>]+data-value="([A-Z]{3})"/i)?.[1]
    if (servedCurrency && servedCurrency !== normalizedCurrency) throw new Error(`Civitatis returned ${servedCurrency} instead of ${normalizedCurrency}`)
    this.catalogPages = parseCivitatisCatalogPages(html, this.baseUrl)
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
          const response = await this.request(page.sourceUrl, { headers: { Referer: `${this.baseUrl}/en/transfers/` } })
          const html = await response.text()
          const rows = parseCivitatisTransferPage(html, page)
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
      // Public tables describe pickup -> drop-off. Search pickup locations first,
      // then restrict the destination search to rows belonging to that pickup.
      const places = relatedPlaceId
        ? [{ id: row.dropoffPlaceId, label: row.dropoffLabel }]
        : [{ id: row.pickupPlaceId, label: row.pickupLabel }]
      for (const place of places) {
        if (place.id && place.label && candidateMatches(inputText, place.label)) candidates.set(place.id, { ...place, description: place.label })
      }
    }
    const rows = Array.from(candidates.values()).slice(0, 20)
    if (rows.length === 1) {
      return [{ ...rows[0], description: rows[0].label, label: String(inputText || '').trim() }]
    }
    return rows
  }

  normalizeVehicle(raw) {
    return raw
  }

  extractEvidence({ row }) {
    return { ...row.evidence, sourceUrl: row.sourceUrl, restoredFromPublicCatalog: true }
  }

  async fetchQuotes({ pickup, dropoff, currency }) {
    const normalizedCurrency = String(currency || '').toUpperCase()
    const matches = this.catalogRows.filter((row) => row.pickupPlaceId === pickup.id && row.dropoffPlaceId === dropoff.id && row.currency === normalizedCurrency)
    if (!matches.length) {
      const error = new Error('Civitatis does not publish this exact direction in its public price table')
      error.code = 'CATALOG_ROUTE_NOT_LISTED'
      throw error
    }
    const row = matches[0]
    return {
      quotes: matches.map((match) => ({
        externalVehicleKey: match.externalVehicleKey,
        externalVehicleName: match.externalVehicleName,
        maxPassengers: match.maxPassengers,
        price: match.price
      })),
      evidence: this.extractEvidence({ row })
    }
  }
}

module.exports = {
  CIVITATIS_DEFAULTS,
  CivitatisAdapter,
  candidateMatches,
  parseCivitatisCatalogPages,
  parseCivitatisTransferPage,
  parseMoney
}
