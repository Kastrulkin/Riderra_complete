const AIRPORTS_TAXI_TRANSFERS_DEFAULTS = Object.freeze({
  name: 'Airports Taxi Transfers',
  adapterKey: 'airports-taxi-transfers',
  baseUrl: 'https://airportstaxitransfers.com',
  supportedCurrencies: ['EUR'],
  schedule: { weekday: 3, localTime: '12:00', minLeadDays: 7 },
  passengers: { adults: 1, children: 0, returnJourney: false },
  pricingPolicy: { type: 'client_commission', commissionPercent: 30 },
  formulaVersion: 'airports-taxi-transfers-v1',
  maxConcurrency: 2,
  requestDelayMs: 1200
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
  return stripHtml(value).toLowerCase().normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\bcentre\b/g, 'center')
    .trim()
}

function encodePlace(row) {
  const place = {
    id: String(row.id),
    label: String(row.value || ''),
    typeId: String(row.type_id || ''),
    typeName: String(row.type_name || ''),
    latitude: Number.isFinite(Number(row.lat)) ? Number(row.lat) : null,
    longitude: Number.isFinite(Number(row.lng)) ? Number(row.lng) : null
  }
  return `airports-taxi-transfers:${Buffer.from(JSON.stringify(place)).toString('base64url')}`
}

function decodePlace(value) {
  const encoded = String(value || '').match(/^airports-taxi-transfers:(.+)$/)?.[1]
  if (!encoded) return null
  try {
    const place = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'))
    return place?.id && place?.label ? place : null
  } catch (_) {
    return null
  }
}

function meaningfulTokens(value) {
  const stopwords = new Set(['airport', 'international', 'city', 'centre', 'center', 'downtown', 'hotel', 'station', 'terminal', 'port', 'the', 'of'])
  return normalizeKey(value).split(' ').filter((token) => token && !stopwords.has(token))
}

function candidateScore(inputText, candidateLabel) {
  const input = normalizeKey(inputText)
  const candidate = normalizeKey(candidateLabel)
  if (!input || !candidate) return 0
  if (input === candidate) return 100
  const iata = String(inputText || '').match(/\(([A-Z]{3})\)/)?.[1]?.toLowerCase()
  if (iata && new RegExp(`\\b${iata}\\b`, 'i').test(candidateLabel)) return 95
  const inputTokens = meaningfulTokens(inputText).filter((token) => token !== iata)
  const candidateTokens = meaningfulTokens(candidateLabel)
  const candidateSet = new Set(candidateTokens)
  const overlap = inputTokens.filter((token) => candidateSet.has(token)).length
  let score = inputTokens.length ? (overlap / inputTokens.length) * 55 : 0
  const inputAirport = /\bairport\b/i.test(inputText)
  const candidateAirport = /\bairport\b/i.test(candidateLabel)
  const inputCity = /\b(city|centre|center|downtown)\b/i.test(inputText) || inputTokens.length === 1
  const candidateCity = /\b(city|centre|center|downtown)\b/i.test(candidateLabel)
  if (inputAirport === candidateAirport) score += 25
  else score -= 30
  if (inputCity && candidateCity) score += 15
  if (candidate.startsWith(`${input} `) || input.startsWith(`${candidate} `)) score += 10
  score -= Math.max(0, candidateTokens.length - inputTokens.length) * 1.5
  return score
}

function candidateIsPlausible(inputText, candidateLabel) {
  const input = normalizeKey(inputText)
  const candidate = normalizeKey(candidateLabel)
  if (!input || !candidate) return false
  const inputIata = String(inputText || '').match(/\(([A-Z]{3})\)/)?.[1]
  const candidateIata = String(candidateLabel || '').match(/\(([A-Z]{3})\)/)?.[1]
  const inputAirport = /\bairport\b/i.test(inputText) || Boolean(inputIata)
  const candidateAirport = /\bairport\b/i.test(candidateLabel)
  if (inputAirport) {
    if (!candidateAirport) return false
    if (inputIata && candidateIata && inputIata !== candidateIata) return false
  } else if (candidateAirport) {
    return false
  } else if (!(candidate === input || candidate.startsWith(`${input} `) || input.startsWith(`${candidate} `))) {
    return false
  }

  const entityKinds = ['restaurant', 'hotel', 'resort', 'station', 'terminal', 'rental', 'apartments', 'museum', 'mall', 'hospital', 'school']
  for (const kind of entityKinds) {
    if (new RegExp(`\\b${kind}\\b`, 'i').test(candidateLabel) && !new RegExp(`\\b${kind}\\b`, 'i').test(inputText)) return false
  }
  return true
}

function normalizeVehicleKey(name) {
  return normalizeKey(name).replace(/\s+/g, '_')
}

function parseQuotes(html) {
  const blocks = String(html || '').split(/<div class="vehicle_select selection-box__tile">/i).slice(1)
  const quotes = []
  for (const block of blocks) {
    const name = stripHtml(block.match(/<h2 class="vehicle--name">([\s\S]*?)<\/h2>/i)?.[1])
    const serviceClass = stripHtml(block.match(/<span class="vehicle--class">([\s\S]*?)<\/span>/i)?.[1])
    const priceNode = block.match(/<p class="[^"]*total-price[^"]*"[^>]*data-price="([\d.]+)"[^>]*>([\s\S]*?)<\/p>/i)
    const displayed = stripHtml(priceNode?.[2]).match(/\b([A-Z]{3})\s+([\d,.]+)/)
    const price = Number(priceNode?.[1] || displayed?.[2]?.replace(/,/g, ''))
    const currency = String(displayed?.[1] || '').toUpperCase()
    const maxPassengers = Number(block.match(/passengers[\s\S]*?<span class="car-more--value"[^>]*>\s*(\d+)\s*<\/span>/i)?.[1])
      || Number(name.match(/(\d+)\s*pax/i)?.[1])
      || null
    if (!name || !currency || !Number.isFinite(price) || price < 0) continue
    quotes.push({
      externalVehicleKey: normalizeVehicleKey(name),
      externalVehicleName: serviceClass ? `${name} — ${serviceClass}` : name,
      maxPassengers,
      price: Math.round((price + Number.EPSILON) * 100) / 100,
      currency
    })
  }
  return quotes
}

function serviceDateParts(serviceAt) {
  const date = serviceAt instanceof Date ? serviceAt : new Date(serviceAt)
  if (Number.isNaN(date.getTime())) throw new Error('Airports Taxi Transfers service date is invalid')
  return {
    date: `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${date.getUTCFullYear()}`,
    time: `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`
  }
}

function slugPart(label) {
  return String(label || '')
    .replace(/,/g, '')
    .replace(/[./"]/g, '')
    .replace(/&(?:amp;)?/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .split('---', 1)[0]
    .split('-(', 1)[0]
}

class AirportsTaxiTransfersAdapter {
  constructor(config = {}, dependencies = {}) {
    this.baseUrl = String(config.baseUrl || AIRPORTS_TAXI_TRANSFERS_DEFAULTS.baseUrl).replace(/\/+$/, '')
    this.supportedCurrencies = config.supportedCurrencies || AIRPORTS_TAXI_TRANSFERS_DEFAULTS.supportedCurrencies
    this.fetchImpl = dependencies.fetchImpl || global.fetch
    this.minRequestIntervalMs = Math.max(0, Number(config.requestDelayMs ?? AIRPORTS_TAXI_TRANSFERS_DEFAULTS.requestDelayMs))
    this.nextRequestAt = 0
    this.requestQueue = Promise.resolve()
    this.trustUniquePlaceCandidate = true
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

  async request(url, options = {}) {
    let lastError
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      await this.waitForRateSlot()
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 30000)
      try {
        const response = await this.fetchImpl(url, {
          ...options,
          headers: {
            Accept: options.accept || 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.8',
            'User-Agent': USER_AGENT,
            ...(options.headers || {})
          },
          signal: controller.signal
        })
        if (!response.ok) {
          const error = new Error(`Airports Taxi Transfers public source failed: HTTP ${response.status}`)
          error.status = response.status
          throw error
        }
        return response
      } catch (error) {
        lastError = error
        if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, [429, 503].includes(Number(error.status)) ? 30000 : 900 * (2 ** (attempt - 1))))
      } finally { clearTimeout(timer) }
    }
    throw lastError
  }

  async resolvePlace(inputText, relatedPlaceId = null, context = {}) {
    const query = String(inputText || '').trim()
    if (!query) return []
    const related = decodePlace(relatedPlaceId)
    const url = new URL('/', this.baseUrl)
    url.searchParams.set('r', String(Math.random()))
    url.searchParams.set('search', '1')
    url.searchParams.set('from', related ? '2' : '1')
    url.searchParams.set('add_on', '')
    if (related) url.searchParams.set('loc1_id', related.id)
    url.searchParams.set('term', query)
    const payload = await (await this.request(url, { accept: 'application/json' })).json()
    let rows = [...(payload?.all?.server || []), ...(payload?.all?.google || [])]
    const country = normalizeKey(context.country)
    if (country) {
      const countryRows = rows.filter((row) => normalizeKey(row.value).includes(country))
      if (countryRows.length) rows = countryRows
    }
    const unique = new Map()
    for (const row of rows) {
      if (row?.id == null || !row?.value) continue
      const score = candidateScore(query, row.value)
      if (score >= 45 && candidateIsPlausible(query, row.value)) unique.set(String(row.id), { row, score })
    }
    const ranked = [...unique.values()].sort((a, b) => b.score - a.score || String(a.row.value).localeCompare(String(b.row.value)))
    if (!ranked.length) return []
    const topScore = ranked[0].score
    return ranked.filter(({ score }) => score >= topScore - 3).slice(0, 12).map(({ row }) => ({
      id: encodePlace(row),
      label: row.value,
      description: row.type_name || '',
      type: String(row.type_name || '').toLowerCase().replace(/\s+/g, '_') || 'address'
    }))
  }

  normalizeVehicle(raw) { return raw }

  placeIdIsValid(value) { return Boolean(decodePlace(value)) }

  extractEvidence({ url, pickup, dropoff, serviceAt, quotes, passengers }) {
    return {
      sourceUrl: url,
      endpoint: '/transportation/taxibookings/',
      publicSearchOnly: true,
      bookingCreated: false,
      pickup: pickup.label,
      dropoff: dropoff.label,
      serviceAt: new Date(serviceAt).toISOString(),
      passengers: Number(passengers?.adults || 1),
      quoteCount: quotes.length
    }
  }

  async fetchQuotes({ pickup, dropoff, serviceAt, currency, passengers = {} }) {
    const requestedCurrency = String(currency || '').toUpperCase()
    if (!this.supportedCurrencies.includes(requestedCurrency)) throw new Error(`Airports Taxi Transfers does not support currency ${requestedCurrency}`)
    const from = decodePlace(pickup.id)
    const to = decodePlace(dropoff.id)
    if (!from || !to) throw new Error('Airports Taxi Transfers place mapping is invalid')
    const service = serviceDateParts(serviceAt)
    const path = `/transportation/taxibookings/Transfer-from-${slugPart(from.label)}-to-${slugPart(to.label)}`
    const url = new URL(path, this.baseUrl)
    const params = {
      loc1_name: from.label,
      loc2_name: to.label,
      pax1: Math.max(1, Number(passengers.adults || 1)),
      date1: service.date,
      date2: service.date,
      loc1: from.id,
      loc2: to.id,
      loc1_additional: 0,
      loc2_additional: 0,
      time1: service.time,
      time2: service.time,
      single: 1,
      quote: 1
    }
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value))
    const response = await this.request(url)
    const finalUrl = String(response.url || url)
    const html = await response.text()
    const quotes = parseQuotes(html).filter((quote) => quote.currency === requestedCurrency)
    if (!quotes.length) {
      const error = new Error('Airports Taxi Transfers returned no available vehicles')
      error.code = 'NO_QUOTES'
      throw error
    }
    return { quotes, evidence: this.extractEvidence({ url: finalUrl, pickup, dropoff, serviceAt, quotes, passengers }) }
  }
}

module.exports = {
  AIRPORTS_TAXI_TRANSFERS_DEFAULTS,
  AirportsTaxiTransfersAdapter,
  candidateScore,
  candidateIsPlausible,
  decodePlace,
  encodePlace,
  parseQuotes,
  serviceDateParts,
  slugPart
}
