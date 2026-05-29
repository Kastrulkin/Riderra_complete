#!/usr/bin/env node

const BASE_URL = String(process.env.RIDERRA_PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '')

function assertOk(condition, message) {
  if (!condition) throw new Error(message)
}

async function read(path) {
  const response = await fetch(`${BASE_URL}${path}`)
  const text = await response.text()
  return { response, text }
}

function extractJsonLd(html) {
  const blocks = []
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let match
  while ((match = re.exec(html))) blocks.push(JSON.parse(match[1]))
  return blocks
}

function typesOf(node) {
  const type = node && node['@type']
  return Array.isArray(type) ? type : (type ? [type] : [])
}

function hasType(nodes, type) {
  return nodes.some((node) => typesOf(node).includes(type))
}

async function checkPage(path, expectedText) {
  const { response, text } = await read(path)
  assertOk(response.status === 200, `${path} status ${response.status}`)
  assertOk(text.includes(`<link rel="canonical" href="https://riderra.com${path}">`), `${path} canonical mismatch`)
  assertOk(!text.includes('nuxt-loading'), `${path} returned SPA loader`)
  assertOk(text.includes(expectedText), `${path} missing expected text: ${expectedText}`)
  const nodes = extractJsonLd(text)
  assertOk(hasType(nodes, 'Organization'), `${path} missing Organization JSON-LD`)
  assertOk(hasType(nodes, 'WebSite'), `${path} missing WebSite JSON-LD`)
  assertOk(hasType(nodes, 'BreadcrumbList'), `${path} missing BreadcrumbList JSON-LD`)
  assertOk(hasType(nodes, 'Service'), `${path} missing Service JSON-LD`)
  assertOk(hasType(nodes, 'FAQPage'), `${path} missing FAQPage JSON-LD`)
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

  await check('transfer index', () => checkPage('/transfers', 'Airport transfers by country'))
  await check('country page', () => checkPage('/transfers/thailand', 'Airport transfers in Thailand'))
  await check('airport page', () => checkPage('/transfers/thailand/phuket-international-airport-hkt', 'Phuket International Airport (HKT) transfers'))
  await check('route page', () => checkPage('/transfers/thailand/phuket-international-airport-hkt/patong-phuket', 'Phuket International Airport (HKT) to PaTong, Phuket transfer'))

  await check('sitemap contains SEO transfer pages', async () => {
    const { response, text } = await read('/sitemap.xml')
    assertOk(response.status === 200, `sitemap status ${response.status}`)
    assertOk(text.includes('https://riderra.com/transfers/thailand'), 'sitemap missing Thailand transfer page')
    assertOk(text.includes('https://riderra.com/transfers/thailand/phuket-international-airport-hkt'), 'sitemap missing Phuket airport page')
  })

  for (const item of checks) {
    console.log(`${item.ok ? 'OK' : 'FAIL'} ${item.name}${item.error ? `: ${item.error}` : ''}`)
  }
  if (checks.some((item) => !item.ok)) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
