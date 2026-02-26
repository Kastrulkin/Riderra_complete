#!/usr/bin/env node
require('dotenv').config()

const fs = require('fs')
const path = require('path')
const Papa = require('papaparse')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const BASE = process.env.PLANFIX_BASE_DIR || '/Users/alexdemyanov/Downloads/Данные из ПФ'

const files = {
  companiesMaster: 'Компании.csv',
  contactsMaster: 'Контакты.csv',
  companiesClients: 'Clients (companies).csv',
  contactsClients: 'Clients (contacts).csv',
  potentialAgents: 'Potential clients (agents).csv',
  potentialCompanies: 'Potential Clients (companies).csv',
  potentialContacts: 'Potential clients (contacts).csv',
  potentialSuppliers: 'Potential Suppliers.csv',
  suppliersCompanies: 'Suppliers (companies).csv',
  suppliersContacts: 'Suppliers (contacts).csv'
}

// Ручные правила согласованы с бизнесом:
// - contact 74: "HT & HB, HolidayTaxis" относится к HolidayTaxis (Hotelbeds).
// - contact 34: legacy-кейс, можно игнорировать.
const MANUAL_COMPANY_ALIASES = {
  'ht & hb, holidaytaxis': 'holidaytaxis'
}

const IGNORE_COMPANY_REF_KEYS = new Set([
  '34|одигитрия, алтай-сиб'
])

function norm(v) {
  return String(v || '').replace(/\u00a0/g, ' ').replace(/&nbsp;/g, ' ').trim()
}

function normId(v) {
  return norm(v).replace(/\.00$/, '')
}

function normEmail(v) {
  return norm(v).toLowerCase()
}

function normPhone(v) {
  return norm(v).replace(/[()\-\s]/g, '')
}

function nameKey(v) {
  return norm(v).toLowerCase().replace(/\s+/g, ' ')
}

function splitContacts(v) {
  const value = norm(v)
  if (!value) return []
  return value.split(',').map((s) => nameKey(s)).filter(Boolean)
}

function csvRows(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '')
  const parsed = Papa.parse(raw, { header: true, delimiter: ';', skipEmptyLines: true })
  return parsed.data
}

async function main() {
  const report = {
    imported: {},
    segments: {},
    links: { created: 0, unresolvedCompanyRefs: 0, unresolvedContactRefs: 0, ignoredCompanyRefs: 0 },
    dedup: { duplicateEmails: 0, duplicatePhones: 0 },
    unresolvedSamples: { companyRefs: [], contactRefs: [] }
  }

  const companiesRows = csvRows(path.join(BASE, files.companiesMaster))
  const contactsRows = csvRows(path.join(BASE, files.contactsMaster))

  await prisma.crmCompanyContact.deleteMany({})
  await prisma.crmCompanySegment.deleteMany({})
  await prisma.crmContactSegment.deleteMany({})
  await prisma.crmContact.deleteMany({})
  await prisma.crmCompany.deleteMany({})

  for (const row of companiesRows) {
    const externalId = normId(row['Номер'])
    const name = norm(row['Имя Фамилия / Название'])
    if (!externalId || !name) continue

    await prisma.crmCompany.create({
      data: {
        sourceSystem: 'planfix',
        externalId,
        name,
        website: norm(row['Сайт']) || null,
        phone: norm(row['Телефон']) || null,
        email: normEmail(row['Email']) || null,
        ownerName: norm(row['Ответственный']) || null,
        companyType: norm(row['Пол / Тип']) || null,
        extraInfo: null
      }
    })
  }

  for (const row of contactsRows) {
    const externalId = normId(row['Номер'])
    const fullName = norm(row['Имя Фамилия / Название'])
    if (!externalId || !fullName) continue

    await prisma.crmContact.create({
      data: {
        sourceSystem: 'planfix',
        externalId,
        fullName,
        website: norm(row['Сайт']) || null,
        phone: normPhone(row['Телефон']) || null,
        email: normEmail(row['Email']) || null,
        position: norm(row['Должность']) || null,
        ownerName: norm(row['Добавил']) || null
      }
    })
  }

  report.imported.companies = await prisma.crmCompany.count()
  report.imported.contacts = await prisma.crmContact.count()

  const companies = await prisma.crmCompany.findMany({ select: { id: true, externalId: true, name: true } })
  const contacts = await prisma.crmContact.findMany({ select: { id: true, externalId: true, fullName: true } })

  const companyById = new Map(companies.map((c) => [c.externalId, c]))
  const contactById = new Map(contacts.map((c) => [c.externalId, c]))
  const companyByName = new Map(companies.map((c) => [nameKey(c.name), c]))
  const contactByName = new Map(contacts.map((c) => [nameKey(c.fullName), c]))

  const emailAgg = new Map()
  const phoneAgg = new Map()
  for (const c of await prisma.crmContact.findMany({ select: { email: true, phone: true } })) {
    if (c.email) emailAgg.set(c.email, (emailAgg.get(c.email) || 0) + 1)
    if (c.phone) phoneAgg.set(c.phone, (phoneAgg.get(c.phone) || 0) + 1)
  }
  report.dedup.duplicateEmails = [...emailAgg.values()].filter((v) => v > 1).length
  report.dedup.duplicatePhones = [...phoneAgg.values()].filter((v) => v > 1).length

  for (const row of contactsRows) {
    const contactId = normId(row['Номер'])
    const rawCompanyName = nameKey(row['Компания'])
    const ignoreKey = `${contactId}|${rawCompanyName}`
    if (IGNORE_COMPANY_REF_KEYS.has(ignoreKey)) {
      report.links.ignoredCompanyRefs++
      continue
    }
    const companyName = MANUAL_COMPANY_ALIASES[rawCompanyName] || rawCompanyName
    if (!contactId || !companyName) continue
    const contact = contactById.get(contactId)
    const company = companyByName.get(companyName)
    if (!contact || !company) {
      report.links.unresolvedCompanyRefs++
      if (report.unresolvedSamples.companyRefs.length < 25) {
        report.unresolvedSamples.companyRefs.push({ contactExternalId: contactId, companyName: norm(row['Компания']) })
      }
      continue
    }

    await prisma.crmCompanyContact.upsert({
      where: { companyId_contactId: { companyId: company.id, contactId: contact.id } },
      update: { source: 'planfix', matchType: 'company_name' },
      create: { companyId: company.id, contactId: contact.id, source: 'planfix', matchType: 'company_name' }
    })
    report.links.created++
  }

  for (const row of companiesRows) {
    const companyId = normId(row['Номер'])
    const company = companyById.get(companyId)
    if (!company) continue
    const contactNames = splitContacts(row['Контакты'])
    for (const key of contactNames) {
      const contact = contactByName.get(key)
      if (!contact) {
        report.links.unresolvedContactRefs++
        if (report.unresolvedSamples.contactRefs.length < 25) {
          report.unresolvedSamples.contactRefs.push({ companyExternalId: companyId, contactName: key })
        }
        continue
      }
      await prisma.crmCompanyContact.upsert({
        where: { companyId_contactId: { companyId: company.id, contactId: contact.id } },
        update: { source: 'planfix', matchType: 'contact_name' },
        create: { companyId: company.id, contactId: contact.id, source: 'planfix', matchType: 'contact_name' }
      })
      report.links.created++
    }
  }

  const segmentConfig = [
    { file: files.companiesClients, entity: 'company', segment: 'client_company' },
    { file: files.contactsClients, entity: 'contact', segment: 'client_contact' },
    { file: files.potentialAgents, entity: 'company', segment: 'potential_client_agent' },
    { file: files.potentialCompanies, entity: 'company', segment: 'potential_client_company' },
    { file: files.potentialContacts, entity: 'contact', segment: 'potential_client_contact' },
    { file: files.potentialSuppliers, entity: 'company', segment: 'potential_supplier' },
    { file: files.suppliersCompanies, entity: 'company', segment: 'supplier_company' },
    { file: files.suppliersContacts, entity: 'contact', segment: 'supplier_contact' }
  ]

  for (const config of segmentConfig) {
    const rows = csvRows(path.join(BASE, config.file))
    let matched = 0
    let missed = 0

    for (const row of rows) {
      const externalId = normId(row['Номер'])
      if (!externalId) continue

      if (config.entity === 'company') {
        const company = companyById.get(externalId)
        if (!company) {
          missed++
          continue
        }
        await prisma.crmCompanySegment.upsert({
          where: { companyId_segment: { companyId: company.id, segment: config.segment } },
          update: { sourceFile: config.file },
          create: { companyId: company.id, segment: config.segment, sourceFile: config.file }
        })
      } else {
        const contact = contactById.get(externalId)
        if (!contact) {
          missed++
          continue
        }
        await prisma.crmContactSegment.upsert({
          where: { contactId_segment: { contactId: contact.id, segment: config.segment } },
          update: { sourceFile: config.file },
          create: { contactId: contact.id, segment: config.segment, sourceFile: config.file }
        })
      }
      matched++
    }

    report.segments[config.file] = { matched, missed }
  }

  report.imported.companySegments = await prisma.crmCompanySegment.count()
  report.imported.contactSegments = await prisma.crmContactSegment.count()
  report.imported.companyContactLinks = await prisma.crmCompanyContact.count()

  const ts = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19)
  const outJson = path.join('reports', `planfix_staging_report_${ts}.json`)
  fs.writeFileSync(outJson, JSON.stringify(report, null, 2), 'utf8')

  console.log(JSON.stringify({ ok: true, reportPath: outJson, report }, null, 2))
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
