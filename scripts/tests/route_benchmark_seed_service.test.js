const test = require('node:test')
const assert = require('node:assert/strict')
const {
  countryMatches,
  isAirportEndpoint,
  isSpecificGeocodingMatch,
  routeEndpointKind,
  routeEndpointQuery
} = require('../../server/services/routeBenchmarkSeedService')

test('airport endpoints are left to IATA resolution', () => {
  assert.equal(isAirportEndpoint('London Heathrow Airport (LHR)'), true)
  assert.equal(isAirportEndpoint('London City Center'), false)
})

test('non-geographic and distance-band price labels require review', () => {
  assert.equal(routeEndpointKind('Disposal up to 8 hours / 100 km within Istanbul'), 'non_geographic')
  assert.equal(routeEndpointKind('Phuket Island to delete'), 'non_geographic')
  assert.equal(routeEndpointKind('San Diego (20-39 miles)'), 'distance_band')
  assert.equal(routeEndpointKind('Los Angeles Downtown'), 'place')
})

test('Google country validation accepts common Riderra aliases', () => {
  const usa = { addressComponents: [{ longName: 'United States', shortName: 'US', types: ['country'] }] }
  assert.equal(countryMatches('United States of America', usa), true)
  assert.equal(countryMatches('Canada', usa), false)
})

test('route endpoint query includes the country', () => {
  assert.equal(routeEndpointQuery('Tokyo City Center', 'Japan'), 'Tokyo City Center, Japan')
  assert.equal(routeEndpointQuery('Universal City', 'United States of America', ['Los Angeles Airport (LAX)']), 'Universal City, Los Angeles Airport (LAX), United States of America')
})

test('country-only Google results are too broad for automatic verification', () => {
  assert.equal(isSpecificGeocodingMatch({ types: ['country', 'political'] }), false)
  assert.equal(isSpecificGeocodingMatch({ types: ['locality', 'political'] }), true)
  assert.equal(isSpecificGeocodingMatch({ types: ['lodging', 'establishment'] }), true)
})
