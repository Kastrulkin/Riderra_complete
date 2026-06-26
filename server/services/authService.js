function createAuthService({
  bcrypt,
  jwt,
  prisma,
  jwtSecret,
  getUserRolesAndPermissions,
  ensureDefaultTenantMembership
}) {
  function signUserToken(user) {
    return jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      jwtSecret,
      { expiresIn: '7d' }
    )
  }

  async function register(body = {}) {
    const { email, password, role = 'driver', name, phone, country, city, commissionRate } = body
    if (role !== 'driver') {
      return { statusCode: 403, body: { error: 'Public registration is only available for drivers' } }
    }

    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return { statusCode: 400, body: { error: 'User already exists' } }
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role
      }
    })

    if (role === 'driver') {
      const { tenant } = await ensureDefaultTenantMembership(user.id, 'executor')
      await prisma.driver.create({
        data: {
          tenantId: tenant.id,
          name,
          email,
          phone,
          country: country || null,
          city,
          commissionRate: commissionRate || 15.0,
          userId: user.id
        }
      })
    } else {
      await ensureDefaultTenantMembership(user.id, role === 'admin' ? 'staff_supervisor' : 'staff')
    }

    const token = signUserToken(user)
    const acl = await getUserRolesAndPermissions(user.id)
    const { tenant, membership } = await ensureDefaultTenantMembership(
      user.id,
      role === 'driver' ? 'executor' : (role === 'admin' ? 'staff_supervisor' : 'staff')
    )

    return {
      statusCode: 200,
      body: {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          tenant: { id: tenant.id, code: tenant.code, role: membership.role },
          roles: acl.roles,
          permissions: acl.permissions
        }
      }
    }
  }

  async function login(body = {}) {
    const { email, password } = body

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        driver: true
      }
    })

    if (!user) {
      return { statusCode: 401, body: { error: 'Invalid credentials' } }
    }

    const validPassword = await bcrypt.compare(password, user.password)
    if (!validPassword) {
      return { statusCode: 401, body: { error: 'Invalid credentials' } }
    }

    if (!user.isActive) {
      return { statusCode: 401, body: { error: 'Account is deactivated' } }
    }

    const token = signUserToken(user)
    const acl = await getUserRolesAndPermissions(user.id)
    const { tenant, membership } = await ensureDefaultTenantMembership(
      user.id,
      user.role === 'driver' ? 'executor' : (user.role === 'admin' ? 'staff_supervisor' : 'staff')
    )

    return {
      statusCode: 200,
      body: {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          tenant: { id: tenant.id, code: tenant.code, role: membership.role },
          roles: acl.roles,
          permissions: acl.permissions,
          driver: user.driver
        }
      }
    }
  }

  async function getMe({ userId, actorContext, roles = [], permissions = [] }) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        driver: true
      }
    })

    if (!user) {
      return { statusCode: 404, body: { error: 'User not found' } }
    }

    return {
      statusCode: 200,
      body: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          tenant: {
            id: actorContext.tenantId,
            code: actorContext.tenantCode,
            role: actorContext.actorRole
          },
          roles,
          permissions,
          driver: user.driver
        }
      }
    }
  }

  async function createAdmin({ email, password, setupKey }) {
    if (!process.env.ADMIN_SETUP_KEY) {
      return { statusCode: 403, body: { error: 'Admin bootstrap is disabled' } }
    }

    if (setupKey !== process.env.ADMIN_SETUP_KEY) {
      return { statusCode: 403, body: { error: 'Invalid setup key' } }
    }

    if (!email || !password) {
      return { statusCode: 400, body: { error: 'Email and password are required' } }
    }

    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'admin' }
    })

    if (existingAdmin) {
      return { statusCode: 400, body: { error: 'Admin already exists' } }
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const admin = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: 'admin'
      }
    })

    return {
      statusCode: 200,
      body: {
        message: 'Admin created successfully',
        admin: {
          id: admin.id,
          email: admin.email,
          role: admin.role
        }
      }
    }
  }

  return {
    createAdmin,
    getMe,
    login,
    register
  }
}

module.exports = {
  createAuthService
}
