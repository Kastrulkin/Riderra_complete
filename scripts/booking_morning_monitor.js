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
const {
  summarizeBookingPriceMovements
} = require('../server/services/bookingPriceMovementService')

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

function describeMovement(row) {
  const currency = row.quote.clientCurrency || row.quote.riderraCurrency
  const sign = row.delta > 0 ? '+' : ''
  const percent = row.deltaPct === null ? '' : ` (${sign}${row.deltaPct.toFixed(2)}%)`
  return `${row.quote.routeFrom} → ${row.quote.routeTo}, ${row.quote.requestedVehicleType}: ${row.previousPrice.toFixed(2)} → ${row.currentPrice.toFixed(2)} ${currency}${percent}`
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
    scopeJson: JSON.stringify({ type: 'booking_priority_locations_morning', monitorDate, comparisonBasis: 'previous_booking_snapshot', routeSource: '005', focusIatas, focusCountries, routePairs }),
    routeCount: pricingRows.length
  } })
  await executePriceComparisonRun({ prisma, runId: run.id })
  const finished = await prisma.priceComparisonRun.findUnique({ where: { id: run.id } })
  const currentQuotes = await prisma.priceComparisonQuote.findMany({
    where: { runId: run.id },
    orderBy: { quotedAt: 'desc' }
  })
  const currentComparedQuotes = currentQuotes.filter((quote) => quote.status === 'compared' && Number.isFinite(Number(quote.clientSellPrice)))
  const previousRuns = await prisma.priceComparisonRun.findMany({
    where: {
      tenantId: tenant.id,
      sourceId: source.id,
      id: { not: run.id },
      createdAt: { lt: run.createdAt },
      scopeJson: { contains: 'booking_priority_locations_morning' }
    },
    orderBy: { createdAt: 'desc' },
    take: 30,
    select: { id: true }
  })
  const previousQuotes = previousRuns.length
    ? await prisma.priceComparisonQuote.findMany({
      where: {
        runId: { in: previousRuns.map((row) => row.id) },
        status: 'compared',
        clientSellPrice: { not: null }
      },
      orderBy: { quotedAt: 'desc' }
    })
    : []
  const summary = summarizeBookingPriceMovements(currentComparedQuotes, previousQuotes)
  const increased = [...summary.increased].sort((a, b) => Math.abs(b.deltaPct || 0) - Math.abs(a.deltaPct || 0))
  const decreased = [...summary.decreased].sort((a, b) => Math.abs(b.deltaPct || 0) - Math.abs(a.deltaPct || 0))
  const observations = [
    ...increased.map((row) => ({ signal: 'booking_public_price_increased', previousBookingPrice: row.previousPrice, currentBookingPrice: row.currentPrice, delta: row.delta, deltaPct: row.deltaPct, currency: row.quote.clientCurrency || row.quote.riderraCurrency, routeFrom: row.quote.routeFrom, routeTo: row.quote.routeTo, vehicleType: row.quote.requestedVehicleType })),
    ...decreased.map((row) => ({ signal: 'booking_public_price_decreased', previousBookingPrice: row.previousPrice, currentBookingPrice: row.currentPrice, delta: row.delta, deltaPct: row.deltaPct, currency: row.quote.clientCurrency || row.quote.riderraCurrency, routeFrom: row.quote.routeFrom, routeTo: row.quote.routeTo, vehicleType: row.quote.requestedVehicleType }))
  ]
  const approval = await prisma.humanApproval.create({ data: {
    tenantId: tenant.id,
    status: 'pending_human',
    action: 'pricing.booking_monitor.review',
    resource: 'price_comparison_run',
    resourceId: run.id,
    payloadJson: JSON.stringify({ monitorDate, comparisonBasis: 'previous_booking_snapshot', baselineRunIds: previousRuns.map((row) => row.id), observations, counts: { increased: increased.length, decreased: decreased.length, unchanged: summary.unchanged.length, firstSnapshot: summary.firstSnapshot.length }, riderra005IsReferenceOnly: true, priceBookMutationAllowed: false }),
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
    contextJson: JSON.stringify({ increased: increased.length, decreased: decreased.length, unchanged: summary.unchanged.length, firstSnapshot: summary.firstSnapshot.length, needsReview: finished.needsReviewCount, failed: finished.failedCount, approvalId: approval.id, monitoring, comparisonBasis: 'previous_booking_snapshot', automaticPriceChanges: false })
  } })

  const ownerLink = await prisma.telegramLink.findFirst({
    where: { tenantId: tenant.id, telegramChatId: { not: null }, user: { email: 'demyanov@riderra.com' } },
    select: { telegramChatId: true }
  })
  const lines = [
    `Booking — утренняя проверка цен ${monitorDate}`,
    `Проверено: ${finished.processedCount}/${finished.routeCount}. Подорожали: ${increased.length}. Подешевели: ${decreased.length}. Без изменений: ${summary.unchanged.length}. Первая фиксация: ${summary.firstSnapshot.length}. На проверку: ${finished.needsReviewCount}. Ошибки: ${finished.failedCount}.`,
    'Сравнение: текущая публичная цена Booking против последней успешной утренней фиксации того же маршрута и класса автомобиля.',
    ...increased.slice(0, 3).map((row) => `Цена Booking выросла: ${describeMovement(row)}`),
    ...decreased.slice(0, 3).map((row) => `Цена Booking снизилась: ${describeMovement(row)}`),
    `Отчёт на проверку: ${approval.id}. Прайс 005 задаёт список маршрутов и остаётся только справочником; в расчёте движения цены не участвует и автоматически не изменяется.`
  ]
  await sendTelegram(process.env.TELEGRAM_GROUP_CHAT_ID || ownerLink?.telegramChatId, lines.join('\n'))
  console.log(JSON.stringify({ runId: run.id, approvalId: approval.id, processed: finished.processedCount, increased: increased.length, decreased: decreased.length, unchanged: summary.unchanged.length, firstSnapshot: summary.firstSnapshot.length, needsReview: finished.needsReviewCount, failed: finished.failedCount }))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
}).finally(async () => prisma.$disconnect())
