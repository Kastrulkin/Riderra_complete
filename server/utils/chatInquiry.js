function inquiryInboundIdempotencyKey(channel, externalMessageId) {
  const normalizedChannel = String(channel || 'whatsapp').trim().toLowerCase() || 'whatsapp'
  const normalizedId = String(externalMessageId || '').trim()
  return normalizedId ? `inbound:${normalizedChannel}:${normalizedId}` : null
}

function nextInquiryState({ currentState, hasOrder }) {
  if (hasOrder) return 'linked_order'
  const current = String(currentState || '')
  if (current === 'spam') return 'spam'
  if (current === 'closed' || current === 'new') return 'new'
  return 'in_progress'
}

function inquiryStatusLabel({ state, hasOrder }) {
  if (hasOrder && !['closed', 'spam'].includes(state)) return 'Связано с заказом'
  return ({
    new: 'Новое',
    in_progress: 'В работе',
    waiting_customer: 'Ждём клиента',
    linked_order: 'Связано с заказом',
    closed: 'Закрыто',
    spam: 'Спам'
  })[state] || state
}

module.exports = { inquiryInboundIdempotencyKey, nextInquiryState, inquiryStatusLabel }
