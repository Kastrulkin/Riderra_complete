function money(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100
}

function normalized(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

function exactQuoteKey(quote) {
  return [
    String(quote?.cityPricingId || ''),
    normalized(quote?.externalVehicleKey),
    String(quote?.clientCurrency || quote?.riderraCurrency || '').toUpperCase()
  ].join('|')
}

function routeQuoteKey(quote) {
  return [
    normalized(quote?.routeFrom),
    normalized(quote?.routeTo),
    normalized(quote?.requestedVehicleType),
    normalized(quote?.externalVehicleKey),
    String(quote?.clientCurrency || quote?.riderraCurrency || '').toUpperCase()
  ].join('|')
}

function indexPreviousBookingQuotes(quotes = []) {
  const exact = new Map()
  const route = new Map()
  const ordered = [...quotes].sort((left, right) => {
    const leftAt = new Date(left?.quotedAt || left?.createdAt || 0).getTime()
    const rightAt = new Date(right?.quotedAt || right?.createdAt || 0).getTime()
    return rightAt - leftAt
  })
  for (const quote of ordered) {
    const price = Number(quote?.clientSellPrice)
    if (!Number.isFinite(price) || price < 0) continue
    const exactKey = exactQuoteKey(quote)
    const routeKey = routeQuoteKey(quote)
    if (!exact.has(exactKey)) exact.set(exactKey, quote)
    if (!route.has(routeKey)) route.set(routeKey, quote)
  }
  return { exact, route }
}

function buildBookingPriceMovement(currentQuote, previousIndex) {
  const currentPrice = Number(currentQuote?.clientSellPrice)
  if (!Number.isFinite(currentPrice) || currentPrice < 0) return null
  const previousQuote = previousIndex?.exact?.get(exactQuoteKey(currentQuote))
    || previousIndex?.route?.get(routeQuoteKey(currentQuote))
  if (!previousQuote) {
    return {
      direction: 'first_snapshot',
      currentPrice: money(currentPrice),
      previousPrice: null,
      delta: null,
      deltaPct: null,
      quote: currentQuote,
      previousQuote: null
    }
  }
  const previousPrice = Number(previousQuote.clientSellPrice)
  const delta = money(currentPrice - previousPrice)
  const direction = delta > 0 ? 'increased' : (delta < 0 ? 'decreased' : 'unchanged')
  return {
    direction,
    currentPrice: money(currentPrice),
    previousPrice: money(previousPrice),
    delta,
    deltaPct: previousPrice > 0 ? money((delta / previousPrice) * 100) : null,
    quote: currentQuote,
    previousQuote
  }
}

function summarizeBookingPriceMovements(currentQuotes = [], previousQuotes = []) {
  const previousIndex = indexPreviousBookingQuotes(previousQuotes)
  const movements = currentQuotes
    .map((quote) => buildBookingPriceMovement(quote, previousIndex))
    .filter(Boolean)
  const byDirection = (direction) => movements.filter((row) => row.direction === direction)
  return {
    movements,
    increased: byDirection('increased'),
    decreased: byDirection('decreased'),
    unchanged: byDirection('unchanged'),
    firstSnapshot: byDirection('first_snapshot')
  }
}

module.exports = {
  buildBookingPriceMovement,
  exactQuoteKey,
  indexPreviousBookingQuotes,
  routeQuoteKey,
  summarizeBookingPriceMovements
}
