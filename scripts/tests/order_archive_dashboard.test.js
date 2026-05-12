const assert = require('assert')
const archive = require('../../utils/orderArchiveDashboard')

function run() {
  assert.strictEqual(archive.convertToEur(100, 'USD'), 92, 'USD converts to EUR')
  assert.strictEqual(archive.totalEur({ EUR: 120, USD: 80 }), 193.6, 'mixed currencies convert to one EUR value')
  assert.strictEqual(archive.formatEur(193.6), 'EUR 193,6', 'EUR display is the analytics money format')

  assert.strictEqual(
    archive.hasMinimumVolume({ total: 4 }, archive.MIN_NEGATIVE_RANKING_VOLUME),
    false,
    'negative rankings exclude low-volume rows'
  )

  const leaderboards = archive.buildLeaderboards({
    mode: 'rate',
    minimumVolume: 5,
    drivers: [
      { driver: 'A', total: 2, completed: 1, cancelled: 1, complaints: 1, issueCount: 1, grossByCurrency: { EUR: 100 } },
      { driver: 'B', total: 10, completed: 7, cancelled: 3, complaints: 2, issueCount: 3, grossByCurrency: { EUR: 500 } }
    ],
    counterparties: [
      { counterparty: 'Client A', total: 10, completed: 9, cancelled: 1, complaints: 0, issueCount: 1, grossByCurrency: { EUR: 700 } }
    ]
  })

  assert.strictEqual(leaderboards.problemDrivers.length, 1, 'problem drivers respect minimum volume')
  assert.strictEqual(leaderboards.problemDrivers[0].name, 'B', 'problem driver with enough volume is included')
  assert.strictEqual(archive.formatRate(0.126), '13%', 'rates are human-readable')
}

run()
console.log('order_archive_dashboard tests passed')
