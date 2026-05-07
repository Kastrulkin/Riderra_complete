#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const Papa = require('papaparse')

const OUT_DIR = path.join('reports', 'eto-sync')
const CACHE_PATH = path.join(OUT_DIR, 'eto_zone_geocode_cache.json')
const BOUNDARY_CACHE_PATH = path.join(OUT_DIR, 'eto_zone_boundary_cache.json')

const CATEGORY_PATTERNS = [
  ['ambiguous', /disposal|full day|to delete|up to \d+ hours|classic .* tour|within .* km|\b\d+\s*-\s*\d+\s*miles\b/i],
  ['airport', /\([A-Z0-9]{3}\)|\bairport\b|\bаэропорт\b/i],
  ['port', /\bport\b|\bharbou?r\b|\bpier\b|\bterminal\b|\bcruise\b/i],
  ['station', /\bstation\b|\brailway\b|\btrain\b|\bmetro\b|\bstazione\b/i],
  ['hotel_resort', /\bhotel\b|\bresort\b|\bhostel\b|\bboutique\b|\bsheraton\b|\bmarriott\b|\bhilton\b|\banantara\b|\baleenta\b|\bbab al shams\b/i],
  ['district_area', /district|downtown|outskirts|old town|center|centre|beach|marina|village|sathorn|silom|sukhumvit|pratunam|khaosan|khlong thoei|phra nakhon|barsha|deira|bur dubai|jvc|discovery gardens|silicon oasis|international city|miami beach|fort lauderdale city|los angeles downtown|downtown los angeles|hollywood|beverly hills|santa monica|malibu|inglewood|within 23 wards|disney area/i],
  ['island', /\bisland\b|\bkoh\b|\bko\b/i],
  ['city', /.*/]
]

const OSM_BOUNDARY_QUERIES = {
  'tokyo within 23 wards': 'Tokyo 23 wards, Tokyo, Japan',
  'disney area tokyo': 'Tokyo Disney Resort, Urayasu, Chiba, Japan',
  bangkok: 'Bangkok, Thailand',
  'bangkok outskirts': 'Bangkok Metropolitan Region, Thailand',
  'los angeles downtown': 'Downtown Los Angeles, Los Angeles, California, USA',
  'downtown los angeles': 'Downtown Los Angeles, Los Angeles, California, USA',
  'los angeles': 'Los Angeles, California, USA',
  hollywood: 'Hollywood, Los Angeles, California, USA',
  'hollywood california': 'Hollywood, Los Angeles, California, USA',
  'beverly hills': 'Beverly Hills, California, USA',
  'santa monica': 'Santa Monica, California, USA',
  malibu: 'Malibu, California, USA',
  inglewood: 'Inglewood, California, USA',
  'port of los angeles': 'Port of Los Angeles, San Pedro, Los Angeles, California, USA',
  phuket: 'Phuket, Thailand',
  'phuket town': 'Phuket, Thailand',
  'mueang phuket district': 'Mueang Phuket District, Phuket, Thailand',
  istanbul: 'Istanbul, Turkey',
  'downtown dubai': 'Downtown Dubai, Dubai, United Arab Emirates',
  'dubai marina': 'Dubai Marina, Dubai, United Arab Emirates',
  'deira dubai': 'Deira, Dubai, United Arab Emirates',
  'bur dubai area': 'Bur Dubai, Dubai, United Arab Emirates',
  paris: 'Paris, France',
  miami: 'Miami, Florida, USA',
  'miami beach': 'Miami Beach, Florida, USA',
  'port of miami': 'PortMiami, Miami, Florida, USA',
  'fort lauderdale city florida usa': 'Fort Lauderdale, Florida, USA'
}

function argValue(name, fallback = '') {
  const prefix = `--${name}=`
  const hit = process.argv.find((arg) => arg.startsWith(prefix))
  return hit ? hit.slice(prefix.length) : fallback
}

function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

function readCsv(filePath) {
  return Papa.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''), {
    header: true,
    skipEmptyLines: true
  }).data
}

function readKmlNames(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return []
  const text = fs.readFileSync(filePath, 'utf8')
  return [...text.matchAll(/<Placemark>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/Placemark>/g)]
    .map((match) => match[1])
    .map((value) => value
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'"))
}

function isAirport(name) {
  return /\([A-Z0-9]{3}\)|\bairport\b|\bаэропорт\b/i.test(name)
}

function classifyZone(row) {
  const name = String(row.name || '')
  for (const [category, pattern] of CATEGORY_PATTERNS) {
    if (pattern.test(name)) return category
  }
  return 'city'
}

function radiusKm(row) {
  const category = classifyZone(row)
  const count = Number(row.count || 0)
  if (category === 'airport') return 3
  if (category === 'port' || category === 'station') return 2
  if (category === 'hotel_resort') return 1
  if (category === 'district_area' || category === 'island') return 6
  if (count >= 50) return 18
  if (count >= 20) return 12
  return 8
}

function circleCoords(lat, lng, radiusKmValue, points = 32) {
  const coords = []
  const latRad = lat * Math.PI / 180
  const dLat = radiusKmValue / 110.574
  const dLng = radiusKmValue / (111.320 * Math.cos(latRad))
  for (let i = 0; i <= points; i += 1) {
    const angle = 2 * Math.PI * i / points
    const y = lat + dLat * Math.sin(angle)
    const x = lng + dLng * Math.cos(angle)
    coords.push(`${x.toFixed(6)},${y.toFixed(6)},0`)
  }
  return coords.join(' ')
}

function namedBoundaryCoords(name) {
  const normalized = String(name || '')
    .toLowerCase()
    .replace(/[^a-zа-яё0-9]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (normalized === 'moscow' || normalized === 'москва') {
    return moscowMkadCoords()
  }
  if (normalized === 'tokyo within 23 wards') return bboxCoords(139.56, 35.52, 139.93, 35.82)
  if (normalized === 'disney area tokyo') return bboxCoords(139.865, 35.615, 139.905, 35.650)
  if (normalized === 'bangkok') return bboxCoords(100.32, 13.55, 100.95, 13.95)
  if (normalized === 'bangkok outskirts') return bboxCoords(100.10, 13.35, 101.15, 14.15)
  if (normalized === 'downtown los angeles' || normalized === 'los angeles downtown') return bboxCoords(-118.285, 34.025, -118.220, 34.075)
  if (normalized === 'los angeles') return bboxCoords(-118.668, 33.704, -118.155, 34.337)
  if (normalized === 'hollywood california' || normalized === 'hollywood') return bboxCoords(-118.370, 34.075, -118.300, 34.125)
  if (normalized === 'beverly hills') return bboxCoords(-118.430, 34.055, -118.370, 34.095)
  if (normalized === 'santa monica') return bboxCoords(-118.525, 33.995, -118.445, 34.050)
  if (normalized === 'malibu') return bboxCoords(-118.955, 34.000, -118.600, 34.105)
  if (normalized === 'inglewood') return bboxCoords(-118.380, 33.930, -118.315, 34.000)
  if (normalized === 'miami') return bboxCoords(-80.320, 25.705, -80.135, 25.855)
  if (normalized === 'miami beach') return bboxCoords(-80.155, 25.760, -80.110, 25.885)
  if (normalized === 'fort lauderdale city florida usa') return bboxCoords(-80.220, 26.080, -80.095, 26.210)
  if (normalized === 'stockholm city center') return bboxCoords(18.030, 59.315, 18.105, 59.350)
  if (normalized === 'downtown dubai') return bboxCoords(55.255, 25.185, 55.315, 25.215)
  if (normalized === 'dubai marina') return bboxCoords(55.120, 25.065, 55.165, 25.095)
  if (normalized === 'deira dubai') return bboxCoords(55.295, 25.255, 55.355, 25.295)
  if (normalized === 'bur dubai area') return bboxCoords(55.265, 25.235, 55.315, 25.270)
  if (normalized === 'al barsha dubai') return bboxCoords(55.185, 25.085, 55.245, 25.130)
  if (normalized === 'shanghai city center') return bboxCoords(121.420, 31.190, 121.535, 31.270)
  if (normalized === 'guangzhou city center') return bboxCoords(113.220, 23.090, 113.360, 23.160)
  if (normalized === 'shenzhen city center') return bboxCoords(114.000, 22.500, 114.145, 22.585)
  if (normalized === 'marrakesh city centre riads') return bboxCoords(-7.995, 31.615, -7.970, 31.635)
  if (normalized === 'annakil') return bboxCoords(-8.030, 31.640, -7.900, 31.735)
  if (normalized === 'palmeraie') return bboxCoords(-8.050, 31.640, -7.880, 31.760)
  if (normalized === 'cercle d loudaya') return bboxCoords(-8.320, 31.500, -8.020, 31.760)
  if (normalized === 'antalya city centre district') return bboxCoords(30.665, 36.870, 30.745, 36.910)
  if (normalized === 'bogazkent boğazkent' || normalized === 'bogazkent bo azkent' || normalized === 'bogazkent') return bboxCoords(31.125, 36.815, 31.205, 36.880)
  if (normalized === 'choengmom beach and gardens') return bboxCoords(100.070, 9.560, 100.095, 9.585)
  if (normalized === 'sukhumvit road bangkok') return bboxCoords(100.540, 13.705, 100.635, 13.745)
  if (normalized === 'dubai n e outskirts') return bboxCoords(55.365, 25.120, 55.565, 25.360)
  if (normalized === 'palm jumeirah') return bboxCoords(55.095, 25.085, 55.165, 25.155)
  if (normalized === 'gøteborg göteborg gothenburg' || normalized === 'goteborg goteborg gothenburg' || normalized === 'g teborg g teborg gothenburg') return bboxCoords(11.800, 57.580, 12.100, 57.820)
  if (normalized === 'mount fuji hakone') return bboxCoords(138.880, 35.180, 139.140, 35.380)
  if (normalized === 'big buddha') return bboxCoords(98.300, 7.805, 98.345, 7.850)
  if (normalized === 'bang por') return bboxCoords(99.925, 9.555, 100.005, 9.595)
  if (normalized === 'dana') return bboxCoords(35.550, 30.600, 35.650, 30.720)
  if (normalized === 'erawan national park kanchanaburi') return bboxCoords(99.050, 14.250, 99.350, 14.550)
  if (normalized === 'king hussain bridge') return bboxCoords(35.500, 31.840, 35.585, 31.905)
  if (normalized === 'geoje island') return bboxCoords(128.450, 34.600, 128.750, 35.050)
  if (normalized === 'cairo city centre') return bboxCoords(31.220, 30.020, 31.275, 30.070)
  if (normalized === 'klong muang beach krabi') return bboxCoords(98.735, 8.020, 98.785, 8.085)
  if (normalized === 'noppharat thara beach krabi') return bboxCoords(98.795, 8.020, 98.835, 8.065)
  if (normalized === 'pratunam bangkok') return bboxCoords(100.535, 13.745, 100.555, 13.765)
  if (normalized === 'khaosan bangkok') return bboxCoords(100.493, 13.755, 100.505, 13.765)
  if (normalized === 'lovina beach') return bboxCoords(114.950, -8.185, 115.055, -8.135)
  if (normalized === 'lara beach') return bboxCoords(30.800, 36.835, 30.915, 36.885)
  if (normalized === 'petra') return bboxCoords(35.400, 30.280, 35.500, 30.365)
  if (normalized === 'saint petersburg') return bboxCoords(30.090, 59.775, 30.560, 60.090)
  if (normalized === 'sheikh hussein bridge') return bboxCoords(35.545, 32.490, 35.600, 32.525)
  if (normalized === 'basel') return bboxCoords(7.530, 47.520, 7.665, 47.600)
  if (normalized === 'malmö malmo' || normalized === 'malm malmo') return bboxCoords(12.900, 55.520, 13.120, 55.670)
  if (normalized === 'hamburg') return bboxCoords(9.730, 53.395, 10.325, 53.740)
  if (normalized === 'tai po') return bboxCoords(114.130, 22.415, 114.250, 22.520)
  if (normalized === 'tuen mun') return bboxCoords(113.930, 22.360, 114.055, 22.440)
  if (normalized === 'wong tai sin') return bboxCoords(114.185, 22.325, 114.225, 22.360)
  if (normalized === 'yuen long') return bboxCoords(113.990, 22.420, 114.090, 22.500)
  if (normalized === 'central and western') return bboxCoords(114.120, 22.275, 114.170, 22.295)
  if (normalized === 'lampoon') return bboxCoords(98.900, 18.500, 99.130, 18.680)
  if (normalized === 'rovaniemi city') return bboxCoords(25.640, 66.440, 25.900, 66.590)
  if (normalized === 'rauma') return bboxCoords(21.450, 61.060, 21.650, 61.180)
  if (normalized === 'shahdag quba qusar') return bboxCoords(48.105, 41.265, 48.205, 41.345)
  if (normalized === 'tufandag gabala') return bboxCoords(47.850, 40.980, 47.930, 41.035)
  if (normalized === 'kaitaa soukka matinkyla olari latokaski') return bboxCoords(24.610, 60.130, 24.790, 60.210)
  if (normalized === 'sadao border to malaysia songkhla') return bboxCoords(100.390, 6.600, 100.450, 6.680)
  if (normalized === 'songkhla province') return bboxCoords(100.300, 6.850, 101.100, 7.650)
  if (normalized === 'syvasenvaar') return bboxCoords(25.775, 66.535, 25.845, 66.575)
  if (normalized === 'åre are' || normalized === 're are') return bboxCoords(13.000, 63.365, 13.130, 63.440)
  if (normalized === 'avakas bay') return bboxCoords(32.300, 34.910, 32.370, 35.000)
  if (normalized === 'freiburg im breisgau') return bboxCoords(7.740, 47.940, 7.930, 48.070)
  if (normalized === 'managri') return bboxCoords(32.850, 34.805, 32.910, 34.850)
  if (normalized === 'pano ardes') return bboxCoords(32.570, 34.890, 32.635, 34.940)

  return null
}

function bboxCoords(west, south, east, north) {
  return [
    [west, south],
    [east, south],
    [east, north],
    [west, north],
    [west, south]
  ].map(([lng, lat]) => `${lng.toFixed(6)},${lat.toFixed(6)},0`).join(' ')
}

function viewportSize(viewport) {
  if (!viewport) return null
  return {
    width: Math.abs(Number(viewport.east) - Number(viewport.west)),
    height: Math.abs(Number(viewport.north) - Number(viewport.south))
  }
}

function osmLookupKey(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/\([a-z0-9]{3}\)/gi, '')
    .replace(/[^a-z0-9а-яё]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function osmBoundaryQuery(row) {
  const key = osmLookupKey(row.name)
  if (OSM_BOUNDARY_QUERIES[key]) return OSM_BOUNDARY_QUERIES[key]
  const category = classifyZone(row)
  if (category === 'city' || category === 'district_area' || category === 'island') {
    const country = String(row.countries || '').split('|')[0]
    return [row.name, country].filter(Boolean).join(', ')
  }
  return null
}

async function fetchOsmBoundary(row, cache) {
  const query = osmBoundaryQuery(row)
  if (!query) return null

  const cacheKey = query.toLowerCase()
  if (cache[cacheKey]?.viewport) return cache[cacheKey]

  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('q', query)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('polygon_geojson', '1')
  url.searchParams.set('limit', '3')
  url.searchParams.set('addressdetails', '1')
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'Riderra ETO zone preparation (demyanov@riderra.com)'
    }
  })
  const body = await response.text()
  let json
  try {
    json = JSON.parse(body)
  } catch (error) {
    const result = {
      status: 'BOUNDARY_FETCH_ERROR',
      query,
      httpStatus: response.status,
      error: `Non-JSON response: ${body.slice(0, 120).replace(/\s+/g, ' ')}`
    }
    cache[cacheKey] = result
    return result
  }
  const boundary = Array.isArray(json)
    ? json.find((item) => item.geojson && ['Polygon', 'MultiPolygon'].includes(item.geojson.type))
    : null

  const result = boundary
    ? {
        status: 'OK',
        query,
        displayName: boundary.display_name,
        osmType: boundary.osm_type,
        osmId: boundary.osm_id,
        class: boundary.class,
        type: boundary.type,
        geojson: boundary.geojson
      }
    : { status: 'NO_BOUNDARY', query }

  cache[cacheKey] = result
  return result
}

function ringArea(ring) {
  let area = 0
  for (let i = 0; i < ring.length - 1; i += 1) {
    area += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1]
  }
  return Math.abs(area / 2)
}

function simplifyRing(ring, maxPoints = 160) {
  if (ring.length <= maxPoints) return ring
  const step = Math.ceil(ring.length / maxPoints)
  const simplified = ring.filter((_, index) => index % step === 0)
  const first = simplified[0]
  const last = simplified[simplified.length - 1]
  if (first && last && (first[0] !== last[0] || first[1] !== last[1])) simplified.push(first)
  return simplified
}

function geojsonToKmlCoordinates(geojson) {
  if (!geojson) return null
  const polygons = geojson.type === 'Polygon' ? [geojson.coordinates] : geojson.coordinates
  if (!Array.isArray(polygons) || polygons.length === 0) return null
  const outerRings = polygons
    .map((polygon) => polygon?.[0])
    .filter(Array.isArray)
    .sort((a, b) => ringArea(b) - ringArea(a))
  const ring = simplifyRing(outerRings[0] || [])
  if (!ring.length) return null
  return ring.map(([lng, lat]) => `${Number(lng).toFixed(6)},${Number(lat).toFixed(6)},0`).join(' ')
}

function moscowMkadCoords() {
  // Approximation of the area inside Moscow Ring Road (MKAD), intentionally
  // excluding New Moscow. Coordinates are lon,lat and closed for KML.
  const coords = [
    [37.8420, 55.7746],
    [37.8390, 55.8180],
    [37.7850, 55.8660],
    [37.6920, 55.9120],
    [37.5900, 55.9120],
    [37.4780, 55.8840],
    [37.3980, 55.8200],
    [37.3690, 55.7360],
    [37.3940, 55.6520],
    [37.4580, 55.5830],
    [37.5600, 55.5580],
    [37.6900, 55.5730],
    [37.7890, 55.6380],
    [37.8390, 55.7160],
    [37.8420, 55.7746]
  ]
  return coords.map(([lng, lat]) => `${lng.toFixed(6)},${lat.toFixed(6)},0`).join(' ')
}

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

async function geocode(row, apiKey, cache, options = {}) {
  const name = String(row.name || '').trim()
  const country = String(row.countries || '').split('|')[0]
  const query = [name, country].filter(Boolean).join(', ')
  const cacheKey = query.toLowerCase()
  const cached = cache[cacheKey]
  if (cached && (!options.requireViewport || cached.status !== 'OK' || cached.viewport)) return cached

  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json')
  url.searchParams.set('address', query)
  url.searchParams.set('key', apiKey)
  const response = await fetch(url)
  const json = await response.json()
  if (json.status !== 'OK' || !json.results?.[0]?.geometry?.location) {
    const result = { status: json.status, error: json.error_message || 'No geocode result', query }
    cache[cacheKey] = result
    return result
  }

  const loc = json.results[0].geometry.location
  const viewport = json.results[0].geometry.bounds || json.results[0].geometry.viewport || null
  const result = {
    status: 'OK',
    query,
    formattedAddress: json.results[0].formatted_address,
    lat: loc.lat,
    lng: loc.lng,
    viewport: viewport ? {
      south: viewport.southwest.lat,
      west: viewport.southwest.lng,
      north: viewport.northeast.lat,
      east: viewport.northeast.lng
    } : null,
    placeId: json.results[0].place_id
  }
  cache[cacheKey] = result
  return result
}

async function main() {
  const input = argValue('input', path.join(OUT_DIR, 'eto_missing_zones.csv'))
  const output = argValue('output', path.join(OUT_DIR, 'eto_missing_zones_batch.kml'))
  const failuresOutput = argValue('failures', path.join(OUT_DIR, 'eto_missing_zones_geocode_failures.csv'))
  const reviewOutput = argValue('review', path.join(OUT_DIR, 'eto_missing_zones_needs_review.csv'))
  const classificationOutput = argValue('classification', path.join(OUT_DIR, 'eto_missing_zones_classified.csv'))
  const batch = argValue('batch', '')
  const excludeKml = argValue('exclude-kml', '')
  const classifyOnly = process.argv.includes('--classify-only')
  const useOsm = process.argv.includes('--use-osm')
  const limit = Number(argValue('limit', '0')) || 0
  const offset = Number(argValue('offset', '0')) || 0
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.MAPS_API_KEY || argValue('api-key')
  if (!apiKey && !classifyOnly) throw new Error('Set GOOGLE_MAPS_API_KEY or pass --api-key=...')

  let rows = readCsv(input)
    .filter((row) => row.etoStatus === 'missing' || !row.etoStatus)
    .sort((a, b) => Number(b.count || 0) - Number(a.count || 0))

  if (batch === 'top') rows = rows.slice(0, limit || 30)
  else if (batch === 'airports') rows = rows.filter((row) => ['airport', 'port', 'station'].includes(classifyZone(row)))
  else if (batch === 'cities') rows = rows.filter((row) => classifyZone(row) === 'city')
  else if (batch === 'districts') rows = rows.filter((row) => ['district_area', 'island'].includes(classifyZone(row)))
  else if (batch === 'local-review') rows = rows.filter((row) => ['hotel_resort', 'ambiguous'].includes(classifyZone(row)))

  if (excludeKml) {
    const excludedNames = new Set(excludeKml
      .split(',')
      .flatMap((filePath) => readKmlNames(filePath.trim()))
      .map((name) => name.toLowerCase()))
    rows = rows.filter((row) => !excludedNames.has(String(row.name || '').toLowerCase()))
  }

  rows = rows.slice(offset, limit && batch !== 'top' ? offset + limit : undefined)

  const cache = fs.existsSync(CACHE_PATH) ? JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8')) : {}
  const boundaryCache = fs.existsSync(BOUNDARY_CACHE_PATH) ? JSON.parse(fs.readFileSync(BOUNDARY_CACHE_PATH, 'utf8')) : {}
  const placemarks = []
  const failures = []
  const needsReview = []
  const classified = []

  for (const row of rows) {
    const category = classifyZone(row)
    classified.push({ ...row, category })
    if (classifyOnly) {
      if (category === 'ambiguous') needsReview.push({ ...row, category, reason: 'ambiguous_service_or_disposal_text' })
      if (category === 'hotel_resort') needsReview.push({ ...row, category, reason: 'hotel_resort_requires_manual_review' })
      continue
    }
    if (category === 'ambiguous') {
      needsReview.push({ ...row, category, reason: 'ambiguous_service_or_disposal_text' })
      continue
    }

    const wantsViewport = ['city', 'district_area', 'island'].includes(category)
    const geo = await geocode(row, apiKey, cache, { requireViewport: wantsViewport })
    fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2))
    if (geo.status !== 'OK') {
      failures.push({ ...row, geocodeStatus: geo.status, geocodeError: geo.error, query: geo.query })
      continue
    }

    let source = 'fallback-circle'
    const boundaryCoords = namedBoundaryCoords(row.name)
    let coordinates = boundaryCoords
    let boundaryMeta = boundaryCoords ? 'boundaryRule=named' : ''
    if (coordinates) source = 'named-boundary'

    if (useOsm && !coordinates && ['city', 'district_area', 'island'].includes(category)) {
      const boundary = await fetchOsmBoundary(row, boundaryCache)
      fs.writeFileSync(BOUNDARY_CACHE_PATH, JSON.stringify(boundaryCache, null, 2))
      if (boundary?.status === 'OK') {
        coordinates = geojsonToKmlCoordinates(boundary.geojson)
        if (coordinates) {
          source = 'osm-boundary'
          boundaryMeta = `osm=${boundary.osmType}/${boundary.osmId}; osmType=${boundary.type}; boundaryQuery=${boundary.query}`
        }
      }
    }

    if (!coordinates && geo.viewport && ['city', 'district_area', 'island'].includes(category)) {
      const size = viewportSize(geo.viewport)
      if (category === 'city' && size && (size.width < 0.006 || size.height < 0.006)) {
        boundaryMeta = `smallGoogleViewport=${geo.viewport.west.toFixed(5)},${geo.viewport.south.toFixed(5)},${geo.viewport.east.toFixed(5)},${geo.viewport.north.toFixed(5)}`
      } else {
      coordinates = bboxCoords(geo.viewport.west, geo.viewport.south, geo.viewport.east, geo.viewport.north)
      source = 'google-viewport'
      boundaryMeta = `googleViewport=${geo.viewport.west.toFixed(5)},${geo.viewport.south.toFixed(5)},${geo.viewport.east.toFixed(5)},${geo.viewport.north.toFixed(5)}`
      }
    }

    if (!coordinates && ['hotel_resort'].includes(category)) {
      needsReview.push({ ...row, category, reason: 'hotel_resort_requires_manual_review' })
      continue
    }

    const radius = radiusKm(row)
    coordinates = coordinates || circleCoords(Number(geo.lat), Number(geo.lng), radius)
    placemarks.push(`    <Placemark>
      <name>${escapeXml(row.name)}</name>
      <description>${escapeXml(`source=Riderra price book; count=${row.count}; countries=${row.countries}; category=${category}; geometrySource=${source}; ${boundaryMeta || `radiusKm=${radius}`}; geocode=${geo.formattedAddress}`)}</description>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>${coordinates}</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>`)
  }

  const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Riderra ETO missing zones batch</name>
${placemarks.join('\n')}
  </Document>
</kml>
`

  if (!classifyOnly) fs.writeFileSync(output, kml)
  const failureHeaders = ['name', 'count', 'countries', 'cities', 'roles', 'samples', 'geocodeStatus', 'geocodeError', 'query']
  fs.writeFileSync(failuresOutput, [
    failureHeaders.map(csvCell).join(','),
    ...failures.map((row) => failureHeaders.map((h) => csvCell(row[h])).join(','))
  ].join('\n'))
  const reviewHeaders = ['name', 'count', 'countries', 'cities', 'roles', 'samples', 'category', 'reason']
  fs.writeFileSync(reviewOutput, [
    reviewHeaders.map(csvCell).join(','),
    ...needsReview.map((row) => reviewHeaders.map((h) => csvCell(row[h])).join(','))
  ].join('\n'))
  const classificationHeaders = ['name', 'count', 'countries', 'cities', 'roles', 'samples', 'etoStatus', 'category']
  fs.writeFileSync(classificationOutput, [
    classificationHeaders.map(csvCell).join(','),
    ...classified.map((row) => classificationHeaders.map((h) => csvCell(row[h])).join(','))
  ].join('\n'))

  console.log(JSON.stringify({
    input,
    output,
    excludeKml: excludeKml || null,
    failuresOutput,
    reviewOutput,
    classificationOutput,
    batch: batch || null,
    classifyOnly,
    useOsm,
    requested: rows.length,
    placemarks: placemarks.length,
    failures: failures.length,
    needsReview: needsReview.length,
    cache: CACHE_PATH
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
