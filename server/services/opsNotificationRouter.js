const DEFAULT_OPERATOR_EMAILS = Object.freeze([
  'samya7098@gmail.com',
  'bellavitomatern@gmail.com'
])

function configuredOperatorEmails(value = process.env.OPS_NOTIFICATION_OPERATOR_EMAILS) {
  const rows = String(value || '').split(',').map((email) => email.trim().toLowerCase()).filter(Boolean)
  return Array.from(new Set(rows.length ? rows : DEFAULT_OPERATOR_EMAILS))
}

function createOpsNotificationRouter({
  prisma,
  createOpsTask,
  telegramSendMessage,
  telegramEnabled = () => Boolean(process.env.TELEGRAM_BOT_TOKEN),
  publicBaseUrl = () => process.env.PUBLIC_BASE_URL || 'https://riderra.com',
  operatorEmails = configuredOperatorEmails()
}) {
  async function activeResponsible(tenantId, userId) {
    if (!userId) return null
    return prisma.user.findFirst({
      where: {
        id: userId,
        isActive: true,
        memberships: { some: { tenantId, isActive: true } }
      },
      select: { id: true, email: true }
    })
  }

  async function activeOperators(tenantId) {
    return prisma.user.findMany({
      where: {
        isActive: true,
        email: { in: operatorEmails },
        memberships: { some: { tenantId, isActive: true } }
      },
      select: { id: true, email: true }
    })
  }

  async function recipients({ tenantId, audience, responsibleUserId }) {
    if (audience === 'responsible_or_operators') {
      const responsible = await activeResponsible(tenantId, responsibleUserId)
      if (responsible) return [responsible]
    }
    return activeOperators(tenantId)
  }

  async function notify({
    tenantId,
    audience = 'operators',
    responsibleUserId = null,
    title,
    details = null,
    type,
    priority = 'normal',
    source,
    sourceRef = null,
    dueAt = null,
    dedupKey,
    linkUrl = null,
    payload = null
  }) {
    const users = await recipients({ tenantId, audience, responsibleUserId })
    const result = { tasks: [], recipients: users.map((user) => user.email), telegramDelivered: [], telegramMissing: [] }
    for (const user of users) {
      const task = await createOpsTask({
        tenantId,
        userId: user.id,
        title,
        details,
        type,
        priority,
        source,
        sourceRef,
        dueAt,
        dedupKey: dedupKey ? `${dedupKey}:${user.id}` : null,
        linkUrl,
        payload,
        notifyTelegram: false
      })
      result.tasks.push(task)

      const link = await prisma.telegramLink.findFirst({
        where: { tenantId, userId: user.id, telegramChatId: { not: null } },
        orderBy: { createdAt: 'desc' },
        select: { telegramChatId: true }
      })
      if (!link?.telegramChatId) {
        result.telegramMissing.push(user.email)
        continue
      }
      if (!telegramEnabled()) continue
      const absoluteLink = linkUrl ? `${String(publicBaseUrl()).replace(/\/$/, '')}${linkUrl}` : null
      await telegramSendMessage(link.telegramChatId, [title, details, absoluteLink].filter(Boolean).join('\n'))
      result.telegramDelivered.push(user.email)
    }
    return result
  }

  return { notify, recipients, operatorEmails }
}

module.exports = {
  DEFAULT_OPERATOR_EMAILS,
  configuredOperatorEmails,
  createOpsNotificationRouter
}
