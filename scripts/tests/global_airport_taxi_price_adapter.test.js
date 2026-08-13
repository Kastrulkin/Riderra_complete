const test = require('node:test')
const assert = require('node:assert/strict')
const {
  candidateMatches,
  parseGlobalAirportTaxiQuotes,
  serviceDate,
  vehicleKey
} = require('../../server/services/globalAirportTaxiPriceAdapter')
const { externalVehicleMatches } = require('../../server/services/priceComparisonService')

const HTML = `
<div class="pjTbs-car pjTbs-box">
  <div class="pjTbs-car-title">Saloon</div>
  <meta itemprop="price" content="86.67" />
  <meta itemprop="priceCurrency" content="GBP" />
</div>
<div class="pjTbs-car pjTbs-box">
  <div class="pjTbs-car-title">Executive MPV</div>
  <meta itemprop="price" content="157.08" />
  <meta itemprop="priceCurrency" content="GBP" />
</div>`

test('Global Airport Taxi result cards preserve public prices', () => {
  const quotes = parseGlobalAirportTaxiQuotes(HTML)
  assert.deepEqual(quotes.map((row) => [row.externalVehicleKey, row.price, row.currency]), [
    ['standard_car', 86.67, 'GBP'],
    ['businessvan_7', 157.08, 'GBP']
  ])
  assert.equal(vehicleKey('MPV', 6), 'standard_minivan_6')
})

test('Global Airport Taxi matching recognizes IATA and exact city text', () => {
  assert.equal(candidateMatches('London Heathrow Airport (LHR)', { address: '(LHR) London Heathrow Airport Terminal 2,TW6 1EW' }), true)
  assert.equal(candidateMatches('Baku city center', { address: 'Baku City Center, Azerbaijan' }), true)
  assert.equal(serviceDate('2026-08-19T12:00:00.000Z'), '19-08-2026')
})

test('Global Airport Taxi vehicle classes map to Riderra', () => {
  assert.equal(externalVehicleMatches('global-airport-taxi', 'standard_car', 'Standard class car'), true)
  assert.equal(externalVehicleMatches('global-airport-taxi', 'businessvan_7', 'Businessvan 7 pax'), true)
})
