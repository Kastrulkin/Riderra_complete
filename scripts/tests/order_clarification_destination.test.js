const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const ordersPagePath = path.resolve(__dirname, '../../pages/admin-orders.vue')
const serverPath = path.resolve(__dirname, '../../server/index.js')

test('staff can select destination address clarification for an airport drop-off order', () => {
  const ordersPage = fs.readFileSync(ordersPagePath, 'utf8')
  const server = fs.readFileSync(serverPath, 'utf8')
  const fixture = {
    fromPoint: 'Helsinki Vantaa Airport (HEL)',
    toPoint: 'Apollonkatu, Helsinki',
    sourceComment: 'неполный адрес (нет № дома)'
  }

  assert.match(fixture.sourceComment, /неполный адрес/i)
  assert.match(ordersPage, /<option value="destination">\{\{ t\.infoPresetDestination \}\}<\/option>/)
  assert.match(ordersPage, /destination:\s*this\.t\.infoPresetDestination/)
  assert.match(server, /return 'Could you please share the exact destination address\?'/)
})
