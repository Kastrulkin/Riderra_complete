const test = require('node:test')
const assert = require('node:assert/strict')

const {
  buildBookingMorningMessage,
  indexPreviousBookingQuotes,
  summarizeBookingPriceMovements
} = require('../../server/services/bookingPriceMovementService')

function quote(overrides = {}) {
  return {
    cityPricingId: 'price-1',
    routeFrom: 'Helsinki Vantaa airport (HEL)',
    routeTo: 'Järvenpää',
    requestedVehicleType: 'Business class car',
    externalVehicleKey: 'business',
    clientCurrency: 'EUR',
    riderraCurrency: 'EUR',
    quotedAt: new Date('2026-08-15T05:00:00Z'),
    clientSellPrice: 100,
    ...overrides
  }
}

test('Booking movement compares the current Booking price with the latest previous Booking quote', () => {
  const previous = [
    quote({ clientSellPrice: 90, quotedAt: new Date('2026-08-14T05:00:00Z') }),
    quote({ clientSellPrice: 100, quotedAt: new Date('2026-08-15T05:00:00Z') })
  ]
  const summary = summarizeBookingPriceMovements([
    quote({ clientSellPrice: 105, quotedAt: new Date('2026-08-16T05:00:00Z') })
  ], previous)

  assert.equal(summary.increased.length, 1)
  assert.equal(summary.increased[0].previousPrice, 100)
  assert.equal(summary.increased[0].currentPrice, 105)
  assert.equal(summary.increased[0].deltaPct, 5)
})

test('Booking movement reports decreases, unchanged prices and first snapshots separately', () => {
  const previous = [quote({ clientSellPrice: 100 })]
  const summary = summarizeBookingPriceMovements([
    quote({ clientSellPrice: 80 }),
    quote({ cityPricingId: 'price-2', routeTo: 'Espoo', clientSellPrice: 80 }),
    quote({ cityPricingId: 'price-3', routeTo: 'Turku', clientSellPrice: 100 })
  ], previous)

  assert.equal(summary.decreased.length, 1)
  assert.equal(summary.decreased[0].delta, -20)
  assert.equal(summary.firstSnapshot.length, 2)
  assert.equal(summary.unchanged.length, 0)
})

test('Booking movement can retain history when a 005 row was recreated', () => {
  const previousIndex = indexPreviousBookingQuotes([
    quote({ cityPricingId: 'old-price-row', clientSellPrice: 120 })
  ])
  const summary = summarizeBookingPriceMovements([
    quote({ cityPricingId: 'new-price-row', clientSellPrice: 110 })
  ], [...previousIndex.route.values()])

  assert.equal(summary.decreased.length, 1)
  assert.equal(summary.decreased[0].previousPrice, 120)
})

test('Booking morning message separates the summary, movements and calculation basis', () => {
  const summary = summarizeBookingPriceMovements([
    quote({ clientSellPrice: 105, quotedAt: new Date('2026-08-16T05:00:00Z') })
  ], [quote({ clientSellPrice: 100 })])
  const message = buildBookingMorningMessage({
    monitorDate: '2026-08-16',
    finished: { processedCount: 439, routeCount: 439, needsReviewCount: 103, failedCount: 7 },
    summary,
    increased: summary.increased,
    decreased: summary.decreased,
    approvalId: 'report-1'
  })

  assert.match(message, /BOOKING · УТРЕННЯЯ ПРОВЕРКА/)
  assert.match(message, /16 августа 2026 г\./)
  assert.match(message, /СВОДКА\n✅ Проверено: 439\/439/)
  assert.match(message, /🔺 ПОДОРОЖАЛО/)
  assert.match(message, /100\.00 → 105\.00 EUR · \+5\.00%/)
  assert.match(message, /КАК СЧИТАЕМ/)
  assert.match(message, /Отчёт на проверку: report-1/)
})
