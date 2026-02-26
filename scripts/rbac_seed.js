#!/usr/bin/env node
require('dotenv').config()

const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const ROLE_DEFS = [
  { code: 'owner', name: 'Owner' },
  { code: 'coordinator', name: 'Coordinator' },
  { code: 'ops_control', name: 'Ops Control' },
  { code: 'financial', name: 'Financial' },
  { code: 'dispatcher', name: 'Dispatcher' },
  { code: 'operator', name: 'Operator' },
  { code: 'audit', name: 'Audit' },
  { code: 'pricing_admin', name: 'Pricing Admin' }
]

const PERMISSION_DEFS = [
  { code: 'admin.panel', name: 'Access admin panel' },
  { code: 'orders.read', name: 'Read orders table' },
  { code: 'drivers.read', name: 'Read drivers' },
  { code: 'drivers.manage', name: 'Manage drivers' },
  { code: 'crm.read', name: 'Read CRM' },
  { code: 'crm.manage', name: 'Manage CRM' },
  { code: 'settings.manage', name: 'Manage settings and integrations' },
  { code: 'telegram.link.manage', name: 'Manage telegram links' },
  { code: 'pricing.read', name: 'Read pricing data' },
  { code: 'pricing.manage', name: 'Manage pricing data' },
  { code: 'directions.read', name: 'Read directions/routes matrix and routes' },
  { code: 'directions.manage', name: 'Manage directions/routes' },
  { code: 'ops.read', name: 'Read ops drafts/unavailability' },
  { code: 'ops.manage', name: 'Manage ops drafts/unavailability' },
  { code: 'orders.create_draft', name: 'Create order drafts from inbound sources' },
  { code: 'orders.validate', name: 'Validate draft order core fields' },
  { code: 'orders.assign', name: 'Assign drivers to orders' },
  { code: 'orders.reassign', name: 'Reassign drivers on orders' },
  { code: 'orders.confirmation.manage', name: 'Manage order confirmations and execution control' },
  { code: 'incidents.manage', name: 'Manage no-show/incident workflow and evidence' },
  { code: 'claims.compose', name: 'Compose client claims/position letters' },
  { code: 'reconciliation.run', name: 'Run reconciliation with drivers/clients' },
  { code: 'payouts.manage', name: 'Manage payouts and payment closures' },
  { code: 'finance.report.export', name: 'Export finance reports' },
  { code: 'integrations.settings', name: 'Manage integrations and capability settings' },
  { code: 'approvals.resolve', name: 'Approve or reject pending human actions' }
]

const ROLE_PERMISSIONS = {
  owner: [
    'admin.panel',
    'orders.read',
    'drivers.read',
    'drivers.manage',
    'crm.read',
    'crm.manage',
    'settings.manage',
    'telegram.link.manage',
    'pricing.read',
    'pricing.manage',
    'directions.read',
    'directions.manage',
    'ops.read',
    'ops.manage',
    'orders.create_draft',
    'orders.validate',
    'orders.assign',
    'orders.reassign',
    'orders.confirmation.manage',
    'incidents.manage',
    'claims.compose',
    'reconciliation.run',
    'payouts.manage',
    'finance.report.export',
    'integrations.settings',
    'approvals.resolve'
  ],
  coordinator: ['orders.read', 'orders.create_draft', 'orders.validate', 'crm.read', 'drivers.read', 'pricing.read', 'ops.read'],
  dispatcher: ['orders.read', 'orders.assign', 'orders.reassign', 'drivers.read', 'drivers.manage', 'crm.read', 'pricing.read', 'ops.read'],
  ops_control: ['orders.read', 'orders.confirmation.manage', 'incidents.manage', 'claims.compose', 'ops.read', 'ops.manage', 'drivers.read', 'crm.read'],
  financial: ['orders.read', 'drivers.read', 'crm.read', 'pricing.read', 'reconciliation.run', 'payouts.manage', 'finance.report.export'],
  operator: ['orders.read', 'orders.create_draft', 'orders.validate', 'drivers.read', 'crm.read', 'pricing.read', 'ops.read'],
  audit: ['orders.read', 'drivers.read', 'crm.read', 'pricing.read', 'ops.read'],
  pricing_admin: ['orders.read', 'drivers.read', 'crm.read', 'pricing.read', 'pricing.manage', 'directions.read', 'directions.manage', 'integrations.settings', 'ops.read', 'ops.manage']
}

const USER_ROLES = {
  'demyanov@riderra.com': ['owner'],
  'shilin@riderra.com': ['financial', 'owner'],
  'bellavitomatern@gmail.com': ['coordinator', 'dispatcher'],
  'donaudeka@gmail.com': ['audit', 'pricing_admin'],
  'farzalievaas@gmail.com': ['coordinator', 'dispatcher'],
  'iproms17@gmail.com': ['coordinator', 'dispatcher'],
  'maksmaps123332@gmail.com': ['audit', 'coordinator', 'dispatcher', 'ops_control'],
  'svetlana.iqtour@gmail.com': ['coordinator', 'dispatcher'],
  'samya7098@gmail.com': ['coordinator', 'dispatcher']
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
