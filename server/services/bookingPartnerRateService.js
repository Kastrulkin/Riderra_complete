function normalizeBookingVehicle(value) {
  const raw = String(value || '').trim().toLowerCase()
  if (!raw) return 'standard'
  if (/electric.*luxury|luxury.*electric/.test(raw)) return 'electric_luxury'
  if (/electric/.test(raw)) return 'electric_standard'
  if (/executive people|business.*van|executive.*van/.test(raw)) return 'executive_people_carrier'
  if (/large people|minibus|mini.?bus/.test(raw)) return 'minibus'
  if (/people carrier|mpv|mini.?van|van/.test(raw)) return 'people_carrier'
  if (/luxury|first class/.test(raw)) return 'luxury'
  if (/executive|business/.test(raw)) return 'executive'
  return 'standard'
}

function parseBookingDistanceBands(rawBands = []) {
  const rows = []
  for (const value of rawBands || []) {
    const raw = String(value || '').replace(/\u00a0/g, ' ').trim()
    let match = raw.match(/^\(First\s+([\d.]+)KM\)\s*([\d.]+)\s+([A-Z]{3})$/i)
    if (match) {
      rows.push({ type: 'initial', distanceKm: Number(match[1]), amount: Number(match[2]), currency: match[3].toUpperCase() })
      continue
    }
    match = raw.match(/^\(Next\s+([\d.]+)KM\)\s*([\d.]+)\s+([A-Z]{3})$/i)
    if (match) {
      rows.push({ type: 'next', distanceKm: Number(match[1]), amountPerKm: Number(match[2]), currency: match[3].toUpperCase() })
      continue
    }
    match = raw.match(/^\(After\s+([\d.]+)KM\)\s*([\d.]+)\s+([A-Z]{3})$/i)
    if (match) rows.push({ type: 'after', afterKm: Number(match[1]), amountPerKm: Number(match[2]), currency: match[3].toUpperCase() })
  }
  if (!rows.some((row) => row.type === 'initial')) return []
  return rows
}

function calculateBookingDistancePrice(bands = [], distanceKm, airportPickupFee = 0) {
  const distance = Number(distanceKm)
  if (!Number.isFinite(distance) || distance < 0) return null
  const initial = bands.find((row) => row.type === 'initial')
  if (!initial) return null
  let total = Number(initial.amount)
  let remaining = Math.max(0, distance - Number(initial.distanceKm || 0))
  for (const band of bands.filter((row) => row.type === 'next')) {
    const covered = Math.min(remaining, Number(band.distanceKm || 0))
    total += covered * Number(band.amountPerKm || 0)
    remaining -= covered
    if (remaining <= 0) break
  }
  if (remaining > 0) {
    const tail = bands.find((row) => row.type === 'after')
    if (!tail) return null
    total += remaining * Number(tail.amountPerKm || 0)
  }
  total += Number(airportPickupFee || 0)
  return Math.round((total + Number.EPSILON) * 100) / 100
}

function extractIata(value) {
  const raw = String(value || '').toUpperCase()
  return raw.match(/\(([A-Z]{3})\)/)?.[1] || raw.match(/\b([A-Z]{3})\b/)?.[1] || null
}

function bookingCounterpartyMatches(value) {
  return /(?:rideways|booking\.com|bookingcom)/i.test(String(value || ''))
}

async function fetchGoogleDrivingDistanceKm({ fromLat, fromLon, toLat, toLon, apiKey, fetchImpl = global.fetch }) {
  const coords = [fromLat, fromLon, toLat, toLon].map(Number)
  if (!apiKey || coords.some((value) => !Number.isFinite(value))) return null
  const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json')
  url.searchParams.set('origins', `${coords[0]},${coords[1]}`)
  url.searchParams.set('destinations', `${coords[2]},${coords[3]}`)
  url.searchParams.set('mode', 'driving')
  url.searchParams.set('key', apiKey)
  const response = await fetchImpl(url.toString())
  const payload = await response.json().catch(() => ({}))
  const meters = Number(payload?.rows?.[0]?.elements?.[0]?.distance?.value)
  return response.ok && payload?.status === 'OK' && Number.isFinite(meters) ? meters / 1000 : null
}

module.exports = {
  bookingCounterpartyMatches,
  calculateBookingDistancePrice,
  extractIata,
  fetchGoogleDrivingDistanceKm,
  normalizeBookingVehicle,
  parseBookingDistanceBands
}
