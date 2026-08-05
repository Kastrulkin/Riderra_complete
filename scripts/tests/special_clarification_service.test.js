const assert = require('assert')
const {
  SPECIAL_CLARIFICATION_TARGETS,
  detectSpecialClarificationTarget,
  extractSpecialClarificationValue,
  specialClarificationQuestion
} = require('../../server/services/specialClarificationService')

assert.strictEqual(detectSpecialClarificationTarget('Сколько ребёнку лет'), SPECIAL_CLARIFICATION_TARGETS.CHILD_AGE)
assert.strictEqual(detectSpecialClarificationTarget('Сколько он весит'), SPECIAL_CLARIFICATION_TARGETS.CHILD_WEIGHT)
assert.strictEqual(detectSpecialClarificationTarget('Уточнить дату и время прилёта'), SPECIAL_CLARIFICATION_TARGETS.ARRIVAL_DATE_TIME)
assert.strictEqual(specialClarificationQuestion(SPECIAL_CLARIFICATION_TARGETS.CHILD_AGE, 'ru'), 'Сколько ребёнку лет?')
assert.strictEqual(specialClarificationQuestion(SPECIAL_CLARIFICATION_TARGETS.CHILD_WEIGHT, 'en'), 'How much does the child weigh? Please provide the weight in kilograms.')
assert.strictEqual(extractSpecialClarificationValue(SPECIAL_CLARIFICATION_TARGETS.CHILD_AGE, '6 месяцев'), '6 месяцев')
assert.strictEqual(extractSpecialClarificationValue(SPECIAL_CLARIFICATION_TARGETS.CHILD_WEIGHT, '15 kg'), '15 кг')
assert.strictEqual(extractSpecialClarificationValue(SPECIAL_CLARIFICATION_TARGETS.ARRIVAL_DATE_TIME, '6 August at 15:40'), '6 August at 15:40')
assert.strictEqual(extractSpecialClarificationValue(SPECIAL_CLARIFICATION_TARGETS.ARRIVAL_DATE_TIME, '6 августа'), null)

console.log('special clarification service tests passed')
