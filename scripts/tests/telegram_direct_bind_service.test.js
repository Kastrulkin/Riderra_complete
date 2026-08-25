const assert = require('assert')
const {
  consumeTelegramBindToken,
  hashTelegramBindToken,
  telegramBindErrorMessage,
  telegramBindSuccessMessage
} = require('../../server/services/telegramDirectBindService')

async function main() {
  const now = new Date('2026-08-25T08:00:00.000Z')
  const token = 'abcdefghijklmnopqrstuvwxyz_12345'
  const calls = []
  const tx = {
    telegramBindToken: {
      findUnique: async ({ where }) => {
        assert.strictEqual(where.tokenHash, hashTelegramBindToken(token))
        return {
          id: 'invite-1', tenantId: 'tenant-1', userId: 'user-1', scope: 'booking_price_changes',
          expiresAt: new Date('2026-08-25T09:00:00.000Z'), usedAt: null,
          user: { id: 'user-1', email: 'dispatcher@example.com', isActive: true, memberships: [{ id: 'membership-1' }] }
        }
      },
      updateMany: async (args) => { calls.push(['consume', args]); return { count: 1 } }
    },
    telegramLink: {
      findUnique: async () => null,
      create: async ({ data }) => { calls.push(['link', data]); return { id: 'link-1', ...data } }
    }
  }
  const result = await consumeTelegramBindToken({
    prisma: { $transaction: async (operation) => operation(tx) },
    tenantId: 'tenant-1', token, telegramUserId: '123', telegramChatId: '123', now
  })
  assert.strictEqual(result.user.email, 'dispatcher@example.com')
  assert.deepStrictEqual(calls[1], ['link', {
    tenantId: 'tenant-1', userId: 'user-1', telegramUserId: '123', telegramChatId: '123'
  }])
  assert.match(telegramBindSuccessMessage(result.scope), /Booking/)
  assert.match(telegramBindErrorMessage({ code: 'expired' }), /истекла/)

  await assert.rejects(
    consumeTelegramBindToken({
      prisma: { $transaction: async (operation) => operation({
        ...tx,
        telegramBindToken: {
          ...tx.telegramBindToken,
          findUnique: async () => ({
            id: 'invite-1', tenantId: 'tenant-1', userId: 'user-1', scope: 'booking_price_changes',
            expiresAt: now, usedAt: null,
            user: { id: 'user-1', isActive: true, memberships: [{ id: 'membership-1' }] }
          })
        }
      }) },
      tenantId: 'tenant-1', token, telegramUserId: '123', telegramChatId: '123', now
    }),
    (error) => error.code === 'expired'
  )

  console.log('telegram direct bind service tests passed')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
