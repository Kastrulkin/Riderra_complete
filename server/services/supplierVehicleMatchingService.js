function normalizeToken(value = '') {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

function supplierVehicleClass(value = '') {
  const token = normalizeToken(value)
  if (!token) return ''
  if (/executive people carrier|executive (?:mini)?van|business (?:mini)?van/.test(token)) return 'executive_people_carrier'
  if (/large people carrier|mini\s*bus|mini\s*van|6\s*pax|7\s*pax|8\s*pax|9\s*pax|10\s*pax/.test(token)) return 'large_people_carrier'
  if (/people carrier|\bmpv\b|\bvan\b|4\s*pax|5\s*pax/.test(token)) return 'people_carrier'
  if (/electric|e-vehicle|электро/.test(token)) return 'electric'
  if (/executive|business|first class/.test(token)) return 'executive'
  if (/standard|economy|sedan|saloon|\bcar\b|\bpt\b/.test(token)) return 'standard'
  return token
}

function supplierVehicleMatchScore(routeVehicleType, requestedVehicleType) {
  const routeToken = normalizeToken(routeVehicleType)
  const requestedToken = normalizeToken(requestedVehicleType)
  if (!requestedToken || !routeToken) return 1
  if (routeToken === requestedToken) return 30

  const routeClass = supplierVehicleClass(routeToken)
  const requestedClass = supplierVehicleClass(requestedToken)
  if (routeClass === requestedClass) return 20

  // Older imports sometimes retained only the generic `van` class. Keep them
  // eligible as a fallback, but below an exact MPV/minivan class match.
  if (
    (routeToken === 'van' && ['people_carrier', 'large_people_carrier', 'executive_people_carrier'].includes(requestedClass)) ||
    (requestedToken === 'van' && ['people_carrier', 'large_people_carrier', 'executive_people_carrier'].includes(routeClass))
  ) return 10

  return 0
}

module.exports = {
  supplierVehicleClass,
  supplierVehicleMatchScore
}
