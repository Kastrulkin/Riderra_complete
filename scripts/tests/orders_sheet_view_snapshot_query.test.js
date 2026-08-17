const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const serverSource = fs.readFileSync(path.resolve(__dirname, '../../server/index.js'), 'utf8')
const routeStart = serverSource.indexOf("app.get('/api/admin/orders-sheet-view'")
const routeEnd = serverSource.indexOf('\napp.get(', routeStart + 1)
const routeSource = serverSource.slice(routeStart, routeEnd)

test('orders sheet view deduplicates snapshot history before any result limit', () => {
  assert.ok(routeStart >= 0, 'orders sheet view route must remain discoverable')
  assert.doesNotMatch(
    routeSource,
    /orderSourceSnapshot\.findMany\([\s\S]*?take:\s*10000/,
    'snapshot history must not consume the row limit before duplicate source rows are removed'
  )
  assert.match(
    routeSource,
    /distinct:\s*\[\s*['"]sourceRow['"]\s*\]/,
    'the database query must return only the latest snapshot for each sheet row'
  )
})
