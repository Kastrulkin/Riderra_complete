const TRANSFERISE_DEFAULTS = Object.freeze({
  name: 'Transferise',
  adapterKey: 'transferise',
  baseUrl: 'https://transferise.com',
  supportedCurrencies: ['EUR'],
  schedule: { weekday: 3, localTime: '12:00', minLeadDays: 7 },
  passengers: { adults: 1, children: 0, returnJourney: false },
  pricingPolicy: { type: 'client_commission', commissionPercent: 30 },
  formulaVersion: 'transferise-v1',
  maxConcurrency: 1,
  requestDelayMs: 2500
})

const USER_AGENT = 'Mozilla/5.0 (compatible; Riderra public price research/1.0)'

function decodeHtml(value) {
  return String(value || '').replace(/&quot;/gi, '"').replace(/&#039;|&apos;/gi, "'").replace(/&amp;/gi, '&').replace(/\\\//g, '/')
}

function normalizeKey(value) {
  return String(value || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
}

function encodePlace(place = {}) {
  if (!place.label || !Number.isFinite(Number(place.latitude)) || !Number.isFinite(Number(place.longitude))) return null
  return `transferise:${Buffer.from(JSON.stringify(place)).toString('base64url')}`
}

function decodePlace(value) {
  const encoded = String(value || '').match(/^transferise:(.+)$/)?.[1]
  if (!encoded) return null
  try {
    const place = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'))
    return place?.label && Number.isFinite(Number(place.latitude)) && Number.isFinite(Number(place.longitude)) ? place : null
  } catch (_) { return null }
}

function vehicleKey(name, capacity) {
  const normalized = normalizeKey(name)
  if (/vip.*vito|executive.*van|business.*van/.test(normalized)) return `businessvan_${capacity || 5}`
  if (/vip|executive|business/.test(normalized) && !/van|minibus/.test(normalized)) return 'business_car'
  if (/minibus|bus|coach/.test(normalized)) return `standard_minibus_${capacity || 0}`
  if (/minivan|van|mpv/.test(normalized)) return `standard_minivan_${capacity || 0}`
  if (/sedan|saloon|standard/.test(normalized)) return 'standard_car'
  return `${normalized.replace(/\s+/g, '_') || 'vehicle'}_${capacity || 0}`
}

function parseTransferiseQuotes(html) {
  const quotes = []
  const matches = String(html || '').matchAll(/class="trs21-car"\s+data-vehicle='([^']+)'/gi)
  for (const match of matches) {
    try {
      const row = JSON.parse(decodeHtml(match[1]))
      const price = Number(row.price_raw ?? row.price)
      const capacity = Number(row.cap_total ?? row.cap_adult) || null
      if (!row.name || !Number.isFinite(price) || price < 0 || !row.currency) continue
      quotes.push({
        externalVehicleKey: vehicleKey(row.name, capacity),
        externalVehicleName: row.name,
        maxPassengers: capacity,
        maxLuggage: Number(row.cap_bags) || null,
        price,
        currency: String(row.currency).toUpperCase()
      })
    } catch (_) {}
  }
  return quotes
}

class TransferiseAdapter {
  constructor(config = {}, dependencies = {}) {
    this.baseUrl = String(config.baseUrl || TRANSFERISE_DEFAULTS.baseUrl).replace(/\/+$/, '')
    this.supportedCurrencies = config.supportedCurrencies || TRANSFERISE_DEFAULTS.supportedCurrencies
    this.fetchImpl = dependencies.fetchImpl || global.fetch
    this.minRequestIntervalMs = Math.max(0, Number(config.requestDelayMs ?? TRANSFERISE_DEFAULTS.requestDelayMs))
    this.nextRequestAt = 0
    this.requestQueue = Promise.resolve()
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
    } finally { release() }
  }

  async request(url) {
    let lastError
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      await this.waitForRateSlot()
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 40000)
      try {
        const response = await this.fetchImpl(url, { redirect: 'follow', headers: { Accept: 'text/html', 'Accept-Language': 'en-US,en;q=0.8', 'User-Agent': USER_AGENT }, signal: controller.signal })
        if (!response.ok) { const error = new Error(`Transferise public source failed: HTTP ${response.status}`); error.status = response.status; throw error }
        return response
      } catch (error) {
        lastError = error
        if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 800 * (2 ** (attempt - 1))))
      } finally { clearTimeout(timer) }
    }
    throw lastError
  }

  async resolvePlace() { return [] }

  createBenchmarkPlace(point = {}) {
    const label = point.geocodedAddress || point.destinationAddress || point.pickupAddress || point.zoneName
    const id = encodePlace({ label, latitude: Number(point.latitude), longitude: Number(point.longitude) })
    return id ? { id, label, description: label, type: /airport|\b[A-Z]{3}\b/.test(label) ? 'airport' : 'address' } : null
  }

  placeIdIsValid(value) { return Boolean(decodePlace(value)) }
  normalizeVehicle(raw) { return raw }

  async fetchQuotes({ pickup, dropoff, serviceAt, currency, passengers = {} }) {
    const requestedCurrency = String(currency || '').toUpperCase()
    if (!this.supportedCurrencies.includes(requestedCurrency)) throw new Error(`Transferise does not support Riderra currency ${requestedCurrency}`)
    const from = decodePlace(pickup.id)
    const to = decodePlace(dropoff.id)
    if (!from || !to) throw new Error('Transferise place mapping is invalid')
    const date = new Date(serviceAt)
    if (!Number.isFinite(date.getTime())) throw new Error('Transferise service date is invalid')
    const params = new URLSearchParams({
      from: from.label,
      to: to.label,
      fromLat: String(from.latitude),
      fromLng: String(from.longitude),
      toLat: String(to.latitude),
      toLng: String(to.longitude),
      date: date.toISOString().slice(0, 10),
      time: date.toISOString().slice(11, 16),
      type: 'oneway',
      pax: `${Math.max(1, Number(passengers.adults) || 1)}/${Math.max(0, Number(passengers.children) || 0)}/0`,
      currency: requestedCurrency
    })
    const sourceUrl = `${this.baseUrl}/search/?${params}`
    const html = await (await this.request(sourceUrl)).text()
    const quotes = parseTransferiseQuotes(html).filter((quote) => quote.currency === requestedCurrency)
    if (!quotes.length) { const error = new Error('Transferise returned no available vehicles'); error.code = 'NO_QUOTES'; throw error }
    return {
      quotes,
      evidence: { sourceUrl, endpoint: '/search/', publicSearchOnly: true, bookingCreated: false, pickup: from.label, dropoff: to.label, serviceAt: date.toISOString(), quoteCount: quotes.length }
    }
  }
}

module.exports = { TRANSFERISE_DEFAULTS, TransferiseAdapter, decodePlace, encodePlace, parseTransferiseQuotes, vehicleKey }
