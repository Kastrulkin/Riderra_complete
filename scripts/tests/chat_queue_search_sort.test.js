const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const pageSource = fs.readFileSync(path.resolve(__dirname, '../../pages/admin-chats.vue'), 'utf8')
const serverSource = fs.readFileSync(path.resolve(__dirname, '../../server/index.js'), 'utf8')

test('dialog queue searches the complete server result by order and customer fields', () => {
  assert.match(pageSource, /placeholder="Номер заказа, клиент, телефон или маршрут"/)
  assert.match(pageSource, /if \(this\.searchQuery\) query\.set\('q', this\.searchQuery\)/)
  assert.match(serverSource, /sourceBookingId: \{ contains: searchQuery, mode: 'insensitive' \}/)
  assert.match(serverSource, /customerPhone: \{ contains: searchQuery, mode: 'insensitive' \}/)
  assert.match(serverSource, /fromPoint: \{ contains: searchQuery, mode: 'insensitive' \}/)
  assert.match(serverSource, /toPoint: \{ contains: searchQuery, mode: 'insensitive' \}/)
})

test('dialog queue defaults to the latest real message and handles tasks without messages', () => {
  assert.match(pageSource, /sortMode: 'last_message_desc'/)
  assert.match(pageSource, /a\?\.lastMessageAt \|\| a\?\.updatedAt \|\| a\?\.createdAt/)
  assert.match(serverSource, /orderBy: \[\{ lastMessageAt: \{ sort: 'desc', nulls: 'last' \} \}, \{ updatedAt: 'desc' \}\]/)
  assert.match(pageSource, /Последнее сообщение: \{\{ formatDate\(task\.lastMessageAt \|\| task\.updatedAt\) \}\}/)
})
