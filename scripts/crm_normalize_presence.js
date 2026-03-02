#!/usr/bin/env node
require('dotenv').config()

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()
const dryRun = process.argv.includes('--dry-run')

function splitPresence(raw) {
  return String(raw || '')
    .split(/[,\n;|/]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function uniqueList(items) {
  const seen = new Set()
  const out = []
  for (const item of items) {
    const value = String(item || '').trim()
    if (!value) continue
    const key = value.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(value)
  }
  return out
}

function normalizeCountryName(raw) {
  const value = String(raw || '').trim()
  if (!value || value === '—') return ''
  const key = value.toLowerCase()
  const map = {
    uk: 'United Kingdom',
    'u.k.': 'United Kingdom',
    'great britain': 'United Kingdom',
    britain: 'United Kingdom',
    'united kingdom': 'United Kingdom',
    'велкобритания': 'United Kingdom',
    'великобритания': 'United Kingdom',
    'англия': 'United Kingdom',
    uae: 'UAE',
    'u.a.e.': 'UAE',
    'united arab emirates': 'UAE',
    'эмирейтс': 'UAE',
    'оаэ': 'UAE'
  }
  return map[key] || value
}

function normalizeCityName(raw) {
  return String(raw || '').trim().toLowerCase()
}

function inferCountryFromCity(rawCity) {
  const city = normalizeCityName(rawCity)
  const map = {
    london: 'United Kingdom',
    dubai: 'UAE',
    paris: 'France',
    rome: 'Italy',
    vienna: 'Austria',
    madrid: 'Spain',
    cancun: 'Mexico'
  }
  return map[city] || ''
}

function parseStructuredPresence(rawCountries, rawPresenceCities, rawFlatCities) {
  const groupedRaw = String(rawPresenceCities || '').trim()
  const rows = []

  if (groupedRaw && groupedRaw.includes(':')) {
    for (const line of groupedRaw.split(/\n+/).map((item) => item.trim()).filter(Boolean)) {
      const separator = line.indexOf(':')
      const country = normalizeCountryName((separator >= 0 ? line.slice(0, separator) : line).trim())
      const cityChunk = separator >= 0 ? line.slice(separator + 1) : ''
      const cities = uniqueList(splitPresence(cityChunk))
      rows.push({
        country,
        cities
      })
    }
    return { rows, ambiguous: false, source: 'structured' }
  }

  const countries = uniqueList(splitPresence(rawCountries).map(normalizeCountryName))
  const flatCities = uniqueList(splitPresence(rawFlatCities || rawPresenceCities))

  if (!countries.length && !flatCities.length) {
    return { rows: [], ambiguous: false, source: 'empty' }
  }

  if (countries.length <= 1) {
    return {
      rows: [{ country: countries[0] || '', cities: flatCities }],
      ambiguous: false,
      source: 'single-country'
    }
  }

  if (!flatCities.length) {
    return {
      rows: countries.map((country) => ({ country, cities: [] })),
      ambiguous: false,
      source: 'countries-only'
    }
  }

  const grouped = new Map()
  let unresolved = 0
  for (const city of flatCities) {
    const inferredCountry = normalizeCountryName(inferCountryFromCity(city))
    if (!inferredCountry) {
      unresolved += 1
      continue
    }
    if (!grouped.has(inferredCountry)) grouped.set(inferredCountry, [])
    grouped.get(inferredCountry).push(city)
  }

  if (unresolved > 0) {
    return { rows: [], ambiguous: true, source: 'ambiguous' }
  }

  if (grouped.size === 0) {
    return { rows: [], ambiguous: true, source: 'ambiguous' }
  }

  return {
    rows: Array.from(grouped.entries()).map(([country, cities]) => ({
      country,
      cities: uniqueList(cities)
    })),
    ambiguous: false,
    source: 'inferred'
  }
}

function buildNormalizedPresence(parsed) {
  const rows = []
  const countries = []
  const cities = []

  for (const entry of parsed.rows) {
    const country = normalizeCountryName(entry.country)
    const rowCities = uniqueList(entry.cities || [])
    if (country) countries.push(country)
    for (const city of rowCities) cities.push(city)
    if (country || rowCities.length) {
      rows.push(country ? (rowCities.length ? `${country}: ${rowCities.join(', ')}` : country) : `Без страны: ${rowCities.join(', ')}`)
    }
  }

  return {
    presenceCountries: uniqueList(countries).join(', '),
    countryPresence: uniqueList(countries).join(', '),
    presenceCities: rows.join('\n'),
    cityPresence: uniqueList(cities).join(', ')
  }
}

function needsUpdate(record, nextData) {
  return (
    (record.presenceCountries || '') !== (nextData.presenceCountries || '') ||
    (record.countryPresence || '') !== (nextData.countryPresence || '') ||
    (record.presenceCities || '') !== (nextData.presenceCities || '') ||
    (record.cityPresence || '') !== (nextData.cityPresence || '')
  )
}

async function normalizeModel(modelName, delegate, labelField) {
  const rows = await delegate.findMany({
    select: {
      id: true,
      [labelField]: true,
      presenceCountries: true,
      countryPresence: true,
      presenceCities: true,
      cityPresence: true
    },
    take: 100000
  })

  let updated = 0
  let skipped = 0
  let unchanged = 0
  const ambiguous = []

  for (const row of rows) {
    const parsed = parseStructuredPresence(
      row.presenceCountries || row.countryPresence || '',
      row.presenceCities || '',
      row.cityPresence || ''
    )

    if (parsed.ambiguous) {
      ambiguous.push({
        id: row.id,
        label: row[labelField] || row.id
      })
      skipped += 1
      continue
    }

    const nextData = buildNormalizedPresence(parsed)
    if (!needsUpdate(row, nextData)) {
      unchanged += 1
      continue
    }

    if (!dryRun) {
      await delegate.update({
        where: { id: row.id },
        data: {
          presenceCountries: nextData.presenceCountries || null,
          countryPresence: nextData.countryPresence || null,
          presenceCities: nextData.presenceCities || null,
          cityPresence: nextData.cityPresence || null
        }
      })
    }
    updated += 1
  }

  return {
    model: modelName,
    total: rows.length,
    updated,
    unchanged,
    skipped,
    ambiguous: ambiguous.slice(0, 25)
  }
}

async function main() {
  const companyReport = await normalizeModel('customerCompany', prisma.customerCompany, 'name')
  const contactReport = await normalizeModel('customerContact', prisma.customerContact, 'fullName')

  console.log(JSON.stringify({
    ok: true,
    dryRun,
    reports: [companyReport, contactReport]
  }, null, 2))
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
