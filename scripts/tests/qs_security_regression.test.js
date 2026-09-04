const test = require('node:test')
const assert = require('node:assert/strict')

const qs = require('qs')
const qsPackage = require('qs/package.json')

test('uses the patched qs release required by Express 4', () => {
  assert.equal(qsPackage.version, '6.16.0')
})

test('enforces arrayLimit for bracketed comma groups', () => {
  assert.throws(
    () => qs.parse('a[]=1,2,3,4', {
      comma: true,
      arrayLimit: 3,
      throwOnLimitExceeded: true
    }),
    /Array limit exceeded/
  )
})

test('does not invoke a non-callable constructor.isBuffer value', () => {
  const input = { value: { constructor: { isBuffer: 'not-a-function' } } }
  assert.doesNotThrow(() => qs.stringify(input))
})
