const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const pagePath = path.resolve(__dirname, '../../pages/admin-crm.vue')
const source = fs.readFileSync(pagePath, 'utf8')

function extractMethod (startPattern, endPattern, methodName) {
  const match = source.match(new RegExp(`${startPattern}[\\s\\S]*?${endPattern}`))
  assert.ok(match, `${methodName} must remain discoverable in admin-crm.vue`)
  const methodSource = match[0].replace(new RegExp(`${endPattern}$`), '')
  return Function(`"use strict"; return ({${methodSource}}).${methodName}`)()
}

test('company details use loaded links when the list endpoint count is absent', () => {
  const relationshipCount = extractMethod(
    '    relationshipCount\\(row\\) \\{',
    ',\\n    needsAttention',
    'relationshipCount'
  )
  const nextActionLabel = extractMethod(
    '    nextActionLabel\\(row\\) \\{',
    ',\\n    primaryButtonLabel',
    'nextActionLabel'
  )
  const relationStateLabel = extractMethod(
    '    relationStateLabel\\(row\\) \\{',
    ',\\n    detailsFocusHint',
    'relationStateLabel'
  )
  const detailsFocusHint = extractMethod(
    '    detailsFocusHint\\(row\\) \\{',
    ',\\n    segmentOptionsForDetails',
    'detailsFocusHint'
  )

  const companyDetails = {
    phone: '+1 778 513 9295',
    presenceCountries: 'Canada',
    links: [{ id: 'link-1', contact: { id: 'contact-1', fullName: 'Hamza' } }],
    segments: []
  }
  const context = {
    mode: 'companies',
    relationshipCount,
    hasGeography: (row) => Boolean(row.presenceCountries),
    hasAnySegment: () => false
  }

  assert.equal(relationStateLabel.call(context, companyDetails), 'Есть (1)')
  assert.equal(nextActionLabel.call(context, companyDetails), 'Карточка готова к работе')
  assert.equal(detailsFocusHint.call(context, companyDetails), 'Карточка в рабочем состоянии. Можно использовать её в операционной работе.')
})
