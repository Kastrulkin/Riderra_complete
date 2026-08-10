const BOOKING_SIMON_FORMULA_VERSION = 'booking-simon-v1'
const BOOKING_DISTANCE_POINTS = Object.freeze([5, 10, 20, 40, 60])

function numberOrZero(value) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : 0
}

function roundDown(value, digits = 1) {
  if (!Number.isFinite(Number(value))) return 0
  const factor = 10 ** digits
  return Math.floor((Number(value) + Number.EPSILON) * factor) / factor
}

function calculateSimonDriverGrid(publicPrices = {}, options = {}) {
  const bookingCommissionPercent = Number(options.bookingCommissionPercent ?? 25)
  const pmfPercent = Number(options.pmfPercent ?? 20)
  const exchangeRate = Number(options.exchangeRate ?? 1)
  const afterCommission = {}
  for (const distance of BOOKING_DISTANCE_POINTS) {
    afterCommission[distance] = numberOrZero(publicPrices[distance]) * (1 - bookingCommissionPercent / 100) * exchangeRate
  }

  const p5 = afterCommission[5]
  const p10 = afterCommission[10]
  const p20 = afterCommission[20]
  const p40 = afterCommission[40]
  const p60 = afterCommission[60]
  const pmfFactor = 1 - pmfPercent / 100

  const basePrice = p5 === 0 ? 0 : roundDown((p10 < p5 ? p10 : p5) * pmfFactor)
  const rate5to10 = p10 === 0
    ? 0
    : roundDown((p10 < p5 ? p10 - p10 : p10 - p5) / 5 * pmfFactor)
  const rate10to20 = p20 === 0
    ? 0
    : roundDown((rate5to10 <= 0 ? p20 - p5 : p20 - p10) / 10 * pmfFactor)
  const rate20to40 = p40 === 0
    ? 0
    : roundDown((rate10to20 <= 0 ? p40 - p5 : p40 - p20) / 20 * pmfFactor)
  const rate40to60 = p60 === 0
    ? 0
    : roundDown((rate20to40 <= 0 ? p60 - p5 : p60 - p40) / 20 * pmfFactor)

  const driverPrices = {
    5: p5 === 0 ? 0 : basePrice,
    10: p10 === 0 ? 0 : basePrice + rate5to10 * 5,
    20: p20 === 0 ? 0 : basePrice + rate5to10 * 5 + rate10to20 * 10,
    40: p40 === 0 ? 0 : basePrice + rate5to10 * 5 + rate10to20 * 10 + rate20to40 * 20,
    60: p60 === 0 ? 0 : basePrice + rate5to10 * 5 + rate10to20 * 10 + rate20to40 * 20 + rate40to60 * 20
  }

  return {
    formulaVersion: BOOKING_SIMON_FORMULA_VERSION,
    bookingCommissionPercent,
    pmfPercent,
    exchangeRate,
    afterCommission,
    driverPrices,
    tariff: {
      baseDistanceKm: 5,
      basePrice,
      bands: [
        { fromKm: 5, toKm: 10, pricePerKm: rate5to10 },
        { fromKm: 10, toKm: 20, pricePerKm: rate10to20 },
        { fromKm: 20, toKm: 40, pricePerKm: rate20to40 },
        { fromKm: 40, toKm: 60, pricePerKm: rate40to60 }
      ]
    }
  }
}

function parseEvidence(value) {
  try { return value ? JSON.parse(value) : {} } catch (_) { return {} }
}

function snapshotPointMeta(snapshot) {
  const evidence = parseEvidence(snapshot.evidenceJson)
  const dataset = evidence.dataset || evidence
  const distanceKm = Number(dataset.distanceKm)
  return {
    country: String(dataset.country || '').trim(),
    city: String(dataset.city || '').trim(),
    iata: String(dataset.iata || '').trim().toUpperCase(),
    distanceKm: BOOKING_DISTANCE_POINTS.includes(distanceKm) ? distanceKm : null,
    openCity: Boolean(dataset.openCity)
  }
}

function buildBookingCalculationRows(snapshots, options = {}) {
  const latestByPoint = new Map()
  const ordered = [...(snapshots || [])].sort((left, right) => new Date(right.quotedAt) - new Date(left.quotedAt))
  for (const snapshot of ordered) {
    const meta = snapshotPointMeta(snapshot)
    if (!meta.iata || !meta.distanceKm) continue
    const key = [meta.iata, meta.country, meta.city, snapshot.externalVehicleKey, meta.distanceKm].join('|')
    if (!latestByPoint.has(key)) latestByPoint.set(key, { snapshot, meta })
  }

  const groups = new Map()
  for (const { snapshot, meta } of latestByPoint.values()) {
    const groupKey = [meta.iata, meta.country, meta.city, snapshot.externalVehicleKey].join('|')
    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        key: groupKey,
        iata: meta.iata,
        country: meta.country,
        city: meta.city,
        openCity: meta.openCity,
        vehicleKey: snapshot.externalVehicleKey,
        vehicleName: snapshot.externalVehicleName,
        currency: snapshot.currency,
        points: {}
      })
    }
    const group = groups.get(groupKey)
    group.openCity = group.openCity || meta.openCity
    group.points[meta.distanceKm] = {
      distanceKm: meta.distanceKm,
      routeFrom: snapshot.routeFrom,
      routeTo: snapshot.routeTo,
      publicSellPrice: Number(snapshot.publicSellPrice),
      quotedAt: snapshot.quotedAt,
      quoteKind: snapshot.quoteKind,
      sourceUrl: snapshot.sourceUrl,
      runId: snapshot.runId
    }
  }

  return Array.from(groups.values()).map((group) => {
    const publicPrices = Object.fromEntries(BOOKING_DISTANCE_POINTS.map((distance) => [distance, group.points[distance]?.publicSellPrice || 0]))
    const calculation = calculateSimonDriverGrid(publicPrices, options)
    return {
      ...group,
      formulaVersion: calculation.formulaVersion,
      bookingCommissionPercent: calculation.bookingCommissionPercent,
      pmfPercent: calculation.pmfPercent,
      tariff: calculation.tariff,
      points: BOOKING_DISTANCE_POINTS.map((distance) => ({
        distanceKm: distance,
        ...(group.points[distance] || {}),
        publicSellPrice: publicPrices[distance],
        afterBookingCommission: calculation.afterCommission[distance],
        driverTargetPrice: calculation.driverPrices[distance]
      }))
    }
  }).sort((left, right) => `${left.country}|${left.city}|${left.iata}|${left.vehicleName}`.localeCompare(`${right.country}|${right.city}|${right.iata}|${right.vehicleName}`))
}

module.exports = {
  BOOKING_DISTANCE_POINTS,
  BOOKING_SIMON_FORMULA_VERSION,
  buildBookingCalculationRows,
  calculateSimonDriverGrid,
  roundDown,
  snapshotPointMeta
}
