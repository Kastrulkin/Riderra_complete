const WORLDTRANSFER_DEFAULTS = Object.freeze({
  name: 'WorldTransfer',
  adapterKey: 'worldtransfer',
  baseUrl: 'https://www.world-transfer.com',
  supportedCurrencies: ['EUR'],
  schedule: { weekday: 3, localTime: '12:00', minLeadDays: 7 },
  passengers: { adults: 1, children: 0, returnJourney: false },
  pricingPolicy: { type: 'client_commission', commissionPercent: 30 },
  formulaVersion: 'worldtransfer-v1',
  maxConcurrency: 1,
  requestDelayMs: 2500
})

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
  return stripHtml(value).toLowerCase().normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function encodePlace(label, type = 'address') {
  const place = { label: String(label || '').trim(), type: String(type || 'address') }
  if (!place.label) return null
  return `worldtransfer:${Buffer.from(JSON.stringify(place)).toString('base64url')}`
}

function decodePlace(value) {
  const encoded = String(value || '').match(/^worldtransfer:(.+)$/)?.[1]
  if (!encoded) return null
  try {
    const place = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'))
    return place?.label ? place : null
  } catch (_) {
    return null
  }
}

function candidateMatches(inputText, candidateLabel) {
  const input = normalizeKey(inputText)
  const candidate = normalizeKey(candidateLabel)
  if (!input || !candidate) return false
  const iata = String(inputText || '').match(/\(([A-Z]{3})\)/)?.[1]
    || String(inputText || '').match(/\b([A-Z]{3})\b/)?.[1]
  if (iata && new RegExp(`\\b${iata}\\b`, 'i').test(candidateLabel)) return true
  if (candidate.includes(input) || input.includes(candidate)) return true
  const stopwords = new Set(['airport', 'international', 'city', 'centre', 'center', 'downtown', 'hotel', 'station', 'terminal', 'the', 'of'])
  const tokens = input.split(' ').filter((token) => token && !stopwords.has(token) && token !== iata?.toLowerCase())
  const candidateTokens = new Set(candidate.split(' ').filter(Boolean))
  return tokens.length > 0 && tokens.filter((token) => candidateTokens.has(token)).length / tokens.length >= 0.75
}

function vehicleKey(name, capacity) {
  const normalized = normalizeKey(name)
  if (/premium economy.*(?:sedan|limousine)/.test(normalized)) return 'standard_car'
  if (/premium economy.*van/.test(normalized)) return `standard_minivan_${capacity || 7}`
  if (/business.*(?:sedan|limousine)/.test(normalized)) return 'business_car'
  if (/business.*van/.test(normalized)) return `businessvan_${capacity || 7}`
  if (/first.*(?:sedan|limousine)/.test(normalized)) return 'first_class_car'
  if (/first.*van/.test(normalized)) return `first_class_van_${capacity || 7}`
  return `${normalized.replace(/\s+/g, '_') || 'vehicle'}_${capacity || 0}`
}

function parseMoney(value) {
  const parsed = Number(String(value || '').replace(/[^0-9.,-]/g, '').replace(',', '.'))
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round((parsed + Number.EPSILON) * 100) / 100 : null
}

function parseWorldTransferQuotes(html) {
  const quotes = []
  const cards = String(html || '').split(/<div class="post(?:\s[^\"]*)?">/i).slice(1)
  for (const card of cards) {
    const action = card.match(/addToCart\(\s*([0-9.,]+)\s*,\s*'([^']+)'\)/i)
    if (!action) continue
    const price = parseMoney(action[1])
    const name = stripHtml(action[2])
    const passengers = Number(card.match(/fa-user[\s\S]{0,180}?x\s*(\d+)/i)?.[1]) || null
    const luggage = Number(card.match(/fa-suitcase[\s\S]{0,180}?x\s*(\d+)/i)?.[1]) || null
    const oldPrice = parseMoney(stripHtml(card.match(/class="oldprice"[^>]*>([\s\S]*?)<\/p>/i)?.[1]))
    const currency = /(?:€|&euro;|&#8364;)/i.test(card) ? 'EUR' : null
    if (!name || price === null || !currency) continue
    quotes.push({
      externalVehicleKey: vehicleKey(name, passengers),
      externalVehicleName: name,
      maxPassengers: passengers,
      maxLuggage: luggage,
      price,
      currency,
      undiscountedPrice: oldPrice
    })
  }
  return quotes
}

function extractHidden(html, name) {
  const escaped = String(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const tag = String(html || '').match(new RegExp(`<input[^>]+name=["']${escaped}["'][^>]*>`, 'i'))?.[0]
  return decodeHtml(tag?.match(/value=["']([^"']*)["']/i)?.[1] || '')
}

function updateCookieJar(jar, response) {
  const values = typeof response.headers.getSetCookie === 'function'
    ? response.headers.getSetCookie()
    : [response.headers.get('set-cookie')].filter(Boolean)
  for (const value of values) {
    const pair = String(value).match(/^\s*([^=;,\s]+)=([^;,]*)/)
    if (pair) jar.set(pair[1], pair[2])
  }
}

function cookieHeader(jar) {
  return Array.from(jar.entries()).map(([key, value]) => `${key}=${value}`).join('; ')
}

function serviceDate(value) {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) throw new Error('WorldTransfer service date is invalid')
  return [String(date.getUTCDate()).padStart(2, '0'), String(date.getUTCMonth() + 1).padStart(2, '0'), date.getUTCFullYear()].join('.')
}

class WorldTransferAdapter {
  constructor(config = {}, dependencies = {}) {
    this.baseUrl = String(config.baseUrl || WORLDTRANSFER_DEFAULTS.baseUrl).replace(/\/+$/, '')
    this.supportedCurrencies = config.supportedCurrencies || WORLDTRANSFER_DEFAULTS.supportedCurrencies
    this.fetchImpl = dependencies.fetchImpl || global.fetch
    this.minRequestIntervalMs = Math.max(0, Number(config.requestDelayMs ?? WORLDTRANSFER_DEFAULTS.requestDelayMs))
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
    } finally {
      release()
    }
  }

  async request(path, { method = 'GET', body, jar = new Map(), accept = 'text/html' } = {}) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 45000)
    try {
      const response = await this.fetchImpl(new URL(path, this.baseUrl), {
        method,
        body,
        redirect: 'follow',
        headers: {
          Accept: accept,
          'Accept-Language': 'en-US,en;q=0.8',
          ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' } : {}),
          ...(jar.size ? { Cookie: cookieHeader(jar) } : {}),
          Referer: `${this.baseUrl}/en/newbooking.html`,
          'User-Agent': USER_AGENT
        },
        signal: controller.signal
      })
      updateCookieJar(jar, response)
      if (!response.ok) {
        const error = new Error(`WorldTransfer public source failed: HTTP ${response.status}`)
        error.status = response.status
        throw error
      }
      return response
    } finally {
      clearTimeout(timer)
    }
  }

  async resolvePlace(inputText, relatedPlaceId) {
    const query = String(inputText || '').trim()
    if (!query) return []
    const related = decodePlace(relatedPlaceId)
    const body = new URLSearchParams({ transferquery: query, basequery: related?.label || '', gtbMODE: related ? 'destination' : 'start' })
    const response = await this.request('/BUS_ibe_2014/_func/get_location_json.php', { method: 'POST', body, accept: 'application/json' })
    const payload = await response.json()
    return (Array.isArray(payload) ? payload : [])
      .map((row) => ({ label: stripHtml(row.value || row.label), type: /airport/i.test(stripHtml(row.value || row.label)) ? 'airport' : 'address' }))
      .filter((row) => row.label && candidateMatches(query, row.label))
      .slice(0, 12)
      .map((row) => ({ ...row, id: encodePlace(row.label, row.type), description: row.label }))
  }

  createBenchmarkPlace(point) {
    const zoneLooksLikeAirport = /\bairport\b|\([A-Z]{3}\)|\b[A-Z]{3}\b/.test(String(point?.zoneName || ''))
    const label = zoneLooksLikeAirport
      ? (point.pickupAddress || point.geocodedAddress || point.destinationAddress)
      : (point.destinationAddress || point.geocodedAddress || point.pickupAddress)
    const id = encodePlace(label, zoneLooksLikeAirport ? 'airport' : 'address')
    return id ? { id, label, description: label, type: zoneLooksLikeAirport ? 'airport' : 'address' } : null
  }

  placeIdIsValid(value) { return Boolean(decodePlace(value)) }

  normalizeVehicle(raw) { return raw }

  async fetchQuotes({ pickup, dropoff, serviceAt, currency, passengers = {} }) {
    const requestedCurrency = String(currency || '').toUpperCase()
    if (!this.supportedCurrencies.includes(requestedCurrency)) throw new Error(`WorldTransfer does not support Riderra currency ${requestedCurrency}`)
    const from = decodePlace(pickup.id)
    const to = decodePlace(dropoff.id)
    if (!from || !to) throw new Error('WorldTransfer place mapping is invalid')

    let lastError
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      await this.waitForRateSlot()
      const jar = new Map()
      try {
        const startPage = await (await this.request('/en/newbooking.html', { jar })).text()
        const handlerName = startPage.match(/name=["'](handle_[a-f0-9]+)["']/i)?.[1]
        const handlerValue = handlerName ? extractHidden(startPage, handlerName) : ''
        const transferToken = extractHidden(startPage, 'gtb_post_handler_transfer_start')
        if (!handlerName || !handlerValue || !transferToken) throw new Error('WorldTransfer form token is missing')

        const routeBody = new URLSearchParams({
          startquery: from.label,
          zielquery: to.label,
          start_id: '',
          ziel_id: '',
          kind: 'ziel',
          pep_agency_nr: ''
        })
        const routeXml = await (await this.request('/BUS_ibe_2014/_func/get_transfercode.php', { method: 'POST', body: routeBody, jar, accept: 'application/xml' })).text()
        if (!/<transferstatus>1<\/transferstatus>/i.test(routeXml) || !/<calcstatus>1<\/calcstatus>/i.test(routeXml)) {
          const error = new Error('WorldTransfer returned no route')
          error.code = 'NO_QUOTES'
          throw error
        }

        const transferDate = serviceDate(serviceAt)
        const passengerCount = Math.max(1, Number(passengers.adults || 1) + Number(passengers.children || 0))
        const form = new URLSearchParams({
          ibe_rubrik2014: 'step_products',
          this_ibe_rubrik2014: '',
          [handlerName]: handlerValue,
          gtb_post_handler_transfer_start: transferToken,
          mitauswahl: '',
          agentur_nr: '',
          start_search: from.label,
          ziel_search: to.label,
          transfertag: transferDate,
          abholzeit_h: '12',
          abholzeit_m: '00',
          anzahl_pers: String(passengerCount),
          from_frontpage: '1',
          gt_wagenklasse: '',
          ibe_register_validate: '0',
          gtb_meldean: '0',
          places_start_id: '',
          places_ziel_id: '',
          do_geocoding_start: '0',
          do_geocoding_ziel: '0',
          highest_step: '',
          inp_GT_GS_code: 'DISCOUNT',
          gtb_post_handler_transfer_end: transferToken
        })
        const progress = await (await this.request('/BUS_ibe_2014/_func/gt_sys_progress.php', { method: 'POST', body: form, jar })).text()
        if (!progress.includes('_gt=')) throw new Error('WorldTransfer price-session token is missing')
        const resultPath = `/en/index.php?ibe_rubrik2014=step_products${progress}`
        const html = await (await this.request(resultPath, { jar })).text()
        const allQuotes = parseWorldTransferQuotes(html)
        const quotes = allQuotes.filter((quote) => quote.currency === requestedCurrency)
        if (!quotes.length) {
          const error = new Error(allQuotes.length ? `WorldTransfer returned ${allQuotes[0].currency} prices, Riderra route is ${requestedCurrency}` : 'WorldTransfer returned no available vehicles')
          error.code = allQuotes.length ? 'CURRENCY_MISMATCH' : 'NO_QUOTES'
          throw error
        }
        const discountPercent = Number(stripHtml(html.match(/Activated voucher code[\s\S]{0,300}?-\s*(\d+(?:\.\d+)?)\s*%/i)?.[1])) || null
        return {
          quotes,
          evidence: {
            sourceUrl: `${this.baseUrl}${resultPath}`,
            endpoint: '/BUS_ibe_2014/_func/gt_sys_progress.php',
            publicSearchOnly: true,
            bookingCreated: false,
            pickup: from.label,
            dropoff: to.label,
            serviceAt: new Date(serviceAt).toISOString(),
            passengerCount,
            voucherCode: /Voucher\s+DISCOUNT\s+redeemed/i.test(html) ? 'DISCOUNT' : null,
            displayedDiscountPercent: discountPercent,
            quoteCount: quotes.length,
            undiscountedPrices: Object.fromEntries(quotes.filter((quote) => quote.undiscountedPrice !== null).map((quote) => [quote.externalVehicleKey, quote.undiscountedPrice]))
          }
        }
      } catch (error) {
        lastError = error
        if (error.code === 'NO_QUOTES' || error.code === 'CURRENCY_MISMATCH') throw error
        if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 1000 * (2 ** (attempt - 1))))
      }
    }
    throw lastError
  }
}

module.exports = {
  WORLDTRANSFER_DEFAULTS,
  WorldTransferAdapter,
  candidateMatches,
  decodePlace,
  encodePlace,
  parseWorldTransferQuotes,
  serviceDate,
  vehicleKey
}
