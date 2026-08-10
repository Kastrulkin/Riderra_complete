const test = require('node:test')
const assert = require('node:assert/strict')
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

test('server-rendered public source pages include Yandex Metrika', () => {
  for (const pagePath of ['/services', '/ru/services', '/contact', '/ru/contact']) {
    assertMetrikaPresent(renderPublicSourceHtml(pagePath), pagePath)
  }
})

test('server-rendered transfer pages include Yandex Metrika', () => {
  for (const pagePath of ['/transfers', '/ru/transfers']) {
    assertMetrikaPresent(
      renderSeoTransferPage(pagePath, pagePath.startsWith('/ru/')),
      pagePath
    )
  }
})
