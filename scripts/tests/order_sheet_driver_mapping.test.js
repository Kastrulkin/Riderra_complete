const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const assert = require('node:assert/strict')
const vm = require('node:vm')
const {
  buildDriverCanonicalRegistry,
  resolveCanonicalDriverName
} = require('../../server/utils/orderDriverCanonicalization')
const { exactDriverValue, manualDriverOverride } = require('../backfill_order_drivers_from_snapshots')

function loadProductionRawFirst() {
  const serverPath = path.join(__dirname, '..', '..', 'server', 'index.js')
  const source = fs.readFileSync(serverPath, 'utf8')
  const match = source.match(/function rawFirst\(raw, keys, fallback = ''\) \{[\s\S]*?\n\}/)
  assert.ok(match, 'rawFirst production helper must be present')
  return vm.runInNewContext(`(${match[0]})`)
}

test('Google Sheet plural driver column wins over a comment mentioning a driver', () => {
  const rawFirst = loadProductionRawFirst()
  const row = {
    'Водители': 'Riga Taxi',
    'Комментарий (то, что было в скобках, водитель вендора, машина и т.д.)': 'У нас маленькая собака 2 кг в переноске'
  }

  assert.equal(
    rawFirst(row, ['driver', 'водитель']),
    'Riga Taxi',
    'the driver field must come from «Водители», not from the operational comment'
  )
})

test('an empty driver column does not turn an operational comment into a driver', () => {
  const rawFirst = loadProductionRawFirst()
  const row = {
    'Водители': '',
    'Комментарий (то, что было в скобках, водитель вендора, машина и т.д.)': 'Уточнить детское кресло'
  }

  assert.equal(rawFirst(row, ['driver', 'водитель']), '')
  assert.equal(exactDriverValue(row), '')
})

test('driver typo resolves to the unique canonical performer from the technical sheet', () => {
  const registry = buildDriverCanonicalRegistry([
    'Цепенников Сергей',
    'Кувшинов Сергей',
    'Riga Taxi'
  ])

  assert.deepEqual(
    resolveCanonicalDriverName('Цепеников Сергей', registry),
    { value: 'Цепенников Сергей', matched: true, method: 'fuzzy', distance: 1 }
  )
})

test('ambiguous short driver names are not silently reassigned', () => {
  const registry = buildDriverCanonicalRegistry(['Иванов Иван', 'Иванов Илан'])
  const resolution = resolveCanonicalDriverName('Иванов Итан', registry)

  assert.equal(resolution.value, 'Иванов Итан')
  assert.equal(resolution.matched, false)
  assert.equal(resolution.method, 'ambiguous')
})

test('historic backfill preserves a manual driver assignment', () => {
  assert.equal(manualDriverOverride({ manualOverridesJson: '{"driverNameRaw":"Manual Driver"}' }), true)
  assert.equal(manualDriverOverride({ manualOverridesJson: '{"customerPhone":"+79000000000"}' }), false)
})
