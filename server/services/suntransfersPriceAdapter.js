const https = require('https')
const { SocksProxyAgent } = require('socks-proxy-agent')

const outboundProxyUrl = String(process.env.SUNTRANSFERS_PROXY_URL || process.env.TELEGRAM_PROXY_URL || '').trim()
const outboundProxyAgent = outboundProxyUrl ? new SocksProxyAgent(outboundProxyUrl) : null

const SUNTRANSFERS_DEFAULTS = Object.freeze({
  name: 'Suntransfers',
  adapterKey: 'suntransfers',
  baseUrl: 'https://www.suntransfers.com',
  supportedCurrencies: ['EUR'],
  schedule: { weekday: 3, localTime: '12:00', minLeadDays: 7 },
  passengers: { adults: 1, children: 0, returnJourney: false },
  pricingPolicy: { type: 'client_commission', commissionPercent: 30 },
  formulaVersion: 'suntransfers-v1',
  maxConcurrency: 2,
  requestDelayMs: 700
})

const LOCATION_API_URL = 'https://api-locations.suntransfers.com'
const BOOKING_URL = 'https://booking.suntransfers.com'
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
  return decodeHtml(String(value || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
}

function normalizeKey(value) {
  return stripHtml(value).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
}

function externalVehicleKey(code, name) {
  return String(code || name || 'unknown').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'unknown'
}

function encodeGateway(row) {
  return `suntransfers:gateway:${row.id}:${row.alternateId}:${row.iataCode || ''}`
}

function decodeGateway(value) {
  const match = String(value || '').match(/^suntransfers:gateway:(\d+):([^:]+):([^:]*)$/)
  return match ? { id: Number(match[1]), code: match[2], iataCode: match[3] } : null
}

function encodeDestination(gatewayId, row) {
  return `suntransfers:destination:${gatewayId}:${row.id}:${row.code}`
}

function decodeDestination(value) {
  const match = String(value || '').match(/^suntransfers:destination:(\d+):(\d+):([^:]+)$/)
  return match ? { gatewayId: Number(match[1]), id: Number(match[2]), code: match[3] } : null
}

function parseSuntransfersQuotes(html) {
  const source = String(html || '')
  const starts = [...source.matchAll(/<div class="o-media c-media qa-vehicles__vehicle[\s\S]*?id="vehicle_list_item_\d+"/g)].map((match) => match.index)
  const quotes = []
  for (let index = 0; index < starts.length; index++) {
    const block = source.slice(starts[index], starts[index + 1] || source.indexOf('</section>', starts[index]))
    const name = stripHtml(block.match(/(?:m-product-list__title|c-media__title)[^>]*>([\s\S]*?)<\//i)?.[1])
    const code = block.match(/data-code="([^"]+)"/i)?.[1]
    const price = Number(block.match(/data-base-price="([\d.]+)"/i)?.[1])
    const maxPassengers = Number(stripHtml(block).match(/Up to (\d+) passengers/i)?.[1])
    if (!name || !Number.isFinite(price) || price < 0) continue
    quotes.push({
      externalVehicleKey: externalVehicleKey(code, name),
      externalVehicleName: name,
      maxPassengers: Number.isFinite(maxPassengers) ? maxPassengers : null,
      price: Math.round((price + Number.EPSILON) * 100) / 100,
      currency: 'EUR',
      vehicleCode: code || null
    })
  }
  return quotes
}

function extractSetCookies(headers) {
  if (typeof headers?.getSetCookie === 'function') return headers.getSetCookie()
  const combined = headers?.get?.('set-cookie') || ''
  return combined ? combined.split(/,(?=\s*[^;,]+=)/) : []
}

function nativeFetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const rawBody = options.body == null ? null : String(options.body)
    const headers = { ...(options.headers || {}) }
    if (rawBody !== null && !Object.keys(headers).some((key) => key.toLowerCase() === 'content-length')) {
      headers['Content-Length'] = Buffer.byteLength(rawBody)
    }
    const request = https.request(url, {
      method: options.method || 'GET',
      headers,
      ...(outboundProxyAgent ? { agent: outboundProxyAgent } : { family: 4 })
    }, (response) => {
      const chunks = []
      response.on('data', (chunk) => chunks.push(chunk))
      response.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8')
        const responseHeaders = {
          get(name) {
            const value = response.headers[String(name || '').toLowerCase()]
            return Array.isArray(value) ? value.join(', ') : (value == null ? null : String(value))
          },
          getSetCookie() {
            const value = response.headers['set-cookie']
            return Array.isArray(value) ? value : (value ? [String(value)] : [])
          }
        }
        resolve({
          ok: response.statusCode >= 200 && response.statusCode < 300,
          status: response.statusCode,
          headers: responseHeaders,
          text: async () => body,
          json: async () => JSON.parse(body)
        })
      })
    })
    request.on('error', reject)
    if (options.signal) {
      const abort = () => request.destroy(new Error('Suntransfers request aborted'))
      if (options.signal.aborted) abort()
      else options.signal.addEventListener('abort', abort, { once: true })
    }
    if (rawBody !== null) request.write(rawBody)
    request.end()
  })
}

function candidateMatches(inputText, candidate) {
  const iata = String(inputText || '').match(/\(([A-Z]{3})\)/)?.[1]
  if (iata && candidate.iataCode === iata) return true
  const input = normalizeKey(inputText)
  const label = normalizeKey(candidate.name || candidate.label)
  if (!input || !label) return false
  if (input === label || input.includes(label) || label.includes(input)) return true
  const stopwords = new Set(['airport', 'international', 'city', 'centre', 'center', 'downtown', 'all', 'areas', 'the', 'of'])
  const tokens = input.split(' ').filter((token) => token && !stopwords.has(token) && token !== iata?.toLowerCase())
  const candidateTokens = new Set(label.split(' ').filter(Boolean))
  return tokens.length > 0 && tokens.filter((token) => candidateTokens.has(token)).length / tokens.length >= 0.7
}

class SuntransfersAdapter {
  constructor(config = {}, dependencies = {}) {
    this.baseUrl = String(config.baseUrl || SUNTRANSFERS_DEFAULTS.baseUrl).replace(/\/+$/, '')
    this.locationApiUrl = String(config.locationApiUrl || LOCATION_API_URL).replace(/\/+$/, '')
    this.bookingUrl = String(config.bookingUrl || BOOKING_URL).replace(/\/+$/, '')
    this.supportedCurrencies = config.supportedCurrencies || SUNTRANSFERS_DEFAULTS.supportedCurrencies
    this.fetchImpl = dependencies.fetchImpl || nativeFetch
    this.gateways = null
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
            Accept: 'application/json,text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en',
            Origin: this.baseUrl,
            Referer: `${this.baseUrl}/`,
            'User-Agent': USER_AGENT,
            ...(options.headers || {})
          },
          signal: controller.signal
        })
        if (response.status >= 500) throw new Error(`Suntransfers public source failed: HTTP ${response.status}`)
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

  async loadGateways() {
    if (this.gateways) return this.gateways
    const response = await this.request(`${this.locationApiUrl}/gateways?revamp=1&cache_version=v1.0`)
    if (!response.ok) throw new Error(`Suntransfers gateway search failed: HTTP ${response.status}`)
    this.gateways = await response.json()
    return this.gateways
  }

  async resolvePlace(inputText, relatedPlaceId = null) {
    if (!relatedPlaceId) {
      const gateways = await this.loadGateways()
      return gateways.filter((row) => candidateMatches(inputText, row)).slice(0, 20).map((row) => ({
        id: encodeGateway(row),
        label: `${row.name}${row.iataCode ? ` (${row.iataCode})` : ''}`,
        description: [row.name, row.country].filter(Boolean).join(', '),
        iataCode: row.iataCode || null
      }))
    }
    const gateway = decodeGateway(relatedPlaceId)
    if (!gateway) return []
    const input = String(inputText || '').trim()
    const searchTerms = Array.from(new Set([
      input,
      input.replace(/\b(?:district|thailand)\b/gi, ' ').replace(/\s+/g, ' ').trim(),
      input.replace(/[-']/g, ' ').replace(/\s+/g, ' ').trim()
    ].filter(Boolean)))
    let response
    let lastError
    for (const searchTerm of searchTerms) {
      const query = new URLSearchParams({ search_term: searchTerm, max_results: '20', cache_version: 'v1.0' })
      try {
        response = await this.request(`${this.locationApiUrl}/gateways/${gateway.id}/destinations?${query}`)
        if (response.ok) break
        lastError = new Error(`Suntransfers destination search failed: HTTP ${response.status}`)
      } catch (error) {
        lastError = error
      }
    }
    if (!response?.ok) throw lastError || new Error('Suntransfers destination search failed')
    const payload = await response.json()
    const matches = [...(payload.locations || []), ...(payload.hotels || [])]
      .filter((row) => candidateMatches(inputText, row))
    const exact = matches.filter((row) => normalizeKey(row.name) === normalizeKey(inputText))
    return (exact.length === 1 ? exact : matches)
      .slice(0, 20)
      .map((row) => ({
        id: encodeDestination(gateway.id, { ...row, code: row.code || row.location?.code }),
        label: exact.length === 1 ? String(inputText || '').trim() : row.name,
        description: row.address ? `${row.name}, ${row.address}` : row.name
      }))
  }

  normalizeVehicle(raw) { return raw }

  async fetchQuotes({ pickup, dropoff, serviceAt, currency, passengers = {} }) {
    const normalizedCurrency = String(currency || '').toUpperCase()
    if (!this.supportedCurrencies.includes(normalizedCurrency)) throw new Error(`Suntransfers does not support currency ${normalizedCurrency}`)
    const gateway = decodeGateway(pickup.id)
    const destination = decodeDestination(dropoff.id)
    if (!gateway || !destination || gateway.id !== destination.gatewayId) {
      const error = new Error('Suntransfers public form requires an airport, port, or station as the pickup point')
      error.code = 'CATALOG_ROUTE_NOT_LISTED'
      throw error
    }
    const date = serviceAt instanceof Date ? serviceAt : new Date(serviceAt)
    const day = String(date.getUTCDate())
    const month = String(date.getUTCMonth() + 1)
    const year = String(date.getUTCFullYear())
    const hours = String(date.getUTCHours()).padStart(2, '0')
    const minutes = String(date.getUTCMinutes()).padStart(2, '0')
    const adults = Math.max(1, Number(passengers.adults || 1))
    const children = Math.max(0, Number(passengers.children || 0))
    const body = new URLSearchParams({
      'booking[form_get_quote_now_l]': '',
      'booking[f_departure]': gateway.code,
      'booking[f_arrival]': destination.code,
      'booking[f_fromto]': 'ar_1',
      'booking[f_outbound_day]': day,
      'booking[f_outbound_month]': `${month}-${year}`,
      'booking[f_outbound_date]': `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`,
      'booking[f_outbound_hours]': hours,
      'booking[f_outbound_minutes]': minutes,
      'booking[f_outbound_time]': `${hours}:${minutes}`,
      'booking[f_pax]': String(adults + children),
      'booking[f_adults]': String(adults),
      'booking[f_children]': String(children),
      'booking[f_infants]': '0',
      'booking[avoid_shared_vehicles]': 'false',
      searchDateTime: String(Date.now()),
      step: '1'
    })
    const requestUrl = `${this.bookingUrl}/en/booking?step=1&iata=${encodeURIComponent(gateway.iataCode)}&fromNoMatches=0`
    const first = await this.request(requestUrl, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    })
    if (![301, 302, 303, 307, 308].includes(first.status)) throw new Error(`Suntransfers quote search failed: HTTP ${first.status}`)
    const location = first.headers.get('location')
    if (!location) throw new Error('Suntransfers quote search did not return a public result URL')
    const cookies = new Map()
    const saveCookies = (response) => extractSetCookies(response.headers).forEach((raw) => {
      const pair = String(raw).split(';')[0]
      const separator = pair.indexOf('=')
      if (separator > 0) cookies.set(pair.slice(0, separator), pair.slice(separator + 1))
    })
    saveCookies(first)
    let resultUrl = new URL(location, this.bookingUrl).toString()
    let result
    for (let redirect = 0; redirect < 4; redirect++) {
      const cookie = Array.from(cookies.entries()).map(([key, value]) => `${key}=${value}`).join('; ')
      result = await this.request(resultUrl, { headers: { ...(cookie ? { Cookie: cookie } : {}), Referer: requestUrl } })
      saveCookies(result)
      if (![301, 302, 303, 307, 308].includes(result.status)) break
      const nextLocation = result.headers.get('location')
      if (!nextLocation) break
      resultUrl = new URL(nextLocation, resultUrl).toString()
    }
    if (!result.ok) throw new Error(`Suntransfers public results failed: HTTP ${result.status}`)
    const html = await result.text()
    const quotes = parseSuntransfersQuotes(html)
    if (!quotes.length) {
      const error = new Error('Suntransfers returned no available vehicles')
      error.code = 'NO_QUOTES'
      throw error
    }
    return {
      quotes,
      evidence: {
        sourceUrl: resultUrl,
        publicSearchOnly: true,
        bookingCreated: false,
        quoteCount: quotes.length,
        vehicles: quotes.map(({ externalVehicleKey, externalVehicleName, maxPassengers, vehicleCode }) => ({ externalVehicleKey, externalVehicleName, maxPassengers, vehicleCode }))
      }
    }
  }
}

module.exports = {
  SUNTRANSFERS_DEFAULTS,
  SuntransfersAdapter,
  candidateMatches,
  decodeDestination,
  decodeGateway,
  encodeDestination,
  encodeGateway,
  nativeFetch,
  parseSuntransfersQuotes
}
