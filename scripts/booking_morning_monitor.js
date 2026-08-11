#!/usr/bin/env node
require('dotenv').config()

const axios = require('axios')
const { PrismaClient } = require('@prisma/client')
const { SocksProxyAgent } = require('socks-proxy-agent')
const {
  BOOKING_DEFAULTS,
  defaultSourceData,
  executePriceComparisonRun,
  nextScheduledServiceAt
} = require('../server/services/priceComparisonService')
const {
  isBookingMonitorDue,
  normalizeBookingMonitoring
} = require('../server/services/bookingMonitorScheduleService')

const prisma = new PrismaClient()

function moscowDateKey(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

async function sendTelegram(chatId, text) {
  const token = String(process.env.TELEGRAM_BOT_TOKEN || '').trim()
  if (!token || !chatId) return false
  const proxyUrl = String(process.env.TELEGRAM_PROXY_URL || '').trim()
  const response = await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, { chat_id: chatId, text }, {
    httpsAgent: proxyUrl ? new SocksProxyAgent(proxyUrl) : undefined,
    proxy: false,
    timeout: 15000,
    validateStatus: () => true
  })
  if (response.status < 200 || response.status >= 300 || response.data?.ok === false) throw new Error(`Telegram send failed: ${response.status}`)
  return true
}

function describe(row) {
  return `${row.quote.routeFrom} → ${row.quote.routeTo}, ${row.quote.requestedVehicleType}: Riderra ${row.quote.riderraSellPrice.toFixed(2)} ${row.quote.riderraCurrency}, ориентир ${row.targetPrice.toFixed(2)} ${row.quote.riderraCurrency}`
}

async function main() {
  const tenant = process.env.BOOKING_CRAWL_TENANT_ID
    ? await prisma.tenant.findUnique({ where: { id: process.env.BOOKING_CRAWL_TENANT_ID } })
    : await prisma.tenant.findUnique({ where: { code: 'riderra' } })
  if (!tenant) throw new Error('Riderra tenant not found')
  const company = process.env.BOOKING_CRAWL_COMPANY_ID
    ? await prisma.customerCompany.findFirst({ where: { id: process.env.BOOKING_CRAWL_COMPANY_ID, tenantId: tenant.id } })
    : await prisma.customerCompany.findFirst({ where: { tenantId: tenant.id, name: { equals: 'Rideways (Booking.com)', mode: 'insensitive' } } })
  if (!company) throw new Error('Rideways (Booking.com) company not found')

  const sourceDefaults = defaultSourceData({ adapterKey: 'booking' })
  let source = await prisma.priceComparisonSource.findUnique({
    where: { tenantId_adapterKey: { tenantId: tenant.id, adapterKey: 'booking' } }
  })
  if (!source) {
    source = await prisma.priceComparisonSource.create({
      data: { tenantId: tenant.id, customerCompanyId: company.id, ...sourceDefaults }
    })
  } else if (source.customerCompanyId !== company.id) {
    source = await prisma.priceComparisonSource.update({ where: { id: source.id }, data: { customerCompanyId: company.id } })
  }
  const sourceSchedule = (() => { try { return JSON.parse(source.scheduleJson || '{}') } catch (_) { return {} } })()
  const monitoring = normalizeBookingMonitoring(sourceSchedule.monitoring || {})
  const forced = process.argv.includes('--force')
  if (!forced && !isBookingMonitorDue(new Date(), monitoring)) {
    console.log(JSON.stringify({ skipped: true, reason: monitoring.priceWatchEnabled ? 'outside_schedule_window' : 'monitoring_disabled', monitoring }))
    return
  }
  const lowRatio = monitoring.lowRatio
  const highRatio = monitoring.highRatio

  const monitorDate = moscowDateKey()
  const traceId = `booking-morning-${monitorDate}`
  const existingApproval = await prisma.humanApproval.findFirst({ where: { tenantId: tenant.id, traceId } })
  if (existingApproval) {
    console.log(JSON.stringify({ skipped: true, reason: 'already_generated', monitorDate, approvalId: existingApproval.id }))
    return
  }

  const focusIatas = monitoring.focusIatas || []
  const focusCountries = monitoring.focusCountries || []
  const focusClauses = [
    ...focusIatas.flatMap((iata) => [
      { routeFrom: { contains: `(${iata})`, mode: 'insensitive' } },
      { routeTo: { contains: `(${iata})`, mode: 'insensitive' } }
    ]),
    ...focusCountries.map((country) => ({ country: { contains: country, mode: 'insensitive' } }))
  ]
  if (!focusClauses.length) throw new Error('Booking morning monitor has no configured priority locations')
  const routeWhere = {
    tenantId: tenant.id,
    isActive: true,
    fixedPrice: { not: null },
    currency: { in: BOOKING_DEFAULTS.supportedCurrencies },
    OR: focusClauses
  }
  const pricingRows = await prisma.cityPricing.findMany({ where: routeWhere, select: { routeFrom: true, routeTo: true } })
  const routePairs = Array.from(new Map(pricingRows.map((row) => [`${row.routeFrom}\u0000${row.routeTo}`, row])).values())
  const run = await prisma.priceComparisonRun.create({ data: {
    tenantId: tenant.id,
    sourceId: source.id,
    status: 'configured',
    serviceAt: nextScheduledServiceAt(new Date(), BOOKING_DEFAULTS.schedule),
    formulaVersion: BOOKING_DEFAULTS.formulaVersion,
    pricingPolicyJson: JSON.stringify(BOOKING_DEFAULTS.pricingPolicy),
    scopeJson: JSON.stringify({ type: 'booking_priority_locations_morning', monitorDate, source: '005', focusIatas, focusCountries, routePairs }),
    routeCount: pricingRows.length
  } })
  await executePriceComparisonRun({ prisma, runId: run.id })
  const finished = await prisma.priceComparisonRun.findUnique({ where: { id: run.id } })
  const results = await prisma.priceComparisonResult.findMany({
    where: { runId: run.id },
    include: { quote: true },
    orderBy: { opportunityGapAbs: 'asc' }
  })
  const low = results.filter((row) => row.quote.riderraSellPrice < row.targetPrice * lowRatio)
  const high = results.filter((row) => row.quote.riderraSellPrice > row.targetPrice * highRatio)
  const observations = [
    ...high.map((row) => ({ signal: 'riderra_reference_above_booking_target', riderraReferencePrice: row.quote.riderraSellPrice, bookingDriverTarget: row.targetPrice, currency: row.quote.riderraCurrency, routeFrom: row.quote.routeFrom, routeTo: row.quote.routeTo, vehicleType: row.quote.requestedVehicleType })),
    ...low.map((row) => ({ signal: 'riderra_reference_below_booking_target', riderraReferencePrice: row.quote.riderraSellPrice, bookingDriverTarget: row.targetPrice, currency: row.quote.riderraCurrency, routeFrom: row.quote.routeFrom, routeTo: row.quote.routeTo, vehicleType: row.quote.requestedVehicleType }))
  ]
  const approval = await prisma.humanApproval.create({ data: {
    tenantId: tenant.id,
    status: 'pending_human',
    action: 'pricing.booking_monitor.review',
    resource: 'price_comparison_run',
    resourceId: run.id,
    payloadJson: JSON.stringify({ monitorDate, thresholds: { lowRatio, highRatio }, formulaVersion: BOOKING_DEFAULTS.formulaVersion, observations, riderra005IsReferenceOnly: true, priceBookMutationAllowed: false }),
    traceId
  } })
  await prisma.auditLog.create({ data: {
    tenantId: tenant.id,
    actorRole: 'system',
    action: 'pricing.booking_monitor.complete',
    resource: 'price_comparison_run',
    resourceId: run.id,
    traceId,
    decision: 'draft_for_human_approval',
    result: finished.status,
    contextJson: JSON.stringify({ low: low.length, high: high.length, needsReview: finished.needsReviewCount, failed: finished.failedCount, approvalId: approval.id, monitoring, automaticPriceChanges: false })
  } })

  const ownerLink = await prisma.telegramLink.findFirst({
    where: { tenantId: tenant.id, telegramChatId: { not: null }, user: { email: 'demyanov@riderra.com' } },
    select: { telegramChatId: true }
  })
  const lines = [
    `Booking — утренняя проверка цен ${monitorDate}`,
    `Проверено: ${finished.processedCount}/${finished.routeCount}. Выше ориентира: ${high.length}. Ниже ориентира: ${low.length}. На проверку: ${finished.needsReviewCount}. Ошибки: ${finished.failedCount}.`,
    `Формула фиксированного ориентира: цена Booking −25% BCOM −20% PMF. Допуск: ниже ${Math.round(lowRatio * 100)}% или выше ${Math.round(highRatio * 100)}%.`,
    ...high.slice(0, 3).map((row) => `Выше ориентира Booking: ${describe(row)}`),
    ...low.slice(0, 3).map((row) => `Ниже ориентира Booking: ${describe(row)}`),
    `Отчёт на проверку: ${approval.id}. Прайс 005 используется только как справочное сравнение и не изменяется этим процессом.`
  ]
  await sendTelegram(process.env.TELEGRAM_GROUP_CHAT_ID || ownerLink?.telegramChatId, lines.join('\n'))
  console.log(JSON.stringify({ runId: run.id, approvalId: approval.id, processed: finished.processedCount, high: high.length, low: low.length, needsReview: finished.needsReviewCount, failed: finished.failedCount }))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
}).finally(async () => prisma.$disconnect())
