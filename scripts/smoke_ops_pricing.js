#!/usr/bin/env node
require('dotenv').config()

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const runId = `smoke-${Date.now()}`
  const now = new Date()
  const startAt = new Date(now.getTime() + 2 * 60 * 60 * 1000)
  const endAt = new Date(now.getTime() + 26 * 60 * 60 * 1000)
  const pickupAt = new Date(now.getTime() + 3 * 60 * 60 * 1000)

  const pricing = await prisma.cityPricing.create({
    data: {
      city: `SmokeCity-${runId}`,
      fixedPrice: 99,
      pricePerKm: 1.7,
      hourlyRate: 35,
      childSeatPrice: 5,
      currency: 'EUR',
      source: 'smoke_test'
    }
  })

  const pricingLookup = await prisma.cityPricing.findMany({
    where: { city: { contains: 'SmokeCity', mode: 'insensitive' }, isActive: true },
    take: 3
  })

  const driver = await prisma.driver.create({
    data: {
      name: `Smoke Driver ${runId}`,
      email: `${runId}@example.com`,
      phone: '+10000000000',
      city: 'SmokeCity',
      isActive: true,
      verificationStatus: 'verified',
      kmRate: 1.7,
      childSeatPrice: 5,
      pricingCurrency: 'EUR'
    }
  })

  const order = await prisma.order.create({
    data: {
      source: 'smoke_test',
      externalKey: `SMOKE-${runId}`,
      pickupAt,
      fromPoint: 'Airport',
      toPoint: 'Hotel',
      clientPrice: 120,
      driverPrice: 90,
      commission: 30,
      driverId: driver.id,
      status: 'assigned',
      vehicleType: 'sedan'
    }
  })

  const payload = {
    type: 'driver_unavailable',
    driverNameRaw: driver.name,
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString(),
    reason: 'vacation_or_unavailable'
  }

  const draft = await prisma.opsEventDraft.create({
    data: {
      chatId: '-1001234567890',
      telegramUserId: 'smoke-user',
      messageText: `Водитель ${driver.name} в отпуске с ${startAt.toISOString()} по ${endAt.toISOString()}`,
      parsedType: 'driver_unavailable',
      payloadJson: JSON.stringify(payload),
      status: 'pending'
    }
  })

  const event = await prisma.opsEvent.create({
    data: {
      type: draft.parsedType,
      payloadJson: draft.payloadJson,
      sourceDraftId: draft.id
    }
  })

  const unavailability = await prisma.driverUnavailability.create({
    data: {
      driverId: driver.id,
      driverNameRaw: driver.name,
      startAt,
      endAt,
      reason: 'vacation_or_unavailable',
      sourceDraftId: draft.id
    }
  })

  const conflicts = await prisma.order.findMany({
    where: {
      driverId: driver.id,
      pickupAt: {
        gte: unavailability.startAt,
        lte: unavailability.endAt
      },
      status: { notIn: ['cancelled', 'completed'] }
    }
  })

  await prisma.opsEventDraft.update({
    where: { id: draft.id },
    data: {
      status: 'approved',
      reviewedAt: new Date(),
      promotedEventId: event.id,
      promotedUnavailabilityId: unavailability.id
    }
  })

  console.log(JSON.stringify({
    ok: true,
    runId,
    pricingCreated: pricing.id,
    pricingLookupCount: pricingLookup.length,
    driverId: driver.id,
    orderId: order.id,
    draftId: draft.id,
    eventId: event.id,
    unavailabilityId: unavailability.id,
    conflictsCount: conflicts.length
  }, null, 2))

  await prisma.order.delete({ where: { id: order.id } })
  await prisma.driverUnavailability.delete({ where: { id: unavailability.id } })
  await prisma.opsEvent.delete({ where: { id: event.id } })
  await prisma.opsEventDraft.delete({ where: { id: draft.id } })
  await prisma.driver.delete({ where: { id: driver.id } })
  await prisma.cityPricing.delete({ where: { id: pricing.id } })
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
