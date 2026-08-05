const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const chatsPagePath = path.resolve(__dirname, '../../pages/admin-chats.vue')

test('an approved WhatsApp template is shown before a pending draft can be approved', () => {
  const page = fs.readFileSync(chatsPagePath, 'utf8')
  const deliveryPanel = page.match(/<div[^>]*class="delivery-panel"[\s\S]*?<\/details>\s*<\/div>/)?.[0] || ''
  const templatePreviewIndex = page.indexOf('Согласованный шаблон WhatsApp — текст для клиента')
  const internalDraftIndex = page.indexOf('Внутренний AI-черновик — отдельно не отправляется')

  assert.ok(deliveryPanel, 'delivery panel must exist')
  assert.doesNotMatch(deliveryPanel, /v-if="canSend\(activeDraftMessage\)"/)
  assert.match(deliveryPanel, /Первое сообщение обязательно отправляется утверждённым шаблоном Meta/)
  assert.match(deliveryPanel, /Название шаблона/)
  assert.match(deliveryPanel, /templateDisplayLabel\(activeDraftMessage\)/)
  assert.ok(templatePreviewIndex >= 0, 'approved template preview must be visible')
  assert.ok(internalDraftIndex > templatePreviewIndex, 'internal AI draft must follow the customer-facing template')
})
