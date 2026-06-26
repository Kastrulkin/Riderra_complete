function registerAuthRoutes(app, handlers) {
  app.post('/api/auth/register', handlers.register)
  app.post('/api/auth/login', handlers.login)
  app.get('/api/auth/me', ...handlers.authenticatedMiddleware, handlers.me)
}

module.exports = {
  registerAuthRoutes
}
