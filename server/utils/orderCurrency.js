const RUSSIAN_RUBLE_SOURCE_CUTOFF = '2020-09'
const RUSSIAN_CITY_OR_AIRPORT = /(?:^|[\s-])(SVO|DME|VKO|ZIA|LED|AER|KRR|KGD|KJA|IKT|VVO|SVX|ROV|KZN|UFA|KUF|PEE|OVB|OMS|TJM|CEK|GOJ|MRV|MCX|VOG|VOZ|ARH|MMK|KHV|YKS)(?:[\s-]|$)|moscow|mow|spb|saint petersburg|st\.? petersburg|sochi|adler|kaliningrad|krasnoyarsk|irkutsk|krasnodar|vladivostok|ekaterinburg|yekaterinburg|kursk|rostov|kazan|samara|ufa|perm|novosibirsk|omsk|tyumen|chelyabinsk|nizhny novgorod|mineralnye vody|makhachkala|volgograd|voronezh|arkhangelsk|murmansk|khabarovsk|yakutsk/i

function clean(value) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function usesRubleForRussianRoute({ cityCode = '', monthLabel = '' } = {}) {
  const month = clean(monthLabel)
  if (!month || month < RUSSIAN_RUBLE_SOURCE_CUTOFF) return false
  return RUSSIAN_CITY_OR_AIRPORT.test(clean(cityCode))
}

function resolveOrderCurrency(value, { cityCode = '', monthLabel = '', fallback = 'EUR' } = {}) {
  const raw = clean(value).toUpperCase()
  if (raw.includes('CAD')) return { currency: 'CAD', evidence: 'explicit' }
  if (raw.includes('USD') || raw.includes('$')) return { currency: 'USD', evidence: 'explicit' }
  if (raw.includes('GBP') || raw.includes('£')) return { currency: 'GBP', evidence: 'explicit' }
  if (raw.includes('RUB') || raw.includes('RUR') || raw.includes('₽') || /РУБ(?:\.|\s|$)/.test(raw)) return { currency: 'RUB', evidence: 'explicit' }
  if (raw.includes('DKK')) return { currency: 'DKK', evidence: 'explicit' }
  if (raw.includes('EUR') || raw.includes('€')) return { currency: 'EUR', evidence: 'explicit' }

  const route = clean(cityCode).toLowerCase()
  if (route.includes('los angeles')) return { currency: 'USD', evidence: 'route' }
  if (route.includes('vancouver')) return { currency: 'CAD', evidence: 'route' }
  if (route.includes('london')) return { currency: 'GBP', evidence: 'route' }
  if (usesRubleForRussianRoute({ cityCode, monthLabel })) return { currency: 'RUB', evidence: 'period_route' }
  return { currency: clean(fallback).toUpperCase() || 'EUR', evidence: 'fallback' }
}

module.exports = { resolveOrderCurrency, usesRubleForRussianRoute }
