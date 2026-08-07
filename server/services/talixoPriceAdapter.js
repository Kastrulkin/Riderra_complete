const TALIXO_DEFAULTS = Object.freeze({
  name: 'Talixo',
  adapterKey: 'talixo',
  baseUrl: 'https://talixo.com',
  supportedCurrencies: ['EUR', 'USD'],
  schedule: { weekday: 3, localTime: '12:00', minLeadDays: 7 },
  passengers: { adults: 1, children: 0, returnJourney: false },
  pricingPolicy: { type: 'client_commission', commissionPercent: 30 },
  formulaVersion: 'talixo-v1',
  maxConcurrency: 1,
  requestDelayMs: 900
})

const GEO_SERVICE_URL = 'https://geo-service.talixo.de'
const USER_AGENT = 'Mozilla/5.0 (compatible; Riderra public price research/1.0)'

function normalizeKey(value) {
  return String(value || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
}

function encodePlace(row) {
  const payload = {
    placeId: row.placeId,
    formattedAddress: row.formattedAddress,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    types: Array.isArray(row.types) ? row.types : [],
    iataCode: row.iataCode || null
  }
  return `talixo:${Buffer.from(JSON.stringify(payload)).toString('base64url')}`
}

function decodePlace(value) {
  const encoded = String(value || '').match(/^talixo:(.+)$/)?.[1]
  if (!encoded) return null
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'))
    if (!parsed?.placeId || !parsed?.formattedAddress || !Number.isFinite(Number(parsed.latitude)) || !Number.isFinite(Number(parsed.longitude))) return null
    return parsed
  } catch (_) {
    return null
  }
}

function candidateMatches(inputText, candidate) {
  const input = normalizeKey(inputText)
  const label = normalizeKey(candidate.description || candidate.formattedAddress)
  const iata = String(inputText || '').match(/\(([A-Z]{3})\)/)?.[1] || String(inputText || '').match(/\b([A-Z]{3})\b/)?.[1]
  if (iata && new RegExp(`\\b${iata}\\b`, 'i').test(`${candidate.description || ''} ${candidate.iataCode || ''}`)) return true
  if (!input || !label) return false
  if (input === label || label.startsWith(`${input} `)) return true
  const stopwords = new Set(['airport', 'international', 'city', 'centre', 'center', 'downtown', 'hotel', 'station', 'terminal', 'the', 'of'])
  const tokens = input.split(' ').filter((token) => token && !stopwords.has(token) && token !== iata?.toLowerCase())
  const candidateTokens = new Set(label.split(' ').filter(Boolean))
  return tokens.length > 0 && tokens.filter((token) => candidateTokens.has(token)).length / tokens.length >= 0.75
}

function decodeHtml(value) {
  return String(value || '')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&euro;|&#8364;/gi, '€')
    .replace(/&dollar;|&#36;/gi, '$')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&apos;/gi, "'")
}

function stripHtml(value) {
  return decodeHtml(String(value || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
}

function currencyFromSymbol(symbol) {
  if (symbol === '€') return 'EUR'
  if (symbol === '$' || /USD/i.test(symbol)) return 'USD'
  if (symbol === '£') return 'GBP'
  return String(symbol || '').trim().toUpperCase()
}

function parseTalixoQuotes(html) {
  const source = String(html || '')
  const blocks = [...source.matchAll(/<div class="booking-class booking-class-vehicles ([^"]+)"[^>]*data-booking-class="([^"]+)"[\s\S]*?(?=<div class="booking-class booking-class-vehicles |<\/div>\s*<\/div>\s*<h2|$)/g)]
  const quotes = []
  for (const match of blocks) {
    const block = match[0]
    const key = match[2]
    const name = stripHtml(block.match(/<h3 class="booking-class-header">([\s\S]*?)<\/h3>/i)?.[1])
    const priceMatch = stripHtml(block.match(/<span class="price[^">]*">([\s\S]*?)<\/span>/i)?.[1]).match(/^(€|\$|£|USD)\s*([\d.,]+)/i)
    if (!key || !name || !priceMatch) continue
    const price = Number(priceMatch[2].replace(/,/g, ''))
    if (!Number.isFinite(price) || price < 0) continue
    const vehicleModels = [...block.matchAll(/<li class="booking-class-description-vehicle[^>]*>([\s\S]*?)<\/li>/gi)].map((row) => stripHtml(row[1])).filter(Boolean)
    const capacityByKey = { economy: 3, business: 3, first_class: 3, economy_van: 7, business_van: 7, first_class_van: 7 }
    quotes.push({
      externalVehicleKey: normalizeKey(key).replace(/\s+/g, '_'),
      externalVehicleName: name,
      maxPassengers: capacityByKey[key] || null,
      price: Math.round((price + Number.EPSILON) * 100) / 100,
      currency: currencyFromSymbol(priceMatch[1]),
      vehicleModels
    })
  }
  return quotes
}

function extractSetCookies(headers) {
  if (typeof headers?.getSetCookie === 'function') return headers.getSetCookie()
  const combined = headers?.get?.('set-cookie') || ''
  return combined ? combined.split(/,(?=\s*[^;,]+=)/) : []
}

function mergeCookies(cookieJar, headers) {
  for (const raw of extractSetCookies(headers)) {
    const pair = String(raw).split(';', 1)[0]
    const index = pair.indexOf('=')
    if (index > 0) cookieJar.set(pair.slice(0, index).trim(), pair.slice(index + 1).trim())
  }
}

function cookieHeader(cookieJar) {
  return [...cookieJar.entries()].map(([key, value]) => `${key}=${value}`).join('; ')
}

function localDateParts(serviceAt) {
  const date = serviceAt instanceof Date ? serviceAt : new Date(serviceAt)
  if (Number.isNaN(date.getTime())) throw new Error('Talixo service date is invalid')
  return {
    date: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`,
    time: `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`
  }
}

class TalixoAdapter {
  constructor(config = {}, dependencies = {}) {
    this.baseUrl = String(config.baseUrl || TALIXO_DEFAULTS.baseUrl).replace(/\/+$/, '')
    this.geoServiceUrl = String(config.geoServiceUrl || GEO_SERVICE_URL).replace(/\/+$/, '')
    this.supportedCurrencies = config.supportedCurrencies || TALIXO_DEFAULTS.supportedCurrencies
    this.fetchImpl = dependencies.fetchImpl || global.fetch
  }

  async request(url, options = {}) {
    let lastError
    for (let attempt = 1; attempt <= 3; attempt++) {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 30000)
      try {
        return await this.fetchImpl(url, {
          ...options,
          headers: {
            Accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.8',
            'User-Agent': USER_AGENT,
            ...(options.headers || {})
          },
          signal: controller.signal
        })
      } catch (error) {
        lastError = error
        if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 800 * (2 ** (attempt - 1))))
      } finally {
        clearTimeout(timer)
      }
    }
    throw lastError
  }

  async resolvePlace(inputText) {
    const query = String(inputText || '').trim()
    if (!query) return []
    const autocompleteUrl = new URL('/api/v1/geoservice/place:autocomplete', this.geoServiceUrl)
    autocompleteUrl.searchParams.set('input', query)
    const response = await this.request(autocompleteUrl)
    if (!response.ok) throw new Error(`Talixo place search failed: HTTP ${response.status}`)
    const payload = await response.json()
    const predictions = (payload?.predictions || []).filter((row) => candidateMatches(query, row)).slice(0, 10)
    const candidates = []
    for (const prediction of predictions) {
      const detailsUrl = new URL('/api/v1/geoservice/place:details', this.geoServiceUrl)
      detailsUrl.searchParams.set('place_id', prediction.place_id)
      const detailsResponse = await this.request(detailsUrl)
      if (!detailsResponse.ok) continue
      const details = (await detailsResponse.json())?.result
      const location = details?.geometry?.location
      if (!details?.formatted_address || !location) continue
      const iataCode = prediction.description?.match(/\(([A-Z]{3})\)/)?.[1] || null
      const place = {
        placeId: prediction.place_id,
        formattedAddress: details.formatted_address,
        latitude: Number(location.lat),
        longitude: Number(location.lng),
        types: details.types || prediction.types || [],
        iataCode
      }
      candidates.push({
        id: encodePlace(place),
        label: iataCode ? `${details.name || prediction.structured_formatting?.main_text || prediction.description} (${iataCode})` : (details.name || prediction.structured_formatting?.main_text || prediction.description),
        description: details.formatted_address,
        iataCode
      })
    }
    const iata = query.match(/\(([A-Z]{3})\)/)?.[1]
    const exactIata = candidates.filter((row) => iata && row.iataCode === iata)
    return exactIata.length === 1 ? exactIata : candidates
  }

  normalizeVehicle(raw) { return raw }

  extractEvidence({ pickup, dropoff, quotes }) {
    return {
      sourceUrl: `${this.baseUrl}/booking/what/`,
      publicSearchOnly: true,
      bookingCreated: false,
      pickup: pickup.label,
      dropoff: dropoff.label,
      quoteCount: quotes.length
    }
  }

  async fetchQuotes({ pickup, dropoff, serviceAt, currency, passengers = {} }) {
    const normalizedCurrency = String(currency || '').toUpperCase()
    if (!this.supportedCurrencies.includes(normalizedCurrency)) throw new Error(`Talixo does not support currency ${normalizedCurrency}`)
    const pickupPlace = decodePlace(pickup.id)
    const dropoffPlace = decodePlace(dropoff.id)
    if (!pickupPlace || !dropoffPlace) throw new Error('Talixo place mapping is invalid')
    const cookieJar = new Map()
    const landingResponse = await this.request(`${this.baseUrl}/`)
    if (!landingResponse.ok) throw new Error(`Talixo public form failed: HTTP ${landingResponse.status}`)
    mergeCookies(cookieJar, landingResponse.headers)
    const landingHtml = await landingResponse.text()
    const csrfToken = landingHtml.match(/name="csrfmiddlewaretoken" value="([^"]+)"/)?.[1]
    if (!csrfToken) throw new Error('Talixo CSRF token was not found')
    const local = localDateParts(serviceAt)
    const body = new URLSearchParams({
      csrfmiddlewaretoken: csrfToken,
      start_point: pickup.label,
      end_point: dropoff.label,
      start_point_house_number: '',
      end_point_house_number: '',
      flight_number: pickupPlace.iataCode ? 'No flight' : '',
      departure_city: '',
      start_time_date: local.date,
      start_time_time: local.time,
      promo_code: '',
      affiliate_reference: '',
      passengers: String(Math.max(1, Number(passengers.adults || 1))),
      luggage: '1',
      sport_luggage: '0',
      animals: '0',
      kids_0: '0', kids_1: '0', kids_2: '0', duration: '1',
      geocoded_start_point: pickupPlace.formattedAddress,
      start_latitude: String(pickupPlace.latitude), start_longitude: String(pickupPlace.longitude),
      end_latitude: String(dropoffPlace.latitude), end_longitude: String(dropoffPlace.longitude),
      start_iata_code: pickupPlace.iataCode || '', end_iata_code: dropoffPlace.iataCode || '',
      start_talixo_id: '', end_talixo_id: '', landing_page: 'T',
      start_place_id: pickupPlace.placeId, end_place_id: dropoffPlace.placeId,
      end_point_types: (dropoffPlace.types || []).join(',')
    })
    const quoteResponse = await this.request(`${this.baseUrl}/booking/when/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Origin: this.baseUrl,
        Referer: `${this.baseUrl}/`,
        Cookie: cookieHeader(cookieJar)
      },
      body: body.toString()
    })
    if (quoteResponse.status === 202 && quoteResponse.headers?.get?.('x-amzn-waf-action') === 'challenge') {
      const error = new Error('Talixo requires a browser challenge for public quote requests')
      error.code = 'BROWSER_CHALLENGE_REQUIRED'
      throw error
    }
    if (!quoteResponse.ok) throw new Error(`Talixo quote search failed: HTTP ${quoteResponse.status}`)
    const html = await quoteResponse.text()
    const quotes = parseTalixoQuotes(html).filter((quote) => quote.currency === normalizedCurrency)
    if (!quotes.length) {
      const error = new Error('Talixo returned no available vehicles')
      error.code = 'NO_QUOTES'
      throw error
    }
    return { quotes, evidence: this.extractEvidence({ pickup, dropoff, quotes }) }
  }
}

module.exports = {
  TALIXO_DEFAULTS,
  TalixoAdapter,
  candidateMatches,
  decodePlace,
  encodePlace,
  localDateParts,
  parseTalixoQuotes
}
