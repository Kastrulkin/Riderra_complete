const test = require('node:test')
const assert = require('node:assert/strict')
const {
  AirportsTaxiTransfersAdapter,
  candidateIsPlausible,
  candidateScore,
  decodePlace,
  encodePlace,
  parseQuotes,
  serviceDateParts,
  slugPart
} = require('../../server/services/airportsTaxiTransfersPriceAdapter')

const locations = {
  all: {
    server: [
      { id: 165, value: 'Barcelona Airport (BCN) - Spain', type_id: 2, type_name: 'Airport', lat: 41.297445, lng: 2.0832941 },
      { id: 5013, value: 'Barcelona City Centre - Spain', type_id: 1, type_name: 'Popular Locations', lat: 41.3896427, lng: 2.1624599 }
    ],
    google: []
  }
}

const quoteHtml = `
<div class="vehicle_select selection-box__tile">
  <h2 class="vehicle--name">Sedan Car 3pax</h2>
  <span class="vehicle--class">Standard Service</span>
  passengers <span class="car-more--value"> 3 </span>
  <p class="total-price change-price text-right" data-price="35.51" data-service="0">EUR  35.51</p>
</div>
<div class="vehicle_select selection-box__tile">
  <h2 class="vehicle--name">Premium Minivan 7pax</h2>
  <span class="vehicle--class">Premium Service</span>
  passengers <span class="car-more--value"> 7 </span>
  <p class="total-price change-price text-right" data-price="72.4" data-service="3">EUR 72.40</p>
</div>`

test('encodes public place identifiers without losing evidence', () => {
  const encoded = encodePlace(locations.all.server[0])
  const decoded = decodePlace(encoded)
  assert.equal(decoded.id, '165')
  assert.equal(decoded.label, 'Barcelona Airport (BCN) - Spain')
  assert.equal(decoded.latitude, 41.297445)
})

test('ranks airport IATA and city-centre candidates conservatively', () => {
  assert.ok(candidateScore('Barcelona El Prat Airport (BCN)', 'Barcelona Airport (BCN) - Spain') >= 90)
  assert.ok(candidateScore('Barcelona', 'Barcelona City Centre - Spain') > candidateScore('Barcelona', 'Barcelona Airport (BCN) - Spain'))
  assert.ok(candidateScore('Vienna', 'Barcelona City Centre - Spain') < 45)
})

test('rejects a business or transport terminal when Riderra requested a geographic zone', () => {
  assert.equal(candidateIsPlausible('Shahdag (Quba, Qusar)', 'Shahdag Restaurant, Qusar, Quba, Azerbaijan'), false)
  assert.equal(candidateIsPlausible('Rovaniemi City', 'Scandic Rovaniemi City'), false)
  assert.equal(candidateIsPlausible('Tufandag (Gabala)', 'Gabala Cable Car Tufandag Resort Station, Azerbaijan'), false)
  assert.equal(candidateIsPlausible('Shanghai city center', 'Shanghai City Centre - China'), true)
  assert.equal(candidateIsPlausible('Vienna Schwechat Airport (VIE)', 'Vienna International Airport (VIE), Austria'), true)
  assert.equal(candidateIsPlausible('Vienna Schwechat Airport (VIE)', 'Vienna Airport Hotel, Austria'), false)
})

test('parses public vehicle classes, capacities and displayed prices', () => {
  assert.deepEqual(parseQuotes(quoteHtml), [
    {
      externalVehicleKey: 'sedan_car_3pax',
      externalVehicleName: 'Sedan Car 3pax — Standard Service',
      maxPassengers: 3,
      price: 35.51,
      currency: 'EUR'
    },
    {
      externalVehicleKey: 'premium_minivan_7pax',
      externalVehicleName: 'Premium Minivan 7pax — Premium Service',
      maxPassengers: 7,
      price: 72.4,
      currency: 'EUR'
    }
  ])
})

test('formats public search date and route slug', () => {
  assert.deepEqual(serviceDateParts(new Date('2026-08-19T12:00:00.000Z')), { date: '19/08/2026', time: '12:00' })
  assert.equal(slugPart('Barcelona Airport (BCN) - Spain'), 'Barcelona-Airport')
})

test('fetches public prices only and never submits a booking', async () => {
  const calls = []
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url: String(url), method: options.method || 'GET' })
    if (String(url).includes('search=1')) return { ok: true, json: async () => locations }
    return { ok: true, url: String(url), text: async () => quoteHtml }
  }
  const adapter = new AirportsTaxiTransfersAdapter({ requestDelayMs: 0 }, { fetchImpl })
  const pickup = (await adapter.resolvePlace('Barcelona El Prat Airport (BCN)', null, { country: 'Spain' }))[0]
  const dropoff = (await adapter.resolvePlace('Barcelona', pickup.id, { country: 'Spain' }))[0]
  const result = await adapter.fetchQuotes({
    pickup,
    dropoff,
    serviceAt: new Date('2026-08-19T12:00:00.000Z'),
    currency: 'EUR',
    passengers: { adults: 1 }
  })
  assert.equal(result.quotes.length, 2)
  assert.equal(result.evidence.bookingCreated, false)
  assert.equal(calls.every((call) => call.method === 'GET'), true)
  assert.match(calls.at(-1).url, /loc1=165/)
  assert.match(calls.at(-1).url, /loc2=5013/)
  assert.match(calls.at(-1).url, /quote=1/)
})

test('classifies an empty public result as no coverage', async () => {
  const adapter = new AirportsTaxiTransfersAdapter({ requestDelayMs: 0 }, {
    fetchImpl: async () => ({ ok: true, url: 'https://airportstaxitransfers.com/transportation/taxibookings/', text: async () => '<html></html>' })
  })
  const pickup = { id: encodePlace(locations.all.server[0]), label: locations.all.server[0].value }
  const dropoff = { id: encodePlace(locations.all.server[1]), label: locations.all.server[1].value }
  await assert.rejects(
    adapter.fetchQuotes({ pickup, dropoff, serviceAt: new Date('2026-08-19T12:00:00.000Z'), currency: 'EUR' }),
    (error) => error.code === 'NO_QUOTES'
  )
})
