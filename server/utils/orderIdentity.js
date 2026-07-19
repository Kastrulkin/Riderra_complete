const crypto = require('crypto')

function normalizeOrderNumberIdentity(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase()
}

function normalizePickupIdentity(value) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}

function buildGoogleSheetTripExternalKey({ tenantId, orderNumber, pickupAt }) {
  const normalizedOrderNumber = normalizeOrderNumberIdentity(orderNumber)
  const normalizedPickupAt = normalizePickupIdentity(pickupAt)
  if (!tenantId || !normalizedOrderNumber || !normalizedPickupAt) return null

  const identityHash = crypto
    .createHash('sha256')
    .update(JSON.stringify([String(tenantId), normalizedOrderNumber, normalizedPickupAt]))
    .digest('hex')

  return `google_sheet:v2:${identityHash}`
}

function shouldReuseOrderForPickupChange({
  tenantId,
  incomingOrderNumber,
  candidateOrderNumber,
  candidatePickupAt,
  incomingTripKeys
}) {
  if (normalizeOrderNumberIdentity(incomingOrderNumber) !== normalizeOrderNumberIdentity(candidateOrderNumber)) return false
  const candidateKey = buildGoogleSheetTripExternalKey({ tenantId, orderNumber: candidateOrderNumber, pickupAt: candidatePickupAt })
  if (!candidateKey) return false
  return !incomingTripKeys.has(candidateKey)
}

module.exports = {
  buildGoogleSheetTripExternalKey,
  normalizeOrderNumberIdentity,
  normalizePickupIdentity,
  shouldReuseOrderForPickupChange
}
