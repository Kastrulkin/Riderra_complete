const assert = require('assert')
const {
  applyOrderManualOverrides,
  manualOrderSnapshot,
  manualOrderValuesEqual,
  normalizeManualOrderPatch
} = require('../server/utils/orderManualDetails')

const patch = normalizeManualOrderPatch({
  pickupAt: '2026-07-25T08:30:00.000Z',
  fromPoint: 'New pickup point',
  customerEmail: ' Passenger@Example.com ',
  customerPhone: '+7 (921) 422-48-43',
  passengers: '3',
  luggage: '4',
  clientPrice: '125,50',
  driverPrice: ''
})

assert.strictEqual(patch.customerPhone, '+79214224843')
assert.strictEqual(normalizeManualOrderPatch({ customerPhone: '8 (921) 422-48-43' }).customerPhone, '+79214224843')
assert.strictEqual(patch.customerEmail, 'passenger@example.com')
assert.strictEqual(patch.passengers, 3)
assert.strictEqual(patch.luggage, 4)
assert.strictEqual(patch.clientPrice, 125.5)
assert.strictEqual(patch.driverPrice, null)

const synced = applyOrderManualOverrides({
  pickupAt: new Date('2026-07-25T07:00:00.000Z'),
  fromPoint: 'Google Sheet pickup',
  luggage: 1,
  customerPhone: '+79000000000'
}, JSON.stringify({
  pickupAt: patch.pickupAt.toISOString(),
  fromPoint: patch.fromPoint,
  luggage: patch.luggage,
  customerPhone: patch.customerPhone
}))

assert.strictEqual(synced.pickupAt.toISOString(), '2026-07-25T08:30:00.000Z')
assert.strictEqual(synced.fromPoint, 'New pickup point')
assert.strictEqual(synced.luggage, 4)
assert.strictEqual(synced.customerPhone, '+79214224843')
assert.strictEqual(manualOrderValuesEqual('pickupAt', synced.pickupAt, '2026-07-25T08:30:00.000Z'), true)
assert.strictEqual(manualOrderSnapshot(synced).pickupAt, '2026-07-25T08:30:00.000Z')
assert.throws(() => normalizeManualOrderPatch({ customerPhone: '123' }), /valid international number/)
assert.throws(() => normalizeManualOrderPatch({ luggage: '3.5' }), /integer/)
assert.throws(() => normalizeManualOrderPatch({ fromPoint: '' }), /required/)

console.log('Order manual details smoke passed')
