const test = require('node:test')
const assert = require('node:assert/strict')
const { createOpsNotificationRouter } = require('../../server/services/opsNotificationRouter')

function fixture({ responsible = null, links = {} } = {}) {
  const operators = [
    { id: 'yasser', email: 'samya7098@gmail.com' },
    { id: 'lisa', email: 'bellavitomatern@gmail.com' }
  ]
  const tasks = []
  const telegram = []
  const prisma = {
    user: {
      findFirst: async () => responsible,
      findMany: async () => operators
    },
    telegramLink: {
      findFirst: async ({ where }) => links[where.userId] ? { telegramChatId: links[where.userId] } : null
    }
  }
  const router = createOpsNotificationRouter({
    prisma,
    createOpsTask: async (input) => { tasks.push(input); return { id: `task-${tasks.length}`, ...input } },
    telegramSendMessage: async (chatId, text) => telegram.push({ chatId, text }),
    telegramEnabled: () => true,
    publicBaseUrl: () => 'https://riderra.test'
  })
  return { router, tasks, telegram }
}

test('sends a client reply only to the assigned responsible employee', async () => {
  const responsible = { id: 'yasser', email: 'samya7098@gmail.com' }
  const { router, tasks, telegram } = fixture({ responsible, links: { yasser: 'chat-yasser' } })
  const result = await router.notify({ tenantId: 'tenant', audience: 'responsible_or_operators', responsibleUserId: 'yasser', title: 'Client replied', type: 'customer_reply', source: 'customer_chat', dedupKey: 'reply:1', linkUrl: '/admin-chats?taskId=1' })
  assert.deepEqual(result.recipients, ['samya7098@gmail.com'])
  assert.equal(tasks.length, 1)
  assert.equal(tasks[0].dedupKey, 'reply:1:yasser')
  assert.equal(telegram.length, 1)
})

test('falls back to both operators when a dialog has no responsible employee', async () => {
  const { router, tasks } = fixture()
  const result = await router.notify({ tenantId: 'tenant', audience: 'responsible_or_operators', title: 'Client replied', type: 'customer_reply', source: 'customer_chat', dedupKey: 'reply:2' })
  assert.deepEqual(new Set(result.recipients), new Set(['samya7098@gmail.com', 'bellavitomatern@gmail.com']))
  assert.equal(tasks.length, 2)
  assert.equal(result.telegramMissing.length, 2)
})

test('routes a new complaint to both operators', async () => {
  const { router, tasks } = fixture()
  await router.notify({ tenantId: 'tenant', audience: 'operators', responsibleUserId: 'someone-else', title: 'New complaint', type: 'complaint_new', source: 'email_ingest', dedupKey: 'complaint:1' })
  assert.equal(tasks.length, 2)
  assert.ok(tasks.every((task) => task.type === 'complaint_new'))
})
