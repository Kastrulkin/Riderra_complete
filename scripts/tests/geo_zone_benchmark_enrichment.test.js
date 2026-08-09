const test = require('node:test')
const assert = require('node:assert/strict')
const {
  buildGeocodingQuery,
  canonicalCityName,
  enrichmentData,
  extractKmlZones,
  findContainingZone
} = require('../../server/services/geoZoneBenchmarkEnrichmentService')

const kml = `<?xml version="1.0"?><kml><Placemark><name>London City Center</name><ExtendedData><Data name="zoneId"><value>london-center</value></Data></ExtendedData><Polygon><outerBoundaryIs><LinearRing><coordinates>-0.2,51.4 -0.0,51.4 -0.0,51.6 -0.2,51.6 -0.2,51.4</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark></kml>`

test('KML polygons resolve an exact coordinate to a Riderra zone', () => {
  const zones = extractKmlZones(kml)
  assert.equal(zones.length, 1)
  assert.equal(findContainingZone(zones, 51.51, -0.1).name, 'London City Center')
  assert.equal(findContainingZone(zones, 52, -0.1), null)
})

test('city aliases normalize centre and directional London zones', () => {
  assert.equal(canonicalCityName('London centre'), 'London')
  assert.equal(canonicalCityName('London', 'London South-West'), 'London')
  assert.equal(canonicalCityName('Helsinki city centre'), 'Helsinki')
})

test('a geocoded address becomes verified only inside a polygon', () => {
  const zones = extractKmlZones(kml)
  const point = { city: 'London centre' }
  const geocoding = { provider: 'google_maps', checkedAt: '2026-08-09T00:00:00Z', bestMatch: { displayName: 'London, UK', lat: 51.51, lon: -0.1, placeId: 'place-1' } }
  const data = enrichmentData(point, geocoding, zones, new Date('2026-08-09T01:00:00Z'))
  assert.equal(data.status, 'verified')
  assert.equal(data.city, 'London')
  assert.equal(data.zoneName, 'London City Center')
  assert.equal(data.latitude, 51.51)
  assert.equal(data.verificationMethod, 'automatic_geocode_and_polygon')
})

test('geocoded points outside Riderra polygons remain reviewable', () => {
  const data = enrichmentData({ city: 'London' }, { provider: 'google_maps', bestMatch: { displayName: 'Elsewhere', lat: 55, lon: 10 } }, extractKmlZones(kml))
  assert.equal(data.status, 'needs_review')
  assert.equal(data.zoneName, null)
})

test('geocoding query keeps address, city, and country without duplicates', () => {
  assert.equal(buildGeocodingQuery({ destinationAddress: '1 Main St', city: 'London', country: 'United Kingdom' }), '1 Main St, London, United Kingdom')
})
