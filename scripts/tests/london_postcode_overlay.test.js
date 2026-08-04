const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { pricingZoneForDistrict } = require('../build_london_postcode_overlay')

const overlayPath = path.resolve(__dirname, '..', '..', 'reports', 'eto-sync', 'london_postcode_districts.kml')
const kml = fs.readFileSync(overlayPath, 'utf8')
const placemarks = kml.match(/<Placemark\b/g) || []

assert.strictEqual(placemarks.length, 171)
assert.match(kml, /<name>NW6 — London North-West<\/name>/)
assert.match(kml, /<name>SW1A — London City Center<\/name>/)
assert.strictEqual(pricingZoneForDistrict('E14').label, 'London East')
assert.strictEqual(pricingZoneForDistrict('WC2R').label, 'London City Center')
assert.strictEqual(pricingZoneForDistrict('W12').label, 'London West')

console.log('london postcode overlay tests passed')
