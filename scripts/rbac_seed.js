#!/usr/bin/env node
require('dotenv').config()

const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const ROLE_DEFS = [
  { code: 'owner', name: 'Owner' },
  { code: 'financial', name: 'Financial' },
  { code: 'dispatcher', name: 'Dispatcher' },
  { code: 'operator', name: 'Operator' },
  { code: 'audit', name: 'Audit' },
  { code: 'pricing_admin', name: 'Pricing Admin' }
]

const PERMISSION_DEFS = [
  { code: 'admin.panel', name: 'Access admin panel' },
  { code: 'crm.read', name: 'Read CRM' },
  { code: 'crm.manage', name: 'Manage CRM' },
  { code: 'telegram.link.manage', name: 'Manage telegram links' },
  { code: 'pricing.read', name: 'Read pricing data' },
  { code: 'pricing.manage', name: 'Manage pricing data' },
  { code: 'ops.read', name: 'Read ops drafts/unavailability' },
  { code: 'ops.manage', name: 'Manage ops drafts/unavailability' }
]

const ROLE_PERMISSIONS = {
  owner: [
    'admin.panel',
    'crm.read',
    'crm.manage',
    'telegram.link.manage',
    'pricing.read',
    'pricing.manage',
    'ops.read',
    'ops.manage'
  ],
  financial: ['crm.read', 'pricing.read'],
  dispatcher: ['crm.read', 'pricing.read', 'ops.read'],
  operator: ['crm.read', 'pricing.read', 'ops.read'],
  audit: ['crm.read', 'pricing.read', 'ops.read'],
  pricing_admin: ['crm.read', 'pricing.read', 'pricing.manage', 'ops.read', 'ops.manage']
}

const USER_ROLES = {
  'demyanov@riderra.com': ['owner'],
  'shilin@riderra.com': ['financial'],
  'bellavitomatern@gmail.com': ['operator', 'dispatcher'],
  'donaudeka@gmail.com': ['audit', 'pricing_admin'],
  'farzalievaas@gmail.com': ['operator', 'dispatcher'],
  'iproms17@gmail.com': ['operator', 'dispatcher'],
  'maksmaps123332@gmail.com': ['audit', 'operator', 'dispatcher'],
  'svetlana.iqtour@gmail.com': ['operator', 'dispatcher'],
  'samya7098@gmail.com': ['operator', 'dispatcher']
}

async function ensureUser(email) {
  let user = await prisma.user.findUnique({ where: { email } })
  if (user) return user

  const randomPassword = crypto.randomBytes(16).toString('hex')
  const hashedPassword = await bcrypt.hash(randomPassword, 10)
  user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      role: 'staff',
      isActive: true
    }
  })
  return user
}

async function main() {
  const rolesByCode = {}
  const permsByCode = {}

  for (const r of ROLE_DEFS) {
    rolesByCode[r.code] = await prisma.role.upsert({
      where: { code: r.code },
      update: { name: r.name },
      create: r
    })
  }

  for (const p of PERMISSION_DEFS) {
    permsByCode[p.code] = await prisma.permission.upsert({
      where: { code: p.code },
      update: { name: p.name },
      create: p
    })
  }

  for (const [roleCode, permCodes] of Object.entries(ROLE_PERMISSIONS)) {
    const role = rolesByCode[roleCode]
    for (const permCode of permCodes) {
      const perm = permsByCode[permCode]
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
        update: {},
        create: { roleId: role.id, permissionId: perm.id }
      })
    }
  }

  const assigned = []
  for (const [email, roleCodes] of Object.entries(USER_ROLES)) {
    const user = await ensureUser(email)
    for (const roleCode of roleCodes) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: rolesByCode[roleCode].id } },
        update: {},
        create: { userId: user.id, roleId: rolesByCode[roleCode].id }
      })
    }
    assigned.push({ email, roles: roleCodes })
  }

  console.log(JSON.stringify({ ok: true, assigned }, null, 2))
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
