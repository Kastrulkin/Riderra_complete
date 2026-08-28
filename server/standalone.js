const fs = require('fs')
const path = require('path')
const express = require('express')
const app = require('./index')

const distDir = path.resolve(process.cwd(), 'dist')
const fallbackFile = path.join(distDir, '200.html')
const port = Number(process.env.PORT) || 3000
const host = process.env.HOST || '0.0.0.0'

if (!fs.existsSync(fallbackFile)) {
  throw new Error('Static frontend is missing. Run `npm run generate` before starting Riderra.')
}

app.use(express.static(distDir, {
  index: false,
  redirect: false,
  setHeaders (res, filePath) {
    if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache')
    else if (filePath.includes(`${path.sep}_nuxt${path.sep}`)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
  }
}))

app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found' }))

app.get('*', (req, res) => {
  const routePath = decodeURIComponent(req.path).replace(/^\/+|\/+$/g, '')
  const generatedPage = path.resolve(distDir, routePath, 'index.html')
  if (generatedPage.startsWith(`${distDir}${path.sep}`) && fs.existsSync(generatedPage)) {
    res.setHeader('Cache-Control', 'no-cache')
    return res.sendFile(generatedPage)
  }
  res.setHeader('Cache-Control', 'no-cache')
  return res.sendFile(fallbackFile)
})

const server = app.listen(port, host, () => {
  console.log(`Riderra listening on http://${host}:${port}`)
})

function shutdown (signal) {
  console.log(`${signal} received, closing Riderra`) // eslint-disable-line no-console
  server.close(() => process.exit(0))
}

process.once('SIGTERM', () => shutdown('SIGTERM'))
process.once('SIGINT', () => shutdown('SIGINT'))

