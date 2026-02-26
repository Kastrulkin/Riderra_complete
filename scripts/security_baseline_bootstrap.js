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

  // CI baseline: on a clean database there may be no users at all.
  // Keep at least one active membership so security smoke checks are deterministic.
  const ciUser = await prisma.user.upsert({
    where: { email: 'security-gate-system@riderra.local' },
    update: {
      role: 'staff',
      isActive: true
    },
    create: {
      email: 'security-gate-system@riderra.local',
      password: 'not-used-in-ci',
      role: 'staff',
      isActive: true
    }
  })
  await prisma.tenantMembership.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: ciUser.id } },
    update: { isActive: true, role: 'system' },
    create: {
      tenantId: tenant.id,
      userId: ciUser.id,
      role: 'system',
      isActive: true
    }
  })

  await prisma.order.updateMany({ where: { tenantId: null }, data: { tenantId: tenant.id } })
  await prisma.orderStatusHistory.updateMany({ where: { tenantId: null }, data: { tenantId: tenant.id } })
  await prisma.request.updateMany({ where: { tenantId: null }, data: { tenantId: tenant.id } })
  await prisma.review.updateMany({ where: { tenantId: null }, data: { tenantId: tenant.id } })
  await prisma.driver.updateMany({ where: { tenantId: null }, data: { tenantId: tenant.id } })
  await prisma.driverRoute.updateMany({ where: { tenantId: null }, data: { tenantId: tenant.id } })
  await prisma.cityRoute.updateMany({ where: { tenantId: null }, data: { tenantId: tenant.id } })
  await prisma.driverCityRoute.updateMany({ where: { tenantId: null }, data: { tenantId: tenant.id } })
  await prisma.cityPricing.updateMany({ where: { tenantId: null }, data: { tenantId: tenant.id } })
  await prisma.counterpartyPriceRule.updateMany({ where: { tenantId: null }, data: { tenantId: tenant.id } })
  await prisma.sheetSource.updateMany({ where: { tenantId: null }, data: { tenantId: tenant.id } })
  await prisma.orderSourceSnapshot.updateMany({ where: { tenantId: null }, data: { tenantId: tenant.id } })
  await prisma.priceConflict.updateMany({ where: { tenantId: null }, data: { tenantId: tenant.id } })
  await prisma.crmCompany.updateMany({ where: { tenantId: null }, data: { tenantId: tenant.id } })
  await prisma.crmContact.updateMany({ where: { tenantId: null }, data: { tenantId: tenant.id } })
  await prisma.customerCompany.updateMany({ where: { tenantId: null }, data: { tenantId: tenant.id } })
  await prisma.customerContact.updateMany({ where: { tenantId: null }, data: { tenantId: tenant.id } })
  await prisma.opsEventDraft.updateMany({ where: { tenantId: null }, data: { tenantId: tenant.id } })
  await prisma.opsEvent.updateMany({ where: { tenantId: null }, data: { tenantId: tenant.id } })
  await prisma.driverUnavailability.updateMany({ where: { tenantId: null }, data: { tenantId: tenant.id } })
  await prisma.opsTask.updateMany({ where: { tenantId: null }, data: { tenantId: tenant.id } })
  await prisma.telegramLink.updateMany({ where: { tenantId: null }, data: { tenantId: tenant.id } })

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
