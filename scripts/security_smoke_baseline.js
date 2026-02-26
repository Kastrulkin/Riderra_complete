const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const tenant = await prisma.tenant.findUnique({ where: { code: 'riderra' } })
  if (!tenant) throw new Error('tenant:riderra missing')

  const [
    membershipCount,
    ordersNullTenant,
    requestsNullTenant,
    reviewsNullTenant,
    driversNullTenant,
    driverRoutesNullTenant,
    cityRoutesNullTenant,
    driverCityRoutesNullTenant,
    pricingNullTenant,
    companiesNullTenant,
    contactsNullTenant,
    opsDraftsNullTenant,
    idemUniqueCheck
  ] = await Promise.all([
    prisma.tenantMembership.count({ where: { tenantId: tenant.id, isActive: true } }),
    prisma.order.count({ where: { tenantId: null } }),
    prisma.request.count({ where: { tenantId: null } }),
    prisma.review.count({ where: { tenantId: null } }),
    prisma.driver.count({ where: { tenantId: null } }),
    prisma.driverRoute.count({ where: { tenantId: null } }),
    prisma.cityRoute.count({ where: { tenantId: null } }),
    prisma.driverCityRoute.count({ where: { tenantId: null } }),
    prisma.cityPricing.count({ where: { tenantId: null } }),
    prisma.customerCompany.count({ where: { tenantId: null } }),
    prisma.customerContact.count({ where: { tenantId: null } }),
    prisma.opsEventDraft.count({ where: { tenantId: null } }),
    prisma.idempotencyKey.count()
  ])

  if (membershipCount === 0) throw new Error('no active tenant memberships')

  const approval = await prisma.humanApproval.create({
    data: {
      tenantId: tenant.id,
      status: 'pending_human',
      action: 'smoke.test',
      resource: 'smoke',
      payloadJson: JSON.stringify({ ok: true })
    }
  })

  const audit = await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      actorRole: 'system',
      action: 'smoke.test',
      resource: 'smoke',
      traceId: `smoke-${Date.now()}`,
      result: 'ok'
    }
  })

  await prisma.humanApproval.delete({ where: { id: approval.id } })
  await prisma.auditLog.delete({ where: { id: audit.id } })

  console.log(JSON.stringify({
    ok: true,
    tenant: tenant.code,
    membershipCount,
    ordersNullTenant,
    requestsNullTenant,
    reviewsNullTenant,
    driversNullTenant,
    driverRoutesNullTenant,
    cityRoutesNullTenant,
    driverCityRoutesNullTenant,
    pricingNullTenant,
    companiesNullTenant,
    contactsNullTenant,
    opsDraftsNullTenant,
    idempotencyRows: idemUniqueCheck
  }))
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
