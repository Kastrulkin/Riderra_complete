#!/usr/bin/env node
require('dotenv').config()

if (!process.env.RIDERRA_EMAIL_INGEST_TOKEN && !process.env.OPENCLAW_INTERNAL_TOKEN) {
  process.env.RIDERRA_EMAIL_INGEST_TOKEN = `smoke-${Date.now()}`
}

const { PrismaClient } = require('@prisma/client')
const app = require('../server/index')

const prisma = new PrismaClient()

async function main() {
  const server = app.listen(0)
  const baseUrl = `http://127.0.0.1:${server.address().port}`
  const token = process.env.RIDERRA_EMAIL_INGEST_TOKEN || process.env.OPENCLAW_INTERNAL_TOKEN
  let draftId = null

  try {
    const rawText = [
      'From: sender@example.com',
      'To: riderratech@gmail.com',
      'Subject: Order request',
      '',
      'Name: Smoke Client',
      'Date: 2026-05-01',
      'Time: 12:30',
      'From: Airport Terminal 1',
      'To: Central Hotel',
      'Price: 100 RUB'
    ].join('\n')

    const response = await fetch(`${baseUrl}/api/internal/ops/email-draft`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Riderra-Internal-Token': token
      },
      body: JSON.stringify({
        fromEmail: 'sender@example.com',
        toEmail: 'riderratech@gmail.com',
        subject: 'Order request',
        sourceType: 'technical_inbox',
        rawText
      })
    })

    const body = await response.json()
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(body)}`)
    }

    draftId = body.draftId
    const payload = JSON.parse(body.draft.payloadJson || '{}')
    const orderDraft = payload.orderDraft || {}

    const expectations = [
      ['fromPoint', orderDraft.fromPoint, 'Airport Terminal 1'],
      ['toPoint', orderDraft.toPoint, 'Central Hotel'],
      ['currency', orderDraft.currency, 'RUB'],
      ['flightNumber', orderDraft.flightNumber || '', '']
    ]

    for (const [field, actual, expected] of expectations) {
      if (actual !== expected) {
        throw new Error(`${field} expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
      }
    }

    console.log(JSON.stringify({
      ok: true,
      draftId,
      parsed: {
        fromPoint: orderDraft.fromPoint,
        toPoint: orderDraft.toPoint,
        pickupAt: orderDraft.pickupAt,
        clientPrice: orderDraft.clientPrice,
        currency: orderDraft.currency,
        flightNumber: orderDraft.flightNumber || null
      }
    }, null, 2))
  } finally {
    if (draftId) {
      await prisma.opsEventDraft.delete({ where: { id: draftId } }).catch(() => null)
    }
    await prisma.$disconnect()
    await new Promise((resolve) => server.close(resolve))
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
