const test = require('node:test')
const assert = require('node:assert/strict')

const { registerPricingComparisonRoutes } = require('../../server/routes/pricingComparisons')

function snapshot ({ iata, quotedAt }) {
  return {
    externalVehicleKey: 'standard',
    externalVehicleName: 'Standard',
    currency: 'EUR',
    routeFrom: `${iata} Airport`,
    routeTo: `${iata} city point`,
    publicSellPrice: 25,
    quotedAt: new Date(quotedAt),
    quoteKind: 'public_sell',
    runId: `run-${iata}`,
    sourceUrl: 'https://example.test',
    evidenceJson: JSON.stringify({
      dataset: { iata, country: 'Test', city: iata, distanceKm: 5, openCity: true }
    })
  }
}

test('Booking calculation reports the chronologically latest quote across airports', async () => {
  let routeHandler = null
  const app = {
    get (path, ...handlers) {
      if (path === '/api/admin/pricing/booking-calculation') routeHandler = handlers.at(-1)
    },
    post () {},
    put () {}
  }
  const pass = (_req, _res, next) => next()
  const prisma = {
    priceComparisonSource: {
      async findFirst () {
        return {
          id: 'booking-source',
          tenantId: 'tenant-1',
          adapterKey: 'booking',
          supportedCurrenciesJson: '[]',
          scheduleJson: '{}',
          passengerConfigJson: '{}',
          pricingPolicyJson: '{"deductions":[25,20]}'
        }
      }
    },
    externalTransferPriceSnapshot: {
      async findMany () {
        return [
          snapshot({ iata: 'AAA', quotedAt: '2026-08-11T10:40:08.172Z' }),
          snapshot({ iata: 'BBB', quotedAt: '2026-08-17T05:04:09.902Z' })
        ]
      }
    },
    priceComparisonRun: { async findFirst () { return null } }
  }

  registerPricingComparisonRoutes(app, {
    prisma,
    authenticateToken: pass,
    resolveActorContext: pass,
    requireActorContext: pass,
    requireCan: () => pass,
    writeAuditLog: async () => {}
  })

  assert.equal(typeof routeHandler, 'function')
  let payload = null
  await routeHandler(
    { query: {}, actorContext: { tenantId: 'tenant-1' } },
    {
      json (value) { payload = value },
      status () { return this }
    }
  )

  assert.ok(payload)
  assert.equal(new Date(payload.latestQuotedAt).toISOString(), '2026-08-17T05:04:09.902Z')
})
