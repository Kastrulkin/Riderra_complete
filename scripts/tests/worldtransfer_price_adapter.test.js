const assert = require('node:assert/strict')
const test = require('node:test')

const {
  WorldTransferAdapter,
  candidateMatches,
  decodePlace,
  encodePlace,
  parseWorldTransferQuotes,
  serviceDate,
  vehicleKey
} = require('../../server/services/worldTransferPriceAdapter')
const { externalVehicleMatches } = require('../../server/services/priceComparisonService')

const PRODUCTS_HTML = `
  <div>Activated voucher code <p>DISCOUNT <span class="price">-15 %</span></p></div>
  <div class="post">
    <div class="features"><p><i class="fa fa-user"></i> x3</p><p><i class="fa fa-suitcase"></i> x3</p></div>
    <p class="oldprice">48.92 <sub>&euro;</sub></p>
    <p class="price newprice">41.58 <sub>&euro;</sub></p>
    <input onclick="addToCart(41.58, 'Premium Economy Class Sedan');do_redirect('step_data');">
  </div>
  <div class="post ">
    <div class="features"><p><i class="fa fa-user"></i> x7</p><p><i class="fa fa-suitcase"></i> x5</p></div>
    <p class="oldprice">151.40 <sub>&euro;</sub></p>
    <p class="price newprice">128.69 <sub>&euro;</sub></p>
    <input onclick="addToCart(128.69, 'Business Class Van');do_redirect('step_data');">
  </div>`

test('parses current public sell prices and keeps undiscounted evidence', () => {
  assert.deepEqual(parseWorldTransferQuotes(PRODUCTS_HTML), [
    {
      externalVehicleKey: 'standard_car',
      externalVehicleName: 'Premium Economy Class Sedan',
      maxPassengers: 3,
      maxLuggage: 3,
      price: 41.58,
      currency: 'EUR',
      undiscountedPrice: 48.92
    },
    {
      externalVehicleKey: 'businessvan_7',
      externalVehicleName: 'Business Class Van',
      maxPassengers: 7,
      maxLuggage: 5,
      price: 128.69,
      currency: 'EUR',
      undiscountedPrice: 151.4
    }
  ])
})

test('normalizes places, dates and vehicle classes', () => {
  const encoded = encodePlace('Airport Helsinki-Vantaa (HEL) 1531 Vantaa', 'airport')
  assert.deepEqual(decodePlace(encoded), { label: 'Airport Helsinki-Vantaa (HEL) 1531 Vantaa', type: 'airport' })
  assert.equal(candidateMatches('Helsinki-Vantaa Airport (HEL)', 'Airport Helsinki-Vantaa (HEL) 1531 Vantaa'), true)
  assert.equal(serviceDate('2026-08-19T09:00:00.000Z'), '19.08.2026')
  assert.equal(vehicleKey('Business Class Limousine', 3), 'business_car')
  assert.equal(vehicleKey('Premium Economy Class Van', 7), 'standard_minivan_7')
})

test('maps WorldTransfer classes to Riderra only when class and capacity match', () => {
  assert.equal(externalVehicleMatches('worldtransfer', 'standard_car', 'Standard class car'), true)
  assert.equal(externalVehicleMatches('worldtransfer', 'standard_minivan_7', 'Standard minivan 7 pax'), true)
  assert.equal(externalVehicleMatches('worldtransfer', 'standard_minivan_7', 'Standard minivan 6 pax'), false)
  assert.equal(externalVehicleMatches('worldtransfer', 'businessvan_7', 'Businessvan 7 pax'), true)
  assert.equal(externalVehicleMatches('worldtransfer', 'business_car', 'Standard class car'), false)
})

test('public quote flow stops at products and never posts passenger or payment data', async () => {
  const requests = []
  const responses = [
    new Response(`<input name="handle_abc123" value="handler"><input name="gtb_post_handler_transfer_start" value="token">`, { headers: { 'set-cookie': 'PHPSESSID=session; Path=/' } }),
    new Response('<transfercode><transferstatus>1</transferstatus><calcstatus>1</calcstatus></transfercode>'),
    new Response('&start_search=A&ziel_search=B&_gt=quote-token'),
    new Response(PRODUCTS_HTML)
  ]
  const adapter = new WorldTransferAdapter({ requestDelayMs: 0 }, {
    fetchImpl: async (url, options) => {
      requests.push({ url: String(url), options })
      return responses.shift()
    }
  })
  const result = await adapter.fetchQuotes({
    pickup: { id: encodePlace('Airport Helsinki-Vantaa (HEL) 1531 Vantaa', 'airport'), label: 'HEL' },
    dropoff: { id: encodePlace('Peltolantie 7 01300 Vantaa/Viertola'), label: 'Vantaa' },
    serviceAt: '2026-08-19T09:00:00.000Z',
    currency: 'EUR',
    passengers: { adults: 1, children: 0 }
  })
  assert.equal(result.quotes.length, 2)
  assert.equal(result.evidence.bookingCreated, false)
  assert.equal(result.evidence.displayedDiscountPercent, 15)
  assert.equal(requests.length, 4)
  assert.match(requests[3].url, /ibe_rubrik2014=step_products/)
  assert.equal(requests.some((row) => /step_data|step_customer|payment/i.test(row.url)), false)
  assert.match(String(requests[1].options.headers.Cookie), /PHPSESSID=session/)
})
