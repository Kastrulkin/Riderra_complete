const test = require('node:test')
const assert = require('node:assert/strict')
const { TransferiseAdapter, parseTransferiseQuotes, vehicleKey } = require('../../server/services/transferisePriceAdapter')
const { externalVehicleMatches } = require('../../server/services/priceComparisonService')

test('Transferise public vehicle payload is parsed from search results', () => {
  const html = `<div class="trs21-car" data-vehicle='{&quot;name&quot;:&quot;Standard Sedan&quot;,&quot;price_raw&quot;:35,&quot;currency&quot;:&quot;EUR&quot;,&quot;cap_total&quot;:3,&quot;cap_bags&quot;:2}'></div>`
  const quotes = parseTransferiseQuotes(html)
  assert.deepEqual(quotes[0], {
    externalVehicleKey: 'standard_car',
    externalVehicleName: 'Standard Sedan',
    maxPassengers: 3,
    maxLuggage: 2,
    price: 35,
    currency: 'EUR'
  })
  assert.equal(vehicleKey('VIP Mercedes Vito', 5), 'businessvan_5')
})

test('Transferise vehicle classes map to Riderra', () => {
  assert.equal(externalVehicleMatches('transferise', 'standard_car', 'Standard class car'), true)
  assert.equal(externalVehicleMatches('transferise', 'businessvan_5', 'Businessvan 5 pax'), true)
})

test('Transferise resolves an airport through its public geocoder before pricing', async () => {
  const requests = []
  const adapter = new TransferiseAdapter({ requestDelayMs: 0 }, {
    fetchImpl: async (url, options = {}) => {
      requests.push({ url: String(url), options })
      if (String(url) === 'https://transferise.com/') return new Response('<script src="/wp-content/litespeed/js/app.js"></script>')
      if (String(url).endsWith('/wp-content/litespeed/js/app.js')) return new Response('var ATData={"ajax_url":"https:\\/\\/transferise.com\\/wp-admin\\/admin-ajax.php","nonce":"abc123"};')
      return new Response(JSON.stringify({ success: true, data: { results: [{ label: 'Antalya Airport (AYT)', lat: 36.904369, lng: 30.800427, type: 'local_region' }] } }), { headers: { 'Content-Type': 'application/json' } })
    }
  })
  const places = await adapter.resolvePlace('Antalya Airport (AYT)')
  assert.equal(places.length, 1)
  assert.equal(places[0].label, 'Antalya Airport (AYT)')
  assert.match(requests[2].options.body.toString(), /action=at_osm_geocode/)
})
