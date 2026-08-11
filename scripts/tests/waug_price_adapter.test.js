const test = require('node:test')
const assert = require('node:assert/strict')

const {
  WaugAdapter,
  inferredRoute,
  parseWaugActivityCards
} = require('../../server/services/waugPriceAdapter')
const { externalVehicleMatches } = require('../../server/services/priceComparisonService')

const FIXTURE = `
<a href="/en/activities/135550"><article>
  <img alt="[Exclusive Discount] [Vehicle Price] Bangkok Airport Pick-up &amp; Drop-off Service" />
  <h3>[Exclusive Discount] [Vehicle Price] Bangkok Airport Pick-up &amp; Drop-off Service</h3>
  <del>US$ 10.08</del>
  <div class="CardContents-module__origin available_coupon">US$ 9.78<svg></svg></div>
</article></a>
<a href="/en/activities/105764"><article>
  <h3>Da Nang Airport - Hoi An Transfer Service</h3>
  <div class="CardContents-module__origin">US$ 15.84</div>
</article></a>
<a href="/en/activities/135550"><article><h3>Duplicate</h3><div class="x__origin">US$ 1.00</div></article></a>
`

test('Waug catalog parser saves discounted public starting prices once per activity', () => {
  const rows = parseWaugActivityCards(FIXTURE)
  assert.equal(rows.length, 2)
  assert.equal(rows[0].price, 9.78)
  assert.equal(rows[0].evidence.originalPrice, 10.08)
  assert.equal(rows[0].evidence.discountPercent, 2.98)
  assert.equal(rows[0].currency, 'USD')
  assert.equal(rows[0].evidence.requiresReviewBeforeOpportunity, true)
})

test('Waug route inference distinguishes an explicit direction from a service area', () => {
  assert.deepEqual(inferredRoute('Da Nang Airport - Hoi An Transfer Service'), {
    routeFrom: 'Da Nang Airport',
    routeTo: 'Hoi An',
    precision: 'title_direction'
  })
  assert.deepEqual(inferredRoute('[Vehicle Price] Bangkok Airport Pick-up Service'), {
    routeFrom: 'Bangkok Airport',
    routeTo: 'Bangkok service area',
    precision: 'catalog_service_area'
  })
})

test('Waug starting-price products never auto-map to a Riderra vehicle class', () => {
  assert.equal(externalVehicleMatches('waug', 'activity_135550_starting_price', 'Standard Sedan 3 pax'), false)
})

test('Waug adapter collects its public catalog without booking actions', async () => {
  const adapter = new WaugAdapter({}, {
    fetchImpl: async () => ({ ok: true, text: async () => FIXTURE })
  })
  const pages = []
  const result = await adapter.collectCatalog({ onPage: async (page, rows) => pages.push({ page, rows }) })
  assert.equal(result.collectedPages, 1)
  assert.equal(result.collectedQuotes, 2)
  assert.equal(pages[0].rows.length, 2)
})
