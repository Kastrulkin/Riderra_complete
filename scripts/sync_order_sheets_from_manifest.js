#!/usr/bin/env node
require('dotenv').config()

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const VEHICLE_BY_CODE = {
  PT: 'Standard class car',
  MV: 'Standard minivan 6 pax',
  MPV: 'Standard MPV',
  MBE: 'Business class car',
  SUV: 'SUV',
  BUS: 'Coach',
  SPRINTER: 'Sprinter',
  ELECTRIC: 'Standard e-vehicle 3 pax'
}

function parseArgs(argv) {
  const args = {}
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i]
    if (!key.startsWith('--')) continue
    const next = argv[i + 1]
    if (!next || next.startsWith('--')) {
      args[key.slice(2)] = true
    } else {
      args[key.slice(2)] = next
      i += 1
    }
  }
  return args
}

function isFalse(value) {
  return value === false || value === 'false' || value === '0' || value === 'no'
}

function clean(value) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function normalizeText(value) {
  return clean(value).toLowerCase().replace(/\s+/g, ' ')
}

function normalizeHeader(value) {
  return normalizeText(value)
}

function money(value) {
  if (value === null || value === undefined || value === '') return null
  const raw = String(value).replace(',', '.')
  const match = raw.match(/-?\d+(?:\.\d+)?/)
  if (!match) return null
  const parsed = Number(match[0])
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : null
}

function parseDate(value) {
  if (!value) return null
  const raw = clean(value)
  const parsed = new Date(raw)
  if (!Number.isNaN(parsed.getTime())) return parsed
  const ru = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/)
  if (ru) {
    const [, day, month, year, hour = '0', minute = '0', second = '0'] = ru
    const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second))
    return Number.isNaN(date.getTime()) ? null : date
  }
  const slashDash = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})[-\s]+(\d{1,2})(?::?(\d{2}))?/)
  if (slashDash) {
    const [, day, month, year, hour = '0', minute = '0'] = slashDash
    const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute || '0'), 0)
    return Number.isNaN(date.getTime()) ? null : date
  }
  const slash = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/)
  if (slash) {
    const [, day, month, year, hour = '0', minute = '0'] = slash
    const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), 0)
    return Number.isNaN(date.getTime()) ? null : date
  }
  return null
}

function parseOrderMeta(orderNumber) {
  const raw = clean(orderNumber)
  const match = raw.match(/\(([^)]+)\)/)
  if (!match) return { bookingId: raw, cityCode: '', vehicleCode: '', direction: '', vehicleType: 'standard' }
  const parts = match[1].trim().split(/\s+/).filter(Boolean)
  const direction = parts.length ? parts[parts.length - 1] : ''
  const vehicleCode = parts.length >= 2 ? parts[parts.length - 2] : ''
  const cityCode = parts.length >= 2 ? parts.slice(0, -2).join(' ') : parts.join(' ')
  return {
    bookingId: raw.split('(', 1)[0].trim(),
    cityCode,
    vehicleCode,
    direction,
    vehicleType: VEHICLE_BY_CODE[vehicleCode.toUpperCase()] || vehicleCode || 'standard'
  }
}

function currency(value, meta = {}) {
  const raw = clean(value).toUpperCase()
  if (raw.includes('USD') || raw.includes('$')) return 'USD'
  if (raw.includes('GBP') || raw.includes('£')) return 'GBP'
  if (raw.includes('CAD')) return 'CAD'
  if (raw.includes('RUB') || raw.includes('₽')) return 'RUB'
  const cityCode = clean(meta.cityCode).toLowerCase()
  if (cityCode.includes('los angeles')) return 'USD'
  if (cityCode.includes('vancouver')) return 'CAD'
  if (cityCode.includes('london')) return 'GBP'
  return 'EUR'
}

function normalizeStatus(row) {
  const driver = clean(row.driver).toLowerCase()
  const comment = clean(row.comment).toLowerCase()
  const cancel = driver.includes('отмена') || driver.includes('declined') || driver.includes('cancel')
  const paidOrDone = comment.includes('будет оплачен') || comment.includes('ездил')
  if (cancel && !paidOrDone && (!row.clientPrice || row.clientPrice <= 0)) return 'cancelled'
  if (row.clientPrice !== null && row.clientPrice !== 0) return 'completed'
  return 'pending'
}

function hasComplaint(row) {
  return /жалоб|претензи|complaint|no[\s-]?show|did not show|опозд|late|не встрет|не приех/i.test(`${row.driver || ''} ${row.comment || ''}`)
}

function issueFlags(row) {
  const flags = []
  const text = `${row.driver || ''} ${row.comment || ''}`.toLowerCase()
  if (row.status === 'cancelled') flags.push('cancelled')
  if (row.hasComplaint) flags.push('complaint')
  if (row.clientPrice === null) flags.push('missing_price')
  else if (row.clientPrice <= 0 && row.status !== 'cancelled') flags.push('non_positive_price')
  if (!row.driver) flags.push('missing_driver')
  if (text.includes('штраф') || text.includes('penalty')) flags.push('penalty')
  return flags
}

function normalizeIssueFlags(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map(String)
  if (!value) return []
  return String(value)
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function classifyQualitySignals(row) {
  const text = [row.comment, row.driver, row.counterparty].filter(Boolean).join(' ')
  const lowered = text.toLowerCase()
  const signals = []
  const add = (type, severity = 'medium', confidence = 1) => {
    if (!signals.some((signal) => signal.type === type)) {
      signals.push({ type, severity, confidence, text: row.comment || null })
    }
  }

  if (row.has_complaint || /жалоб|претензи|complaint/.test(lowered)) add('complaint', 'high')
  if (/no[\s-]?show|did not show|не приех|не встрет|не было машины/.test(lowered)) add('no_show', 'high')
  if (/опозд|late|delay|задерж/.test(lowered)) add('late', 'medium')
  if (/wrong address|адрес|уточнить адрес|неверн.*адрес/.test(lowered)) add('wrong_address', 'medium', 0.8)
  if (/flight|рейс|arrival|departure|прилет|прибыт/.test(lowered)) add('flight_info', 'low', 0.7)
  if (/child|booster|baby seat|детск|кресл/.test(lowered)) add('child_seat', 'low')
  if (/wait|waiting|ожидан|ждал/.test(lowered)) add('extra_waiting', 'medium', 0.8)
  if (/штраф|penalty/.test(lowered)) add('penalty', 'high')
  if (/отмена|cancel|declined/.test(lowered)) add('cancelled_signal', 'medium')
  if (/будет оплачен|будет оплачена|paid/.test(lowered)) add('paid_after_cancel', 'medium', 0.8)
  for (const flag of normalizeIssueFlags(row.issue_flags)) add(flag, flag === 'complaint' ? 'high' : 'medium', 1)
  return signals
}

function buildRow({ item, sourceRow, rowMarker = '', counterparty = '', orderNumber = '', pickupAt = '', fromPoint = '', toPoint = '', clientPrice = null, driver = '', comment = '', internalOrderNumber = '' }) {
  const meta = parseOrderMeta(orderNumber)
  const row = {
    sheet_source_id: item.spreadsheetId,
    source_name: item.sourceName,
    source_tab: item.tableTab || 'таблица',
    source_row: sourceRow,
    month_label: item.monthLabel,
    row_marker: clean(rowMarker),
    counterparty: clean(counterparty),
    order_number: clean(orderNumber),
    booking_id: meta.bookingId,
    pickup_at: pickupAt instanceof Date ? pickupAt.toISOString() : clean(pickupAt),
    from_point: clean(fromPoint),
    to_point: clean(toPoint),
    client_price: clientPrice,
    currency: currency(clientPrice, meta),
    driver: clean(driver),
    comment: clean(comment),
    internal_order_number: clean(internalOrderNumber),
    city_code: meta.cityCode,
    vehicle_code: meta.vehicleCode,
    direction: meta.direction,
    vehicle_type: meta.vehicleType
  }
  row.status = normalizeStatus(row)
  row.has_complaint = hasComplaint(row)
  row.issue_flags = issueFlags(row)
  const stableId = row.internal_order_number || row.booking_id || row.order_number || 'row'
  row.external_key = `google_sheet:${item.spreadsheetId}:${row.source_tab}:${sourceRow}:${stableId}`
  row.raw_payload = JSON.stringify(row, null, 0)
  return row
}

function parseModernRows(item, values) {
  const headerIndex = values.findIndex((row) => row.some((cell) => ['номер заказа', 'контрагент', 'откуда', 'куда'].includes(normalizeHeader(cell))))
  if (headerIndex < 0) return []
  const headers = values[headerIndex].map(normalizeHeader)
  const indexOf = (...names) => headers.findIndex((header) => names.map(normalizeHeader).includes(header))
  const looseIndexOf = (...names) => headers.findIndex((header) => names.some((name) => header.includes(normalizeHeader(name))))
  const idx = {
    rowMarker: 0,
    counterparty: indexOf('контрагент', 'counterparty'),
    orderNumber: indexOf('номер заказа', 'order number'),
    pickupAt: indexOf('дата', 'date'),
    fromPoint: looseIndexOf('откуда', 'from'),
    toPoint: indexOf('куда', 'to'),
    clientPrice: indexOf('сумма', 'price'),
    driver: indexOf('водитель', 'водители', 'driver'),
    comment: looseIndexOf('комментарий', 'comment'),
    internalOrderNumber: looseIndexOf('internal', 'внутренний')
  }
  return values.slice(headerIndex + 1).map((cells, offset) => {
    const sourceRow = headerIndex + offset + 2
    const orderNumber = clean(cells[idx.orderNumber])
    const pickupAt = clean(cells[idx.pickupAt])
    if (!orderNumber && !pickupAt) return null
    return buildRow({
      item,
      sourceRow,
      rowMarker: cells[idx.rowMarker],
      counterparty: cells[idx.counterparty],
      orderNumber,
      pickupAt,
      fromPoint: cells[idx.fromPoint],
      toPoint: cells[idx.toPoint],
      clientPrice: money(cells[idx.clientPrice]),
      driver: cells[idx.driver],
      comment: cells[idx.comment],
      internalOrderNumber: cells[idx.internalOrderNumber]
    })
  }).filter(Boolean)
}

function parseCompactRows(item, values) {
  return values.map((cells, index) => {
    const sourceRow = index + 1
    const hasCounterparty = parseDate(cells[3])
    const orderNumber = hasCounterparty ? cells[2] : cells[0]
    const pickupAt = hasCounterparty ? cells[3] : cells[1]
    if (!clean(orderNumber) && !parseDate(pickupAt)) return null
    if (!parseDate(pickupAt)) return null
    return buildRow({
      item,
      sourceRow,
      rowMarker: hasCounterparty ? cells[0] : '',
      counterparty: hasCounterparty ? cells[1] : '',
      orderNumber,
      pickupAt,
      clientPrice: money(hasCounterparty ? cells[4] : cells[2]),
      driver: hasCounterparty ? cells[5] : cells[3],
      internalOrderNumber: hasCounterparty ? cells[6] : cells[4],
      comment: [hasCounterparty ? cells[7] : cells[5], hasCounterparty ? cells[8] : cells[6]].filter(Boolean).join('\n')
    })
  }).filter(Boolean)
}

function isVerboseOrderStart(cells) {
  const first = clean(cells[0])
  if (!first) return false
  if (/^\d+$/.test(first) && clean(cells[1])) return true
  return /[A-ZА-Я0-9][A-ZА-Я0-9_-]{3,}.*\([^)]+\)/i.test(first) ||
    /^(SUNTR|EDM|K|RDR|RID|MST|RUS|SPB|MSK)[-_A-Z0-9]+/i.test(first)
}

function splitVerboseBlocks(values) {
  const blocks = []
  let current = null
  values.forEach((cells, index) => {
    if (isVerboseOrderStart(cells)) {
      if (current) blocks.push(current)
      current = { sourceRow: index + 1, orderNumber: clean(cells[0]), rows: [] }
    }
    if (current) current.rows.push(cells)
  })
  if (current) blocks.push(current)
  return blocks
}

function valueAfterColon(value) {
  const raw = clean(value).replace(/\u00a0/g, ' ')
  const colonIndex = raw.indexOf(':')
  return colonIndex >= 0 ? clean(raw.slice(colonIndex + 1)) : ''
}

function labelValueAt(cells, index) {
  const inline = valueAfterColon(cells[index])
  if (inline) return inline
  return clean(cells[index + 1])
}

function findVerboseValues(block, pattern) {
  const values = []
  block.rows.forEach((cells, rowOffset) => {
    cells.forEach((cell, columnIndex) => {
      if (!pattern.test(clean(cell))) return
      const value = labelValueAt(cells, columnIndex)
      if (value) values.push({ value, sourceRow: block.sourceRow + rowOffset, columnIndex })
    })
  })
  return values
}

function findFirstVerboseValue(block, pattern) {
  const values = findVerboseValues(block, pattern)
  return values.length ? values[0] : null
}

function findInlineDate(text) {
  const raw = clean(text)
  const dateMatch = raw.match(/\d{1,2}[./]\d{1,2}[./]\d{4}(?:[-\s]+\d{1,2}:?\d{2})?/)
  return dateMatch ? dateMatch[0] : raw
}

function combineDateAndTime(dateValue, timeValue) {
  const dateRaw = findInlineDate(dateValue)
  const timeRaw = clean(timeValue).match(/\d{1,2}:\d{2}/)?.[0] || ''
  return timeRaw && !/\d{1,2}:\d{2}/.test(dateRaw) ? `${dateRaw} ${timeRaw}` : dateRaw
}

function extractVerboseRoute(block, kind) {
  const fromLabels = findVerboseValues(block, /^FROM:|^Arrival location:|^Departure location:|^Адрес подачи|^Specific location:/i)
  const toLabels = findVerboseValues(block, /^TO:|^Адрес назначения|^Место назначения|^Accommodation address:|^Arrival location:|^Departure location:/i)
  const firstFrom = fromLabels.find((item) => item.value) || null
  const firstTo = toLabels.find((item) => item.value) || null
  if (kind === 'departure') {
    const pickupAddress = findFirstVerboseValue(block, /^Адрес подачи|^Specific location:|^Accommodation address:/i)
    const departureLocation = findFirstVerboseValue(block, /^Departure location:|^TO:/i)
    return {
      fromPoint: pickupAddress?.value || firstFrom?.value || '',
      toPoint: departureLocation?.value || firstTo?.value || ''
    }
  }
  const arrivalLocation = findFirstVerboseValue(block, /^Arrival location:|^FROM:/i)
  const destination = findFirstVerboseValue(block, /^Адрес назначения|^Accommodation address:|^TO:/i)
  return {
    fromPoint: arrivalLocation?.value || firstFrom?.value || '',
    toPoint: destination?.value || firstTo?.value || ''
  }
}

function extractVerbosePrice(block) {
  const net = findFirstVerboseValue(block, /^Net price:|^Цена|^Стоимость/i)
  if (net) return money(net.value)
  for (const cells of block.rows) {
    for (const cell of cells) {
      const raw = clean(cell)
      if (/\b(EUR|USD|GBP|CAD|RUB)\b|[$£€]/i.test(raw)) {
        const parsed = money(raw)
        if (parsed !== null) return parsed
      }
    }
  }
  return null
}

function parseVerboseRows(item, values) {
  const rows = []
  for (const block of splitVerboseBlocks(values)) {
    const orderNumber = block.orderNumber
    const price = extractVerbosePrice(block)
    const arrivalDates = findVerboseValues(block, /^Flight arrival date|^Arrival flight date\/time|^Дата и время прил[её]та/i)
    const arrivalTimes = findVerboseValues(block, /^Flight arrival time/i)
    const pickupDates = findVerboseValues(block, /^Pickup date|^Pickup Date\/Time|^Дата и время подачи/i)
    const pickupTimes = findVerboseValues(block, /^Pickup time/i)
    const departureDates = findVerboseValues(block, /^Flight departure date|^Departure flight date\/time/i)
    const departureTimes = findVerboseValues(block, /^Flight departure time/i)
    const events = []
    for (const arrivalDate of arrivalDates) {
      const arrivalTime = arrivalTimes.find((item) => item.columnIndex === arrivalDate.columnIndex) || arrivalTimes[0]
      events.push({
        kind: 'arrival',
        sourceRow: arrivalDate.sourceRow,
        pickupAt: combineDateAndTime(arrivalDate.value, arrivalTime?.value || ''),
        route: extractVerboseRoute(block, 'arrival')
      })
    }
    const departureSources = pickupDates.length ? pickupDates : departureDates
    for (const dateSource of departureSources) {
      const timeSource = pickupTimes.find((item) => item.columnIndex === dateSource.columnIndex) ||
        departureTimes.find((item) => item.columnIndex === dateSource.columnIndex) ||
        pickupTimes[0] ||
        departureTimes[0]
      events.push({
        kind: 'departure',
        sourceRow: dateSource.sourceRow,
        pickupAt: combineDateAndTime(dateSource.value, timeSource?.value || ''),
        route: extractVerboseRoute(block, 'departure')
      })
    }
    const uniqueEvents = []
    const seen = new Set()
    for (const event of events) {
      const parsedDate = parseDate(event.pickupAt)
      if (!parsedDate) continue
      const key = `${event.kind}:${parsedDate.toISOString()}`
      if (seen.has(key)) continue
      seen.add(key)
      uniqueEvents.push({ ...event, pickupAt: parsedDate })
    }
    for (const event of uniqueEvents) {
      rows.push(buildRow({
        item,
        sourceRow: event.sourceRow,
        rowMarker: event.kind,
        orderNumber,
        pickupAt: event.pickupAt,
        fromPoint: event.route.fromPoint,
        toPoint: event.route.toPoint,
        clientPrice: price,
        comment: `Imported from legacy block row ${block.sourceRow}`
      }))
    }
  }
  return rows
}

function parseSheetRows(item, values) {
  const modern = parseModernRows(item, values)
  if (modern.length) return { format: 'modern', rows: modern }
  const compact = parseCompactRows(item, values)
  if (compact.length) return { format: 'compact', rows: compact }
  return { format: 'legacy-block', rows: parseVerboseRows(item, values) }
}

function toBase64Url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

async function getGoogleAccessToken() {
  const serviceAccountFile = process.env.GOOGLE_SERVICE_ACCOUNT_FILE
  if (!serviceAccountFile) throw new Error('GOOGLE_SERVICE_ACCOUNT_FILE is not configured')
  if (!fs.existsSync(serviceAccountFile)) {
    throw new Error(`GOOGLE_SERVICE_ACCOUNT_FILE does not exist: ${serviceAccountFile}`)
  }
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountFile, 'utf8'))
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  }
  const unsignedToken = `${toBase64Url(JSON.stringify(header))}.${toBase64Url(JSON.stringify(payload))}`
  const signer = crypto.createSign('RSA-SHA256')
  signer.update(unsignedToken)
  signer.end()
  const signature = signer.sign(serviceAccount.private_key, 'base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsignedToken}.${signature}`
    })
  })
  if (!response.ok) throw new Error(`Failed to get Google access token: ${await response.text()}`)
  return (await response.json()).access_token
}

async function resolveTabName(accessToken, spreadsheetId, requestedTabName, item = {}) {
  const requested = clean(requestedTabName) || 'таблица'
  const metadataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`
  const response = await fetch(metadataUrl, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!response.ok) return requested
  const metadata = await response.json()
  const titles = (metadata.sheets || []).map((sheet) => sheet?.properties?.title).filter(Boolean)
  const candidates = [
    requested,
    item.tableTab,
    item.sourceName,
    item.monthLabel,
    'Таблица',
    'таблица',
    'Лист1'
  ].map(clean).filter(Boolean)
  for (const candidate of candidates) {
    const exact = titles.find((title) => title === candidate)
    if (exact) return exact
    const normalized = titles.find((title) => normalizeText(title) === normalizeText(candidate))
    if (normalized) return normalized
  }
  return titles[0] || requested
}

async function fetchValues(accessToken, spreadsheetId, tabName, item = {}) {
  const resolvedTabName = await resolveTabName(accessToken, spreadsheetId, tabName, item)
  const range = `${resolvedTabName}!A:AZ`
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueRenderOption=FORMATTED_VALUE`
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!response.ok) throw new Error(`Failed to read ${spreadsheetId}/${resolvedTabName}: ${await response.text()}`)
  return { tabName: resolvedTabName, values: (await response.json()).values || [] }
}

function defaultColumnMapping() {
  return JSON.stringify({
    orderNumber: 'Номер заказа',
    date: 'Дата',
    fromPoint: ' Откуда',
    toPoint: 'Куда',
    sum: 'Сумма',
    counterparty: 'Контрагент',
    driverName: 'Водители',
    comment: 'Комментарий (то, что было в скобках, водитель вендора, машина и т.д.)'
  })
}

async function upsertSheetSource(tenantId, item) {
  const tabName = item.tableTab || 'таблица'
  const existing = await prisma.sheetSource.findFirst({
    where: { tenantId, googleSheetId: item.spreadsheetId, monthLabel: item.monthLabel, tabName }
  })
  const data = {
    tenantId,
    name: item.sourceName,
    monthLabel: item.monthLabel,
    googleSheetId: item.spreadsheetId,
    tabName,
    detailsTabName: item.detailsTab || 'подробности',
    columnMapping: defaultColumnMapping(),
    isActive: true,
    syncEnabled: true,
    lastSyncAt: new Date(),
    lastSyncStatus: 'success',
    lastSyncError: null
  }
  return existing
    ? prisma.sheetSource.update({ where: { id: existing.id }, data })
    : prisma.sheetSource.create({ data })
}

async function importRows(tenantId, source, rows, replace) {
  const prefix = `google_sheet:${source.googleSheetId}:${source.tabName}:`
  if (replace) {
    await prisma.orderSourceSnapshot.deleteMany({ where: { tenantId, sheetSourceId: source.id } })
    await prisma.order.deleteMany({ where: { tenantId, source: 'google_sheet', externalKey: { startsWith: prefix } } })
  }
  let created = 0
  let updated = 0
  let snapshots = 0
  for (const row of rows) {
    const payload = {
      tenantId,
      source: 'google_sheet',
      externalKey: row.external_key,
      sourceRow: row.source_row,
      pickupAt: parseDate(row.pickup_at),
      fromPoint: row.from_point || 'UNKNOWN',
      toPoint: row.to_point || 'UNKNOWN',
      clientPrice: Number(row.client_price || 0),
      driverPrice: null,
      commission: null,
      status: row.status || 'pending',
      vehicleType: row.vehicle_type || 'standard',
      counterpartyName: row.counterparty || null,
      driverNameRaw: row.driver || null,
      sourceComment: row.comment || null,
      sourceCurrency: row.currency || null,
      sourceCityCode: row.city_code || null,
      sourceVehicleCode: row.vehicle_code || null,
      sourceDirection: row.direction || null,
      sourceOrderNumber: row.order_number || null,
      sourceBookingId: row.booking_id || null,
      sourceInternalOrderNumber: row.internal_order_number || null,
      hasComplaint: Boolean(row.has_complaint),
      issueFlagsJson: JSON.stringify(row.issue_flags || []),
      comment: [row.counterparty ? `counterparty=${row.counterparty}` : '', row.driver ? `driver=${row.driver}` : '', row.comment || ''].filter(Boolean).join('\n') || null
    }
    const existing = await prisma.order.findUnique({ where: { externalKey: row.external_key } })
    const order = existing
      ? await prisma.order.update({ where: { id: existing.id }, data: payload })
      : await prisma.order.create({ data: payload })
    if (existing) updated += 1
    else created += 1
    await prisma.orderSourceSnapshot.create({
      data: {
        tenantId,
        orderId: order.id,
        sheetSourceId: source.id,
        sourceRow: row.source_row,
        rowHash: crypto.createHash('sha256').update(row.raw_payload || JSON.stringify(row)).digest('hex'),
        rawPayload: row.raw_payload || JSON.stringify(row)
      }
    })
    snapshots += 1
    const signals = classifyQualitySignals(row)
    if (signals.length) {
      await Promise.all(signals.map((signal) => prisma.orderQualitySignal.upsert({
        where: {
          orderId_type_source: {
            orderId: order.id,
            type: signal.type,
            source: 'rule'
          }
        },
        update: {
          tenantId,
          severity: signal.severity,
          text: signal.text,
          confidence: signal.confidence
        },
        create: {
          tenantId,
          orderId: order.id,
          type: signal.type,
          severity: signal.severity,
          source: 'rule',
          text: signal.text,
          confidence: signal.confidence
        }
      })))
    }
  }
  return { created, updated, snapshots }
}

function inRange(monthLabel, from, to) {
  if (from && monthLabel < from) return false
  if (to && monthLabel > to) return false
  return true
}

async function main() {
  const args = parseArgs(process.argv)
  const dryRun = Boolean(args['dry-run'])
  const replace = !isFalse(args.replace)
  const manifestPath = args.manifest || path.join(__dirname, 'order_month_sources_manifest.json')
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  const selected = manifest
    .filter((item) => inRange(item.monthLabel, args.from || '', args.to || ''))
    .sort((a, b) => a.monthLabel.localeCompare(b.monthLabel))
  const tenant = dryRun ? null : await prisma.tenant.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'asc' } })
  if (!dryRun && !tenant) throw new Error('Active tenant not found')
  const accessToken = await getGoogleAccessToken()
  const results = []
  for (const item of selected) {
    const tabName = item.tableTab || 'таблица'
    const fetched = await fetchValues(accessToken, item.spreadsheetId, tabName, item)
    const values = fetched.values
    const parsed = parseSheetRows({ ...item, tableTab: fetched.tabName }, values)
    const source = dryRun ? null : await upsertSheetSource(tenant.id, { ...item, tableTab: fetched.tabName })
    const imported = dryRun ? { created: 0, updated: 0, snapshots: 0 } : await importRows(tenant.id, source, parsed.rows, replace)
    results.push({ monthLabel: item.monthLabel, sourceName: item.sourceName, tabName: fetched.tabName, format: parsed.format, rows: parsed.rows.length, ...imported })
    console.log(JSON.stringify(results[results.length - 1]))
  }
  console.log(JSON.stringify({
    ok: true,
    dryRun,
    replace,
    selected: selected.length,
    totalRows: results.reduce((sum, item) => sum + item.rows, 0),
    results
  }, null, 2))
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => prisma.$disconnect())
