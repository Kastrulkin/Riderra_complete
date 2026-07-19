const assert = require('assert')
const {
  buildGoogleSheetTripExternalKey,
  shouldReuseOrderForPickupChange
} = require('../server/utils/orderIdentity')

const base = {
  tenantId: 'tenant-riderra',
  orderNumber: 'SGP7HC-1',
  pickupAt: '2026-07-21T07:30:00.000Z'
}

const sameTrip = buildGoogleSheetTripExternalKey(base)
assert.ok(sameTrip, 'A complete trip identity must produce a key')
assert.strictEqual(
  sameTrip,
  buildGoogleSheetTripExternalKey({ ...base, orderNumber: '  sgp7hc-1  ' }),
  'Cosmetic order-number changes must not create a duplicate'
)
assert.strictEqual(
  sameTrip,
  buildGoogleSheetTripExternalKey({ ...base, pickupAt: '2026-07-21T10:30:00.000+03:00' }),
  'Equivalent timestamps must identify the same trip'
)
assert.notStrictEqual(
  sameTrip,
  buildGoogleSheetTripExternalKey({ ...base, pickupAt: '2026-07-25T07:30:00.000Z' }),
  'A return trip with the same order number must have a different key'
)
assert.notStrictEqual(
  sameTrip,
  buildGoogleSheetTripExternalKey({ ...base, tenantId: 'another-tenant' }),
  'Trip identities must be isolated by tenant'
)
assert.strictEqual(
  buildGoogleSheetTripExternalKey({ ...base, orderNumber: '' }),
  null,
  'Incomplete rows must use the caller fallback'
)

const oldPickupAt = '2026-07-21T07:30:00.000Z'
const newPickupAt = '2026-07-21T08:30:00.000Z'
const newKey = buildGoogleSheetTripExternalKey({ ...base, pickupAt: newPickupAt })
assert.strictEqual(
  shouldReuseOrderForPickupChange({
    tenantId: base.tenantId,
    incomingOrderNumber: base.orderNumber,
    candidateOrderNumber: base.orderNumber,
    candidatePickupAt: oldPickupAt,
    incomingTripKeys: new Set([newKey])
  }),
  true,
  'A corrected pickup time must keep the existing order identity'
)
assert.strictEqual(
  shouldReuseOrderForPickupChange({
    tenantId: base.tenantId,
    incomingOrderNumber: base.orderNumber,
    candidateOrderNumber: base.orderNumber,
    candidatePickupAt: oldPickupAt,
    incomingTripKeys: new Set([sameTrip, newKey])
  }),
  false,
  'A reordered round trip must keep both date/time identities separate'
)

console.log('Google Sheet order identity smoke passed')
