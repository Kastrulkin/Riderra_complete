#!/usr/bin/env node
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const SOURCE_DIR = path.join(ROOT, 'reports', 'eto-sync')
const OUTPUT_PATH = path.join(SOURCE_DIR, 'riderra_master_geozones.kml')

// These are the latest non-overlapping batches. Older alternatives are kept in
// reports/eto-sync for audit, but must not be mixed into the production map.
const SOURCE_FILES = [
  'batch1_top30_missing_zones.kml',
  'batch2_airports_ports_next100_after_batch1.kml',
  'batch3_cities_top60_after_batch1.kml',
  'batch4_districts_top60_after_batch1.kml',
  'batch5_airports_ports_stations_next100_after_batch4.kml',
  'batch6_cities_top100_after_batch4.kml',
  'batch7_districts_islands_all_after_batch4.kml',
  'batch8_airports_ports_stations_remaining_after_batch7.kml',
  'batch9_cities_top100_after_batch7_safe.kml',
  'batch10_cities_next100_after_batch7_safe.kml',
  'batch11_cities_next100_after_batch7_safe.kml',
  'batch12_cities_top100_after_batch11_safe_safe.kml',
  'batch13_cities_next100_after_batch11_safe_safe.kml',
  'batch14_cities_remaining_after_batch11_safe_safe.kml',
  'batch15_manual_city_zones.kml',
  'eto_moscow_mkad_test.kml'
]

function stripXml(value = '') {
  return String(value).replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, '').trim()
}

function xmlEscape(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function descriptionValue(description, key) {
  const match = String(description || '').match(new RegExp(`(?:^|;)\\s*${key}=([^;]*)`, 'i'))
  return String(match?.[1] || '').trim()
}

function stableZoneId(name, countries) {
  const digest = crypto.createHash('sha1').update(`${countries}|${name}`.toLowerCase()).digest('hex').slice(0, 12)
  return `riderra-zone-${digest}`
}

function enrichPlacemark(block, { zoneId, sourceFile }) {
  const extendedData = `\n      <ExtendedData>\n        <Data name="zoneId"><value>${xmlEscape(zoneId)}</value></Data>\n        <Data name="sourceFile"><value>${xmlEscape(sourceFile)}</value></Data>\n      </ExtendedData>`
  return String(block).replace(/(<Polygon\b)/i, `${extendedData}\n      $1`)
}

function buildMasterGeoZones() {
  const zones = new Map()
  const duplicateKeys = []
  for (const sourceFile of SOURCE_FILES) {
    const sourcePath = path.join(SOURCE_DIR, sourceFile)
    const xml = fs.readFileSync(sourcePath, 'utf8')
    const placemarks = [...xml.matchAll(/<Placemark\b[\s\S]*?<\/Placemark>/gi)].map((match) => match[0])
    for (const placemark of placemarks) {
      const name = stripXml(placemark.match(/<name\b[^>]*>([\s\S]*?)<\/name>/i)?.[1] || '')
      const description = stripXml(placemark.match(/<description\b[^>]*>([\s\S]*?)<\/description>/i)?.[1] || '')
      const countries = descriptionValue(description, 'countries')
      if (!name || !/<Polygon\b/i.test(placemark)) continue
      const key = `${name.toLowerCase()}::${countries.toLowerCase()}`
      if (zones.has(key)) duplicateKeys.push(key)
      const zoneId = stableZoneId(name, countries)
      zones.set(key, {
        key,
        name,
        countries,
        category: descriptionValue(description, 'category') || 'zone',
        zoneId,
        sourceFile,
        placemark: enrichPlacemark(placemark, { zoneId, sourceFile })
      })
    }
  }

  const sorted = [...zones.values()].sort((a, b) => {
    const byCountry = a.countries.localeCompare(b.countries, 'en')
    return byCountry || a.name.localeCompare(b.name, 'en')
  })
  const body = sorted.map((zone) => zone.placemark.replace(/^/gm, '    ')).join('\n')
  const output = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Riderra master geo zones</name>
    <description>Versioned production geo-zone map generated from approved ETO batches.</description>
${body}
  </Document>
</kml>
`
  const normalizedOutput = output.replace(/[ \t]+$/gm, '')
  fs.writeFileSync(OUTPUT_PATH, normalizedOutput)
  return {
    outputPath: OUTPUT_PATH,
    sourceFiles: SOURCE_FILES.length,
    zoneCount: sorted.length,
    replacedDuplicates: duplicateKeys.length,
    sizeBytes: Buffer.byteLength(normalizedOutput),
    categories: sorted.reduce((acc, zone) => {
      acc[zone.category] = (acc[zone.category] || 0) + 1
      return acc
    }, {})
  }
}

if (require.main === module) {
  console.log(JSON.stringify(buildMasterGeoZones(), null, 2))
}

module.exports = { buildMasterGeoZones, SOURCE_FILES }
