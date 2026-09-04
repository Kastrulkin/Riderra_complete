const test = require('node:test')
const assert = require('node:assert/strict')

const {
  supplierVehicleClass,
  supplierVehicleMatchScore
} = require('../../server/services/supplierVehicleMatchingService')

test('matches stored supplier labels to the corresponding requested class', () => {
  assert.equal(supplierVehicleClass('Standard class car'), 'standard')
  assert.equal(supplierVehicleClass('Executive'), 'executive')
  assert.equal(supplierVehicleClass('Standard MPV'), 'people_carrier')
  assert.equal(supplierVehicleClass('Large People Carrier'), 'large_people_carrier')
  assert.equal(supplierVehicleClass('Executive People Carrier'), 'executive_people_carrier')
  assert.equal(supplierVehicleMatchScore('Standard MPV', 'People Carrier'), 20)
})

test('prefers an exact capacity class over a generic van fallback', () => {
  assert.equal(supplierVehicleMatchScore('Large People Carrier', 'Large People Carrier'), 30)
  assert.equal(supplierVehicleMatchScore('van', 'Large People Carrier'), 10)
  assert.equal(supplierVehicleMatchScore('Standard MPV', 'Large People Carrier'), 0)
})

test('does not substitute executive and standard classes', () => {
  assert.equal(supplierVehicleMatchScore('Executive', 'Standard class car'), 0)
  assert.equal(supplierVehicleMatchScore('Executive People Carrier', 'People Carrier'), 0)
})
