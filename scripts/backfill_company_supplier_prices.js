const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()
const TENANT_ID = process.env.TENANT_ID || 'cmm3kvdnr000011wfd6avqt9g'

function priceListBlocks(extraInfo) {
  const blocks = []
  const re = /\[\[SUPPLIER_NET_PRICE_LIST:([^\]]+)\]\][\s\S]*?\n(\{[\s\S]*?\})\n\[\[\/SUPPLIER_NET_PRICE_LIST:\1\]\]/g
  for (const match of String(extraInfo || '').matchAll(re)) {
    try { blocks.push({ marker: match[1], data: JSON.parse(match[2]) }) } catch (_) {}
  }
  return blocks
}

function addRate(rows, company, source, input) {
  if (!Number.isFinite(Number(input.supplierPrice))) return
  rows.push({
    tenantId: TENANT_ID,
    supplierCompanyId: company.id,
    sourceKey: input.sourceKey,
    category: input.category || null,
    routeFrom: input.routeFrom || null,
    routeTo: input.routeTo || null,
    vehicleType: input.vehicleType || null,
    passengers: input.passengers || null,
    supplierPrice: Number(input.supplierPrice),
    currency: input.currency || 'EUR',
    priceType: input.priceType || 'net',
    parkingSurcharge: input.parkingSurcharge ?? null,
    vatPercent: input.vatPercent ?? null,
    startsAt: input.startsAt || null,
    endsAt: input.endsAt || null,
    sourceType: input.sourceType || 'document',
    sourceLabel: input.sourceLabel || source,
    sourceQuotedAt: input.sourceQuotedAt || null,
    sourceStatus: input.sourceStatus || 'approved',
    notes: input.notes || null,
    isActive: input.isActive !== false,
  })
}

function expandNadir(company, marker, data) {
  const rows = []
  const quotedAt = data.documentCreatedAt ? new Date(data.documentCreatedAt) : null
  const vehicle = {
    '7_seater': { label: '7-seater', passengers: 7 },
    '13_seater': { label: '13-seater', passengers: 13 },
  }
  for (const [airport, groups] of Object.entries(data.airportTransfers || {})) {
    for (const group of groups) {
      for (const destination of group.destinations || []) {
        for (const [vehicleKey, amount] of Object.entries(group.rates || {})) {
          addRate(rows, company, marker, {
            sourceKey: `${marker}:airport:${airport}:${destination}:${vehicleKey}`,
            category: 'airport_transfer', routeFrom: `${airport} Airport`, routeTo: destination,
            vehicleType: vehicle[vehicleKey]?.label || vehicleKey, passengers: vehicle[vehicleKey]?.passengers,
            supplierPrice: amount, currency: data.currency, priceType: data.priceType,
            parkingSurcharge: data.terms?.airportMeetParkingAed ?? null,
            vatPercent: data.terms?.vatRatePercent ?? null,
            sourceLabel: data.sourceDocument, sourceQuotedAt: quotedAt,
            sourceStatus: 'needs_reconfirmation', notes: 'Validity is not stated in the source document.',
          })
        }
      }
    }
  }
  const groups = [
    ['city_tour_10h', data.cityTours10h],
    ['city_tour_6h', data.cityTours6h],
    ['two_way_transfer', data.twoWayTransfers],
  ]
  for (const [category, items] of groups) {
    for (const item of items || []) {
      const [routeFrom, routeTo] = String(item.route || '').split('-')
      for (const [vehicleKey, amount] of Object.entries(item.rates || {})) {
        addRate(rows, company, marker, {
          sourceKey: `${marker}:${category}:${item.route}:${vehicleKey}`,
          category, routeFrom, routeTo, vehicleType: vehicle[vehicleKey]?.label || vehicleKey,
          passengers: vehicle[vehicleKey]?.passengers, supplierPrice: amount, currency: data.currency,
          priceType: data.priceType, vatPercent: data.terms?.vatRatePercent ?? null,
          sourceLabel: data.sourceDocument, sourceQuotedAt: quotedAt,
          sourceStatus: 'needs_reconfirmation', notes: 'Validity is not stated in the source document.',
        })
      }
    }
  }
  for (const [vehicleKey, amount] of Object.entries(data.extraHour || {})) {
    addRate(rows, company, marker, {
      sourceKey: `${marker}:extra_hour:${vehicleKey}`, category: 'extra_hour', routeFrom: 'Dubai', routeTo: 'Extra hour',
      vehicleType: vehicle[vehicleKey]?.label || vehicleKey, passengers: vehicle[vehicleKey]?.passengers,
      supplierPrice: amount, currency: data.currency, priceType: data.priceType,
      vatPercent: data.terms?.vatRatePercent ?? null, sourceLabel: data.sourceDocument,
      sourceQuotedAt: quotedAt, sourceStatus: 'needs_reconfirmation', notes: 'Validity is not stated in the source document.',
    })
  }
  return rows
}

const pilotScopes = {
  dubaiFullDay10h: ['hourly_10h', 'Dubai', 'Dubai (10 hours)'],
  dubaiHalfDay5h: ['hourly_5h', 'Dubai', 'Dubai (5 hours)'],
  dubaiExtraHour: ['extra_hour', 'Dubai', 'Extra hour'],
  dxbHotelCity0To20Km: ['airport_transfer', 'Dubai Airport (DXB)', 'Hotel / city 0-20 km'],
  dxbHotelCity21To45Km: ['airport_transfer', 'Dubai Airport (DXB)', 'Hotel / city 21-45 km'],
  dwcHotelCity: ['airport_transfer', 'Dubai Al Maktoum Airport (DWC)', 'Hotel / city'],
  abuDhabiFullDay10h: ['hourly_10h', 'Abu Dhabi', 'Abu Dhabi (10 hours)'],
  abuDhabiExtraHour: ['extra_hour', 'Abu Dhabi', 'Extra hour'],
  dubaiToAbuDhabi: ['intercity_transfer', 'Dubai', 'Abu Dhabi'],
  dubaiToSharjah: ['intercity_transfer', 'Dubai', 'Sharjah'],
}

function expandPilot(company, marker, data) {
  const rows = []
  const quotedAt = data.documentDate ? new Date(data.documentDate) : null
  for (const item of data.rows || []) {
    for (const [rateKey, amount] of Object.entries(item.rates || {})) {
      if (amount === null || amount === undefined || !pilotScopes[rateKey]) continue
      const [category, routeFrom, routeTo] = pilotScopes[rateKey]
      addRate(rows, company, marker, {
        sourceKey: `${marker}:${item.vehicle}:${rateKey}`, category, routeFrom, routeTo,
        vehicleType: item.vehicle, passengers: item.maxPassengers, supplierPrice: amount,
        currency: data.currency, priceType: data.priceType, sourceLabel: data.sourceDocument,
        sourceQuotedAt: quotedAt, sourceStatus: 'needs_reconfirmation',
        notes: 'Source validity is expired or ambiguous and requires reconfirmation.',
      })
    }
  }
  return rows
}

function edenRates(company) {
  const source = 'Team Eden Mobility message'
  return [
    ['airport_transfer', 'Airport', 'Transfer', 450],
    ['hourly_4h', 'Dubai', 'Package 4 hours', 600],
    ['hourly_8h', 'Dubai', 'Package 8 hours', 1300],
    ['hourly_12h', 'Dubai', 'Package 12 hours', 1600],
  ].map(([category, routeFrom, routeTo, amount]) => {
    const rows = []
    addRate(rows, company, source, {
      sourceKey: `EDEN:2026-08-08:${category}`, category, routeFrom, routeTo,
      supplierPrice: amount, currency: 'AED', priceType: 'net', sourceType: 'message',
      sourceLabel: source, sourceStatus: 'approved', notes: 'Vehicle class and detailed route scope are not specified.',
    })
    return rows[0]
  })
}

async function main() {
  const companies = await prisma.customerCompany.findMany({ where: { tenantId: TENANT_ID } })
  const rows = []
  for (const company of companies) {
    for (const block of priceListBlocks(company.extraInfo)) {
      if (block.marker.startsWith('NADIR:')) rows.push(...expandNadir(company, block.marker, block.data))
      if (block.marker.startsWith('PILOTANDCAR:')) rows.push(...expandPilot(company, block.marker, block.data))
    }
    if (company.name === 'Eden Mobility Dubai') rows.push(...edenRates(company))
  }
  for (const row of rows) {
    await prisma.supplierPriceRule.upsert({
      where: { supplierCompanyId_sourceKey: { supplierCompanyId: row.supplierCompanyId, sourceKey: row.sourceKey } },
      create: row,
      update: row,
    })
  }
  const summary = { imported: rows.length, companies: [...new Set(rows.map(row => row.supplierCompanyId))].length }
  await prisma.auditLog.create({ data: {
    tenantId: TENANT_ID,
    actorRole: 'pricing_admin',
    action: 'pricing.supplier_rules.backfill',
    resource: 'SupplierPriceRule',
    traceId: `supplier-price-backfill-${Date.now()}`,
    decision: 'approved_by_owner_in_codex_task',
    result: 'success',
    contextJson: JSON.stringify(summary),
  } })
  console.log(JSON.stringify(summary))
}

main().catch(error => { console.error(error); process.exitCode = 1 }).finally(() => prisma.$disconnect())
