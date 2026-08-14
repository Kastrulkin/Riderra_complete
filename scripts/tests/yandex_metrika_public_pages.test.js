const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const {
  renderPublicSourceHtml,
  renderSeoTransferPage
} = require('../../server/services/publicSurfaceService')

const METRIKA_ID = '108482177'

function assertMetrikaPresent(html, pagePath) {
  assert.ok(html, `${pagePath} should render public HTML`)
  assert.match(
    html,
    new RegExp(`(?:metrika/tag\\.js|mc\\.yandex\\.ru/watch/)[^"']*${METRIKA_ID}|${METRIKA_ID}[^"']*(?:metrika/tag\\.js|mc\\.yandex\\.ru/watch/)`),
    `${pagePath} should initialize Yandex Metrika counter ${METRIKA_ID}`
  )
}

function assertAutomaticPageviewEnabled(source, label) {
  assert.doesNotMatch(
    source,
    /\bdefer\s*:\s*true\b/,
    `${label} should not disable automatic Yandex Metrika pageviews`
  )
}

test('server-rendered public source pages include Yandex Metrika', () => {
  for (const pagePath of ['/services', '/ru/services', '/contact', '/ru/contact']) {
    const html = renderPublicSourceHtml(pagePath)
    assertMetrikaPresent(html, pagePath)
    assertAutomaticPageviewEnabled(html, pagePath)
  }
})

test('server-rendered transfer pages include Yandex Metrika', () => {
  for (const pagePath of ['/transfers', '/ru/transfers']) {
    const html = renderSeoTransferPage(pagePath, pagePath.startsWith('/ru/'))
    assertMetrikaPresent(html, pagePath)
    assertAutomaticPageviewEnabled(html, pagePath)
  }
})

test('client-rendered pages keep automatic Yandex Metrika pageviews enabled', () => {
  const clientHeadAssets = fs.readFileSync(
    path.resolve(__dirname, '../../plugins/client-head-assets.js'),
    'utf8'
  )

  assertAutomaticPageviewEnabled(clientHeadAssets, 'client-head-assets plugin')
})
