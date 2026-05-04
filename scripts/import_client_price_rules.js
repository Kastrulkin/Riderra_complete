#!/usr/bin/env node
require('dotenv').config()

const fs = require('fs')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const jsonPath = process.argv[2]
if (!jsonPath) {
  console.error('Usage: node scripts/import_client_price_rules.js /path/to/client_price_rules.json')
  process.exit(1)
}

function slug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function compact(parts) {
  return parts.filter(Boolean).join('\n')
}

async function getTenant() {
  const tenant = await prisma.tenant.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' }
  })
  if (!tenant) throw new Error('Active tenant not found')
  return tenant
}

async function upsertClientCompany(tenantId, clientName, clientKey, sourceFile, spreadsheetId) {
  const externalId = `manual:client-price-list:${clientKey}`
  let company = await prisma.customerCompany.findFirst({
    where: {
      tenantId,
      OR: [
        { sourceSystem: 'manual_client_price_list', externalId },
        { name: { equals: clientName, mode: 'insensitive' } }
      ]
    }
  })

  const comment = compact([
    'Client account created/updated from client price list import.',
    `Source file: ${sourceFile}.`,
    `Spreadsheet ID: ${spreadsheetId}.`,
    'Rows are stored in CounterpartyPriceRule as client sell prices.'
  ])

  if (company) {
    company = await prisma.customerCompany.update({
      where: { id: company.id },
      data: {
        name: clientName,
        companyType: 'client',
        comment: company.comment || comment,
        extraInfo: compact([
          company.extraInfo,
          `clientPriceListKey=${clientKey}`
        ])
      }
    })
  } else {
    company = await prisma.customerCompany.create({
      data: {
        tenantId,
        sourceSystem: 'manual_client_price_list',
        externalId,
        name: clientName,
        companyType: 'client',
        comment,
        extraInfo: `clientPriceListKey=${clientKey}`
      }
    })
  }

  await prisma.customerCompanySegment.upsert({
    where: {
      companyId_segment: {
        companyId: company.id,
        segment: 'client_account'
      }
    },
    update: { sourceFile },
    create: {
      companyId: company.id,
      segment: 'client_account',
      sourceFile
    }
  })

  return company
}

async function upsertRule(tenantId, company, sourceFile, spreadsheetId, row) {
  const notes = compact([
    `sourceSheet=${sourceFile}; sourceTab=${row.sourceTab}; spreadsheetId=${spreadsheetId}`,
    row.country ? `country=${row.country}` : null,
    row.pax !== undefined && row.pax !== null && row.pax !== '' ? `pax=${row.pax}` : null,
    row.notes || null
  ])

  const data = {
    tenantId,
    customerCompanyId: company.id,
    counterpartyName: row.clientName,
    city: row.city || row.routeTo || null,
    routeFrom: row.routeFrom,
    routeTo: row.routeTo,
    vehicleType: row.vehicleType,
    sellPrice: Number(row.sellPrice),
    markupPercent: null,
    minMarginAbs: null,
    currency: row.currency || 'EUR',
    startsAt: null,
    endsAt: null,
    isActive: true,
    notes
  }

  const existing = await prisma.counterpartyPriceRule.findFirst({
    where: {
      tenantId,
      counterpartyName: row.clientName,
      routeFrom: { equals: row.routeFrom, mode: 'insensitive' },
      routeTo: { equals: row.routeTo, mode: 'insensitive' },
      vehicleType: { equals: row.vehicleType, mode: 'insensitive' }
    }
  })

  if (existing) {
    return prisma.counterpartyPriceRule.update({
      where: { id: existing.id },
      data
    })
  }

  return prisma.counterpartyPriceRule.create({ data })
}

async function main() {
  const payload = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
  const rows = Array.isArray(payload.rows) ? payload.rows : []
  const sourceFile = payload.sourceFile || 'client price list'
  const spreadsheetId = payload.spreadsheetId || ''
  const tenant = await getTenant()

  const companies = new Map()
  const stats = {
    companies: {},
    rulesUpserted: 0,
    skipped: 0
  }

  for (const row of rows) {
    if (!row.clientName || !row.routeFrom || !row.routeTo || !row.vehicleType || row.sellPrice === undefined || row.sellPrice === null) {
      stats.skipped += 1
      continue
    }

    const clientKey = row.clientKey || slug(row.clientName)
    const companyKey = `${clientKey}:${row.clientName}`
    if (!companies.has(companyKey)) {
      companies.set(companyKey, await upsertClientCompany(tenant.id, row.clientName, clientKey, sourceFile, spreadsheetId))
    }

    const company = companies.get(companyKey)
    await upsertRule(tenant.id, company, sourceFile, spreadsheetId, row)
    stats.rulesUpserted += 1
    stats.companies[row.clientName] = (stats.companies[row.clientName] || 0) + 1
  }

  console.log(JSON.stringify({
    ok: true,
    tenant: { id: tenant.id, code: tenant.code, name: tenant.name },
    sourceFile,
    spreadsheetId,
    ...stats
  }, null, 2))
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
