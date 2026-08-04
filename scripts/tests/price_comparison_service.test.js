const test = require('node:test')
const assert = require('node:assert/strict')
const {
  SmartRydeAdapter,
  applyPricingPolicy,
  buildComparison,
  externalRouteKey,
  nextScheduledServiceAt,
  parseSmartRydeQuotes,
  smartRydeVehicleMatches
} = require('../../server/services/priceComparisonService')

test('SmartRyde policy deducts 30 percent from Riderra sell price', () => {
  assert.equal(applyPricingPolicy(100, { type: 'percentage_discount', discountPercent: 30 }), 70)
  assert.deepEqual(buildComparison({ riderraSellPrice: 100, clientSellPrice: 90, policy: { type: 'percentage_discount', discountPercent: 30 } }), {
    targetPrice: 70,
    opportunityGapAbs: 20,
    opportunityGapPct: 22.22,
    status: 'opportunity'
  })
})

test('equality is not a green opportunity', () => {
  assert.equal(buildComparison({
    riderraSellPrice: 100,
    clientSellPrice: 70,
    policy: { type: 'percentage_discount', discountPercent: 30 }
  }).status, 'not_opportunity')
})

test('sequential deductions remain available for future partner formulas', () => {
  assert.equal(applyPricingPolicy(100, { type: 'sequential_deductions', deductions: [25, 20] }), 60)
})

test('service date is the first Wednesday at least seven days ahead', () => {
  const result = nextScheduledServiceAt(new Date('2026-08-04T09:00:00Z'), { weekday: 3, localTime: '12:00', minLeadDays: 7 })
  assert.equal(result.toISOString(), '2026-08-12T12:00:00.000Z')
})

test('external quote collection groups vehicle rows for the same route and currency', () => {
  const standard = externalRouteKey({ routeFrom: ' LHR ', routeTo: 'London Hotel', currency: 'eur', vehicleType: 'Standard' })
  const business = externalRouteKey({ routeFrom: 'lhr', routeTo: '  London   Hotel ', currency: 'EUR', vehicleType: 'Business' })
  const reverse = externalRouteKey({ routeFrom: 'London Hotel', routeTo: 'LHR', currency: 'EUR' })
  assert.equal(standard, business)
  assert.notEqual(standard, reverse)
})

test('SmartRyde quote parser extracts safe vehicle facts', () => {
  const html = '<button data-car="{&quot;name&quot;:&quot;Standard 5 seat&quot;,&quot;price&quot;:130,&quot;format_price&quot;:&quot;$130.00&quot;,&quot;max_passenger&quot;:3,&quot;explain&quot;:&quot;Ford Focus&quot;}"></button>'
  assert.deepEqual(parseSmartRydeQuotes(html), [{
    externalVehicleKey: 'standard_5_seat',
    externalVehicleName: 'Standard 5 seat',
    maxPassengers: 3,
    price: 130,
    formattedPrice: '$130.00',
    exampleVehicle: 'Ford Focus'
  }])
})

test('known SmartRyde classes map deterministically and do not collapse executive into standard', () => {
  assert.equal(smartRydeVehicleMatches('standard_5_seat', 'Standard Sedan 3 pax'), true)
  assert.equal(smartRydeVehicleMatches('standard_5_seat', 'Executive Sedan'), false)
  assert.equal(smartRydeVehicleMatches('lengthened_5_seat', 'Business Class Car'), true)
  assert.equal(smartRydeVehicleMatches('standard_7_seat', 'MPV 6 pax'), true)
  assert.equal(smartRydeVehicleMatches('8_seat_bus', 'Standard 8 Seats'), true)
})

test('SmartRyde adapter follows currency, CSRF and search-car contract', async () => {
  const calls = []
  let searchPageCalls = 0
  const fakeFetch = async (url, options = {}) => {
    calls.push({ url: String(url), options })
    if (String(url).includes('/change-currency/')) return new Response('', { status: 200, headers: { 'set-cookie': 'currency=EUR; Path=/' } })
    if (String(url).includes('/search?')) {
      searchPageCalls++
      return new Response('<meta name="csrf-token" content="token-1">', { status: 200, headers: { 'set-cookie': 'session=abc; Path=/' } })
    }
    if (String(url).endsWith('/search-car')) {
      assert.equal(options.method, 'POST')
      assert.equal(options.headers['X-CSRF-TOKEN'], 'token-1')
      return new Response('<button data-car="{&quot;name&quot;:&quot;Standard 5 seat&quot;,&quot;price&quot;:130,&quot;max_passenger&quot;:3}"></button>', { status: 200 })
    }
    throw new Error(`Unexpected URL ${url}`)
  }
  const adapter = new SmartRydeAdapter({ baseUrl: 'https://example.test', supportedCurrencies: ['EUR'] }, { fetchImpl: fakeFetch })
  const result = await adapter.fetchQuotes({
    pickup: { id: 'pickup-id', label: 'Airport' },
    dropoff: { id: 'dropoff-id', label: 'Hotel' },
    serviceAt: new Date('2026-08-12T12:00:00Z'),
    currency: 'EUR',
    passengers: { adults: 1, children: 0 }
  })
  assert.equal(result.quotes[0].price, 130)
  assert.equal(result.evidence.quoteCount, 1)
  assert.equal(calls.length, 4)
  assert.equal(searchPageCalls, 2)
  assert.equal(JSON.stringify(result.evidence).includes('token-1'), false)
})
