const express = require('express')
const bodyParser = require('body-parser')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()
const app = express()
app.use(bodyParser.json())

// Very simple token auth for admin routes
function auth(req, res, next){
  const token = req.headers['x-admin-token'] || req.query.token
  if(process.env.ADMIN_TOKEN && token === process.env.ADMIN_TOKEN){ return next() }
  return res.status(401).json({ error: 'unauthorized' })
}

app.post('/api/requests', async (req, res) => {
  try {
    const { name, email, phone, fromPoint, toPoint, date, passengers, luggage, comment, lang } = req.body
    const created = await prisma.request.create({ data: {
      name, email, phone, fromPoint, toPoint,
      date: date ? new Date(date) : null,
      passengers: passengers ?? null,
      luggage: luggage ?? null,
      comment: comment ?? null,
      lang: lang ?? null
    }})
    res.json(created)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'failed' })
  }
})

app.post('/api/drivers', async (req, res) => {
  try {
    const { name, email, phone, city, fixedRoutes, pricePerKm, comment, lang } = req.body
    const created = await prisma.driver.create({ data: {
      name, email, phone, city,
      fixedRoutes: fixedRoutes ?? null,
      pricePerKm: pricePerKm ?? null,
      comment: comment ?? null,
      lang: lang ?? null
    }})
    res.json(created)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'failed' })
  }
})

module.exports = app

// Admin endpoints
app.get('/api/admin/requests', auth, async (req, res) => {
  try {
    const rows = await prisma.request.findMany({ orderBy: { createdAt: 'desc' }})
    res.json(rows)
  } catch (e) { res.status(500).json({ error: 'failed' }) }
})

app.get('/api/admin/drivers', auth, async (req, res) => {
  try {
    const rows = await prisma.driver.findMany({ orderBy: { createdAt: 'desc' }})
    res.json(rows)
  } catch (e) { res.status(500).json({ error: 'failed' }) }
})


