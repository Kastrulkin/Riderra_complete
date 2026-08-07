const test = require('node:test')
const assert = require('node:assert/strict')

const {
  TalixoAdapter,
  decodePlace,
  encodePlace,
  parseTalixoQuotes
} = require('../../server/services/talixoPriceAdapter')

const berlinAirport = {
  placeId: 'place-ber',
  formattedAddress: 'Melli-Beese-Ring 1, 12529 Schönefeld, Germany',
  latitude: 52.3649645,
  longitude: 13.5010472,
  types: ['airport'],
  iataCode: 'BER'
}

const adlon = {
  placeId: 'place-adlon',
  formattedAddress: 'Unter den Linden 77, 10117 Berlin, Germany',
  latitude: 52.516264,
  longitude: 13.38068,
  types: ['lodging'],
  iataCode: null
}

const quoteHtml = `
<div class="booking-class booking-class-vehicles economy_van" data-booking-class="economy_van">
  <div class="booking-class-vehicle clearfix">
    <h3 class="booking-class-header">Economy VAN</h3>
    <li class="booking-class-description-vehicle vehicle economy_van">Mercedes Vito</li>
    <div class="js-booking-vehicle prices"><span class="price regular">€&nbsp;117.30</span></div>
  </div>
</div>
<div class="booking-class booking-class-vehicles business" data-booking-class="business">
  <div class="booking-class-vehicle clearfix">
    <h3 class="booking-class-header">Business Sedan</h3>
    <li class="booking-class-description-vehicle vehicle business">Mercedes E-Class</li>
    <div class="js-booking-vehicle prices"><span class="price regular">€&nbsp;114.75</span></div>
  </div>
</div>`

test('Talixo place identifiers retain public geocoding evidence', () => {
  assert.deepEqual(decodePlace(encodePlace(berlinAirport)), berlinAirport)
})

test('Talixo public offer cards are normalized', () => {
  assert.deepEqual(parseTalixoQuotes(quoteHtml), [
    {
      externalVehicleKey: 'economy_van',
      externalVehicleName: 'Economy VAN',
      maxPassengers: 7,
      price: 117.3,
      currency: 'EUR',
      vehicleModels: ['Mercedes Vito']
    },
    {
      externalVehicleKey: 'business',
      externalVehicleName: 'Business Sedan',
      maxPassengers: 3,
      price: 114.75,
      currency: 'EUR',
      vehicleModels: ['Mercedes E-Class']
    }
  ])
})

test('Talixo adapter reads the public choice page without creating a booking', async () => {
  const requests = []
  const adapter = new TalixoAdapter({}, {
    fetchImpl: async (url, options = {}) => {
      requests.push({ url: String(url), options })
      if (requests.length === 1) {
        return {
          ok: true,
          status: 200,
          headers: { getSetCookie: () => ['csrftoken=token; Path=/'] },
          text: async () => '<input type="hidden" name="csrfmiddlewaretoken" value="masked-token">'
        }
      }
      return { ok: true, status: 200, headers: { get: () => null }, text: async () => quoteHtml }
    }
  })
  const result = await adapter.fetchQuotes({
    pickup: { id: encodePlace(berlinAirport), label: 'Berlin Brandenburg Airport (BER)' },
    dropoff: { id: encodePlace(adlon), label: 'Hotel Adlon Kempinski Berlin' },
    serviceAt: new Date('2026-08-19T12:00:00Z'),
    currency: 'EUR',
    passengers: { adults: 1 }
  })
  assert.equal(requests.length, 2)
  assert.equal(requests[1].url, 'https://talixo.com/booking/when/')
  assert.match(requests[1].options.body, /start_place_id=place-ber/)
  assert.equal(result.quotes.length, 2)
  assert.equal(result.evidence.bookingCreated, false)
})

test('Talixo browser challenge is reported distinctly from missing coverage', async () => {
  let requestCount = 0
  const adapter = new TalixoAdapter({}, {
    fetchImpl: async () => {
      requestCount += 1
      if (requestCount === 1) return {
        ok: true,
        status: 200,
        headers: { getSetCookie: () => ['csrftoken=token; Path=/'] },
        text: async () => '<input name="csrfmiddlewaretoken" value="masked-token">'
      }
      return { ok: true, status: 202, headers: { get: (name) => name === 'x-amzn-waf-action' ? 'challenge' : null } }
    }
  })
  await assert.rejects(() => adapter.fetchQuotes({
    pickup: { id: encodePlace(berlinAirport), label: 'Berlin Brandenburg Airport (BER)' },
    dropoff: { id: encodePlace(adlon), label: 'Hotel Adlon Kempinski Berlin' },
    serviceAt: new Date('2026-08-19T12:00:00Z'),
    currency: 'EUR'
  }), (error) => error.code === 'BROWSER_CHALLENGE_REQUIRED')
})
