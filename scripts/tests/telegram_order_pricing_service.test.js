const assert = require('assert')
const {
  findMatchingCityPrice,
  hasCompleteLondonPricingRoute,
  isOrderPriceRequest,
  stripOrderPriceCommand
} = require('../../server/services/telegramOrderPricingService')

const laxRequest = `/order_price
Pickup: Los Angeles Airport (LAX)
Destination: 123 Rodeo Drive, Beverly Hills
Vehicle: Standard class car
Passengers: 3`

assert.strictEqual(isOrderPriceRequest(laxRequest), true)
assert.match(stripOrderPriceCommand(laxRequest), /^Pickup: Los Angeles Airport/)
assert.strictEqual(hasCompleteLondonPricingRoute({ fromPoint: null, toPoint: null, missing: ['London zone'] }), false)
assert.strictEqual(hasCompleteLondonPricingRoute({ fromPoint: 'LHR', toPoint: 'NW', missing: [] }), true)

const match = findMatchingCityPrice([
  {
    city: 'Beverly Hills',
    routeFrom: 'Los Angeles Airport (LAX)',
    routeTo: 'Beverly Hills',
    vehicleType: 'Standard class car',
    fixedPrice: 68,
    currency: 'USD',
    isActive: true
  }
], {
  fromPoint: 'Los Angeles Airport (LAX)',
  toPoint: '123 Rodeo Drive, Beverly Hills',
  vehicleType: 'Standard class car',
  normalizeVehicleType: (value) => String(value || '').trim().toLowerCase()
})

assert.ok(match)
assert.strictEqual(match.matchedBy, 'address_text')
assert.strictEqual(match.row.fixedPrice, 68)

console.log('telegram order pricing service tests passed')
