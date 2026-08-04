const fs = require('fs/promises')
const path = require('path')
const { PrismaClient } = require('@prisma/client')
const { pointData } = require('../server/routes/benchmarkPoints')

async function main() {
  const inputPath = process.argv[2]
  const tenantCode = String(process.argv[3] || process.env.TENANT_CODE || 'riderra').trim()
  if (!inputPath) throw new Error('Usage: node scripts/import_geo_zone_benchmark_points.js <input.json> [tenant-code]')

  const payload = JSON.parse(await fs.readFile(path.resolve(inputPath), 'utf8'))
  const rows = Array.isArray(payload) ? payload : payload.rows
  if (!Array.isArray(rows) || !rows.length) throw new Error('Input JSON must contain a non-empty rows array')

  const prisma = new PrismaClient()
  try {
    const tenant = await prisma.tenant.findUnique({ where: { code: tenantCode } })
    if (!tenant) throw new Error(`Tenant not found: ${tenantCode}`)
    let created = 0
    let updated = 0
    let failed = 0
    for (let index = 0; index < rows.length; index += 1) {
      try {
        const data = pointData(rows[index], {
          source: payload.source || 'booking_workbook',
          sourceFileName: payload.sourceFileName,
          sourceSheetName: payload.sourceSheetName
        })
        const existing = await prisma.geoZoneBenchmarkPoint.findUnique({
          where: { tenantId_normalizedKey: { tenantId: tenant.id, normalizedKey: data.normalizedKey } },
          select: { id: true }
        })
        await prisma.geoZoneBenchmarkPoint.upsert({
          where: { tenantId_normalizedKey: { tenantId: tenant.id, normalizedKey: data.normalizedKey } },
          update: data,
          create: { tenantId: tenant.id, ...data, status: 'candidate' }
        })
        if (existing) updated += 1
        else created += 1
      } catch (error) {
        failed += 1
        console.error(`Row ${index + 1}: ${error.message}`)
      }
    }
    console.log(JSON.stringify({ tenantCode, total: rows.length, created, updated, failed }, null, 2))
    if (failed) process.exitCode = 2
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
