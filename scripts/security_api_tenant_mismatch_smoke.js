#!/usr/bin/env node
require('dotenv').config()

const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function requestJson(baseUrl, path, { method = 'GET', token = null, tenantCode = null, body = null } = {}) {
  const headers = { 'content-type': 'application/json' }
  if (token) headers.authorization = `Bearer ${token}`
  if (tenantCode) headers['x-tenant-code'] = tenantCode

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  })

  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch (_) {
    data = { raw: text }
  }
  return { status: res.status, data }
}

async function main() {
  const jwtSecret = process.env.JWT_SECRET || 'ci-jwt-secret'
  const app = require('../server/index')

  const tenantA = await prisma.tenant.upsert({
    where: { code: 'riderra' },
    update: { isActive: true, name: 'Riderra' },
    create: { code: 'riderra', name: 'Riderra', isActive: true }
  })

  const tenantB = await prisma.tenant.create({
    data: {
      code: `tmp-api-${Date.now()}`,
      name: 'Temp API tenant',
      isActive: true
    }
  })

  const email = `api-mismatch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`
  const passwordStub = crypto.randomUUID()
  const user = await prisma.user.create({
    data: {
      email,
      password: passwordStub,
      role: 'operator',
      isActive: true
    }
  })

  await prisma.tenantMembership.create({
    data: {
      tenantId: tenantA.id,
      userId: user.id,
      role: 'staff',
      isActive: true
    }
  })

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, jwtSecret, { expiresIn: '10m' })

  const server = app.listen(0)
  const port = server.address().port
  const baseUrl = `http://127.0.0.1:${port}`

  try {
    const meOwn = await requestJson(baseUrl, '/api/auth/me', {
      token,
      tenantCode: tenantA.code
    })
    assert(meOwn.status === 200, `expected 200 on own tenant, got ${meOwn.status}`)

    const meOther = await requestJson(baseUrl, '/api/auth/me', {
      token,
      tenantCode: tenantB.code
    })
    assert(meOther.status === 403, `expected 403 on tenant mismatch (/api/auth/me), got ${meOther.status}`)

    const writeOther = await requestJson(baseUrl, '/api/admin/sheet-sources', {
      method: 'POST',
      token,
      tenantCode: tenantB.code,
      body: {
        sourceName: 'Mismatch test',
        monthLabel: '2026-02',
        googleSheetId: 'dummy',
        tabName: 'таблица'
      }
    })
    assert(writeOther.status === 403, `expected 403 on tenant mismatch write endpoint, got ${writeOther.status}`)

    console.log(JSON.stringify({ ok: true, checks: 3 }))
  } finally {
    server.close()
    await prisma.tenantMembership.deleteMany({ where: { userId: user.id } })
    await prisma.user.delete({ where: { id: user.id } })
    await prisma.tenant.delete({ where: { id: tenantB.id } })
    await prisma.$disconnect()
  }
}

main().catch(async (error) => {
  console.error(error)
  process.exitCode = 1
  await prisma.$disconnect()
})
