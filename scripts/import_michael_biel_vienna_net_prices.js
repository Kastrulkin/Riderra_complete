#!/usr/bin/env node
require('dotenv').config()

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const SOURCE = 'michael-biel-vienna-price-list-2025-2026'
const SOURCE_FILE = 'PriceList25-26PDF.pdf'
const COMPANY_NAME = 'Михаил Бигел Вена'
const DRIVER_NAME = 'Michael Biel (Vienna)'
const SOURCE_QUOTED_AT = new Date('2025-03-27T09:27:36.000Z')
const STARTS_AT = new Date('2025-01-01T00:00:00.000Z')
const ENDS_AT = new Date('2026-12-31T23:59:59.999Z')

const execute = process.argv.includes('--execute')
const dataArg = process.argv.find((arg) => arg.startsWith('--data='))
if (!dataArg) throw new Error('Usage: node scripts/import_michael_biel_vienna_net_prices.js --data=/path/to/prices.json [--execute]')
const dataPath = path.resolve(dataArg.slice('--data='.length))
const payload = JSON.parse(fs.readFileSync(dataPath, 'utf8'))

function compact(parts) {
  return parts.filter(Boolean).join('\n')
}

function sourceKey(row, direction) {
  const raw = [SOURCE, direction, row.routeFrom, row.routeTo, row.vehicleType].join('|').toLowerCase()
  return `${SOURCE}:${direction}:${crypto.createHash('sha256').update(raw).digest('hex').slice(0, 24)}`
}

function buildRules() {
  const rules = []
  for (const row of payload.rows || []) {
    const directions = [
      { direction: 'direct', routeFrom: row.routeFrom, routeTo: row.routeTo, mirrored: false },
      { direction: 'mirrored', routeFrom: row.routeTo, routeTo: row.routeFrom, mirrored: true }
    ]
    for (const item of directions) {
      rules.push({
        ...row,
        ...item,
        sourceKey: sourceKey({ ...row, routeFrom: item.routeFrom, routeTo: item.routeTo }, item.direction)
      })
    }
  }
  return rules
}

async function getTenant() {
  const tenant = await prisma.tenant.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'asc' } })
  if (!tenant) throw new Error('Active tenant not found')
  return tenant
}

async function findExistingCompany(tenantId) {
  return prisma.customerCompany.findFirst({
    where: {
      tenantId,
      OR: [
        { sourceSystem: 'manual_supplier_price_list', externalId: SOURCE },
        { name: { equals: COMPANY_NAME, mode: 'insensitive' } },
        { name: { equals: 'Michael Biel Vienna', mode: 'insensitive' } }
      ]
    }
  })
}

async function findExistingDriver(tenantId, companyId = null) {
  return prisma.driver.findFirst({
    where: {
      tenantId,
      OR: [
        { name: { equals: DRIVER_NAME, mode: 'insensitive' } },
        { name: { equals: 'Michael Biel', mode: 'insensitive' } },
        ...(companyId ? [{ supplierCompanyId: companyId }] : [])
      ]
    }
  })
}

async function dryRun(tenant) {
  const company = await findExistingCompany(tenant.id)
  const driver = await findExistingDriver(tenant.id, company?.id)
  const rules = buildRules()
  const existingSupplierRules = company
    ? await prisma.supplierPriceRule.count({ where: { tenantId: tenant.id, supplierCompanyId: company.id } })
    : 0
  const existingDriverRoutes = driver
    ? await prisma.driverRoute.count({ where: { tenantId: tenant.id, driverId: driver.id } })
    : 0
  return {
    mode: 'dry-run',
    tenant: { id: tenant.id, name: tenant.name },
    company: company ? { id: company.id, name: company.name } : null,
    driver: driver ? { id: driver.id, name: driver.name } : null,
    sourceRows: payload.rows?.length || 0,
    generatedDirectionalRules: rules.length,
    omittedSourceRows: payload.omittedRows || [],
    existingSupplierRules,
    existingDriverRoutes,
    sample: rules.slice(0, 4)
  }
}

async function upsertCompany(tenantId) {
  const existing = await findExistingCompany(tenantId)
  const data = {
    tenantId,
    sourceSystem: 'manual_supplier_price_list',
    externalId: SOURCE,
    name: COMPANY_NAME,
    companyType: 'supplier',
    registrationCountry: 'Austria',
    registrationCity: 'Vienna',
    presenceCountries: 'Austria',
    presenceCities: 'Vienna',
    countryPresence: 'Austria',
    cityPresence: 'Vienna',
    comment: compact([
      existing?.comment,
      `Net prices approved by Riderra owner and imported from ${SOURCE_FILE} on 2026-08-28.`,
      `Source validity: 2025-2026. source=${SOURCE}`
    ])
  }
  return existing
    ? prisma.customerCompany.update({ where: { id: existing.id }, data })
    : prisma.customerCompany.create({ data })
}

async function upsertDriver(tenantId, company) {
  const existing = await findExistingDriver(tenantId, company.id)
  const data = {
    tenantId,
    name: DRIVER_NAME,
    phone: existing?.phone || 'not provided',
    country: 'Austria',
    city: 'Vienna',
    supplierCompanyId: company.id,
    pricingCurrency: 'EUR',
    isActive: true,
    verificationStatus: 'verified',
    comment: compact([
      existing?.comment,
      `Supplier price source: ${SOURCE_FILE}; valid 2025-2026; imported 2026-08-28.`
    ])
  }
  return existing
    ? prisma.driver.update({ where: { id: existing.id }, data })
    : prisma.driver.create({ data })
}

async function upsertSupplierRule(tenantId, companyId, row) {
  const notes = compact([
    `Source vehicle: ${row.sourceVehicle}.`,
    `Single rate: ${row.supplierPrice.toFixed(2)} EUR; return rate in source: ${row.returnPrice.toFixed(2)} EUR.`,
    row.mirrored ? 'Mirrored direction derived from the source return rate, which equals two single rates.' : 'Direction listed directly in the source document.',
    `Source page: ${row.sourcePage}.`
  ])
  const data = {
    tenantId,
    supplierCompanyId: companyId,
    sourceKey: row.sourceKey,
    category: row.mirrored ? 'airport_or_intercity_transfer_mirrored' : 'airport_or_intercity_transfer',
    routeFrom: row.routeFrom,
    routeTo: row.routeTo,
    vehicleType: row.vehicleType,
    passengers: row.passengers,
    supplierPrice: row.supplierPrice,
    currency: 'EUR',
    priceType: 'net',
    startsAt: STARTS_AT,
    endsAt: ENDS_AT,
    sourceType: 'pdf_price_list',
    sourceLabel: SOURCE_FILE,
    sourceQuotedAt: SOURCE_QUOTED_AT,
    sourceStatus: 'approved',
    notes,
    isActive: true
  }
  await prisma.supplierPriceRule.upsert({
    where: { supplierCompanyId_sourceKey: { supplierCompanyId: companyId, sourceKey: row.sourceKey } },
    create: data,
    update: data
  })
}

async function upsertDriverRoute(tenantId, driverId, row) {
  const data = {
    tenantId,
    driverId,
    fromPoint: row.routeFrom,
    toPoint: row.routeTo,
    vehicleType: row.vehicleType,
    driverPrice: row.supplierPrice,
    ourPrice: null,
    currency: 'EUR',
    sourceType: 'pdf_price_list',
    sourceLabel: row.sourceKey,
    sourceQuotedAt: SOURCE_QUOTED_AT,
    sourceMessage: `${COMPANY_NAME}: ${row.routeFrom} -> ${row.routeTo}, ${row.vehicleType}, ${row.supplierPrice.toFixed(2)} EUR net.`,
    sourceStatus: 'approved',
    sourceMetaJson: JSON.stringify({
      source: SOURCE,
      sourceFile: SOURCE_FILE,
      sourcePage: row.sourcePage,
      sourceVehicle: row.sourceVehicle,
      singlePrice: row.supplierPrice,
      returnPrice: row.returnPrice,
      mirroredDirection: row.mirrored,
      validThrough: '2026-12-31',
      approvedByOwnerAt: '2026-08-28'
    }),
    isActive: true
  }
  const existing = await prisma.driverRoute.findFirst({
    where: { tenantId, driverId, sourceLabel: row.sourceKey },
    select: { id: true }
  })
  return existing
    ? prisma.driverRoute.update({ where: { id: existing.id }, data })
    : prisma.driverRoute.create({ data })
}

async function executeImport(tenant) {
  const company = await upsertCompany(tenant.id)
  const driver = await upsertDriver(tenant.id, company)
  const rules = buildRules()
  const activeKeys = rules.map((row) => row.sourceKey)

  await prisma.supplierPriceRule.updateMany({
    where: { tenantId: tenant.id, supplierCompanyId: company.id, sourceKey: { startsWith: `${SOURCE}:`, notIn: activeKeys } },
    data: { isActive: false, sourceStatus: 'archived' }
  })
  await prisma.driverRoute.updateMany({
    where: { tenantId: tenant.id, driverId: driver.id, sourceLabel: { startsWith: `${SOURCE}:`, notIn: activeKeys } },
    data: { isActive: false, sourceStatus: 'archived' }
  })

  const batchSize = 40
  for (let offset = 0; offset < rules.length; offset += batchSize) {
    const batch = rules.slice(offset, offset + batchSize)
    await Promise.all(batch.flatMap((row) => [
      upsertSupplierRule(tenant.id, company.id, row),
      upsertDriverRoute(tenant.id, driver.id, row)
    ]))
  }

  const [supplierRuleCount, driverRouteCount, cityStandard, cityMinivan] = await Promise.all([
    prisma.supplierPriceRule.count({ where: { tenantId: tenant.id, supplierCompanyId: company.id, sourceKey: { in: activeKeys }, isActive: true } }),
    prisma.driverRoute.count({ where: { tenantId: tenant.id, driverId: driver.id, sourceLabel: { in: activeKeys }, isActive: true } }),
    prisma.supplierPriceRule.findFirst({ where: { supplierCompanyId: company.id, routeFrom: 'Vienna Schwechat Airport (VIE)', routeTo: 'Vienna', vehicleType: 'Standard class car', isActive: true } }),
    prisma.supplierPriceRule.findFirst({ where: { supplierCompanyId: company.id, routeFrom: 'Vienna Schwechat Airport (VIE)', routeTo: 'Vienna', vehicleType: 'Standard minivan 8 pax', isActive: true } })
  ])

  if (supplierRuleCount !== rules.length || driverRouteCount !== rules.length) {
    throw new Error(`Verification failed: expected ${rules.length}; supplier=${supplierRuleCount}; driverRoutes=${driverRouteCount}`)
  }

  const summary = {
    mode: 'execute',
    tenant: { id: tenant.id, name: tenant.name },
    company: { id: company.id, name: company.name },
    driver: { id: driver.id, name: driver.name },
    sourceRows: payload.rows.length,
    directionalRules: rules.length,
    supplierRuleCount,
    driverRouteCount,
    omittedSourceRows: payload.omittedRows || [],
    checks: {
      airportToViennaStandard: cityStandard?.supplierPrice ?? null,
      airportToViennaMinivan8: cityMinivan?.supplierPrice ?? null
    }
  }

  await prisma.auditLog.create({ data: {
    tenantId: tenant.id,
    actorRole: 'pricing_admin',
    action: 'pricing.supplier_net_prices.import',
    resource: 'SupplierPriceRule',
    resourceId: company.id,
    traceId: `michael-biel-vienna-import-${Date.now()}`,
    decision: 'approved_by_owner_in_codex_task',
    result: 'success',
    contextJson: JSON.stringify(summary)
  } })

  return summary
}

async function main() {
  const tenant = await getTenant()
  const result = execute ? await executeImport(tenant) : await dryRun(tenant)
  console.log(JSON.stringify(result, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
}).finally(async () => prisma.$disconnect())
