const test = require('node:test')
const assert = require('node:assert/strict')
const { catalogContentHash, normalizeCatalogMatrix, serializeCatalogRoute } = require('../../server/services/externalPriceCatalogService')

test('catalog matrix stores currencies and vehicle classes compactly', () => {
  const matrix = normalizeCatalogMatrix([{ currency: 'EUR', quotes: [{ externalVehicleKey: 'sedan_3', externalVehicleName: 'Sedan 3', maxPassengers: 3, price: 40, baseCurrency: 'EUR', basePrice: 40 }] }, { currency: 'USD', quotes: [{ externalVehicleKey: 'sedan_3', externalVehicleName: 'Sedan 3', maxPassengers: 3, price: 47.38, baseCurrency: 'EUR', basePrice: 40 }] }])
  assert.equal(matrix.length, 2)
  assert.equal(matrix[1].currency, 'USD')
  assert.equal(catalogContentHash(matrix), catalogContentHash([...matrix]))
  const route = serializeCatalogRoute({ id: 'r1', routeKey: 'key', routeFrom: 'A', routeTo: 'B', sourceUrl: 'https://example.test', serviceAt: new Date(), passengers: 1, status: 'quoted', quotedAt: new Date(), updatedAt: new Date(), error: null, priceMatrixJson: JSON.stringify(matrix) }, ['EUR'])
  assert.equal(route.prices.length, 1)
  assert.equal(route.prices[0].currency, 'EUR')
})
