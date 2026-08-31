const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const root = path.resolve(__dirname, '../..')
const updateScript = fs.readFileSync(path.join(root, 'update.sh'), 'utf8')
const dockerfile = fs.readFileSync(path.join(root, 'Dockerfile'), 'utf8')

test('server deploy removes build dependencies before restarting Riderra', () => {
  const installAt = updateScript.indexOf('npm install --include=dev --no-audit')
  const generateAt = updateScript.indexOf('npm run generate')
  const pruneAt = updateScript.indexOf('npm prune --omit=dev --no-audit')
  const auditAt = updateScript.indexOf('npm run security:audit-production')
  const restartAt = updateScript.indexOf('pm2 restart riderra')

  assert.ok(installAt >= 0, 'deploy must install the build toolchain without treating it as runtime')
  assert.ok(generateAt > installAt, 'frontend generation must happen after build dependencies are installed')
  assert.ok(pruneAt > generateAt, 'build dependencies must be pruned after frontend generation')
  assert.ok(auditAt > pruneAt, 'the installed runtime must be audited after pruning')
  assert.ok(restartAt > auditAt, 'PM2 must restart only after the runtime audit passes')
})

test('Docker release image contains only audited runtime dependencies', () => {
  const builderAt = dockerfile.indexOf('FROM node:20-alpine AS builder')
  const generateAt = dockerfile.indexOf('RUN npm run generate')
  const pruneAt = dockerfile.indexOf('RUN npm prune --omit=dev --no-audit')
  const auditAt = dockerfile.indexOf('RUN npm audit --omit=dev')
  const runtimeAt = dockerfile.indexOf('FROM node:20-alpine AS runtime')

  assert.ok(builderAt >= 0)
  assert.ok(generateAt > builderAt)
  assert.ok(pruneAt > generateAt)
  assert.ok(auditAt > pruneAt)
  assert.ok(runtimeAt > auditAt)
  assert.match(dockerfile, /COPY --from=builder \/app \/app/)
})
