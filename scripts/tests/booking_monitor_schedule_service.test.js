const test = require('node:test')
const assert = require('node:assert/strict')
const {
  isBookingMonitorDue,
  normalizeBookingMonitoring
} = require('../../server/services/bookingMonitorScheduleService')

test('normalizes daily, weekdays and weekly schedules', () => {
  assert.deepEqual(normalizeBookingMonitoring({ frequency: 'daily' }).weekdays, [1, 2, 3, 4, 5, 6, 7])
  assert.deepEqual(normalizeBookingMonitoring({ frequency: 'weekdays' }).weekdays, [1, 2, 3, 4, 5])
  assert.deepEqual(normalizeBookingMonitoring({ frequency: 'weekly', weekdays: [4, 2] }).weekdays, [2])
})

test('runs only inside the configured five-minute Moscow window', () => {
  const monitoring = { frequency: 'daily', localTime: '08:00' }
  assert.equal(isBookingMonitorDue(new Date('2026-08-10T05:02:00Z'), monitoring), true)
  assert.equal(isBookingMonitorDue(new Date('2026-08-10T05:06:00Z'), monitoring), false)
})

test('respects disabled and weekday-only monitoring', () => {
  assert.equal(isBookingMonitorDue(new Date('2026-08-09T05:02:00Z'), { frequency: 'weekdays', localTime: '08:00' }), false)
  assert.equal(isBookingMonitorDue(new Date('2026-08-10T05:02:00Z'), { priceWatchEnabled: false, frequency: 'daily', localTime: '08:00' }), false)
})

test('normalizes the configured Booking priority locations', () => {
  const monitoring = normalizeBookingMonitoring({
    focusIatas: [' evn ', 'EVN', 'nqz', 'invalid'],
    focusCountries: [' Morocco ', 'Morocco', 'Portugal']
  })
  assert.deepEqual(monitoring.focusIatas, ['EVN', 'NQZ'])
  assert.deepEqual(monitoring.focusCountries, ['Morocco', 'Portugal'])
})

test('uses the agreed Booking priority locations by default', () => {
  const monitoring = normalizeBookingMonitoring({})
  assert.ok(monitoring.focusIatas.includes('EVN'))
  assert.ok(monitoring.focusIatas.includes('TSE'))
  assert.ok(monitoring.focusIatas.includes('NQZ'))
  assert.deepEqual(monitoring.focusCountries, ['Morocco'])
})
