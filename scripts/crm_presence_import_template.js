#!/usr/bin/env node
require('dotenv').config()

const fs = require('fs')
const Papa = require('papaparse')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const filePath = process.argv[2]
if (!filePath) {
  console.error('Usage: node scripts/crm_presence_import_template.js <path-to-csv>')
  process.exit(1)
}

function norm(v) {
  return String(v || '').replace(/\u00a0/g, ' ').replace(/&nbsp;/g, ' ').trim()
}

async function main() {
  const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '')
  const parsed = Papa.parse(raw, { header: true, delimiter: ';', skipEmptyLines: true })
  const rows = parsed.data || []

  let updated = 0
  let skipped = 0
  for (const row of rows) {
    const id = norm(row.id)
    const externalId = norm(row.externalId)
    const sourceSystem = norm(row.sourceSystem) || 'planfix'

    const data = {
      countryPresence: norm(row.countryPresence) || null,
      cityPresence: norm(row.cityPresence) || null,
      comment: norm(row.comment) || null
    }

    if (id) {
      await prisma.customerCompany.update({ where: { id }, data })
      updated++
      continue
    }
    if (externalId) {
      await prisma.customerCompany.updateMany({
        where: { sourceSystem, externalId },
        data
      })
      updated++
      continue
    }
    skipped++
  }

  console.log(JSON.stringify({ ok: true, updated, skipped, total: rows.length }, null, 2))
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
