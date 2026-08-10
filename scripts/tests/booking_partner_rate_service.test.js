const test = require('node:test')
const assert = require('node:assert/strict')
const {
  bookingCounterpartyMatches,
  calculateBookingDistancePrice,
  extractIata,
  normalizeBookingVehicle,
  parseBookingDistanceBands
} = require('../../server/services/bookingPartnerRateService')

test('parses and calculates Booking distance bands and airport fee', () => {
  const bands = parseBookingDistanceBands([
    '(First 15KM) 20 EUR',
    '(Next 20KM) 0.5 EUR',
    '(Next 35KM) 0.75 EUR',
    '(After 70KM) 3 EUR'
  ])
  assert.equal(calculateBookingDistancePrice(bands, 10, 2), 22)
  assert.equal(calculateBookingDistancePrice(bands, 25, 2), 27)
  assert.equal(calculateBookingDistancePrice(bands, 80, 2), 88.25)
})

test('matches Booking counterparties, IATA and vehicle families', () => {
  assert.equal(bookingCounterpartyMatches('Rideways (Booking.com)'), true)
  assert.equal(extractIata('Los Angeles Airport (LAX)'), 'LAX')
  assert.equal(normalizeBookingVehicle('Executive People Carrier'), 'executive_people_carrier')
  assert.equal(normalizeBookingVehicle('Standard'), 'standard')
})
