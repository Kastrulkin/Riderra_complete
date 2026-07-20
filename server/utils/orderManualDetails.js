const ORDER_MANUAL_EDITABLE_FIELDS = [
  'pickupAt', 'fromPoint', 'toPoint', 'customerName', 'customerEmail',
  'customerPhone', 'passengers', 'luggage', 'flightNumber', 'vehicleType',
  'lang', 'counterpartyName', 'driverNameRaw', 'clientPrice', 'driverPrice',
  'sourceCurrency', 'comment'
]

function parseJson(raw, fallback = {}) {
  try { return JSON.parse(raw) } catch (_) { return fallback }
}

function normalizePhone(value = '') {
  let digits = String(value || '').trim().replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('8')) digits = `7${digits.slice(1)}`
  return digits.length >= 10 && digits.length <= 15 ? `+${digits}` : null
}

function manualOrderJsonValue(field, value) {
  if (field === 'pickupAt') {
    if (!value) return null
    const date = value instanceof Date ? value : new Date(value)
    return Number.isNaN(date.getTime()) ? null : date.toISOString()
  }
  return value === undefined ? null : value
}

function manualOrderSnapshot(order) {
  return Object.fromEntries(ORDER_MANUAL_EDITABLE_FIELDS.map((field) => [field, manualOrderJsonValue(field, order?.[field])]))
}

function manualOrderValuesEqual(field, left, right) {
  return JSON.stringify(manualOrderJsonValue(field, left)) === JSON.stringify(manualOrderJsonValue(field, right))
}

function invalid(message) {
  return Object.assign(new Error(message), { statusCode: 400 })
}

function normalizeManualOrderPatch(input = {}) {
  const patch = {}
  const textFields = new Set(['customerName', 'customerEmail', 'flightNumber', 'lang', 'counterpartyName', 'driverNameRaw', 'sourceCurrency', 'comment'])
  for (const field of ORDER_MANUAL_EDITABLE_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(input, field)) continue
    const raw = input[field]
    if (field === 'pickupAt') {
      if (raw === null || raw === '') patch[field] = null
      else {
        const date = new Date(raw)
        if (Number.isNaN(date.getTime())) throw invalid('Pickup date and time are invalid')
        patch[field] = date
      }
      continue
    }
    if (['fromPoint', 'toPoint', 'vehicleType'].includes(field)) {
      const value = String(raw || '').trim()
      if (!value) throw invalid(`${field} is required`)
      patch[field] = value.slice(0, 1000)
      continue
    }
    if (field === 'customerPhone') {
      if (raw === null || String(raw).trim() === '') patch[field] = null
      else {
        const phone = normalizePhone(raw)
        if (!phone) throw invalid('Phone must be a valid international number')
        patch[field] = phone
      }
      continue
    }
    if (field === 'customerEmail') {
      const value = String(raw || '').trim().toLowerCase()
      if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw invalid('Customer email is invalid')
      patch[field] = value || null
      continue
    }
    if (['passengers', 'luggage'].includes(field)) {
      if (raw === null || raw === '') patch[field] = null
      else {
        const value = Number(raw)
        if (!Number.isInteger(value) || value < 0 || value > 999) throw invalid(`${field} must be an integer from 0 to 999`)
        patch[field] = value
      }
      continue
    }
    if (['clientPrice', 'driverPrice'].includes(field)) {
      if (field === 'driverPrice' && (raw === null || raw === '')) patch[field] = null
      else {
        const value = Number(String(raw).replace(',', '.'))
        if (!Number.isFinite(value) || value < 0) throw invalid(`${field} must be a non-negative number`)
        patch[field] = value
      }
      continue
    }
    if (textFields.has(field)) {
      let value = String(raw || '').trim()
      if (field === 'lang') value = value.toLowerCase()
      if (field === 'sourceCurrency') value = value.toUpperCase()
      patch[field] = value ? value.slice(0, field === 'comment' ? 5000 : 1000) : null
    }
  }
  return patch
}

function applyOrderManualOverrides(sourcePayload, rawOverrides) {
  const result = { ...sourcePayload }
  const overrides = parseJson(rawOverrides || '{}', {})
  for (const field of ORDER_MANUAL_EDITABLE_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(overrides, field)) continue
    if (field === 'pickupAt') {
      const date = overrides[field] ? new Date(overrides[field]) : null
      if (date === null || !Number.isNaN(date.getTime())) result[field] = date
    } else result[field] = overrides[field]
  }
  return result
}

module.exports = {
  ORDER_MANUAL_EDITABLE_FIELDS,
  applyOrderManualOverrides,
  manualOrderJsonValue,
  manualOrderSnapshot,
  manualOrderValuesEqual,
  normalizeManualOrderPatch
}
