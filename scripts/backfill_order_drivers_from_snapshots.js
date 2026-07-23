#!/usr/bin/env node
require('dotenv').config()

const crypto = require('node:crypto')
const fs = require('node:fs')
const { PrismaClient } = require('@prisma/client')
const { buildDriverCanonicalRegistry, resolveCanonicalDriverName } = require('../server/utils/orderDriverCanonicalization')

const DRIVER_HEADERS = ['driver', 'водитель', 'водители', 'исполнитель', 'перевозчик']
const normalizeHeader = (value) => String(value || '').trim().toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ')

function rawPayload(snapshot) {
  try {
    const parsed = JSON.parse(snapshot?.rawPayload || '{}')
    return parsed?.row && typeof parsed.row === 'object' ? parsed.row : parsed
  } catch (_) { return {} }
}

function exactDriverValue(raw) {
  const entries = Object.entries(raw || {})
  for (const alias of DRIVER_HEADERS) {
    const entry = entries.find(([header]) => normalizeHeader(header) === alias)
    if (entry) return String(entry[1] || '').trim()
  }
  return ''
}

function manualDriverOverride(order) {
  try {
    const overrides = JSON.parse(order?.manualOverridesJson || '{}')
    return Object.prototype.hasOwnProperty.call(overrides || {}, 'driverNameRaw')
  } catch (_) { return false }
}

const toBase64Url = (value) => Buffer.from(value).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')

async function googleAccessToken() {
  const serviceAccountFile = process.env.GOOGLE_SERVICE_ACCOUNT_FILE
  if (!serviceAccountFile) throw new Error('GOOGLE_SERVICE_ACCOUNT_FILE is not configured')
  const account = JSON.parse(fs.readFileSync(serviceAccountFile, 'utf8'))
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = { iss: account.client_email, scope: 'https://www.googleapis.com/auth/spreadsheets.readonly', aud: 'https://oauth2.googleapis.com/token', exp: now + 3600, iat: now }
  const unsigned = `${toBase64Url(JSON.stringify(header))}.${toBase64Url(JSON.stringify(payload))}`
  const signer = crypto.createSign('RSA-SHA256')
  signer.update(unsigned)
  signer.end()
  const signature = signer.sign(account.private_key, 'base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${signature}` })
  })
  if (!response.ok) throw new Error(`Failed to get Google access token: ${await response.text()}`)
  return (await response.json()).access_token
}

async function canonicalRegistryFromActiveSheet(source) {
  if (!source?.googleSheetId) throw new Error('Active Riderra Sheet source is not configured')
  const token = await googleAccessToken()
  const sheetId = String(source.googleSheetId).match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)?.[1] || source.googleSheetId
  const metadataResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties.title`, { headers: { Authorization: `Bearer ${token}` } })
  if (!metadataResponse.ok) throw new Error(`Failed to inspect active Google Sheet: ${await metadataResponse.text()}`)
  const metadata = await metadataResponse.json()
  const title = (metadata.sheets || []).map((sheet) => sheet?.properties?.title).find((value) => normalizeHeader(value) === 'тех лист')
  if (!title) throw new Error('The active Google Sheet has no «тех лист» tab')
  const range = `${title}!A:A`
  const valuesResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}`, { headers: { Authorization: `Bearer ${token}` } })
  if (!valuesResponse.ok) throw new Error(`Failed to read driver registry: ${await valuesResponse.text()}`)
  const values = (await valuesResponse.json()).values || []
  const registry = buildDriverCanonicalRegistry(values.map((row) => row?.[0]))
  if (!registry.length) throw new Error('The canonical driver registry is empty')
  return registry
}

async function main() {
  const prisma = new PrismaClient()
  try {
  const apply = process.argv.includes('--apply')
  const tenant = await prisma.tenant.findFirst({ where: { code: 'riderra' }, select: { id: true } })
  if (!tenant) throw new Error('Riderra tenant not found')
  const activeSource = await prisma.sheetSource.findFirst({ where: { tenantId: tenant.id, isActive: true }, orderBy: { updatedAt: 'desc' } })
  const registry = await canonicalRegistryFromActiveSheet(activeSource)
  const sources = await prisma.sheetSource.findMany({ where: { tenantId: tenant.id, lastSyncStatus: { not: 'superseded' } }, orderBy: [{ monthLabel: 'asc' }, { updatedAt: 'desc' }], select: { id: true } })
  const totals = { apply, sources: sources.length, registryNames: registry.length, rows: 0, orders: 0, wouldUpdate: 0, updated: 0, manualOverrides: 0, exact: 0, fuzzy: 0, ambiguous: 0, unmatched: 0, clearedInvalidComments: 0 }
  for (const source of sources) {
    const snapshots = await prisma.orderSourceSnapshot.findMany({
      where: { tenantId: tenant.id, sheetSourceId: source.id, orderId: { not: null } },
      orderBy: [{ sourceRow: 'asc' }, { createdAt: 'desc' }],
      select: { sourceRow: true, rawPayload: true, order: { select: { id: true, driverNameRaw: true, sourceComment: true, manualOverridesJson: true } } }
    })
    const seenRows = new Set()
    for (const snapshot of snapshots) {
      if (!snapshot.order || seenRows.has(snapshot.sourceRow)) continue
      seenRows.add(snapshot.sourceRow)
      totals.rows++
      totals.orders++
      if (manualDriverOverride(snapshot.order)) { totals.manualOverrides++; continue }
      const resolution = resolveCanonicalDriverName(exactDriverValue(rawPayload(snapshot)), registry)
      if (resolution.method === 'exact') totals.exact++
      else if (resolution.method === 'fuzzy') totals.fuzzy++
      else if (resolution.method === 'ambiguous') totals.ambiguous++
      else if (resolution.method === 'unmatched') totals.unmatched++
      const nextValue = resolution.value || null
      const currentValue = String(snapshot.order.driverNameRaw || '').trim() || null
      if (nextValue === currentValue) continue
      totals.wouldUpdate++
      if (!nextValue && currentValue && currentValue === String(snapshot.order.sourceComment || '').trim()) totals.clearedInvalidComments++
      if (apply) {
        await prisma.order.update({ where: { id: snapshot.order.id }, data: { driverNameRaw: nextValue } })
        totals.updated++
      }
    }
  }
  console.log(JSON.stringify(totals, null, 2))
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) main().catch((error) => { console.error(error); process.exitCode = 1 })

module.exports = { exactDriverValue, manualDriverOverride, rawPayload }
