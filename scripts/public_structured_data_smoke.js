#!/usr/bin/env node

const BASE_URL = String(process.env.RIDERRA_PUBLIC_BASE_URL || 'https://riderra.com').replace(/\/+$/, '')
const CANONICAL_URL = 'https://riderra.com'

function assertOk(condition, message) {
  if (!condition) throw new Error(message)
}

async function read(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, options)
  const text = await response.text()
  return { response, text }
}

function extractJsonLd(html) {
  const blocks = []
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let match
  while ((match = re.exec(html))) {
    blocks.push(JSON.parse(match[1]))
  }
  return blocks
}

function typesOf(node) {
  const type = node && node['@type']
  return Array.isArray(type) ? type : (type ? [type] : [])
}

function hasType(nodes, type) {
  return nodes.some((node) => typesOf(node).includes(type))
}

function textIncludesAll(html, values) {
  const normalized = html.replace(/\s+/g, ' ')
  return values.every((value) => normalized.includes(String(value).replace(/\s+/g, ' ')))
}

async function checkPage(path, expectedTypes) {
  const { response, text } = await read(path)
  assertOk(response.status === 200, `${path} status ${response.status}`)
  assertOk(text.includes(`<link rel="canonical" href="${CANONICAL_URL}${path === '/' ? '/' : path}">`), `${path} canonical mismatch`)
  const nodes = extractJsonLd(text)
  assertOk(nodes.length >= 3, `${path} expected at least 3 JSON-LD blocks`)
  for (const type of expectedTypes) {
    assertOk(hasType(nodes, type), `${path} missing JSON-LD type ${type}`)
  }
  return { html: text, nodes }
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

  await check('homepage crawler structured data', async () => {
    const { response, text } = await read('/', { headers: { 'user-agent': 'GPTBot' } })
    assertOk(response.status === 200, `homepage status ${response.status}`)
    const nodes = extractJsonLd(text)
    assertOk(hasType(nodes, 'Organization'), 'homepage missing Organization')
    assertOk(hasType(nodes, 'TravelAgency'), 'homepage missing TravelAgency')
    assertOk(hasType(nodes, 'WebSite'), 'homepage missing WebSite')
    assertOk(hasType(nodes, 'BreadcrumbList'), 'homepage missing BreadcrumbList')
  })

  await check('core pages structured data', async () => {
    await checkPage('/ai', ['Organization', 'TravelAgency', 'WebSite', 'BreadcrumbList'])
    await checkPage('/services', ['Organization', 'TravelAgency', 'WebSite', 'BreadcrumbList', 'Service', 'TaxiService'])
    await checkPage('/prices', ['Organization', 'TravelAgency', 'WebSite', 'BreadcrumbList'])
    await checkPage('/contact', ['Organization', 'TravelAgency', 'WebSite', 'BreadcrumbList'])
    await checkPage('/sources', ['Organization', 'TravelAgency', 'WebSite', 'BreadcrumbList'])
  })

  await check('FAQ JSON-LD matches visible English FAQ', async () => {
    const { html, nodes } = await checkPage('/faq', ['FAQPage'])
    const faq = nodes.find((node) => typesOf(node).includes('FAQPage'))
    assertOk(Array.isArray(faq.mainEntity) && faq.mainEntity.length >= 5, 'English FAQ has too few questions')
    const visibleValues = faq.mainEntity.flatMap((item) => [item.name, item.acceptedAnswer && item.acceptedAnswer.text])
    assertOk(textIncludesAll(html, visibleValues), 'English FAQ JSON-LD differs from visible page text')
  })

  await check('FAQ JSON-LD matches visible Russian FAQ', async () => {
    const { html, nodes } = await checkPage('/ru/faq', ['FAQPage'])
    const faq = nodes.find((node) => typesOf(node).includes('FAQPage'))
    assertOk(Array.isArray(faq.mainEntity) && faq.mainEntity.length >= 5, 'Russian FAQ has too few questions')
    const visibleValues = faq.mainEntity.flatMap((item) => [item.name, item.acceptedAnswer && item.acceptedAnswer.text])
    assertOk(textIncludesAll(html, visibleValues), 'Russian FAQ JSON-LD differs from visible page text')
  })

  await check('OpenAPI contract has required public paths', async () => {
    const { response, text } = await read('/api/public/openapi.json')
    assertOk(response.status === 200, `OpenAPI status ${response.status}`)
    const spec = JSON.parse(text)
    assertOk(spec.openapi === '3.0.3', 'OpenAPI version mismatch')
    for (const path of ['/api/public/order-requests', '/api/public/order-requests/validate', '/api/public/order-requests/{requestId}/status', '/api/public/pricing-hints', '/api/public/source-truth']) {
      assertOk(spec.paths && spec.paths[path], `OpenAPI missing ${path}`)
    }
  })

  await check('source truth is consistent', async () => {
    const { response, text } = await read('/api/public/source-truth')
    assertOk(response.status === 200, `source-truth status ${response.status}`)
    const body = JSON.parse(text)
    assertOk(body.canonicalWebsite === `${CANONICAL_URL}/`, 'source-truth canonical website mismatch')
    assertOk(body.contactEmail === 'info@riderra.com', 'source-truth contact email mismatch')
    assertOk(Array.isArray(body.sources) && body.sources.length >= 5, 'source-truth sources too short')
    for (const source of body.sources) {
      assertOk(source.name && source.url && source.status, `source is incomplete: ${JSON.stringify(source)}`)
    }
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
