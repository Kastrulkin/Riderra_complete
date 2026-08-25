const DEFAULT_BOOKING_TELEGRAM_RECIPIENT_EMAILS = Object.freeze([
  'demyanov@riderra.com'
])

function parseBookingTelegramRecipientEmails(
  value = process.env.BOOKING_MONITOR_TELEGRAM_RECIPIENT_EMAILS,
  fallback = DEFAULT_BOOKING_TELEGRAM_RECIPIENT_EMAILS
) {
  const configured = String(value || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
  return Array.from(new Set(configured.length ? configured : fallback))
}

async function sendBookingTelegramNotifications({
  prisma,
  tenantId,
  message,
  sendTelegram,
  recipientEmails = parseBookingTelegramRecipientEmails()
}) {
  const links = await prisma.telegramLink.findMany({
    where: {
      tenantId,
      telegramChatId: { not: null },
      user: {
        isActive: true,
        email: { in: recipientEmails },
        memberships: { some: { tenantId, isActive: true } }
      }
    },
    select: {
      telegramChatId: true,
      user: { select: { email: true } }
    },
    orderBy: { createdAt: 'desc' }
  })

  const delivered = []
  const seenChatIds = new Set()
  for (const link of links) {
    const chatId = String(link.telegramChatId || '').trim()
    if (!chatId || seenChatIds.has(chatId)) continue
    seenChatIds.add(chatId)
    await sendTelegram(chatId, message)
    delivered.push(String(link.user.email || '').trim().toLowerCase())
  }

  const deliveredSet = new Set(delivered)
  return {
    delivered,
    missingLink: recipientEmails.filter((email) => !deliveredSet.has(email))
  }
}

module.exports = {
  DEFAULT_BOOKING_TELEGRAM_RECIPIENT_EMAILS,
  parseBookingTelegramRecipientEmails,
  sendBookingTelegramNotifications
}
