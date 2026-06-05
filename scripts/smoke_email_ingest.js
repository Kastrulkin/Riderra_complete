#!/usr/bin/env node
require('dotenv').config()

if (!process.env.RIDERRA_EMAIL_INGEST_TOKEN && !process.env.OPENCLAW_INTERNAL_TOKEN) {
  process.env.RIDERRA_EMAIL_INGEST_TOKEN = `smoke-${Date.now()}`
}
process.env.RIDERRA_EMAIL_INGEST_AUTO_PROMOTE = 'true'

const { PrismaClient } = require('@prisma/client')
const app = require('../server/index')

const prisma = new PrismaClient()

async function main() {
  const server = app.listen(0)
  const baseUrl = `http://127.0.0.1:${server.address().port}`
  const token = process.env.RIDERRA_EMAIL_INGEST_TOKEN || process.env.OPENCLAW_INTERNAL_TOKEN
  const draftIds = []
  const orderIds = []
  const runId = `SMOKE-EMAIL-${Date.now()}`

  try {
    async function postEmail({ subject, rawText, messageId }) {
      const response = await fetch(`${baseUrl}/api/internal/ops/email-draft`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Riderra-Internal-Token': token
        },
        body: JSON.stringify({
          fromEmail: 'sender@example.com',
          toEmail: 'riderratech@gmail.com',
          subject,
          sourceType: 'technical_inbox',
          gmailMessageId: messageId,
          rawText
        })
      })

      const body = await response.json()
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${JSON.stringify(body)}`)
      }
      if (body.draftId) draftIds.push(body.draftId)
      if (body.order?.id) orderIds.push(body.order.id)
      return body
    }

    const createRawText = [
      'From: sender@example.com',
      'To: riderratech@gmail.com',
      'Subject: Order request',
      '',
      `Booking ID: ${runId}`,
      'Name: Smoke Client',
      'Date: 2026-05-01',
      'Time: 12:30',
      'From: Airport Terminal 1',
      'To: Central Hotel',
      'Price: 100 RUB'
    ].join('\n')

    const created = await postEmail({
      subject: 'Order request',
      messageId: `${runId}-create`,
      rawText: createRawText
    })

    const payload = JSON.parse(created.draft.payloadJson || '{}')
    const orderDraft = payload.orderDraft || {}
    const createdOrder = created.order || {}

    const expectations = [
      ['fromPoint', orderDraft.fromPoint, 'Airport Terminal 1'],
      ['toPoint', orderDraft.toPoint, 'Central Hotel'],
      ['currency', orderDraft.currency, 'RUB'],
      ['flightNumber', orderDraft.flightNumber || '', ''],
      ['order.status', createdOrder.status, 'draft'],
      ['order.externalKey', createdOrder.externalKey, `email_order:${runId}`]
    ]

    for (const [field, actual, expected] of expectations) {
      if (actual !== expected) {
        throw new Error(`${field} expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
      }
    }

    const changed = await postEmail({
      subject: 'Order changed',
      messageId: `${runId}-change`,
      rawText: [
        `Booking ID: ${runId}`,
        'Name: Smoke Client',
        'Date: 2026-05-02',
        'Time: 14:45',
        'From: Airport Terminal 2',
        'To: Central Hotel',
        'Price: 120 RUB'
      ].join('\n')
    })
    if (changed.order?.id !== createdOrder.id) {
      throw new Error(`change expected same order ${createdOrder.id}, got ${changed.order?.id}`)
    }
    if (changed.order?.fromPoint !== 'Airport Terminal 2') {
      throw new Error(`change did not update fromPoint: ${changed.order?.fromPoint}`)
    }

    const cancelled = await postEmail({
      subject: 'Order cancellation',
      messageId: `${runId}-cancel`,
      rawText: [
        `Booking ID: ${runId}`,
        'Cancel this booking',
        'Name: Smoke Client',
        'Date: 2026-05-02',
        'Time: 14:45',
        'From: Airport Terminal 2',
        'To: Central Hotel',
        'Price: 120 RUB'
      ].join('\n')
    })
    if (cancelled.order?.id !== createdOrder.id) {
      throw new Error(`cancel expected same order ${createdOrder.id}, got ${cancelled.order?.id}`)
    }
    if (cancelled.order?.status !== 'cancelled') {
      throw new Error(`cancel expected status cancelled, got ${cancelled.order?.status}`)
    }

    const snapshotCount = await prisma.orderSourceSnapshot.count({
      where: { orderId: createdOrder.id }
    })
    if (snapshotCount < 1) {
      throw new Error('expected at least one monthly order snapshot')
    }

    console.log(JSON.stringify({
      ok: true,
      draftIds,
      orderId: createdOrder.id,
      parsed: {
        fromPoint: orderDraft.fromPoint,
        toPoint: orderDraft.toPoint,
        pickupAt: orderDraft.pickupAt,
        clientPrice: orderDraft.clientPrice,
        currency: orderDraft.currency,
        flightNumber: orderDraft.flightNumber || null
      },
      changed: {
        fromPoint: changed.order.fromPoint,
        pickupAt: changed.order.pickupAt,
        clientPrice: changed.order.clientPrice
      },
      cancelled: {
        status: cancelled.order.status
      },
      snapshotCount
    }, null, 2))
  } finally {
    const uniqueOrderIds = [...new Set(orderIds)]
    const uniqueDraftIds = [...new Set(draftIds)]
    if (uniqueOrderIds.length) {
      await prisma.chatMessage.deleteMany({ where: { chatTask: { orderId: { in: uniqueOrderIds } } } }).catch(() => null)
      await prisma.chatTask.deleteMany({ where: { orderId: { in: uniqueOrderIds } } }).catch(() => null)
      await prisma.opsTask.deleteMany({ where: { sourceRef: { in: uniqueOrderIds } } }).catch(() => null)
      await prisma.orderStatusHistory.deleteMany({ where: { orderId: { in: uniqueOrderIds } } }).catch(() => null)
      await prisma.orderSourceSnapshot.deleteMany({ where: { orderId: { in: uniqueOrderIds } } }).catch(() => null)
      await prisma.order.deleteMany({ where: { id: { in: uniqueOrderIds } } }).catch(() => null)
    }
    if (uniqueDraftIds.length) {
      await prisma.opsEvent.deleteMany({ where: { sourceDraftId: { in: uniqueDraftIds } } }).catch(() => null)
      await prisma.opsEventDraft.deleteMany({ where: { id: { in: uniqueDraftIds } } }).catch(() => null)
    }
    await prisma.$disconnect()
    await new Promise((resolve) => server.close(resolve))
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
