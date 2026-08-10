const test = require('node:test')
const assert = require('node:assert/strict')

const {
  BookingAdapter,
  decodePlaceId,
  encodePlaceId,
  parseBookingQuotes,
  parseRateSearchUrl
} = require('../../server/services/bookingPriceAdapter')

test('Booking place identity keeps the public location type', () => {
  const encoded = encodePlaceId('google-place-1', 'airport')
  assert.deepEqual(decodePlaceId(encoded), { placeId: 'google-place-1', type: 'airport' })
})

test('Booking rate parser extracts the endpoint without exposing page markup', () => {
  const props = encodeURIComponent(JSON.stringify({ rateSearchURL: 'https://taxis.booking.com/search-results-mfe/rates?currency=EUR' }))
  assert.equal(parseRateSearchUrl(`<div data-mb-react-component-name="TransportResultsWrapper" data-mb-props="${props}"></div>`), 'https://taxis.booking.com/search-results-mfe/rates?currency=EUR')
})

test('Booking quotes preserve each visible vehicle class and public price', () => {
  const quotes = parseBookingQuotes({ journeys: [{ legs: [{ results: [
    { type: 'CAR', price: 14.15, currency: 'EUR', maxPassenger: '4', carDetails: { description: 'Standard', modelDescription: 'Skoda Octavia or similar' } },
    { type: 'CAR', price: 17.22, currency: 'EUR', maxPassenger: '4', carDetails: { description: 'Electric Standard' } }
  ] }] }] })
  assert.deepEqual(quotes.map(({ externalVehicleKey, price }) => ({ externalVehicleKey, price })), [
    { externalVehicleKey: 'standard', price: 14.15 },
    { externalVehicleKey: 'electric_standard', price: 17.22 }
  ])
})

test('Booking adapter uses autocomplete then the public search session without booking', async () => {
  const calls = []
  const rateUrl = 'https://example.test/search-results-mfe/rates?currency=EUR'
  const props = encodeURIComponent(JSON.stringify({ rateSearchURL: rateUrl }))
  const fakeFetch = async (url, options = {}) => {
    calls.push({ url: String(url), options })
    if (String(url).endsWith('/autocomplete')) return new Response(JSON.stringify({ results: [{ googlePlaceId: 'p1', type: 'airport', name: 'Airport', iata: 'AAA', city: 'City', country: 'Country' }] }), { status: 200 })
    if (String(url).includes('/search/?')) return new Response(`<div data-mb-react-component-name="TransportResultsWrapper" data-mb-props="${props}"></div>`, { status: 200, headers: { 'set-cookie': 'session=abc; Path=/' } })
    if (String(url) === rateUrl) return new Response(JSON.stringify({ journeys: [{ legs: [{ results: [{ type: 'CAR', price: 25, currency: 'EUR', maxPassenger: '4', carDetails: { description: 'Standard' } }] }] }] }), { status: 200 })
    throw new Error(`Unexpected URL ${url}`)
  }
  const adapter = new BookingAdapter({ baseUrl: 'https://example.test', supportedCurrencies: ['EUR'] }, { fetchImpl: fakeFetch })
  const places = await adapter.resolvePlace('AAA')
  assert.equal(places[0].id, 'booking:airport:p1')
  const result = await adapter.fetchQuotes({
    pickup: places[0],
    dropoff: { id: 'booking:point_of_interest:p2', label: 'Hotel' },
    serviceAt: new Date('2026-08-12T12:00:00Z'),
    currency: 'EUR',
    passengers: { adults: 1, children: 0 }
  })
  assert.equal(result.quotes[0].price, 25)
  assert.equal(calls.some((call) => /bookingDetails|checkout|book/i.test(new URL(call.url).pathname)), false)
})

test('Booking adapter reuses only verified Riderra benchmark place ids', () => {
  const adapter = new BookingAdapter()
  assert.deepEqual(adapter.createBenchmarkPlace({
    source: 'riderra_geo_zone',
    status: 'verified',
    googlePlaceId: 'airport-place',
    airportIata: 'HEL',
    zoneName: 'Helsinki Airport (HEL)',
    geocodedAddress: 'Helsinki Airport, Finland'
  }), {
    id: 'booking:airport:airport-place',
    label: 'Helsinki Airport, Finland'
  })
  assert.equal(adapter.createBenchmarkPlace({
    source: 'booking_workbook',
    status: 'verified',
    googlePlaceId: 'unreviewed-source',
    zoneName: 'Hurghada Airport (HRG)',
    geocodedAddress: 'A hospital near the airport'
  }), null)
})
