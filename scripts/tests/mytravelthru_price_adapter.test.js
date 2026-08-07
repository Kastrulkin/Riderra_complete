const test = require('node:test')
const assert = require('node:assert/strict')

const {
  MyTravelThruAdapter,
  candidateMatches,
  decodePlace,
  encodePlace,
  normalizeQuotes,
  scannerHeaders
} = require('../../server/services/myTravelThruPriceAdapter')

test('MyTravelThru place identifiers retain coordinates needed for quotes', () => {
  const place = { placeId: 'google-lhr', name: 'London Heathrow Airport (LHR), Hounslow, UK', address: 'Hounslow, UK', latitude: 51.47, longitude: -0.45 }
  assert.deepEqual(decodePlace(encodePlace(place)), place)
})

test('MyTravelThru place matching prefers exact IATA airports', () => {
  assert.equal(candidateMatches('London Heathrow Airport (LHR)', { main_text: 'London Heathrow Airport (LHR)', secondary_text: 'Hounslow, UK' }), true)
  assert.equal(candidateMatches('London Heathrow Airport (LHR)', { main_text: 'Heathrow Hotel', secondary_text: 'London, UK' }), false)
})

test('MyTravelThru public vehicles use the displayed service price', () => {
  assert.deepEqual(normalizeQuotes({ data: { outwardTrip: { vehicles: [{ guid: 'car-1', name: 'Standard Sedan', maxNumberOfPassengers: 3, servicePrice: 207.391, totalPrice: 180, equivalentDescription: 'Toyota Vios or similar' }] } } }, 'USD'), [{
    externalVehicleKey: 'standard_sedan_3',
    externalVehicleName: 'Standard Sedan',
    maxPassengers: 3,
    price: 207.39,
    currency: 'USD',
    vehicleModels: 'Toyota Vios or similar',
    externalGuid: 'car-1'
  }])
})

test('MyTravelThru scanner signature is deterministic for public widget requests', () => {
  assert.deepEqual(scannerHeaders('https://external.limolink.net/connect/getBookingPrice', 'POST', new Date('2026-08-07T12:00:00Z')), {
    'X-Scanner-Token': 'DUewozasiuOzaE3ii/p8F99LWzJHweJebQIv1FoZ+mA=',
    'X-Scanner-Timestamp': '1786104000'
  })
})

test('MyTravelThru adapter only requests a public quote and never creates a booking', async () => {
  const requests = []
  const adapter = new MyTravelThruAdapter({}, {
    fetchImpl: async (url, options) => {
      requests.push({ url: String(url), options, body: JSON.parse(options.body) })
      return { ok: true, status: 200, json: async () => ({ data: { outwardTrip: { vehicles: [{ guid: 'car-1', name: 'Standard Sedan', maxNumberOfPassengers: 3, servicePrice: 146.52, currency: 'USD' }] } } }) }
    }
  })
  const pickup = { id: encodePlace({ placeId: 'lhr', name: 'London Heathrow Airport (LHR), Hounslow, UK', address: 'Hounslow, UK', latitude: 51.47, longitude: -0.45 }), label: 'London Heathrow Airport (LHR)' }
  const dropoff = { id: encodePlace({ placeId: 'savoy', name: 'The Savoy, Strand, London, UK', address: 'Strand, London, UK', latitude: 51.51, longitude: -0.12 }), label: 'The Savoy' }
  const result = await adapter.fetchQuotes({ pickup, dropoff, serviceAt: new Date('2026-08-19T12:00:00Z'), currency: 'USD', passengers: { adults: 1 } })
  assert.equal(requests.length, 1)
  assert.equal(requests[0].url, 'https://external.limolink.net/connect/getBookingPrice')
  assert.equal(requests[0].body.type, 1)
  assert.equal(requests[0].body.pickupDateTime, '2026-08-19T12:00:00.000')
  assert.equal(requests[0].body.passengers.adults, 1)
  assert.equal(requests[0].url.includes('CreateBookings'), false)
  assert.equal(result.quotes[0].price, 146.52)
  assert.equal(result.evidence.bookingCreated, false)
})
