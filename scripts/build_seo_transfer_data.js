#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const Papa = require('papaparse')

const rootDir = path.resolve(__dirname, '..')
const inputPath = process.argv[2] || path.join(rootDir, 'reports', 'eto-sync', 'riderra_city_pricing_active_fixed.csv')
const outputPath = process.argv[3] || path.join(rootDir, 'server', 'seo_transfers.json')

const baseUrl = 'https://riderra.com'

const countryMeta = {
  Thailand: { slug: 'thailand', name: 'Thailand', adjective: 'Thailand', meeting: 'A local airport representative waits at the assigned meeting point. Riderra sends clear meeting instructions before pickup.' },
  Turkey: { slug: 'turkey', name: 'Turkey', adjective: 'Turkey', meeting: 'A local airport representative waits at the assigned meeting point. Riderra sends clear meeting instructions before pickup.' },
  'United Arab Emirates': { slug: 'uae', name: 'UAE', adjective: 'UAE', meeting: 'Riderra sends pickup instructions before the ride and confirms the exact meeting point for the selected airport or district.' },
  'United Kingdom': { slug: 'uk', name: 'United Kingdom', adjective: 'UK', meeting: 'For airport arrivals, the driver meets passengers with a name sign or follows the confirmed pickup point instructions.' },
  Finland: { slug: 'finland', name: 'Finland', adjective: 'Finland', meeting: 'For airport arrivals, the driver meets passengers with a name sign or follows the confirmed pickup point instructions.' },
  'United States of America': { slug: 'usa', name: 'USA', adjective: 'US', meeting: 'The driver contacts passengers before pickup and confirms the exact curbside or meeting point.' },
  Cyprus: { slug: 'cyprus', name: 'Cyprus', adjective: 'Cyprus', meeting: 'For airport arrivals, the driver meets passengers with a name sign or follows the confirmed pickup point instructions.' }
}

const priorityAirportCodes = new Set([
  'HKT', 'BKK', 'DMK', 'USM', 'KBV',
  'AYT', 'DLM',
  'DXB', 'AUH', 'SHJ',
  'LHR', 'LGW', 'LCY',
  'HEL', 'RVN',
  'LAX', 'MIA', 'JFK', 'EWR',
  'LCA', 'PFO'
])

const vehicleLabels = {
  'Standard class car': 'Standard car',
  'Business class car': 'Business car',
  'First class car': 'First class car',
  'Standard MPV': 'Standard MPV',
  'Standard e-vehicle 3 pax': 'Standard e-vehicle 3 pax',
  SUV: 'SUV',
  'Lux SUV': 'Lux SUV',
  'Standard minivan': 'Standard minivan',
  'Standard minivan 6 pax': 'Standard minivan 6 pax',
  'Standard minivan 7 pax': 'Standard minivan 7 pax',
  'Standard minivan 8 pax': 'Standard minivan 8 pax',
  'Businessvan 5 pax': 'Business van 5 pax',
  'Businessvan 6 pax': 'Business van 6 pax',
  'Standard Minibus 9pax': 'Standard minibus 9 pax',
  'Standard Minibus 13pax': 'Standard minibus 13 pax',
  'Standard Minibus 16pax': 'Standard minibus 16 pax',
  'Minibus 19 pax': 'Minibus 19 pax',
  'Coach 30 pax': 'Coach 30 pax',
  'Coach 45pax': 'Coach 45 pax'
}

const vehicleOrder = [
  'Standard class car',
  'Standard e-vehicle 3 pax',
  'Standard MPV',
  'SUV',
  'Business class car',
  'First class car',
  'Standard minivan',
  'Standard minivan 6 pax',
  'Standard minivan 7 pax',
  'Standard minivan 8 pax',
  'Businessvan 5 pax',
  'Businessvan 6 pax',
  'Standard Minibus 9pax',
  'Standard Minibus 13pax',
  'Standard Minibus 16pax',
  'Minibus 19 pax',
  'Coach 30 pax',
  'Coach 45pax',
  'Lux SUV'
]

const curatedDestinationPatterns = {
  HKT: /patong|karon|kata|kamala|chalong|phuket|khao lak|ao nang/i,
  BKK: /bangkok|pattaya|sukhumvit|don muang|rayong/i,
  DMK: /bangkok|sukhumvit|korat/i,
  USM: /chaweng|bophut|bangrak|nathon|koh phangan/i,
  KBV: /ao nang|krabi|phuket|koh lanta/i,
  AYT: /belek|kemer|alanya|side|lara|manavgat|konyaalti/i,
  DLM: /marmaris|datca|hisaronu|fethiye/i,
  DXB: /downtown|deira|abu dhabi|sharjah|palm|ras al khaimah/i,
  AUH: /abu dhabi|dubai|ajman|al ain|sharjah/i,
  SHJ: /sharjah|dubai|palm|ajman|ras al khaimah/i,
  LHR: /city center|gatwick|east|north|west|brighton/i,
  LGW: /east|north|west|south/i,
  LCY: /east|north|west|south/i,
  HEL: /helsinki|espoo|vantaa|porvoo|turku|tampere/i,
  RVN: /rovaniemi|city|santa|luosto|levi/i,
  LAX: /downtown|hollywood|beverly|anaheim|santa monica|malibu/i,
  MIA: /miami|beach|fort lauderdale|port/i,
  JFK: /manhattan|new york|brooklyn|queens/i,
  EWR: /manhattan|new york|brooklyn|queens/i,
  LCA: /ayia napa|limassol|larnaca|nicosia|protaras/i,
  PFO: /paphos|limassol|nicosia|polis|coral/i
}

const curatedDestinationPriority = {
  HKT: ['patong', 'karon', 'kata', 'kamala', 'chalong'],
  AYT: ['belek', 'kemer', 'alanya', 'side', 'lara'],
  LHR: ['london city center', 'london east', 'london north', 'gatwick', 'brighton'],
  HEL: ['helsinki', 'espoo', 'vantaa', 'porvoo', 'turku'],
  RVN: ['rovaniemi', 'luosto', 'levi'],
  LCA: ['ayia napa', 'limassol', 'larnaca', 'nicosia', 'protaras'],
  PFO: ['paphos', 'limassol', 'polis', 'nicosia'],
  DXB: ['downtown', 'deira', 'abu dhabi', 'sharjah', 'palm'],
  AUH: ['abu dhabi', 'dubai', 'ajman', 'al ain'],
  SHJ: ['sharjah', 'dubai', 'palm', 'ajman'],
  LAX: ['downtown', 'hollywood', 'beverly', 'anaheim', 'santa monica'],
  MIA: ['miami', 'miami beach', 'fort lauderdale', 'port']
}

function normalize(value) {
  return String(value || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
}

function slugify(value) {
  return normalize(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90)
}

function airportCode(value) {
  const match = normalize(value).match(/\(([A-Z0-9]{3})\)/)
  return match ? match[1] : null
}

function vehicleSortKey(vehicleType) {
  const index = vehicleOrder.indexOf(vehicleType)
  return index === -1 ? 99 : index
}

function numberOrNull(value) {
  const n = Number(String(value || '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function formatPrice(price) {
  return `EUR ${Math.round(price)}`
}

function destinationPriorityScore(airportCode, destination) {
  const terms = curatedDestinationPriority[airportCode] || []
  const normalized = normalize(destination).toLowerCase()
  const index = terms.findIndex((term) => normalized.includes(term))
  return index === -1 ? 100 : index
}

function compactVehiclePrices(items) {
  const best = new Map()
  for (const item of items) {
    const current = best.get(item.vehicleType)
    if (!current || item.price < current.price) best.set(item.vehicleType, item)
  }
  return Array.from(best.values())
    .sort((a, b) => vehicleSortKey(a.vehicleType) - vehicleSortKey(b.vehicleType) || a.price - b.price)
    .map((item) => ({
      vehicleType: item.vehicleType,
      label: vehicleLabels[item.vehicleType] || item.vehicleType,
      price: item.price,
      priceText: formatPrice(item.price)
    }))
}

function readRows() {
  const raw = fs.readFileSync(inputPath, 'utf8').replace(/^\uFEFF/, '')
  const parsed = Papa.parse(raw, { header: true, skipEmptyLines: true })
  if (parsed.errors && parsed.errors.length) {
    throw new Error(`CSV parse failed: ${parsed.errors[0].message}`)
  }
  return parsed.data
    .map((row) => ({
      country: normalize(row.country),
      routeFrom: normalize(row.routeFrom),
      routeTo: normalize(row.routeTo),
      vehicleType: normalize(row.vehicleType),
      price: numberOrNull(row.fixedPrice),
      currency: normalize(row.currency),
      source: normalize(row.source)
    }))
    .filter((row) => row.source === 'base_price_xlsx' && row.currency === 'EUR' && row.country && row.routeFrom && row.routeTo && row.price !== null)
}

function buildData() {
  const rows = readRows()
  const routeMap = new Map()

  for (const row of rows) {
    if (!countryMeta[row.country]) continue
    const code = airportCode(row.routeFrom)
    if (!code) continue
    const key = `${row.country}|${row.routeFrom}|${row.routeTo}`
    const route = routeMap.get(key) || {
      country: row.country,
      routeFrom: row.routeFrom,
      routeTo: row.routeTo,
      airportCode: code,
      items: []
    }
    route.items.push({ vehicleType: row.vehicleType, price: row.price })
    routeMap.set(key, route)
  }

  const airportsByKey = new Map()
  for (const route of routeMap.values()) {
    const airportKey = `${route.country}|${route.routeFrom}`
    const airport = airportsByKey.get(airportKey) || {
      country: route.country,
      countrySlug: countryMeta[route.country].slug,
      countryName: countryMeta[route.country].name,
      airportName: route.routeFrom,
      airportCode: route.airportCode,
      routes: []
    }
    const vehicles = compactVehiclePrices(route.items)
    airport.routes.push({
      destination: route.routeTo,
      destinationSlug: slugify(route.routeTo),
      minPrice: Math.min(...vehicles.map((item) => item.price)),
      minPriceText: formatPrice(Math.min(...vehicles.map((item) => item.price))),
      vehicles
    })
    airportsByKey.set(airportKey, airport)
  }

  const airports = Array.from(airportsByKey.values())
    .filter((airport) => priorityAirportCodes.has(airport.airportCode) || airport.routes.length >= 6)
    .map((airport) => {
      const airportSlug = `${slugify(airport.airportName.replace(/\([A-Z0-9]{3}\)/, ''))}-${airport.airportCode.toLowerCase()}`
      const routes = airport.routes
        .sort((a, b) => a.minPrice - b.minPrice || a.destination.localeCompare(b.destination))
      const popularPattern = curatedDestinationPatterns[airport.airportCode]
      const popularRoutes = routes
        .filter((route) => popularPattern ? popularPattern.test(route.destination) : true)
        .slice(0, 8)
      return {
        ...airport,
        airportSlug,
        path: `/transfers/${airport.countrySlug}/${airportSlug}`,
        title: `${airport.airportName} transfers`,
        description: `Private ${airport.countryMetaName || airport.countryName} airport transfers from ${airport.airportName}. Compare popular destinations, vehicle classes, and fixed route prices from ${formatPrice(routes[0].minPrice)}.`,
        routeCount: routes.length,
        minPrice: routes[0].minPrice,
        minPriceText: formatPrice(routes[0].minPrice),
        routes,
        popularRoutes: popularRoutes.length ? popularRoutes : routes.slice(0, 8),
        meeting: countryMeta[airport.country].meeting
      }
    })
    .sort((a, b) => a.countryName.localeCompare(b.countryName) || b.routeCount - a.routeCount || a.airportName.localeCompare(b.airportName))

  const airportsByCountry = new Map()
  for (const airport of airports) {
    const list = airportsByCountry.get(airport.country) || []
    list.push(airport)
    airportsByCountry.set(airport.country, list)
  }

  const countries = Array.from(airportsByCountry.entries()).map(([country, countryAirports]) => {
    const meta = countryMeta[country]
    const routes = countryAirports.flatMap((airport) => airport.routes.map((route) => ({ ...route, airportName: airport.airportName, airportCode: airport.airportCode, airportPath: airport.path })))
    routes.sort((a, b) => a.minPrice - b.minPrice || a.airportName.localeCompare(b.airportName))
    return {
      country,
      countryName: meta.name,
      countrySlug: meta.slug,
      adjective: meta.adjective,
      path: `/transfers/${meta.slug}`,
      title: `Airport transfers in ${meta.name}`,
      description: `Private airport transfers in ${meta.name} with Riderra. Browse airports, popular routes, fixed prices from ${formatPrice(routes[0].minPrice)}, and vehicle classes.`,
      airportCount: countryAirports.length,
      routeCount: routes.length,
      minPrice: routes[0].minPrice,
      minPriceText: formatPrice(routes[0].minPrice),
      meeting: meta.meeting,
      airports: countryAirports.map((airport) => ({
        airportName: airport.airportName,
        airportCode: airport.airportCode,
        path: airport.path,
        routeCount: airport.routeCount,
        minPriceText: airport.minPriceText
      })),
      popularRoutes: routes.slice(0, 12).map((route) => ({
        airportName: route.airportName,
        airportCode: route.airportCode,
        airportPath: route.airportPath,
        destination: route.destination,
        minPriceText: route.minPriceText
      }))
    }
  }).sort((a, b) => a.countryName.localeCompare(b.countryName))

  const routePages = []
  for (const airport of airports.filter((item) => priorityAirportCodes.has(item.airportCode))) {
    const pattern = curatedDestinationPatterns[airport.airportCode]
    const selected = airport.routes
      .filter((route) => pattern ? pattern.test(route.destination) : true)
      .sort((a, b) => destinationPriorityScore(airport.airportCode, a.destination) - destinationPriorityScore(airport.airportCode, b.destination) || a.minPrice - b.minPrice)
      .slice(0, 5)
    for (const route of selected) {
      routePages.push({
        country: airport.country,
        countryName: airport.countryName,
        countrySlug: airport.countrySlug,
        airportName: airport.airportName,
        airportCode: airport.airportCode,
        airportPath: airport.path,
        airportSlug: airport.airportSlug,
        destination: route.destination,
        destinationSlug: route.destinationSlug,
        path: `${airport.path}/${route.destinationSlug}`,
        title: `${airport.airportName} to ${route.destination} transfer`,
        description: `Private transfer from ${airport.airportName} to ${route.destination}. Fixed price from ${route.minPriceText}, vehicle options, pickup instructions, and return transfer details.`,
        minPrice: route.minPrice,
        minPriceText: route.minPriceText,
        vehicles: route.vehicles,
        meeting: airport.meeting,
        relatedRoutes: airport.routes
          .filter((candidate) => candidate.destination !== route.destination)
          .slice(0, 6)
          .map((candidate) => ({
            destination: candidate.destination,
            path: `${airport.path}/${candidate.destinationSlug}`,
            minPriceText: candidate.minPriceText
          }))
      })
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    source: path.relative(rootDir, inputPath),
    baseUrl,
    countries,
    airports,
    routePages
  }
}

const data = buildData()
fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, `${JSON.stringify(data, null, 2)}\n`)
console.log(JSON.stringify({
  output: path.relative(rootDir, outputPath),
  countries: data.countries.length,
  airports: data.airports.length,
  routePages: data.routePages.length
}, null, 2))
