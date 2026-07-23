const MIN_NEGATIVE_RANKING_VOLUME = 5
const BASE_CURRENCY = 'EUR'
const APPROX_EUR_RATES = {
  EUR: 1,
  DKK: 0.134,
  USD: 0.92,
  GBP: 1.17,
  CAD: 0.67,
  RUB: 0.011
}

function toNumber(value) {
  const number = Number(value || 0)
  return Number.isFinite(number) ? number : 0
}

function moneyEntries(value) {
  return Object.entries(value || {})
    .map(([currency, amount]) => ({ currency: String(currency || 'EUR'), amount: toNumber(amount) }))
    .filter((entry) => entry.amount !== 0)
    .sort((a, b) => a.currency.localeCompare(b.currency))
}

function formatMoneyMap(value, locale = 'ru-RU') {
  const entries = moneyEntries(value)
  if (!entries.length) return '-'
  return entries.map(({ currency, amount }) => `${currency} ${amount.toLocaleString(locale)}`).join(' · ')
}

function convertToEur(amount, currency) {
  const normalizedCurrency = String(currency || BASE_CURRENCY).toUpperCase()
  const rate = APPROX_EUR_RATES[normalizedCurrency]
  if (!Number.isFinite(rate)) return null
  return Number((toNumber(amount) * rate).toFixed(2))
}

function totalEur(value) {
  return moneyEntries(value).reduce((sum, entry) => {
    const eur = convertToEur(entry.amount, entry.currency)
    if (eur === null) return sum
    return Number((sum + eur).toFixed(2))
  }, 0)
}

function formatEur(value, locale = 'ru-RU') {
  return `EUR ${toNumber(value).toLocaleString(locale)}`
}

function rate(part, total) {
  const denominator = toNumber(total)
  if (!denominator) return 0
  return Number((toNumber(part) / denominator).toFixed(4))
}

function formatRate(value) {
  return `${Math.round(toNumber(value) * 100)}%`
}

function percentChange(current, previous) {
  const currentValue = toNumber(current)
  const previousValue = toNumber(previous)
  if (!previousValue && !currentValue) return 0
  if (!previousValue) return null
  return Number(((currentValue - previousValue) / previousValue).toFixed(4))
}

function monthKey(month) {
  return String(month?.monthLabel || '')
}

function compareMonth(a, b) {
  return monthKey(a).localeCompare(monthKey(b))
}

function filterMonthsByPeriod(months, periodKey = '12m') {
  const sorted = [...(months || [])].filter((m) => monthKey(m)).sort(compareMonth)
  if (periodKey === 'all') return sorted
  if (periodKey === 'ytd') {
    const latest = sorted[sorted.length - 1]
    const year = String(latest?.monthLabel || '').slice(0, 4)
    return sorted.filter((m) => String(m.monthLabel || '').startsWith(`${year}-`))
  }
  const count = { '1m': 1, '3m': 3, '6m': 6, '12m': 12 }[periodKey] || 12
  return sorted.slice(Math.max(0, sorted.length - count))
}

function sumMonthField(months, field) {
  return (months || []).reduce((sum, month) => sum + toNumber(month[field]), 0)
}

function sumCurrencyMaps(months, field) {
  const totals = {}
  for (const month of months || []) {
    for (const [currency, amount] of Object.entries(month[field] || {})) {
      totals[currency] = Number((toNumber(totals[currency]) + toNumber(amount)).toFixed(2))
    }
  }
  return totals
}

function buildPeriodSummary(months) {
  const total = sumMonthField(months, 'total')
  const completed = sumMonthField(months, 'completed')
  const cancelled = sumMonthField(months, 'cancelled')
  const complaints = sumMonthField(months, 'complaints')
  const issueCount = sumMonthField(months, 'issueCount')
  return {
    total,
    completed,
    completedRate: rate(completed, total),
    cancelled,
    cancellationRate: rate(cancelled, total),
    complaints,
    complaintRate: rate(complaints, total),
    issueCount,
    issueRate: rate(issueCount, total),
    grossByCurrency: sumCurrencyMaps(months, 'grossByCurrency'),
    profitByCurrency: sumCurrencyMaps(months, 'profitByCurrency')
  }
}

function splitCurrentAndPrevious(months, periodKey) {
  const sorted = [...(months || [])].filter((m) => monthKey(m)).sort(compareMonth)
  const current = filterMonthsByPeriod(sorted, periodKey)
  const currentKeys = new Set(current.map((m) => m.monthLabel))
  const before = sorted.filter((m) => !currentKeys.has(m.monthLabel))
  const previous = before.slice(Math.max(0, before.length - current.length))
  return { current, previous }
}

function metricDelta(currentSummary, previousSummary, key) {
  if (key === 'grossByCurrency') {
    return percentChange(totalEur(currentSummary.grossByCurrency), totalEur(previousSummary.grossByCurrency))
  }
  if (key === 'profitByCurrency') {
    return percentChange(totalEur(currentSummary.profitByCurrency), totalEur(previousSummary.profitByCurrency))
  }
  return percentChange(currentSummary[key], previousSummary[key])
}

function hasMinimumVolume(row, minimumVolume = MIN_NEGATIVE_RANKING_VOLUME) {
  return toNumber(row?.total) >= minimumVolume
}

function enrichedEntity(row, nameKey) {
  const total = toNumber(row.total)
  const completed = toNumber(row.completed)
  const cancelled = toNumber(row.cancelled)
  const complaints = toNumber(row.complaints)
  const issueCount = toNumber(row.issueCount)
  return {
    ...row,
    name: String(row[nameKey] || row.name || '-'),
    completedRate: rate(completed, total),
    cancellationRate: rate(cancelled, total),
    complaintRate: rate(complaints, total),
    riskRate: rate(issueCount, total),
    incidentCount: complaints + issueCount,
    moneyScore: totalEur(row.grossByCurrency)
  }
}

function sortBest(a, b, mode = 'absolute') {
  if (mode === 'rate') return b.completedRate - a.completedRate || b.completed - a.completed || b.moneyScore - a.moneyScore
  return b.completed - a.completed || b.moneyScore - a.moneyScore || b.total - a.total
}

function sortProblem(a, b, mode = 'absolute') {
  if (mode === 'rate') return b.complaintRate - a.complaintRate || b.cancellationRate - a.cancellationRate || b.riskRate - a.riskRate || b.incidentCount - a.incidentCount
  return b.incidentCount - a.incidentCount || b.complaints - a.complaints || b.cancelled - a.cancelled || b.total - a.total
}

function buildLeaderboards({ drivers = [], counterparties = [], mode = 'absolute', minimumVolume = MIN_NEGATIVE_RANKING_VOLUME }) {
  const driverRows = drivers.map((row) => enrichedEntity(row, 'driver')).filter((row) => row.name && row.name !== '(empty)')
  const clientRows = counterparties.map((row) => enrichedEntity(row, 'counterparty')).filter((row) => row.name && row.name !== '(empty)')
  return {
    topClients: [...clientRows].sort((a, b) => sortBest(a, b, mode)).slice(0, 8),
    topDrivers: [...driverRows].sort((a, b) => sortBest(a, b, mode)).slice(0, 8),
    problemClients: [...clientRows].filter((row) => hasMinimumVolume(row, minimumVolume) && row.incidentCount).sort((a, b) => sortProblem(a, b, mode)).slice(0, 8),
    problemDrivers: [...driverRows].filter((row) => hasMinimumVolume(row, minimumVolume) && row.incidentCount).sort((a, b) => sortProblem(a, b, mode)).slice(0, 8)
  }
}

function filterArchiveRows(months, query = '', year = '') {
  const q = String(query || '').trim().toLowerCase()
  return [...(months || [])]
    .filter((month) => !year || String(month.monthLabel || '').startsWith(`${year}-`))
    .filter((month) => {
      if (!q) return true
      return [month.monthLabel, month.displayName, month.sourceSheetName, month.sourceSheetId]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q)
    })
    .sort((a, b) => monthKey(b).localeCompare(monthKey(a)))
}

module.exports = {
  APPROX_EUR_RATES,
  BASE_CURRENCY,
  MIN_NEGATIVE_RANKING_VOLUME,
  buildLeaderboards,
  buildPeriodSummary,
  convertToEur,
  filterArchiveRows,
  filterMonthsByPeriod,
  formatEur,
  formatMoneyMap,
  formatRate,
  hasMinimumVolume,
  metricDelta,
  moneyEntries,
  splitCurrentAndPrevious,
  sumCurrencyMaps,
  toNumber,
  totalEur
}
