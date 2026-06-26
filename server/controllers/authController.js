const { createAuthService } = require('../services/authService')

function createAuthController(dependencies) {
  const service = createAuthService(dependencies)

  async function register(req, res) {
    try {
      const result = await service.register(req.body)
      res.status(result.statusCode).json(result.body)
    } catch (error) {
      console.error('Registration error:', error)
      res.status(500).json({ error: 'Registration failed' })
    }
  }

  async function login(req, res) {
    try {
      const result = await service.login(req.body)
      res.status(result.statusCode).json(result.body)
    } catch (error) {
      console.error('Login error:', error)
      res.status(500).json({ error: 'Login failed' })
    }
  }

  async function me(req, res) {
    try {
      const result = await service.getMe({
        actorContext: req.actorContext,
        permissions: req.userPermissions || [],
        roles: req.userRoles || [],
        userId: req.user.id
      })
      res.status(result.statusCode).json(result.body)
    } catch (error) {
      console.error('Get user error:', error)
      res.status(500).json({ error: 'Failed to get user info' })
    }
  }

  async function createAdmin(req, res) {
    try {
      const { email, password } = req.body
      const setupKey = req.headers['x-setup-key'] || req.body.setupKey
      const result = await service.createAdmin({ email, password, setupKey })
      res.status(result.statusCode).json(result.body)
    } catch (error) {
      console.error('Create admin error:', error)
      res.status(500).json({ error: 'Failed to create admin' })
    }
  }

  return {
    createAdmin,
    login,
    me,
    register
  }
}

module.exports = {
  createAuthController
}
