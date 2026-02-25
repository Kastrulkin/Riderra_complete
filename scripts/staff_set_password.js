#!/usr/bin/env node
require('dotenv').config()

const bcrypt = require('bcryptjs')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const EMAILS = [
  'demyanov@riderra.com',
  'shilin@riderra.com',
  'bellavitomatern@gmail.com',
  'donaudeka@gmail.com',
  'farzalievaas@gmail.com',
  'iproms17@gmail.com',
  'maksmaps123332@gmail.com',
  'svetlana.iqtour@gmail.com',
  'samya7098@gmail.com'
]

async function main() {
  const tempPassword = process.env.STAFF_TEMP_PASSWORD
  if (!tempPassword) {
    throw new Error('Set STAFF_TEMP_PASSWORD env var before running this script')
  }

  const hashed = await bcrypt.hash(tempPassword, 10)
  const updated = []

  for (const email of EMAILS) {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) continue
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed, isActive: true }
    })
    updated.push(email)
  }

  console.log(JSON.stringify({ ok: true, updatedCount: updated.length, updated }, null, 2))
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
