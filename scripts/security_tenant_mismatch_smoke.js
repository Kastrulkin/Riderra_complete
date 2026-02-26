#!/usr/bin/env node
const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

function main() {
  const app = require('../server/index')
  const can = app?.__internal?.can
  assert(typeof can === 'function', 'policy function export missing')

  const tenantA = 'tenant-A'
  const tenantB = 'tenant-B'

  const actor = {
    actorId: 'u-staff',
    role: 'staff',
    permissions: [
      'orders.assign',
      'drivers.manage',
      'pricing.manage',
      'crm.manage',
      'settings.manage',
      'ops.manage',
      'directions.manage'
    ],
    allowedCountries: ['all'],
    allowedCities: ['all'],
    allowedTeams: ['all'],
    tenantId: tenantA
  }

  const checks = [
    ['orders.transition.request', 'order', { team: ['dispatch'] }],
    ['drivers.manage', 'driver', { team: ['dispatch'] }],
    ['pricing.manage', 'pricing', { team: ['pricing'] }],
    ['crm.manage', 'crm', { team: ['sales'] }],
    ['settings.manage', 'setting', { team: ['all'] }],
    ['ops.manage', 'ops', { team: ['ops_control'] }],
    ['directions.manage', 'direction', { team: ['pricing'] }]
  ]

  for (const [action, resource, extra] of checks) {
    const allowedOwnTenant = can(actor, action, resource, { tenantId: tenantA, ...(extra || {}) })
    const deniedOtherTenant = can(actor, action, resource, { tenantId: tenantB, ...(extra || {}) })
    assert(allowedOwnTenant === true, `${action} should be allowed in own tenant`)
    assert(deniedOtherTenant === false, `${action} should be denied for tenant mismatch`)
  }

  console.log(JSON.stringify({ ok: true, checks: checks.length }))
}

main()
