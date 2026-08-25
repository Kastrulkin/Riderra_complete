const DRIVER_COMMISSION_MIN = 5
const DRIVER_COMMISSION_MAX = 30
const DRIVER_COMMISSION_DEFAULT = 15

function invalidCommissionError() {
  const error = new Error(`commissionRate must be a number from ${DRIVER_COMMISSION_MIN} to ${DRIVER_COMMISSION_MAX}`)
  error.statusCode = 400
  return error
}

function parseDriverCommissionRate(value, { optional = false } = {}) {
  if (value === undefined || value === null || value === '') {
    return optional ? undefined : DRIVER_COMMISSION_DEFAULT
  }

  const commissionRate = Number(value)
  if (!Number.isFinite(commissionRate) || commissionRate < DRIVER_COMMISSION_MIN || commissionRate > DRIVER_COMMISSION_MAX) {
    throw invalidCommissionError()
  }
  return commissionRate
}

module.exports = {
  DRIVER_COMMISSION_DEFAULT,
  DRIVER_COMMISSION_MAX,
  DRIVER_COMMISSION_MIN,
  parseDriverCommissionRate
}
