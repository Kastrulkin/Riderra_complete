#!/usr/bin/env node
require('dotenv').config()

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

function parseJsonSafe(raw, fallback = {}) {
  try {
    return JSON.parse(raw || '')
  } catch (_error) {
    return fallback
  }
}

function rawPayloadFromSnapshot(snapshot) {
  const payload = parseJsonSafe(snapshot?.rawPayload || '{}', {})
  return payload && payload.row && typeof payload.row === 'object' ? payload.row : payload
}

function rawFirst(raw, keys, fallback = '') {
  for (const key of keys) {
    const value = raw?.[key]
    if (value !== undefined && value !== null && String(value).trim() !== '') return value
  }
  return fallback
}

function boolRaw(raw, keys) {
  const value = rawFirst(raw, keys, false)
  if (typeof value === 'boolean') return value
  const text = String(value || '').trim().toLowerCase()
  return ['true', '1', 'yes', 'да', 'y'].includes(text)
}

function parseOrderMeta(value) {
  const raw = String(value || '').trim()
  const match = raw.match(/\(([^)]+)\)/)
  if (!match) return { bookingId: raw, cityCode: '', vehicleCode: '', direction: '' }
  const parts = match[1].trim().split(/\s+/).filter(Boolean)
  return {
    bookingId: raw.split('(', 1)[0].trim(),
    cityCode: parts.length >= 2 ? parts.slice(0, -2).join(' ') : parts.join(' '),
    vehicleCode: parts.length >= 2 ? parts[parts.length - 2] : '',
    direction: parts.length ? parts[parts.length - 1] : ''
  }
}

function normalizeIssueFlags(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map(String)
  if (!value) return []
  return String(value)
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalizedSourceData(raw) {
  const sourceOrderNumber = String(rawFirst(raw, ['order_number', 'orderNumber', 'номер заказа'], '') || '')
  const meta = parseOrderMeta(sourceOrderNumber)
  const sourceComment = String(rawFirst(raw, ['comment', 'комментарий', 'примечание'], '') || '')
  const issueFlags = normalizeIssueFlags(raw?.issue_flags)
  const hasComplaint = boolRaw(raw, ['has_complaint', 'complaint']) || /жалоб|претензи|complaint|no[\s-]?show|did not show|не приех|не встрет/i.test(sourceComment)
  return {
    counterpartyName: String(rawFirst(raw, ['counterparty', 'contractor', 'контрагент'], '') || '') || null,
    driverNameRaw: String(rawFirst(raw, ['driver', 'водитель'], '') || '') || null,
    sourceComment: sourceComment || null,
    sourceCurrency: String(rawFirst(raw, ['currency', 'валюта'], '') || '') || null,
    sourceCityCode: String(rawFirst(raw, ['city_code', 'cityCode'], meta.cityCode) || '') || null,
    sourceVehicleCode: String(rawFirst(raw, ['vehicle_code', 'vehicleCode'], meta.vehicleCode) || '') || null,
    sourceDirection: String(rawFirst(raw, ['direction'], meta.direction) || '') || null,
    sourceOrderNumber: sourceOrderNumber || null,
    sourceBookingId: String(rawFirst(raw, ['booking_id', 'bookingId'], meta.bookingId) || '') || null,
    sourceInternalOrderNumber: String(rawFirst(raw, ['internal_order_number', 'internalOrderNumber', 'внутренний номер заказа'], '') || '') || null,
    hasComplaint,
    issueFlagsJson: JSON.stringify(issueFlags)
  }
}

function classifyQualitySignals(data) {
  const text = [data.sourceComment, data.driverNameRaw, data.counterpartyName].filter(Boolean).join(' ')
  const lowered = text.toLowerCase()
  const flags = normalizeIssueFlags(parseJsonSafe(data.issueFlagsJson || '[]', []))
  const signals = []
  const add = (type, severity = 'medium', confidence = 1) => {
    if (!signals.some((signal) => signal.type === type)) {
      signals.push({ type, severity, confidence, text: data.sourceComment || null })
    }
  }

  if (data.hasComplaint || /жалоб|претензи|complaint/.test(lowered)) add('complaint', 'high')
  if (/no[\s-]?show|did not show|не приех|не встрет|не было машины/.test(lowered)) add('no_show', 'high')
  if (/опозд|late|delay|задерж/.test(lowered)) add('late', 'medium')
  if (/wrong address|адрес|уточнить адрес|неверн.*адрес/.test(lowered)) add('wrong_address', 'medium', 0.8)
  if (/flight|рейс|arrival|departure|прилет|прибыт/.test(lowered)) add('flight_info', 'low', 0.7)
  if (/child|booster|baby seat|детск|кресл/.test(lowered)) add('child_seat', 'low')
  if (/wait|waiting|ожидан|ждал/.test(lowered)) add('extra_waiting', 'medium', 0.8)
  if (/штраф|penalty/.test(lowered)) add('penalty', 'high')
  if (/отмена|cancel|declined/.test(lowered)) add('cancelled_signal', 'medium')
  if (/будет оплачен|будет оплачена|paid/.test(lowered)) add('paid_after_cancel', 'medium', 0.8)
  for (const flag of flags) add(flag, String(flag).includes('complaint') ? 'high' : 'medium', 1)
  return signals
}

async function main() {
  const tenant = await prisma.tenant.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' }
  })
  if (!tenant) throw new Error('Active tenant not found')

  const snapshots = await prisma.orderSourceSnapshot.findMany({
    where: { tenantId: tenant.id, orderId: { not: null } },
    orderBy: [{ orderId: 'asc' }, { createdAt: 'desc' }],
    select: {
      orderId: true,
      rawPayload: true
    }
  })

  const seenOrders = new Set()
  const stats = { scannedSnapshots: snapshots.length, updatedOrders: 0, qualitySignals: 0, skipped: 0 }
  for (const snapshot of snapshots) {
    if (!snapshot.orderId || seenOrders.has(snapshot.orderId)) continue
    seenOrders.add(snapshot.orderId)
    const raw = rawPayloadFromSnapshot(snapshot)
    if (!raw || typeof raw !== 'object') {
      stats.skipped += 1
      continue
    }
    const data = normalizedSourceData(raw)
    await prisma.order.update({
      where: { id: snapshot.orderId },
      data
    })
    stats.updatedOrders += 1

    const signals = classifyQualitySignals(data)
    stats.qualitySignals += signals.length
    await Promise.all(signals.map((signal) => prisma.orderQualitySignal.upsert({
      where: {
        orderId_type_source: {
          orderId: snapshot.orderId,
          type: signal.type,
          source: 'rule'
        }
      },
      update: {
        tenantId: tenant.id,
        severity: signal.severity,
        text: signal.text,
        confidence: signal.confidence
      },
      create: {
        tenantId: tenant.id,
        orderId: snapshot.orderId,
        type: signal.type,
        severity: signal.severity,
        source: 'rule',
        text: signal.text,
        confidence: signal.confidence
      }
    })))
  }

  console.log(JSON.stringify({ ok: true, tenant: { id: tenant.id, code: tenant.code }, stats }, null, 2))
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => prisma.$disconnect())
