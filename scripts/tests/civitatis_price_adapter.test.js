const test = require('node:test')
const assert = require('node:assert/strict')

const {
  CivitatisAdapter,
  candidateMatches,
  parseCivitatisCatalogPages,
  parseCivitatisTransferPage,
  parseMoney
} = require('../../server/services/civitatisPriceAdapter')

const ROOT_FIXTURE = `
  <a href="/en/united-kingdom/transfers/" class="a-title--destination-country" title="United Kingdom">United Kingdom</a>
  <a href="/en/london/transfers/" class="a-link--destination" title="London">London</a>
  <a href="/en/edinburgh/transfers/" class="a-link--destination" title="Edinburgh">Edinburgh</a>
  <a href="/en/france/transfers/" class="a-title--destination-country" title="France">France</a>
  <a href="/en/paris/transfers/" class="a-link--destination" title="Paris">Paris</a>
`

const LONDON_FIXTURE = `
  <span id="currencySelectorButton" data-value="EUR">Euro</span>
  <select id="departure">
    <option value="37" class="tipo-1">Heathrow Airport (LHR)</option>
    <option value="38" class="tipo-5">Downtown London</option>
  </select>
  <table><tr>
    <td class="a-airport-transfer"><span>Heathrow Airport</span></td>
    <td class="a-city-transfer"><span>Centre of London</span></td>
    <td class="a-text--price-transfer__wrapper"><span class="a-text--price-transfer"><span>€</span> 91.25</span></td>
  </tr></table>
`

test('Civitatis catalog parser preserves city and country context', () => {
  assert.deepEqual(parseCivitatisCatalogPages(ROOT_FIXTURE), [
    { sourceUrl: 'https://www.civitatis.com/en/london/transfers/', city: 'London', country: 'United Kingdom' },
    { sourceUrl: 'https://www.civitatis.com/en/edinburgh/transfers/', city: 'Edinburgh', country: 'United Kingdom' },
    { sourceUrl: 'https://www.civitatis.com/en/paris/transfers/', city: 'Paris', country: 'France' }
  ])
})

test('Civitatis transfer parser extracts public airport-to-city price evidence', () => {
  const rows = parseCivitatisTransferPage(LONDON_FIXTURE, {
    sourceUrl: 'https://www.civitatis.com/en/london/transfers/',
    city: 'London',
    country: 'United Kingdom'
  })
  assert.equal(rows.length, 1)
  const normalized = { ...rows[0], pickupPlaceId: '<id>', dropoffPlaceId: '<id>' }
  assert.deepEqual(normalized, {
    routeFrom: 'Heathrow Airport',
    routeTo: 'Centre of London',
    pickupPlaceId: '<id>',
    pickupLabel: 'Heathrow Airport (LHR)',
    dropoffPlaceId: '<id>',
    dropoffLabel: 'Downtown London',
    currency: 'EUR',
    externalVehicleKey: 'private_vehicle_base',
    externalVehicleName: 'Private vehicle — published base price',
    maxPassengers: null,
    price: 91.25,
    sourceUrl: 'https://www.civitatis.com/en/london/transfers/',
    evidence: {
      sourceUrl: 'https://www.civitatis.com/en/london/transfers/',
      country: 'United Kingdom',
      city: 'London',
      disclosure: 'Total price per vehicle',
      capacityDisclosed: false,
      direction: 'published_airport_to_city'
    }
  })
  assert.match(rows[0].pickupPlaceId, /^civitatis:[a-f0-9]{20}$/)
  assert.match(rows[0].dropoffPlaceId, /^civitatis:[a-f0-9]{20}$/)
})

test('Civitatis repeated regional tables share catalog-wide place identities', () => {
  const first = parseCivitatisTransferPage(LONDON_FIXTURE, {
    sourceUrl: 'https://www.civitatis.com/en/london/transfers/',
    city: 'London',
    country: 'United Kingdom'
  })
  const repeated = parseCivitatisTransferPage(LONDON_FIXTURE, {
    sourceUrl: 'https://www.civitatis.com/en/windsor/transfers/',
    city: 'Windsor',
    country: 'United Kingdom'
  })

  assert.equal(first[0].pickupPlaceId, repeated[0].pickupPlaceId)
  assert.equal(first[0].dropoffPlaceId, repeated[0].dropoffPlaceId)
})

test('Civitatis money parser handles comma and dot decimal formats', () => {
  assert.equal(parseMoney('€ 1.234,56'), 1234.56)
  assert.equal(parseMoney('US$ 1,234.56'), 1234.56)
})

test('Civitatis place matching does not confuse a port with a same-city airport', () => {
  assert.equal(candidateMatches('Port of Los Angeles', 'Los Angeles International Airport'), false)
  assert.equal(candidateMatches('Copenhagen Cruise Port', 'Port of Copenhagen'), true)
})

test('Civitatis adapter resolves a unique catalog location using Riderra label', async () => {
  const adapter = new CivitatisAdapter()
  adapter.loadCatalogSnapshots([{
    pickupPlaceId: 'civitatis:37',
    pickupLabel: 'Heathrow Airport (LHR)',
    dropoffPlaceId: 'civitatis:38',
    dropoffLabel: 'Downtown London',
    currency: 'EUR',
    externalVehicleKey: 'private_vehicle_base',
    externalVehicleName: 'Private vehicle — published base price',
    maxPassengers: null,
    publicSellPrice: 91.25,
    sourceUrl: 'https://www.civitatis.com/en/london/transfers/',
    evidenceJson: '{}'
  }])
  assert.deepEqual(await adapter.resolvePlace('London Heathrow Airport (LHR)'), [{
    id: 'civitatis:37',
    label: 'London Heathrow Airport (LHR)',
    description: 'Heathrow Airport (LHR)'
  }])
  assert.deepEqual(await adapter.resolvePlace('London', 'civitatis:37'), [{
    id: 'civitatis:38',
    label: 'London',
    description: 'Downtown London'
  }])
})

test('Civitatis adapter does not mix pickup and drop-off roles during place resolution', async () => {
  const adapter = new CivitatisAdapter()
  adapter.loadCatalogSnapshots([{
    pickupPlaceId: 'civitatis:airport',
    pickupLabel: 'Larnaca Airport (LCA)',
    dropoffPlaceId: 'civitatis:city',
    dropoffLabel: 'Larnaca',
    currency: 'EUR',
    externalVehicleKey: 'private_vehicle_base',
    externalVehicleName: 'Private vehicle',
    publicSellPrice: 20,
    evidenceJson: '{}'
  }])

  assert.deepEqual((await adapter.resolvePlace('Larnaca Airport (LCA)')).map((row) => row.id), ['civitatis:airport'])
  assert.deepEqual((await adapter.resolvePlace('Larnaca', 'civitatis:airport')).map((row) => row.id), ['civitatis:city'])
})
