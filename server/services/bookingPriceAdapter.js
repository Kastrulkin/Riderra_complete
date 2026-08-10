const BOOKING_DEFAULTS = Object.freeze({
  name: 'Rideways (Booking.com)',
  adapterKey: 'booking',
  baseUrl: 'https://taxis.booking.com',
  supportedCurrencies: ['EUR'],
  schedule: {
    weekday: 3,
    localTime: '12:00',
    minLeadDays: 7,
    monitoring: {
      priceWatchEnabled: true,
      frequency: 'daily',
      weekdays: [1, 2, 3, 4, 5, 6, 7],
      localTime: '08:00',
      timeZone: 'Europe/Moscow',
      lowRatio: 0.9,
      highRatio: 1.05,
      openCitiesHours: 24,
      allRoutesDays: 7
    }
  },
  passengers: { adults: 1, children: 0, returnJourney: false },
  pricingPolicy: { type: 'sequential_deductions', deductions: [25, 20], basis: 'client_sell' },
  formulaVersion: 'booking-v1',
  maxConcurrency: 2,
  requestDelayMs: 1200
})

const BROWSER_USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36'

function normalizeVehicleKey(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'unknown'
}

function encodePlaceId(placeId, type) {
  return `booking:${encodeURIComponent(type || 'point_of_interest')}:${placeId}`
}

function decodePlaceId(value) {
  const match = String(value || '').match(/^booking:([^:]+):(.+)$/)
  return match
    ? { type: decodeURIComponent(match[1]), placeId: match[2] }
    : { type: 'point_of_interest', placeId: String(value || '') }
}

function extractSetCookies(headers) {
  if (typeof headers?.getSetCookie === 'function') return headers.getSetCookie()
  const combined = headers?.get?.('set-cookie') || ''
  return combined ? combined.split(/,(?=\s*[^;,]+=)/) : []
}

function decodeAttribute(value) {
  return String(value || '')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function parseRateSearchUrl(html) {
  const match = String(html || '').match(/data-mb-react-component-name="TransportResultsWrapper"\s+data-mb-props="([^"]+)"/)
  if (!match) throw new Error('Booking search page did not expose the public rate request')
  const props = JSON.parse(decodeURIComponent(decodeAttribute(match[1])))
  if (!props.rateSearchURL) throw new Error('Booking public rate URL was not found')
  return props.rateSearchURL
}

function parseBookingQuotes(payload) {
  const results = (payload?.journeys || []).flatMap((journey) => journey.legs || []).flatMap((leg) => leg.results || [])
  const byClass = new Map()
  for (const result of results) {
    if (result.publicTransport || result.type !== 'CAR') continue
    const name = String(result.carDetails?.description || result.carDetails?.modelDescription || '').trim()
    const price = Number(result.price)
    if (!name || !Number.isFinite(price) || price < 0 || !result.currency) continue
    const key = normalizeVehicleKey(name)
    const quote = {
      externalVehicleKey: key,
      externalVehicleName: name,
      maxPassengers: Number.isFinite(Number(result.maxPassenger)) ? Number(result.maxPassenger) : null,
      price,
      currency: String(result.currency).toUpperCase(),
      exampleVehicle: result.carDetails?.modelDescription || result.carDetails?.model || null,
      drivingDistance: Number.isFinite(Number(result.drivingDistance)) ? Number(result.drivingDistance) : null,
      durationMinutes: Number.isFinite(Number(result.duration)) ? Number(result.duration) : null
    }
    if (!byClass.has(key) || quote.price < byClass.get(key).price) byClass.set(key, quote)
  }
  return Array.from(byClass.values())
}

class BookingSession {
  constructor(fetchImpl) {
    this.fetchImpl = fetchImpl
    this.cookies = new Map()
  }

  async request(url, options = {}, timeoutMs = 25000) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const cookie = Array.from(this.cookies.entries()).map(([key, value]) => `${key}=${value}`).join('; ')
      const response = await this.fetchImpl(url, {
        ...options,
        headers: {
          'Accept-Language': 'en-GB,en;q=0.9',
          'User-Agent': BROWSER_USER_AGENT,
          ...(options.headers || {}),
          ...(cookie ? { Cookie: cookie } : {})
        },
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
    try { return await fn() } catch (error) {
      lastError = error
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 600 * (2 ** (attempt - 1))))
    }
  }
  throw lastError
}

class BookingAdapter {
  constructor(config = {}, dependencies = {}) {
    this.baseUrl = String(config.baseUrl || BOOKING_DEFAULTS.baseUrl).replace(/\/+$/, '')
    this.supportedCurrencies = config.supportedCurrencies || BOOKING_DEFAULTS.supportedCurrencies
    this.fetchImpl = dependencies.fetchImpl || global.fetch
  }

  async resolvePlace(inputText) {
    const response = await retry(() => this.fetchImpl(`${this.baseUrl}/autocomplete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': BROWSER_USER_AGENT },
      body: JSON.stringify({ query: String(inputText || '').trim(), language: 'en-gb' })
    }))
    if (!response.ok) throw new Error(`Booking place search failed: HTTP ${response.status}`)
    const payload = await response.json()
    return (payload.results || []).map((row) => {
      const parts = [row.name, row.iata ? `(${row.iata})` : null, row.city, row.country].filter(Boolean)
      return {
        id: encodePlaceId(row.googlePlaceId, row.type),
        label: parts.join(', '),
        description: parts.join(', ')
      }
    }).filter((row) => row.id && row.label)
  }

  createBenchmarkPlace(point) {
    if (point?.source !== 'riderra_geo_zone' || !point.googlePlaceId || point.status !== 'verified') return null
    const isAirport = Boolean(point.airportIata) || /\bairport\b|\([A-Z]{3}\)/i.test(String(point.zoneName || ''))
    const label = point.geocodedAddress || point.destinationAddress || point.pickupAddress || point.zoneName
    return label ? { id: encodePlaceId(point.googlePlaceId, isAirport ? 'airport' : 'point_of_interest'), label } : null
  }

  normalizeVehicle(raw) {
    return { ...raw, externalVehicleKey: raw.externalVehicleKey || normalizeVehicleKey(raw.externalVehicleName) }
  }

  async fetchQuotes({ pickup, dropoff, serviceAt, currency, passengers = {} }) {
    const normalizedCurrency = String(currency || '').toUpperCase()
    if (!this.supportedCurrencies.includes(normalizedCurrency)) throw new Error(`Booking does not support currency ${normalizedCurrency}`)
    const pickupRef = decodePlaceId(pickup.id)
    const dropoffRef = decodePlaceId(dropoff.id)
    const date = serviceAt.toISOString().slice(0, 10)
    const totalPassengers = Math.max(1, Number(passengers.adults || 1) + Number(passengers.children || 0))
    const query = new URLSearchParams({
      date,
      dropoff: dropoffRef.placeId,
      dropoffType: dropoffRef.type,
      lang: 'en',
      passengers: String(totalPassengers),
      pickup: pickupRef.placeId,
      pickupType: pickupRef.type,
      time: '12:00',
      currency: normalizedCurrency
    })
    const searchUrl = `${this.baseUrl}/search/?${query}`
    const session = new BookingSession(this.fetchImpl)
    const html = await retry(async () => {
      const response = await session.request(searchUrl, { headers: { Accept: 'text/html,application/xhtml+xml' } })
      if (!response.ok) throw new Error(`Booking search page failed: HTTP ${response.status}`)
      return response.text()
    })
    if (/Human Verification|captcha-container/i.test(html)) {
      const error = new Error('Booking requires human verification for this request')
      error.code = 'BOOKING_HUMAN_VERIFICATION'
      throw error
    }
    const rateSearchUrl = parseRateSearchUrl(html)
    const payload = await retry(async () => {
      const response = await session.request(rateSearchUrl, { headers: { Accept: 'application/json', Referer: searchUrl } })
      const body = await response.text()
      if (/Human Verification|captcha-container/i.test(body)) {
        const error = new Error('Booking requires human verification for this request')
        error.code = 'BOOKING_HUMAN_VERIFICATION'
        throw error
      }
      if (!response.ok) throw new Error(`Booking public rate search failed: HTTP ${response.status}`)
      return JSON.parse(body)
    })
    const quotes = parseBookingQuotes(payload).filter((quote) => quote.currency === normalizedCurrency).map((quote) => this.normalizeVehicle(quote))
    if (!quotes.length) {
      const error = new Error('Booking returned no available vehicles')
      error.code = 'NO_QUOTES'
      throw error
    }
    return {
      quotes,
      evidence: {
        sourceUrl: searchUrl,
        quoteCount: quotes.length,
        publicRateEndpoint: new URL(rateSearchUrl).pathname,
        vehicles: quotes.map(({ externalVehicleKey, externalVehicleName, maxPassengers, exampleVehicle, drivingDistance, durationMinutes }) => ({
          externalVehicleKey, externalVehicleName, maxPassengers, exampleVehicle, drivingDistance, durationMinutes
        }))
      }
    }
  }
}

module.exports = {
  BOOKING_DEFAULTS,
  BookingAdapter,
  decodePlaceId,
  encodePlaceId,
  normalizeVehicleKey,
  parseBookingQuotes,
  parseRateSearchUrl
}
