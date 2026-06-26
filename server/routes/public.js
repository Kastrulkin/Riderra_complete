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
}

module.exports = {
  registerPublicRoutes
}
