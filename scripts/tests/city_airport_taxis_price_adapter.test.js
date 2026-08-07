const test = require('node:test')
const assert = require('node:assert/strict')
const {
  CityAirportTaxisAdapter,
  parseCityAirportTaxisQuotes,
  parseSitemapRoutes,
  routeCandidateMatches,
  serviceDateParts
} = require('../../server/services/cityAirportTaxisPriceAdapter')

const routeHtml = `
<script>var currency = {"EUR":{"USD":1.15}};</script>
<input type="text" id="select_loc1" value="Athens Airport - Greece"><input type="hidden" id="loc1" value="1407">
<input type="text" value="Athens City Centre - Greece" id="select_loc2"><input type="hidden" id="loc2" value="1390">
<div class="vehicle_select selection-box__tile">
  <h2 class="vehicle--name">Sedan Car 3pax</h2><span class="vehicle--class">Standard Service</span>
  passengers <span class="car-more--value"> 3 </span>
  <span class="total-price biggest-text">EUR  40</span>
</div>`

test('parses public sitemap route pages without booking URLs', () => {
  const rows = parseSitemapRoutes(`<?xml version="1.0"?><urlset>
    <url><loc>https://city-airport-taxis.com/airporttransfers/reservations/taxi-from-Athens-Airport-to-Athens-City-Centre</loc></url>
    <url><loc>https://city-airport-taxis.com/contact</loc></url>
  </urlset>`)
  assert.equal(rows.length, 1)
  assert.equal(rows[0].pickupLabel, 'Athens Airport')
  assert.equal(rows[0].dropoffLabel, 'Athens City Centre')
  assert.ok(!rows[0].sourceUrl.includes('booking'))
})

test('matches Riderra airport and city labels conservatively', () => {
  assert.equal(routeCandidateMatches('Athens International Airport (ATH)', 'Athens Airport'), true)
  assert.equal(routeCandidateMatches('Vienna Schwechat Airport (VIE)', 'Vienna Airport'), true)
  assert.equal(routeCandidateMatches('Yerevan Zvartnots Airport (EVN)', 'Zvartnots Airport'), true)
  assert.equal(routeCandidateMatches('Athens', 'Athens City Centre'), true)
  assert.equal(routeCandidateMatches('Vienna', 'Athens City Centre'), false)
})

test('parses vehicle prices and reproduces the public currency conversion', () => {
  const eur = parseCityAirportTaxisQuotes(routeHtml, 'EUR')
  const usd = parseCityAirportTaxisQuotes(routeHtml, 'USD')
  assert.deepEqual(eur[0], {
    externalVehicleKey: 'sedan_car_3pax',
    externalVehicleName: 'Sedan Car 3pax — Standard Service',
    maxPassengers: 3,
    price: 40,
    baseCurrency: 'EUR',
    basePrice: 40
  })
  assert.equal(usd[0].price, 47.38)
})

test('formats the comparison service date for the public quote form', () => {
  assert.deepEqual(serviceDateParts(new Date('2026-08-19T12:00:00.000Z')), { date: '19/08/2026', time: '12:00' })
})

test('fetches a quote with exact public parameters and never posts a booking', async () => {
  const calls = []
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url: String(url), method: options.method || 'GET' })
    if (String(url).endsWith('/sitemap.xml')) return { ok: true, text: async () => '<sitemapindex><loc>https://city-airport-taxis.com/sitemap1.xml</loc></sitemapindex>' }
    if (String(url).endsWith('/sitemap1.xml')) return { ok: true, text: async () => '<urlset><loc>https://city-airport-taxis.com/airporttransfers/reservations/taxi-from-Athens-Airport-to-Athens-City-Centre</loc></urlset>' }
    return { ok: true, url: String(url), text: async () => routeHtml }
  }
  const adapter = new CityAirportTaxisAdapter({}, { fetchImpl })
  const pickup = (await adapter.resolvePlace('Athens International Airport (ATH)'))[0]
  const dropoff = (await adapter.resolvePlace('Athens', pickup.id))[0]
  const result = await adapter.fetchQuotes({ pickup, dropoff, serviceAt: new Date('2026-08-19T12:00:00.000Z'), currency: 'EUR', passengers: { adults: 1 } })
  assert.equal(result.quotes[0].price, 40)
  assert.equal(result.evidence.bookingCreated, false)
  assert.equal(calls.every((call) => call.method === 'GET'), true)
  assert.match(calls.at(-1).url, /date1=19%2F08%2F2026/)
  assert.match(calls.at(-1).url, /time1=12%3A00/)
  assert.match(calls.at(-1).url, /pax1=1/)
})

test('classifies a stale sitemap redirect as unlisted coverage', async () => {
  const fetchImpl = async (url) => {
    if (String(url).endsWith('/sitemap.xml')) return { ok: true, url: String(url), text: async () => '<sitemapindex><loc>https://city-airport-taxis.com/sitemap1.xml</loc></sitemapindex>' }
    if (String(url).endsWith('/sitemap1.xml')) return { ok: true, url: String(url), text: async () => '<urlset><loc>https://city-airport-taxis.com/airporttransfers/reservations/taxi-from-Osaka-Airport-to-Osaka</loc></urlset>' }
    return { ok: true, url: 'https://city-airport-taxis.com/', text: async () => '<html></html>' }
  }
  const adapter = new CityAirportTaxisAdapter({}, { fetchImpl })
  const pickup = (await adapter.resolvePlace('Osaka Itami Airport (ITM)'))[0]
  const dropoff = (await adapter.resolvePlace('Osaka', pickup.id))[0]
  await assert.rejects(
    adapter.fetchQuotes({ pickup, dropoff, serviceAt: new Date('2026-08-19T12:00:00.000Z'), currency: 'EUR', passengers: { adults: 1 } }),
    (error) => error.code === 'CATALOG_ROUTE_NOT_LISTED'
  )
})
