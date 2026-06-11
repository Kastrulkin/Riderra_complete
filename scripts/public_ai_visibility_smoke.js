#!/usr/bin/env node

const BASE_URL = String(process.env.RIDERRA_PUBLIC_BASE_URL || 'https://riderra.com').replace(/\/+$/, '')
const CANONICAL_URL = 'https://riderra.com'

async function readText(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, options)
  const text = await response.text()
  return { response, text }
}

function assertOk(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

async function main() {
  const checks = []

  async function check(name, fn) {
    try {
      await fn()
      checks.push({ name, ok: true })
    } catch (error) {
      checks.push({ name, ok: false, error: error.message })
    }
  }

  await check('robots.txt', async () => {
    const { response, text } = await readText('/robots.txt')
    assertOk(response.status === 200, `robots.txt status ${response.status}`)
    assertOk((response.headers.get('content-type') || '').includes('text/plain'), 'robots.txt content-type is not text/plain')
    assertOk(text.includes(`Sitemap: ${CANONICAL_URL}/sitemap.xml`), 'robots.txt missing sitemap')
    assertOk(!/Disallow:\s*\/\s*$/im.test(text), 'robots.txt blocks the whole site')
  })

  await check('sitemap.xml', async () => {
    const { response, text } = await readText('/sitemap.xml')
    assertOk(response.status === 200, `sitemap.xml status ${response.status}`)
    assertOk(text.includes('<urlset'), 'sitemap.xml missing urlset')
    for (const path of ['/ai', '/services', '/prices', '/contact', '/faq', '/sources', '/ru/ai', '/ru/services', '/ru/prices', '/ru/contact', '/ru/faq']) {
      assertOk(text.includes(`${CANONICAL_URL}${path}`), `sitemap.xml missing ${path}`)
    }
  })

  await check('llms.txt', async () => {
    const { response, text } = await readText('/llms.txt')
    assertOk(response.status === 200, `llms.txt status ${response.status}`)
    assertOk(text.includes('/api/public/order-requests'), 'llms.txt missing order request endpoint')
    assertOk(text.includes('/api/public/openapi.json'), 'llms.txt missing OpenAPI endpoint')
    assertOk(text.includes('/api/public/agent-manifest'), 'llms.txt missing agent manifest endpoint')
    assertOk(text.includes('Idempotency-Key'), 'llms.txt missing idempotency guidance')
  })

  for (const path of ['/ai', '/services', '/prices', '/contact', '/faq', '/sources', '/ru/ai', '/ru/services', '/ru/prices', '/ru/contact', '/ru/faq']) {
    await check(`page ${path}`, async () => {
      const { response, text } = await readText(path)
      assertOk(response.status === 200, `${path} status ${response.status}`)
      assertOk(text.includes('application/ld+json'), `${path} missing JSON-LD`)
      assertOk(!text.includes('nuxt-loading'), `${path} returned SPA loader instead of source HTML`)
    })
  }

  await check('crawler homepage', async () => {
    const { response, text } = await readText('/', { headers: { 'user-agent': 'GPTBot' } })
    assertOk(response.status === 200, `crawler homepage status ${response.status}`)
    assertOk(text.includes('application/ld+json'), 'crawler homepage missing JSON-LD')
    assertOk(text.includes('global transfer booking network'), 'crawler homepage missing visible source text')
  })

  await check('public APIs', async () => {
    for (const path of ['/api/public/riderra-profile', '/api/public/services', '/api/public/pricing-hints', '/api/public/source-truth', '/api/public/agent-manifest', '/api/public/order-request-schema', '/api/public/openapi.json']) {
      const { response, text } = await readText(path)
      assertOk(response.status === 200, `${path} status ${response.status}`)
      JSON.parse(text)
    }
  })

  await check('order request validation', async () => {
    const response = await fetch(`${BASE_URL}/api/public/order-requests/validate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Smoke Test',
        email: 'smoke@example.com',
        phone: '+10000000000',
        fromPoint: 'Airport',
        toPoint: 'Hotel',
        pickupAt: new Date(Date.now() + 86400000).toISOString()
      })
    })
    const body = await response.json()
    assertOk(response.status === 200, `validate status ${response.status}`)
    assertOk(body.success === true && body.status === 'valid_draft_request', 'validate did not return valid_draft_request')
  })

  const failed = checks.filter((item) => !item.ok)
  for (const item of checks) {
    console.log(`${item.ok ? 'OK' : 'FAIL'} ${item.name}${item.error ? `: ${item.error}` : ''}`)
  }
  if (failed.length) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
