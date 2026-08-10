const test = require('node:test')
const assert = require('node:assert/strict')
const {
  buildBookingCalculationRows,
  calculateSimonDriverGrid
} = require('../../server/services/bookingSimonCalculationService')

test('reproduces Simon BCOM then PMF distance calculation', () => {
  const result = calculateSimonDriverGrid({ 5: 28.29, 10: 28.29, 20: 47.97, 40: 75.03, 60: 107.01 })
  assert.equal(result.afterCommission[5], 21.2175)
  assert.equal(result.driverPrices[5], 16.9)
  assert.equal(result.tariff.bands[0].pricePerKm, 0)
  assert.equal(result.tariff.bands[1].pricePerKm, 1.1)
  assert.equal(result.tariff.bands[2].pricePerKm, 0.8)
  assert.equal(result.tariff.bands[3].pricePerKm, 0.9)
  assert.equal(result.driverPrices[60], 61.9)
})

test('keeps a missing Booking point visible as zero instead of inventing a price', () => {
  const result = calculateSimonDriverGrid({ 5: 30, 10: 0, 20: 60, 40: 90, 60: 120 })
  assert.equal(result.driverPrices[10], 0)
  assert.equal(result.tariff.bands[0].pricePerKm, 0)
})

test('uses the newest snapshot for every point and exposes evidence', () => {
  const snapshots = [
    { externalVehicleKey: 'standard', externalVehicleName: 'Standard', currency: 'EUR', routeFrom: 'AAA Airport', routeTo: 'Point 5', publicSellPrice: 30, quotedAt: new Date('2026-08-01'), quoteKind: 'historical_file', runId: 'old', sourceUrl: 'workbook:test', evidenceJson: JSON.stringify({ iata: 'AAA', country: 'Test', city: 'City', distanceKm: 5 }) },
    { externalVehicleKey: 'standard', externalVehicleName: 'Standard', currency: 'EUR', routeFrom: 'AAA Airport', routeTo: 'Point 5', publicSellPrice: 40, quotedAt: new Date('2026-08-10'), quoteKind: 'public_sell', runId: 'new', sourceUrl: 'https://example.test', evidenceJson: JSON.stringify({ dataset: { iata: 'AAA', country: 'Test', city: 'City', distanceKm: 5, openCity: true } }) }
  ]
  const rows = buildBookingCalculationRows(snapshots)
  assert.equal(rows.length, 1)
  assert.equal(rows[0].openCity, true)
  assert.equal(rows[0].points[0].publicSellPrice, 40)
  assert.equal(rows[0].points[0].runId, 'new')
})
