const crypto = require('crypto')

const TELEGRAM_BIND_SCOPE_BOOKING_PRICES = 'booking_price_changes'

class TelegramBindError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'TelegramBindError'
    this.code = code
  }
}

function hashTelegramBindToken(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex')
}

function normalizeTtlMinutes(value, fallback = 60) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.max(5, Math.min(24 * 60, Math.round(numeric)))
}

async function createTelegramBindToken({
  prisma,
  tenantId,
  userId,
  scope = TELEGRAM_BIND_SCOPE_BOOKING_PRICES,
  ttlMinutes = 60,
  now = new Date()
}) {
  const token = crypto.randomBytes(24).toString('base64url')
  const expiresAt = new Date(now.getTime() + normalizeTtlMinutes(ttlMinutes) * 60 * 1000)
  await prisma.telegramBindToken.create({
    data: {
      tenantId,
      userId,
      tokenHash: hashTelegramBindToken(token),
      scope,
      expiresAt
    }
  })
  return { token, expiresAt, scope }
}

function telegramBindSuccessMessage(scope) {
  if (scope === TELEGRAM_BIND_SCOPE_BOOKING_PRICES) {
    return 'Готово. Telegram привязан к Riderra. Вы будете получать утренние сообщения об изменениях цен Booking. Другие автоматические уведомления пока не включены.'
  }
  return 'Готово. Telegram привязан к Riderra.'
}

function telegramBindErrorMessage(error) {
  if (error?.code === 'expired') return 'Ссылка для подключения истекла. Попросите администратора создать новую.'
  if (error?.code === 'used') return 'Эта ссылка уже использована. Если Telegram не подключён, попросите администратора создать новую.'
  if (error?.code === 'telegram_already_linked') return 'Этот Telegram уже привязан к другому сотруднику Riderra.'
  return 'Не удалось проверить ссылку подключения. Попросите администратора создать новую.'
}

async function consumeTelegramBindToken({
  prisma,
  tenantId,
  token,
  telegramUserId,
  telegramChatId,
  now = new Date()
}) {
  const normalizedToken = String(token || '').trim()
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(normalizedToken)) {
    throw new TelegramBindError('invalid', 'Invalid Telegram binding token')
  }

  return prisma.$transaction(async (tx) => {
    const invite = await tx.telegramBindToken.findUnique({
      where: { tokenHash: hashTelegramBindToken(normalizedToken) },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            isActive: true,
            memberships: {
              where: { tenantId, isActive: true },
              select: { id: true }
            }
          }
        }
      }
    })
    if (!invite || invite.tenantId !== tenantId || !invite.user?.isActive || !invite.user.memberships.length) {
      throw new TelegramBindError('invalid', 'Telegram binding token was not found')
    }
    if (invite.usedAt) throw new TelegramBindError('used', 'Telegram binding token has already been used')
    if (invite.expiresAt.getTime() <= now.getTime()) throw new TelegramBindError('expired', 'Telegram binding token has expired')

    const existing = await tx.telegramLink.findUnique({ where: { telegramUserId: String(telegramUserId) } })
    if (existing && existing.userId !== invite.userId) {
      throw new TelegramBindError('telegram_already_linked', 'Telegram account is linked to another user')
    }

    const consumed = await tx.telegramBindToken.updateMany({
      where: { id: invite.id, usedAt: null },
      data: { usedAt: now }
    })
    if (consumed.count !== 1) throw new TelegramBindError('used', 'Telegram binding token has already been used')

    const link = existing
      ? await tx.telegramLink.update({
          where: { id: existing.id },
          data: { tenantId, userId: invite.userId, telegramChatId: String(telegramChatId) }
        })
      : await tx.telegramLink.create({
          data: {
            tenantId,
            userId: invite.userId,
            telegramUserId: String(telegramUserId),
            telegramChatId: String(telegramChatId)
          }
        })

    return { link, user: invite.user, scope: invite.scope }
  })
}

module.exports = {
  TELEGRAM_BIND_SCOPE_BOOKING_PRICES,
  TelegramBindError,
  consumeTelegramBindToken,
  createTelegramBindToken,
  hashTelegramBindToken,
  normalizeTtlMinutes,
  telegramBindErrorMessage,
  telegramBindSuccessMessage
}
