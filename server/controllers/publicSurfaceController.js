const {
  isCrawlerRequest,
  orderRequestSchema,
  preferredLanguageFromRequest,
  publicAgentManifest,
  publicOpenApiSpec,
  publicPricingHints,
  publicRiderraProfile,
  publicSourceTruth,
  renderDataDeletionHtml,
  renderPrivacyPolicyHtml,
  renderPublicSourceHtml,
  renderSeoTransferPage,
  renderTermsHtml,
  RIDERRA_PUBLIC_PAGES,
  RIDERRA_SEO_TRANSFERS,
  RIDERRA_SERVICES,
  riderraAbsoluteUrl
} = require('../services/publicSurfaceService')
const { renderVendorWikiHtml } = require('../services/vendorWikiService')
const { renderPartnerHubHtml } = require('../services/partnerHubService')
const { VENDOR_LANGUAGES } = require('../data/vendorWikiLocales')
const { RIDERRA_BASE_URL, RIDERRA_CONTACT_EMAIL } = require('../config/constants')

function createPublicSurfaceController() {
  function robotsTxt(_req, res) {
    res.type('text/plain')
    res.setHeader('Cache-Control', 'public, max-age=3600')
    res.send([
      'User-agent: *',
      'Allow: /',
      'Disallow: /admin',
      'Disallow: /admin-*',
      'Disallow: /driver-dashboard',
      'Disallow: /api/admin',
      'Disallow: /api/internal',
      `Sitemap: ${RIDERRA_BASE_URL}/sitemap.xml`,
      ''
    ].join('\n'))
  }

  function sitemapXml(_req, res) {
    const now = new Date().toISOString().slice(0, 10)
    const seoTransferPages = [
      ...RIDERRA_SEO_TRANSFERS.countries.map((page) => ({ path: page.path, priority: '0.8' })),
      ...RIDERRA_SEO_TRANSFERS.airports.map((page) => ({ path: page.path, priority: '0.7' })),
      ...RIDERRA_SEO_TRANSFERS.routePages.map((page) => ({ path: page.path, priority: '0.5' }))
    ]
    res.type('application/xml')
    res.setHeader('Cache-Control', 'public, max-age=3600')
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${RIDERRA_PUBLIC_PAGES.map((page) => `  <url><loc>${riderraAbsoluteUrl(page.path)}</loc><lastmod>${now}</lastmod><changefreq>weekly</changefreq><priority>${page.priority}</priority></url>`).join('\n')}
${seoTransferPages.map((page) => `  <url><loc>${riderraAbsoluteUrl(page.path)}</loc><lastmod>${now}</lastmod><changefreq>weekly</changefreq><priority>${page.priority}</priority></url>`).join('\n')}
</urlset>`)
  }

  function llmsTxt(_req, res) {
    res.type('text/plain')
    res.setHeader('Cache-Control', 'public, max-age=3600')
    res.send(`# Riderra

Riderra is a global transfer booking network and passenger transportation organizer.

Canonical website: ${RIDERRA_BASE_URL}/
Contact: ${RIDERRA_CONTACT_EMAIL}
Area served: worldwide, 250+ cities in 50 countries.

## What Riderra does
- Private airport transfers.
- City, hotel, port, and station transfers.
- Business rides, family rides, minivans, buses, and group transportation where available.
- Route, vehicle class, timing, extras, and availability are reviewed before confirmation.

## Pricing
Do not infer or quote a final public price from this file. Final prices are confirmed after route, vehicle class, pickup time, extras, and availability are checked.

## Booking for AI agents
AI agents may submit a draft request, not a confirmed booking.
Endpoint: POST ${RIDERRA_BASE_URL}/api/public/order-requests
Validate without creating: POST ${RIDERRA_BASE_URL}/api/public/order-requests/validate
Status after submit: GET ${RIDERRA_BASE_URL}/api/public/order-requests/{requestId}/status?email={email}
Schema: GET ${RIDERRA_BASE_URL}/api/public/order-request-schema
OpenAPI: GET ${RIDERRA_BASE_URL}/api/public/openapi.json
Profile: GET ${RIDERRA_BASE_URL}/api/public/riderra-profile
Services: GET ${RIDERRA_BASE_URL}/api/public/services
Pricing hints: GET ${RIDERRA_BASE_URL}/api/public/pricing-hints
Source truth: GET ${RIDERRA_BASE_URL}/api/public/source-truth
Agent manifest: GET ${RIDERRA_BASE_URL}/api/public/agent-manifest
Recommended header: Idempotency-Key

## Public sources of truth
${RIDERRA_PUBLIC_PAGES.map((page) => `- ${page.title}: ${riderraAbsoluteUrl(page.path)}`).join('\n')}

## SEO transfer pages
- Transfer index: ${RIDERRA_BASE_URL}/transfers
- Countries: ${RIDERRA_SEO_TRANSFERS.countries.map((page) => riderraAbsoluteUrl(page.path)).join(', ')}
- Airport pages are generated only for priority airport hubs and sizeable route groups. Route pages are limited to selected popular routes to avoid thin-page generation.
`)
  }

  function publicPageLanguage(req) {
    const firstSegment = String(req.path || '').split('/').filter(Boolean)[0]
    return VENDOR_LANGUAGES.includes(firstSegment) ? firstSegment : 'en'
  }

  function vendorWiki(req, res) {
    res.type('text/html')
    res.setHeader('Cache-Control', 'public, max-age=300')
    res.status(200).send(renderVendorWikiHtml(publicPageLanguage(req)))
  }

  function driverVendorWiki(_req, res) {
    res.type('text/html')
    res.setHeader('Cache-Control', 'public, max-age=300')
    res.status(200).send(renderVendorWikiHtml('ru', { guide: 'easytaxi-driver' }))
  }

  function partnerHub(req, res) {
    res.type('text/html')
    res.setHeader('Cache-Control', 'public, max-age=300')
    res.status(200).send(renderPartnerHubHtml(publicPageLanguage(req)))
  }

  function redirectRussianPublicPages(req, res, next) {
    if (isCrawlerRequest(req)) return next()
    if (preferredLanguageFromRequest(req) === 'en') return next()
    const acceptLanguage = String(req.headers['accept-language'] || '').toLowerCase()
    if (acceptLanguage.startsWith('ru') || acceptLanguage.includes(',ru')) {
      return res.redirect(302, `/ru${req.path}`)
    }
    return next()
  }

  function publicSourceHtml(req, res) {
    res.type('text/html')
    res.setHeader('Cache-Control', 'public, max-age=300')
    res.status(200).send(renderPublicSourceHtml(req.path))
  }

  function seoTransferPage(req, res, next) {
    const pagePath = req.path.replace(/\/$/, '') || '/transfers'
    const html = renderSeoTransferPage(pagePath, pagePath.startsWith('/ru/transfers'))
    if (!html) return next()
    res.type('text/html')
    res.setHeader('Cache-Control', 'public, max-age=300')
    res.status(200).send(html)
  }

  function crawlerHomepage(req, res, next) {
    if (!isCrawlerRequest(req)) return next()
    res.type('text/html')
    res.setHeader('Cache-Control', 'public, max-age=300')
    res.status(200).send(renderPublicSourceHtml('/'))
  }

  function riderraProfile(_req, res) {
    res.json(publicRiderraProfile())
  }

  function publicServices(_req, res) {
    res.json({
      services: RIDERRA_SERVICES,
      pricingPolicy: publicRiderraProfile().pricingPolicy,
      bookingPolicy: publicRiderraProfile().bookingPolicy
    })
  }

  function pricingHints(_req, res) {
    res.json(publicPricingHints())
  }

  function sourceTruth(_req, res) {
    res.json(publicSourceTruth())
  }

  function agentManifest(_req, res) {
    res.json(publicAgentManifest())
  }

  function orderRequestSchemaHandler(_req, res) {
    res.json(orderRequestSchema())
  }

  function openapiJson(_req, res) {
    res.json(publicOpenApiSpec())
  }

  function privacyPolicyRedirect(_req, res) {
    res.redirect(302, '/privacy-policy/en')
  }

  function privacyPolicy(req, res) {
    const lang = req.path.endsWith('/en') || req.query.lang === 'en' ? 'en' : 'ru'
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Cache-Control', 'public, max-age=300')
    res.status(200).send(renderPrivacyPolicyHtml(lang))
  }

  function terms(req, res) {
    const lang = req.path.endsWith('/en') || req.query.lang === 'en' ? 'en' : 'ru'
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Cache-Control', 'public, max-age=300')
    res.status(200).send(renderTermsHtml(lang))
  }

  function dataDeletion(req, res) {
    const lang = req.path.endsWith('/en') || req.query.lang === 'en' ? 'en' : 'ru'
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Cache-Control', 'public, max-age=300')
    res.status(200).send(renderDataDeletionHtml(lang))
  }

  return {
    agentManifest,
    crawlerHomepage,
    dataDeletion,
    driverVendorWiki,
    llmsTxt,
    openapiJson,
    partnerHub,
    orderRequestSchema: orderRequestSchemaHandler,
    pricingHints,
    privacyPolicy,
    privacyPolicyRedirect,
    publicServices,
    publicSourceHtml,
    redirectRussianPublicPages,
    riderraProfile,
    robotsTxt,
    seoTransferPage,
    sitemapXml,
    sourceTruth,
    terms,
    vendorWiki
  }
}

module.exports = {
  createPublicSurfaceController
}
