#!/usr/bin/env node
require('dotenv').config()

const fs = require('fs')
const crypto = require('crypto')
const { PrismaClient } = require('@prisma/client')
const { parseBookingDistanceBands } = require('../server/services/bookingPartnerRateService')

const prisma = new PrismaClient()
const inputPath = process.argv[2]
const tenantId = process.env.BOOKING_CRAWL_TENANT_ID || process.argv[3]
const configuredCompanyId = process.env.BOOKING_CRAWL_COMPANY_ID || process.argv[4] || null

function uniqueBy(rows, keyFn) {
  const seen = new Set()
  return rows.filter((row) => {
    const key = keyFn(row)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

async function main() {
  if (!inputPath || !tenantId) throw new Error('Usage: import_booking_partner_rates.js <snapshot.json> <tenantId> [companyId]')
  const snapshot = JSON.parse(fs.readFileSync(inputPath, 'utf8'))
  if (!Array.isArray(snapshot.locations) || !snapshot.locations.length) throw new Error('Booking snapshot has no locations')

  const company = configuredCompanyId
    ? await prisma.customerCompany.findFirst({ where: { id: configuredCompanyId, tenantId } })
    : await prisma.customerCompany.findFirst({ where: { tenantId, name: { equals: 'Rideways (Booking.com)', mode: 'insensitive' } } })
  if (!company) throw new Error('Rideways (Booking.com) customer company was not found')

  const capturedAt = new Date(snapshot.capturedAt || Date.now())
  const sourceLabel = `Booking.com Taxi Partner Portal · ${capturedAt.toISOString()}`
  const fixedRows = uniqueBy(snapshot.locations.flatMap((location) => (location.fixedRates || []).map((row) => ({
    tenantId,
    customerCompanyId: company.id,
    counterpartyName: 'Rideways (Booking.com)',
    city: location.label,
    routeFrom: row.routeFrom,
    routeTo: row.routeTo,
    vehicleType: row.vehicleType,
    sellPrice: Number(row.amount),
    currency: row.currency || 'EUR',
    isActive: true,
    notes: 'Рабочая фиксированная ставка из кабинета Booking.com',
    sourceType: 'booking_partner_portal',
    sourceLabel,
    sourceExternalId: location.id,
    capturedAt
  }))), (row) => [row.sourceExternalId, row.routeFrom, row.routeTo, row.vehicleType, row.currency, row.sellPrice].join('|'))

  const distanceRows = snapshot.locations.flatMap((location) => (location.distanceRates || []).map((row) => {
    const bands = parseBookingDistanceBands(row.bands)
    const fee = (location.pickupFees || []).find((item) => String(item.vehicleType).toLowerCase() === String(row.vehicleType).toLowerCase())
    return {
      tenantId,
      customerCompanyId: company.id,
      counterpartyName: 'Rideways (Booking.com)',
      locationExternalId: location.id,
      locationName: location.label,
      airportIata: location.iata || null,
      latitude: location.latitude == null ? null : Number(location.latitude),
      longitude: location.longitude == null ? null : Number(location.longitude),
      vehicleType: row.vehicleType,
      currency: bands[0]?.currency || fee?.currency || 'EUR',
      bandsJson: JSON.stringify(bands),
      airportPickupFee: fee?.amount == null ? null : Number(fee.amount),
      sourceType: 'booking_partner_portal',
      sourceLabel,
      capturedAt,
      isActive: true,
      notes: 'Рабочая дистанционная ставка из кабинета Booking.com'
    }
  })).filter((row) => JSON.parse(row.bandsJson).length)

  const result = await prisma.$transaction(async (tx) => {
    await tx.counterpartyPriceRule.updateMany({
      where: { tenantId, customerCompanyId: company.id, sourceType: 'booking_partner_portal', isActive: true },
      data: { isActive: false }
    })
    await tx.counterpartyDistancePriceRule.updateMany({
      where: { tenantId, customerCompanyId: company.id, sourceType: 'booking_partner_portal', isActive: true },
      data: { isActive: false }
    })
    await tx.counterpartyPriceRule.updateMany({
      where: { tenantId, counterpartyName: { equals: 'Rideways', mode: 'insensitive' }, customerCompanyId: { not: company.id } },
      data: { customerCompanyId: company.id, counterpartyName: 'Rideways (Booking.com)' }
    })
    if (fixedRows.length) await tx.counterpartyPriceRule.createMany({ data: fixedRows })
    if (distanceRows.length) await tx.counterpartyDistancePriceRule.createMany({ data: distanceRows })
    const audit = await tx.auditLog.create({ data: {
      tenantId,
      actorRole: 'owner',
      action: 'pricing.booking_partner_rates.import',
      resource: 'customer_company',
      resourceId: company.id,
      traceId: `booking-partner-${crypto.randomUUID()}`,
      decision: 'human_approved',
      result: 'ok',
      contextJson: JSON.stringify({ capturedAt, activeLocations: snapshot.locations.length, fixedRates: fixedRows.length, distanceRates: distanceRows.length, source: snapshot.source })
    } })
    return { auditId: audit.id }
  })

  console.log(JSON.stringify({ companyId: company.id, companyName: company.name, fixedRates: fixedRows.length, distanceRates: distanceRows.length, capturedAt: capturedAt.toISOString(), ...result }))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
}).finally(async () => prisma.$disconnect())
