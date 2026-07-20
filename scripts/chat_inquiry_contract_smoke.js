const assert = require('assert')
const { inquiryInboundIdempotencyKey, nextInquiryState, inquiryStatusLabel } = require('../server/utils/chatInquiry')

assert.strictEqual(inquiryInboundIdempotencyKey('whatsapp', 'wamid.123'), 'inbound:whatsapp:wamid.123')
assert.strictEqual(inquiryInboundIdempotencyKey('WhatsApp', ' wamid.123 '), 'inbound:whatsapp:wamid.123')
assert.strictEqual(nextInquiryState({ currentState: 'closed', hasOrder: false }), 'new')
assert.strictEqual(nextInquiryState({ currentState: 'waiting_customer', hasOrder: false }), 'in_progress')
assert.strictEqual(nextInquiryState({ currentState: 'waiting_customer', hasOrder: true }), 'linked_order')
assert.strictEqual(nextInquiryState({ currentState: 'spam', hasOrder: false }), 'spam')
assert.strictEqual(inquiryStatusLabel({ state: 'waiting_customer', hasOrder: false }), 'Ждём клиента')
assert.strictEqual(inquiryStatusLabel({ state: 'waiting_customer', hasOrder: true }), 'Связано с заказом')

console.log('chat inquiry contract smoke: ok')
