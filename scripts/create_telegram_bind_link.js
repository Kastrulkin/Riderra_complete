#!/usr/bin/env node
require('dotenv').config()

const { PrismaClient } = require('@prisma/client')
const {
  TELEGRAM_BIND_SCOPE_BOOKING_PRICES,
  createTelegramBindToken
} = require('../server/services/telegramDirectBindService')

function option(name, fallback = '') {
  const prefix = `--${name}=`
  const inline = process.argv.find((arg) => arg.startsWith(prefix))
  if (inline) return inline.slice(prefix.length)
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] || fallback : fallback
}

async function main() {
  const email = String(option('email')).trim().toLowerCase()
  if (!email) throw new Error('Usage: node scripts/create_telegram_bind_link.js --email employee@example.com [--ttl-minutes 60]')
  const tenantCode = String(option('tenant', 'riderra')).trim()
  const ttlMinutes = Number(option('ttl-minutes', '60'))
  const botUsername = String(process.env.TELEGRAM_BOT_USERNAME || 'Riderra_Operator_Bot').replace(/^@/, '').trim()

  const prisma = new PrismaClient()
  try {
    const tenant = await prisma.tenant.findUnique({ where: { code: tenantCode }, select: { id: true } })
    if (!tenant) throw new Error(`Tenant ${tenantCode} not found`)
    const user = await prisma.user.findFirst({
      where: {
        email,
        isActive: true,
        memberships: { some: { tenantId: tenant.id, isActive: true } }
      },
      select: { id: true, email: true }
    })
    if (!user) throw new Error(`Active staff user ${email} not found`)

    await prisma.telegramBindToken.deleteMany({
      where: { tenantId: tenant.id, userId: user.id, usedAt: null }
    })
    const invite = await createTelegramBindToken({
      prisma,
      tenantId: tenant.id,
      userId: user.id,
      scope: TELEGRAM_BIND_SCOPE_BOOKING_PRICES,
      ttlMinutes
    })
    console.log(JSON.stringify({
      email: user.email,
      scope: invite.scope,
      expiresAt: invite.expiresAt.toISOString(),
      url: `https://t.me/${botUsername}?start=bind_${invite.token}`
    }))
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
