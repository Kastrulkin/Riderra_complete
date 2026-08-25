#!/usr/bin/env node
require('dotenv').config()

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const APPLY = process.argv.includes('--apply')
const SOURCE_KEY = 'manual:etaxi-rovaniemi-rvn-2026-03'
const SOURCE_FILE = '03.2026 RVN airport prices - eTaxi Rovaniemi.xlsx'
const SOURCE_QUOTED_AT = new Date('2026-03-01T00:00:00.000Z')
const COMPANY_NAME = 'eTaxi Rovaniemi'
const GENERAL_PHONE = '+358405056600'
const ROUTE_FROM = 'Rovaniemi Airport (RVN)'
const CURRENCY = 'EUR'

const zones = [
  { zone: 1, row: 2, label: 'Tarvantie/Santa Claus Village area', sedan: 55, minivan: 65, destinations: ['Tarvantie', 'Santa Claus Village area'] },
  { zone: 2, row: 13, label: 'Tutkijantie', sedan: 55, minivan: 65, destinations: ['Tutkijantie'] },
  { zone: 3, row: 22, label: 'Hetepuronpolku/Yli-Mommo/Rovaniemen mlk Suutarinkorva/Ylipaa/Syvasenvaar/Nivavaara', sedan: 55, minivan: 65, destinations: ['Hetepuronpolku', 'Yli-Mommo', 'Rovaniemen mlk Suutarinkorva', 'Ylipaa', 'Syvasenvaar', 'Nivavaara'] },
  { zone: 4, row: 23, label: 'Vaarala', sedan: 55, minivan: 65, destinations: ['Vaarala'] },
  { zone: 5, row: 24, label: 'Koskenkyla', sedan: 55, minivan: 65, destinations: ['Koskenkyla'] },
  { zone: 6, row: 25, label: 'Pullinranta/Karvonranta', sedan: 55, minivan: 65, destinations: ['Pullinranta', 'Karvonranta'] },
  { zone: 7, row: 26, label: 'Poykkola/ Ounasrinne', sedan: 55, minivan: 65, destinations: ['Poykkola', 'Ounasrinne'] },
  { zone: 8, row: 27, label: 'Rovaniemi/Korkalovaara', sedan: 55, minivan: 65, destinations: ['Rovaniemi City', 'Korkalovaara'] },
  { zone: 9, row: 28, label: 'Sinettä/Lehtojärvi', sedan: 90, minivan: 105, destinations: ['Sinettä', 'Lehtojärvi'] },
  { zone: 10, row: 3, label: 'Luosto', sedan: 250, minivan: 300, destinations: ['Luosto'] },
  { zone: 11, row: 4, label: 'Pyhä Station', sedan: 270, minivan: 320, destinations: ['Pyhä Station'] },
  { zone: 12, row: 5, label: 'Salla', sedan: 335, minivan: 395, destinations: ['Salla'] },
  { zone: 13, row: 6, label: 'Ruka', sedan: 430, minivan: 500, destinations: ['Ruka'] },
  { zone: 14, row: 7, label: 'Syöte', sedan: 365, minivan: 430, destinations: ['Syöte'] },
  { zone: 15, row: 8, label: 'Kemi', sedan: 280, minivan: 340, destinations: ['Kemi'] },
  { zone: 16, row: 9, label: 'Kiiruna Area', sedan: 730, minivan: 850, destinations: ['Kiruna Area'] },
  { zone: 17, row: 10, label: 'Saariselkä / Kakslauttanen', sedan: 550, minivan: 580, destinations: ['Saariselkä', 'Kakslauttanen'] },
  { zone: 18, row: 11, label: 'Inari', sedan: 680, minivan: 760, destinations: ['Inari'] },
  { zone: 19, row: 12, label: 'Vaattunki Wilderness Resort', sedan: 70, minivan: 80, destinations: ['Vaattunki Wilderness Resort'] },
  { zone: 20, row: 14, label: 'Ivalo', sedan: 620, minivan: 695, destinations: ['Ivalo'] },
  { zone: 21, row: 15, label: 'Harads', sedan: 655, minivan: 765, destinations: ['Harads'] },
  { zone: 22, row: 16, label: 'Ylläs', sedan: 390, minivan: 450, destinations: ['Ylläs'] },
  { zone: 23, row: 17, label: 'Muonio (Harriniva, Pallas, Olos)', sedan: 495, minivan: 580, destinations: ['Muonio', 'Harriniva', 'Pallas', 'Olos'] },
  { zone: 24, row: 18, label: 'Levi', sedan: 370, minivan: 435, destinations: ['Levi'] },
  { zone: 25, row: 19, label: 'Ranua', sedan: 200, minivan: 230, destinations: ['Ranua'] },
  { zone: 26, row: 20, label: 'Kirkenes', sedan: 1120, minivan: 1260, destinations: ['Kirkenes'] },
  { zone: 27, row: 21, label: 'Tromssa Area', sedan: 1235, minivan: 1430, destinations: ['Tromssa Area'] }
]

function normalize(value) {
  return String(value || '').trim().toLocaleLowerCase('en-US')
}

function appendNote(existing, note) {
  const current = String(existing || '').trim()
  if (current.includes(note)) return current
  return [current, note].filter(Boolean).join('\n')
}

function minivanVehicleType(destination, sales) {
  const row = sales.find((item) => normalize(item.routeTo) === normalize(destination) && normalize(item.vehicleType).includes('minivan'))
  return row?.vehicleType || 'Standard minivan 7 pax'
}

function saleFor(destination, vehicleType, sales) {
  const exact = sales.find((item) => normalize(item.routeTo) === normalize(destination) && normalize(item.vehicleType) === normalize(vehicleType))
  if (exact) return exact
  if (normalize(vehicleType).includes('minivan')) {
    return sales.find((item) => normalize(item.routeTo) === normalize(destination) && normalize(item.vehicleType).includes('minivan')) || null
  }
  return null
}

function buildRouteRows(sales) {
  const rows = []
  let destinationIndex = 0
  for (const zone of zones) {
    for (const destination of zone.destinations) {
      destinationIndex += 1
      const vehicleRows = [
        { code: 'sedan', sourceVehicle: 'Sedan 3 pax', vehicleType: 'Standard class car', driverPrice: zone.sedan },
        { code: 'mv', sourceVehicle: 'MV 7 pax', vehicleType: minivanVehicleType(destination, sales), driverPrice: zone.minivan }
      ]
      for (const vehicle of vehicleRows) {
        const sale = saleFor(destination, vehicle.vehicleType, sales)
        rows.push({
          ...vehicle,
          zone: zone.zone,
          sheetRow: zone.row,
          sourceZoneLabel: zone.label,
          destinationIndex,
          destination,
          sale
        })
      }
    }
  }
  return rows
}

async function loadContext(client) {
  const tenant = await client.tenant.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true, code: true, name: true }
  })
  if (!tenant) throw new Error('Active tenant not found')

  const sales = await client.cityPricing.findMany({
    where: {
      tenantId: tenant.id,
      isActive: true,
      routeFrom: { equals: ROUTE_FROM, mode: 'insensitive' }
    },
    select: { id: true, routeFrom: true, routeTo: true, vehicleType: true, fixedPrice: true, currency: true },
    orderBy: [{ routeTo: 'asc' }, { vehicleType: 'asc' }]
  })

  const company = await client.customerCompany.findFirst({
    where: {
      tenantId: tenant.id,
      OR: [
        { sourceSystem: 'manual_supplier', externalId: 'etaxi-rovaniemi' },
        { name: { equals: COMPANY_NAME, mode: 'insensitive' } }
      ]
    },
    include: { links: { include: { contact: true } }, supplierDrivers: { include: { routes: true } } }
  })

  return { tenant, sales, company, routeRows: buildRouteRows(sales) }
}

function buildAnalysis(context) {
  const comparisons = context.routeRows.map((row) => {
    const sellPrice = row.sale?.fixedPrice == null ? null : Number(row.sale.fixedPrice)
    const netPrice = Number(row.driverPrice)
    const marginAbs = sellPrice == null ? null : sellPrice - netPrice
    const marginPct = sellPrice && marginAbs != null ? (marginAbs / sellPrice) * 100 : null
    const markupPct = netPrice > 0 && marginAbs != null ? (marginAbs / netPrice) * 100 : null
    return {
      destination: row.destination,
      vehicleType: row.vehicleType,
      zone: row.zone,
      netPrice,
      sellPrice,
      currency: CURRENCY,
      marginAbs,
      marginPct,
      markupPct,
      status: sellPrice == null ? 'missing_sale' : marginAbs < 0 ? 'negative_margin' : marginPct < 10 ? 'low_margin' : 'ok'
    }
  })

  return {
    comparisons,
    counts: comparisons.reduce((acc, row) => {
      acc[row.status] = (acc[row.status] || 0) + 1
      return acc
    }, {}),
    missingSaleDestinations: [...new Set(comparisons.filter((row) => row.status === 'missing_sale').map((row) => row.destination))],
    negativeMargin: comparisons.filter((row) => row.status === 'negative_margin'),
    lowMargin: comparisons.filter((row) => row.status === 'low_margin')
  }
}

async function applyChanges(context) {
  return prisma.$transaction(async (tx) => {
    const companyData = {
      tenantId: context.tenant.id,
      name: COMPANY_NAME,
      phone: GENERAL_PHONE,
      registrationCountry: 'Finland',
      registrationCity: 'Rovaniemi',
      presenceCountries: 'Finland',
      presenceCities: 'Finland: Rovaniemi',
      countryPresence: 'Finland',
      cityPresence: 'Rovaniemi',
      companyType: 'supplier',
      ownerName: 'General contact',
      comment: appendNote(context.company?.comment, `Current contact: general WhatsApp/calls ${GENERAL_PHONE}. Tommi left the company. Supplier net prices source=${SOURCE_KEY}; file=${SOURCE_FILE}.`)
    }

    const company = context.company
      ? await tx.customerCompany.update({ where: { id: context.company.id }, data: companyData })
      : await tx.customerCompany.create({
          data: { sourceSystem: 'manual_supplier', externalId: 'etaxi-rovaniemi', ...companyData }
        })

    const existingGeneral = await tx.customerContact.findFirst({
      where: {
        tenantId: context.tenant.id,
        OR: [
          { sourceSystem: 'manual_supplier_contact', externalId: 'etaxi-rovaniemi-general' },
          { phone: GENERAL_PHONE },
          { fullName: { equals: 'eTaxi Rovaniemi — general contact', mode: 'insensitive' } }
        ]
      }
    })
    const contactData = {
      tenantId: context.tenant.id,
      fullName: 'eTaxi Rovaniemi — general contact',
      phone: GENERAL_PHONE,
      position: 'General WhatsApp and phone contact',
      registrationCountry: 'Finland',
      registrationCity: 'Rovaniemi',
      presenceCountries: 'Finland',
      presenceCities: 'Finland: Rovaniemi',
      countryPresence: 'Finland',
      cityPresence: 'Rovaniemi',
      comment: appendNote(existingGeneral?.comment, 'Use this common number for WhatsApp messages and calls. Tommi is no longer employed by the supplier.')
    }
    const contact = existingGeneral
      ? await tx.customerContact.update({ where: { id: existingGeneral.id }, data: contactData })
      : await tx.customerContact.create({
          data: { sourceSystem: 'manual_supplier_contact', externalId: 'etaxi-rovaniemi-general', ...contactData }
        })

    await tx.customerCompanyContact.upsert({
      where: { companyId_contactId: { companyId: company.id, contactId: contact.id } },
      update: { source: 'manual', matchType: 'confirmed_general_contact' },
      create: { companyId: company.id, contactId: contact.id, source: 'manual', matchType: 'confirmed_general_contact' }
    })

    const formerTommiContacts = await tx.customerContact.findMany({
      where: {
        tenantId: context.tenant.id,
        fullName: { contains: 'tommi', mode: 'insensitive' },
        links: { some: { companyId: company.id } }
      }
    })
    for (const former of formerTommiContacts) {
      await tx.customerContact.update({
        where: { id: former.id },
        data: {
          position: 'Former contact — left company',
          comment: appendNote(former.comment, 'Inactive supplier contact: Tommi left eTaxi Rovaniemi. Replaced by the general WhatsApp/phone number.')
        }
      })
    }

    const existingDriver = await tx.driver.findFirst({
      where: {
        tenantId: context.tenant.id,
        OR: [
          { supplierCompanyId: company.id },
          { name: { equals: COMPANY_NAME, mode: 'insensitive' } }
        ]
      }
    })
    const driverData = {
      tenantId: context.tenant.id,
      name: COMPANY_NAME,
      phone: GENERAL_PHONE,
      country: 'Finland',
      city: 'Rovaniemi',
      supplierCompanyId: company.id,
      supplierContactId: contact.id,
      isActive: true,
      verificationStatus: 'verified',
      pricingCurrency: CURRENCY,
      comment: appendNote(existingDriver?.comment, `General WhatsApp/calls: ${GENERAL_PHONE}. Current approved net price source=${SOURCE_KEY}.`)
    }
    const driver = existingDriver
      ? await tx.driver.update({ where: { id: existingDriver.id }, data: driverData })
      : await tx.driver.create({ data: driverData })

    const routeIds = []
    let created = 0
    let updated = 0
    for (const row of context.routeRows) {
      const sourceLabel = `${SOURCE_KEY}:z${row.zone}:d${row.destinationIndex}:${row.code}`
      const data = {
        tenantId: context.tenant.id,
        driverId: driver.id,
        fromPoint: ROUTE_FROM,
        toPoint: row.destination,
        vehicleType: row.vehicleType,
        driverPrice: row.driverPrice,
        ourPrice: row.sale?.fixedPrice == null ? null : Number(row.sale.fixedPrice),
        currency: CURRENCY,
        sourceType: 'sheet',
        sourceLabel,
        sourceQuotedAt: SOURCE_QUOTED_AT,
        sourceMessage: `${COMPANY_NAME} ${SOURCE_FILE}, Sheet1 row ${row.sheetRow}, Zone ${row.zone} ${row.sourceZoneLabel}, ${row.sourceVehicle}: ${row.driverPrice} ${CURRENCY}.`,
        sourceStatus: 'approved',
        sourceMetaJson: JSON.stringify({
          source: SOURCE_KEY,
          file: SOURCE_FILE,
          sheet: 'Sheet1',
          row: row.sheetRow,
          zone: row.zone,
          sourceZoneLabel: row.sourceZoneLabel,
          sourceVehicle: row.sourceVehicle,
          canonicalDestination: row.destination
        }),
        isActive: true
      }
      const existing = await tx.driverRoute.findFirst({ where: { tenantId: context.tenant.id, driverId: driver.id, sourceLabel } })
      const saved = existing
        ? await tx.driverRoute.update({ where: { id: existing.id }, data })
        : await tx.driverRoute.create({ data })
      routeIds.push(saved.id)
      if (existing) updated += 1
      else created += 1
    }

    const archived = await tx.driverRoute.updateMany({
      where: {
        tenantId: context.tenant.id,
        driverId: driver.id,
        sourceLabel: { startsWith: SOURCE_KEY },
        id: { notIn: routeIds }
      },
      data: { isActive: false, sourceStatus: 'archived' }
    })

    return {
      company: { id: company.id, name: company.name, phone: company.phone },
      contact: { id: contact.id, fullName: contact.fullName, phone: contact.phone },
      driver: { id: driver.id, name: driver.name, phone: driver.phone },
      formerTommiContactsUpdated: formerTommiContacts.length,
      routes: { created, updated, archived: archived.count, active: routeIds.length }
    }
  })
}

async function main() {
  const context = await loadContext(prisma)
  const analysis = buildAnalysis(context)
  const preview = {
    mode: APPLY ? 'apply' : 'preview',
    tenant: context.tenant,
    source: { key: SOURCE_KEY, file: SOURCE_FILE, quotedAt: SOURCE_QUOTED_AT },
    existingSupplier: context.company ? {
      id: context.company.id,
      name: context.company.name,
      phone: context.company.phone,
      contacts: context.company.links.map((link) => ({ id: link.contact.id, fullName: link.contact.fullName, phone: link.contact.phone })),
      drivers: context.company.supplierDrivers.map((driver) => ({ id: driver.id, name: driver.name, routeCount: driver.routes.length }))
    } : null,
    intended: {
      companyName: COMPANY_NAME,
      phone: GENERAL_PHONE,
      sourceZones: zones.length,
      canonicalDestinations: [...new Set(context.routeRows.map((row) => row.destination))].length,
      supplierRouteRows: context.routeRows.length,
      salesRowsChecked: context.sales.length
    },
    analysis
  }

  if (!APPLY) {
    console.log(JSON.stringify(preview, null, 2))
    return
  }

  const applied = await applyChanges(context)
  console.log(JSON.stringify({ ...preview, applied }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
}).finally(async () => {
  await prisma.$disconnect()
})
