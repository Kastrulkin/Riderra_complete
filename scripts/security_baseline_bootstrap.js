const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

function mapRole(userRole) {
  if (userRole === 'admin') return 'staff_supervisor'
  if (userRole === 'driver') return 'executor'
  return 'staff'
}

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { code: 'riderra' },
    update: { isActive: true },
    create: { code: 'riderra', name: 'Riderra', isActive: true }
  })

  const users = await prisma.user.findMany({ select: { id: true, role: true } })
  for (const user of users) {
    await prisma.tenantMembership.upsert({
      where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
      update: { isActive: true, role: mapRole(user.role) },
      create: {
        tenantId: tenant.id,
        userId: user.id,
        role: mapRole(user.role),
        isActive: true
      }
    })
  }

  await prisma.order.updateMany({ where: { tenantId: null }, data: { tenantId: tenant.id } })
  await prisma.orderStatusHistory.updateMany({ where: { tenantId: null }, data: { tenantId: tenant.id } })
  await prisma.cityPricing.updateMany({ where: { tenantId: null }, data: { tenantId: tenant.id } })
  await prisma.counterpartyPriceRule.updateMany({ where: { tenantId: null }, data: { tenantId: tenant.id } })
  await prisma.sheetSource.updateMany({ where: { tenantId: null }, data: { tenantId: tenant.id } })
  await prisma.orderSourceSnapshot.updateMany({ where: { tenantId: null }, data: { tenantId: tenant.id } })
  await prisma.priceConflict.updateMany({ where: { tenantId: null }, data: { tenantId: tenant.id } })
  await prisma.driver.updateMany({ where: { tenantId: null }, data: { tenantId: tenant.id } })

  const [tenants, memberships] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenantMembership.count()
  ])

  console.log(JSON.stringify({ tenantId: tenant.id, tenants, memberships }))
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
