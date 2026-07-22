function normalizeReference (value = '') {
  return String(value || '').trim().toUpperCase()
}

function normalizePhone (value = '') {
  let digits = String(value || '').replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('8')) digits = `7${digits.slice(1)}`
  return digits.length >= 10 && digits.length <= 15 ? `+${digits}` : null
}

function valueAfterLabel (cells, index, labels) {
  const raw = String(cells[index] || '').trim()
  for (const label of labels) {
    const match = raw.match(new RegExp(`^${label}\\s*:?\\s*(.*)$`, 'i'))
    if (!match) continue
    const inline = String(match[1] || '').trim()
    return inline || String(cells[index + 1] || '').trim() || null
  }
  return null
}

function referenceInRow (row, referenceSet) {
  const firstCell = normalizeReference(row?.[0])
  if (!firstCell) return null
  const candidates = [
    firstCell,
    firstCell.replace(/\s+\([^)]*\).*$/, '').trim(),
    firstCell.split(/\s+/)[0]
  ]
  return candidates.find((candidate) => referenceSet.has(candidate)) || null
}

function extractOrderDetailsContacts (rows = [], referenceValues = []) {
  const references = [...new Set(referenceValues.map(normalizeReference).filter(Boolean))]
  const referenceSet = new Set(references)
  const result = new Map()
  if (!references.length) return result

  for (let start = 0; start < rows.length; start++) {
    const reference = referenceInRow(rows[start], referenceSet)
    if (!reference) continue
    let customerName = null
    let customerPhone = null

    for (let rowIndex = start; rowIndex < Math.min(rows.length, start + 20); rowIndex++) {
      const cells = Array.isArray(rows[rowIndex]) ? rows[rowIndex] : []
      if (rowIndex > start && referenceInRow(cells, referenceSet)) break
      for (let cellIndex = 0; cellIndex < cells.length; cellIndex++) {
        if (!customerName) {
          customerName = valueAfterLabel(cells, cellIndex, ['name', 'passenger name', 'customer name'])
        }
        if (!customerPhone) {
          const rawPhone = valueAfterLabel(cells, cellIndex, ['mobile number', 'phone number', 'passenger phone', 'customer phone', 'mobile', 'phone'])
          customerPhone = rawPhone ? normalizePhone(rawPhone) : null
        }
      }
    }

    if (customerName || customerPhone) {
      result.set(reference, { customerName, customerPhone, sourceRow: start + 1 })
    }
  }
  return result
}

module.exports = { extractOrderDetailsContacts, normalizePhone, normalizeReference }
