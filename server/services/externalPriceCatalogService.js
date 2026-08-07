const crypto = require('crypto')

function normalizeCatalogMatrix(matrices) {
  return (Array.isArray(matrices) ? matrices : [])
    .flatMap((matrix) => (matrix.quotes || []).map((quote) => ({
      currency: String(matrix.currency || '').toUpperCase(),
      externalVehicleKey: quote.externalVehicleKey,
      externalVehicleName: quote.externalVehicleName,
      maxPassengers: quote.maxPassengers ?? null,
      publicSellPrice: Number(quote.price),
      baseCurrency: quote.baseCurrency || null,
      basePrice: Number.isFinite(Number(quote.basePrice)) ? Number(quote.basePrice) : null
    })))
    .filter((quote) => quote.currency && quote.externalVehicleKey && Number.isFinite(quote.publicSellPrice))
    .sort((a, b) => a.currency.localeCompare(b.currency) || a.externalVehicleKey.localeCompare(b.externalVehicleKey))
}

function catalogContentHash(priceMatrix) {
  return crypto.createHash('sha256').update(JSON.stringify(priceMatrix || [])).digest('hex')
}

function parseCatalogMatrix(value) {
  try {
    const parsed = JSON.parse(value || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch (_) {
    return []
  }
}

function serializeCatalogRoute(row, currencies = []) {
  const allowed = new Set((currencies || []).map((value) => String(value).toUpperCase()))
  const prices = parseCatalogMatrix(row.priceMatrixJson).filter((quote) => !allowed.size || allowed.has(quote.currency))
  return {
    id: row.id,
    routeKey: row.routeKey,
    routeFrom: row.routeFrom,
    routeTo: row.routeTo,
    sourceUrl: row.sourceUrl,
    serviceAt: row.serviceAt,
    passengers: row.passengers,
    status: row.status,
    quotedAt: row.quotedAt,
    updatedAt: row.updatedAt,
    error: row.error,
    prices
  }
}

module.exports = { catalogContentHash, normalizeCatalogMatrix, parseCatalogMatrix, serializeCatalogRoute }
