const test = require('node:test')
const assert = require('node:assert/strict')

const {
  JayrideAdapter,
  candidateMatches,
  decodePlace,
  encodePlace,
  normalizeQuotes
} = require('../../server/services/jayridePriceAdapter')
const { externalVehicleMatches } = require('../../server/services/priceComparisonService')

const tiersPayload = {
  data: [
    { rideTierId: 1, name: 'Economy', slug: 'economy', passengerCapacity: 4, luggageCapacity: 2, customerPrice: 31, customerCurrency: 'EUR', pricingMethod: 'zone_fixed', source: 'aggregator' },
    { rideTierId: 3, name: 'Premium', slug: 'premium', passengerCapacity: 4, luggageCapacity: 3, customerPrice: 47, customerCurrency: 'EUR', pricingMethod: 'zone_fixed', source: 'aggregator' },
    { rideTierId: 16, name: 'Van', slug: 'van', passengerCapacity: 10, luggageCapacity: 10, customerPrice: 71, customerCurrency: 'EUR', pricingMethod: 'zone_fixed', source: 'aggregator' }
  ],
  meta: { quoteRequestId: 'evidence-only', pickupAirportCode: 'HEL', estimatedDistanceKm: 19.137 }
}

test('Jayride normalizes public tiers without selecting or booking them', () => {
  assert.deepEqual(normalizeQuotes(tiersPayload).map(({ externalVehicleKey, price, currency }) => ({ externalVehicleKey, price, currency })), [
    { externalVehicleKey: 'standard_car', price: 31, currency: 'EUR' },
    { externalVehicleKey: 'business_car', price: 47, currency: 'EUR' },
    { externalVehicleKey: 'standard_minibus_10', price: 71, currency: 'EUR' }
  ])
})

test('Jayride place evidence is self-contained and airport IATA matches', () => {
  const details = {
    placeId: 'ChIJsaJij2X4jUYRlrMoLAHZ8Ps',
    formattedAddress: 'Lentoasemantie 1, Vantaa, Finland',
    geometry: { location: { lat: 60.3179446, lng: 24.949624 } },
    addressComponents: [{ longName: 'Finland', shortName: 'FI', types: ['country'] }],
    types: ['international_airport', 'airport'],
    timeZone: 'Europe/Helsinki'
  }
  assert.equal(candidateMatches('Helsinki Airport (HEL)', { description: 'Helsinki Airport (HEL), Finland' }), true)
  assert.deepEqual(decodePlace(encodePlace(details)), {
    placeId: details.placeId,
    label: details.formattedAddress,
    latitude: 60.3179446,
    longitude: 24.949624,
    countryCode: 'FI',
    city: '',
    timeZone: 'Europe/Helsinki',
    types: details.types
  })
})

test('Jayride adapter uses public GET endpoints only', async () => {
  const calls = []
  const pickupId = encodePlace({ placeId: 'pickup', formattedAddress: 'Helsinki Airport', location: { lat: 60.3179, lng: 24.9496 }, countryCode: 'FI', city: 'Vantaa', types: ['airport'] })
  const dropoffId = encodePlace({ placeId: 'dropoff', formattedAddress: 'Helsinki Centre', location: { lat: 60.1701, lng: 24.9418 }, countryCode: 'FI', city: 'Helsinki', types: ['address'] })
  const adapter = new JayrideAdapter({ requestDelayMs: 0 }, {
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), method: options.method })
      return { ok: true, status: 200, json: async () => tiersPayload }
    }
  })
  const result = await adapter.fetchQuotes({ pickup: { id: pickupId, label: 'Helsinki Airport' }, dropoff: { id: dropoffId, label: 'Helsinki Centre' }, currency: 'EUR' })
  assert.equal(result.quotes.length, 3)
  assert.equal(result.evidence.bookingCreated, false)
  assert.equal(calls.length, 1)
  assert.equal(new URL(calls[0].url).pathname, '/public/portal/bookings/tiers')
  assert.equal(calls[0].method, 'GET')
})

test('Jayride classes map only to matching Riderra classes', () => {
  assert.equal(externalVehicleMatches('jayride', 'standard_car', 'Standard class car'), true)
  assert.equal(externalVehicleMatches('jayride', 'business_car', 'Business class car'), true)
  assert.equal(externalVehicleMatches('jayride', 'standard_minibus_10', 'Standard minibus 10 pax'), true)
  assert.equal(externalVehicleMatches('jayride', 'business_car', 'Standard class car'), false)
})

