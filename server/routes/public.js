function registerPublicRoutes(app, handlers) {
  app.get('/robots.txt', handlers.robotsTxt)
  app.get('/sitemap.xml', handlers.sitemapXml)
  app.get('/llms.txt', handlers.llmsTxt)
  app.get(['/ai', '/about', '/services', '/docs', '/prices', '/contact', '/faq'], handlers.redirectRussianPublicPages)
  app.get(['/ai', '/about', '/services', '/services/airport-transfer', '/services/city-transfer', '/docs', '/prices', '/contact', '/faq', '/sources', '/ru/ai', '/ru/about', '/ru/services', '/ru/docs', '/ru/prices', '/ru/contact', '/ru/faq'], handlers.publicSourceHtml)
  app.get(/^\/(?:ru\/)?transfers(?:\/[a-z0-9-]+){0,3}\/?$/, handlers.seoTransferPage)
  app.get('/', handlers.crawlerHomepage)
  app.get('/api/public/riderra-profile', handlers.riderraProfile)
  app.get('/api/public/services', handlers.publicServices)
  app.get('/api/public/pricing-hints', handlers.pricingHints)
  app.get('/api/public/source-truth', handlers.sourceTruth)
  app.get('/api/public/agent-manifest', handlers.agentManifest)
  app.get('/api/public/order-request-schema', handlers.orderRequestSchema)
  app.get(['/api/public/openapi.json', '/openapi.json'], handlers.openapiJson)
  app.post('/api/public/order-requests/validate', ...handlers.orderRequestMiddleware, handlers.validateOrderRequest)
  app.get('/api/public/order-requests/:requestId/status', ...handlers.orderRequestMiddleware, handlers.orderRequestStatus)
  app.post('/api/public/order-requests', ...handlers.orderRequestMiddleware, handlers.createOrderRequest)
  app.get('/privacy-policy', handlers.privacyPolicyRedirect)
  app.get(['/privacy-policy/ru', '/privacy-policy/en'], handlers.privacyPolicy)
  app.get(['/terms', '/terms/en', '/terms-and-conditions', '/user-agreement'], handlers.terms)
  app.get(['/data-deletion', '/data-deletion/en', '/data-deletion-instructions', '/facebook-data-deletion', '/facebook-data-deletion/en'], handlers.dataDeletion)
  app.post('/api/requests', ...handlers.publicFormMiddleware, handlers.createRequest)
  app.post('/api/drivers', ...handlers.publicFormMiddleware, handlers.createDriver)
}

module.exports = {
  registerPublicRoutes
}
