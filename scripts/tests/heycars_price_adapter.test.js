const test = require('node:test')
const assert = require('node:assert/strict')
const {
  HeyCarsAdapter,
  candidateMatches,
  decodePlace,
  normalizeQuotes
} = require('../../server/services/heyCarsPriceAdapter')

function quote({ price = 39.4, currency = 'EUR', name = 'Economy', category = 'ECONOMY', passengers = 3, id = 903 } = {}) {
  return {
    vehicle: {
      vehicleId: id,
      vehicleName: name,
      vehicleCategory: category,
      maxPassengerCount: passengers,
      maxLuggageCount: 3
    },
    currencyName: currency,
    price
  }
}

test('Heycars accepts an exact airport IATA and rejects an unrelated candidate', () => {
  assert.equal(candidateMatches('Barcelona Airport (BCN)', { type: 'AIRPORT', value: 'BCN', display: 'BCN: Barcelona, ES - Barcelona El Prat Airport' }), true)
  assert.equal(candidateMatches('Barcelona Airport (BCN)', { type: 'PLACE', value: 'Barnes & Noble', display: 'Barnes & Noble, Virginia, USA' }), false)
})

test('Heycars keeps the lowest public price per comparable vehicle class', () => {
  const quotes = normalizeQuotes({ success: true, data: [
    quote({ price: 42 }),
    quote({ price: 39.4 }),
    quote({ price: 54.46, name: 'Economy 7 Seater Minivan', passengers: 6, id: 847 })
  ] })
  assert.deepEqual(quotes.map((row) => [row.externalVehicleKey, row.price]), [
    ['economy_3', 39.4],
    ['economy_minivan_6', 54.46]
  ])
})

test('Heycars uses only public autocomplete and quote endpoints', async () => {
  const calls = []
  const adapter = new HeyCarsAdapter({ requestDelayMs: 0 }, {
    fetchImpl: async (url, options = {}) => {
      calls.push({ url: String(url), options })
      if (String(url).endsWith('/autocomplete')) {
        return { ok: true, json: async () => ({ success: true, code: 200, data: [{ type: 'AIRPORT', value: 'BCN', display: 'BCN: Barcelona, ES - Barcelona El Prat Airport', lat: '41.2971', lng: '2.07846', placeId: 'airport-1' }] }) }
      }
      return { ok: true, json: async () => ({ success: true, code: 200, data: [quote()] }) }
    }
  })
  const candidates = await adapter.resolvePlace('Barcelona Airport (BCN)')
  assert.equal(candidates.length, 1)
  assert.ok(decodePlace(candidates[0].id))
  const pickup = adapter.createBenchmarkPlace({ zoneName: 'Barcelona Airport', geocodedAddress: 'Barcelona Airport, Spain', latitude: 41.2971, longitude: 2.07846, airportIata: 'BCN' })
  const dropoff = adapter.createBenchmarkPlace({ zoneName: 'Barcelona', geocodedAddress: 'Plaça de Catalunya, Barcelona, Spain', latitude: 41.387, longitude: 2.17 })
  const result = await adapter.fetchQuotes({ pickup, dropoff, serviceAt: new Date('2026-08-19T12:00:00Z'), currency: 'EUR', passengers: { adults: 1 } })
  assert.equal(result.quotes[0].price, 39.4)
  assert.equal(result.evidence.bookingCreated, false)
  assert.deepEqual(calls.map((call) => new URL(call.url).pathname), ['/api/rest/common/place/autocomplete', '/api/rest/transfer/quote'])
  assert.equal(calls.some((call) => /order|booking|payment|contact/i.test(new URL(call.url).pathname)), false)
})

test('Heycars treats an unsuccessful or empty quote response as no quote', async () => {
  const adapter = new HeyCarsAdapter({ requestDelayMs: 0 }, {
    fetchImpl: async () => ({ ok: true, json: async () => ({ success: false, code: 704, data: [] }) })
  })
  const point = adapter.createBenchmarkPlace({ zoneName: 'Barcelona', geocodedAddress: 'Barcelona, Spain', latitude: 41.38, longitude: 2.17 })
  await assert.rejects(() => adapter.fetchQuotes({ pickup: point, dropoff: point, serviceAt: new Date('2026-08-19T12:00:00Z'), currency: 'EUR' }), (error) => error.code === 'NO_QUOTES')
})
