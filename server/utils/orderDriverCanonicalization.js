function normalizeDriverLookupName(value) {
  return String(value || '')
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[‘’`´]/g, "'")
    .replace(/[‐‑‒–—−]/g, '-')
    .replace(/[^a-zа-я0-9]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function levenshteinDistance(left, right) {
  const a = String(left || '')
  const b = String(right || '')
  if (a === b) return 0
  if (!a) return b.length
  if (!b) return a.length

  let previous = Array.from({ length: b.length + 1 }, (_, index) => index)
  for (let i = 1; i <= a.length; i++) {
    const current = [i]
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      )
    }
    previous = current
  }
  return previous[b.length]
}

function allowedDriverEditDistance(length) {
  if (length < 6) return 0
  if (length < 12) return 1
  if (length < 24) return 2
  return 3
}

function buildDriverCanonicalRegistry(values) {
  const byNormalized = new Map()
  for (const value of values || []) {
    const canonical = String(value || '').trim().replace(/\s+/g, ' ')
    const normalized = normalizeDriverLookupName(canonical)
    if (!canonical || !normalized || byNormalized.has(normalized)) continue
    byNormalized.set(normalized, canonical)
  }
  return [...byNormalized.entries()].map(([normalized, canonical]) => ({ normalized, canonical }))
}

function resolveCanonicalDriverName(value, registry) {
  const raw = String(value || '').trim().replace(/\s+/g, ' ')
  const normalized = normalizeDriverLookupName(raw)
  if (!raw || !normalized) return { value: '', matched: false, method: 'empty' }

  const entries = Array.isArray(registry) ? registry : []
  const exact = entries.find((entry) => entry.normalized === normalized)
  if (exact) return { value: exact.canonical, matched: true, method: 'exact' }

  const maxDistance = allowedDriverEditDistance(normalized.length)
  if (!maxDistance) return { value: raw, matched: false, method: 'unmatched' }

  const candidates = entries
    .filter((entry) => Math.abs(entry.normalized.length - normalized.length) <= maxDistance)
    .map((entry) => ({ ...entry, distance: levenshteinDistance(normalized, entry.normalized) }))
    .filter((entry) => entry.distance <= maxDistance)
    .sort((left, right) => left.distance - right.distance || left.canonical.localeCompare(right.canonical, 'ru'))

  if (!candidates.length) return { value: raw, matched: false, method: 'unmatched' }
  const best = candidates[0]
  const equallyClose = candidates.filter((candidate) => candidate.distance === best.distance)
  if (equallyClose.length !== 1) {
    return { value: raw, matched: false, method: 'ambiguous', candidates: equallyClose.map((entry) => entry.canonical) }
  }
  return { value: best.canonical, matched: true, method: 'fuzzy', distance: best.distance }
}

module.exports = {
  normalizeDriverLookupName,
  levenshteinDistance,
  buildDriverCanonicalRegistry,
  resolveCanonicalDriverName
}
