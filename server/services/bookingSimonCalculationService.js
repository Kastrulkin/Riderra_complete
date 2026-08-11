const BOOKING_SIMON_FORMULA_VERSION = 'booking-simon-v1'
const BOOKING_PORTAL_FORMULA_VERSION = 'booking-portal-genius-v1'
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

function calculateBookingPortalGrid(publicPrices = {}, options = {}) {
  const bookingCommissionPercent = Number(options.bookingCommissionPercent ?? 25)
  const pmfPercent = Number(options.pmfPercent ?? 20)
  const supplierGeniusPercent = Number(options.supplierGeniusPercent ?? 5)
  const bookingGeniusTopUpPercent = Number(options.bookingGeniusTopUpPercent ?? 5)
  const totalGeniusPercent = supplierGeniusPercent + bookingGeniusTopUpPercent
  const geniusFactor = 1 - totalGeniusPercent / 100
  const commissionFactor = 1 - bookingCommissionPercent / 100
  const pmfFactor = 1 - pmfPercent / 100
  const publicPrice = {}
  const portalGrossPrice = {}
  const afterBookingCommission = {}
  const driverTargetPrice = {}

  for (const distance of BOOKING_DISTANCE_POINTS) {
    publicPrice[distance] = numberOrZero(publicPrices[distance])
    portalGrossPrice[distance] = publicPrice[distance] > 0 && geniusFactor > 0
      ? Math.ceil((publicPrice[distance] / geniusFactor) * 100) / 100
      : 0
    afterBookingCommission[distance] = publicPrice[distance] * commissionFactor
    driverTargetPrice[distance] = roundDown(afterBookingCommission[distance] * pmfFactor)
  }

  // The current Booking Taxi Partner Portal has one initial fare and three
  // distance bands. Using 10/20/40/60 km as boundaries reproduces four measured
  // points exactly; the 5 km point remains visible as a control for the minimum fare.
  const initialPrice = Math.max(portalGrossPrice[5], portalGrossPrice[10])
  const band1 = portalGrossPrice[20] > 0 && initialPrice > 0
    ? roundDown(Math.max(0, portalGrossPrice[20] - initialPrice) / 10, 2)
    : 0
  const band2 = portalGrossPrice[40] > 0 && portalGrossPrice[20] > 0
    ? roundDown(Math.max(0, portalGrossPrice[40] - portalGrossPrice[20]) / 20, 2)
    : 0
  const band3 = portalGrossPrice[60] > 0 && portalGrossPrice[40] > 0
    ? roundDown(Math.max(0, portalGrossPrice[60] - portalGrossPrice[40]) / 20, 2)
    : 0

  return {
    formulaVersion: BOOKING_PORTAL_FORMULA_VERSION,
    bookingCommissionPercent,
    pmfPercent,
    supplierGeniusPercent,
    bookingGeniusTopUpPercent,
    totalGeniusPercent,
    publicPrice,
    portalGrossPrice,
    afterBookingCommission,
    driverTargetPrice,
    portalTariff: {
      initialPrice,
      includedDistanceKm: 10,
      bands: [
        { number: 1, fromKm: 10, toKm: 20, nextDistanceKm: 10, pricePerKm: band1 },
        { number: 2, fromKm: 20, toKm: 40, nextDistanceKm: 20, pricePerKm: band2 },
        { number: 3, fromKm: 40, toKm: null, nextDistanceKm: null, pricePerKm: band3 }
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
    const portalCalculation = calculateBookingPortalGrid(publicPrices, options)
    return {
      ...group,
      formulaVersion: calculation.formulaVersion,
      bookingCommissionPercent: calculation.bookingCommissionPercent,
      pmfPercent: calculation.pmfPercent,
      tariff: calculation.tariff,
      portalTariff: portalCalculation.portalTariff,
      points: BOOKING_DISTANCE_POINTS.map((distance) => ({
        distanceKm: distance,
        ...(group.points[distance] || {}),
        publicSellPrice: publicPrices[distance],
        afterBookingCommission: calculation.afterCommission[distance],
        driverTargetPrice: calculation.driverPrices[distance],
        portalGrossPrice: portalCalculation.portalGrossPrice[distance],
        geniusCustomerPrice: portalCalculation.portalGrossPrice[distance] * (1 - portalCalculation.totalGeniusPercent / 100)
      }))
    }
  }).sort((left, right) => `${left.country}|${left.city}|${left.iata}|${left.vehicleName}`.localeCompare(`${right.country}|${right.city}|${right.iata}|${right.vehicleName}`))
}

function buildBookingAirportMatrices(vehicleRows = []) {
  const matrices = new Map()
  for (const row of vehicleRows) {
    const key = [row.country, row.city, row.iata, row.currency].join('|')
    if (!matrices.has(key)) {
      matrices.set(key, {
        key,
        country: row.country,
        city: row.city,
        iata: row.iata,
        airportName: row.points.find((point) => point.routeFrom)?.routeFrom || row.iata,
        currency: row.currency,
        openCity: row.openCity,
        vehicles: [],
        points: BOOKING_DISTANCE_POINTS.map((distanceKm) => ({ distanceKm, destinationAddress: '', quotedAt: null, prices: {} }))
      })
    }
    const matrix = matrices.get(key)
    matrix.openCity = matrix.openCity || row.openCity
    matrix.vehicles.push({ key: row.vehicleKey, name: row.vehicleName, portalTariff: row.portalTariff, internalTariff: row.tariff })
    for (const point of row.points) {
      const matrixPoint = matrix.points.find((item) => item.distanceKm === point.distanceKm)
      if (!matrixPoint.destinationAddress && point.routeTo) matrixPoint.destinationAddress = point.routeTo
      if (point.quotedAt && (!matrixPoint.quotedAt || new Date(point.quotedAt) > new Date(matrixPoint.quotedAt))) matrixPoint.quotedAt = point.quotedAt
      matrixPoint.prices[row.vehicleKey] = {
        publicSellPrice: point.publicSellPrice,
        afterBookingCommission: point.afterBookingCommission,
        driverTargetPrice: point.driverTargetPrice,
        portalGrossPrice: point.portalGrossPrice,
        geniusCustomerPrice: point.geniusCustomerPrice
      }
    }
  }
  return Array.from(matrices.values()).map((matrix) => ({
    ...matrix,
    vehicles: matrix.vehicles.sort((left, right) => left.name.localeCompare(right.name))
  })).sort((left, right) => `${left.country}|${left.city}|${left.iata}`.localeCompare(`${right.country}|${right.city}|${right.iata}`))
}

module.exports = {
  BOOKING_DISTANCE_POINTS,
  BOOKING_PORTAL_FORMULA_VERSION,
  BOOKING_SIMON_FORMULA_VERSION,
  buildBookingAirportMatrices,
  buildBookingCalculationRows,
  calculateBookingPortalGrid,
  calculateSimonDriverGrid,
  roundDown,
  snapshotPointMeta
}
