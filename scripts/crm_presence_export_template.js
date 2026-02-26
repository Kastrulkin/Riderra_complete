#!/usr/bin/env node
require('dotenv').config()

const fs = require('fs')
const path = require('path')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

function esc(v) {
  const s = String(v ?? '')
  if (/[;"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

async function main() {
  const rows = await prisma.customerCompany.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      sourceSystem: true,
      externalId: true,
      name: true,
      countryPresence: true,
      cityPresence: true,
      comment: true
    }
  })

  const header = ['id', 'sourceSystem', 'externalId', 'name', 'countryPresence', 'cityPresence', 'comment']
  const lines = [header.join(';')]
  for (const row of rows) {
    lines.push([
      row.id,
      row.sourceSystem,
      row.externalId,
      row.name,
      row.countryPresence || '',
      row.cityPresence || '',
      row.comment || ''
    ].map(esc).join(';'))
  }

  const outDir = path.join(process.cwd(), 'reports')
  fs.mkdirSync(outDir, { recursive: true })
  const ts = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19)
  const outFile = path.join(outDir, `crm_presence_template_${ts}.csv`)
  fs.writeFileSync(outFile, '\uFEFF' + lines.join('\n'), 'utf8')
  console.log(JSON.stringify({ ok: true, outFile, rows: rows.length }, null, 2))
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
