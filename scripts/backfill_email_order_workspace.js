#!/usr/bin/env node
require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

function parse(value) { try { return JSON.parse(value || '{}') } catch (_) { return {} } }
function knownSource(text) { return /(transferz|transfez|rideways|booking\.com|gettransfer|kiwitaxi|intui|easy\s?taxi)/i.test(text) }

async function main () {
  const apply = process.argv.includes('--apply')
  const rows = await prisma.opsEventDraft.findMany({ where: { parsedType: 'openclaw_order_draft' }, orderBy: { createdAt: 'asc' } })
  const seen = new Set()
  const stats = { total: rows.length, pending: 0, quarantine: 0, archived: 0, duplicates: 0 }
  for (const row of rows) {
    const payload = parse(row.payloadJson)
    const order = payload.orderDraft || {}
    const externalMessageId = String(order.externalMessageId || payload.externalMessageId || '').trim() || null
    const sender = String(order.sourceActorId || payload.sourceActorId || '').trim() || null
    const pickup = Date.parse(order.pickupAt || '')
    const duplicate = externalMessageId && seen.has(`${row.tenantId || ''}:${externalMessageId}`)
    if (externalMessageId && !duplicate) seen.add(`${row.tenantId || ''}:${externalMessageId}`)
    let queueState = knownSource(`${sender || ''}\n${payload.rawText || row.messageText || ''}`) ? 'pending' : 'quarantine'
    if (Number.isFinite(pickup) && pickup < Date.now() - 24 * 60 * 60 * 1000) queueState = 'archived'
    if (duplicate) { queueState = 'archived'; stats.duplicates++ }
    stats[queueState]++
    if (apply) {
      await prisma.opsEventDraft.update({ where: { id: row.id }, data: {
        externalMessageId: duplicate ? null : externalMessageId,
        externalThreadId: String(order.sourceChatId || '').trim() || null,
        sourceSender: sender,
        sourceClassification: String(order.eventType || 'new'),
        queueState
      } })
    }
  }
  console.log(JSON.stringify({ apply, ...stats }, null, 2))
}

main().finally(() => prisma.$disconnect())
