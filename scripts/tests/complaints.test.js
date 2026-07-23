const assert = require('assert')
const {
  composeComplaintResponse,
  extractDateHints,
  extractOrderReferences,
  investigationChecklist,
  isComplaintEmail,
  scoreOrderCandidate
} = require('../../server/utils/complaints')
const { findComplaintOrder } = require('../../server/routes/complaints')

assert.equal(isComplaintEmail({ subject: 'Complaint booking 214314023', rawText: 'The driver did not show' }), true)
assert.equal(isComplaintEmail({ subject: 'New booking 214314023', rawText: 'Please confirm the transfer' }), false)

const refs = extractOrderReferences('Complaint for booking number MQMNVX and order 214314023')
assert(refs.includes('MQMNVX'))
assert(refs.includes('214314023'))

const dateHints = extractDateHints('Pickup was 23.07.2026, 14:30')
const score = scoreOrderCandidate({
  sourceOrderNumber: '214314023',
  sourceBookingId: null,
  sourceInternalOrderNumber: null,
  externalKey: 'google_sheet:test',
  pickupAt: new Date('2026-07-23T14:30:00.000Z'),
  customerPhone: '+35799128950',
  fromPoint: 'Helsinki Airport',
  toPoint: 'Hotel'
}, { references: refs, dateHints, routeText: 'Helsinki Airport' })
assert(score.score >= 100)

const rules = { requiredActions: ['call_passenger', 'message_passenger'], waitingMinutes: 60, approvedStatements: ['The agreed waiting procedure was followed.'] }
const investigation = {
  arrivedAt: '2026-07-23 14:25',
  departedAt: '2026-07-23 15:30',
  pickupPoint: 'Terminal 2 arrivals',
  calls: ['14:35 — no answer'],
  messages: ['14:40 — WhatsApp delivered'],
  dispatcherContact: '14:45 — operations informed',
  driverExplanation: 'The passenger did not arrive at the meeting point.',
  passengerOutcome: 'Passenger was not located.'
}
assert.deepEqual(investigationChecklist(investigation, rules), [])
const response = composeComplaintResponse({ complaint: {}, order: { sourceOrderNumber: '214314023' }, investigation, rules })
assert(response.includes('arrived at 2026-07-23 14:25'))
assert(response.includes('left the pickup point at 2026-07-23 15:30'))
assert(response.includes('attempted to call'))
assert(response.includes('booking terms require 60 minutes'))
assert(response.includes('confirmed waiting period was 65 minutes'))
assert(response.includes('required waiting period was met'))
assert(!response.includes('refund'))

;(async () => {
  let capturedWhere = null
  await findComplaintOrder({
    order: {
      async findMany ({ where }) {
        capturedWhere = where
        return []
      }
    }
  }, 'tenant-riderra', 'Complaint for booking 214314023')
  assert.equal(capturedWhere.tenantId, 'tenant-riderra')
  assert(!JSON.stringify(capturedWhere).includes('tenant-other'))

  console.log('complaints.test.js: ok')
})().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
