const {
  SMART_RYDE_DEFAULTS,
  applyPricingPolicy,
  defaultSourceData,
  executePriceComparisonRun,
  nextScheduledServiceAt
} = require('../services/priceComparisonService')
const { buildPriceComparisonWorkbook } = require('../services/priceComparisonExportService')

function parseJson(value, fallback) {
  try { return value ? JSON.parse(value) : fallback } catch (_) { return fallback }
}

function serializeSource(row) {
  return {
    ...row,
    supportedCurrencies: parseJson(row.supportedCurrenciesJson, []),
    schedule: parseJson(row.scheduleJson, {}),
    passengers: parseJson(row.passengerConfigJson, {}),
    pricingPolicy: parseJson(row.pricingPolicyJson, {})
  }
}

function normalizeRoutePairs(value) {
  if (!Array.isArray(value)) return []
  const unique = new Map()
  for (const pair of value.slice(0, 100)) {
    const routeFrom = String(pair?.routeFrom || '').trim()
    const routeTo = String(pair?.routeTo || '').trim()
    if (routeFrom && routeTo) unique.set(`${routeFrom}\u0000${routeTo}`, { routeFrom, routeTo })
  }
  return Array.from(unique.values())
}

function withCoverageOpportunities(run) {
  const quotes = Array.isArray(run?.quotes) ? run.quotes : []
  const coverageOpportunityCount = new Set(quotes
    .filter((quote) => quote.status === 'no_quote')
    .map((quote) => `${quote.routeFrom}\u0000${quote.routeTo}`)).size
  return { ...run, coverageOpportunityCount }
}

function registerPricingComparisonRoutes(app, dependencies) {
  const {
    prisma,
    authenticateToken,
    resolveActorContext,
    requireActorContext,
    requireCan,
    writeAuditLog
  } = dependencies
  const canRead = [authenticateToken, resolveActorContext, requireActorContext, requireCan('pricing.read', 'pricing')]
  const canManage = [authenticateToken, resolveActorContext, requireActorContext, requireCan('pricing.manage', 'pricing')]

  app.get('/api/admin/pricing/comparison-sources', ...canRead, async (req, res) => {
    try {
      const rows = await prisma.priceComparisonSource.findMany({
        where: { tenantId: req.actorContext.tenantId },
        include: { customerCompany: { select: { id: true, name: true } }, runs: { orderBy: { createdAt: 'desc' }, take: 5 } },
        orderBy: [{ isActive: 'desc' }, { name: 'asc' }]
      })
      res.json({ rows: rows.map(serializeSource) })
    } catch (error) {
      console.error('Error listing price comparison sources:', error)
      res.status(500).json({ error: 'Failed to list comparison sources' })
    }
  })

  app.post('/api/admin/pricing/comparison-sources', ...canManage, async (req, res) => {
    try {
      const adapterKey = String(req.body?.adapterKey || 'smart-ryde').trim()
      if (adapterKey !== 'smart-ryde') return res.status(400).json({ error: 'Adapter is not installed' })
      const data = defaultSourceData(req.body || {})
      const sourceUrl = new URL(data.baseUrl)
      if (sourceUrl.protocol !== 'https:' || sourceUrl.hostname !== new URL(SMART_RYDE_DEFAULTS.baseUrl).hostname) {
        return res.status(400).json({ error: 'SmartRyde adapter URL is not allowed' })
      }
      applyPricingPolicy(100, JSON.parse(data.pricingPolicyJson))
      const row = await prisma.priceComparisonSource.upsert({
        where: { tenantId_adapterKey: { tenantId: req.actorContext.tenantId, adapterKey } },
        update: { ...data, customerCompanyId: req.body?.customerCompanyId || null },
        create: { tenantId: req.actorContext.tenantId, customerCompanyId: req.body?.customerCompanyId || null, ...data }
      })
      await writeAuditLog({
        tenantId: req.actorContext.tenantId,
        actorId: req.actorContext.actorId,
        actorRole: req.actorContext.actorRole,
        action: 'pricing.comparison_source.configure',
        resource: 'price_comparison_source',
        resourceId: row.id,
        traceId: req.actorContext.traceId,
        decision: 'human_approved',
        result: 'ok',
        context: { name: row.name, adapterKey: row.adapterKey, formulaVersion: row.formulaVersion }
      })
      res.status(201).json(serializeSource(row))
    } catch (error) {
      console.error('Error configuring price comparison source:', error)
      res.status(500).json({ error: error.message || 'Failed to configure comparison source' })
    }
  })

  app.get('/api/admin/pricing/comparison-runs', ...canRead, async (req, res) => {
    try {
      const where = { tenantId: req.actorContext.tenantId }
      if (req.query.sourceId) where.sourceId = String(req.query.sourceId)
      const rows = await prisma.priceComparisonRun.findMany({
        where,
        include: {
          source: { select: { id: true, name: true, adapterKey: true } },
          quotes: { where: { status: 'no_quote' }, select: { routeFrom: true, routeTo: true, status: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: Math.min(Number(req.query.limit) || 50, 200)
      })
      res.json({ rows: rows.map(withCoverageOpportunities) })
    } catch (error) {
      res.status(500).json({ error: 'Failed to list comparison runs' })
    }
  })

  app.post('/api/admin/pricing/comparison-runs', ...canManage, async (req, res) => {
    try {
      const source = await prisma.priceComparisonSource.findFirst({
        where: { id: String(req.body?.sourceId || ''), tenantId: req.actorContext.tenantId, isActive: true }
      })
      if (!source) return res.status(404).json({ error: 'Comparison source not found' })
      const routePairs = normalizeRoutePairs(req.body?.routePairs)
      const routeScope = routePairs.length ? { OR: routePairs } : {}
      const routeCount = await prisma.cityPricing.count({
        where: {
          tenantId: req.actorContext.tenantId,
          isActive: true,
          fixedPrice: { not: null },
          routeFrom: { not: null },
          routeTo: { not: null },
          vehicleType: { not: null },
          ...routeScope
        }
      })
      const schedule = parseJson(source.scheduleJson, {})
      const serviceAt = req.body?.serviceAt ? new Date(req.body.serviceAt) : nextScheduledServiceAt(new Date(), schedule)
      if (Number.isNaN(serviceAt.getTime())) return res.status(400).json({ error: 'Invalid serviceAt' })
      const row = await prisma.priceComparisonRun.create({
        data: {
          tenantId: req.actorContext.tenantId,
          sourceId: source.id,
          status: 'configured',
          serviceAt,
          formulaVersion: source.formulaVersion,
          pricingPolicyJson: source.pricingPolicyJson,
          scopeJson: routePairs.length ? JSON.stringify({ type: 'route_pairs', routePairs }) : null,
          routeCount,
          createdByUserId: req.actorContext.actorId || null
        },
        include: { source: true }
      })
      await writeAuditLog({
        tenantId: req.actorContext.tenantId,
        actorId: req.actorContext.actorId,
        actorRole: req.actorContext.actorRole,
        action: 'pricing.comparison_run.create',
        resource: 'price_comparison_run',
        resourceId: row.id,
        traceId: req.actorContext.traceId,
        decision: 'human_approved',
        result: 'ok',
        context: { sourceId: source.id, serviceAt, routeCount, formulaVersion: source.formulaVersion, routePairs }
      })
      res.status(201).json(row)
    } catch (error) {
      console.error('Error creating comparison run:', error)
      res.status(500).json({ error: error.message || 'Failed to create comparison run' })
    }
  })

  app.get('/api/admin/pricing/comparison-runs/:id', ...canRead, async (req, res) => {
    const row = await prisma.priceComparisonRun.findFirst({
      where: { id: req.params.id, tenantId: req.actorContext.tenantId },
      include: { source: true }
    })
    if (!row) return res.status(404).json({ error: 'Comparison run not found' })
    res.json(row)
  })

  app.post('/api/admin/pricing/comparison-runs/:id/execute', ...canManage, async (req, res) => {
    const run = await prisma.priceComparisonRun.findFirst({ where: { id: req.params.id, tenantId: req.actorContext.tenantId } })
    if (!run) return res.status(404).json({ error: 'Comparison run not found' })
    executePriceComparisonRun({ prisma, runId: run.id }).catch((error) => {
      console.error(`Price comparison run ${run.id} failed:`, error)
    })
    await writeAuditLog({
      tenantId: req.actorContext.tenantId,
      actorId: req.actorContext.actorId,
      actorRole: req.actorContext.actorRole,
      action: 'pricing.comparison_run.execute',
      resource: 'price_comparison_run',
      resourceId: run.id,
      traceId: req.actorContext.traceId,
      decision: 'human_approved',
      result: 'accepted',
      context: { resume: ['running', 'needs_review', 'failed'].includes(run.status) }
    })
    res.status(202).json({ id: run.id, status: 'running' })
  })

  app.get('/api/admin/pricing/comparison-runs/:id/results', ...canRead, async (req, res) => {
    const run = await prisma.priceComparisonRun.findFirst({
      where: { id: req.params.id, tenantId: req.actorContext.tenantId },
      include: {
        source: true,
        quotes: { include: { result: true, cityPricing: { select: { country: true, city: true } } }, orderBy: [{ routeFrom: 'asc' }, { routeTo: 'asc' }, { requestedVehicleType: 'asc' }] }
      }
    })
    if (!run) return res.status(404).json({ error: 'Comparison run not found' })
    const [placeMappings, vehicleMappings] = await Promise.all([
      prisma.priceComparisonPlaceMap.findMany({ where: { sourceId: run.sourceId, status: 'needs_review' }, orderBy: { inputText: 'asc' } }),
      prisma.priceComparisonVehicleMap.findMany({ where: { sourceId: run.sourceId }, orderBy: [{ status: 'asc' }, { externalVehicleName: 'asc' }] })
    ])
    res.json({ run: withCoverageOpportunities(run), rows: run.quotes, placeMappings, vehicleMappings })
  })

  app.get('/api/admin/pricing/external-quotes', ...canRead, async (req, res) => {
    try {
      const where = { tenantId: req.actorContext.tenantId }
      if (req.query.sourceId) where.sourceId = String(req.query.sourceId)
      if (req.query.currency) where.currency = String(req.query.currency).toUpperCase()
      if (req.query.from) where.routeFrom = { contains: String(req.query.from), mode: 'insensitive' }
      if (req.query.to) where.routeTo = { contains: String(req.query.to), mode: 'insensitive' }
      const freshDays = Number(req.query.freshDays)
      if (Number.isFinite(freshDays) && freshDays > 0) {
        where.quotedAt = { gte: new Date(Date.now() - Math.min(freshDays, 365) * 86400000) }
      }
      const rows = await prisma.externalTransferPriceSnapshot.findMany({
        where,
        include: { source: { select: { id: true, name: true, adapterKey: true } } },
        orderBy: { quotedAt: 'desc' },
        take: Math.min(Math.max(Number(req.query.limit) || 100, 1), 500)
      })
      res.json({ rows })
    } catch (error) {
      console.error('Error listing external transfer quotes:', error)
      res.status(500).json({ error: 'Failed to list external transfer quotes' })
    }
  })

  app.get('/api/admin/pricing/external-quotes/coverage', ...canRead, async (req, res) => {
    try {
      const where = { tenantId: req.actorContext.tenantId }
      if (req.query.sourceId) where.sourceId = String(req.query.sourceId)
      const [totalQuotes, routeRows, currencies, latest] = await Promise.all([
        prisma.externalTransferPriceSnapshot.count({ where }),
        prisma.externalTransferPriceSnapshot.findMany({ where, distinct: ['routeKey'], select: { routeKey: true } }),
        prisma.externalTransferPriceSnapshot.groupBy({ by: ['currency'], where, _count: { _all: true } }),
        prisma.externalTransferPriceSnapshot.findFirst({ where, orderBy: { quotedAt: 'desc' }, select: { quotedAt: true } })
      ])
      res.json({
        totalQuotes,
        uniqueRoutes: routeRows.length,
        currencies: currencies.map((row) => ({ currency: row.currency, count: row._count._all })),
        latestQuotedAt: latest?.quotedAt || null
      })
    } catch (error) {
      console.error('Error reading external quote coverage:', error)
      res.status(500).json({ error: 'Failed to read external quote coverage' })
    }
  })

  app.put('/api/admin/pricing/comparison-mappings/places/:id', ...canManage, async (req, res) => {
    const existing = await prisma.priceComparisonPlaceMap.findFirst({ where: { id: req.params.id, tenantId: req.actorContext.tenantId } })
    if (!existing) return res.status(404).json({ error: 'Place mapping not found' })
    const externalPlaceId = String(req.body?.externalPlaceId || '').trim()
    const externalLabel = String(req.body?.externalLabel || '').trim()
    if (!externalPlaceId || !externalLabel) return res.status(400).json({ error: 'externalPlaceId and externalLabel are required' })
    const row = await prisma.priceComparisonPlaceMap.update({
      where: { id: existing.id },
      data: { externalPlaceId, externalLabel, status: 'approved', approvedAt: new Date(), approvedByUserId: req.actorContext.actorId || null }
    })
    res.json(row)
  })

  app.put('/api/admin/pricing/comparison-mappings/vehicles', ...canManage, async (req, res) => {
    const source = await prisma.priceComparisonSource.findFirst({ where: { id: String(req.body?.sourceId || ''), tenantId: req.actorContext.tenantId } })
    if (!source) return res.status(404).json({ error: 'Comparison source not found' })
    const externalVehicleKey = String(req.body?.externalVehicleKey || '').trim()
    const externalVehicleName = String(req.body?.externalVehicleName || externalVehicleKey).trim()
    const riderraVehicleType = String(req.body?.riderraVehicleType || '').trim()
    if (!externalVehicleKey || !riderraVehicleType) return res.status(400).json({ error: 'Vehicle mapping fields are required' })
    const row = await prisma.priceComparisonVehicleMap.upsert({
      where: { sourceId_externalVehicleKey_riderraVehicleType: { sourceId: source.id, externalVehicleKey, riderraVehicleType } },
      update: { externalVehicleName, status: 'approved', approvedAt: new Date(), approvedByUserId: req.actorContext.actorId || null },
      create: {
        tenantId: req.actorContext.tenantId,
        sourceId: source.id,
        externalVehicleKey,
        externalVehicleName,
        riderraVehicleType,
        status: 'approved',
        approvedAt: new Date(),
        approvedByUserId: req.actorContext.actorId || null
      }
    })
    res.json(row)
  })

  app.get('/api/admin/pricing/comparison-runs/:id/export.xlsx', ...canRead, async (req, res) => {
    try {
      const run = await prisma.priceComparisonRun.findFirst({
        where: { id: req.params.id, tenantId: req.actorContext.tenantId },
        include: {
          source: true,
          quotes: { include: { result: true, cityPricing: { select: { country: true, city: true } } }, orderBy: [{ routeFrom: 'asc' }, { routeTo: 'asc' }, { requestedVehicleType: 'asc' }] }
        }
      })
      if (!run) return res.status(404).json({ error: 'Comparison run not found' })
      const buffer = await buildPriceComparisonWorkbook(run)
      const filename = `price-comparison-${run.source.adapterKey}-${run.serviceAt.toISOString().slice(0, 10)}.xlsx`
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      res.send(Buffer.from(buffer))
    } catch (error) {
      console.error('Error exporting price comparison:', error)
      res.status(500).json({ error: error.message || 'Failed to export comparison' })
    }
  })
}

module.exports = { registerPricingComparisonRoutes, serializeSource }
