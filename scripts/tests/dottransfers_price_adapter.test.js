const test = require('node:test')
const assert = require('node:assert/strict')
const {
  DotTransfersAdapter,
  decodePlace,
  normalizeQuotes,
  parsePublicConfig,
  safeGeocodeCandidate
} = require('../../server/services/dotTransfersPriceAdapter')

function publicResult({ value = '88.31', currency = 'EUR', type = 'Sedan', category = 'Standard', passengers = 3 } = {}) {
  return {
    total_price: { total_price: { value, currency } },
    steps: [{ main: true, details: { vehicle: {
      vehicle_type: { name: type },
      vehicle_class_detail: { display_name: category },
      max_passengers: passengers,
      max_bags: 2
    } } }]
  }
}

test('Dottransfers parses the public white-label config without persisting it', () => {
  assert.deepEqual(parsePublicConfig('{"MOZIO_API_KEY":"public-key","PARTNER_REF":"dottransfers"}'), {
    apiKey: 'public-key', partnerRef: 'dottransfers'
  })
})

test('Dottransfers keeps the lowest public price per comparable vehicle class', () => {
  const quotes = normalizeQuotes([
    publicResult({ value: '90.50' }),
    publicResult({ value: '75.20' }),
    publicResult({ value: '110', category: 'Business' })
  ])
  assert.deepEqual(quotes.map((row) => [row.externalVehicleKey, row.price]), [
    ['standard_sedan_3', 75.2],
    ['business_sedan_3', 110]
  ])
})

test('Dottransfers geocoder rejects a wrong entity and country', () => {
  const airport = { formatted_address: 'Barcelona Airport, 08820 El Prat de Llobregat, Spain', types: ['airport'], geometry: { location: { lat: 41.29, lng: 2.08 } } }
  const restaurant = { formatted_address: 'Barcelona Airport Restaurant, France', types: ['restaurant'], geometry: { location: { lat: 1, lng: 2 } } }
  assert.equal(safeGeocodeCandidate('Barcelona Airport (BCN)', airport, 'Spain'), true)
  assert.equal(safeGeocodeCandidate('Barcelona Airport (BCN)', restaurant, 'Spain'), false)
})

test('Dottransfers uses only public search and poll endpoints', async () => {
  const calls = []
  const adapter = new DotTransfersAdapter({ requestDelayMs: 0, pollDelayMs: 0 }, {
    googleMapsApiKey: 'test',
    fetchImpl: async (url, options = {}) => {
      calls.push({ url: String(url), options })
      if (String(url).includes('booking.dottransfers.com')) return { ok: true, text: async () => '{"MOZIO_API_KEY":"public-key","PARTNER_REF":"dottransfers"}' }
      if (String(url).endsWith('/search/')) return { ok: true, json: async () => ({ search_id: 'search-1', results: [], more_coming: true }) }
      return { ok: true, json: async () => ({ results: [publicResult()], more_coming: false }) }
    }
  })
  const pickup = adapter.createBenchmarkPlace({ zoneName: 'Barcelona Airport', latitude: 41.29, longitude: 2.08, airportIata: 'BCN' })
  const dropoff = adapter.createBenchmarkPlace({ zoneName: 'Barcelona', latitude: 41.38, longitude: 2.17 })
  assert.ok(decodePlace(pickup.id))
  const result = await adapter.fetchQuotes({ pickup, dropoff, serviceAt: new Date('2026-08-19T12:00:00Z'), currency: 'EUR', passengers: { adults: 1 } })
  assert.equal(result.quotes[0].price, 88.31)
  assert.equal(result.evidence.bookingCreated, false)
  assert.equal(result.evidence.technicalPlatform, 'Mozio white-label')
  assert.deepEqual(calls.slice(1).map((call) => new URL(call.url).pathname), ['/v2/search/', '/v2/search/search-1/poll/'])
  assert.equal(calls.some((call) => /reservation|booking/i.test(new URL(call.url).pathname)), false)
})

test('Dottransfers treats an empty completed public search as no quote', async () => {
  const adapter = new DotTransfersAdapter({ requestDelayMs: 0, pollDelayMs: 0 }, {
    fetchImpl: async (url) => String(url).includes('booking.dottransfers.com')
      ? { ok: true, text: async () => '{"MOZIO_API_KEY":"public-key","PARTNER_REF":"dottransfers"}' }
      : { ok: true, json: async () => ({ search_id: 'search-1', results: [], more_coming: false }) }
  })
  const point = adapter.createBenchmarkPlace({ zoneName: 'Minsk', latitude: 53.9, longitude: 27.56 })
  await assert.rejects(() => adapter.fetchQuotes({ pickup: point, dropoff: point, serviceAt: new Date('2026-08-19T12:00:00Z'), currency: 'EUR' }), (error) => error.code === 'NO_QUOTES')
})
