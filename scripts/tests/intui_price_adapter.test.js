const test = require('node:test')
const assert = require('node:assert/strict')

const {
  IntuiAdapter,
  candidateMatches,
  decodePlace,
  normalizeQuotes,
  serviceDateTime
} = require('../../server/services/intuiPriceAdapter')
const { externalVehicleMatches } = require('../../server/services/priceComparisonService')

const HEL = {
  docId: 1295872,
  id: '439',
  type: 'Airport',
  iata: 'HEL',
  country: 'Finland',
  lat: 60.317769,
  lng: 24.929009,
  names: { en: 'Helsinki Vantaa Airport (HEL), Finland' }
}

const CENTER = {
  docId: 297043,
  id: '100224',
  type: 'Geo',
  iata: '',
  country: 'Finland',
  lat: 60.169856,
  lng: 24.938379,
  names: { en: 'Helsinki City Centre' }
}

test('Intui matches exact airport IATA and rejects an unrelated location', () => {
  assert.equal(candidateMatches('Helsinki Airport (HEL)', HEL), true)
  assert.equal(candidateMatches('Helsinki Airport (HEL)', { ...CENTER, country: 'Estonia', names: { en: 'Tallinn' } }), false)
})

test('Intui keeps the lowest public offer per comparable vehicle class', () => {
  const quotes = normalizeQuotes([
    { offerId: '1', name: 'Toyota Corolla Sedan 1-3 passengers', type: 'Private transfer, Standard', price: 70, currency: 'EUR' },
    { offerId: '2', name: 'Kia Rio Sedan 1-3 passengers', type: 'Private transfer, Economy class', price: 47.36, currency: 'EUR' },
    { offerId: '3', name: 'Mercedes-Benz E-Class Sedan 1-3 passengers', type: 'Private transfer, Business', price: 121.06, currency: 'EUR' },
    { offerId: '4', name: 'Volkswagen Caddy Minivan 1-6 passengers', type: 'Private transfer, Standard', price: 78.98, currency: 'EUR' }
  ])
  assert.deepEqual(quotes.map((row) => [row.externalVehicleKey, row.price]), [
    ['standard_car', 47.36],
    ['business_car', 121.06],
    ['standard_minivan_6', 78.98]
  ])
})

test('Intui uses public place lookup and browser-rendered offer page without booking', async () => {
  const calls = []
  const urls = []
  const adapter = new IntuiAdapter({}, {
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), options })
      return { ok: true, json: async () => ({ code: 200, data: [String(options.body).includes('City Centre') ? CENTER : HEL] }) }
    },
    browserQuoteProvider: {
      getOffers: async (url) => {
        urls.push(url)
        return [{ offerId: '1', name: 'Toyota Corolla Sedan 1-3 passengers', type: 'Private transfer, Standard', price: 47.36, currency: 'EUR' }]
      }
    }
  })
  const pickup = (await adapter.resolvePlace('Helsinki Airport (HEL)', null, { country: 'Finland' }))[0]
  const dropoff = (await adapter.resolvePlace('Helsinki City Centre', pickup.id, { country: 'Finland' }))[0]
  assert.ok(decodePlace(pickup.id))
  const result = await adapter.fetchQuotes({ pickup, dropoff, serviceAt: new Date('2026-08-19T12:00:00Z'), currency: 'EUR', passengers: { adults: 1 } })
  assert.equal(result.quotes[0].price, 47.36)
  assert.equal(result.evidence.bookingCreated, false)
  assert.equal(calls.every((call) => call.url === 'https://find.intui.travel/api:find'), true)
  assert.match(Buffer.from(urls[0].match(/getoffers\/([^/]+)/)[1], 'base64').toString('utf8'), /^1295872;297043;1;0;0;2026-08-19 12:00:00$/)
  assert.equal(/transfer\/p_|book|payment|contact/i.test(new URL(urls[0]).pathname), false)
})

test('Intui classes map only to comparable Riderra classes', () => {
  assert.equal(externalVehicleMatches('intui', 'standard_car', 'Standard Sedan 3 pax'), true)
  assert.equal(externalVehicleMatches('intui', 'business_car', 'Business Sedan 3 pax'), true)
  assert.equal(externalVehicleMatches('intui', 'standard_minivan_6', 'Standard Minivan 6 pax'), true)
  assert.equal(externalVehicleMatches('intui', 'business_car', 'Standard Sedan 3 pax'), false)
})

test('Intui uses stable service date format and records empty offers as no quote', async () => {
  assert.equal(serviceDateTime(new Date('2026-08-19T12:00:00Z')), '2026-08-19 12:00:00')
  const adapter = new IntuiAdapter({}, { browserQuoteProvider: { getOffers: async () => [] } })
  const pickup = `intui:${Buffer.from(JSON.stringify({ docId: 1, name: 'A' })).toString('base64url')}`
  const dropoff = `intui:${Buffer.from(JSON.stringify({ docId: 2, name: 'B' })).toString('base64url')}`
  await assert.rejects(() => adapter.fetchQuotes({ pickup: { id: pickup, label: 'A' }, dropoff: { id: dropoff, label: 'B' }, serviceAt: new Date(), currency: 'EUR' }), (error) => error.code === 'NO_QUOTES')
})
