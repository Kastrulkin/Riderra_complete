const DEFAULT_BOOKING_MONITORING = Object.freeze({
  priceWatchEnabled: true,
  frequency: 'daily',
  weekdays: [1, 2, 3, 4, 5],
  localTime: '08:00',
  timeZone: 'Europe/Moscow',
  lowRatio: 0.9,
  highRatio: 1.05,
  openCitiesHours: 24,
  allRoutesDays: 7
})

function normalizeWeekdays(value, frequency) {
  const rows = Array.from(new Set((Array.isArray(value) ? value : []).map(Number).filter((day) => day >= 1 && day <= 7))).sort((a, b) => a - b)
  if (frequency === 'daily') return [1, 2, 3, 4, 5, 6, 7]
  if (frequency === 'weekdays') return [1, 2, 3, 4, 5]
  return rows.length ? [rows[0]] : [1]
}

function normalizeBookingMonitoring(value = {}) {
  const frequency = ['daily', 'weekdays', 'weekly'].includes(String(value.frequency)) ? String(value.frequency) : DEFAULT_BOOKING_MONITORING.frequency
  const localTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value.localTime || '')) ? String(value.localTime) : DEFAULT_BOOKING_MONITORING.localTime
  const lowRatio = Number(value.lowRatio)
  const highRatio = Number(value.highRatio)
  return {
    ...DEFAULT_BOOKING_MONITORING,
    priceWatchEnabled: value.priceWatchEnabled !== false,
    frequency,
    weekdays: normalizeWeekdays(value.weekdays, frequency),
    localTime,
    timeZone: 'Europe/Moscow',
    lowRatio: Number.isFinite(lowRatio) && lowRatio > 0 && lowRatio < 1 ? lowRatio : DEFAULT_BOOKING_MONITORING.lowRatio,
    highRatio: Number.isFinite(highRatio) && highRatio >= 1 && highRatio <= 2 ? highRatio : DEFAULT_BOOKING_MONITORING.highRatio,
    openCitiesHours: Math.min(168, Math.max(1, Number(value.openCitiesHours) || DEFAULT_BOOKING_MONITORING.openCitiesHours)),
    allRoutesDays: Math.min(90, Math.max(1, Number(value.allRoutesDays) || DEFAULT_BOOKING_MONITORING.allRoutesDays))
  }
}

function zonedParts(now, timeZone) {
  const values = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(now).filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]))
  const weekday = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }[values.weekday]
  return { ...values, weekday, minutesOfDay: Number(values.hour) * 60 + Number(values.minute) }
}

function isBookingMonitorDue(now = new Date(), rawMonitoring = {}) {
  const monitoring = normalizeBookingMonitoring(rawMonitoring)
  if (!monitoring.priceWatchEnabled) return false
  const parts = zonedParts(now, monitoring.timeZone)
  if (!monitoring.weekdays.includes(parts.weekday)) return false
  const [hour, minute] = monitoring.localTime.split(':').map(Number)
  return parts.minutesOfDay >= hour * 60 + minute && parts.minutesOfDay < hour * 60 + minute + 5
}

module.exports = {
  DEFAULT_BOOKING_MONITORING,
  isBookingMonitorDue,
  normalizeBookingMonitoring,
  zonedParts
}
