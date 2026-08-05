const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { staffChatReadWhere } = require('../../server/utils/chatVisibility')

test('staff chat history is tenant-wide and does not depend on the viewer', () => {
  const assignedToSomeoneElse = 'employee-b'
  const viewer = 'employee-a'

  const where = staffChatReadWhere('riderra-tenant', { state: 'in_progress' })

  assert.deepEqual(where, { tenantId: 'riderra-tenant', state: 'in_progress' })
  assert.equal(Object.hasOwn(where, 'assignedToUserId'), false)
  assert.notEqual(viewer, assignedToSomeoneElse)
})

test('chat visibility never crosses tenant boundaries', () => {
  assert.deepEqual(
    staffChatReadWhere('riderra-tenant', { id: 'conversation-1', tenantId: 'other-business' }),
    { tenantId: 'riderra-tenant', id: 'conversation-1' }
  )
  assert.throws(() => staffChatReadWhere('', {}), /tenantId is required/)
})

test('a request created by one employee remains visible to another employee', () => {
  const yasserId = 'employee-yasser'
  const alexanderId = 'employee-alexander'
  const task = {
    tenantId: 'riderra-tenant',
    assignedToUserId: yasserId,
    order: { sourceBookingId: '787761543' }
  }

  const where = staffChatReadWhere(task.tenantId)

  assert.equal(where.tenantId, task.tenantId)
  assert.equal(Object.hasOwn(where, 'assignedToUserId'), false)
  assert.notEqual(alexanderId, task.assignedToUserId)
})

test('the order clarification control sends the id of the selected row', () => {
  const pagePath = path.resolve(__dirname, '../../pages/admin-orders.vue')
  const pageSource = fs.readFileSync(pagePath, 'utf8')

  assert.match(pageSource, /@change="onInfoQuickChange\(o, \$event\.target\.value\)"/)
  assert.match(pageSource, /await this\.updateInfoNote\(order\.id, true, reason \|\| null\)/)
  assert.match(pageSource, /fetch\(`\/api\/admin\/orders\/\$\{encodeURIComponent\(orderId\)\}\/info-note`/)
})
