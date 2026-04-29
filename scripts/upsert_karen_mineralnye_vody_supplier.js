#!/usr/bin/env node
require('dotenv').config()

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const SOURCE_LABEL = 'Manual image price list, Karen, Mineralnye Vody, 01.12.2025-01.12.2026'
const SOURCE_QUOTED_AT = new Date('2025-12-01T00:00:00+03:00')
const VALID_FROM = '2025-12-01'
const VALID_TO = '2026-12-01'
const SOURCE_MESSAGE = [
  'Karen price list, Mineralnye Vody / Russia.',
  'Validity: 1 Dec 2025 - 1 Dec 2026.',
  'Currency: RUB.',
  'Extra: +500 RUB when all passenger seats are filled.',
  'Dombay/Arkhyz/Kislovodsk-Terskol group extras: Romantik +1000 RUB; Taulu/Sofiyskaya Polyana +1000 RUB for standard/comfort/compactvan and +1500 RUB for minivans.',
  'Per-km Russia fallback rates are stored as route rows with pricingKind=per_km.'
].join('\n')

const VEHICLE_LABELS = {
  standard: 'Стандарт',
  comfort: 'Комфорт',
  compactvan: 'Компактвэн',
  minivan_6_7: 'Минивэн 6-7 мест',
  minivan_8: 'Минивэн 8 мест',
  minivan_9_11: 'Минивэн 9-11 мест'
}

const COMMON_META = {
  validFrom: VALID_FROM,
  validTo: VALID_TO,
  currency: 'RUB',
  source: 'uploaded_image',
  fullSeatsExtraRub: 500
}

const LONG_ROUTE_EXTRAS = {
  romantikExtraRub: 1000,
  tauluSofiyskayaPolyanaExtraRub: {
    standard: 1000,
    comfort: 1000,
    compactvan: 1000,
    minivan_6_7: 1500,
    minivan_8: 1500,
    minivan_9_11: 1500
  }
}

const fixedRouteGroups = [
  {
    fromPoints: ['Минеральные Воды'],
    toPoints: ['Домбай', 'Архыз'],
    prices: {
      standard: 6000,
      comfort: 7000,
      compactvan: 7000,
      minivan_6_7: 8500,
      minivan_8: 12000,
      minivan_9_11: 14000
    },
    meta: { routeGroup: 'Минеральные Воды - Домбай/Архыз', extras: LONG_ROUTE_EXTRAS }
  },
  {
    fromPoints: ['Кисловодск'],
    toPoints: ['Терскол'],
    prices: {
      standard: 6000,
      comfort: 7000,
      compactvan: 7000,
      minivan_6_7: 8500,
      minivan_8: 12000,
      minivan_9_11: 14000
    },
    meta: { routeGroup: 'Кисловодск - Терскол', extras: LONG_ROUTE_EXTRAS }
  },
  {
    fromPoints: ['Минеральные Воды'],
    toPoints: ['Терскол', 'Теберда'],
    prices: {
      standard: 5500,
      comfort: 6500,
      compactvan: 6500,
      minivan_6_7: 8000,
      minivan_8: 12000,
      minivan_9_11: 14000
    },
    meta: { routeGroup: 'Минеральные Воды - Терскол/Теберда' }
  },
  {
    fromPoints: ['Невинномысск'],
    toPoints: ['Домбай', 'Архыз'],
    prices: {
      standard: 5500,
      comfort: 6500,
      compactvan: 6500,
      minivan_6_7: 8000,
      minivan_8: 12000,
      minivan_9_11: 14000
    },
    meta: { routeGroup: 'Невинномысск - Домбай/Архыз' }
  },
  {
    fromPoints: ['Домбай'],
    toPoints: ['Архыз'],
    prices: {
      standard: 5500,
      comfort: 6500,
      compactvan: 6500,
      minivan_6_7: 8000,
      minivan_8: 12000,
      minivan_9_11: 14000
    },
    meta: { routeGroup: 'Домбай - Архыз' }
  },
  {
    fromPoints: ['Ставрополь'],
    toPoints: ['Домбай', 'Архыз'],
    prices: {
      standard: 7000,
      comfort: 9500,
      compactvan: 9500,
      minivan_6_7: 10500,
      minivan_8: 13000,
      minivan_9_11: 15500
    },
    meta: { routeGroup: 'Ставрополь - Домбай/Архыз' }
  },
  {
    fromPoints: ['Минеральные Воды'],
    toPoints: ['Аэропорт Минеральные Воды', 'ЖД Минеральные Воды', 'Минеральные Воды город'],
    prices: {
      standard: 700,
      comfort: 1000,
      compactvan: 1000,
      minivan_6_7: 1500,
      minivan_8: 1800,
      minivan_9_11: 2200
    },
    meta: { routeGroup: 'Минеральные Воды - аэропорт/ЖД/город' }
  },
  {
    fromPoints: ['Минеральные Воды'],
    toPoints: ['Железноводск'],
    prices: {
      standard: 1000,
      comfort: 1400,
      compactvan: 1400,
      minivan_6_7: 1600,
      minivan_8: 2200,
      minivan_9_11: 2700
    },
    meta: { routeGroup: 'Минеральные Воды - Железноводск' }
  },
  {
    fromPoints: ['Минеральные Воды'],
    toPoints: ['Пятигорск'],
    prices: {
      standard: 1300,
      comfort: 1700,
      compactvan: 1700,
      minivan_6_7: 2100,
      minivan_8: 2800,
      minivan_9_11: 3300
    },
    meta: { routeGroup: 'Минеральные Воды - Пятигорск' }
  },
  {
    fromPoints: ['Минеральные Воды'],
    toPoints: ['Ессентуки'],
    prices: {
      standard: 1400,
      comfort: 2200,
      compactvan: 2200,
      minivan_6_7: 2600,
      minivan_8: 3400,
      minivan_9_11: 4000
    },
    meta: { routeGroup: 'Минеральные Воды - Ессентуки' }
  },
  {
    fromPoints: ['Минеральные Воды'],
    toPoints: ['Кисловодск'],
    prices: {
      standard: 2000,
      comfort: 2500,
      compactvan: 2500,
      minivan_6_7: 3100,
      minivan_8: 3800,
      minivan_9_11: 4500
    },
    meta: { routeGroup: 'Минеральные Воды - Кисловодск' }
  }
]

const perKmRates = {
  standard: 29,
  comfort: 36,
  compactvan: 36,
  minivan_6_7: 46,
  minivan_8: 55,
  minivan_9_11: 60
}

async function getTenant() {
  const tenant = await prisma.tenant.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' }
  })
  if (!tenant) throw new Error('Active tenant not found')
  return tenant
}

async function upsertSupplierContact(tenantId) {
  let contact = await prisma.customerContact.findFirst({
    where: {
      tenantId,
      OR: [
        { externalId: 'manual:karen:mineralnye-vody' },
        { fullName: { equals: 'Карен', mode: 'insensitive' } }
      ]
    }
  })

  const comment = [
    'Supplier contact in Mineralnye Vody, Russia.',
    `Price source: ${SOURCE_LABEL}.`,
    'Phone is not provided in the source image.',
    'Rates are stored in DriverRoute by route and class.'
  ].join('\n')

  const data = {
    tenantId,
    sourceSystem: 'manual_supplier',
    externalId: 'manual:karen:mineralnye-vody',
    fullName: 'Карен',
    phone: null,
    registrationCountry: 'Russia',
    registrationCity: 'Минеральные Воды',
    presenceCountries: 'Russia',
    presenceCities: 'Минеральные Воды, Домбай, Архыз, Терскол, Теберда, Невинномысск, Ставрополь, Железноводск, Пятигорск, Ессентуки, Кисловодск',
    countryPresence: 'Russia',
    cityPresence: 'Минеральные Воды',
    comment
  }

  contact = contact
    ? await prisma.customerContact.update({ where: { id: contact.id }, data })
    : await prisma.customerContact.create({ data })

  await prisma.customerContactSegment.upsert({
    where: {
      contactId_segment: {
        contactId: contact.id,
        segment: 'supplier_contact'
      }
    },
    update: { sourceFile: 'manual_image' },
    create: {
      contactId: contact.id,
      segment: 'supplier_contact',
      sourceFile: 'manual_image'
    }
  })

  return contact
}

async function upsertSupplierCompany(tenantId, contactId) {
  let company = await prisma.customerCompany.findFirst({
    where: {
      tenantId,
      OR: [
        { externalId: 'manual:carrier:karen:mineralnye-vody' },
        { name: { equals: 'Карен', mode: 'insensitive' } }
      ]
    }
  })

  const comment = [
    'Individual carrier in Mineralnye Vody, Russia.',
    `Price source: ${SOURCE_LABEL}.`,
    'Classes covered: standard, comfort, compactvan, minivan 6-7, minivan 8, minivan 9-11.',
    'Validity: 01.12.2025-01.12.2026.'
  ].join('\n')

  const data = {
    tenantId,
    sourceSystem: 'manual_supplier',
    externalId: 'manual:carrier:karen:mineralnye-vody',
    name: 'Карен',
    phone: null,
    registrationCountry: 'Russia',
    registrationCity: 'Минеральные Воды',
    presenceCountries: 'Russia',
    presenceCities: 'Минеральные Воды, Домбай, Архыз, Терскол, Теберда, Невинномысск, Ставрополь, Железноводск, Пятигорск, Ессентуки, Кисловодск',
    countryPresence: 'Russia',
    cityPresence: 'Минеральные Воды',
    companyType: 'individual_carrier',
    comment
  }

  company = company
    ? await prisma.customerCompany.update({ where: { id: company.id }, data })
    : await prisma.customerCompany.create({ data })

  await prisma.customerCompanySegment.upsert({
    where: {
      companyId_segment: {
        companyId: company.id,
        segment: 'supplier_company'
      }
    },
    update: { sourceFile: 'manual_image' },
    create: {
      companyId: company.id,
      segment: 'supplier_company',
      sourceFile: 'manual_image'
    }
  })

  await prisma.customerCompanyContact.upsert({
    where: {
      companyId_contactId: {
        companyId: company.id,
        contactId
      }
    },
    update: {
      source: 'manual_image',
      matchType: 'contact_name'
    },
    create: {
      companyId: company.id,
      contactId,
      source: 'manual_image',
      matchType: 'contact_name'
    }
  })

  return company
}

async function upsertDriver(tenantId, supplierContactId, supplierCompanyId) {
  let driver = await prisma.driver.findFirst({
    where: {
      tenantId,
      OR: [
        { supplierContactId },
        { name: { equals: 'Карен', mode: 'insensitive' } }
      ]
    }
  })

  const comment = [
    'Linked supplier contact: Karen, Mineralnye Vody.',
    `Primary source: ${SOURCE_LABEL}.`,
    'Phone is not provided in the source image.',
    'Use supplier route prices for pre-assignment margin checks.',
    'Rates are in RUB and valid 01.12.2025-01.12.2026.',
    'Global extra: +500 RUB when all passenger seats are filled.',
    'Prijelbrusye car-class examples from source are retained in route sourceMetaJson.'
  ].join('\n')

  const data = {
    tenantId,
    name: 'Карен',
    email: driver?.email || null,
    phone: driver?.phone || '',
    country: 'Russia',
    city: 'Минеральные Воды',
    pricingCurrency: 'RUB',
    verificationStatus: 'verified',
    isActive: true,
    supplierContactId,
    supplierCompanyId,
    comment
  }

  driver = driver
    ? await prisma.driver.update({ where: { id: driver.id }, data })
    : await prisma.driver.create({ data })

  return driver
}

function buildRouteRows() {
  const rows = []

  for (const group of fixedRouteGroups) {
    for (const fromPoint of group.fromPoints) {
      for (const toPoint of group.toPoints) {
        for (const [vehicleType, driverPrice] of Object.entries(group.prices)) {
          rows.push({
            fromPoint,
            toPoint,
            vehicleType,
            driverPrice,
            meta: {
              ...COMMON_META,
              pricingKind: 'fixed',
              vehicleLabel: VEHICLE_LABELS[vehicleType],
              ...group.meta
            }
          })
        }
      }
    }
  }

  for (const [vehicleType, driverPrice] of Object.entries(perKmRates)) {
    rows.push({
      fromPoint: 'Россия',
      toPoint: 'Все остальные маршруты за 1 км',
      vehicleType,
      driverPrice,
      meta: {
        ...COMMON_META,
        pricingKind: 'per_km',
        vehicleLabel: VEHICLE_LABELS[vehicleType],
        routeGroup: 'Все остальные маршруты по России за 1 км'
      }
    })
  }

  return rows
}

async function upsertRoute(driverId, tenantId, row) {
  const existing = await prisma.driverRoute.findFirst({
    where: {
      tenantId,
      driverId,
      fromPoint: row.fromPoint,
      toPoint: row.toPoint,
      vehicleType: row.vehicleType
    }
  })

  const data = {
    tenantId,
    driverId,
    fromPoint: row.fromPoint,
    toPoint: row.toPoint,
    vehicleType: row.vehicleType,
    driverPrice: row.driverPrice,
    ourPrice: null,
    currency: 'RUB',
    sourceType: 'manual_image',
    sourceLabel: SOURCE_LABEL,
    sourceQuotedAt: SOURCE_QUOTED_AT,
    sourceMessage: SOURCE_MESSAGE,
    sourceStatus: 'approved',
    sourceMetaJson: JSON.stringify(row.meta),
    isActive: true
  }

  if (existing) {
    return prisma.driverRoute.update({
      where: { id: existing.id },
      data
    })
  }

  return prisma.driverRoute.create({ data })
}

async function main() {
  const tenant = await getTenant()
  const contact = await upsertSupplierContact(tenant.id)
  const company = await upsertSupplierCompany(tenant.id, contact.id)
  const driver = await upsertDriver(tenant.id, contact.id, company.id)
  const routeRows = buildRouteRows()
  const routes = []

  for (const row of routeRows) {
    routes.push(await upsertRoute(driver.id, tenant.id, row))
  }

  console.log(JSON.stringify({
    ok: true,
    tenant: { id: tenant.id, code: tenant.code, name: tenant.name },
    company: { id: company.id, name: company.name, companyType: company.companyType },
    contact: { id: contact.id, fullName: contact.fullName, phone: contact.phone },
    driver: { id: driver.id, name: driver.name, city: driver.city, country: driver.country },
    routesUpserted: routes.length,
    fixedRoutes: routes.filter((route) => !String(route.toPoint).includes('1 км')).length,
    perKmRoutes: routes.filter((route) => String(route.toPoint).includes('1 км')).length
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
