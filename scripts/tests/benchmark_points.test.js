const test = require('node:test')
const assert = require('node:assert/strict')
const { normalizedKey, pointData } = require('../../server/routes/benchmarkPoints')
const { compactQuery, representativePointForZone, selectBenchmarkPlaceCandidate } = require('../../server/services/benchmarkPointResolutionService')

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

test('benchmark SmartRyde matching accepts one explicit POI label in the full address', () => {
  const candidate = { id: 'place-1', label: 'Dream Park', description: 'Dream Park, Mohammadia, Algeria' }
  assert.deepEqual(
    selectBenchmarkPlaceCandidate('Dream Park, P5P6+84F, Mohammadia, Algeria', [candidate], 'Algeria'),
    candidate
  )
})

test('benchmark SmartRyde matching rejects a country mismatch and ambiguity', () => {
  assert.equal(selectBenchmarkPlaceCandidate('Grand Hotel, Paris, France', [
    { id: 'wrong', label: 'Grand Hotel', description: 'Grand Hotel, Rome, Italy' }
  ], 'France'), null)
  assert.equal(selectBenchmarkPlaceCandidate('Grand Hotel, Paris, France', [
    { id: 'one', label: 'Grand Hotel', description: 'Grand Hotel, Paris, France' },
    { id: 'two', label: 'Grand Hotel', description: 'Grand Hotel, Paris, France' }
  ], 'France'), null)
})

test('benchmark query removes duplicate location parts', () => {
  assert.equal(compactQuery(['Hotel, Paris', 'Paris', 'France', 'France']), 'Hotel, Paris, Paris, France')
})

test('representative geo-zone point is inside a simple polygon', () => {
  const point = representativePointForZone({ polygons: [[[
    [0, 0], [4, 0], [4, 4], [0, 4], [0, 0]
  ]]] })
  assert.deepEqual(point, { lon: 2, lat: 2 })
})
