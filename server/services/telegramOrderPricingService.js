function normalizeRouteToken(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function routePointMatches(routeValue, requestedValue) {
  const routeToken = normalizeRouteToken(routeValue)
  const requestedToken = normalizeRouteToken(requestedValue)
  if (!routeToken || !requestedToken) return false
  return routeToken.includes(requestedToken) || requestedToken.includes(routeToken)
}

function isOrderPriceRequest(text = '') {
  const raw = String(text || '').trim()
  if (/^\/(?:order[-_]price|london[-_]price)(?:\s|$)/i.test(raw)) return true
  const hasLondonAirport = /\b(?:LHR|LGW|LCY)\b|Heathrow|Gatwick|London City Airport/i.test(raw)
  const hasRouteLabels = /(?:^|\n)\s*(?:from|pickup(?: location| address)?|pick-up(?: location| address)?|откуда|место подачи|адрес подачи)\s*[:\-–—]/i.test(raw) &&
    /(?:^|\n)\s*(?:to|destination|drop-off(?: location| address)?|dropoff(?: location| address)?|куда|место назначения|адрес назначения)\s*[:\-–—]/i.test(raw)
  return hasLondonAirport && hasRouteLabels
}

function stripOrderPriceCommand(text = '') {
  return String(text || '')
    .replace(/^\/(?:order[-_]price|london[-_]price)\s*/i, '')
    .trim()
}

function hasCompleteLondonPricingRoute(parsed = {}) {
  return Boolean(parsed.fromPoint && parsed.toPoint && (!Array.isArray(parsed.missing) || parsed.missing.length === 0))
}

function findMatchingCityPrice(rows = [], {
  city = '',
  fromPoint = '',
  toPoint = '',
  vehicleType = '',
  fromZoneName = '',
  toZoneName = '',
  normalizeVehicleType = (value) => normalizeRouteToken(value)
} = {}) {
  const cityNorm = normalizeRouteToken(city)
  const fromNorm = String(fromPoint || '').trim()
  const toNorm = String(toPoint || '').trim()
  const fromZoneNorm = String(fromZoneName || '').trim()
  const toZoneNorm = String(toZoneName || '').trim()
  const vehicleNorm = normalizeVehicleType(vehicleType)
  const activeRows = rows.filter((row) =>
    row?.isActive !== false &&
    row?.fixedPrice !== null &&
    row?.fixedPrice !== undefined &&
    (!cityNorm || !row.city || normalizeRouteToken(row.city) === cityNorm) &&
    (!row.vehicleType || normalizeVehicleType(row.vehicleType) === vehicleNorm)
  )

  const exact = activeRows.find((row) =>
    routePointMatches(row.routeFrom, fromNorm) &&
    routePointMatches(row.routeTo, toNorm)
  )
  if (exact) return { row: exact, matchedBy: 'address_text' }

  if (fromZoneNorm || toZoneNorm) {
    const zone = activeRows.find((row) =>
      routePointMatches(row.routeFrom, fromZoneNorm || fromNorm) &&
      routePointMatches(row.routeTo, toZoneNorm || toNorm)
    )
    if (zone) return { row: zone, matchedBy: 'geo_zone' }
  }

  const cityOnly = activeRows.find((row) => !row.routeFrom && !row.routeTo)
  return cityOnly ? { row: cityOnly, matchedBy: 'city_fallback' } : null
}

module.exports = {
  findMatchingCityPrice,
  hasCompleteLondonPricingRoute,
  isOrderPriceRequest,
  routePointMatches,
  stripOrderPriceCommand
}
