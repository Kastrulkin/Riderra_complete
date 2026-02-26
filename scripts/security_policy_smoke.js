#!/usr/bin/env node
const assert = (cond, message) => {
  if (!cond) throw new Error(message)
}

function main() {
  const app = require('../server/index')
  const can = app?.__internal?.can
  assert(typeof can === 'function', 'policy function export missing')

  const tenantA = 'tenant-A'
  const tenantB = 'tenant-B'

  const coordinator = {
    actorId: 'u-1',
    role: 'staff',
    permissions: ['orders.read', 'orders.validate'],
    allowedCountries: ['all'],
    allowedCities: ['all'],
    allowedTeams: ['coordination'],
    tenantId: tenantA
  }

  const executor = {
    actorId: 'u-exec',
    role: 'executor',
    permissions: ['orders.read', 'pricing.manage'],
    allowedCountries: ['all'],
    allowedCities: ['all'],
    allowedTeams: ['all'],
    tenantId: tenantA
  }

  assert(
    can(coordinator, 'orders.read', 'order', { tenantId: tenantA, team: ['coordination'] }) === true,
    'staff with orders.read should be allowed'
  )

  assert(
    can(coordinator, 'orders.read', 'order', { tenantId: tenantB, team: ['coordination'] }) === false,
    'tenant mismatch should be denied'
  )

  assert(
    can(executor, 'pricing.manage', 'pricing', { tenantId: tenantA, team: ['pricing'] }) === false,
    'external executor must be denied pricing.manage'
  )

  const cityScoped = {
    actorId: 'u-2',
    role: 'staff',
    permissions: ['drivers.read'],
    allowedCountries: ['all'],
    allowedCities: ['london'],
    allowedTeams: ['dispatch'],
    tenantId: tenantA
  }

  assert(
    can(cityScoped, 'drivers.read', 'driver', { tenantId: tenantA, city: 'Dubai', team: ['dispatch'] }) === false,
    'city ABAC mismatch should be denied'
  )

  assert(
    can(cityScoped, 'drivers.read', 'driver', { tenantId: tenantA, city: 'London', team: ['dispatch'] }) === true,
    'city ABAC match should be allowed'
  )

  assert(
    can(coordinator, 'orders.read', 'order', {
      tenantId: tenantA,
      team: ['coordination'],
      currentStatus: 'assigned',
      allowedCurrentStatuses: ['validated']
    }) === false,
    'status guard mismatch should be denied'
  )

  console.log(JSON.stringify({ ok: true, checks: 7 }))
}

main()
