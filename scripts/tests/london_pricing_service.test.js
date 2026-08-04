const assert = require('assert')
const {
  LONDON_AIRPORTS,
  LONDON_DESTINATIONS,
  VEHICLES,
  applyLondonPostcodeZoneOverrides,
  londonParkingFee,
  londonZoneFromPostcode,
  postcodeDistrictFromPostcode,
  resolveLondonPricingRequest,
  parseLondonPricingRequest,
  toMttRouteToken
} = require('../../server/services/londonPricingService')

assert.strictEqual(londonZoneFromPostcode('London EC2A 4NE'), LONDON_DESTINATIONS.CENTER)
assert.strictEqual(londonZoneFromPostcode('NW6 1AA'), LONDON_DESTINATIONS.NW)
assert.strictEqual(londonZoneFromPostcode('SW19 2AB'), LONDON_DESTINATIONS.SW)
assert.strictEqual(londonZoneFromPostcode('E14 5AB'), LONDON_DESTINATIONS.E)
assert.strictEqual(londonZoneFromPostcode('SE10 9NN'), LONDON_DESTINATIONS.SE)
assert.strictEqual(londonZoneFromPostcode('SW1A 2AA'), LONDON_DESTINATIONS.CENTER)
assert.strictEqual(londonZoneFromPostcode('NW6 1AA', { NW6: LONDON_DESTINATIONS.W }), LONDON_DESTINATIONS.W)
assert.strictEqual(postcodeDistrictFromPostcode('SW1A 2AA'), 'SW1A')

const parsed = parseLondonPricingRequest(`
Pickup: London Heathrow Airport (LHR)
Destination: 10 Example Street, NW6 1AA
Vehicle: Standard sedan
Passengers: 3
`)
assert.strictEqual(parsed.fromPoint, LONDON_AIRPORTS.LHR)
assert.strictEqual(parsed.toPoint, LONDON_DESTINATIONS.NW)
assert.strictEqual(parsed.vehicleType, VEHICLES.STANDARD)
assert.strictEqual(parsed.toDistrict, 'NW6')
assert.deepStrictEqual(parsed.missing, [])
const corrected = applyLondonPostcodeZoneOverrides(parsed, { NW6: LONDON_DESTINATIONS.W })
assert.strictEqual(corrected.toPoint, LONDON_DESTINATIONS.W)
assert.deepStrictEqual(corrected.appliedZoneOverrides, ['NW6'])
assert.strictEqual(toMttRouteToken(parsed.toPoint), 'NW')
assert.deepStrictEqual(londonParkingFee(parsed.fromPoint, parsed.toPoint), { amount: 7.5, currency: 'GBP', reason: 'LHR arrival' })
assert.deepStrictEqual(londonParkingFee(LONDON_DESTINATIONS.N, LONDON_AIRPORTS.LGW), { amount: 10, currency: 'GBP', reason: 'LGW departure' })

async function run() {
  const ambiguous = parseLondonPricingRequest('Route: LHR -> Unknown address\n4 pax')
  assert(ambiguous.missing.some((item) => item.includes('лондонская зона')))
  assert.strictEqual(ambiguous.vehicleType, VEHICLES.MPV)
  assert.strictEqual(ambiguous.vehicleAssumed, true)

  const resolved = await resolveLondonPricingRequest('Route: LHR -> 10 Downing Street\n3 pax', {}, async () => ({
    provider: 'test',
    bestMatch: {
      displayName: '10 Downing Street, London SW1A 2AA, UK',
      address: { postcode: 'SW1A 2AA' }
    }
  }))
  assert.strictEqual(resolved.toPoint, LONDON_DESTINATIONS.CENTER)
  assert.strictEqual(resolved.toDistrict, 'SW1A')
  assert.deepStrictEqual(resolved.missing, [])

  const overridden = await resolveLondonPricingRequest(
    'Route: LHR -> 10 Example Street, NW6 1AA\n3 pax',
    {},
    null,
    { NW6: LONDON_DESTINATIONS.W }
  )
  assert.strictEqual(overridden.toPoint, LONDON_DESTINATIONS.W)
  assert.strictEqual(overridden.toDistrict, 'NW6')

  console.log('london pricing service tests passed')
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
