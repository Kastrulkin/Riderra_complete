const test = require('node:test')
const assert = require('node:assert/strict')
const {
  AirportTransferPortalAdapter,
  encodePlace,
  parseOptions,
  vehicleKey
} = require('../../server/services/airportTransferPortalPriceAdapter')
const { externalVehicleMatches } = require('../../server/services/priceComparisonService')

test('Airport Transfer Portal options are normalized without booking data', () => {
  const quotes = parseOptions({
    currency: 'EUR',
    options: [
      { vehicleType: 'SEDAN', totalPrice: 20, currency: 'EUR', maxPax: 2, maxLuggage: 2 },
      { vehicleType: 'VAN', totalPrice: 33, currency: 'EUR', maxPax: 8, maxLuggage: 8 }
    ]
  })
  assert.deepEqual(quotes.map((row) => [row.externalVehicleKey, row.price]), [['standard_car', 20], ['standard_minivan_8', 33]])
  assert.equal(vehicleKey('MINIBUS', 12), 'standard_minibus_12')
})

test('Airport Transfer Portal public flow resolves zone and returns quotes', async () => {
  const calls = []
  const responses = [
    [{ id: 341, code: 'GYD', name: 'Heydar Aliyev International Airport', city: 'Baku', country: 'Azerbaijan' }],
    { matched: true, zone: { id: 1084, name: 'Baku City Center' } },
    { challenge: 'challenge', difficulty: 1 },
    { token: 'token', expiresAt: Date.now() + 60000 },
    { currency: 'EUR', options: [{ vehicleType: 'SEDAN', totalPrice: 20, currency: 'EUR', maxPax: 2, maxLuggage: 2 }] }
  ]
  const adapter = new AirportTransferPortalAdapter({ requestDelayMs: 0 }, {
    fetchImpl: async (url, options = {}) => {
      calls.push({ url: String(url), options })
      const body = responses.shift()
      return { ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) }
    }
  })
  const result = await adapter.fetchQuotes({
    pickup: { id: encodePlace({ kind: 'airport', iata: 'GYD', label: 'Heydar Aliyev Airport (GYD)' }) },
    dropoff: { id: encodePlace({ kind: 'address', latitude: 40.4093, longitude: 49.8671, label: 'Baku city center' }) },
    serviceAt: '2026-08-19T12:00:00.000Z',
    currency: 'EUR',
    passengers: { adults: 1, children: 0, luggage: 1 }
  })
  assert.equal(result.quotes[0].price, 20)
  assert.equal(result.evidence.bookingCreated, false)
  assert.equal(calls.some((call) => call.url.includes('/api/public/search-transfers')), true)
})

test('Airport Transfer Portal vehicle classes map to Riderra', () => {
  assert.equal(externalVehicleMatches('airport-transfer-portal', 'standard_car', 'Standard class car'), true)
  assert.equal(externalVehicleMatches('airport-transfer-portal', 'business_car', 'Business class car'), true)
  assert.equal(externalVehicleMatches('airport-transfer-portal', 'standard_minibus_12', 'Standard minibus 12 pax'), true)
})
