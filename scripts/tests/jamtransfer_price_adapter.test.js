const test = require('node:test')
const assert = require('node:assert/strict')

const {
  JamTransferAdapter,
  parseJamTransferOrigins,
  parseJamTransferPricePage
} = require('../../server/services/jamTransferPriceAdapter')

test('JamTransfer origin catalog becomes public price pages', () => {
  const pages = parseJamTransferOrigins({
    Italy: { items: [{ id: 42, name: 'Naples Airport', slug: 'naples+airport' }] }
  })
  assert.deepEqual(pages, [{
    sourceUrl: 'https://www.jamtransfer.com/taxi-transfers-from-naples+airport',
    pickupLabel: 'Naples Airport',
    country: 'Italy',
    externalPickupId: 42
  }])
})

test('JamTransfer published FAQ prices are parsed by route, class and capacity', () => {
  const html = `
    <div class="faq-answer-content">Transfer from Naples Airport to Sorrento starts at €123.
      <br>Standard, 3 passengers Price is: €123.
      <br>Standard, 8 passengers Price is: €151.
      <br>Premium, 3 passengers Price is: €277.
      <br>Premium, 3 passengers Adds to the price are: Night from 22:00 to 07:00 / 20.00%
      <br>First Class, 3 passengers Price is: €1,234.50.
    </div>`
  const rows = parseJamTransferPricePage(html, { sourceUrl: 'https://example.test/naples', country: 'Italy', externalPickupId: 42 })
  assert.deepEqual(rows.map((row) => [row.routeFrom, row.routeTo, row.externalVehicleKey, row.maxPassengers, row.price]), [
    ['Naples Airport', 'Sorrento', 'standard_3', 3, 123],
    ['Naples Airport', 'Sorrento', 'standard_8', 8, 151],
    ['Naples Airport', 'Sorrento', 'premium_3', 3, 277],
    ['Naples Airport', 'Sorrento', 'first_class_3', 3, 1234.5]
  ])
  assert.equal(rows[0].evidence.surchargesNotApplied, true)
})

test('JamTransfer adapter reads prices from stored public snapshots without creating bookings', async () => {
  const adapter = new JamTransferAdapter()
  adapter.loadCatalogSnapshots([{
    pickupPlaceId: 'jamtransfer:pickup', pickupLabel: 'Naples Airport',
    dropoffPlaceId: 'jamtransfer:dropoff', dropoffLabel: 'Sorrento',
    currency: 'EUR', externalVehicleKey: 'standard_3', externalVehicleName: 'Standard, up to 3 passengers',
    maxPassengers: 3, publicSellPrice: 123, sourceUrl: 'https://example.test', evidenceJson: '{}'
  }])
  const result = await adapter.fetchQuotes({
    pickup: { id: 'jamtransfer:pickup' }, dropoff: { id: 'jamtransfer:dropoff' }, currency: 'EUR'
  })
  assert.equal(result.quotes[0].price, 123)
  assert.equal(result.evidence.restoredFromPublicCatalog, true)
})
