const test = require('node:test')
const assert = require('node:assert/strict')
const { normalizedKey, pointData } = require('../../server/routes/benchmarkPoints')

test('benchmark point requires exact pickup and destination addresses', () => {
  assert.throws(() => pointData({ pickupAddress: 'LHR' }), /required/)
})

test('benchmark point keys are stable across whitespace and case', () => {
  const first = normalizedKey({ airportIata: 'LHR', pickupAddress: 'Heathrow Airport', destinationAddress: '10 Downing Street' })
  const second = normalizedKey({ airportIata: 'lhr', pickupAddress: '  HEATHROW   AIRPORT ', destinationAddress: '10 downing street ' })
  assert.equal(first, second)
})

test('benchmark point validates coordinate pairs', () => {
  assert.throws(() => pointData({ pickupAddress: 'Airport', destinationAddress: 'Hotel', latitude: 51.5 }), /together/)
  assert.throws(() => pointData({ pickupAddress: 'Airport', destinationAddress: 'Hotel', latitude: 151.5, longitude: 0 }), /bounds/)
})
