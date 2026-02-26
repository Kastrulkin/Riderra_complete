#!/usr/bin/env node
require('dotenv').config()

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const stats = {
    companies: { upserted: 0 },
    contacts: { upserted: 0 },
    companySegments: { upserted: 0 },
    contactSegments: { upserted: 0 },
    links: { upserted: 0 }
  }

  const stagingCompanies = await prisma.crmCompany.findMany()
  const stagingContacts = await prisma.crmContact.findMany()
  const stagingCompanySegments = await prisma.crmCompanySegment.findMany({ include: { company: true } })
  const stagingContactSegments = await prisma.crmContactSegment.findMany({ include: { contact: true } })
  const stagingLinks = await prisma.crmCompanyContact.findMany({ include: { company: true, contact: true } })

  for (const row of stagingCompanies) {
    await prisma.customerCompany.upsert({
      where: {
        sourceSystem_externalId: {
          sourceSystem: row.sourceSystem,
          externalId: row.externalId
        }
      },
      update: {
        name: row.name,
        website: row.website,
        phone: row.phone,
        email: row.email,
        telegramUrl: row.telegramUrl,
        countryPresence: row.countryPresence,
        cityPresence: row.cityPresence,
        comment: row.comment,
        ownerName: row.ownerName,
        companyType: row.companyType,
        extraInfo: row.extraInfo
      },
      create: {
        sourceSystem: row.sourceSystem,
        externalId: row.externalId,
        name: row.name,
        website: row.website,
        phone: row.phone,
        email: row.email,
        telegramUrl: row.telegramUrl,
        countryPresence: row.countryPresence,
        cityPresence: row.cityPresence,
        comment: row.comment,
        ownerName: row.ownerName,
        companyType: row.companyType,
        extraInfo: row.extraInfo
      }
    })
    stats.companies.upserted++
  }

  for (const row of stagingContacts) {
    await prisma.customerContact.upsert({
      where: {
        sourceSystem_externalId: {
          sourceSystem: row.sourceSystem,
          externalId: row.externalId
        }
      },
      update: {
        fullName: row.fullName,
        website: row.website,
        phone: row.phone,
        email: row.email,
        telegramUrl: row.telegramUrl,
        countryPresence: row.countryPresence,
        cityPresence: row.cityPresence,
        comment: row.comment,
        position: row.position,
        ownerName: row.ownerName
      },
      create: {
        sourceSystem: row.sourceSystem,
        externalId: row.externalId,
        fullName: row.fullName,
        website: row.website,
        phone: row.phone,
        email: row.email,
        telegramUrl: row.telegramUrl,
        countryPresence: row.countryPresence,
        cityPresence: row.cityPresence,
        comment: row.comment,
        position: row.position,
        ownerName: row.ownerName
      }
    })
    stats.contacts.upserted++
  }

  const customerCompanies = await prisma.customerCompany.findMany({
    select: { id: true, sourceSystem: true, externalId: true }
  })
  const customerContacts = await prisma.customerContact.findMany({
    select: { id: true, sourceSystem: true, externalId: true }
  })

  const companyMap = new Map(customerCompanies.map((c) => [`${c.sourceSystem}:${c.externalId}`, c.id]))
  const contactMap = new Map(customerContacts.map((c) => [`${c.sourceSystem}:${c.externalId}`, c.id]))

  for (const row of stagingCompanySegments) {
    const companyId = companyMap.get(`${row.company.sourceSystem}:${row.company.externalId}`)
    if (!companyId) continue
    await prisma.customerCompanySegment.upsert({
      where: { companyId_segment: { companyId, segment: row.segment } },
      update: { sourceFile: row.sourceFile },
      create: { companyId, segment: row.segment, sourceFile: row.sourceFile }
    })
    stats.companySegments.upserted++
  }

  for (const row of stagingContactSegments) {
    const contactId = contactMap.get(`${row.contact.sourceSystem}:${row.contact.externalId}`)
    if (!contactId) continue
    await prisma.customerContactSegment.upsert({
      where: { contactId_segment: { contactId, segment: row.segment } },
      update: { sourceFile: row.sourceFile },
      create: { contactId, segment: row.segment, sourceFile: row.sourceFile }
    })
    stats.contactSegments.upserted++
  }

  for (const row of stagingLinks) {
    const companyId = companyMap.get(`${row.company.sourceSystem}:${row.company.externalId}`)
    const contactId = contactMap.get(`${row.contact.sourceSystem}:${row.contact.externalId}`)
    if (!companyId || !contactId) continue
    await prisma.customerCompanyContact.upsert({
      where: { companyId_contactId: { companyId, contactId } },
      update: { source: row.source, matchType: row.matchType },
      create: { companyId, contactId, source: row.source, matchType: row.matchType }
    })
    stats.links.upserted++
  }

  console.log(JSON.stringify({ ok: true, stats }, null, 2))
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
