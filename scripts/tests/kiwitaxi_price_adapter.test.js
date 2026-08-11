const test = require('node:test')
const assert = require('node:assert/strict')

const {
  KiwitaxiAdapter,
  candidateMatches,
  decodePlace,
  encodePlace,
  parseKiwitaxiQuotes
} = require('../../server/services/kiwitaxiPriceAdapter')
const { externalVehicleMatches } = require('../../server/services/priceComparisonService')

const html = `
  <form class="car-class-card best-choice" method="POST" action="/en/transfer/1">
    <p class="car-class-name">Minibus 7PAX</p>
    <p class="car-class-pax">7</p>
    <button class="car-class-select-button desktop primary-button-lg" type="submit">€90</button>
  </form>
  <form class="car-class-card" method="POST" action="/en/transfer/2">
    <p class="car-class-name">Business</p>
    <p class="car-class-pax">3</p>
    <button class="car-class-select-button desktop primary-button-lg" type="submit">€95</button>
  </form>`

test('Kiwitaxi parses public vehicle prices without submitting booking forms', () => {
  assert.deepEqual(parseKiwitaxiQuotes(html), [
    { externalVehicleKey: 'standard_minivan_7', externalVehicleName: 'Minibus 7PAX', maxPassengers: 7, price: 90, currency: 'EUR' },
    { externalVehicleKey: 'business_car', externalVehicleName: 'Business', maxPassengers: 3, price: 95, currency: 'EUR' }
  ])
})

test('Kiwitaxi matches airport IATA and stores self-contained place evidence', () => {
  const row = { id: 'internal:2999', type: 'airport', title: 'Helsinki Airport (HEL)', address: 'Helsinki Airport (HEL), Finland' }
  assert.equal(candidateMatches('Helsinki Vantaa Airport (HEL)', row), true)
  assert.deepEqual(decodePlace(encodePlace(row)), row)
})

test('Kiwitaxi uses only GET autocomplete and product search endpoints', async () => {
  const calls = []
  const adapter = new KiwitaxiAdapter({ requestDelayMs: 0 }, {
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), method: options.method })
      if (new URL(url).pathname.endsWith('/autocomplete')) {
        return { ok: true, status: 200, json: async () => [{ id: 'internal:2999', type: 'airport', title: 'Helsinki Airport (HEL)', address: 'Helsinki Airport (HEL), Finland' }] }
      }
      return { ok: true, status: 200, url: 'https://kiwitaxi.com/en/finland/test-route?ref=sf', text: async () => html }
    }
  })
  const pickupCandidates = await adapter.resolvePlace('Helsinki Airport (HEL)', null, { country: 'Finland' })
  const dropoff = { id: encodePlace({ id: 'internal:5874', type: 'train', title: 'Central Train Station Helsinki (HEC)', address: 'Central Train Station Helsinki (HEC), Finland' }), label: 'Central Train Station Helsinki (HEC)' }
  const result = await adapter.fetchQuotes({ pickup: pickupCandidates[0], dropoff, currency: 'EUR', serviceAt: new Date('2026-08-19T12:00:00Z'), passengers: { adults: 1, children: 0 } })
  assert.equal(result.quotes.length, 2)
  assert.equal(result.evidence.bookingCreated, false)
  assert.deepEqual(calls.map((call) => new URL(call.url).pathname), ['/en/search/autocomplete', '/en/product-search-v2'])
  assert.equal(calls.every((call) => call.method === 'GET'), true)
  assert.equal(calls.some((call) => /\/transfer\//.test(new URL(call.url).pathname)), false)
})

test('Kiwitaxi classes map only to matching Riderra classes', () => {
  assert.equal(externalVehicleMatches('kiwitaxi', 'standard_car', 'Standard class car'), true)
  assert.equal(externalVehicleMatches('kiwitaxi', 'business_car', 'Business class car'), true)
  assert.equal(externalVehicleMatches('kiwitaxi', 'standard_minivan_7', 'Standard minivan 7 pax'), true)
  assert.equal(externalVehicleMatches('kiwitaxi', 'business_car', 'Standard class car'), false)
})
