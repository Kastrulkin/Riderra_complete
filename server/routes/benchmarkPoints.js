const crypto = require('crypto')

const ALLOWED_STATUSES = new Set(['candidate', 'needs_review', 'verified', 'rejected'])

function clean(value, max = 500) {
  return String(value == null ? '' : value).trim().slice(0, max)
}

function optional(value, max = 500) {
  const result = clean(value, max)
  return result || null
}

function numberOrNull(value) {
  if (value === '' || value == null) return null
  const result = Number(value)
  return Number.isFinite(result) ? result : null
}

function normalize(value) {
  return clean(value, 1000).toLowerCase().replace(/\s+/g, ' ')
}

function normalizedKey(data) {
  return crypto.createHash('sha256').update([
    normalize(data.airportIata),
    normalize(data.pickupAddress),
    normalize(data.destinationAddress)
  ].join('|')).digest('hex')
}

function pointData(body = {}, defaults = {}) {
  const pickupAddress = clean(body.pickupAddress || defaults.pickupAddress)
  const destinationAddress = clean(body.destinationAddress || defaults.destinationAddress)
  if (!pickupAddress || !destinationAddress) throw new Error('Pickup and destination addresses are required')
  const latitude = numberOrNull(body.latitude ?? defaults.latitude)
  const longitude = numberOrNull(body.longitude ?? defaults.longitude)
  if ((latitude == null) !== (longitude == null)) throw new Error('Latitude and longitude must be provided together')
  if (latitude != null && (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180)) {
    throw new Error('Coordinates are outside valid bounds')
  }
  const data = {
    country: optional(body.country ?? defaults.country, 120),
    city: optional(body.city ?? defaults.city, 160),
    airportIata: optional(body.airportIata ?? defaults.airportIata, 8)?.toUpperCase() || null,
    pickupAddress,
    destinationAddress,
    zoneId: optional(body.zoneId ?? defaults.zoneId, 200),
    zoneName: optional(body.zoneName ?? defaults.zoneName, 300),
    latitude,
    longitude,
    source: optional(body.source ?? defaults.source, 80) || 'manual',
    sourceFileName: optional(body.sourceFileName ?? defaults.sourceFileName, 300),
    sourceSheetName: optional(body.sourceSheetName ?? defaults.sourceSheetName, 160),
    sourceRowNumber: numberOrNull(body.sourceRowNumber ?? defaults.sourceRowNumber),
    sourceDistanceKm: numberOrNull(body.sourceDistanceKm ?? defaults.sourceDistanceKm),
    smartRydePickupPlaceId: optional(body.smartRydePickupPlaceId ?? defaults.smartRydePickupPlaceId, 300),
    smartRydePickupLabel: optional(body.smartRydePickupLabel ?? defaults.smartRydePickupLabel, 500),
    smartRydeDropoffPlaceId: optional(body.smartRydeDropoffPlaceId ?? defaults.smartRydeDropoffPlaceId, 300),
    smartRydeDropoffLabel: optional(body.smartRydeDropoffLabel ?? defaults.smartRydeDropoffLabel, 500),
    reviewNote: optional(body.reviewNote ?? defaults.reviewNote, 1000)
  }
  data.normalizedKey = normalizedKey(data)
  return data
}

async function audit(writeAuditLog, req, action, resourceId, context = {}) {
  if (!writeAuditLog) return
  await writeAuditLog({
    tenantId: req.actorContext.tenantId,
    actorId: req.actorContext.actorId,
    actorRole: req.actorContext.actorRole,
    action,
    resource: 'geo_zone_benchmark_point',
    resourceId,
    traceId: req.actorContext.traceId,
    decision: 'human_approved',
    result: 'ok',
    context
  })
}

function registerBenchmarkPointRoutes(app, dependencies) {
  const {
    prisma,
    authenticateToken,
    resolveActorContext,
    requireActorContext,
    requireCan,
    writeAuditLog,
    loadGeoZoneIndex,
    findGeoZoneForGeoResult
  } = dependencies
  const canRead = [authenticateToken, resolveActorContext, requireActorContext, requireCan('pricing.read', 'pricing')]
  const canManage = [authenticateToken, resolveActorContext, requireActorContext, requireCan('pricing.manage', 'pricing')]

  app.get('/api/admin/directions/benchmark-points', ...canRead, async (req, res) => {
    try {
      const where = { tenantId: req.actorContext.tenantId }
      const status = clean(req.query.status, 40)
      const q = clean(req.query.q, 200)
      if (status && ALLOWED_STATUSES.has(status)) where.status = status
      if (q) {
        where.OR = ['country', 'city', 'airportIata', 'pickupAddress', 'destinationAddress', 'zoneName'].map((field) => ({
          [field]: { contains: q, mode: 'insensitive' }
        }))
      }
      const take = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500)
      const skip = Math.max(Number(req.query.offset) || 0, 0)
      const [rows, total, grouped, coveredZones] = await Promise.all([
        prisma.geoZoneBenchmarkPoint.findMany({ where, orderBy: [{ status: 'asc' }, { country: 'asc' }, { city: 'asc' }], take, skip }),
        prisma.geoZoneBenchmarkPoint.count({ where }),
        prisma.geoZoneBenchmarkPoint.groupBy({ by: ['status'], where: { tenantId: req.actorContext.tenantId }, _count: { _all: true } }),
        prisma.geoZoneBenchmarkPoint.findMany({ where: { tenantId: req.actorContext.tenantId, status: 'verified', zoneName: { not: null } }, distinct: ['zoneName'], select: { zoneName: true } })
      ])
      const summary = { total: 0, candidate: 0, needs_review: 0, verified: 0, rejected: 0, coveredZones: coveredZones.length }
      for (const item of grouped) {
        summary[item.status] = item._count._all
        summary.total += item._count._all
      }
      res.json({ rows, total, offset: skip, limit: take, summary })
    } catch (error) {
      console.error('Error listing benchmark points:', error)
      res.status(500).json({ error: 'Failed to list benchmark points' })
    }
  })

  app.get('/api/admin/directions/geo-zone-catalog', ...canRead, async (req, res) => {
    try {
      const index = await loadGeoZoneIndex(req.actorContext.tenantId)
      const rows = (index?.zones || []).map((zone) => ({ id: zone.id || null, name: zone.name })).filter((zone) => zone.name)
      res.json({ configured: Boolean(index?.manifest), polygonZoneCount: index?.polygonZoneCount || 0, rows })
    } catch (error) {
      res.status(500).json({ error: 'Failed to load geo-zone catalog' })
    }
  })

  app.post('/api/admin/directions/benchmark-points', ...canManage, async (req, res) => {
    try {
      const data = pointData(req.body)
      let matchedZone = null
      if (data.latitude != null) {
        matchedZone = await findGeoZoneForGeoResult(req.actorContext.tenantId, { lat: data.latitude, lon: data.longitude })
        if (matchedZone) {
          data.zoneId = matchedZone.id
          data.zoneName = matchedZone.name
        }
      }
      const requestedStatus = ALLOWED_STATUSES.has(req.body?.status) ? req.body.status : 'candidate'
      const status = requestedStatus === 'verified' && !data.zoneName ? 'needs_review' : requestedStatus
      const row = await prisma.geoZoneBenchmarkPoint.upsert({
        where: { tenantId_normalizedKey: { tenantId: req.actorContext.tenantId, normalizedKey: data.normalizedKey } },
        update: { ...data, status, verifiedAt: status === 'verified' ? new Date() : null, verifiedByUserId: status === 'verified' ? req.actorContext.actorId : null },
        create: { tenantId: req.actorContext.tenantId, ...data, status, verifiedAt: status === 'verified' ? new Date() : null, verifiedByUserId: status === 'verified' ? req.actorContext.actorId : null }
      })
      await audit(writeAuditLog, req, 'directions.benchmark_point.upsert', row.id, { status, matchedZone: matchedZone?.name || null })
      res.status(201).json(row)
    } catch (error) {
      const duplicate = error?.code === 'P2002'
      res.status(duplicate ? 409 : 400).json({ error: duplicate ? 'Benchmark point already exists' : error.message })
    }
  })

  app.post('/api/admin/directions/benchmark-points/import', ...canManage, async (req, res) => {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : []
    if (!rows.length || rows.length > 5000) return res.status(400).json({ error: 'Import must contain 1 to 5000 rows' })
    let created = 0
    let updated = 0
    const errors = []
    for (let index = 0; index < rows.length; index += 1) {
      try {
        const data = pointData(rows[index], { source: req.body?.source || 'booking_workbook', sourceFileName: req.body?.sourceFileName, sourceSheetName: req.body?.sourceSheetName })
        const existing = await prisma.geoZoneBenchmarkPoint.findUnique({ where: { tenantId_normalizedKey: { tenantId: req.actorContext.tenantId, normalizedKey: data.normalizedKey } }, select: { id: true } })
        await prisma.geoZoneBenchmarkPoint.upsert({
          where: { tenantId_normalizedKey: { tenantId: req.actorContext.tenantId, normalizedKey: data.normalizedKey } },
          update: data,
          create: { tenantId: req.actorContext.tenantId, ...data, status: 'candidate' }
        })
        if (existing) updated += 1
        else created += 1
      } catch (error) {
        errors.push({ row: index + 1, error: error.message })
      }
    }
    await audit(writeAuditLog, req, 'directions.benchmark_points.import', 'bulk', { created, updated, failed: errors.length, sourceFileName: req.body?.sourceFileName || null })
    res.status(errors.length === rows.length ? 400 : 201).json({ created, updated, failed: errors.length, errors: errors.slice(0, 50) })
  })

  app.put('/api/admin/directions/benchmark-points/:id', ...canManage, async (req, res) => {
    try {
      const existing = await prisma.geoZoneBenchmarkPoint.findFirst({ where: { id: req.params.id, tenantId: req.actorContext.tenantId } })
      if (!existing) return res.status(404).json({ error: 'Benchmark point not found' })
      const data = pointData(req.body, existing)
      let coordinateZone = null
      if (data.latitude != null) {
        coordinateZone = await findGeoZoneForGeoResult(req.actorContext.tenantId, { lat: data.latitude, lon: data.longitude })
        if (coordinateZone) {
          data.zoneId = coordinateZone.id
          data.zoneName = coordinateZone.name
        }
      }
      let status = ALLOWED_STATUSES.has(req.body?.status) ? req.body.status : existing.status
      if (status === 'verified' && !data.zoneName) status = 'needs_review'
      const row = await prisma.geoZoneBenchmarkPoint.update({
        where: { id: existing.id },
        data: { ...data, status, verifiedAt: status === 'verified' ? new Date() : null, verifiedByUserId: status === 'verified' ? req.actorContext.actorId : null }
      })
      await audit(writeAuditLog, req, 'directions.benchmark_point.update', row.id, { status, zoneName: row.zoneName })
      res.json(row)
    } catch (error) {
      res.status(error?.code === 'P2002' ? 409 : 400).json({ error: error?.code === 'P2002' ? 'Benchmark point already exists' : error.message })
    }
  })
}

module.exports = { registerBenchmarkPointRoutes, normalizedKey, pointData }
