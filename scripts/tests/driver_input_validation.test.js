const test = require('node:test')
const assert = require('node:assert/strict')
const { createAuthService } = require('../../server/services/authService')
const { createPublicIntakeService } = require('../../server/services/publicIntakeService')

const normalizeText = (value, maxLength) => String(value || '').trim().slice(0, maxLength)

test('public driver applications reject commission outside the documented 5-30 percent range', async () => {
  let createCalls = 0
  const service = createPublicIntakeService({
    prisma: {
      driver: {
        create: async ({ data }) => {
          createCalls += 1
          return { id: 'driver-1', ...data }
        }
      }
    },
    normalizeText,
    ensureIdempotencyKey: () => {},
    withIdempotency: async () => {},
    sendDriverRegistrationEmail: async () => false
  })

  for (const commissionRate of [-1, 31, 'not-a-number']) {
    await assert.rejects(
      service.createDriverApplication({
        tenantId: 'tenant-1',
        body: {
          name: 'Test Driver',
          email: 'driver@example.com',
          phone: '+10000000000',
          city: 'Test City',
          commissionRate
        }
      }),
      (error) => error && error.statusCode === 400
    )
  }
  assert.equal(createCalls, 0, 'invalid commission must be rejected before a database write')
})

test('authenticated driver registration rejects commission outside the documented range', async () => {
  let userCreates = 0
  let driverCreates = 0
  const service = createAuthService({
    bcrypt: { hash: async () => 'hash' },
    jwt: { sign: () => 'token' },
    prisma: {
      user: {
        findUnique: async () => null,
        create: async ({ data }) => {
          userCreates += 1
          return { id: 'user-1', ...data }
        }
      },
      driver: {
        create: async ({ data }) => {
          driverCreates += 1
          return { id: 'driver-1', ...data }
        }
      }
    },
    jwtSecret: 'test-secret',
    getUserRolesAndPermissions: async () => ({ roles: [], permissions: [] }),
    ensureDefaultTenantMembership: async () => ({
      tenant: { id: 'tenant-1', code: 'riderra' },
      membership: { role: 'executor' }
    })
  })

  const result = await service.register({
    email: 'driver@example.com',
    password: 'password',
    role: 'driver',
    name: 'Test Driver',
    phone: '+10000000000',
    city: 'Test City',
    commissionRate: 31
  })

  assert.equal(result.statusCode, 400)
  assert.equal(userCreates, 0, 'invalid commission must be rejected before user creation')
  assert.equal(driverCreates, 0, 'invalid commission must be rejected before driver creation')
})
