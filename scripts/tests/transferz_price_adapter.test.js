const test = require('node:test')
const assert = require('node:assert/strict')

const {
  TransferzAdapter,
  candidateMatches,
  decodePlace,
  encodePlace,
  normalizeQuotes
} = require('../../server/services/transferzPriceAdapter')

test('Transferz place identifiers retain public hub and address evidence', () => {
  const place = {
    type: 'AIRPORT',
    hubId: 36459,
    googlePlaceId: 'google-lax',
    formattedAddress: 'Los Angeles International Airport (LAX)'
  }
  assert.deepEqual(decodePlace(encodePlace(place)), place)
})

test('Transferz place search prefers an exact IATA airport', () => {
  assert.equal(candidateMatches('Los Angeles International Airport (LAX)', {
    title: 'Los Angeles International Airport (LAX)',
    formattedAddress: 'Los Angeles International Airport (LAX), World Way, Los Angeles',
    type: 'AIRPORT'
  }), true)
  assert.equal(candidateMatches('Los Angeles International Airport (LAX)', {
    title: 'Laxey Glen',
    formattedAddress: 'Laxey, Isle of Man',
    type: 'ADDRESS'
  }), false)
})

test('Transferz public quotes are normalized by category and capacity', () => {
  assert.deepEqual(normalizeQuotes([{ vehicleCategory: 'BUSINESS_SEDAN', passengerCapacity: 3, price: 96.333, currencyCode: 'usd', requestId: 42 }]), [{
    externalVehicleKey: 'business_sedan_3',
    externalVehicleName: 'Business Sedan',
    maxPassengers: 3,
    price: 96.33,
    currency: 'USD',
    vehicleModels: null,
    requestId: 42
  }])
})

test('Transferz adapter requests public quotes without creating a booking', async () => {
  let request
  const adapter = new TransferzAdapter({}, {
    fetchImpl: async (url, options) => {
      request = { url: String(url), options, body: JSON.parse(options.body) }
      return {
        ok: true,
        status: 200,
        json: async () => ({ data: { quotes: [{ vehicleCategory: 'SEDAN', passengerCapacity: 3, price: 76.94, currencyCode: 'USD', requestId: 7 }] } })
      }
    }
  })
  const pickup = {
    id: encodePlace({ type: 'AIRPORT', hubId: 36459, formattedAddress: 'Los Angeles International Airport (LAX)' }),
    label: 'Los Angeles International Airport (LAX)'
  }
  const dropoff = {
    id: encodePlace({ type: 'ADDRESS', googlePlaceId: 'hotel', formattedAddress: 'Downtown LA Proper Hotel, Los Angeles' }),
    label: 'Downtown LA Proper Hotel'
  }
  const result = await adapter.fetchQuotes({ pickup, dropoff, serviceAt: new Date('2026-08-19T12:00:00Z'), currency: 'USD', passengers: { adults: 1 } })
  assert.equal(request.url, 'https://booking.taxi2airport.com/graphql')
  assert.equal(request.body.operationName, 'Quotes')
  assert.deepEqual(request.body.variables.params, {
    partnerId: 18,
    hub: 36459,
    directionality: 'OUTBOUND',
    destination: 'Downtown LA Proper Hotel, Los Angeles',
    isRoundTrip: false,
    adultPassengerCount: 1,
    childPassengerCount: 0,
    luggage: 1,
    inboundPickup: '',
    outboundPickup: '2026-08-19T12:00:00',
    preferredCurrencyCode: 'USD'
  })
  assert.equal(result.quotes[0].price, 76.94)
  assert.equal(result.evidence.bookingCreated, false)
})
