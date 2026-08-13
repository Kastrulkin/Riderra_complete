const test = require('node:test')
const assert = require('node:assert/strict')
const { parseTransferiseQuotes, vehicleKey } = require('../../server/services/transferisePriceAdapter')
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
