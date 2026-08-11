const test = require('node:test')
const assert = require('node:assert/strict')

const {
  IwayAdapter,
  candidateMatches,
  decodePlace,
  normalizeQuotes
} = require('../../server/services/iwayPriceAdapter')
const { externalVehicleMatches } = require('../../server/services/priceComparisonService')

function price({ title = 'Standard', capacity = 3, price = 71.4, currency = 'EUR', id = 1 } = {}) {
  return {
    price_id: id,
    price,
    currency,
    distance: 19.742,
    car_class: { title, capacity, luggage_capacity: 3, models: ['Test model'] }
  }
}

test('iWay matches exact airport IATA and rejects an unrelated node', () => {
  assert.equal(candidateMatches('Helsinki Airport (HEL)', { description: 'Airport Helsinki-Vantaa', country: 'Finland', iata: 'HEL' }), true)
  assert.equal(candidateMatches('Helsinki Airport (HEL)', { description: 'Tallinn Airport', country: 'Estonia', iata: 'TLL' }), false)
})

test('iWay keeps the lowest public price per vehicle class', () => {
  const quotes = normalizeQuotes({ result: [
    price({ price: 75 }),
    price({ price: 71.4, id: 2 }),
    price({ title: 'Business', price: 111.3, id: 3 }),
    price({ title: 'Minivan', capacity: 6, price: 106.05, id: 4 })
  ] })
  assert.deepEqual(quotes.map((row) => [row.externalVehicleKey, row.price]), [
    ['standard_car', 71.4],
    ['business_car', 111.3],
    ['standard_minivan_6', 106.05]
  ])
})

test('iWay uses only its public place and price endpoints', async () => {
  const calls = []
  const adapter = new IwayAdapter({ minRequestIntervalMs: 0 }, {
    fetchImpl: async (url) => {
      calls.push(String(url))
      if (new URL(url).pathname === '/v1/transport-nodes') {
        return { ok: true, json: async () => ({ result: [{
          description: 'Airport Helsinki-Vantaa',
          formatted_address: 'Airport Helsinki-Vantaa',
          place_id: 'place-hel',
          country: 'Finland',
          iata: 'HEL',
          geometry: { location: { lat: '60.3172', lng: '24.9633' } },
          types: ['airport']
        }] }) }
      }
      return { ok: true, json: async () => ({ result: [price()] }) }
    }
  })
  const candidates = await adapter.resolvePlace('Helsinki Airport (HEL)', null, { country: 'Finland' })
  assert.equal(candidates.length, 1)
  assert.ok(decodePlace(candidates[0].id))
  const dropoff = adapter.createBenchmarkPlace({ zoneName: 'Helsinki', geocodedAddress: 'Helsinki center', latitude: 60.1676, longitude: 24.9422 })
  const result = await adapter.fetchQuotes({ pickup: candidates[0], dropoff, currency: 'EUR' })
  assert.equal(result.quotes[0].price, 71.4)
  assert.equal(result.evidence.bookingCreated, false)
  assert.deepEqual(calls.map((url) => new URL(url).pathname), ['/v1/transport-nodes', '/v1/prices'])
  assert.equal(calls.some((url) => /order|booking|payment|contact/i.test(new URL(url).pathname)), false)
})

test('iWay vehicle classes map only to comparable Riderra classes', () => {
  assert.equal(externalVehicleMatches('iway', 'standard_car', 'Standard Sedan 3 pax'), true)
  assert.equal(externalVehicleMatches('iway', 'business_car', 'Business Sedan 3 pax'), true)
  assert.equal(externalVehicleMatches('iway', 'standard_minivan_6', 'Standard Minivan 6 pax'), true)
  assert.equal(externalVehicleMatches('iway', 'business_car', 'Standard Sedan 3 pax'), false)
})

test('iWay empty price response is recorded as no quote', async () => {
  const adapter = new IwayAdapter({ minRequestIntervalMs: 0 }, {
    fetchImpl: async () => ({ ok: true, json: async () => ({ result: [] }) })
  })
  const point = adapter.createBenchmarkPlace({ zoneName: 'Helsinki', geocodedAddress: 'Helsinki center', latitude: 60.1676, longitude: 24.9422 })
  await assert.rejects(() => adapter.fetchQuotes({ pickup: point, dropoff: point, currency: 'EUR' }), (error) => error.code === 'NO_QUOTES')
})
