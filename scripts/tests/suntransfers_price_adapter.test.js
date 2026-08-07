const test = require('node:test')
const assert = require('node:assert/strict')

const {
  candidateMatches,
  decodeDestination,
  decodeGateway,
  encodeDestination,
  encodeGateway,
  parseSuntransfersQuotes
} = require('../../server/services/suntransfersPriceAdapter')

test('Suntransfers public vehicle cards are parsed without selecting a vehicle', () => {
  const html = `
    <section class="o-result js-vehicles">
      <div class="o-media c-media qa-vehicles__vehicle vehicle-standard vehicle-tx4" id="vehicle_list_item_0">
        <span class="m-product-list__title">Private Transfer</span>
        <p>Up to 4 passengers</p>
        <a data-code="tx4" data-base-price="86.4507">Select this vehicle</a>
      </div>
      <div class="o-media c-media qa-vehicles__vehicle vehicle-standard vehicle-mv6" id="vehicle_list_item_1">
        <span class="m-product-list__title">Private Minivan</span>
        <p>Up to 6 passengers</p>
        <a data-code="mv6" data-base-price="120.1434">Select this vehicle</a>
      </div>
    </section>`
  assert.deepEqual(parseSuntransfersQuotes(html), [
    { externalVehicleKey: 'tx4', externalVehicleName: 'Private Transfer', maxPassengers: 4, price: 86.45, currency: 'EUR', vehicleCode: 'tx4' },
    { externalVehicleKey: 'mv6', externalVehicleName: 'Private Minivan', maxPassengers: 6, price: 120.14, currency: 'EUR', vehicleCode: 'mv6' }
  ])
})

test('Suntransfers place identifiers preserve public form codes', () => {
  const gateway = { id: 13, alternateId: '10569', iataCode: 'ALC' }
  const destination = { id: 41, code: 10004 }
  assert.deepEqual(decodeGateway(encodeGateway(gateway)), { id: 13, code: '10569', iataCode: 'ALC' })
  assert.deepEqual(decodeDestination(encodeDestination(13, destination)), { gatewayId: 13, id: 41, code: '10004' })
})

test('Suntransfers gateway selection uses exact IATA and destination names', () => {
  assert.equal(candidateMatches('Alicante International Airport (ALC)', { name: 'Alicante airport', iataCode: 'ALC' }), true)
  assert.equal(candidateMatches('Benidorm', { name: 'Benidorm' }), true)
  assert.equal(candidateMatches('Benidorm', { name: 'Calpe' }), false)
})
