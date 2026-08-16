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

function formatMonitorDate(monitorDate) {
  const value = new Date(`${monitorDate}T12:00:00Z`)
  if (Number.isNaN(value.getTime())) return String(monitorDate || '')
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Europe/Moscow',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(value)
}

function formatMovementLine(row, icon) {
  const currency = row.quote.clientCurrency || row.quote.riderraCurrency
  const sign = row.delta > 0 ? '+' : ''
  const percent = row.deltaPct === null ? '' : ` · ${sign}${row.deltaPct.toFixed(2)}%`
  return [
    `${icon} ${row.quote.routeFrom} → ${row.quote.routeTo}`,
    `   ${row.quote.requestedVehicleType}: ${row.previousPrice.toFixed(2)} → ${row.currentPrice.toFixed(2)} ${currency}${percent}`
  ].join('\n')
}

function buildBookingMorningMessage({ monitorDate, finished, summary, increased, decreased, approvalId }) {
  const changes = []
  if (increased.length) {
    changes.push('🔺 ПОДОРОЖАЛО', ...increased.slice(0, 3).map((row) => formatMovementLine(row, '•')))
  }
  if (decreased.length) {
    if (changes.length) changes.push('')
    changes.push('🔻 ПОДЕШЕВЕЛО', ...decreased.slice(0, 3).map((row) => formatMovementLine(row, '•')))
  }
  if (!changes.length) changes.push('Изменений цен Booking не найдено.')

  return [
    'BOOKING · УТРЕННЯЯ ПРОВЕРКА',
    formatMonitorDate(monitorDate),
    '',
    'СВОДКА',
    `✅ Проверено: ${finished.processedCount}/${finished.routeCount}`,
    `🔺 Подорожало: ${increased.length}`,
    `🔻 Подешевело: ${decreased.length}`,
    `➖ Без изменений: ${summary.unchanged.length}`,
    `🆕 Первая фиксация: ${summary.firstSnapshot.length}`,
    `⚠️ Требуют проверки: ${finished.needsReviewCount}`,
    `❌ Ошибки: ${finished.failedCount}`,
    '',
    ...changes,
    '',
    'КАК СЧИТАЕМ',
    'Текущая публичная цена Booking сравнивается с последней успешной утренней фиксацией того же маршрута и класса автомобиля.',
    'Прайс 005 используется только как перечень маршрутов и автоматически не изменяется.',
    '',
    `Отчёт на проверку: ${approvalId}`
  ].join('\n')
}

module.exports = {
  buildBookingMorningMessage,
  buildBookingPriceMovement,
  exactQuoteKey,
  formatMovementLine,
  indexPreviousBookingQuotes,
  routeQuoteKey,
  summarizeBookingPriceMovements
}
