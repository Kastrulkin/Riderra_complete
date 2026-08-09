const test = require('node:test')
const assert = require('node:assert/strict')
const {
  buildGeocodingQuery,
  canonicalCityName,
  enrichmentData,
  extractKmlZones,
  findContainingZone,
  mergeZoneCatalogWithOverlay
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

test('equally specific overlapping zones remain reviewable', () => {
  const overlappingKml = `<?xml version="1.0"?><kml><Placemark><name>London North</name><Polygon><outerBoundaryIs><LinearRing><coordinates>-0.2,51.4 0,51.4 0,51.6 -0.2,51.6 -0.2,51.4</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark><Placemark><name>London West</name><Polygon><outerBoundaryIs><LinearRing><coordinates>-0.2,51.4 0,51.4 0,51.6 -0.2,51.6 -0.2,51.4</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark></kml>`
  const data = enrichmentData({ city: 'London' }, { provider: 'google_maps', bestMatch: { displayName: 'London', lat: 51.51, lon: -0.1 } }, extractKmlZones(overlappingKml))
  assert.equal(data.status, 'needs_review')
  assert.equal(data.zoneName, null)
  assert.match(data.resolutionError, /London North, London West/)
})

test('a smaller nested zone wins over broad overlapping zones', () => {
  const nestedKml = `<?xml version="1.0"?><kml><Placemark><name>London</name><Polygon><outerBoundaryIs><LinearRing><coordinates>-1,51 1,51 1,52 -1,52 -1,51</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark><Placemark><name>London City Center</name><Polygon><outerBoundaryIs><LinearRing><coordinates>-0.2,51.4 0,51.4 0,51.6 -0.2,51.6 -0.2,51.4</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark></kml>`
  const data = enrichmentData({ city: 'London centre' }, { provider: 'google_maps', bestMatch: { displayName: 'London', lat: 51.51, lon: -0.1 } }, extractKmlZones(nestedKml))
  assert.equal(data.status, 'verified')
  assert.equal(data.zoneName, 'London City Center')
})

test('a pricing-zone overlay replaces a broad base polygon', () => {
  const base = extractKmlZones(`<?xml version="1.0"?><kml><Placemark><name>London West</name><ExtendedData><Data name="zoneId"><value>west-id</value></Data></ExtendedData><Polygon><outerBoundaryIs><LinearRing><coordinates>-1,51 1,51 1,52 -1,52 -1,51</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark></kml>`)
  const overlay = extractKmlZones(`<?xml version="1.0"?><kml><Placemark><name>W1 — London West</name><ExtendedData><Data name="pricingZone"><value>London West</value></Data></ExtendedData><Polygon><outerBoundaryIs><LinearRing><coordinates>-0.3,51.4 -0.1,51.4 -0.1,51.6 -0.3,51.6 -0.3,51.4</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark></kml>`)
  const zones = mergeZoneCatalogWithOverlay(base, overlay)
  assert.equal(zones.length, 1)
  assert.equal(zones[0].name, 'London West')
  assert.equal(zones[0].id, 'west-id')
  assert.equal(findContainingZone(zones, 51.5, -0.2).name, 'London West')
  assert.equal(findContainingZone(zones, 51.5, 0.5), null)
})

test('geocoding query keeps address, city, and country without duplicates', () => {
  assert.equal(buildGeocodingQuery({ destinationAddress: '1 Main St', city: 'London', country: 'United Kingdom' }), '1 Main St, London, United Kingdom')
})
