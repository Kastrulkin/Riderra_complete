const test = require('node:test')
const assert = require('node:assert/strict')
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
