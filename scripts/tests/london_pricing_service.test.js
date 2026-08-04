const assert = require('assert')
const {
  LONDON_AIRPORTS,
  LONDON_DESTINATIONS,
  VEHICLES,
  londonParkingFee,
  londonZoneFromPostcode,
  parseLondonPricingRequest,
  toMttRouteToken
} = require('../../server/services/londonPricingService')

assert.strictEqual(londonZoneFromPostcode('London EC2A 4NE'), LONDON_DESTINATIONS.CENTER)
assert.strictEqual(londonZoneFromPostcode('NW6 1AA'), LONDON_DESTINATIONS.NW)
assert.strictEqual(londonZoneFromPostcode('SW19 2AB'), LONDON_DESTINATIONS.SW)
assert.strictEqual(londonZoneFromPostcode('E14 5AB'), LONDON_DESTINATIONS.E)
assert.strictEqual(londonZoneFromPostcode('SE10 9NN'), LONDON_DESTINATIONS.SE)

const parsed = parseLondonPricingRequest(`
Pickup: London Heathrow Airport (LHR)
Destination: 10 Example Street, NW6 1AA
Vehicle: Standard sedan
Passengers: 3
`)
assert.strictEqual(parsed.fromPoint, LONDON_AIRPORTS.LHR)
assert.strictEqual(parsed.toPoint, LONDON_DESTINATIONS.NW)
assert.strictEqual(parsed.vehicleType, VEHICLES.STANDARD)
assert.deepStrictEqual(parsed.missing, [])
assert.strictEqual(toMttRouteToken(parsed.toPoint), 'NW')
assert.deepStrictEqual(londonParkingFee(parsed.fromPoint, parsed.toPoint), { amount: 7.5, currency: 'GBP', reason: 'LHR arrival' })
assert.deepStrictEqual(londonParkingFee(LONDON_DESTINATIONS.N, LONDON_AIRPORTS.LGW), { amount: 10, currency: 'GBP', reason: 'LGW departure' })

const ambiguous = parseLondonPricingRequest('Route: LHR -> Unknown address\n4 pax')
assert(ambiguous.missing.some((item) => item.includes('лондонская зона')))
assert.strictEqual(ambiguous.vehicleType, VEHICLES.MPV)
assert.strictEqual(ambiguous.vehicleAssumed, true)

console.log('london pricing service tests passed')
