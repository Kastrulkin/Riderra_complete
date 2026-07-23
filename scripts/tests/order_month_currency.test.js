const assert = require('assert')
const importer = require('../sync_order_sheets_from_manifest')

assert.strictEqual(importer.currency('1 500,00 ₽'), 'RUB')
assert.strictEqual(importer.currency('1 500,00 руб.'), 'RUB')
assert.strictEqual(importer.currency('1 500 RUB'), 'RUB')
assert.strictEqual(importer.currency('€ 42.50'), 'EUR')
assert.strictEqual(importer.currency(1500, {}, 'RUB'), 'RUB')
assert.strictEqual(importer.currency(4025, { cityCode: 'SVO', monthLabel: '2022-01' }), 'RUB')
assert.strictEqual(importer.currency(30, { cityCode: 'SVO', monthLabel: '2018-04' }), 'EUR')
assert.strictEqual(importer.currency(12, { cityCode: 'Tbilisi', monthLabel: '2022-01' }), 'EUR')
assert.strictEqual(importer.currency(37.05, { cityCode: 'Los Angeles', monthLabel: '2024-02' }), 'USD')

const row = importer.buildRow({
  item: { spreadsheetId: 'sheet', sourceName: 'Январь 2022', tableTab: 'Таблица', monthLabel: '2022-01', defaultCurrency: 'RUB' },
  sourceRow: 2,
  orderNumber: 'TEST-1',
  clientPrice: 1500,
  clientPriceRaw: '1 500,00 ₽'
})

assert.strictEqual(row.client_price, 1500)
assert.strictEqual(row.currency, 'RUB')
assert.strictEqual(row.currency_evidence, 'explicit')

const audit = importer.currencyAudit([
  row,
  { client_price: 20, currency: 'EUR', currency_evidence: 'fallback' }
])
assert.deepStrictEqual(audit.currencies, { RUB: 1, EUR: 1 })
assert.deepStrictEqual(audit.grossByCurrency, { RUB: 1500, EUR: 20 })
assert.deepStrictEqual(audit.currencyEvidence, { explicit: 1, fallback: 1 })

console.log('order_month_currency tests passed')
