#!/usr/bin/env node
require('dotenv').config()

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')

const SOURCE = 'transferme-budapest-partner-rates-2026'
const SOURCE_FILE = 'Partner rates 2026.xlsx'
const SOURCE_PATH = 'Companies/Purchasing/Budapest Transfer.me/Partner rates 2026.xlsx'
const SOURCE_SHA256 = 'fbbf5ee0c45a7ec54b0ae53910c9df06d8085b303c10ab01a74c8e185a232383'
const SOURCE_QUOTED_AT = new Date('2026-07-16T12:56:55.000Z')
const STARTS_AT = new Date('2026-01-01T00:00:00.000Z')
const ENDS_AT = new Date('2026-12-31T23:59:59.999Z')

const COMPANY_NAME = 'TransferMe'
const CONTACT_NAME = 'David Ballo'
const CONTACT_PHONE = '+358 454 901567'
const CONTACT_EMAIL = 'operations@transferme.hu'
const WEBSITE = 'https://www.transferme.hu/'
const COUNTRY = 'Hungary'
const CITY = 'Budapest'
const CURRENCY = 'EUR'

const vehicles = [
  { key: 'sedan', sourceVehicle: 'Sedan', sourceColumn: 'C', passengers: null },
  { key: 'premium-sedan', sourceVehicle: 'Premium Sedan', sourceColumn: 'D', passengers: null },
  { key: 'minivan', sourceVehicle: 'Minivan', sourceColumn: 'E', passengers: null },
  { key: 'premium-minivan', sourceVehicle: 'Premium Minivan', sourceColumn: 'F', passengers: null },
  { key: 'luxury-minivan', sourceVehicle: 'Luxury Minivan', sourceColumn: 'G', passengers: null },
  { key: 'sprinter-19-pax', sourceVehicle: 'Sprinter 19 Pax', sourceColumn: 'H', passengers: 19 },
  { key: 'bus-53-pax', sourceVehicle: 'Bus 53 Pax', sourceColumn: 'I', passengers: 53 }
]

const services = [
  {
    row: 2,
    sourceLabel: 'Budapest Airport transfer',
    category: 'airport_transfer',
    routeFrom: 'Budapest Airport (BUD)',
    routeTo: 'Budapest City',
    isTransfer: true,
    prices: [40, 55, 50, 60, 73.5, 260, 315]
  },
  {
    row: 3,
    sourceLabel: 'Aquaworld transfer',
    category: 'local_transfer',
    routeFrom: 'Budapest',
    routeTo: 'Aquaworld Budapest',
    isTransfer: true,
    prices: [60, 75, 70, 80, 89.775, 0, 0]
  },
  {
    row: 4,
    sourceLabel: 'Train station transfer',
    category: 'train_station_transfer',
    routeFrom: 'Budapest Train Station',
    routeTo: 'Budapest City',
    isTransfer: true,
    prices: [40, 55, 50, 60, 73.5, 260, 315]
  },
  {
    row: 5,
    sourceLabel: 'Chauffeur service 1 hour',
    category: 'chauffeur_service_1_hour',
    routeFrom: 'Budapest',
    routeTo: 'Chauffeur service 1 hour',
    isTransfer: false,
    prices: [27, 33, 30, 35, 45, 60, 75]
  },
  {
    row: 6,
    sourceLabel: 'Chauffeur service 4 hours',
    category: 'chauffeur_service_4_hours',
    routeFrom: 'Budapest',
    routeTo: 'Chauffeur service 4 hours',
    isTransfer: false,
    prices: [135, 165, 150, 175, 225, 300, 375]
  },
  {
    row: 7,
    sourceLabel: 'Chauffeur service 8 hours',
    category: 'chauffeur_service_8_hours',
    routeFrom: 'Budapest',
    routeTo: 'Chauffeur service 8 hours',
    isTransfer: false,
    prices: [243, 297, 270, 315, 405, 540, 675]
  },
  {
    row: 8,
    sourceLabel: 'Chauffeur service 12 hours',
    category: 'chauffeur_service_12_hours',
    routeFrom: 'Budapest',
    routeTo: 'Chauffeur service 12 hours',
    isTransfer: false,
    prices: [351, 429, 390, 455, 585, 780, 975]
  },
  {
    row: 9,
    sourceLabel: 'Fee/Km',
    category: 'distance_rate_per_km',
    routeFrom: 'Budapest',
    routeTo: 'Per kilometer',
    isTransfer: false,
    prices: [0.65, 0.75, 0.7, 0.8, 0.89775, 1.7, 2.4]
  },
  {
    row: 10,
    sourceLabel: 'Budapest-Vienna Transfer',
    category: 'intercity_transfer',
    routeFrom: 'Budapest',
    routeTo: 'Vienna',
    isTransfer: true,
    prices: [318.5, 367.5, 343, 392, 439.8975, 833, 1176]
  },
  {
    row: 11,
    sourceLabel: 'Budapest-Prague Transfer',
    category: 'intercity_transfer',
    routeFrom: 'Budapest',
    routeTo: 'Prague',
    isTransfer: true,
    prices: [682.5, 787.5, 735, 840, 942.6375, 1785, 2520]
  },
  {
    row: 12,
    sourceLabel: 'Budapest-Ljubjana Transfer',
    category: 'intercity_transfer',
    routeFrom: 'Budapest',
    routeTo: 'Ljubljana',
    isTransfer: true,
    prices: [604.5, 697.5, 651, 744, 834.9075, 1581, 2232]
  },
  {
    row: 13,
    sourceLabel: 'Budapest-Zagreb Transfer',
    category: 'intercity_transfer',
    routeFrom: 'Budapest',
    routeTo: 'Zagreb',
    isTransfer: true,
    prices: [463.5, 532.5, 498, 567, 634.41, 1198, 1706]
  }
]

function appendUnique(existing, block) {
  const current = String(existing || '').trim()
  if (!current) return block
  if (current.includes(block)) return current
  return `${current}\n${block}`
}

function buildRows() {
  return services.flatMap((service) => vehicles.map((vehicle, index) => ({
    ...service,
    ...vehicle,
    supplierPrice: service.prices[index],
    sourceCell: `${vehicle.sourceColumn}${service.row}`,
    sourceKey: `${SOURCE}:r${service.row}:${vehicle.key}`
  }))).filter((row) => row.supplierPrice > 0)
}

async function getTenant(client) {
  const tenant = await client.tenant.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true, code: true, name: true }
  })
  if (!tenant) throw new Error('Active tenant not found')
  return tenant
}

async function findExisting(client, tenantId) {
  const company = await client.customerCompany.findFirst({
    where: {
      tenantId,
      OR: [
        { sourceSystem: 'manual_supplier_price_list', externalId: SOURCE },
        { name: { equals: COMPANY_NAME, mode: 'insensitive' } },
        { email: { equals: CONTACT_EMAIL, mode: 'insensitive' } },
        { website: { contains: 'transferme.hu', mode: 'insensitive' } }
      ]
    },
    include: { links: { include: { contact: true } }, supplierDrivers: true }
  })

  const contact = await client.customerContact.findFirst({
    where: {
      tenantId,
      OR: [
        { sourceSystem: 'manual_supplier_contact', externalId: 'transferme-david-ballo' },
        { fullName: { equals: CONTACT_NAME, mode: 'insensitive' } },
        { email: { equals: CONTACT_EMAIL, mode: 'insensitive' } },
        { phone: { equals: CONTACT_PHONE } }
      ]
    }
  })

  const driver = await client.driver.findFirst({
    where: {
      tenantId,
      OR: [
        ...(company ? [{ supplierCompanyId: company.id }] : []),
        { name: { contains: COMPANY_NAME, mode: 'insensitive' } },
        { email: { equals: CONTACT_EMAIL, mode: 'insensitive' } },
        { phone: { equals: CONTACT_PHONE } }
      ]
    }
  })

  return { company, contact, driver }
}

async function applyChanges(tenant, existing, rows) {
  return prisma.$transaction(async (tx) => {
    const companyComment = [
      `Budapest supplier. Contact: ${CONTACT_NAME}, Operations.`,
      `Net price source: ${SOURCE_FILE}; valid for 2026; source=${SOURCE}.`,
      `Source file SHA-256: ${SOURCE_SHA256}.`,
      'Registration jurisdiction was not provided; Hungary/Budapest is recorded as operating presence only.'
    ].join('\n')
    const companyData = {
      tenantId: tenant.id,
      name: COMPANY_NAME,
      website: WEBSITE,
      phone: CONTACT_PHONE,
      email: CONTACT_EMAIL,
      presenceCountries: COUNTRY,
      presenceCities: CITY,
      countryPresence: COUNTRY,
      cityPresence: CITY,
      companyType: 'supplier',
      ownerName: CONTACT_NAME,
      comment: appendUnique(existing.company?.comment, companyComment)
    }
    const company = existing.company
      ? await tx.customerCompany.update({ where: { id: existing.company.id }, data: companyData })
      : await tx.customerCompany.create({
          data: {
            sourceSystem: 'manual_supplier_price_list',
            externalId: SOURCE,
            ...companyData
          }
        })

    await tx.customerCompanySegment.upsert({
      where: { companyId_segment: { companyId: company.id, segment: 'supplier_company' } },
      update: { sourceFile: SOURCE_FILE },
      create: { companyId: company.id, segment: 'supplier_company', sourceFile: SOURCE_FILE }
    })

    const contactComment = `TransferMe Budapest supplier contact supplied by Riderra owner on 2026-09-01. Source signature: Operations; Car | Minivan | Coach.`
    const contactData = {
      tenantId: tenant.id,
      fullName: CONTACT_NAME,
      website: WEBSITE,
      phone: CONTACT_PHONE,
      email: CONTACT_EMAIL,
      presenceCountries: COUNTRY,
      presenceCities: CITY,
      countryPresence: COUNTRY,
      cityPresence: CITY,
      position: 'Operations',
      comment: appendUnique(existing.contact?.comment, contactComment)
    }
    const contact = existing.contact
      ? await tx.customerContact.update({ where: { id: existing.contact.id }, data: contactData })
      : await tx.customerContact.create({
          data: {
            sourceSystem: 'manual_supplier_contact',
            externalId: 'transferme-david-ballo',
            ...contactData
          }
        })

    await tx.customerContactSegment.upsert({
      where: { contactId_segment: { contactId: contact.id, segment: 'supplier_contact' } },
      update: { sourceFile: SOURCE_FILE },
      create: { contactId: contact.id, segment: 'supplier_contact', sourceFile: SOURCE_FILE }
    })
    await tx.customerCompanyContact.upsert({
      where: { companyId_contactId: { companyId: company.id, contactId: contact.id } },
      update: { source: 'owner_provided_signature', matchType: 'confirmed_contact' },
      create: { companyId: company.id, contactId: contact.id, source: 'owner_provided_signature', matchType: 'confirmed_contact' }
    })

    const driverComment = [
      `Supplier price source: ${SOURCE_FILE}; source=${SOURCE}; valid 2026.`,
      'Vehicle labels are preserved exactly from the supplier file because capacities were not provided except for Sprinter 19 Pax and Bus 53 Pax.',
      'Source does not explicitly confirm reverse-direction pricing; no mirrored routes were created.'
    ].join('\n')
    const driverData = {
      tenantId: tenant.id,
      name: 'TransferMe / David Ballo',
      email: CONTACT_EMAIL,
      phone: CONTACT_PHONE,
      country: COUNTRY,
      city: CITY,
      supplierCompanyId: company.id,
      supplierContactId: contact.id,
      pricingCurrency: CURRENCY,
      isActive: true,
      verificationStatus: 'pending',
      comment: appendUnique(existing.driver?.comment, driverComment)
    }
    const driver = existing.driver
      ? await tx.driver.update({ where: { id: existing.driver.id }, data: driverData })
      : await tx.driver.create({ data: driverData })

    const activeSupplierKeys = []
    const activeDriverKeys = []
    let supplierCreated = 0
    let supplierUpdated = 0
    let driverCreated = 0
    let driverUpdated = 0

    for (const row of rows) {
      activeSupplierKeys.push(row.sourceKey)
      const notes = [
        `Source: ${SOURCE_PATH}, Sheet1!${row.sourceCell}.`,
        `Source service label: ${row.sourceLabel}.`,
        `Source vehicle label: ${row.sourceVehicle}.`,
        row.isTransfer
          ? 'Price recorded for the listed direction only; reverse direction is pending supplier confirmation.'
          : 'Operational price rule; not a point-to-point DriverRoute.'
      ].join('\n')
      const ruleData = {
        tenantId: tenant.id,
        supplierCompanyId: company.id,
        sourceKey: row.sourceKey,
        category: row.category,
        routeFrom: row.routeFrom,
        routeTo: row.routeTo,
        vehicleType: row.sourceVehicle,
        passengers: row.passengers,
        supplierPrice: row.supplierPrice,
        currency: CURRENCY,
        priceType: 'net',
        startsAt: STARTS_AT,
        endsAt: ENDS_AT,
        sourceType: 'xlsx_price_list',
        sourceLabel: SOURCE_FILE,
        sourceQuotedAt: SOURCE_QUOTED_AT,
        sourceStatus: 'approved',
        notes,
        isActive: true
      }
      const previousRule = await tx.supplierPriceRule.findUnique({
        where: { supplierCompanyId_sourceKey: { supplierCompanyId: company.id, sourceKey: row.sourceKey } },
        select: { id: true }
      })
      await tx.supplierPriceRule.upsert({
        where: { supplierCompanyId_sourceKey: { supplierCompanyId: company.id, sourceKey: row.sourceKey } },
        create: ruleData,
        update: ruleData
      })
      if (previousRule) supplierUpdated += 1
      else supplierCreated += 1

      if (!row.isTransfer) continue
      activeDriverKeys.push(row.sourceKey)
      const routeData = {
        tenantId: tenant.id,
        driverId: driver.id,
        fromPoint: row.routeFrom,
        toPoint: row.routeTo,
        vehicleType: row.sourceVehicle,
        driverPrice: row.supplierPrice,
        ourPrice: null,
        currency: CURRENCY,
        sourceType: 'xlsx_price_list',
        sourceLabel: row.sourceKey,
        sourceQuotedAt: SOURCE_QUOTED_AT,
        sourceMessage: `${COMPANY_NAME}: ${row.routeFrom} -> ${row.routeTo}, ${row.sourceVehicle}, ${row.supplierPrice} ${CURRENCY} net.`,
        sourceStatus: 'approved',
        sourceMetaJson: JSON.stringify({
          source: SOURCE,
          sourceFile: SOURCE_FILE,
          sourcePath: SOURCE_PATH,
          sourceSheet: 'Sheet1',
          sourceCell: row.sourceCell,
          sourceServiceLabel: row.sourceLabel,
          sourceVehicle: row.sourceVehicle,
          sourceSha256: SOURCE_SHA256,
          validYear: 2026,
          reverseDirectionConfirmed: false
        }),
        isActive: true
      }
      const previousRoute = await tx.driverRoute.findFirst({
        where: { tenantId: tenant.id, driverId: driver.id, sourceLabel: row.sourceKey },
        select: { id: true }
      })
      if (previousRoute) {
        await tx.driverRoute.update({ where: { id: previousRoute.id }, data: routeData })
        driverUpdated += 1
      } else {
        await tx.driverRoute.create({ data: routeData })
        driverCreated += 1
      }
    }

    const archivedSupplier = await tx.supplierPriceRule.updateMany({
      where: {
        tenantId: tenant.id,
        supplierCompanyId: company.id,
        sourceKey: { startsWith: `${SOURCE}:`, notIn: activeSupplierKeys }
      },
      data: { isActive: false, sourceStatus: 'archived' }
    })
    const archivedDriver = await tx.driverRoute.updateMany({
      where: {
        tenantId: tenant.id,
        driverId: driver.id,
        sourceLabel: { startsWith: `${SOURCE}:`, notIn: activeDriverKeys }
      },
      data: { isActive: false, sourceStatus: 'archived' }
    })

    const [supplierRuleCount, driverRouteCount] = await Promise.all([
      tx.supplierPriceRule.count({
        where: { tenantId: tenant.id, supplierCompanyId: company.id, sourceKey: { in: activeSupplierKeys }, isActive: true }
      }),
      tx.driverRoute.count({
        where: { tenantId: tenant.id, driverId: driver.id, sourceLabel: { in: activeDriverKeys }, isActive: true }
      })
    ])

    if (supplierRuleCount !== activeSupplierKeys.length || driverRouteCount !== activeDriverKeys.length) {
      throw new Error(`Verification failed: supplier ${supplierRuleCount}/${activeSupplierKeys.length}, routes ${driverRouteCount}/${activeDriverKeys.length}`)
    }

    const summary = {
      company: { id: company.id, name: company.name },
      contact: { id: contact.id, fullName: contact.fullName, email: contact.email, phone: contact.phone },
      driver: { id: driver.id, name: driver.name, verificationStatus: driver.verificationStatus },
      supplierRules: {
        total: supplierRuleCount,
        created: supplierCreated,
        updated: supplierUpdated,
        archived: archivedSupplier.count
      },
      driverRoutes: {
        total: driverRouteCount,
        created: driverCreated,
        updated: driverUpdated,
        archived: archivedDriver.count
      }
    }

    await tx.auditLog.create({
      data: {
        tenantId: tenant.id,
        actorRole: 'pricing_admin',
        action: 'pricing.supplier_net_prices.import',
        resource: 'SupplierPriceRule',
        resourceId: company.id,
        traceId: `transferme-budapest-import-${Date.now()}`,
        decision: 'approved_by_owner_in_codex_task',
        result: 'success',
        contextJson: JSON.stringify({ source: SOURCE, sourceFile: SOURCE_FILE, sourceSha256: SOURCE_SHA256, summary })
      }
    })

    return summary
  })
}

async function main() {
  const tenant = await getTenant(prisma)
  const rows = buildRows()
  const existing = await findExisting(prisma, tenant.id)
  const transferRows = rows.filter((row) => row.isTransfer)
  const preview = {
    mode: APPLY ? 'apply' : 'dry-run',
    tenant,
    source: {
      key: SOURCE,
      file: SOURCE_FILE,
      sha256: SOURCE_SHA256,
      quotedAt: SOURCE_QUOTED_AT,
      validFrom: STARTS_AT,
      validThrough: ENDS_AT
    },
    existing: {
      company: existing.company ? { id: existing.company.id, name: existing.company.name } : null,
      contact: existing.contact ? { id: existing.contact.id, fullName: existing.contact.fullName } : null,
      driver: existing.driver ? { id: existing.driver.id, name: existing.driver.name } : null
    },
    intended: {
      supplierRules: rows.length,
      driverRoutes: transferRows.length,
      serviceCategories: [...new Set(rows.map((row) => row.category))],
      sourceVehicles: vehicles.map((vehicle) => vehicle.sourceVehicle),
      omittedZeroPrices: [
        { sourceCell: 'H3', service: 'Aquaworld transfer', vehicle: 'Sprinter 19 Pax' },
        { sourceCell: 'I3', service: 'Aquaworld transfer', vehicle: 'Bus 53 Pax' }
      ],
      mirroredDirectionsCreated: 0
    },
    sample: rows.slice(0, 6).map((row) => ({
      sourceCell: row.sourceCell,
      category: row.category,
      routeFrom: row.routeFrom,
      routeTo: row.routeTo,
      vehicleType: row.sourceVehicle,
      passengers: row.passengers,
      supplierPrice: row.supplierPrice,
      currency: CURRENCY
    }))
  }

  if (!APPLY) {
    console.log(JSON.stringify(preview, null, 2))
    return
  }

  const applied = await applyChanges(tenant, existing, rows)
  console.log(JSON.stringify({ ...preview, applied }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
}).finally(async () => prisma.$disconnect())
