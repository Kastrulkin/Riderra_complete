const SPECIAL_CLARIFICATION_TARGETS = {
  CHILD_AGE: 'childAge',
  CHILD_WEIGHT: 'childWeight',
  ARRIVAL_DATE_TIME: 'arrivalDateTime'
}

function detectSpecialClarificationTarget(value = '') {
  const text = String(value || '').toLowerCase()
  if (/(дат[а-яё]*|date|day).{0,24}(время|time).{0,24}(прил[её]т[а-яё]*|arrival)|(?:прил[её]т[а-яё]*|arrival).{0,24}(дат[а-яё]*|date|day).{0,24}(время|time)/i.test(text)) {
    return SPECIAL_CLARIFICATION_TARGETS.ARRIVAL_DATE_TIME
  }
  if (/(возраст\s+(?:реб[её]нка|ребенка)|сколько\s+(?:реб[её]нку|ребенку)\s+лет|child.{0,12}age|how\s+old.{0,12}child)/i.test(text)) {
    return SPECIAL_CLARIFICATION_TARGETS.CHILD_AGE
  }
  if (/(вес\s+(?:реб[её]нка|ребенка)|сколько\s+(?:он|реб[её]нок|ребенок)\s+весит|child.{0,12}weight|how\s+much.{0,12}child\s+weigh)/i.test(text)) {
    return SPECIAL_CLARIFICATION_TARGETS.CHILD_WEIGHT
  }
  return null
}

function specialClarificationQuestion(target, lang = 'en') {
  const isRu = String(lang || '').toLowerCase() === 'ru'
  if (target === SPECIAL_CLARIFICATION_TARGETS.CHILD_AGE) {
    return isRu ? 'Сколько ребёнку лет?' : 'How old is the child?'
  }
  if (target === SPECIAL_CLARIFICATION_TARGETS.CHILD_WEIGHT) {
    return isRu ? 'Сколько он весит? Укажите, пожалуйста, вес в килограммах.' : 'How much does the child weigh? Please provide the weight in kilograms.'
  }
  if (target === SPECIAL_CLARIFICATION_TARGETS.ARRIVAL_DATE_TIME) {
    return isRu ? 'Подскажите, пожалуйста, дату и точное местное время прилёта.' : 'Could you please provide the arrival date and exact local arrival time?'
  }
  return null
}

function numericReply(raw = '') {
  const match = String(raw || '').match(/\b(\d{1,3}(?:[.,]\d{1,2})?)\b/)
  return match ? Number(match[1].replace(',', '.')) : null
}

function extractSpecialClarificationValue(target, raw = '') {
  const text = String(raw || '').trim()
  if (!text) return null
  if (target === SPECIAL_CLARIFICATION_TARGETS.CHILD_AGE) {
    const amount = numericReply(text)
    if (!Number.isFinite(amount) || amount < 0 || amount > 17) return null
    const months = /(месяц|месяца|месяцев|month|months)/i.test(text)
    return `${amount} ${months ? 'месяцев' : 'лет'}`
  }
  if (target === SPECIAL_CLARIFICATION_TARGETS.CHILD_WEIGHT) {
    const amount = numericReply(text)
    if (!Number.isFinite(amount) || amount <= 0 || amount > 200) return null
    const pounds = /\b(?:lb|lbs|pound|pounds)\b/i.test(text)
    return `${amount} ${pounds ? 'lb' : 'кг'}`
  }
  if (target === SPECIAL_CLARIFICATION_TARGETS.ARRIVAL_DATE_TIME) {
    const hasDate = /\b\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?\b|\b\d{4}-\d{2}-\d{2}\b|\b(?:январ|феврал|март|апрел|ма[йя]|июн|июл|август|сентябр|октябр|ноябр|декабр|january|february|march|april|may|june|july|august|september|october|november|december|today|tomorrow|сегодня|завтра)/i.test(text)
    const hasTime = /\b\d{1,2}[:.]\d{2}\b|\b\d{1,2}\s*(?:am|pm)\b|\bв\s+\d{1,2}\b/i.test(text)
    return hasDate && hasTime ? text : null
  }
  return null
}

module.exports = {
  SPECIAL_CLARIFICATION_TARGETS,
  detectSpecialClarificationTarget,
  extractSpecialClarificationValue,
  specialClarificationQuestion
}
