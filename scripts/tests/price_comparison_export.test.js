const test = require('node:test')
const assert = require('node:assert/strict')
const ExcelJS = require('exceljs')
const { buildPriceComparisonWorkbook } = require('../../server/services/priceComparisonExportService')

function fixtureRun() {
  return {
    id: 'run-1',
    status: 'ready',
    processedCount: 1,
    opportunitiesCount: 1,
    needsReviewCount: 0,
    formulaVersion: 'smart-ryde-v1',
    pricingPolicyJson: JSON.stringify({ type: 'percentage_discount', discountPercent: 30 }),
    serviceAt: new Date('2026-08-12T12:00:00Z'),
    source: { name: 'SmartRyde', adapterKey: 'smart-ryde', baseUrl: 'https://smart-ryde.com' },
    quotes: [{
      id: 'quote-1',
      status: 'compared',
      routeFrom: 'LHR',
      routeTo: 'Hotel',
      requestedVehicleType: 'Standard Sedan',
      riderraSellPrice: 100,
      riderraCurrency: 'EUR',
      clientSellPrice: 90,
      clientCurrency: 'EUR',
      serviceAt: new Date('2026-08-12T12:00:00Z'),
      quotedAt: new Date('2026-08-04T10:00:00Z'),
      evidenceJson: JSON.stringify({ sourceUrl: 'https://smart-ryde.com/search?test=1' }),
      cityPricing: { country: 'United Kingdom', city: 'London' },
      result: { targetPrice: 70, opportunityGapAbs: 20, opportunityGapPct: 22.22, status: 'opportunity' }
    }, {
      id: 'quote-2', status: 'no_quote', routeFrom: 'LHR', routeTo: 'New destination', requestedVehicleType: 'Standard Sedan',
      riderraSellPrice: 120, riderraCurrency: 'EUR', clientSellPrice: null, clientCurrency: null,
      serviceAt: new Date('2026-08-12T12:00:00Z'), quotedAt: null, evidenceJson: null,
      error: 'SmartRyde returned no available vehicles', cityPricing: { country: 'United Kingdom', city: 'London' }, result: null
    }]
  }
}

test('Excel export contains required sheets and auditable formulas', async () => {
  const buffer = await buildPriceComparisonWorkbook(fixtureRun())
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  assert.deepEqual(workbook.worksheets.map((sheet) => sheet.name), ['Assumptions', 'Summary', 'Green opportunities', 'Coverage opportunities', 'All results', 'Needs review'])
  assert.equal(workbook.getWorksheet('Assumptions').getCell('B2').value, 0.3)
  assert.match(workbook.getWorksheet('All results').getCell('I2').value.formula, /Assumptions/)
  assert.equal(workbook.getWorksheet('All results').getCell('L2').value.result, 'opportunity')
  assert.equal(workbook.getWorksheet('Green opportunities').rowCount, 2)
  assert.equal(workbook.getWorksheet('Coverage opportunities').getCell('L2').value.result, 'coverage_opportunity')
})
