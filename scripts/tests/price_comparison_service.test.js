const test = require('node:test')
const assert = require('node:assert/strict')
const {
  SmartRydeAdapter,
  applyPricingPolicy,
  buildComparison,
  comparisonRunScopeWhere,
  externalVehicleMatches,
  externalRouteKey,
  hasFinalComparison,
  nextScheduledServiceAt,
  parseSmartRydeQuotes,
  placeCandidateMatches,
  resolveStoredPlace,
  resolveTransferzBenchmarkPlace,
  selectPlaceCandidate,
  smartRydeVehicleMatches
} = require('../../server/services/priceComparisonService')

test('Suntransfers vehicle codes map by service family and exact capacity', () => {
  assert.equal(externalVehicleMatches('suntransfers', 'tx3', 'Standard class car'), true)
  assert.equal(externalVehicleMatches('suntransfers', 'premtx3', 'Business class car'), true)
  assert.equal(externalVehicleMatches('suntransfers', 'mv7', 'Standard minivan 7 pax'), true)
  assert.equal(externalVehicleMatches('suntransfers', 'mv6', 'Standard minivan 7 pax'), false)
  assert.equal(externalVehicleMatches('suntransfers', 'premmv5', 'Businessvan 5 pax'), true)
  assert.equal(externalVehicleMatches('suntransfers', 'mch16', 'Standard Minibus 16pax'), true)
  assert.equal(externalVehicleMatches('suntransfers', 'sh', 'Standard class car'), false)
})

test('Transferz can reuse a verified Riderra zone point as an exact public address', async () => {
  let saved
  const prisma = {
    geoZoneBenchmarkPoint: {
      findFirst: async () => ({ id: 'point-1', geocodedAddress: 'Obere Augartenstrasse 1e, Vienna', verifiedAt: new Date('2026-08-01T00:00:00Z'), verifiedByUserId: 'owner-1' })
    },
    priceComparisonPlaceMap: {
      upsert: async (query) => { saved = query; return { id: 'mapping-1', ...query.create } }
    }
  }
  const adapter = {
    resolvePlace: async () => [{ id: 'transferz:address-1', label: 'Obere Augartenstrasse 1e', description: 'Vienna' }]
  }
  const result = await resolveTransferzBenchmarkPlace({ prisma, tenantId: 'tenant-1', source: { id: 'source-1' }, adapter, zoneName: 'Vienna' })
  assert.equal(result.ok, true)
  assert.equal(result.benchmarkPointId, 'point-1')
  assert.equal(saved.create.inputText, 'Vienna')
  assert.equal(saved.create.status, 'approved')
})

test('Transferz public vehicle categories map to Riderra classes by family and capacity', () => {
  assert.equal(externalVehicleMatches('transferz', 'sedan_3', 'Standard class car'), true)
  assert.equal(externalVehicleMatches('transferz', 'economy_sedan_2', 'Standard class car'), false)
  assert.equal(externalVehicleMatches('transferz', 'business_sedan_3', 'Business class car'), true)
  assert.equal(externalVehicleMatches('transferz', 'minivan_5', 'Standard minivan 5 pax'), true)
  assert.equal(externalVehicleMatches('transferz', 'minivan_5', 'Standard minivan 7 pax'), false)
  assert.equal(externalVehicleMatches('transferz', 'exclusive_minivan_5', 'Businessvan 5 pax'), true)
  assert.equal(externalVehicleMatches('transferz', 'minibus_9', 'Standard Minibus 9pax'), true)
})

test('SmartRyde policy deducts 30 percent from the client public price', () => {
  assert.equal(applyPricingPolicy(200, { type: 'client_commission', commissionPercent: 30 }), 140)
  assert.deepEqual(buildComparison({ riderraSellPrice: 100, clientSellPrice: 200, policy: { type: 'client_commission', commissionPercent: 30 } }), {
    targetPrice: 140,
    opportunityGapAbs: 40,
    opportunityGapPct: 28.57,
    status: 'opportunity'
  })
})

test('equality is not a green opportunity', () => {
  assert.equal(buildComparison({
    riderraSellPrice: 100,
    clientSellPrice: 142.857142857,
    policy: { type: 'client_commission', commissionPercent: 30 }
  }).status, 'not_opportunity')
})

test('sequential deductions remain available for future partner formulas', () => {
  assert.equal(applyPricingPolicy(100, { type: 'sequential_deductions', deductions: [25, 20] }), 60)
})

test('Booking deductions use the client public price and equality is not an opportunity', () => {
  const policy = { type: 'sequential_deductions', deductions: [25, 20], basis: 'client_sell' }
  assert.deepEqual(buildComparison({ riderraSellPrice: 59, clientSellPrice: 100, policy }), {
    targetPrice: 60,
    opportunityGapAbs: 1,
    opportunityGapPct: 1.67,
    status: 'opportunity'
  })
  assert.equal(buildComparison({ riderraSellPrice: 60, clientSellPrice: 100, policy }).status, 'not_opportunity')
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

test('comparison run scope limits collection to selected route pairs', () => {
  assert.deepEqual(comparisonRunScopeWhere(JSON.stringify({ routePairs: [
    { routeFrom: 'VIE', routeTo: 'Vienna' },
    { routeFrom: '', routeTo: 'ignored' }
  ] })), { OR: [{ routeFrom: 'VIE', routeTo: 'Vienna' }] })
  assert.deepEqual(comparisonRunScopeWhere(null), {})
})

test('resume treats compared and no-quote rows as final evidence', async () => {
  let receivedWhere
  const prisma = {
    priceComparisonQuote: {
      findFirst: async ({ where }) => {
        receivedWhere = where
        return { id: 'quote-1' }
      }
    }
  }
  const result = await hasFinalComparison(prisma, 'run-1', 'price-1')
  assert.equal(result.id, 'quote-1')
  assert.deepEqual(receivedWhere.status, { in: ['compared', 'no_quote'] })
})

test('resume does not repeat place search for a known ambiguous mapping', async () => {
  const existing = {
    id: 'mapping-1',
    status: 'needs_review',
    candidatesJson: JSON.stringify([{ id: 'candidate-1', label: 'Ambiguous place' }])
  }
  const prisma = {
    priceComparisonPlaceMap: {
      findUnique: async () => existing
    }
  }
  const adapter = {
    resolvePlace: async () => { throw new Error('should not be called') }
  }
  const result = await resolveStoredPlace({
    prisma,
    source: { id: 'source-1' },
    adapter,
    tenantId: 'tenant-1',
    inputText: 'Ambiguous place'
  })
  assert.equal(result.ok, false)
  assert.equal(result.externalRequest, false)
  assert.equal(result.candidates.length, 1)
})

test('place auto-approval rejects semantically wrong single results', () => {
  assert.equal(placeCandidateMatches('Baku', 'Kushok Bakula Rimpochee Airport'), false)
  assert.equal(placeCandidateMatches('Burgas', 'Burgas Airport (BOJ)'), false)
  assert.equal(placeCandidateMatches('GuangZhou city center', 'Guangzhou'), true)
  assert.equal(placeCandidateMatches('Hong Kong Airport (HKG)', 'Hong Kong International Airport (HKG)'), true)
  assert.equal(placeCandidateMatches('Hong Kong Airport (HKG)', 'Hong Kong International Airport'), true)
  assert.equal(placeCandidateMatches('Hilton Garden Inn London Heathrow', 'Hilton Garden Inn London Heathrow'), true)
  assert.equal(selectPlaceCandidate('Beijing city center', [
    { id: 'city', label: 'Beijing city center' },
    { id: 'hotel', label: 'Happy Dragon City Center Alley Hotel' }
  ]).id, 'city')
  assert.equal(selectPlaceCandidate('Toronto Airport (YYZ)', [
    { id: 't1', label: 'YYZ Terminal 1' },
    { id: 't3', label: 'YYZ Terminal 3' }
  ]), null)
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
  assert.equal(smartRydeVehicleMatches('standard_5_seat', 'Standard Minibus 16pax'), false)
  assert.equal(smartRydeVehicleMatches('standard_5_seat', 'Standard minivan 8 pax'), false)
  assert.equal(smartRydeVehicleMatches('standard_5_seat', 'Standard e-vehicle 3 pax'), false)
  assert.equal(smartRydeVehicleMatches('lengthened_5_seat', 'Business Class Car'), true)
  assert.equal(smartRydeVehicleMatches('standard_7_seat', 'MPV 6 pax'), true)
  assert.equal(smartRydeVehicleMatches('standard_7_seat', 'Standard minivan 6 pax'), true)
  assert.equal(smartRydeVehicleMatches('standard_7_seat', 'Standard minivan 8 pax'), false)
  assert.equal(smartRydeVehicleMatches('8_seat_bus', 'Standard 8 Seats'), true)
  assert.equal(smartRydeVehicleMatches('8_seat_bus', 'Businessvan 6 pax'), false)
  assert.equal(smartRydeVehicleMatches('10_seat_bus', 'Standard Minibus 9pax'), true)
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
