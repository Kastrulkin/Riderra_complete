const test = require('node:test')
const assert = require('node:assert/strict')
const { AirportTaxisAdapter, decodePlace, normalizeQuotes, safeGeocodeCandidate } = require('../../server/services/airportTaxisPriceAdapter')

test('AirportTaxis.com parses only priced public vehicles', () => {
  const quotes = normalizeQuotes({ data: [
    { name: 'Saloon', seats: 3, calculated: { converted_total: 39, currency: { code: { value: 'EUR' } } } },
    { name: 'Mercedes S Class Luxury', seats: 3, calculated: { converted_total: 0, currency: { code: { value: 'EUR' } } } }
  ] })
  assert.deepEqual(quotes.map((row) => [row.externalVehicleKey, row.price]), [['saloon_3', 39]])
})

test('AirportTaxis.com geocoder rejects a wrong entity and country', () => {
  const airport = { formatted_address: 'Barcelona Airport, 08820 El Prat de Llobregat, Spain', types: ['airport'], geometry: { location: { lat: 41.29, lng: 2.08 } } }
  const restaurant = { formatted_address: 'Barcelona Airport Restaurant, France', types: ['restaurant'], geometry: { location: { lat: 1, lng: 2 } } }
  assert.equal(safeGeocodeCandidate('Barcelona Airport (BCN)', airport, 'Spain'), true)
  assert.equal(safeGeocodeCandidate('Barcelona Airport (BCN)', restaurant, 'Spain'), false)
})

test('AirportTaxis.com fetches quotes without creating a booking', async () => {
  const calls = []
  const adapter = new AirportTaxisAdapter({ requestDelayMs: 0 }, { googleMapsApiKey: 'test', fetchImpl: async (url, options) => {
    calls.push({ url: String(url), options })
    return { ok: true, json: async () => ({ data: [{ name: 'Saloon', seats: 3, calculated: { converted_total: 39, currency: { code: { value: 'EUR' } } } }] }) }
  } })
  const point = adapter.createBenchmarkPlace({ zoneName: 'Barcelona', geocodedAddress: 'Barcelona, Spain', latitude: 41.38, longitude: 2.17 })
  assert.ok(decodePlace(point.id))
  const result = await adapter.fetchQuotes({ pickup: point, dropoff: point, serviceAt: new Date('2026-08-19T12:00:00Z'), currency: 'EUR', passengers: { adults: 1 } })
  assert.equal(result.quotes[0].price, 39)
  assert.equal(result.evidence.bookingCreated, false)
  assert.match(calls[0].url, /booking-process\/vehicles$/)
})
