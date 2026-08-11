const ExcelJS = require('exceljs')

const COLORS = {
  navy: '17233D',
  teal: '0F766E',
  green: 'DCFCE7',
  greenText: '166534',
  amber: 'FEF3C7',
  red: 'FEE2E2',
  gray: 'E2E8F0',
  white: 'FFFFFF'
}

function resultRows(run) {
  return run.quotes
    .filter((quote) => quote.status !== 'ignored')
    .map((quote) => ({
      country: quote.cityPricing?.country || '',
      city: quote.cityPricing?.city || '',
      routeFrom: quote.routeFrom,
      routeTo: quote.routeTo,
      vehicleType: quote.requestedVehicleType,
      riderraSellPrice: quote.riderraSellPrice,
      currency: quote.riderraCurrency,
      clientSellPrice: quote.clientSellPrice,
      targetPrice: quote.result?.targetPrice ?? null,
      gapAbs: quote.result?.opportunityGapAbs ?? null,
      gapPct: quote.result?.opportunityGapPct ?? null,
      status: quote.result?.status || quote.status,
      serviceAt: quote.serviceAt,
      quotedAt: quote.quotedAt,
      sourceUrl: (() => {
        try { return JSON.parse(quote.evidenceJson || '{}').sourceUrl || run.source.baseUrl } catch (_) { return run.source.baseUrl }
      })(),
      error: quote.error || ''
    }))
}

function styleHeader(row) {
  row.height = 24
  row.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navy } }
    cell.font = { bold: true, color: { argb: COLORS.white } }
    cell.alignment = { vertical: 'middle', horizontal: 'left' }
  })
}

function configureSheet(sheet, widths) {
  sheet.views = [{ state: 'frozen', ySplit: 1 }]
  sheet.properties.showGridLines = false
  sheet.columns = widths.map((width) => ({ width }))
  styleHeader(sheet.getRow(1))
  sheet.autoFilter = { from: 'A1', to: sheet.getRow(1).getCell(widths.length).address }
}

function addResultSheet(workbook, name, rows, policy, assumptionsSheetName = 'Assumptions') {
  const sheet = workbook.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] })
  const headers = ['Country', 'City', 'From', 'To', 'Vehicle', 'Riderra sell', 'Currency', 'Client sell', 'Target price', 'Gap', 'Gap %', 'Status', 'Service date', 'Quoted at', 'Source URL', 'Issue']
  sheet.addRow(headers)
  configureSheet(sheet, [16, 18, 28, 36, 22, 14, 10, 14, 14, 12, 11, 18, 15, 20, 44, 32])

  rows.forEach((row, index) => {
    const excelRow = index + 2
    const hasPrices = Number.isFinite(Number(row.riderraSellPrice)) && Number.isFinite(Number(row.clientSellPrice))
    const targetResult = hasPrices ? Number(row.targetPrice) : null
    const gapResult = hasPrices ? Number(row.gapAbs) : null
    const pctResult = hasPrices && Number(row.clientSellPrice) > 0 ? Number(row.gapPct) / 100 : null
    const clientBased = policy?.type === 'client_commission' || policy?.type === 'competitor_public_price'
    const targetFormula = clientBased
      ? `IF(OR(F${excelRow}="",H${excelRow}=""),"",ROUND(H${excelRow}*(1-'${assumptionsSheetName}'!$B$2),2))`
      : `IF(OR(F${excelRow}="",H${excelRow}=""),"",ROUND(F${excelRow}*(1-'${assumptionsSheetName}'!$B$2),2))`
    const gapFormula = clientBased
      ? `IF(OR(F${excelRow}="",I${excelRow}=""),"",ROUND(I${excelRow}-F${excelRow},2))`
      : `IF(OR(H${excelRow}="",I${excelRow}=""),"",ROUND(H${excelRow}-I${excelRow},2))`
    const pctFormula = clientBased
      ? `IF(OR(I${excelRow}=0,J${excelRow}=""),"",J${excelRow}/I${excelRow})`
      : `IF(OR(H${excelRow}=0,J${excelRow}=""),"",J${excelRow}/H${excelRow})`
    const opportunityFormula = clientBased ? `F${excelRow}<I${excelRow}` : `I${excelRow}<H${excelRow}`
    sheet.addRow([
      row.country,
      row.city,
      row.routeFrom,
      row.routeTo,
      row.vehicleType,
      row.riderraSellPrice,
      row.currency,
      row.clientSellPrice,
      { formula: targetFormula, result: targetResult },
      { formula: gapFormula, result: gapResult },
      { formula: pctFormula, result: pctResult },
      { formula: `IF(LEN(H${excelRow})=0,"${row.status === 'no_quote' ? 'coverage_opportunity' : 'needs_review'}",IF(${opportunityFormula},"opportunity","not_opportunity"))`, result: row.status === 'no_quote' ? 'coverage_opportunity' : row.status },
      row.serviceAt,
      row.quotedAt,
      row.sourceUrl,
      row.error
    ])
  })

  if (rows.length) {
    sheet.getColumn(6).numFmt = '#,##0.00'
    sheet.getColumn(8).numFmt = '#,##0.00'
    sheet.getColumn(9).numFmt = '#,##0.00'
    sheet.getColumn(10).numFmt = '#,##0.00'
    sheet.getColumn(11).numFmt = '0.0%'
    sheet.getColumn(13).numFmt = 'yyyy-mm-dd'
    sheet.getColumn(14).numFmt = 'yyyy-mm-dd hh:mm'
    sheet.addConditionalFormatting({
      ref: `L2:L${rows.length + 1}`,
      rules: [
        { type: 'containsText', operator: 'containsText', text: 'opportunity', style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: COLORS.green }, fgColor: { argb: COLORS.green } }, font: { color: { argb: COLORS.greenText }, bold: true } } },
        { type: 'containsText', operator: 'containsText', text: 'needs_review', style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: COLORS.amber }, fgColor: { argb: COLORS.amber } } } },
        { type: 'containsText', operator: 'containsText', text: 'failed', style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: COLORS.red }, fgColor: { argb: COLORS.red } } } }
      ]
    })
  }
  return sheet
}

async function buildPriceComparisonWorkbook(run) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Riderra'
  workbook.created = new Date()
  workbook.calcProperties.fullCalcOnLoad = true

  const rows = resultRows(run)
  const policy = JSON.parse(run.pricingPolicyJson || '{}')
  const opportunities = rows.filter((row) => row.status === 'opportunity')
  const coverageOpportunities = rows.filter((row) => row.status === 'no_quote')
  const coverageRouteCount = new Set(coverageOpportunities.map((row) => `${row.routeFrom}\u0000${row.routeTo}`)).size
  const needsReview = rows.filter((row) => ['needs_review', 'failed'].includes(row.status))

  const assumptions = workbook.addWorksheet('Assumptions')
  assumptions.addRows([
    ['Parameter', 'Value'],
    ['Commission / discount rate', Number(policy.commissionPercent ?? policy.discountPercent ?? 0) / 100],
    ['Formula version', run.formulaVersion],
    ['Source', run.source.name],
    ['Adapter', run.source.adapterKey],
    ['Base URL', run.source.baseUrl],
    ['Service date', run.serviceAt],
    ['Rule', policy.type === 'competitor_public_price'
      ? 'Competitive advantage: Riderra sell < competitor public sell. Equality is not an advantage.'
      : policy.type === 'client_commission'
        ? 'Price opportunity: Riderra sell < client public sell after commission. Coverage opportunity: partner returned no available vehicles.'
        : 'Price opportunity: target < client sell. Coverage opportunity: partner returned no available vehicles.']
  ])
  configureSheet(assumptions, [28, 88])
  assumptions.getCell('B2').numFmt = '0.0%'
  assumptions.getCell('B7').numFmt = 'yyyy-mm-dd hh:mm'

  const summary = workbook.addWorksheet('Summary')
  summary.addRows([
    ['Smart transfer price comparison', 'Value'],
    ['Source', run.source.name],
    ['Run status', run.status],
    ['Routes processed', run.processedCount],
    ['Green opportunities', { formula: `COUNTIF('All results'!L2:L${Math.max(2, rows.length + 1)},"opportunity")`, result: opportunities.length }],
    ['Coverage opportunities', coverageRouteCount],
    ['Needs review', { formula: `COUNTIF('All results'!L2:L${Math.max(2, rows.length + 1)},"needs_review")+COUNTIF('All results'!L2:L${Math.max(2, rows.length + 1)},"failed")`, result: needsReview.length }],
    ['Service date', run.serviceAt],
    ['Formula', run.formulaVersion]
  ])
  configureSheet(summary, [34, 34])
  summary.getCell('B8').numFmt = 'yyyy-mm-dd hh:mm'
  summary.getCell('A1').font = { bold: true, color: { argb: COLORS.white }, size: 14 }

  addResultSheet(workbook, 'Green opportunities', opportunities, policy)
  addResultSheet(workbook, 'Coverage opportunities', coverageOpportunities, policy)
  addResultSheet(workbook, 'All results', rows, policy)
  addResultSheet(workbook, 'Needs review', needsReview, policy)
  return workbook.xlsx.writeBuffer()
}

module.exports = { buildPriceComparisonWorkbook, resultRows }
