const test = require('node:test')
const assert = require('node:assert/strict')
const {
  buildBookingAirportMatrices,
  buildBookingCalculationRows,
  calculateBookingPortalGrid,
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

test('grosses up portal prices for the traveller Genius discount without applying PMF to portal rates', () => {
  const result = calculateBookingPortalGrid({ 5: 90, 10: 90, 20: 108, 40: 144, 60: 180 })
  assert.equal(result.supplierGeniusPercent, 5)
  assert.equal(result.bookingGeniusTopUpPercent, 5)
  assert.equal(result.portalGrossPrice[10], 100)
  assert.equal(result.afterBookingCommission[10], 67.5)
  assert.equal(result.driverTargetPrice[10], 54)
  assert.deepEqual(result.portalTariff, {
    initialPrice: 100,
    includedDistanceKm: 10,
    bands: [
      { number: 1, fromKm: 10, toKm: 20, nextDistanceKm: 10, pricePerKm: 2 },
      { number: 2, fromKm: 20, toKm: 40, nextDistanceKm: 20, pricePerKm: 2 },
      { number: 3, fromKm: 40, toKm: null, nextDistanceKm: null, pricePerKm: 2 }
    ]
  })
})

test('portal tariff boundaries are cumulative across initial and next-distance bands', () => {
  const result = calculateBookingPortalGrid({ 5: 90, 10: 90, 20: 108, 40: 144, 60: 180 })
  const tariff = result.portalTariff
  const finiteBands = tariff.bands.filter((band) => Number.isFinite(band.nextDistanceKm))
  let boundary = tariff.includedDistanceKm

  for (const band of finiteBands) {
    assert.equal(band.fromKm, boundary)
    boundary += band.nextDistanceKm
    assert.equal(band.toKm, boundary)
  }

  const tail = tariff.bands.find((band) => band.nextDistanceKm === null)
  assert.equal(tail.fromKm, boundary)
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

test('pivots vehicle rows into a Simon-style airport, point, vehicle matrix', () => {
  const snapshots = [
    { externalVehicleKey: 'standard', externalVehicleName: 'Standard', currency: 'EUR', routeFrom: 'AAA Airport', routeTo: 'Point 5', publicSellPrice: 40, quotedAt: new Date('2026-08-10'), quoteKind: 'public_sell', runId: 'run', sourceUrl: 'https://example.test', evidenceJson: JSON.stringify({ iata: 'AAA', country: 'Test', city: 'City', distanceKm: 5 }) },
    { externalVehicleKey: 'executive', externalVehicleName: 'Executive', currency: 'EUR', routeFrom: 'AAA Airport', routeTo: 'Point 5', publicSellPrice: 55, quotedAt: new Date('2026-08-10'), quoteKind: 'public_sell', runId: 'run', sourceUrl: 'https://example.test', evidenceJson: JSON.stringify({ iata: 'AAA', country: 'Test', city: 'City', distanceKm: 5 }) }
  ]
  const matrices = buildBookingAirportMatrices(buildBookingCalculationRows(snapshots))
  assert.equal(matrices.length, 1)
  assert.equal(matrices[0].airportName, 'AAA Airport')
  assert.deepEqual(matrices[0].vehicles.map((vehicle) => vehicle.name), ['Executive', 'Standard'])
  assert.equal(matrices[0].points[0].destinationAddress, 'Point 5')
  assert.equal(matrices[0].points[0].prices.standard.publicSellPrice, 40)
  assert.equal(matrices[0].points[0].prices.executive.publicSellPrice, 55)
})
