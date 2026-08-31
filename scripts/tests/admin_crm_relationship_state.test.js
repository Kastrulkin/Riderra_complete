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

test('supplier route table uses net prices and a readable source note', () => {
  const routeNoteLabel = extractMethod(
    '    routeNoteLabel\\(route\\) \\{',
    ',\\n    formatMoney',
    'routeNoteLabel'
  )
  const route = {
    driverPrice: 80,
    currency: 'CAD',
    sourceType: 'whatsapp',
    sourceMessage: '[25.05, 23:15] Стас Голяков Ванкувер: Из аэропорта, sedan, SUV'
  }

  assert.match(source, /Нетто-тарифы/)
  assert.match(source, /formatMoney\(route\.driverPrice, route\.currency\)/)
  assert.equal(routeNoteLabel(route), 'Из аэропорта, sedan, SUV')
})

test('manager contacts lead the company detail flow and span both columns', () => {
  const sectionsStart = source.indexOf('<div class="detail-sections">')
  const managerSection = source.indexOf('Менеджеры и контакты', sectionsStart)
  const priceSection = source.indexOf('Согласованные цены', sectionsStart)
  const managerMarkup = source.slice(sectionsStart, managerSection)

  assert.ok(sectionsStart >= 0)
  assert.ok(managerSection > sectionsStart)
  assert.ok(managerSection < priceSection)
  assert.match(managerMarkup, /crm-detail-panel--wide/)
})

test('supplier rate search matches route, class, price and currency together', () => {
  const filteredSupplierRoutes = extractMethod(
    '    filteredSupplierRoutes\\(driver\\) \\{',
    ',\\n    routeNoteLabel',
    'filteredSupplierRoutes'
  )
  const matchingRoute = {
    id: 'airport-sedan',
    fromPoint: 'Vancouver International Airport (YVR)',
    toPoint: 'Vancouver',
    vehicleType: 'sedan',
    driverPrice: 60,
    currency: 'CAD'
  }
  const driver = {
    id: 'driver-1',
    routes: [
      matchingRoute,
      { id: 'port-van', fromPoint: 'Port of Vancouver', toPoint: 'Surrey', vehicleType: 'van', driverPrice: 120, currency: 'CAD' }
    ]
  }
  const context = {
    supplierRateQueries: { 'driver-1': 'airport sedan 60 cad' },
    routeNoteLabel: () => 'Внесено вручную'
  }

  assert.deepEqual(filteredSupplierRoutes.call(context, driver), [matchingRoute])
  assert.match(source, /Найти маршрут, класс, цену или примечание/)
})

test('supplier pricebook does not claim prices are missing when driver net rates exist', () => {
  const emptyStateMarkup = source.match(/<div v-else-if="!companyPricebook\.supplier\.loading[^>]*>[\s\S]*?Закупочный прайс пока не внесён[\s\S]*?<\/div>/)

  assert.ok(emptyStateMarkup, 'supplier pricebook empty state must remain discoverable')
  assert.match(
    emptyStateMarkup[0],
    /!supplierDriverRateCount/,
    'the empty state must be hidden when linked drivers already have active net rates'
  )
})
