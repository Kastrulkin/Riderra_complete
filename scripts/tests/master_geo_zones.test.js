const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { buildMasterGeoZones } = require('../build_master_geo_zones')

const result = buildMasterGeoZones()
const xml = fs.readFileSync(result.outputPath, 'utf8')
const placemarkCount = (xml.match(/<Placemark\b/gi) || []).length
const ids = [...xml.matchAll(/<Data name="zoneId"><value>([^<]+)<\/value><\/Data>/g)].map((match) => match[1])

assert.strictEqual(result.zoneCount, 1064)
assert.strictEqual(placemarkCount, result.zoneCount)
assert.strictEqual(ids.length, result.zoneCount)
assert.strictEqual(new Set(ids).size, result.zoneCount)
assert.match(xml, /<name>London North-West<\/name>/)
assert.match(xml, /<name>Beverly Hills<\/name>/)
assert.match(xml, /<name>Los Angeles<\/name>/)
assert.strictEqual(path.basename(result.outputPath), 'riderra_master_geozones.kml')

console.log('master geo zones tests passed')
