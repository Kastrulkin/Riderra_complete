const COMPLAINT_RE = /\b(complaint|claim|refund|compensation|no[ -]?show|driver (?:was )?late|passenger (?:was )?left|missed transfer|unacceptable|incident)\b|жалоб|претензи|возврат|компенсац|не приех|не встрет|опоздал|инцидент/i
const BOOKING_FREE_CANCELLATION_SUBJECT_RE = /^booking\.com\s+free\s+cancellation\s+id\s*#?\s*[a-z0-9-]+\.?$/i

function cleanText(value) {
  return String(value || '').replace(/\r/g, '').trim()
}

function parseJson(value, fallback) {
  try { return value ? JSON.parse(value) : fallback } catch (_) { return fallback }
}

function isComplaintEmail({ subject, rawText }) {
  const subjectText = cleanText(subject)
  if (BOOKING_FREE_CANCELLATION_SUBJECT_RE.test(subjectText)) return false
  return COMPLAINT_RE.test(`${subjectText}\n${cleanText(rawText)}`)
}

function extractEmailAddress(value) {
  const raw = cleanText(value)
  const angled = raw.match(/<([^<>\s]+@[^<>\s]+)>/)
  if (angled) return angled[1].toLowerCase()
  const direct = raw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)
  return direct ? direct[0].toLowerCase() : null
}

function extractOrderReferences(text) {
  const raw = cleanText(text)
  const labelled = [...raw.matchAll(/(?:booking|reservation|order|заказ|бронировани[ея])(?:\s*(?:number|no\.?|id|№))?\s*[:#№-]?\s*([A-Z0-9][A-Z0-9-]{3,})/gi)].map(match => match[1])
  const likely = [...raw.matchAll(/\b(?=[A-Z0-9-]{6,16}\b)(?=[A-Z0-9-]*\d)[A-Z0-9]+(?:-[A-Z0-9]+)*\b/g)].map(match => match[0])
  return [...new Set([...labelled, ...likely].map(value => value.toUpperCase()).filter(value => !/^20\d{2}-\d{2}/.test(value)))].slice(0, 12)
}

function extractDateHints(text) {
  const raw = cleanText(text)
  const values = []
  for (const match of raw.matchAll(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T,\s]+(\d{1,2}):(\d{2}))?/g)) {
    values.push({ year: Number(match[1]), month: Number(match[2]), day: Number(match[3]), hour: match[4] == null ? null : Number(match[4]), minute: match[5] == null ? null : Number(match[5]) })
  }
  for (const match of raw.matchAll(/\b(\d{1,2})[./](\d{1,2})[./](20\d{2})(?:[,\s]+(\d{1,2}):(\d{2}))?/g)) {
    values.push({ year: Number(match[3]), month: Number(match[2]), day: Number(match[1]), hour: match[4] == null ? null : Number(match[4]), minute: match[5] == null ? null : Number(match[5]) })
  }
  return values.slice(0, 10)
}

function complaintCategory(text) {
  const raw = cleanText(text)
  if (/no[ -]?show|не приех|не встрет/i.test(raw)) return 'no_show'
  if (/late|delay|опозд/i.test(raw)) return 'delay'
  if (/driver|водител/i.test(raw)) return 'driver_conduct'
  if (/refund|compensation|возврат|компенсац/i.test(raw)) return 'financial_claim'
  if (/vehicle|car|автомоб|машин/i.test(raw)) return 'vehicle'
  return 'other'
}

function complaintSeverity(text) {
  const raw = cleanText(text)
  if (/injur|accident|police|hospital|unsafe|угроз|дтп|полици|травм/i.test(raw)) return 'critical'
  if (/refund|compensation|no[ -]?show|возврат|компенсац|не приех/i.test(raw)) return 'high'
  return 'normal'
}

function summarizeComplaint({ subject, rawText }) {
  const subjectText = cleanText(subject).replace(/^(re|fwd?):\s*/i, '')
  if (subjectText && subjectText.length > 8) return subjectText.slice(0, 220)
  const body = cleanText(rawText).split('\n').map(line => line.trim()).filter(line => line && !/^(from|to|cc|subject|date):/i.test(line)).join(' ')
  return (body || 'Жалоба требует проверки').slice(0, 220)
}

function minuteDistance(date, hint) {
  if (!date || !hint) return Number.POSITIVE_INFINITY
  const current = new Date(date)
  if (Number.isNaN(current.getTime())) return Number.POSITIVE_INFINITY
  if (current.getUTCFullYear() !== hint.year || current.getUTCMonth() + 1 !== hint.month || current.getUTCDate() !== hint.day) return Number.POSITIVE_INFINITY
  if (hint.hour == null) return 0
  return Math.abs(current.getUTCHours() * 60 + current.getUTCMinutes() - (hint.hour * 60 + hint.minute))
}

function scoreOrderCandidate(order, { references = [], dateHints = [], phone = '', routeText = '' } = {}) {
  let score = 0
  const reasons = []
  const ids = [order.sourceOrderNumber, order.sourceBookingId, order.sourceInternalOrderNumber, order.externalKey].filter(Boolean).map(value => String(value).toUpperCase())
  if (references.some(reference => ids.some(id => id === reference || id.includes(reference)))) {
    score += 70
    reasons.push('номер заказа')
  }
  const nearest = Math.min(...dateHints.map(hint => minuteDistance(order.pickupAt, hint)), Number.POSITIVE_INFINITY)
  if (nearest === 0) { score += 25; reasons.push('дата поездки') } else if (nearest <= 90) { score += 30; reasons.push('дата и время поездки') }
  const normalizedPhone = String(phone || '').replace(/\D/g, '')
  if (normalizedPhone.length >= 7 && String(order.customerPhone || '').replace(/\D/g, '').endsWith(normalizedPhone.slice(-7))) { score += 15; reasons.push('телефон') }
  const route = cleanText(routeText).toLowerCase()
  if (route && [order.fromPoint, order.toPoint].filter(Boolean).some(point => route.includes(String(point).toLowerCase().slice(0, 18)))) { score += 8; reasons.push('маршрут') }
  return { score, reasons }
}

function normalizeInvestigation(value) {
  const input = typeof value === 'string' ? parseJson(value, {}) : (value || {})
  return {
    arrivedAt: input.arrivedAt || '',
    departedAt: input.departedAt || '',
    pickupPoint: cleanText(input.pickupPoint),
    calls: Array.isArray(input.calls) ? input.calls : [],
    messages: Array.isArray(input.messages) ? input.messages : [],
    dispatcherContact: cleanText(input.dispatcherContact),
    driverExplanation: cleanText(input.driverExplanation),
    passengerOutcome: cleanText(input.passengerOutcome),
    operatorNotes: cleanText(input.operatorNotes)
  }
}

function investigationChecklist(investigation, rules = {}) {
  const facts = normalizeInvestigation(investigation)
  const required = [
    ['arrivedAt', 'Время прибытия водителя'],
    ['departedAt', 'Время отъезда водителя'],
    ['pickupPoint', 'Место ожидания'],
    ['driverExplanation', 'Объяснение водителя'],
    ['passengerOutcome', 'Итог для пассажира']
  ]
  if ((rules.requiredActions || []).includes('call_passenger')) required.push(['calls', 'Попытки позвонить пассажиру'])
  if ((rules.requiredActions || []).includes('message_passenger')) required.push(['messages', 'Сообщения пассажиру'])
  if ((rules.requiredActions || []).includes('contact_dispatcher')) required.push(['dispatcherContact', 'Связь с диспетчером или заказчиком'])
  return required.filter(([key]) => Array.isArray(facts[key]) ? !facts[key].length : !facts[key]).map(([, label]) => label)
}

function composeComplaintResponse({ complaint, order, investigation, rules = {} }) {
  const facts = normalizeInvestigation(investigation)
  const orderNumber = order?.sourceOrderNumber || order?.sourceBookingId || order?.sourceInternalOrderNumber || 'the booking'
  const actions = []
  if (facts.calls.length) actions.push(`The driver attempted to call the passenger ${facts.calls.length} time${facts.calls.length === 1 ? '' : 's'}.`)
  if (facts.messages.length) actions.push(`The driver also sent ${facts.messages.length} message${facts.messages.length === 1 ? '' : 's'}.`)
  if (facts.dispatcherContact) actions.push(`Our operations team was informed: ${facts.dispatcherContact}.`)
  const waitRule = Number(rules.waitingMinutes)
  const arrivedAt = facts.arrivedAt ? new Date(facts.arrivedAt) : null
  const departedAt = facts.departedAt ? new Date(facts.departedAt) : null
  const waitedMinutes = arrivedAt && departedAt && !Number.isNaN(arrivedAt.getTime()) && !Number.isNaN(departedAt.getTime())
    ? Math.max(0, Math.round((departedAt - arrivedAt) / 60000))
    : null
  const contractLine = Number.isFinite(waitRule) && waitRule > 0
    ? waitedMinutes == null
      ? `The applicable booking terms require a waiting period of ${waitRule} minutes.`
      : `The confirmed waiting period was ${waitedMinutes} minutes; the applicable booking terms require ${waitRule} minutes${waitedMinutes >= waitRule ? ', so the required waiting period was met.' : '.'}`
    : waitedMinutes == null ? '' : `The confirmed waiting period was ${waitedMinutes} minutes.`
  const approved = Array.isArray(rules.approvedStatements) ? rules.approvedStatements.filter(Boolean).slice(0, 2).join(' ') : ''
  return [
    'Dear Partner,',
    '',
    `We have reviewed the complaint regarding booking ${orderNumber}.`,
    facts.arrivedAt ? `The driver arrived at ${facts.arrivedAt}${facts.pickupPoint ? ` and waited at ${facts.pickupPoint}` : ''}.` : '',
    ...actions,
    facts.departedAt ? `The driver left the pickup point at ${facts.departedAt}.` : '',
    contractLine,
    facts.driverExplanation ? `The driver's confirmed account is: ${facts.driverExplanation}` : '',
    facts.passengerOutcome ? `Passenger outcome: ${facts.passengerOutcome}` : '',
    approved,
    '',
    'The supporting records available to us are attached for review. Based on the confirmed timeline above, our team took reasonable steps to perform the transfer. Please let us know if you have any additional verified information that should be considered.',
    '',
    'Kind regards,',
    'Riderra Operations'
  ].join('\n').replace(/\n{3,}/g, '\n\n')
}

module.exports = {
  complaintCategory,
  complaintSeverity,
  composeComplaintResponse,
  extractDateHints,
  extractEmailAddress,
  extractOrderReferences,
  investigationChecklist,
  isComplaintEmail,
  normalizeInvestigation,
  parseJson,
  scoreOrderCandidate,
  summarizeComplaint
}
