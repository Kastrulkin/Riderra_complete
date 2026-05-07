#!/usr/bin/env node
require('dotenv').config()

const fs = require('fs')
const path = require('path')
const Papa = require('papaparse')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const OUT_DIR = path.join('reports', 'eto-sync')

const VEHICLE_TO_ETO_COLUMN = {
  'standard class car': 'Saloon',
  'business class car': 'Executive',
  'first class car': 'Lux',
  'lux suv': 'Lux',
  suv: 'SUV',
  'standard e vehicle 3 pax': 'Electric Standard',
  'standard mpv': 'MPV',
  'standard minivan': 'MPV',
  'standard minivan 6 pax': 'MV 6 pax',
  'standard minivan 7 pax': 'MV 7 pax',
  'standard minivan 8 pax': 'MV 8 pax',
  'standard minibus 16pax': 'Sprinter',
  'businessvan 5 pax': 'Businessvan 5 pax',
  'businessvan 6 pax': 'Businessvan 6 pax',
  'standard minibus 9pax': 'Standard Minibus 9pax',
  'standard minibus 13pax': 'Standard Minibus 13pax',
  'minibus 19 pax': 'Minibus 19 pax',
  'coach 30 pax': 'Coach 30 pax',
  'coach 45pax': 'Coach 45pax'
}

const ETO_HEADERS = [
  'From',
  'To',
  'Price',
  'Lux',
  'MV 8 pax',
  'Sprinter',
  'SUV',
  'Electric Standard',
  'Saloon',
  'Estate',
  'Executive',
  'MPV',
  'MV 6 pax',
  'MV 7 pax',
  'Businessvan 5 pax',
  'Businessvan 6 pax',
  'Standard Minibus 13pax',
  'Standard Minibus 9pax',
  'Minibus 19 pax',
  'Coach 30 pax',
  'Coach 45pax'
]

function normCell(value) {
  return String(value ?? '').replace(/\u00a0/g, ' ').trim()
}

function normKey(value) {
  return normCell(value)
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/&/g, ' and ')
    .replace(/\bintl\b/g, 'international')
    .replace(/\bairport\b/g, 'airport')
    .replace(/[^a-z0-9а-яё]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function looseZoneKey(value) {
  return normKey(value)
    .replace(/\(([a-z0-9]{3})\)/gi, '$1')
    .replace(/\bairport\b/g, '')
    .replace(/\binternational\b/g, '')
    .replace(/\bcity centre\b/g, 'city center')
    .replace(/\s+/g, ' ')
    .trim()
}

function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

function parseCsv(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '')
  return Papa.parse(raw, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => normCell(h)
  }).data
}

function loadEtoZones(filePath) {
  if (!filePath) return []
  const rows = parseCsv(filePath)
  return rows
    .map((row) => {
      const name = normCell(row.Name || row.name || row.Zone || row.zone || row['Zone name'] || row['zone name'])
      return name ? { name, raw: row } : null
    })
    .filter(Boolean)
}

function loadExcludedPlaces() {
  const filePath = path.join(OUT_DIR, 'eto_zone_excluded_places.csv')
  if (!fs.existsSync(filePath)) return []
  return parseCsv(filePath)
    .map((row) => ({
      name: normCell(row.name || row.Name),
      reason: normCell(row.reason)
    }))
    .filter((row) => row.name)
}

function loadArchiveRules() {
  const filePath = path.join(OUT_DIR, 'price005_vs_db_archive_exclude.csv')
  if (!fs.existsSync(filePath)) return []
  const rows = parseCsv(filePath)
  const rules = []
  for (const row of rows) {
    const from = normCell(row.routeFrom)
    const to = normCell(row.routeTo)
    const vehicleType = normCell(row.vehicleType)
    const comment = normCell(row.comment)
    if (/John Wayne Airport \(SNA\)/i.test(`${from} ${to} ${comment}`)) {
      rules.push({
        kind: 'place',
        place: 'John Wayne Airport (SNA)',
        reason: 'archive_exclude_from_eto'
      })
    } else if (/Los Angeles Airport \(LAX\)/i.test(from) && vehicleType) {
      rules.push({
        kind: 'vehicle_route',
        from,
        vehicleType,
        reason: 'archive_exclude_from_eto'
      })
    }
  }
  const seen = new Set()
  return rules.filter((rule) => {
    const key = JSON.stringify(rule)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function shouldArchiveRow(row, archiveRules) {
  for (const rule of archiveRules) {
    if (rule.kind === 'place') {
      if (normKey(row.routeFrom) === normKey(rule.place) || normKey(row.routeTo) === normKey(rule.place)) return rule.reason
    } else if (rule.kind === 'vehicle_route') {
      if (normKey(row.routeFrom) === normKey(rule.from) && normKey(row.vehicleType) === normKey(rule.vehicleType)) return rule.reason
    }
  }
  return ''
}

function shouldExcludePlaceRow(row, excludedPlaces) {
  const excluded = new Set(excludedPlaces.map((z) => normKey(z.name)))
  if (excluded.has(normKey(row.routeFrom))) return 'excluded_from_place_list'
  if (excluded.has(normKey(row.routeTo))) return 'excluded_from_place_list'
  return ''
}

function writeCsv(filePath, headers, rows) {
  const lines = [headers.map(csvCell).join(',')]
  for (const row of rows) {
    lines.push(headers.map((h) => csvCell(row[h])).join(','))
  }
  fs.writeFileSync(filePath, lines.join('\n'))
}

async function loadRiderraPriceRows() {
  const tenant = await prisma.tenant.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true, code: true, name: true }
  })
  if (!tenant) throw new Error('Active tenant not found')

  const rows = await prisma.cityPricing.findMany({
    where: {
      tenantId: tenant.id,
      isActive: true,
      fixedPrice: { not: null }
    },
    orderBy: [
      { country: 'asc' },
      { city: 'asc' },
      { routeFrom: 'asc' },
      { routeTo: 'asc' },
      { vehicleType: 'asc' }
    ]
  })

  return { tenant, rows }
}

function buildRequiredPlaces(priceRows) {
  const places = new Map()
  const add = (place, row, role) => {
    const name = normCell(place)
    if (!name) return
    const key = normKey(name)
    if (!places.has(key)) {
      places.set(key, {
        name,
        count: 0,
        countries: new Set(),
        cities: new Set(),
        roles: new Set(),
        samples: []
      })
    }
    const item = places.get(key)
    item.count += 1
    if (row.country) item.countries.add(row.country)
    if (row.city) item.cities.add(row.city)
    item.roles.add(role)
    if (item.samples.length < 3) item.samples.push(`${row.routeFrom} -> ${row.routeTo}`)
  }

  for (const row of priceRows) {
    add(row.routeFrom, row, 'from')
    add(row.routeTo, row, 'to')
  }

  return [...places.values()]
    .map((item) => ({
      name: item.name,
      count: item.count,
      countries: [...item.countries].join('|'),
      cities: [...item.cities].join('|'),
      roles: [...item.roles].join('|'),
      samples: item.samples.join(' || ')
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

function compareZones(requiredPlaces, etoZones, excludedPlaces = []) {
  const etoExact = new Set(etoZones.map((z) => normKey(z.name)))
  const etoLoose = new Set(etoZones.map((z) => looseZoneKey(z.name)))
  const excluded = new Set(excludedPlaces.map((z) => normKey(z.name)))

  return requiredPlaces.map((place) => {
    if (excluded.has(normKey(place.name))) {
      return {
        ...place,
        etoStatus: 'excluded_not_needed'
      }
    }
    const exact = etoExact.has(normKey(place.name))
    const loose = etoLoose.has(looseZoneKey(place.name))
    return {
      ...place,
      etoStatus: exact ? 'present_exact' : loose ? 'present_loose' : 'missing'
    }
  })
}

function buildEtoImport(priceRows) {
  const routes = new Map()
  const unmapped = []
  const conflicts = []

  for (const row of priceRows) {
    const column = VEHICLE_TO_ETO_COLUMN[normKey(row.vehicleType)]
    if (!column) {
      unmapped.push(row)
      continue
    }

    const routeKey = [row.country, row.routeFrom, row.routeTo].map(normKey).join('\t')
    if (!routes.has(routeKey)) {
      routes.set(routeKey, {
        country: row.country || '',
        From: row.routeFrom || '',
        To: row.routeTo || '',
        values: {}
      })
    }

    const route = routes.get(routeKey)
    const price = Number(row.fixedPrice)
    if (route.values[column] !== undefined && route.values[column] !== price) {
      conflicts.push({
        country: row.country || '',
        from: row.routeFrom || '',
        to: row.routeTo || '',
        vehicleType: row.vehicleType || '',
        etoColumn: column,
        existing: route.values[column],
        candidate: price,
        source: row.source || '',
        notes: row.notes || ''
      })
      route.values[column] = Math.max(route.values[column], price)
    } else {
      route.values[column] = price
    }

    if (column === 'Saloon' && route.values.Price === undefined) {
      route.values.Price = price
    }
  }

  const importRows = [...routes.values()]
    .sort((a, b) => `${a.country}${a.From}${a.To}`.localeCompare(`${b.country}${b.From}${b.To}`))
    .map((route) => {
      const row = {}
      for (const h of ETO_HEADERS) {
        if (h === 'From') row[h] = route.From
        else if (h === 'To') row[h] = route.To
        else if (h === 'Price') row[h] = route.values[h] ?? 0
        else row[h] = route.values[h] ?? 0
      }
      return row
    })

  return { importRows, unmapped, conflicts }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })

  const etoZonesCsv = process.argv[2] || ''
  const { tenant, rows } = await loadRiderraPriceRows()
  const requiredPlaces = buildRequiredPlaces(rows)
  const etoZones = loadEtoZones(etoZonesCsv)
  const excludedPlaces = loadExcludedPlaces()
  const archiveRules = loadArchiveRules()
  const zoneComparison = compareZones(requiredPlaces, etoZones, excludedPlaces)
  const missingZones = zoneComparison.filter((row) => row.etoStatus === 'missing')
  const etoExcludedRows = []
  const etoCandidateRows = rows.filter((row) => {
    const archiveReason = shouldArchiveRow(row, archiveRules)
    const placeReason = shouldExcludePlaceRow(row, excludedPlaces)
    const reason = archiveReason || placeReason
    if (reason) {
      etoExcludedRows.push({
        country: row.country || '',
        city: row.city || '',
        routeFrom: row.routeFrom || '',
        routeTo: row.routeTo || '',
        vehicleType: row.vehicleType || '',
        fixedPrice: row.fixedPrice ?? '',
        currency: row.currency || '',
        source: row.source || '',
        notes: row.notes || '',
        reason
      })
      return false
    }
    return true
  })
  const { importRows, unmapped, conflicts } = buildEtoImport(etoCandidateRows)

  writeCsv(path.join(OUT_DIR, 'riderra_price_places_required.csv'), ['name', 'count', 'countries', 'cities', 'roles', 'samples'], requiredPlaces)
  writeCsv(path.join(OUT_DIR, 'eto_zone_comparison.csv'), ['name', 'count', 'countries', 'cities', 'roles', 'samples', 'etoStatus'], zoneComparison)
  writeCsv(path.join(OUT_DIR, 'eto_missing_zones.csv'), ['name', 'count', 'countries', 'cities', 'roles', 'samples', 'etoStatus'], missingZones)

  const etoImportLines = [ETO_HEADERS.map(csvCell).join(';')]
  for (const row of importRows) {
    etoImportLines.push(ETO_HEADERS.map((h) => csvCell(row[h])).join(';'))
  }
  fs.writeFileSync(path.join(OUT_DIR, 'eto_fixed_prices_draft_confident_mapping.csv'), `\uFEFF${etoImportLines.join('\n')}`)

  writeCsv(path.join(OUT_DIR, 'eto_unmapped_vehicle_types.csv'), ['country', 'city', 'routeFrom', 'routeTo', 'vehicleType', 'fixedPrice', 'currency', 'source', 'notes'], unmapped)
  writeCsv(path.join(OUT_DIR, 'eto_price_conflicts_same_route_vehicle.csv'), ['country', 'from', 'to', 'vehicleType', 'etoColumn', 'existing', 'candidate', 'source', 'notes'], conflicts)
  writeCsv(path.join(OUT_DIR, 'eto_fixed_prices_excluded_from_import.csv'), ['country', 'city', 'routeFrom', 'routeTo', 'vehicleType', 'fixedPrice', 'currency', 'source', 'notes', 'reason'], etoExcludedRows)

  const summary = {
    tenant,
    sourceRows: rows.length,
    requiredPlaces: requiredPlaces.length,
    etoZonesLoaded: etoZones.length,
    missingZones: missingZones.length,
    excludedPlaces: excludedPlaces.length,
    draftImportRoutes: importRows.length,
    etoCandidateRows: etoCandidateRows.length,
    etoExcludedRows: etoExcludedRows.length,
    confidentMappedRows: etoCandidateRows.length - unmapped.length,
    unmappedRows: unmapped.length,
    unmappedCounts: unmapped.reduce((acc, row) => {
      acc[row.vehicleType || ''] = (acc[row.vehicleType || ''] || 0) + 1
      return acc
    }, {}),
    conflicts: conflicts.length,
    inputEtoZonesCsv: etoZonesCsv || null
  }

  fs.writeFileSync(path.join(OUT_DIR, 'eto_draft_summary.json'), JSON.stringify(summary, null, 2))
  console.log(JSON.stringify(summary, null, 2))
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
