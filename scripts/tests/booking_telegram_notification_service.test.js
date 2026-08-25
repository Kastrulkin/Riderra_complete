const assert = require('assert')
const {
  parseBookingTelegramRecipientEmails,
  sendBookingTelegramNotifications
} = require('../../server/services/bookingTelegramNotificationService')

async function main() {
  assert.deepStrictEqual(
    parseBookingTelegramRecipientEmails(' Owner@Riderra.com,dispatcher@example.com,owner@riderra.com '),
    ['owner@riderra.com', 'dispatcher@example.com']
  )
  assert.deepStrictEqual(
    parseBookingTelegramRecipientEmails('', ['fallback@example.com']),
    ['fallback@example.com']
  )

  let capturedWhere = null
  const sent = []
  const result = await sendBookingTelegramNotifications({
    prisma: {
      telegramLink: {
        findMany: async ({ where }) => {
          capturedWhere = where
          return [
            { telegramChatId: '100', user: { email: 'owner@riderra.com' } },
            { telegramChatId: '100', user: { email: 'owner@riderra.com' } }
          ]
        }
      }
    },
    tenantId: 'tenant-1',
    message: 'Booking report',
    sendTelegram: async (chatId, message) => sent.push({ chatId, message }),
    recipientEmails: ['owner@riderra.com', 'dispatcher@example.com']
  })

  assert.deepStrictEqual(capturedWhere.user.email.in, ['owner@riderra.com', 'dispatcher@example.com'])
  assert.deepStrictEqual(capturedWhere.user.memberships.some, { tenantId: 'tenant-1', isActive: true })
  assert.deepStrictEqual(sent, [{ chatId: '100', message: 'Booking report' }])
  assert.deepStrictEqual(result, {
    delivered: ['owner@riderra.com'],
    missingLink: ['dispatcher@example.com']
  })

  console.log('booking telegram notification service tests passed')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
