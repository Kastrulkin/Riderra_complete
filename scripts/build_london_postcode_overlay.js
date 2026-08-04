#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

const SOURCE_COMMIT = '660f1d1d54a0524731a0ec688d63a3d913508ca3'
const SOURCE_REPOSITORY = 'https://github.com/missinglink/uk-postcode-polygons'
const SOURCE_LICENSE = 'CC BY-SA 3.0 — © Wikipedia contributors'
const AREAS = ['E', 'EC', 'N', 'NW', 'SE', 'SW', 'W', 'WC']
const OUTPUT_PATH = path.resolve(__dirname, '..', 'reports', 'eto-sync', 'london_postcode_districts.kml')

const CENTRAL_DISTRICTS = new Set(['EC1', 'EC2', 'EC3', 'EC4', 'WC1', 'WC2', 'W1', 'SW1', 'SE1', 'E1', 'N1', 'NW1'])
const AREA_TO_ZONE = {
  E: { code: 'E', label: 'London East', color: 'cc183ee8' },
  N: { code: 'N', label: 'London North', color: 'cc43bddd' },
  NW: { code: 'NW', label: 'London North-West', color: 'ccdd7839' },
  SE: { code: 'SE', label: 'London South-East', color: 'cc1d8df2' },
  SW: { code: 'SW', label: 'London South-West', color: 'cc9eeef8' },
  W: { code: 'W', label: 'London West', color: 'cc4da8e6' }
}
const CENTER_ZONE = { code: 'CENTER', label: 'London City Center', color: 'cc9b611e' }

function xmlEscape(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function baseDistrict(district = '') {
  return String(district).toUpperCase().match(/^([A-Z]{1,2}\d{1,2})/)?.[1] || ''
}

function pricingZoneForDistrict(district = '') {
  const normalized = String(district).toUpperCase()
  const base = baseDistrict(normalized)
  if (CENTRAL_DISTRICTS.has(base)) return CENTER_ZONE
  const area = normalized.match(/^[A-Z]{1,2}/)?.[0] || ''
  return AREA_TO_ZONE[area] || null
}

function coordinateRing(ring = []) {
  return ring.map(([lon, lat]) => `${lon},${lat},0`).join(' ')
}

function polygonToKml(rings = []) {
  if (!Array.isArray(rings) || !rings.length) return ''
  const [outer, ...inners] = rings
  return `<Polygon><outerBoundaryIs><LinearRing><coordinates>${coordinateRing(outer)}</coordinates></LinearRing></outerBoundaryIs>${inners.map((ring) => `<innerBoundaryIs><LinearRing><coordinates>${coordinateRing(ring)}</coordinates></LinearRing></innerBoundaryIs>`).join('')}</Polygon>`
}

function geometryToKml(geometry = {}) {
  if (geometry.type === 'Polygon') return polygonToKml(geometry.coordinates)
  if (geometry.type === 'MultiPolygon') return `<MultiGeometry>${geometry.coordinates.map(polygonToKml).join('')}</MultiGeometry>`
  return ''
}

async function fetchArea(area) {
  const url = `https://raw.githubusercontent.com/missinglink/uk-postcode-polygons/${SOURCE_COMMIT}/geojson/${area}.geojson`
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to download ${area}: HTTP ${response.status}`)
  return response.json()
}

async function buildLondonPostcodeOverlay() {
  const collections = await Promise.all(AREAS.map(fetchArea))
  const features = collections.flatMap((collection) => collection.features || [])
    .map((feature) => {
      const district = String(feature.properties?.name || '').trim().toUpperCase()
      const pricingZone = pricingZoneForDistrict(district)
      if (!district || !pricingZone) return null
      return { district, pricingZone, geometry: feature.geometry }
    })
    .filter(Boolean)
    .sort((a, b) => a.district.localeCompare(b.district, 'en', { numeric: true }))

  const styles = [...new Map([CENTER_ZONE, ...Object.values(AREA_TO_ZONE)].map((zone) => [zone.code, zone])).values()]
    .map((zone) => `<Style id="zone-${zone.code}"><LineStyle><color>ff26364f</color><width>1.4</width></LineStyle><PolyStyle><color>${zone.color}</color><fill>1</fill><outline>1</outline></PolyStyle></Style>`)
    .join('\n    ')
  const placemarks = features.map(({ district, pricingZone, geometry }) => `
    <Placemark>
      <name>${xmlEscape(district)} — ${xmlEscape(pricingZone.label)}</name>
      <description>${xmlEscape(`Postcode district ${district}; Riderra tariff zone: ${pricingZone.label}; source: ${SOURCE_REPOSITORY}; license: ${SOURCE_LICENSE}`)}</description>
      <styleUrl>#zone-${pricingZone.code}</styleUrl>
      <ExtendedData>
        <Data name="postcodeDistrict"><value>${xmlEscape(district)}</value></Data>
        <Data name="pricingZone"><value>${xmlEscape(pricingZone.label)}</value></Data>
        <Data name="pricingZoneCode"><value>${xmlEscape(pricingZone.code)}</value></Data>
      </ExtendedData>
      ${geometryToKml(geometry)}
    </Placemark>`).join('')

  const output = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>London postcode districts — Riderra tariff zones</name>
    <description>London postcode district boundaries grouped into Riderra tariff zones. ${SOURCE_LICENSE}. Source commit: ${SOURCE_COMMIT}.</description>
    ${styles}${placemarks}
  </Document>
</kml>
`.replace(/[ \t]+$/gm, '')

  fs.writeFileSync(OUTPUT_PATH, output)
  return {
    outputPath: OUTPUT_PATH,
    featureCount: features.length,
    sizeBytes: Buffer.byteLength(output),
    byPricingZone: features.reduce((result, feature) => {
      result[feature.pricingZone.label] = (result[feature.pricingZone.label] || 0) + 1
      return result
    }, {})
  }
}

if (require.main === module) {
  buildLondonPostcodeOverlay()
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => {
      console.error(error)
      process.exitCode = 1
    })
}

module.exports = { buildLondonPostcodeOverlay, pricingZoneForDistrict, SOURCE_COMMIT }
