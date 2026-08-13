const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const pagePath = path.resolve(__dirname, '../../pages/admin-pricing.vue')
const source = fs.readFileSync(pagePath, 'utf8')

function extractMethod (startPattern, endPattern, methodName) {
  const match = source.match(new RegExp(`${startPattern}[\\s\\S]*?${endPattern}`))
  assert.ok(match, `${methodName} must remain discoverable in admin-pricing.vue`)
  const methodSource = match[0].replace(new RegExp(`${endPattern}$`), '')
  return Function(`"use strict"; return ({${methodSource}}).${methodName}`)()
}

test('Booking prices always display exactly two decimal places', () => {
  const priceLabel = extractMethod(
    "    priceLabel \\(value, currency = ''\\) \\{",
    ',\\n    priceAmountLabel',
    'priceLabel'
  )

  assert.equal(priceLabel(116.85600000000001, 'EUR'), '116.86 EUR')
  assert.equal(priceLabel(91, 'EUR'), '91.00 EUR')
})

test('the base price table renders a bounded first batch', () => {
  assert.match(source, /v-for="r in visibleBaseRows"/)
  assert.match(source, /visibleBaseRows \(\) \{[\s\S]*?slice\(0, this\.baseVisibleLimit\)/)
})

test('Booking calculation requests at most ten airports per page', async () => {
  const loadBookingCalculation = extractMethod(
    '    async loadBookingCalculation \\(page = 1, iata = \'\'\\) \\{',
    ',\\n    async loadSelectedBookingAirport',
    'loadBookingCalculation'
  )
  let requestedUrl = ''
  const context = {
    bookingCalculationBusy: false,
    bookingGeniusPercent: 5,
    bookingSource: null,
    bookingCalculation: null,
    bookingAirportOptions: [],
    bookingPage: 1,
    selectedBookingAirportKey: '',
    bookingScheduleForm: {},
    notice: '',
    q: '',
    async fetchJson (url) {
      requestedUrl = url
      return { airports: [], airportOptions: [], page: 1, source: { schedule: {} } }
    }
  }

  await loadBookingCalculation.call(context, 1)

  const url = new URL(requestedUrl, 'https://riderra.test')
  assert.ok(Number(url.searchParams.get('limit')) <= 10, `expected limit <= 10, received ${url.searchParams.get('limit')}`)
})

test('Booking setup shows the exact incremental distances entered in the portal', () => {
  assert.match(source, /band\.nextDistanceKm/)
  assert.match(source, /bookingNextDistance/)
  assert.match(source, /bookingAfterDistance/)
  assert.doesNotMatch(source, /`\$\{band\.fromKm\}–\$\{band\.toKm\}/)
})

test('pricing links can open the requested tab and Booking view directly', () => {
  assert.match(source, /applyRouteState \(\)/)
  assert.match(source, /this\.\$route\.query\.tab/)
  assert.match(source, /this\.\$route\.query\.bookingView/)
  assert.match(source, /\['matrix', 'portal'\]\.includes\(requestedBookingView\)/)
  assert.match(source, /mounted \(\) \{[\s\S]*?this\.applyRouteState\(\)[\s\S]*?this\.reloadAll\(\)/)
})
