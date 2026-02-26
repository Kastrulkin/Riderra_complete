// Загружаем переменные окружения из .env файла (для локальной разработки)
if (process.env.NODE_ENV !== 'production') {
  try {
    require('dotenv').config()
  } catch (e) {
    // dotenv не установлен, используем переменные из окружения
  }
}

const express = require('express')
const bodyParser = require('body-parser')
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const nodemailer = require('nodemailer')
const fs = require('fs/promises')
const crypto = require('crypto')

const prisma = new PrismaClient()
const app = express()

const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

// CORS middleware
app.use((req, res, next) => {
  const requestOrigin = req.headers.origin
  if (allowedOrigins.length === 0) {
    res.header('Access-Control-Allow-Origin', '*')
  } else if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    res.header('Access-Control-Allow-Origin', requestOrigin)
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization')
  res.header('Vary', 'Origin')
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200)
  }
  next()
})

app.use(bodyParser.json())

// JWT секрет
const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is required')
}

// Настройки email
const EMAIL_TO = process.env.EMAIL_TO || 'demyanov@riderra.com' // Email получателя заявок
const EMAIL_FROM = process.env.EMAIL_FROM || 'farmout@riderra.com' // Email отправителя
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.yandex.ru' // SMTP хост
const SMTP_PORT = process.env.SMTP_PORT || 587 // SMTP порт
const SMTP_USER = process.env.SMTP_USER || '' // SMTP пользователь (email)
const SMTP_PASS = process.env.SMTP_PASS || '' // SMTP пароль

// Создаем транспортер для отправки email
let transporter = null
if (SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT) || 587,
    secure: false, // false для порта 587 (TLS), true для 465 (SSL)
    requireTLS: true, // Требуем TLS для порта 587
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  })
}

// Функция отправки email с заявкой водителя
async function sendDriverRegistrationEmail(data) {
  if (!transporter) {
    console.warn('Email transporter not configured. Set SMTP_USER and SMTP_PASS environment variables.')
    console.warn('SMTP_USER:', SMTP_USER ? 'SET' : 'NOT SET')
    console.warn('SMTP_PASS:', SMTP_PASS ? 'SET' : 'NOT SET')
    return false
  }

  try {
    console.log('Attempting to send email...')
    console.log('EMAIL_FROM:', EMAIL_FROM)
    console.log('EMAIL_TO:', EMAIL_TO)
    console.log('SMTP_HOST:', SMTP_HOST)
    console.log('SMTP_PORT:', SMTP_PORT)
    
    const routesText = data.routes && data.routes.length > 0
      ? data.routes.map((r, idx) => 
          `${idx + 1}. ${r.from || '-'} → ${r.to || '-'} | ${r.price || '-'} ${r.currency || ''}`
        ).join('\n')
      : 'Не указаны'

    const subject = `[Riderra] ${data.lang === 'ru' ? 'Регистрация водителя' : 'Driver registration'}`
    const html = `
      <h2>${data.lang === 'ru' ? 'Новая заявка на регистрацию перевозчика' : 'New driver registration request'}</h2>
      <p><strong>${data.lang === 'ru' ? 'Имя/Компания' : 'Name/Company'}:</strong> ${data.name}</p>
      <p><strong>Email:</strong> ${data.email}</p>
      <p><strong>${data.lang === 'ru' ? 'Телефон' : 'Phone'}:</strong> ${data.phone}</p>
      <p><strong>${data.lang === 'ru' ? 'Город/регион работы' : 'City/Operating region'}:</strong> ${data.city || '-'}</p>
      <p><strong>${data.lang === 'ru' ? 'Цена за километр' : 'Price per km'}:</strong> ${data.pricePerKm || '-'}</p>
      <p><strong>${data.lang === 'ru' ? 'Комиссия' : 'Commission'}:</strong> ${data.commissionRate || 15}%</p>
      <p><strong>${data.lang === 'ru' ? 'Фиксированные маршруты' : 'Fixed routes'}:</strong></p>
      <pre>${routesText}</pre>
      ${data.comment ? `<p><strong>${data.lang === 'ru' ? 'Комментарий' : 'Comment'}:</strong> ${data.comment}</p>` : ''}
    `
    const text = `
${data.lang === 'ru' ? 'Новая заявка на регистрацию перевозчика' : 'New driver registration request'}

${data.lang === 'ru' ? 'Имя/Компания' : 'Name/Company'}: ${data.name}
Email: ${data.email}
${data.lang === 'ru' ? 'Телефон' : 'Phone'}: ${data.phone}
${data.lang === 'ru' ? 'Город/регион работы' : 'City/Operating region'}: ${data.city || '-'}
${data.lang === 'ru' ? 'Цена за километр' : 'Price per km'}: ${data.pricePerKm || '-'}
${data.lang === 'ru' ? 'Комиссия' : 'Commission'}: ${data.commissionRate || 15}%
${data.lang === 'ru' ? 'Фиксированные маршруты' : 'Fixed routes'}:
${routesText}
${data.comment ? `${data.lang === 'ru' ? 'Комментарий' : 'Comment'}: ${data.comment}` : ''}
    `

    const info = await transporter.sendMail({
      from: EMAIL_FROM,
      to: EMAIL_TO,
      subject: subject,
      text: text,
      html: html
    })

    console.log('Email sent successfully! Message ID:', info.messageId)
    console.log('Email response:', info.response)
    return true
  } catch (error) {
    console.error('Error sending email:', error)
    console.error('Error code:', error.code)
    console.error('Error command:', error.command)
    console.error('Error response:', error.response)
    console.error('Error responseCode:', error.responseCode)
    console.error('Error stack:', error.stack)
    return false
  }
}

// Middleware для проверки JWT токена
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ error: 'Access token required' })
  }

  jwt.verify(token, JWT_SECRET, async (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' })
    }
    req.user = user
    try {
      const [acl, dbUser] = await Promise.all([
        getUserRolesAndPermissions(user.id),
        prisma.user.findUnique({
          where: { id: user.id },
          select: { abacCountries: true, abacCities: true, abacTeams: true }
        })
      ])
      req.userRoles = acl.roles
      req.userPermissions = acl.permissions
      req.userAbac = {
        countries: parseScopeList(dbUser?.abacCountries),
        cities: parseScopeList(dbUser?.abacCities),
        teams: parseScopeList(dbUser?.abacTeams)
      }
    } catch (aclError) {
      req.userRoles = []
      req.userPermissions = []
      req.userAbac = { countries: [], cities: [], teams: [] }
    }
    next()
  })
}

// Middleware для проверки роли админа
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin' && !hasPermission(req, 'admin.panel')) {
    return res.status(403).json({ error: 'Admin access required' })
  }
  next()
}

// Middleware для проверки роли водителя
function requireDriver(req, res, next) {
  if (req.user.role !== 'driver') {
    return res.status(403).json({ error: 'Driver access required' })
  }
  next()
}

function findMatchingRoute(routes, fromPoint, toPoint) {
  const safeFrom = String(fromPoint || '').toLowerCase()
  const safeTo = String(toPoint || '').toLowerCase()
  return routes.find((route) =>
    route.fromPoint.toLowerCase().includes(safeFrom) &&
    route.toPoint.toLowerCase().includes(safeTo)
  )
}

async function getUserRolesAndPermissions(userId) {
  const links = await prisma.userRole.findMany({
    where: { userId },
    include: {
      role: {
        include: {
          permissions: {
            include: { permission: true }
          }
        }
      }
    }
  })

  const roles = [...new Set(links.map((l) => l.role.code))]
  const permissions = [
    ...new Set(
      links.flatMap((l) => l.role.permissions.map((rp) => rp.permission.code))
    )
  ]
  return { roles, permissions }
}

function normalizeScopeToken(value) {
  return String(value || '').trim().toLowerCase()
}

function parseScopeList(raw) {
  return String(raw || '')
    .split(/[,\n;|/]+/)
    .map((x) => normalizeScopeToken(x))
    .filter(Boolean)
}

function hasScopeMatch(actorScopes, targetValue) {
  const scopes = actorScopes || []
  if (!scopes.length) return true
  if (scopes.includes('all') || scopes.includes('*') || scopes.includes('globe')) return true
  const target = normalizeScopeToken(targetValue)
  if (!target) return true
  return scopes.includes(target)
}

function buildGeoScopeWhere(req, countryField = 'country', cityField = 'city') {
  const countries = req.userAbac?.countries || []
  const cities = req.userAbac?.cities || []
  const and = []
  const countriesScoped = countries.length && !countries.includes('all') && !countries.includes('*') && !countries.includes('globe')
  const citiesScoped = cities.length && !cities.includes('all') && !cities.includes('*') && !cities.includes('globe')
  if (countriesScoped) {
    and.push({
      OR: countries.map((country) => ({
        [countryField]: { equals: country, mode: 'insensitive' }
      }))
    })
  }
  if (citiesScoped) {
    and.push({
      OR: cities.map((city) => ({
        [cityField]: { equals: city, mode: 'insensitive' }
      }))
    })
  }
  return and.length ? { AND: and } : {}
}

function buildCityScopeWhere(req, cityField = 'city') {
  const cities = req.userAbac?.cities || []
  if (!cities.length) return {}
  if (cities.includes('all') || cities.includes('*') || cities.includes('globe')) return {}
  return {
    AND: [
      {
        OR: cities.map((city) => ({
          [cityField]: { equals: city, mode: 'insensitive' }
        }))
      }
    ]
  }
}

function can(actor, action, resource, context = {}) {
  if (!actor) return false
  const permissions = actor.permissions || []
  const role = actor.role || actor.actorRole || null
  const actorId = actor.actorId || null
  const actorTenantId = actor.tenantId || null
  const actorCountries = actor.allowedCountries || []
  const actorCities = actor.allowedCities || []
  const actorTeams = actor.allowedTeams || []
  const targetTenantId = context.tenantId || null
  const isSupervisor = role === 'staff_supervisor' || permissions.includes('approvals.resolve')
  const isExternal = ['executor', 'customer', 'passenger'].includes(role)

  if (targetTenantId && actorTenantId && actorTenantId !== targetTenantId) return false
  if (role === 'admin' || permissions.includes('*')) return true
  if (
    isExternal &&
    ['crm.read', 'crm.manage', 'pricing.read', 'pricing.manage', 'settings.manage', 'directions.manage', 'ops.manage', 'approvals.resolve'].includes(action)
  ) return false
  if (!hasScopeMatch(actorCountries, context.country)) return false
  if (!hasScopeMatch(actorCities, context.city)) return false
  if (!hasScopeMatch(actorTeams, context.team)) return false

  if (context.ownerUserId && !isSupervisor && actorId && context.ownerUserId !== actorId) return false

  if (context.businessHours?.enabled) {
    const tz = String(context.businessHours.timezone || process.env.BUSINESS_TIMEZONE || 'Europe/Moscow')
    const startHour = Number.isFinite(context.businessHours.startHour) ? context.businessHours.startHour : 6
    const endHour = Number.isFinite(context.businessHours.endHour) ? context.businessHours.endHour : 23
    const hourStr = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      hour12: false,
      timeZone: tz
    }).format(new Date())
    const hour = Number.parseInt(hourStr, 10)
    if (!Number.isFinite(hour) || hour < startHour || hour > endHour) {
      return false
    }
  }

  if (action === 'permission.check') {
    if (Array.isArray(context.anyOf) && context.anyOf.length > 0) {
      return context.anyOf.some((code) => permissions.includes(code))
    }
    if (typeof context.permissionCode === 'string' && context.permissionCode) {
      return permissions.includes(context.permissionCode)
    }
    return false
  }

  const actionPermissionMap = {
    'drivers.read': ['drivers.read'],
    'drivers.manage': ['drivers.manage'],
    'orders.read': ['orders.read'],
    'orders.transition.request': [
      'orders.validate',
      'orders.assign',
      'orders.reassign',
      'orders.confirmation.manage',
      'incidents.manage',
      'claims.compose',
      'reconciliation.run',
      'payouts.manage',
      'approvals.resolve'
    ],
    'approvals.resolve': ['approvals.resolve'],
    'directions.read': ['directions.read', 'directions.manage'],
    'directions.manage': ['directions.manage'],
    'settings.manage': ['settings.manage'],
    'crm.read': ['crm.read'],
    'crm.manage': ['crm.manage'],
    'pricing.read': ['pricing.read'],
    'pricing.manage': ['pricing.manage'],
    'ops.read': ['ops.read'],
    'ops.manage': ['ops.manage'],
    'ops.drafts.resolve': ['ops.manage', 'approvals.resolve'],
    'telegram.links.manage': ['telegram.link.manage']
  }

  if (actionPermissionMap[action]) {
    return actionPermissionMap[action].some((code) => permissions.includes(code))
  }

  if (action === 'orders.transition') {
    if (['paid', 'closed'].includes(String(context.toStatus || '').toLowerCase()) && !isSupervisor) {
      return false
    }
    if (role === 'executor') {
      if (!actorId || !context.ownerUserId || context.ownerUserId !== actorId) return false
      const allowedExecutorTargets = ['in_progress', 'completed', 'incident_open']
      if (!allowedExecutorTargets.includes(String(context.toStatus || '').toLowerCase())) return false
    }
    return canTransitionByPermissions(
      permissions,
      context.fromStatus || '',
      context.toStatus || ''
    )
  }

  return false
}

function buildActorFromReq(req) {
  return {
    actorId: req.actorContext?.actorId || req.user?.id || null,
    role: req.user?.role,
    actorRole: req.actorContext?.actorRole,
    permissions: req.userPermissions || [],
    allowedCountries: req.userAbac?.countries || [],
    allowedCities: req.userAbac?.cities || [],
    allowedTeams: req.userAbac?.teams || [],
    tenantId: req.actorContext?.tenantId || null
  }
}

function hasPermission(req, permissionCode) {
  return can(
    buildActorFromReq(req),
    'permission.check',
    'permission',
    { permissionCode, tenantId: req.actorContext?.tenantId || null }
  )
}

function requirePermission(permissionCode) {
  return (req, res, next) => {
    if (req.user?.role === 'admin') return next() // legacy compatibility
    if (!hasPermission(req, permissionCode)) {
      return res.status(403).json({ error: `Permission required: ${permissionCode}` })
    }
    next()
  }
}

function hasAnyPermission(req, permissionCodes) {
  return can(
    buildActorFromReq(req),
    'permission.check',
    'permission',
    { anyOf: permissionCodes, tenantId: req.actorContext?.tenantId || null }
  )
}

function requireCan(action, resource, contextBuilder = null) {
  return async (req, res, next) => {
    try {
      const extraContext = typeof contextBuilder === 'function'
        ? await contextBuilder(req)
        : {}
      const context = {
        tenantId: req.actorContext?.tenantId || null,
        ...(extraContext || {})
      }
      if (!can(buildActorFromReq(req), action, resource, context)) {
        return res.status(403).json({ error: `Policy denied: ${action} on ${resource}` })
      }
      next()
    } catch (error) {
      console.error('requireCan failed:', error)
      res.status(500).json({ error: 'Policy evaluation failed' })
    }
  }
}

function requireAnyPermission(permissionCodes) {
  return (req, res, next) => {
    if (req.user?.role === 'admin') return next() // legacy compatibility
    if (!hasAnyPermission(req, permissionCodes)) {
      return res.status(403).json({ error: `One of permissions required: ${permissionCodes.join(', ')}` })
    }
    next()
  }
}

async function getConfiguredTenant(tenantCode = null) {
  const code = String(tenantCode || process.env.TENANT_CODE || 'riderra').trim().toLowerCase()
  const tenant = await prisma.tenant.findUnique({
    where: { code }
  })
  if (!tenant || !tenant.isActive) {
    throw new Error(`Tenant "${code}" is not configured or inactive`)
  }
  return tenant
}

async function ensureDefaultTenantMembership(userId, role = 'staff') {
  const tenant = await getConfiguredTenant()
  const membership = await prisma.tenantMembership.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId } },
    update: { isActive: true },
    create: {
      tenantId: tenant.id,
      userId,
      role,
      isActive: true
    }
  })
  return { tenant, membership }
}

async function resolveActorContext(req, res, next) {
  try {
    const traceId = String(req.headers['x-trace-id'] || '').trim() || crypto.randomUUID()
    const requestedTenantCode = String(req.headers['x-tenant-code'] || req.query.tenant_code || req.body?.tenant_code || '').trim().toLowerCase()
    const isAuthenticated = !!req.user?.id

    if (!isAuthenticated) {
      const tenant = await getConfiguredTenant(requestedTenantCode || null)
      if (!tenant || !tenant.isActive) return res.status(403).json({ error: 'Tenant is not active or not found' })
      req.actorContext = {
        traceId,
        tenantId: tenant.id,
        tenantCode: tenant.code,
        actorId: null,
        actorRole: 'system',
        channel: 'api',
        chatType: 'service'
      }
      return next()
    }

    let membership = null
    if (requestedTenantCode) {
      membership = await prisma.tenantMembership.findFirst({
        where: {
          userId: req.user.id,
          isActive: true,
          tenant: { code: requestedTenantCode, isActive: true }
        },
        include: { tenant: true }
      })
      if (!membership) {
        return res.status(403).json({ error: 'Tenant mismatch or no membership for requested tenant' })
      }
    } else {
      membership = await prisma.tenantMembership.findFirst({
        where: { userId: req.user.id, isActive: true, tenant: { isActive: true } },
        include: { tenant: true },
        orderBy: { createdAt: 'asc' }
      })
    }

    if (!membership) {
      return res.status(403).json({ error: 'No active tenant membership found' })
    }

    req.actorContext = {
      traceId,
      tenantId: membership.tenantId,
      tenantCode: membership.tenant.code,
      actorId: req.user.id,
      actorRole: membership.role || req.user.role || 'staff',
      channel: 'api',
      chatType: 'dm'
    }
    next()
  } catch (error) {
    console.error('resolveActorContext failed:', error)
    res.status(500).json({ error: 'Failed to resolve actor context' })
  }
}

function requireActorContext(req, res, next) {
  if (!req.actorContext?.tenantId) {
    return res.status(403).json({ error: 'Tenant context required' })
  }
  next()
}

async function writeAuditLog({
  tenantId,
  actorId = null,
  actorRole = null,
  action,
  resource,
  resourceId = null,
  traceId,
  decision = null,
  result = 'ok',
  context = null
}) {
  if (!tenantId || !traceId || !action || !resource) return
  try {
    await prisma.auditLog.create({
      data: {
        tenantId,
        actorId,
        actorRole,
        action,
        resource,
        resourceId,
        traceId,
        decision,
        result,
        contextJson: context ? JSON.stringify(context) : null
      }
    })
  } catch (error) {
    console.error('Audit log write failed:', error)
  }
}

function getIdempotencyKey(req) {
  return String(
    req.headers['idempotency-key'] ||
    req.body?.idempotency_key ||
    req.body?.idempotencyKey ||
    req.query?.idempotency_key ||
    ''
  ).trim()
}

async function withIdempotency(req, action, requestPayload, operation) {
  const idempotencyKey = getIdempotencyKey(req)
  if (!idempotencyKey) {
    const error = new Error('idempotency_key is required')
    error.statusCode = 400
    throw error
  }
  const tenantId = req.actorContext?.tenantId
  if (!tenantId) {
    const error = new Error('tenant context required for idempotency')
    error.statusCode = 403
    throw error
  }
  const requestHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(requestPayload || {}))
    .digest('hex')

  let keyRow = await prisma.idempotencyKey.findUnique({
    where: {
      tenantId_key_action: {
        tenantId,
        key: idempotencyKey,
        action
      }
    }
  })

  if (keyRow?.status === 'completed' && keyRow.responseJson) {
    return { replayed: true, data: JSON.parse(keyRow.responseJson) }
  }
  if (keyRow?.status === 'processing') {
    const error = new Error('idempotent request in progress')
    error.statusCode = 409
    throw error
  }

  if (!keyRow) {
    try {
      keyRow = await prisma.idempotencyKey.create({
        data: {
          tenantId,
          key: idempotencyKey,
          action,
          requestHash,
          status: 'processing',
          traceId: req.actorContext?.traceId || null
        }
      })
    } catch (_) {
      keyRow = await prisma.idempotencyKey.findUnique({
        where: {
          tenantId_key_action: {
            tenantId,
            key: idempotencyKey,
            action
          }
        }
      })
      if (keyRow?.status === 'completed' && keyRow.responseJson) {
        return { replayed: true, data: JSON.parse(keyRow.responseJson) }
      }
    }
  }

  const result = await operation()
  await prisma.idempotencyKey.update({
    where: { id: keyRow.id },
    data: {
      status: 'completed',
      requestHash,
      responseJson: JSON.stringify(result),
      traceId: req.actorContext?.traceId || null
    }
  })
  return { replayed: false, data: result }
}

async function ensureHumanApproval(req, {
  action,
  resource,
  resourceId = null,
  payload,
  required = false
}) {
  if (!required) return { approved: true, approval: null }
  const tenantId = req.actorContext?.tenantId
  if (!tenantId) {
    const error = new Error('Tenant context required')
    error.statusCode = 403
    throw error
  }
  const approvalId = String(req.body?.approvalId || req.headers['x-approval-id'] || '').trim()
  if (approvalId) {
    const approved = await prisma.humanApproval.findFirst({
      where: {
        id: approvalId,
        tenantId,
        action,
        resource,
        resourceId: resourceId || null,
        status: 'approved'
      }
    })
    if (approved) return { approved: true, approval: approved }
  }

  const existing = await prisma.humanApproval.findFirst({
    where: {
      tenantId,
      action,
      resource,
      resourceId: resourceId || null,
      status: 'pending_human'
    },
    orderBy: { createdAt: 'desc' }
  })
  if (existing) {
    const error = new Error('pending_human approval required')
    error.statusCode = 409
    error.details = { code: 'pending_human', approvalId: existing.id }
    throw error
  }

  const created = await prisma.humanApproval.create({
    data: {
      tenantId,
      action,
      resource,
      resourceId: resourceId || null,
      payloadJson: JSON.stringify(payload || {}),
      requesterId: req.actorContext?.actorId || null,
      traceId: req.actorContext?.traceId || null,
      status: 'pending_human',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    }
  })
  const error = new Error('pending_human approval required')
  error.statusCode = 409
  error.details = { code: 'pending_human', approvalId: created.id }
  throw error
}

function normalizeOrderStatus(status) {
  return String(status || '').trim().toLowerCase()
}

const ORDER_STATUS_TRANSITIONS = {
  draft: ['waiting_info', 'validated', 'pending_dispatch', 'cancelled'],
  waiting_info: ['validated', 'cancelled'],
  validated: ['pending_dispatch', 'cancelled'],
  pending_dispatch: ['assigned', 'dispatch_risk', 'cancelled'],
  dispatch_risk: ['pending_dispatch', 'assigned', 'cancelled'],
  assigned: ['assigned', 'accepted', 'pending_ops_control', 'cancelled'],
  accepted: ['pending_ops_control', 'in_progress', 'completed', 'cancelled'],
  pending_ops_control: ['confirmed', 'cancelled'],
  confirmed: ['in_progress', 'incident_open', 'ready_finance', 'cancelled'],
  in_progress: ['incident_open', 'completed', 'ready_finance', 'cancelled'],
  incident_open: ['incident_reported', 'ready_finance', 'cancelled'],
  incident_reported: ['ready_finance', 'cancelled'],
  completed: ['ready_finance', 'cancelled'],
  ready_finance: ['finance_hold', 'paid', 'cancelled'],
  finance_hold: ['ready_finance', 'paid', 'cancelled'],
  paid: ['closed'],
  closed: [],
  pending: ['assigned', 'pending_ops_control', 'cancelled'],
  cancelled: []
}

function canTransitionByPermissions(perms, fromStatus, toStatus) {
  const from = normalizeOrderStatus(fromStatus)
  const to = normalizeOrderStatus(toStatus)
  const allowedTargets = ORDER_STATUS_TRANSITIONS[from] || []
  if (!allowedTargets.includes(to)) return false
  if (perms.includes('*') || perms.includes('approvals.resolve')) return true

  const has = (code) => perms.includes(code)
  const byDomain = {
    'orders.create_draft': [['new', 'draft']],
    'orders.validate': [['draft', 'waiting_info'], ['draft', 'validated'], ['waiting_info', 'validated'], ['validated', 'pending_dispatch']],
    'orders.assign': [['pending', 'assigned'], ['pending_dispatch', 'assigned'], ['dispatch_risk', 'assigned']],
    'orders.reassign': [['assigned', 'assigned']],
    'orders.confirmation.manage': [
      ['assigned', 'pending_ops_control'],
      ['accepted', 'pending_ops_control'],
      ['pending_ops_control', 'confirmed'],
      ['confirmed', 'in_progress'],
      ['in_progress', 'completed'],
      ['confirmed', 'ready_finance'],
      ['completed', 'ready_finance']
    ],
    'incidents.manage': [
      ['confirmed', 'incident_open'],
      ['in_progress', 'incident_open'],
      ['incident_open', 'incident_reported'],
      ['incident_reported', 'ready_finance']
    ],
    'claims.compose': [['incident_open', 'incident_reported']],
    'reconciliation.run': [['ready_finance', 'finance_hold'], ['finance_hold', 'ready_finance']],
    'payouts.manage': [['ready_finance', 'paid'], ['finance_hold', 'paid'], ['paid', 'closed']]
  }

  for (const [permCode, pairs] of Object.entries(byDomain)) {
    if (!has(permCode)) continue
    if (pairs.some(([a, b]) => a === from && b === to)) return true
  }

  if (to === 'cancelled' && (has('orders.assign') || has('orders.reassign') || has('orders.confirmation.manage') || has('incidents.manage'))) {
    return true
  }

  return false
}

function isKnownOrderStatus(status) {
  const normalized = normalizeOrderStatus(status)
  return Object.prototype.hasOwnProperty.call(ORDER_STATUS_TRANSITIONS, normalized)
}

function normalizeIncomingOrderStatus(status, fallback = 'pending') {
  const normalized = normalizeOrderStatus(status)
  if (!normalized) return fallback
  return isKnownOrderStatus(normalized) ? normalized : fallback
}

function appendOrderComment(comment, reason) {
  if (!reason) return comment
  return [comment, reason].filter(Boolean).join('\n')
}

async function applyOrderStatusTransition({
  orderId,
  tenantId = null,
  toStatus,
  reason = null,
  actorPermissions = [],
  actorRole = null,
  actorUserId = null,
  actorEmail = null,
  source = 'system',
  bypassPermissions = false,
  tx = prisma
}) {
  const targetStatus = normalizeOrderStatus(toStatus)
  if (!targetStatus) {
    const error = new Error('toStatus is required')
    error.statusCode = 400
    throw error
  }

  const order = await tx.order.findFirst({
    where: {
      id: orderId,
      ...(tenantId ? { tenantId } : {})
    },
    include: {
      driver: {
        select: { userId: true }
      }
    }
  })
  if (!order) {
    const error = new Error('Order not found')
    error.statusCode = 404
    throw error
  }

  const currentStatus = normalizeOrderStatus(order.status)
  const allowedTargets = ORDER_STATUS_TRANSITIONS[currentStatus] || []
  if (currentStatus !== targetStatus && !allowedTargets.includes(targetStatus)) {
    const error = new Error(`Transition denied: ${currentStatus} -> ${targetStatus}`)
    error.statusCode = 403
    error.details = { currentStatus, targetStatus }
    throw error
  }

  if (!bypassPermissions && !can(
    {
      permissions: actorPermissions || [],
      tenantId: tenantId || order.tenantId || null,
      actorId: actorUserId || null,
      actorRole: actorRole || null
    },
    'orders.transition',
    'order',
    {
      tenantId: tenantId || order.tenantId || null,
      fromStatus: currentStatus,
      toStatus: targetStatus,
      ownerUserId: order.driver?.userId || null
    }
  )) {
    const error = new Error(`Transition denied: ${currentStatus} -> ${targetStatus}`)
    error.statusCode = 403
    error.details = { currentStatus, targetStatus }
    throw error
  }

  const nextComment = appendOrderComment(
    order.comment,
    reason ? `[status:${currentStatus}->${targetStatus}] ${reason}` : null
  )
  const patch = {}
  if (currentStatus !== targetStatus) patch.status = targetStatus
  if (nextComment !== order.comment) patch.comment = nextComment

  const shouldLogHistory = currentStatus !== targetStatus
  if (Object.keys(patch).length === 0 && !shouldLogHistory) {
    return order
  }

  const updatedOrder = Object.keys(patch).length === 0
    ? order
    : await tx.order.update({
    where: { id: order.id },
    data: patch
  })

  if (shouldLogHistory) {
    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        tenantId: order.tenantId || tenantId || null,
        fromStatus: currentStatus,
        toStatus: targetStatus,
        reason: reason || null,
        actorUserId,
        actorEmail,
        source
      }
    })
  }

  return updatedOrder
}

function normalizeHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function pickField(row, aliases) {
  const normalized = Object.entries(row).reduce((acc, [key, value]) => {
    acc[normalizeHeader(key)] = value
    return acc
  }, {})
  for (const alias of aliases) {
    const value = normalized[normalizeHeader(alias)]
    if (value !== undefined && String(value).trim() !== '') {
      return String(value).trim()
    }
  }
  return null
}

function parseColumnMapping(raw) {
  if (!raw) return {}
  if (typeof raw === 'object' && raw !== null) return raw
  try {
    const parsed = JSON.parse(String(raw))
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch (_) {
    return {}
  }
}

function aliasesWithMapping(defaultAliases, mapping, key) {
  const customHeader = mapping && mapping[key] ? String(mapping[key]).trim() : ''
  if (!customHeader) return defaultAliases
  return [customHeader, ...defaultAliases]
}

function toBase64Url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function toFloat(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback
  const normalized = String(value).replace(',', '.').replace(/[^\d.\-]/g, '')
  const parsed = parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : fallback
}

function toInt(value, fallback = null) {
  if (value === null || value === undefined || value === '') return fallback
  const parsed = parseInt(String(value).replace(/[^\d\-]/g, ''), 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

function parseDateTimeFlexible(input) {
  if (!input) return null
  const raw = String(input).trim()
  if (!raw) return null

  const isoAttempt = new Date(raw)
  if (!Number.isNaN(isoAttempt.getTime())) return isoAttempt

  // dd.mm.yyyy [hh:mm]
  const ru = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/)
  if (ru) {
    const [, d, m, y, hh = '0', mm = '0'] = ru
    const dt = new Date(
      Number(y),
      Number(m) - 1,
      Number(d),
      Number(hh),
      Number(mm),
      0,
      0
    )
    if (!Number.isNaN(dt.getTime())) return dt
  }

  // yyyy-mm-dd [hh:mm]
  const en = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?$/)
  if (en) {
    const [, y, m, d, hh = '0', mm = '0'] = en
    const dt = new Date(
      Number(y),
      Number(m) - 1,
      Number(d),
      Number(hh),
      Number(mm),
      0,
      0
    )
    if (!Number.isNaN(dt.getTime())) return dt
  }

  return null
}

function parseDateBoundary(input, boundary = 'start') {
  const raw = String(input || '').trim()
  if (!raw) return null

  const dateOnlyRu = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (dateOnlyRu) {
    const [, d, m, y] = dateOnlyRu
    return boundary === 'end'
      ? new Date(Number(y), Number(m) - 1, Number(d), 23, 59, 59, 999)
      : new Date(Number(y), Number(m) - 1, Number(d), 0, 0, 0, 0)
  }

  const dateOnlyEn = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (dateOnlyEn) {
    const [, y, m, d] = dateOnlyEn
    return boundary === 'end'
      ? new Date(Number(y), Number(m) - 1, Number(d), 23, 59, 59, 999)
      : new Date(Number(y), Number(m) - 1, Number(d), 0, 0, 0, 0)
  }

  return parseDateTimeFlexible(raw)
}

async function getGoogleAccessToken() {
  const serviceAccountFile = process.env.GOOGLE_SERVICE_ACCOUNT_FILE
  if (!serviceAccountFile) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_FILE is not configured')
  }

  const fileContents = await fs.readFile(serviceAccountFile, 'utf8')
  const serviceAccount = JSON.parse(fileContents)
  if (!serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error('Invalid service account JSON: missing client_email/private_key')
  }

  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  }

  const encodedHeader = toBase64Url(JSON.stringify(header))
  const encodedPayload = toBase64Url(JSON.stringify(payload))
  const unsignedToken = `${encodedHeader}.${encodedPayload}`
  const signer = crypto.createSign('RSA-SHA256')
  signer.update(unsignedToken)
  signer.end()
  const signature = signer
    .sign(serviceAccount.private_key, 'base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
  const assertion = `${unsignedToken}.${signature}`

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    })
  })

  if (!tokenResponse.ok) {
    const details = await tokenResponse.text()
    throw new Error(`Failed to get Google access token: ${details}`)
  }

  const tokenData = await tokenResponse.json()
  return tokenData.access_token
}

function normalizeGoogleSheetId(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const match = raw.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
  if (match && match[1]) return match[1]
  return raw
}

async function fetchGoogleSheetRows(sheetSource) {
  const accessToken = await getGoogleAccessToken()
  const tabName = String(sheetSource.tabName || '').trim() || 'таблица'
  const range = `${tabName}!A:AZ`
  const sheetId = normalizeGoogleSheetId(sheetSource.googleSheetId)
  if (!sheetId) {
    throw new Error('Google Sheet ID is empty')
  }
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  })
  if (!response.ok) {
    const details = await response.text()
    throw new Error(`Failed to read Google Sheet: ${details}`)
  }
  const data = await response.json()
  return data.values || []
}

async function syncSheetSource(sheetSourceId) {
  const source = await prisma.sheetSource.findUnique({ where: { id: sheetSourceId } })
  if (!source) {
    throw new Error('Sheet source not found')
  }
  if (!source.syncEnabled) {
    throw new Error('Sync is disabled for this source')
  }
  const configuredTenant = await getConfiguredTenant()
  const effectiveTenantId = source.tenantId || configuredTenant.id
  if (!source.tenantId) {
    await prisma.sheetSource.update({
      where: { id: source.id },
      data: { tenantId: effectiveTenantId }
    })
  }

  const rows = await fetchGoogleSheetRows(source)
  if (rows.length === 0) {
    await prisma.sheetSource.update({
      where: { id: source.id },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: 'success',
        lastSyncError: null
      }
    })
    return { created: 0, updated: 0, unchanged: 0, errors: 0, total: 0 }
  }

  const headers = rows[0].map((h) => String(h || '').trim())
  const mapping = parseColumnMapping(source.columnMapping)
  const stats = { created: 0, updated: 0, unchanged: 0, errors: 0, total: 0 }

  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i]
    if (!cells || cells.every((cell) => String(cell || '').trim() === '')) {
      continue
    }
    stats.total++

    const sourceRow = i + 1
    const raw = {}
    headers.forEach((header, idx) => {
      if (header) raw[header] = cells[idx] !== undefined ? String(cells[idx]).trim() : ''
    })
    const rowHash = crypto.createHash('sha256').update(JSON.stringify(raw)).digest('hex')

    const latestSnapshot = await prisma.orderSourceSnapshot.findFirst({
      where: { sheetSourceId: source.id, sourceRow },
      orderBy: { createdAt: 'desc' }
    })
    if (latestSnapshot && latestSnapshot.rowHash === rowHash) {
      stats.unchanged++
      continue
    }

    try {
      const externalKey =
        pickField(raw, aliasesWithMapping(['external key', 'order id', 'номер заказа', 'id', 'номер'], mapping, 'orderNumber')) ||
        `${source.googleSheetId}:${source.tabName}:${sourceRow}`

      const fromPoint = pickField(raw, aliasesWithMapping(['from', 'откуда', 'адрес подачи', 'pickup'], mapping, 'fromPoint')) || 'UNKNOWN'
      const toPoint = pickField(raw, aliasesWithMapping(['to', 'куда', 'адрес назначения', 'dropoff'], mapping, 'toPoint')) || 'UNKNOWN'
      const vehicleType = pickField(raw, aliasesWithMapping(['vehicle type', 'тип авто', 'класс', 'class'], mapping, 'vehicleType')) || 'standard'
      const clientPrice = toFloat(pickField(raw, aliasesWithMapping(['price', 'цена', 'стоимость', 'сумма', 'client price'], mapping, 'sum')), 0)
      const passengers = toInt(pickField(raw, aliasesWithMapping(['passengers', 'пассажиры', 'pax'], mapping, 'passengers')), null)
      const luggage = toInt(pickField(raw, aliasesWithMapping(['luggage', 'багаж'], mapping, 'luggage')), null)
      const pickupRaw = pickField(raw, aliasesWithMapping([
        'pickup datetime',
        'pickup time',
        'дата и время подачи',
        'дата подачи',
        'дата',
        'время'
      ], mapping, 'date'))
      const pickupAt = parseDateTimeFlexible(pickupRaw)
      const lang = pickField(raw, aliasesWithMapping(['lang', 'язык'], mapping, 'lang')) || null
      const comment = pickField(raw, aliasesWithMapping(['comment', 'комментарий', 'примечание'], mapping, 'comment')) || null
      const incomingStatus = normalizeIncomingOrderStatus(
        pickField(raw, aliasesWithMapping(['status', 'статус'], mapping, 'status')) || 'pending',
        'pending'
      )
      const orderPayload = {
        source: 'google_sheet',
        sourceRow,
        fromPoint,
        toPoint,
        vehicleType,
        clientPrice,
        passengers,
        luggage,
        pickupAt,
        lang,
        comment
      }

      const existingOrder = await prisma.order.findUnique({
        where: { externalKey },
        select: { id: true, status: true, tenantId: true }
      })

      let upserted
      if (!existingOrder) {
        upserted = await prisma.order.create({
          data: {
            externalKey,
            ...orderPayload,
            tenantId: effectiveTenantId,
            status: incomingStatus
          }
        })
      } else {
        if (existingOrder.tenantId && existingOrder.tenantId !== effectiveTenantId) {
          throw new Error(`Tenant mismatch for order externalKey=${externalKey}`)
        }
        upserted = await prisma.order.update({
          where: { id: existingOrder.id },
          data: { ...orderPayload, tenantId: existingOrder.tenantId || effectiveTenantId }
        })
        if (normalizeOrderStatus(existingOrder.status) !== incomingStatus) {
          try {
            upserted = await applyOrderStatusTransition({
              orderId: existingOrder.id,
              tenantId: existingOrder.tenantId || effectiveTenantId,
              toStatus: incomingStatus,
              reason: `Synced from Google Sheet source "${source.name || source.id}"`,
              source: 'google_sheet_sync',
              bypassPermissions: true
            })
          } catch (statusError) {
            console.warn(`Status sync skipped for order ${existingOrder.id}: ${statusError.message}`)
          }
        }
      }

      await prisma.orderSourceSnapshot.create({
        data: {
          orderId: upserted.id,
          tenantId: upserted.tenantId || effectiveTenantId,
          sheetSourceId: source.id,
          sourceRow,
          rowHash,
          rawPayload: JSON.stringify(raw)
        }
      })

      if (!latestSnapshot) stats.created++
      else stats.updated++
    } catch (error) {
      stats.errors++
      await prisma.orderSourceSnapshot.create({
        data: {
          orderId: null,
          tenantId: effectiveTenantId,
          sheetSourceId: source.id,
          sourceRow,
          rowHash,
          rawPayload: JSON.stringify({ row: raw, error: error.message || 'unknown error' })
        }
      })
    }
  }

  await prisma.sheetSource.update({
    where: { id: source.id },
    data: {
      lastSyncAt: new Date(),
      lastSyncStatus: stats.errors > 0 ? 'partial_success' : 'success',
      lastSyncError: stats.errors > 0 ? `${stats.errors} rows failed` : null
    }
  })

  return stats
}

async function promoteStagingToCustomerCrm(tenantId) {
  const stats = {
    companies: { upserted: 0 },
    contacts: { upserted: 0 },
    companySegments: { upserted: 0 },
    contactSegments: { upserted: 0 },
    links: { upserted: 0 }
  }

  const stagingCompanies = await prisma.crmCompany.findMany({
    where: tenantId ? { tenantId } : undefined
  })
  const stagingContacts = await prisma.crmContact.findMany({
    where: tenantId ? { tenantId } : undefined
  })
  const stagingCompanySegments = await prisma.crmCompanySegment.findMany({
    where: tenantId ? { company: { tenantId } } : undefined,
    include: { company: true }
  })
  const stagingContactSegments = await prisma.crmContactSegment.findMany({
    where: tenantId ? { contact: { tenantId } } : undefined,
    include: { contact: true }
  })
  const stagingLinks = await prisma.crmCompanyContact.findMany({
    where: tenantId ? { company: { tenantId }, contact: { tenantId } } : undefined,
    include: { company: true, contact: true }
  })

  for (const row of stagingCompanies) {
    await prisma.customerCompany.upsert({
      where: {
        sourceSystem_externalId: {
          sourceSystem: row.sourceSystem,
          externalId: row.externalId
        }
      },
      update: {
        name: row.name,
        website: row.website,
        phone: row.phone,
        email: row.email,
        telegramUrl: row.telegramUrl,
        registrationCountry: row.countryPresence,
        presenceCities: row.cityPresence,
        countryPresence: row.countryPresence,
        cityPresence: row.cityPresence,
        comment: row.comment,
        ownerName: row.ownerName,
        companyType: row.companyType,
        extraInfo: row.extraInfo
      },
      create: {
        tenantId: tenantId || row.tenantId || null,
        sourceSystem: row.sourceSystem,
        externalId: row.externalId,
        name: row.name,
        website: row.website,
        phone: row.phone,
        email: row.email,
        telegramUrl: row.telegramUrl,
        registrationCountry: row.countryPresence,
        presenceCities: row.cityPresence,
        countryPresence: row.countryPresence,
        cityPresence: row.cityPresence,
        comment: row.comment,
        ownerName: row.ownerName,
        companyType: row.companyType,
        extraInfo: row.extraInfo
      }
    })
    stats.companies.upserted++
  }

  for (const row of stagingContacts) {
    await prisma.customerContact.upsert({
      where: {
        sourceSystem_externalId: {
          sourceSystem: row.sourceSystem,
          externalId: row.externalId
        }
      },
      update: {
        fullName: row.fullName,
        website: row.website,
        phone: row.phone,
        email: row.email,
        telegramUrl: row.telegramUrl,
        registrationCountry: row.countryPresence,
        presenceCities: row.cityPresence,
        countryPresence: row.countryPresence,
        cityPresence: row.cityPresence,
        comment: row.comment,
        position: row.position,
        ownerName: row.ownerName
      },
      create: {
        tenantId: tenantId || row.tenantId || null,
        sourceSystem: row.sourceSystem,
        externalId: row.externalId,
        fullName: row.fullName,
        website: row.website,
        phone: row.phone,
        email: row.email,
        telegramUrl: row.telegramUrl,
        registrationCountry: row.countryPresence,
        presenceCities: row.cityPresence,
        countryPresence: row.countryPresence,
        cityPresence: row.cityPresence,
        comment: row.comment,
        position: row.position,
        ownerName: row.ownerName
      }
    })
    stats.contacts.upserted++
  }

  const customerCompanies = await prisma.customerCompany.findMany({
    where: tenantId ? { tenantId } : undefined,
    select: { id: true, sourceSystem: true, externalId: true }
  })
  const customerContacts = await prisma.customerContact.findMany({
    where: tenantId ? { tenantId } : undefined,
    select: { id: true, sourceSystem: true, externalId: true }
  })

  const companyMap = new Map(
    customerCompanies.map((c) => [`${c.sourceSystem}:${c.externalId}`, c.id])
  )
  const contactMap = new Map(
    customerContacts.map((c) => [`${c.sourceSystem}:${c.externalId}`, c.id])
  )

  for (const row of stagingCompanySegments) {
    const companyId = companyMap.get(`${row.company.sourceSystem}:${row.company.externalId}`)
    if (!companyId) continue
    await prisma.customerCompanySegment.upsert({
      where: { companyId_segment: { companyId, segment: row.segment } },
      update: { sourceFile: row.sourceFile },
      create: { companyId, segment: row.segment, sourceFile: row.sourceFile }
    })
    stats.companySegments.upserted++
  }

  for (const row of stagingContactSegments) {
    const contactId = contactMap.get(`${row.contact.sourceSystem}:${row.contact.externalId}`)
    if (!contactId) continue
    await prisma.customerContactSegment.upsert({
      where: { contactId_segment: { contactId, segment: row.segment } },
      update: { sourceFile: row.sourceFile },
      create: { contactId, segment: row.segment, sourceFile: row.sourceFile }
    })
    stats.contactSegments.upserted++
  }

  for (const row of stagingLinks) {
    const companyId = companyMap.get(`${row.company.sourceSystem}:${row.company.externalId}`)
    const contactId = contactMap.get(`${row.contact.sourceSystem}:${row.contact.externalId}`)
    if (!companyId || !contactId) continue
    await prisma.customerCompanyContact.upsert({
      where: { companyId_contactId: { companyId, contactId } },
      update: { source: row.source, matchType: row.matchType },
      create: { companyId, contactId, source: row.source, matchType: row.matchType }
    })
    stats.links.upserted++
  }

  return stats
}

app.post('/api/requests', resolveActorContext, requireActorContext, async (req, res) => {
  try {
    const { name, email, phone, fromPoint, toPoint, date, passengers, luggage, comment, lang } = req.body
    const created = await prisma.request.create({ data: {
      tenantId: req.actorContext.tenantId,
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

app.post('/api/drivers', resolveActorContext, requireActorContext, async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      country,
      city,
      fixedRoutes,
      fixedRoutesJson,
      pricePerKm,
      kmRate,
      hourlyRate,
      childSeatPrice,
      pricingCurrency,
      comment,
      lang,
      commissionRate,
      routes
    } = req.body
    
    console.log('Received driver registration:', { name, email, phone, city })
    
    // Сохраняем в базу данных
    const created = await prisma.driver.create({ data: {
      tenantId: req.actorContext.tenantId,
      name, 
      email, 
      phone, 
      country: country || null,
      city,
      fixedRoutesJson: fixedRoutesJson || (fixedRoutes ? JSON.stringify(fixedRoutes) : null),
      pricePerKm: (pricePerKm && pricePerKm.trim() !== '') ? pricePerKm : null,
      kmRate: kmRate !== undefined && kmRate !== null && kmRate !== '' ? parseFloat(kmRate) : null,
      hourlyRate: hourlyRate !== undefined && hourlyRate !== null && hourlyRate !== '' ? parseFloat(hourlyRate) : null,
      childSeatPrice: childSeatPrice !== undefined && childSeatPrice !== null && childSeatPrice !== '' ? parseFloat(childSeatPrice) : null,
      pricingCurrency: pricingCurrency ? String(pricingCurrency) : null,
      comment: (comment && comment.trim() !== '') ? comment : null,
      lang: lang || null,
      commissionRate: commissionRate ? parseFloat(commissionRate) : 15.0
    }})

    console.log('Driver saved to database:', created.id)

    // Отправляем email с заявкой (не блокируем сохранение, если email не настроен)
    let routesData = []
    if (routes && Array.isArray(routes)) {
      routesData = routes
    } else if (fixedRoutesJson) {
      try {
        routesData = JSON.parse(fixedRoutesJson)
      } catch (e) {
        routesData = []
      }
    }

    try {
      const emailSent = await sendDriverRegistrationEmail({
        name,
        email,
        phone,
        city,
        pricePerKm,
        commissionRate: commissionRate ? parseFloat(commissionRate) : 15.0,
        routes: routesData,
        comment,
        lang: lang || 'ru'
      })
      if (emailSent) {
        console.log('Email sent successfully')
      } else {
        console.warn('Email not sent (SMTP not configured)')
      }
    } catch (emailError) {
      console.error('Error sending email (non-blocking):', emailError)
      // Не блокируем ответ, если email не отправился
    }

    res.json({ success: true, driver: created })
  } catch (e) {
    console.error('Error in /api/drivers:', e)
    console.error('Error stack:', e.stack)
    res.status(500).json({ error: 'failed', message: e.message })
  }
})

module.exports = app

// Admin endpoints
app.get('/api/admin/requests', authenticateToken, resolveActorContext, requireActorContext, requireAdmin, async (req, res) => {
  try {
    const rows = await prisma.request.findMany({
      where: { tenantId: req.actorContext.tenantId },
      orderBy: { createdAt: 'desc' }
    })
    res.json(rows)
  } catch (e) { res.status(500).json({ error: 'failed' }) }
})

app.get('/api/admin/drivers', authenticateToken, resolveActorContext, requireActorContext, requireCan('drivers.read', 'driver'), async (req, res) => {
  try {
    const rows = await prisma.driver.findMany({
      where: { tenantId: req.actorContext.tenantId },
      orderBy: { createdAt: 'desc' }
    })
    res.json(rows)
  } catch (e) { res.status(500).json({ error: 'failed' }) }
})

// API для расчета приоритета водителей
app.post('/api/drivers/priority', resolveActorContext, requireActorContext, async (req, res) => {
  try {
    const { fromPoint, toPoint, vehicleType } = req.body
    
    // Получаем всех активных и верифицированных водителей
    const drivers = await prisma.driver.findMany({
      where: {
        tenantId: req.actorContext.tenantId,
        isActive: true,
        verificationStatus: 'verified'
      },
      include: {
        routes: {
          where: {
            tenantId: req.actorContext.tenantId,
            isActive: true
          }
        }
      }
    })
    
    // Рассчитываем приоритет для каждого водителя
    const prioritizedDrivers = drivers.map(driver => {
      const score = calculateDriverScore(driver, fromPoint, toPoint)
      return {
        ...driver,
        priorityScore: score
      }
    }).sort((a, b) => b.priorityScore - a.priorityScore)
    
    res.json(prioritizedDrivers)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'failed' })
  }
})

// Функция расчета приоритета водителя
function calculateDriverScore(driver, fromPoint, toPoint) {
  // Базовые параметры
  const commissionRate = Number(driver.commissionRate || 30)
  const normalizedCommission = Math.max(0, Math.min(30, commissionRate))
  const commissionScore = ((30 - normalizedCommission) / 30) * 100 // Чем ниже комиссия, тем выше балл
  const ratingScore = (driver.rating / 5) * 100 // 1-5 -> 0-100 баллов
  
  // Проверяем, есть ли подходящий маршрут
  const matchingRoute = findMatchingRoute(driver.routes, fromPoint, toPoint)
  
  let priceScore = 50 // Базовый балл, если маршрут не найден
  if (matchingRoute) {
    // Если цена водителя меньше или равна нашей целевой цене - высокий балл
    priceScore = matchingRoute.driverPrice <= matchingRoute.ourPrice ? 100 : 50
  }
  
  // Итоговый балл: 50% комиссия, 30% цена, 20% рейтинг
  const finalScore = (0.5 * commissionScore) + (0.3 * priceScore) + (0.2 * ratingScore)
  
  return Math.round(finalScore * 100) / 100 // Округляем до 2 знаков
}

// API для управления маршрутами водителей
app.post('/api/drivers/:driverId/routes', resolveActorContext, requireActorContext, async (req, res) => {
  try {
    const { driverId } = req.params
    const { fromPoint, toPoint, driverPrice, ourPrice, currency = 'EUR' } = req.body
    const driver = await prisma.driver.findFirst({
      where: { id: driverId, tenantId: req.actorContext.tenantId },
      select: { id: true }
    })
    if (!driver) return res.status(404).json({ error: 'Driver not found' })
    
    const route = await prisma.driverRoute.create({
      data: {
        tenantId: req.actorContext.tenantId,
        driverId: driver.id,
        fromPoint,
        toPoint,
        driverPrice: parseFloat(driverPrice),
        ourPrice: parseFloat(ourPrice),
        currency
      }
    })
    
    res.json(route)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'failed' })
  }
})

app.get('/api/drivers/:driverId/routes', resolveActorContext, requireActorContext, async (req, res) => {
  try {
    const { driverId } = req.params
    const driver = await prisma.driver.findFirst({
      where: { id: driverId, tenantId: req.actorContext.tenantId },
      select: { id: true }
    })
    if (!driver) return res.status(404).json({ error: 'Driver not found' })
    
    const routes = await prisma.driverRoute.findMany({
      where: { driverId: driver.id, tenantId: req.actorContext.tenantId },
      orderBy: { createdAt: 'desc' }
    })
    
    res.json(routes)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'failed' })
  }
})

// API для обновления данных водителя (для самого водителя)
app.put('/api/drivers/me', authenticateToken, resolveActorContext, requireActorContext, async (req, res) => {
  try {
    // Находим водителя по userId
    const driver = await prisma.driver.findFirst({
      where: { userId: req.user.id, tenantId: req.actorContext.tenantId }
    })

    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' })
    }

    const { commissionRate, kmRate, hourlyRate, childSeatPrice, pricingCurrency } = req.body

    const updated = await prisma.driver.update({
      where: { id: driver.id },
      data: {
        commissionRate: commissionRate ? parseFloat(commissionRate) : undefined,
        kmRate: kmRate !== undefined ? (kmRate === null || kmRate === '' ? null : parseFloat(kmRate)) : undefined,
        hourlyRate: hourlyRate !== undefined ? (hourlyRate === null || hourlyRate === '' ? null : parseFloat(hourlyRate)) : undefined,
        childSeatPrice: childSeatPrice !== undefined ? (childSeatPrice === null || childSeatPrice === '' ? null : parseFloat(childSeatPrice)) : undefined,
        pricingCurrency: pricingCurrency !== undefined ? (pricingCurrency ? String(pricingCurrency) : null) : undefined
      }
    })

    res.json(updated)
  } catch (error) {
    console.error('Error updating driver:', error)
    res.status(500).json({ error: 'Failed to update driver' })
  }
})

// API для удаления маршрута водителя
app.delete('/api/drivers/routes/:routeId', authenticateToken, resolveActorContext, requireActorContext, async (req, res) => {
  try {
    const { routeId } = req.params

    // Находим водителя по userId
    const driver = await prisma.driver.findFirst({
      where: { userId: req.user.id, tenantId: req.actorContext.tenantId }
    })

    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' })
    }

    // Проверяем, что маршрут принадлежит этому водителю
    const route = await prisma.driverRoute.findFirst({
      where: {
        id: routeId,
        tenantId: req.actorContext.tenantId,
        driverId: driver.id
      }
    })

    if (!route) {
      return res.status(404).json({ error: 'Route not found' })
    }

    // Удаляем маршрут (или помечаем как неактивный)
    await prisma.driverRoute.update({
      where: { id: routeId },
      data: { isActive: false }
    })

    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting route:', error)
    res.status(500).json({ error: 'Failed to delete route' })
  }
})

// API для обновления статуса водителя (для админов)
app.put('/api/admin/drivers/:driverId/status', authenticateToken, resolveActorContext, requireActorContext, requireCan('drivers.manage', 'driver'), async (req, res) => {
  try {
    const { driverId } = req.params
    const { isActive, verificationStatus } = req.body
    
    const existing = await prisma.driver.findFirst({
      where: { id: driverId, tenantId: req.actorContext.tenantId },
      select: { id: true }
    })
    if (!existing) return res.status(404).json({ error: 'Driver not found' })

    const updated = await prisma.driver.update({
      where: { id: existing.id },
      data: {
        isActive: isActive !== undefined ? isActive : undefined,
        verificationStatus: verificationStatus || undefined
      }
    })
    
    res.json(updated)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'failed' })
  }
})

app.put('/api/admin/drivers/:driverId', authenticateToken, resolveActorContext, requireActorContext, requireCan('drivers.manage', 'driver'), async (req, res) => {
  try {
    const { driverId } = req.params
    const data = {}
    const nullableTextFields = ['country', 'city', 'comment', 'telegramUserId']
    for (const field of nullableTextFields) {
      if (req.body[field] !== undefined) {
        data[field] = req.body[field] ? String(req.body[field]).trim() : null
      }
    }
    if (req.body.commissionRate !== undefined) {
      data.commissionRate = req.body.commissionRate === null || req.body.commissionRate === ''
        ? null
        : parseFloat(req.body.commissionRate)
    }
    if (req.body.isActive !== undefined) data.isActive = !!req.body.isActive
    if (req.body.verificationStatus !== undefined) data.verificationStatus = String(req.body.verificationStatus)

    const existing = await prisma.driver.findFirst({
      where: { id: driverId, tenantId: req.actorContext.tenantId },
      select: { id: true }
    })
    if (!existing) return res.status(404).json({ error: 'Driver not found' })

    const updated = await prisma.driver.update({
      where: { id: existing.id },
      data
    })
    res.json(updated)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'failed' })
  }
})

// Webhook для получения заказов от EasyTaxi
app.post('/api/webhooks/easytaxi/order', resolveActorContext, requireActorContext, async (req, res) => {
  try {
    const { 
      orderId, 
      fromPoint, 
      toPoint, 
      clientPrice, 
      vehicleType, 
      passengers, 
      luggage, 
      comment,
      lang 
    } = req.body
    
    const tenantId = req.actorContext.tenantId
    req.body.idempotency_key = req.body.idempotency_key || `easytaxi:${orderId}`
    const payload = { orderId, fromPoint, toPoint, clientPrice, vehicleType, passengers, luggage, comment, lang }
    const wrapped = await withIdempotency(req, 'webhook.easytaxi.order', payload, async () => {
      console.log('Received order from EasyTaxi:', { orderId, fromPoint, toPoint, clientPrice })

      // Создаем заказ в нашей базе (или обновляем при повторе)
      const order = await prisma.order.upsert({
        where: { id: orderId },
        create: {
          id: orderId,
          tenantId,
          fromPoint,
          toPoint,
          clientPrice: parseFloat(clientPrice),
          vehicleType,
          passengers: passengers ? parseInt(passengers) : null,
          luggage: luggage ? parseInt(luggage) : null,
          comment: comment || null,
          lang: lang || null,
          status: 'pending'
        },
        update: {
          tenantId,
          fromPoint,
          toPoint,
          clientPrice: parseFloat(clientPrice),
          vehicleType,
          passengers: passengers ? parseInt(passengers) : null,
          luggage: luggage ? parseInt(luggage) : null,
          comment: comment || null,
          lang: lang || null
        }
      })

      // Находим подходящих водителей
      const drivers = await prisma.driver.findMany({
        where: {
          tenantId,
          isActive: true,
          verificationStatus: 'verified'
        },
      include: {
        routes: {
          where: {
            tenantId,
            isActive: true
          }
        }
      }
      })

      const prioritizedDrivers = drivers.map(driver => {
        const score = calculateDriverScore(driver, fromPoint, toPoint)
        return { ...driver, priorityScore: score }
      }).sort((a, b) => b.priorityScore - a.priorityScore)

      if (prioritizedDrivers.length > 0) {
        const topDriver = prioritizedDrivers[0]
        const matchedRoute = findMatchingRoute(topDriver.routes, fromPoint, toPoint)
        const clientPriceNumber = parseFloat(clientPrice)
        await prisma.order.update({
          where: { id: orderId },
          data: {
            driverId: topDriver.id,
            driverPrice: matchedRoute?.driverPrice || clientPriceNumber * 0.8,
            commission: ((topDriver.commissionRate || 0) / 100) * clientPriceNumber
          }
        })
        await applyOrderStatusTransition({
          orderId,
          tenantId,
          toStatus: 'assigned',
          reason: 'Auto-assigned by EasyTaxi webhook',
          source: 'easytaxi_webhook',
          bypassPermissions: true
        })
      }

      await writeAuditLog({
        tenantId,
        actorId: null,
        actorRole: 'system',
        action: 'webhook.easytaxi.order',
        resource: 'order',
        resourceId: orderId,
        traceId: req.actorContext.traceId,
        decision: 'auto',
        result: 'ok',
        context: { assigned: prioritizedDrivers.length > 0 }
      })

      return { success: true, orderId, assigned: prioritizedDrivers.length > 0 }
    })

    res.json({ ...wrapped.data, idempotent: wrapped.replayed })
  } catch (e) {
    console.error('Error processing EasyTaxi webhook:', e)
    const status = e.statusCode || 500
    res.status(status).json({ error: e.message || 'failed', ...(e.details || {}) })
  }
})

// API для получения статистики заказов
app.get('/api/admin/orders', authenticateToken, resolveActorContext, requireActorContext, requireCan('orders.read', 'order'), async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { tenantId: req.actorContext.tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        driver: {
          select: {
            name: true,
            email: true,
            phone: true
          }
        }
      }
    })
    
    res.json(orders)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'failed' })
  }
})

app.put(
  '/api/admin/orders/:orderId/status',
  authenticateToken,
  resolveActorContext,
  requireActorContext,
  requireCan('orders.transition.request', 'order'),
  async (req, res) => {
    try {
      const { orderId } = req.params
      const { toStatus, reason } = req.body || {}
      const targetStatus = normalizeOrderStatus(toStatus)
      if (!targetStatus) return res.status(400).json({ error: 'toStatus is required' })
      const tenantId = req.actorContext.tenantId
      const riskyStatuses = ['cancelled', 'paid', 'closed', 'finance_hold', 'incident_reported']
      await ensureHumanApproval(req, {
        action: 'order.status.transition',
        resource: 'order',
        resourceId: orderId,
        payload: { toStatus: targetStatus, reason: reason || null },
        required: riskyStatuses.includes(targetStatus)
      })

      const wrapped = await withIdempotency(req, 'admin.order.status.transition', { orderId, targetStatus, reason }, async () => {
        const updated = await applyOrderStatusTransition({
          orderId,
          tenantId,
          toStatus: targetStatus,
          reason,
          actorPermissions: req.userPermissions || [],
          actorRole: req.actorContext.actorRole || null,
          actorUserId: req.user?.id || null,
          actorEmail: req.user?.email || null,
          source: 'admin_api'
        })
        await writeAuditLog({
          tenantId,
          actorId: req.actorContext.actorId,
          actorRole: req.actorContext.actorRole,
          action: 'order.status.transition',
          resource: 'order',
          resourceId: orderId,
          traceId: req.actorContext.traceId,
          decision: 'policy_allowed',
          result: 'ok',
          context: { from: updated.status, to: targetStatus, reason: reason || null }
        })
        return { success: true, order: updated }
      })

      res.json({ ...wrapped.data, idempotent: wrapped.replayed })
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          error: error.message,
          ...(error.details || {})
        })
      }
      console.error('Error changing order status:', error)
      res.status(500).json({ error: 'Failed to change order status' })
    }
  }
)

app.get(
  '/api/admin/orders/:orderId/available-status-transitions',
  authenticateToken,
  resolveActorContext,
  requireActorContext,
  requireCan('orders.read', 'order'),
  async (req, res) => {
    try {
      const { orderId } = req.params
      const order = await prisma.order.findFirst({
        where: { id: orderId, tenantId: req.actorContext.tenantId },
        select: {
          id: true,
          status: true,
          driver: { select: { userId: true } }
        }
      })
      if (!order) return res.status(404).json({ error: 'Order not found' })

      const currentStatus = normalizeOrderStatus(order.status)
      const actor = buildActorFromReq(req)
      const candidates = ORDER_STATUS_TRANSITIONS[currentStatus] || []
      const allowedTo = candidates.filter((target) =>
        can(actor, 'orders.transition', 'order', {
          tenantId: req.actorContext.tenantId,
          fromStatus: currentStatus,
          toStatus: target,
          ownerUserId: order.driver?.userId || null
        })
      )

      res.json({ orderId, currentStatus, allowedTo })
    } catch (error) {
      console.error('Error loading available status transitions:', error)
      res.status(500).json({ error: 'Failed to load available status transitions' })
    }
  }
)

app.get(
  '/api/admin/orders/:orderId/status-history',
  authenticateToken,
  resolveActorContext,
  requireActorContext,
  requireCan('orders.read', 'order'),
  async (req, res) => {
    try {
      const { orderId } = req.params
      const order = await prisma.order.findFirst({
        where: { id: orderId, tenantId: req.actorContext.tenantId },
        select: { id: true }
      })
      if (!order) return res.status(404).json({ error: 'Order not found' })

      const history = await prisma.orderStatusHistory.findMany({
        where: { orderId, tenantId: req.actorContext.tenantId },
        orderBy: { createdAt: 'desc' },
        take: 500
      })
      res.json({ orderId, history })
    } catch (error) {
      console.error('Error loading order status history:', error)
      res.status(500).json({ error: 'Failed to load order status history' })
    }
  }
)

app.get(
  '/api/admin/approvals',
  authenticateToken,
  resolveActorContext,
  requireActorContext,
  requireCan('approvals.resolve', 'approval'),
  async (req, res) => {
    try {
      const { status = 'pending_human', limit = '200' } = req.query
      const take = Math.min(parseInt(limit, 10) || 200, 500)
      const where = {
        tenantId: req.actorContext.tenantId,
        ...(status ? { status: String(status) } : {})
      }
      const rows = await prisma.humanApproval.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take
      })
      res.json({ rows })
    } catch (error) {
      console.error('Error loading approvals:', error)
      res.status(500).json({ error: 'Failed to load approvals' })
    }
  }
)

app.post(
  '/api/admin/approvals/:id/resolve',
  authenticateToken,
  resolveActorContext,
  requireActorContext,
  requireCan('approvals.resolve', 'approval'),
  async (req, res) => {
    try {
      const { id } = req.params
      const { decision, reason } = req.body || {}
      const normalized = String(decision || '').toLowerCase()
      if (!['approved', 'rejected', 'expired'].includes(normalized)) {
        return res.status(400).json({ error: 'decision must be approved|rejected|expired' })
      }
      const approval = await prisma.humanApproval.findFirst({
        where: { id, tenantId: req.actorContext.tenantId }
      })
      if (!approval) return res.status(404).json({ error: 'Approval not found' })
      if (approval.status !== 'pending_human') {
        return res.status(409).json({ error: 'Approval already resolved', status: approval.status })
      }

      const resolved = await prisma.humanApproval.update({
        where: { id: approval.id },
        data: {
          status: normalized,
          reviewerId: req.actorContext.actorId || null,
          reviewedAt: new Date(),
          payloadJson: approval.payloadJson
        }
      })

      let transitionResult = null
      if (normalized === 'approved' && approval.action === 'order.status.transition') {
        const payload = JSON.parse(approval.payloadJson || '{}')
        if (payload?.toStatus) {
          transitionResult = await applyOrderStatusTransition({
            orderId: approval.resourceId,
            tenantId: req.actorContext.tenantId,
            toStatus: payload.toStatus,
            reason: [payload.reason || null, reason || null, `[approval:${approval.id}]`].filter(Boolean).join(' | '),
            actorPermissions: ['approvals.resolve'],
            actorRole: req.actorContext.actorRole || null,
            actorUserId: req.actorContext.actorId || null,
            actorEmail: req.user?.email || null,
            source: 'approval_resolver',
            bypassPermissions: false
          })
        }
      }

      await writeAuditLog({
        tenantId: req.actorContext.tenantId,
        actorId: req.actorContext.actorId,
        actorRole: req.actorContext.actorRole,
        action: 'approval.resolve',
        resource: 'human_approval',
        resourceId: approval.id,
        traceId: req.actorContext.traceId,
        decision: normalized,
        result: 'ok',
        context: {
          approvalAction: approval.action,
          transitionOrderId: approval.resourceId,
          transitionApplied: !!transitionResult
        }
      })

      res.json({ success: true, approval: resolved, transitionResult })
    } catch (error) {
      console.error('Error resolving approval:', error)
      res.status(500).json({ error: 'Failed to resolve approval' })
    }
  }
)

app.get('/api/admin/orders-sheet-view', authenticateToken, resolveActorContext, requireActorContext, requireCan('orders.read', 'order'), async (req, res) => {
  try {
    const { sourceId = '' } = req.query
    const source = sourceId
      ? await prisma.sheetSource.findFirst({ where: { id: String(sourceId), tenantId: req.actorContext.tenantId } })
      : await prisma.sheetSource.findFirst({
          where: { isActive: true, tenantId: req.actorContext.tenantId },
          orderBy: [{ updatedAt: 'desc' }]
        })

    if (!source) {
      return res.json({ source: null, headers: [], rows: [], rawRows: [] })
    }
    const mapping = parseColumnMapping(source.columnMapping)

    const snapshots = await prisma.orderSourceSnapshot.findMany({
      where: { sheetSourceId: source.id },
      include: {
        order: {
          select: {
            id: true,
            status: true,
            driverPrice: true,
            clientPrice: true,
            updatedAt: true,
            createdAt: true
          }
        }
      },
      orderBy: [{ sourceRow: 'asc' }, { createdAt: 'desc' }],
      take: 10000
    })

    const seenRows = new Set()
    const rows = []

    for (const snapshot of snapshots) {
      if (seenRows.has(snapshot.sourceRow)) continue
      seenRows.add(snapshot.sourceRow)

      let payload = {}
      try {
        payload = JSON.parse(snapshot.rawPayload || '{}')
      } catch (_) {
        payload = {}
      }
      const raw = payload && payload.row && typeof payload.row === 'object' ? payload.row : payload
      if (!raw || typeof raw !== 'object') continue

      const contractor = pickField(raw, aliasesWithMapping(['контрагент', 'contractor'], mapping, 'contractor')) || ''
      const orderNumber = pickField(raw, aliasesWithMapping(['номер заказа', 'order id', 'номер'], mapping, 'orderNumber')) || ''
      const date = pickField(raw, aliasesWithMapping(['дата', 'date', 'pickup datetime', 'pickup time', 'дата подачи'], mapping, 'date')) || ''
      const fromPoint = pickField(raw, aliasesWithMapping(['откуда', 'from', 'адрес подачи', 'pickup'], mapping, 'fromPoint')) || ''
      const toPoint = pickField(raw, aliasesWithMapping(['куда', 'to', 'адрес назначения', 'dropoff'], mapping, 'toPoint')) || ''
      const sum = pickField(raw, aliasesWithMapping(['сумма', 'цена', 'стоимость', 'price', 'client price'], mapping, 'sum')) || ''
      const driver = pickField(raw, aliasesWithMapping(['водитель', 'driver'], mapping, 'driver')) || ''
      const comment = pickField(raw, aliasesWithMapping(['комментарий', 'comment', 'примечание'], mapping, 'comment')) || ''
      const internalOrderNumber = pickField(raw, aliasesWithMapping(['внутренний номер заказа', 'internal order number'], mapping, 'internalOrderNumber')) || ''

      rows.push({
        id: snapshot.order?.id || '',
        source: source.name || source.monthLabel || 'google_sheet',
        sourceRow: snapshot.sourceRow,
        contractor,
        orderNumber,
        date,
        fromPoint,
        toPoint,
        sum,
        driver,
        comment,
        internalOrderNumber,
        status: snapshot.order?.status || '',
        orderClientPrice: snapshot.order?.clientPrice ?? null,
        orderDriverPrice: snapshot.order?.driverPrice ?? null,
        orderCreatedAt: snapshot.order?.createdAt || null,
        orderUpdatedAt: snapshot.order?.updatedAt || null
      })

    }

    let headers = []
    let rawRows = []
    try {
      const detailsTabName = String(source.detailsTabName || '').trim() || 'подробности'
      const detailRows = await fetchGoogleSheetRows({
        googleSheetId: source.googleSheetId,
        tabName: detailsTabName
      })
      let detailHeaders = (detailRows[0] || []).map((h) => String(h || '').trim())
      const hasNamedHeaders = detailHeaders.some((h) => h.length > 0)
      if (!hasNamedHeaders) {
        const maxCols = detailRows.reduce((max, row) => Math.max(max, Array.isArray(row) ? row.length : 0), 0)
        detailHeaders = Array.from({ length: maxCols }, (_, idx) => `Колонка ${idx + 1}`)
      } else {
        detailHeaders = detailHeaders.map((h, idx) => h || `Колонка ${idx + 1}`)
      }
      headers = detailHeaders
      rawRows = detailRows.slice(1).map((cells, idx) => {
        const values = {}
        detailHeaders.forEach((header, colIdx) => {
          values[header] = cells[colIdx] !== undefined ? String(cells[colIdx]).trim() : ''
        })
        return {
          id: '',
          source: `${source.name || source.monthLabel || 'google_sheet'}:${detailsTabName}`,
          sourceRow: idx + 2,
          values
        }
      })
    } catch (detailsError) {
      console.error('Error fetching details tab for sheet view:', detailsError)
      const headerSet = new Set()
      headers = []
      rawRows = []
      for (const snapshot of snapshots) {
        if (!snapshot?.rawPayload) continue
        let payload = {}
        try {
          payload = JSON.parse(snapshot.rawPayload || '{}')
        } catch (_) {
          payload = {}
        }
        const raw = payload && payload.row && typeof payload.row === 'object' ? payload.row : payload
        if (!raw || typeof raw !== 'object') continue
        for (const key of Object.keys(raw)) {
          if (!headerSet.has(key)) {
            headerSet.add(key)
            headers.push(key)
          }
        }
        rawRows.push({
          id: snapshot.order?.id || '',
          source: source.name || source.monthLabel || 'google_sheet',
          sourceRow: snapshot.sourceRow,
          values: raw
        })
      }
    }

    res.json({
      source: {
        id: source.id,
        name: source.name,
        monthLabel: source.monthLabel,
        tabName: source.tabName,
        detailsTabName: source.detailsTabName || 'подробности'
      },
      headers,
      rows,
      rawRows
    })
  } catch (error) {
    console.error('Error fetching sheet view orders:', error)
    res.status(500).json({ error: 'Failed to fetch sheet view orders' })
  }
})

// API для управления отзывами
app.post('/api/reviews', resolveActorContext, requireActorContext, async (req, res) => {
  try {
    const { orderId, driverId, rating, comment, clientName } = req.body
    
    // Проверяем, что заказ существует и принадлежит водителю
    const order = await prisma.order.findFirst({
      where: { 
        id: orderId, 
        driverId: driverId,
        status: 'completed' // Только для завершенных заказов
      }
    })
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found or not completed' })
    }

    const tenantId = req.actorContext.tenantId
    if (order.tenantId && order.tenantId !== tenantId) {
      return res.status(403).json({ error: 'Tenant mismatch for order' })
    }
    const driver = await prisma.driver.findFirst({
      where: { id: driverId, tenantId },
      select: { id: true }
    })
    if (!driver) {
      return res.status(404).json({ error: 'Driver not found in tenant scope' })
    }
    
    // Проверяем, что отзыв еще не оставлен
    const existingReview = await prisma.review.findUnique({
      where: { orderId }
    })
    
    if (existingReview) {
      return res.status(400).json({ error: 'Review already exists for this order' })
    }
    
    // Создаем отзыв
    const review = await prisma.review.create({
      data: {
        tenantId,
        orderId,
        driverId: driver.id,
        rating: parseInt(rating),
        comment: comment || null,
        clientName: clientName || null
      }
    })
    
    // Пересчитываем рейтинг водителя
    await updateDriverRating(driver.id, tenantId)
    
    res.json(review)
  } catch (e) {
    console.error('Error creating review:', e)
    res.status(500).json({ error: 'failed' })
  }
})

app.get('/api/drivers/:driverId/reviews', resolveActorContext, requireActorContext, async (req, res) => {
  try {
    const { driverId } = req.params
    const driver = await prisma.driver.findFirst({
      where: { id: driverId, tenantId: req.actorContext.tenantId },
      select: { id: true }
    })
    if (!driver) return res.status(404).json({ error: 'Driver not found' })
    
    const reviews = await prisma.review.findMany({
      where: { driverId: driver.id, tenantId: req.actorContext.tenantId },
      include: {
        order: {
          select: {
            fromPoint: true,
            toPoint: true,
            clientPrice: true,
            createdAt: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    res.json(reviews)
  } catch (e) {
    console.error('Error fetching reviews:', e)
    res.status(500).json({ error: 'failed' })
  }
})

// Функция обновления рейтинга водителя
async function updateDriverRating(driverId, tenantId = null) {
  try {
    const reviews = await prisma.review.findMany({
      where: { driverId, ...(tenantId ? { tenantId } : {}) }
    })
    
    if (reviews.length === 0) return
    
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    
    const driver = await prisma.driver.findFirst({
      where: { id: driverId, ...(tenantId ? { tenantId } : {}) },
      select: { id: true }
    })
    if (!driver) return

    await prisma.driver.update({
      where: { id: driver.id },
      data: { 
        avgRating: Math.round(avgRating * 10) / 10, // Округляем до 1 знака
        totalReviews: reviews.length,
        rating: Math.round(avgRating * 10) / 10 // Обновляем основной рейтинг
      }
    })
    
    console.log(`Updated rating for driver ${driverId}: ${avgRating.toFixed(1)} (${reviews.length} reviews)`)
  } catch (e) {
    console.error('Error updating driver rating:', e)
  }
}

// Админские API для управления отзывами
app.post('/api/admin/reviews', authenticateToken, resolveActorContext, requireActorContext, requireAdmin, async (req, res) => {
  try {
    const { driverId, rating, comment, clientName } = req.body
    const driver = await prisma.driver.findFirst({
      where: { id: driverId, tenantId: req.actorContext.tenantId },
      select: { id: true }
    })
    if (!driver) return res.status(404).json({ error: 'Driver not found' })
    
    // Создаем отзыв от имени админа
    const review = await prisma.review.create({
      data: {
        tenantId: req.actorContext.tenantId,
        orderId: null, // У админских отзывов нет привязки к конкретному заказу
        driverId: driver.id,
        rating: parseInt(rating),
        comment: comment || null,
        clientName: clientName || 'Администратор'
      }
    })
    
    // Пересчитываем рейтинг водителя
    await updateDriverRating(driver.id, req.actorContext.tenantId)
    
    res.json(review)
  } catch (e) {
    console.error('Error creating admin review:', e)
    res.status(500).json({ error: 'failed' })
  }
})

app.get('/api/admin/reviews', authenticateToken, resolveActorContext, requireActorContext, requireAdmin, async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { tenantId: req.actorContext.tenantId },
      include: {
        driver: {
          select: {
            name: true,
            email: true
          }
        },
        order: {
          select: {
            fromPoint: true,
            toPoint: true,
            clientPrice: true,
            createdAt: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    res.json(reviews)
  } catch (e) {
    console.error('Error fetching admin reviews:', e)
    res.status(500).json({ error: 'failed' })
  }
})

app.delete('/api/admin/reviews/:reviewId', authenticateToken, resolveActorContext, requireActorContext, requireAdmin, async (req, res) => {
  try {
    const { reviewId } = req.params
    
    const review = await prisma.review.findFirst({
      where: { id: reviewId, tenantId: req.actorContext.tenantId }
    })
    
    if (!review) {
      return res.status(404).json({ error: 'Review not found' })
    }
    
    await prisma.review.delete({
      where: { id: review.id }
    })
    
    // Пересчитываем рейтинг водителя после удаления отзыва
    await updateDriverRating(review.driverId, req.actorContext.tenantId)
    
    res.json({ success: true })
  } catch (e) {
    console.error('Error deleting review:', e)
    res.status(500).json({ error: 'failed' })
  }
})

// API для получения детальной информации о водителе
app.get('/api/admin/drivers/:driverId', authenticateToken, resolveActorContext, requireActorContext, requireAdmin, async (req, res) => {
  try {
    const { driverId } = req.params
    
    const driver = await prisma.driver.findFirst({
      where: { id: driverId, tenantId: req.actorContext.tenantId },
      include: {
        routes: {
          orderBy: { createdAt: 'desc' }
        },
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 10 // Последние 10 заказов
        },
        reviews: {
          orderBy: { createdAt: 'desc' },
          take: 10 // Последние 10 отзывов
        }
      }
    })
    
    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' })
    }
    
    res.json(driver)
  } catch (e) {
    console.error('Error fetching driver details:', e)
    res.status(500).json({ error: 'failed' })
  }
})

// ==================== АВТОРИЗАЦИЯ ====================

// Регистрация пользователя
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, role = 'driver', name, phone, country, city, commissionRate } = req.body

    // Проверяем, существует ли пользователь
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' })
    }

    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(password, 10)

    // Создаем пользователя
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role
      }
    })

    // Если это водитель, создаем запись водителя
    if (role === 'driver') {
      const { tenant } = await ensureDefaultTenantMembership(user.id, 'executor')
      await prisma.driver.create({
        data: {
          tenantId: tenant.id,
          name,
          email,
          phone,
          country: country || null,
          city,
          commissionRate: commissionRate || 15.0,
          userId: user.id
        }
      })
    } else {
      await ensureDefaultTenantMembership(user.id, role === 'admin' ? 'staff_supervisor' : 'staff')
    }

    // Создаем JWT токен
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    const acl = await getUserRolesAndPermissions(user.id)
    const { tenant, membership } = await ensureDefaultTenantMembership(
      user.id,
      role === 'driver' ? 'executor' : (role === 'admin' ? 'staff_supervisor' : 'staff')
    )

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenant: { id: tenant.id, code: tenant.code, role: membership.role },
        roles: acl.roles,
        permissions: acl.permissions
      }
    })
  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({ error: 'Registration failed' })
  }
})

// Вход в систему
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body

    // Находим пользователя
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        driver: true
      }
    })

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Проверяем пароль
    const validPassword = await bcrypt.compare(password, user.password)
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Проверяем, активен ли пользователь
    if (!user.isActive) {
      return res.status(401).json({ error: 'Account is deactivated' })
    }

    // Создаем JWT токен
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    const acl = await getUserRolesAndPermissions(user.id)
    const { tenant, membership } = await ensureDefaultTenantMembership(
      user.id,
      user.role === 'driver' ? 'executor' : (user.role === 'admin' ? 'staff_supervisor' : 'staff')
    )

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenant: { id: tenant.id, code: tenant.code, role: membership.role },
        roles: acl.roles,
        permissions: acl.permissions,
        driver: user.driver
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Login failed' })
  }
})

// Получение информации о текущем пользователе
app.get('/api/auth/me', authenticateToken, resolveActorContext, requireActorContext, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        driver: true
      }
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenant: {
          id: req.actorContext.tenantId,
          code: req.actorContext.tenantCode,
          role: req.actorContext.actorRole
        },
        roles: req.userRoles || [],
        permissions: req.userPermissions || [],
        driver: user.driver
      }
    })
  } catch (error) {
    console.error('Get user error:', error)
    res.status(500).json({ error: 'Failed to get user info' })
  }
})

// API для получения заказов текущего водителя
app.get('/api/drivers/me/orders', authenticateToken, resolveActorContext, requireActorContext, async (req, res) => {
  try {
    // Находим водителя по userId
    const driver = await prisma.driver.findFirst({
      where: { userId: req.user.id, tenantId: req.actorContext.tenantId }
    })

    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' })
    }

    // Получаем выполненные заказы водителя
    const orders = await prisma.order.findMany({
      where: { 
        tenantId: req.actorContext.tenantId,
        driverId: driver.id,
        status: 'completed' // Только выполненные заказы
      },
      orderBy: { createdAt: 'desc' },
      take: 20 // Последние 20 заказов
    })

    res.json(orders)
  } catch (error) {
    console.error('Error fetching driver orders:', error)
    res.status(500).json({ error: 'Failed to fetch orders' })
  }
})

// API для получения данных текущего водителя (полная информация)
app.get('/api/drivers/me', authenticateToken, resolveActorContext, requireActorContext, async (req, res) => {
  try {
    // Находим водителя по userId
    const driver = await prisma.driver.findFirst({
      where: { userId: req.user.id, tenantId: req.actorContext.tenantId },
      include: {
        routes: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' })
    }

    res.json(driver)
  } catch (error) {
    console.error('Error fetching driver data:', error)
    res.status(500).json({ error: 'Failed to fetch driver data' })
  }
})

// ==================== API ДЛЯ ПРЕДУСТАНОВЛЕННЫХ МАРШРУТОВ ====================

// Получение всех маршрутов для водителя (с его ценами)
app.get('/api/drivers/me/city-routes', authenticateToken, resolveActorContext, requireActorContext, async (req, res) => {
  try {
    // Находим водителя по userId
    const driver = await prisma.driver.findFirst({
      where: { userId: req.user.id, tenantId: req.actorContext.tenantId }
    })

    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' })
    }

    // Получаем все активные маршруты
    const cityRoutes = await prisma.cityRoute.findMany({
      where: { isActive: true, tenantId: req.actorContext.tenantId },
      orderBy: [
        { country: 'asc' },
        { city: 'asc' },
        { fromPoint: 'asc' }
      ],
      include: {
        driverPrices: {
          where: { driverId: driver.id, tenantId: req.actorContext.tenantId },
          take: 1
        }
      }
    })

    // Формируем ответ с ценами водителя
    const routes = cityRoutes.map(route => ({
      id: route.id,
      country: route.country,
      city: route.city,
      fromPoint: route.fromPoint,
      toPoint: route.toPoint,
      vehicleType: route.vehicleType,
      passengers: route.passengers,
      distance: route.distance,
      targetFare: route.targetFare,
      currency: route.currency,
      bestPrice: route.driverPrices[0]?.bestPrice || null
    }))

    res.json(routes)
  } catch (error) {
    console.error('Error fetching city routes:', error)
    res.status(500).json({ error: 'Failed to fetch city routes' })
  }
})

// Обновление цены водителя для маршрута
app.put('/api/drivers/me/city-routes/:routeId', authenticateToken, resolveActorContext, requireActorContext, async (req, res) => {
  try {
    const { routeId } = req.params
    const { bestPrice } = req.body

    // Находим водителя по userId
    const driver = await prisma.driver.findFirst({
      where: { userId: req.user.id, tenantId: req.actorContext.tenantId }
    })

    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' })
    }

    // Проверяем, существует ли маршрут
    const cityRoute = await prisma.cityRoute.findFirst({
      where: { id: routeId, tenantId: req.actorContext.tenantId }
    })

    if (!cityRoute) {
      return res.status(404).json({ error: 'City route not found' })
    }

    // Создаем или обновляем цену водителя
    const driverCityRoute = await prisma.driverCityRoute.upsert({
      where: {
        driverId_cityRouteId: {
          driverId: driver.id,
          cityRouteId: routeId
        }
      },
      update: {
        tenantId: req.actorContext.tenantId,
        bestPrice: bestPrice ? parseFloat(bestPrice) : null
      },
      create: {
        tenantId: req.actorContext.tenantId,
        driverId: driver.id,
        cityRouteId: routeId,
        bestPrice: bestPrice ? parseFloat(bestPrice) : null
      }
    })

    res.json(driverCityRoute)
  } catch (error) {
    console.error('Error updating driver city route:', error)
    res.status(500).json({ error: 'Failed to update city route' })
  }
})

// ==================== АДМИНСКИЕ API ДЛЯ УПРАВЛЕНИЯ МАРШРУТАМИ ====================

// Получение всех маршрутов (для админа)
app.get('/api/admin/city-routes', authenticateToken, resolveActorContext, requireActorContext, requireCan('directions.read', 'direction'), async (req, res) => {
  try {
    const { country, city } = req.query
    
    const where = {
      isActive: true,
      tenantId: req.actorContext.tenantId,
      ...buildGeoScopeWhere(req, 'country', 'city')
    }
    if (country) where.country = country
    if (city) where.city = city

    const routes = await prisma.cityRoute.findMany({
      where,
      orderBy: [
        { country: 'asc' },
        { city: 'asc' },
        { fromPoint: 'asc' }
      ]
    })

    res.json(routes)
  } catch (error) {
    console.error('Error fetching city routes:', error)
    res.status(500).json({ error: 'Failed to fetch city routes' })
  }
})

// Получение списка стран
app.get('/api/admin/city-routes/countries', authenticateToken, resolveActorContext, requireActorContext, requireCan('directions.read', 'direction'), async (req, res) => {
  try {
    const countries = await prisma.cityRoute.findMany({
      where: {
        isActive: true,
        tenantId: req.actorContext.tenantId,
        ...buildGeoScopeWhere(req, 'country', 'city')
      },
      select: { country: true },
      distinct: ['country'],
      orderBy: { country: 'asc' }
    })

    res.json(countries.map(c => c.country))
  } catch (error) {
    console.error('Error fetching countries:', error)
    res.status(500).json({ error: 'Failed to fetch countries' })
  }
})

// ==================== GOOGLE SHEETS SOURCES ====================
app.get('/api/admin/sheet-sources', authenticateToken, resolveActorContext, requireActorContext, requireCan('settings.manage', 'setting'), async (req, res) => {
  try {
    const sources = await prisma.sheetSource.findMany({
      where: { tenantId: req.actorContext.tenantId },
      orderBy: [{ isActive: 'desc' }, { monthLabel: 'desc' }, { createdAt: 'desc' }]
    })
    res.json(sources)
  } catch (error) {
    console.error('Error fetching sheet sources:', error)
    res.status(500).json({ error: 'Failed to fetch sheet sources' })
  }
})

app.post('/api/admin/sheet-sources', authenticateToken, resolveActorContext, requireActorContext, requireCan('settings.manage', 'setting'), async (req, res) => {
  try {
    const { name, monthLabel, googleSheetId, tabName, detailsTabName, columnMapping, isActive = true, syncEnabled = true } = req.body
    const normalizedSheetId = normalizeGoogleSheetId(googleSheetId)
    if (!name || !monthLabel || !normalizedSheetId) {
      return res.status(400).json({ error: 'name, monthLabel and googleSheetId are required' })
    }

    const source = await prisma.sheetSource.create({
      data: {
        tenantId: req.actorContext.tenantId,
        name,
        monthLabel,
        googleSheetId: normalizedSheetId,
        tabName: tabName || 'таблица',
        detailsTabName: detailsTabName || 'подробности',
        columnMapping: columnMapping ? JSON.stringify(columnMapping) : null,
        isActive: !!isActive,
        syncEnabled: !!syncEnabled
      }
    })
    res.json(source)
  } catch (error) {
    console.error('Error creating sheet source:', error)
    res.status(500).json({ error: 'Failed to create sheet source' })
  }
})

app.put('/api/admin/sheet-sources/:sourceId', authenticateToken, resolveActorContext, requireActorContext, requireCan('settings.manage', 'setting'), async (req, res) => {
  try {
    const { sourceId } = req.params
    const { name, monthLabel, googleSheetId, tabName, detailsTabName, columnMapping, isActive, syncEnabled } = req.body
    const data = {}
    if (name !== undefined) data.name = name
    if (monthLabel !== undefined) data.monthLabel = monthLabel
    if (googleSheetId !== undefined) data.googleSheetId = normalizeGoogleSheetId(googleSheetId)
    if (tabName !== undefined) data.tabName = tabName
    if (detailsTabName !== undefined) data.detailsTabName = detailsTabName
    if (columnMapping !== undefined) data.columnMapping = columnMapping ? JSON.stringify(columnMapping) : null
    if (isActive !== undefined) data.isActive = !!isActive
    if (syncEnabled !== undefined) data.syncEnabled = !!syncEnabled

    const existing = await prisma.sheetSource.findFirst({
      where: { id: sourceId, tenantId: req.actorContext.tenantId },
      select: { id: true }
    })
    if (!existing) return res.status(404).json({ error: 'Sheet source not found' })

    const updated = await prisma.sheetSource.update({
      where: { id: existing.id },
      data
    })
    res.json(updated)
  } catch (error) {
    console.error('Error updating sheet source:', error)
    res.status(500).json({ error: 'Failed to update sheet source' })
  }
})

app.post('/api/admin/sheet-sources/:sourceId/sync', authenticateToken, resolveActorContext, requireActorContext, requireCan('settings.manage', 'setting'), async (req, res) => {
  try {
    const { sourceId } = req.params
    const existing = await prisma.sheetSource.findFirst({
      where: { id: sourceId, tenantId: req.actorContext.tenantId },
      select: { id: true }
    })
    if (!existing) return res.status(404).json({ error: 'Sheet source not found' })
    const stats = await syncSheetSource(sourceId)
    res.json({ success: true, stats })
  } catch (error) {
    console.error('Error syncing sheet source:', error)
    await prisma.sheetSource.update({
      where: { id: req.params.sourceId },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: 'failed',
        lastSyncError: error.message || 'Unknown error'
      }
    }).catch(() => {})
    res.status(500).json({ error: 'Failed to sync sheet source', details: error.message })
  }
})

// ==================== CRM (PRODUCTION) ====================
app.post('/api/admin/crm/promote-from-staging', authenticateToken, resolveActorContext, requireActorContext, requireCan('crm.manage', 'crm'), async (req, res) => {
  try {
    const stats = await promoteStagingToCustomerCrm(req.actorContext.tenantId)
    res.json({ success: true, stats })
  } catch (error) {
    console.error('Error promoting staging CRM:', error)
    res.status(500).json({ error: 'Failed to promote staging CRM', details: error.message })
  }
})

app.get('/api/admin/crm/companies', authenticateToken, resolveActorContext, requireActorContext, requireCan('crm.read', 'crm'), async (req, res) => {
  try {
    const { q = '', segment = '', limit = '100', offset = '0' } = req.query
    const take = Math.min(parseInt(limit, 10) || 100, 500)
    const skip = Math.max(parseInt(offset, 10) || 0, 0)

    const where = { tenantId: req.actorContext.tenantId }
    if (q) {
      where.OR = [
        { name: { contains: String(q), mode: 'insensitive' } },
        { email: { contains: String(q), mode: 'insensitive' } },
        { phone: { contains: String(q) } }
      ]
    }
    if (segment) {
      where.segments = {
        some: { segment: String(segment) }
      }
    }

    const [rows, total] = await Promise.all([
      prisma.customerCompany.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take,
        include: {
          segments: true,
          _count: { select: { links: true } }
        }
      }),
      prisma.customerCompany.count({ where })
    ])

    res.json({ total, rows })
  } catch (error) {
    console.error('Error fetching CRM companies:', error)
    res.status(500).json({ error: 'Failed to fetch CRM companies' })
  }
})

app.get('/api/admin/crm/companies/:companyId', authenticateToken, resolveActorContext, requireActorContext, requireCan('crm.read', 'crm'), async (req, res) => {
  try {
    const { companyId } = req.params
    const company = await prisma.customerCompany.findFirst({
      where: { id: companyId, tenantId: req.actorContext.tenantId },
      include: {
        segments: true,
        links: {
          include: {
            contact: {
              include: { segments: true }
            }
          }
        }
      }
    })

    if (!company) return res.status(404).json({ error: 'Company not found' })
    res.json(company)
  } catch (error) {
    console.error('Error fetching CRM company details:', error)
    res.status(500).json({ error: 'Failed to fetch CRM company details' })
  }
})

app.get('/api/admin/crm/contacts', authenticateToken, resolveActorContext, requireActorContext, requireCan('crm.read', 'crm'), async (req, res) => {
  try {
    const { q = '', segment = '', limit = '100', offset = '0' } = req.query
    const take = Math.min(parseInt(limit, 10) || 100, 500)
    const skip = Math.max(parseInt(offset, 10) || 0, 0)

    const where = { tenantId: req.actorContext.tenantId }
    if (q) {
      where.OR = [
        { fullName: { contains: String(q), mode: 'insensitive' } },
        { email: { contains: String(q), mode: 'insensitive' } },
        { phone: { contains: String(q) } }
      ]
    }
    if (segment) {
      where.segments = {
        some: { segment: String(segment) }
      }
    }

    const [rows, total] = await Promise.all([
      prisma.customerContact.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take,
        include: {
          segments: true,
          _count: { select: { links: true } }
        }
      }),
      prisma.customerContact.count({ where })
    ])

    res.json({ total, rows })
  } catch (error) {
    console.error('Error fetching CRM contacts:', error)
    res.status(500).json({ error: 'Failed to fetch CRM contacts' })
  }
})

app.get('/api/admin/crm/contacts/:contactId', authenticateToken, resolveActorContext, requireActorContext, requireCan('crm.read', 'crm'), async (req, res) => {
  try {
    const { contactId } = req.params
    const contact = await prisma.customerContact.findFirst({
      where: { id: contactId, tenantId: req.actorContext.tenantId },
      include: {
        segments: true,
        links: {
          include: {
            company: {
              include: { segments: true }
            }
          }
        }
      }
    })
    if (!contact) return res.status(404).json({ error: 'Contact not found' })
    res.json(contact)
  } catch (error) {
    console.error('Error fetching CRM contact details:', error)
    res.status(500).json({ error: 'Failed to fetch CRM contact details' })
  }
})

app.put('/api/admin/crm/companies/:companyId', authenticateToken, resolveActorContext, requireActorContext, requireCan('crm.manage', 'crm'), async (req, res) => {
  try {
    const { companyId } = req.params
    const existingCompany = await prisma.customerCompany.findFirst({
      where: { id: companyId, tenantId: req.actorContext.tenantId },
      select: { id: true }
    })
    if (!existingCompany) return res.status(404).json({ error: 'Company not found' })
    const data = {}
    const fields = [
      'name', 'website', 'phone', 'email', 'telegramUrl',
      'registrationCountry', 'registrationCity', 'registrationAddress',
      'presenceCountries', 'presenceCities',
      'countryPresence', 'cityPresence',
      'comment', 'ownerName', 'companyType'
    ]
    for (const field of fields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        const value = req.body[field]
        data[field] = value === '' ? null : value
      }
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'registrationCountry') && !Object.prototype.hasOwnProperty.call(req.body, 'countryPresence')) {
      data.countryPresence = data.registrationCountry || null
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'presenceCities') && !Object.prototype.hasOwnProperty.call(req.body, 'cityPresence')) {
      data.cityPresence = data.presenceCities || null
    }
    const segments = Array.isArray(req.body.segments)
      ? [...new Set(req.body.segments.map((x) => String(x || '').trim()).filter(Boolean))]
      : null

    const updated = await prisma.$transaction(async (tx) => {
      const company = await tx.customerCompany.update({ where: { id: companyId }, data })
      if (segments !== null) {
        await tx.customerCompanySegment.deleteMany({ where: { companyId } })
        if (segments.length) {
          await tx.customerCompanySegment.createMany({
            data: segments.map((segment) => ({
              companyId,
              segment,
              sourceFile: 'manual_ui'
            })),
            skipDuplicates: true
          })
        }
      }
      return company
    })
    res.json(updated)
  } catch (error) {
    console.error('Error updating CRM company:', error)
    res.status(500).json({ error: 'Failed to update CRM company' })
  }
})

app.put('/api/admin/crm/contacts/:contactId', authenticateToken, resolveActorContext, requireActorContext, requireCan('crm.manage', 'crm'), async (req, res) => {
  try {
    const { contactId } = req.params
    const existingContact = await prisma.customerContact.findFirst({
      where: { id: contactId, tenantId: req.actorContext.tenantId },
      select: { id: true }
    })
    if (!existingContact) return res.status(404).json({ error: 'Contact not found' })
    const data = {}
    const fields = [
      'fullName', 'website', 'phone', 'email', 'telegramUrl',
      'registrationCountry', 'registrationCity', 'registrationAddress',
      'presenceCountries', 'presenceCities',
      'countryPresence', 'cityPresence',
      'comment', 'position', 'ownerName'
    ]
    for (const field of fields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        const value = req.body[field]
        data[field] = value === '' ? null : value
      }
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'registrationCountry') && !Object.prototype.hasOwnProperty.call(req.body, 'countryPresence')) {
      data.countryPresence = data.registrationCountry || null
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'presenceCities') && !Object.prototype.hasOwnProperty.call(req.body, 'cityPresence')) {
      data.cityPresence = data.presenceCities || null
    }
    const segments = Array.isArray(req.body.segments)
      ? [...new Set(req.body.segments.map((x) => String(x || '').trim()).filter(Boolean))]
      : null

    const updated = await prisma.$transaction(async (tx) => {
      const contact = await tx.customerContact.update({ where: { id: contactId }, data })
      if (segments !== null) {
        await tx.customerContactSegment.deleteMany({ where: { contactId } })
        if (segments.length) {
          await tx.customerContactSegment.createMany({
            data: segments.map((segment) => ({
              contactId,
              segment,
              sourceFile: 'manual_ui'
            })),
            skipDuplicates: true
          })
        }
      }
      return contact
    })
    res.json(updated)
  } catch (error) {
    console.error('Error updating CRM contact:', error)
    res.status(500).json({ error: 'Failed to update CRM contact' })
  }
})

function splitPresence(raw) {
  return String(raw || '')
    .split(/[,\n;|/]+/)
    .map((x) => x.trim())
    .filter(Boolean)
}

function normalizeCountryName(raw) {
  const value = String(raw || '').trim()
  if (!value || value === '—') return ''
  const key = value.toLowerCase()
  const map = {
    'uk': 'United Kingdom',
    'u.k.': 'United Kingdom',
    'great britain': 'United Kingdom',
    'britain': 'United Kingdom',
    'united kingdom': 'United Kingdom',
    'велкобритания': 'United Kingdom',
    'великобритания': 'United Kingdom',
    'англия': 'United Kingdom',
    'uae': 'UAE',
    'u.a.e.': 'UAE',
    'united arab emirates': 'UAE',
    'эмирейтс': 'UAE',
    'оаэ': 'UAE'
  }
  return map[key] || value
}

function normalizeCityName(raw) {
  return String(raw || '').trim().toLowerCase()
}

function inferCountryFromCity(rawCity) {
  const city = normalizeCityName(rawCity)
  const map = {
    london: 'United Kingdom',
    dubai: 'UAE',
    paris: 'France',
    rome: 'Italy',
    vienna: 'Austria',
    madrid: 'Spain',
    cancun: 'Mexico'
  }
  return map[city] || ''
}

app.get('/api/admin/crm/directions-matrix', authenticateToken, resolveActorContext, requireActorContext, requireCan('crm.read', 'crm'), async (req, res) => {
  try {
    const companies = await prisma.customerCompany.findMany({
      where: { tenantId: req.actorContext.tenantId },
      include: { segments: true },
      take: 10000
    })

    const isClient = (segments) => segments.includes('client_company') || segments.includes('potential_client_company') || segments.includes('potential_client_agent')
    const isSupplier = (segments) => segments.includes('supplier_company') || segments.includes('potential_supplier')

    const matrixMap = new Map()
    const cityToKnownCountries = new Map()
    for (const company of companies) {
      const segs = (company.segments || []).map((s) => s.segment)
      const clientRole = isClient(segs)
      const supplierRole = isSupplier(segs)
      if (!clientRole && !supplierRole) continue

      const countries = splitPresence(company.presenceCountries)
      const cities = splitPresence(company.presenceCities || company.cityPresence)
      const safeCities = cities.length ? cities : ['—']

      for (const city of safeCities) {
        const scopedCountries = countries.length ? countries : [inferCountryFromCity(city) || '—']
        for (const country of scopedCountries) {
          const normalizedCountry = normalizeCountryName(country)
          const normalizedCity = normalizeCityName(city) || '—'
          const key = `${normalizedCountry || '—'}||${normalizedCity}`
          if (!matrixMap.has(key)) {
            matrixMap.set(key, {
              country: normalizedCountry || '—',
              city: String(city || '').trim() || '—',
              clients: [],
              suppliers: []
            })
          }
          const row = matrixMap.get(key)
          if (normalizedCountry && normalizedCity && normalizedCity !== '—') {
            if (!cityToKnownCountries.has(normalizedCity)) cityToKnownCountries.set(normalizedCity, new Set())
            cityToKnownCountries.get(normalizedCity).add(normalizedCountry)
          }
          const item = {
            id: company.id,
            name: company.name,
            phone: company.phone || null,
            email: company.email || null
          }
          if (clientRole) {
            if (!row.clients.some((x) => x.id === company.id)) row.clients.push(item)
          }
          if (supplierRole) {
            if (!row.suppliers.some((x) => x.id === company.id)) row.suppliers.push(item)
          }
        }
      }
    }

    const secondPassMap = new Map()
    for (const row of matrixMap.values()) {
      const normalizedCity = normalizeCityName(row.city) || '—'
      let finalCountry = row.country
      if (row.country === '—' && normalizedCity !== '—') {
        const known = cityToKnownCountries.get(normalizedCity)
        if (known && known.size === 1) finalCountry = Array.from(known)[0]
      }
      const key = `${finalCountry}||${normalizedCity}`
      if (!secondPassMap.has(key)) {
        secondPassMap.set(key, {
          country: finalCountry,
          city: row.city,
          clients: [],
          suppliers: []
        })
      }
      const target = secondPassMap.get(key)
      for (const c of row.clients) {
        if (!target.clients.some((x) => x.id === c.id)) target.clients.push(c)
      }
      for (const s of row.suppliers) {
        if (!target.suppliers.some((x) => x.id === s.id)) target.suppliers.push(s)
      }
    }

    const cityFoldMap = new Map()
    for (const row of secondPassMap.values()) {
      const cityKey = normalizeCityName(row.city) || '—'
      if (!cityFoldMap.has(cityKey)) {
        cityFoldMap.set(cityKey, {
          city: row.city,
          countrySet: new Set(),
          clients: [],
          suppliers: []
        })
      }
      const target = cityFoldMap.get(cityKey)
      if (row.country && row.country !== '—') target.countrySet.add(row.country)
      for (const c of row.clients) {
        if (!target.clients.some((x) => x.id === c.id)) target.clients.push(c)
      }
      for (const s of row.suppliers) {
        if (!target.suppliers.some((x) => x.id === s.id)) target.suppliers.push(s)
      }
    }

    const rows = Array.from(cityFoldMap.values())
      .map((row) => ({
        country: row.countrySet.size === 0 ? '—' : Array.from(row.countrySet).sort((a, b) => a.localeCompare(b, 'ru')).join(', '),
        city: row.city,
        clients: row.clients,
        suppliers: row.suppliers,
        clientsCount: row.clients.length,
        suppliersCount: row.suppliers.length
      }))
      .sort((a, b) => {
        const aUnknown = a.country === '—' && a.city === '—'
        const bUnknown = b.country === '—' && b.city === '—'
        if (aUnknown !== bUnknown) return aUnknown ? 1 : -1
        if (a.country === b.country) return a.city.localeCompare(b.city, 'ru')
        return a.country.localeCompare(b.country, 'ru')
      })

    res.json({ rows, total: rows.length })
  } catch (error) {
    console.error('Error fetching directions matrix:', error)
    res.status(500).json({ error: 'Failed to fetch directions matrix' })
  }
})

// ==================== CITY PRICING ====================
app.get('/api/admin/pricing/cities', authenticateToken, resolveActorContext, requireActorContext, requireCan('pricing.read', 'pricing'), async (req, res) => {
  try {
    const { q = '', limit = '200' } = req.query
    const take = Math.min(parseInt(limit, 10) || 200, 10000)
    const where = {
      isActive: true,
      tenantId: req.actorContext.tenantId,
      ...buildGeoScopeWhere(req, 'country', 'city')
    }
    if (q) {
      where.OR = [
        { city: { contains: String(q), mode: 'insensitive' } },
        { routeFrom: { contains: String(q), mode: 'insensitive' } },
        { routeTo: { contains: String(q), mode: 'insensitive' } }
      ]
    }
    const rows = await prisma.cityPricing.findMany({
      where,
      orderBy: [{ city: 'asc' }, { updatedAt: 'desc' }],
      take
    })
    res.json({ rows })
  } catch (error) {
    console.error('Error fetching city pricing:', error)
    res.status(500).json({ error: 'Failed to fetch city pricing' })
  }
})

app.get('/api/admin/pricing/export-eta-template', authenticateToken, resolveActorContext, requireActorContext, requireCan('pricing.read', 'pricing'), async (req, res) => {
  try {
    const rows = await prisma.cityPricing.findMany({
      where: {
        tenantId: req.actorContext.tenantId,
        isActive: true,
        fixedPrice: { not: null },
        ...buildGeoScopeWhere(req, 'country', 'city')
      },
      orderBy: [{ country: 'asc' }, { city: 'asc' }, { routeFrom: 'asc' }, { routeTo: 'asc' }],
      take: 20000
    })

    const headers = [
      'From', 'To', 'Price', 'Lux', 'MV 8 pax', 'Sprinter',
      'Electric Standard', 'Saloon', 'Estate', 'Executive', 'MPV', 'MV 6 pax', 'MV 7 pax'
    ]
    const esc = (v) => {
      const s = String(v ?? '')
      return `"${s.replace(/"/g, '""')}"`
    }

    const lines = [headers.map(esc).join(';')]
    for (const row of rows) {
      lines.push([
        row.routeFrom || '',
        row.routeTo || '',
        row.fixedPrice !== null && row.fixedPrice !== undefined ? row.fixedPrice : '',
        '', '', '', '', '', '', '', '', '', ''
      ].map(esc).join(';'))
    }

    const csv = '\uFEFF' + lines.join('\n')
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="ETA_Fixed_Price_template.csv"')
    res.status(200).send(csv)
  } catch (error) {
    console.error('Error exporting ETA template:', error)
    res.status(500).json({ error: 'Failed to export ETA template' })
  }
})

app.post('/api/admin/pricing/cities', authenticateToken, resolveActorContext, requireActorContext, requireCan('pricing.manage', 'pricing', (req) => ({
  country: req.body?.country || null,
  city: req.body?.city || null
})), async (req, res) => {
  try {
    const {
      country,
      city,
      routeFrom,
      routeTo,
      vehicleType,
      fixedPrice,
      pricePerKm,
      hourlyRate,
      childSeatPrice,
      currency,
      notes
    } = req.body

    if (!city) return res.status(400).json({ error: 'city is required' })

    const payload = { country, city, routeFrom, routeTo, vehicleType, fixedPrice, pricePerKm, hourlyRate, childSeatPrice, currency, notes }
    const wrapped = await withIdempotency(req, 'pricing.city.create', payload, async () => {
      const row = await prisma.cityPricing.create({
        data: {
          tenantId: req.actorContext.tenantId,
          country: country || null,
          city,
          routeFrom: routeFrom || null,
          routeTo: routeTo || null,
          vehicleType: vehicleType || null,
          fixedPrice: fixedPrice !== undefined && fixedPrice !== null ? parseFloat(fixedPrice) : null,
          pricePerKm: pricePerKm !== undefined && pricePerKm !== null ? parseFloat(pricePerKm) : null,
          hourlyRate: hourlyRate !== undefined && hourlyRate !== null ? parseFloat(hourlyRate) : null,
          childSeatPrice: childSeatPrice !== undefined && childSeatPrice !== null ? parseFloat(childSeatPrice) : null,
          currency: currency || 'EUR',
          notes: notes || null
        }
      })
      await writeAuditLog({
        tenantId: req.actorContext.tenantId,
        actorId: req.actorContext.actorId,
        actorRole: req.actorContext.actorRole,
        action: 'pricing.city.create',
        resource: 'city_pricing',
        resourceId: row.id,
        traceId: req.actorContext.traceId,
        decision: 'policy_allowed',
        result: 'ok',
        context: payload
      })
      return row
    })
    res.json({ ...wrapped.data, idempotent: wrapped.replayed })
  } catch (error) {
    console.error('Error creating city pricing:', error)
    res.status(500).json({ error: 'Failed to create city pricing' })
  }
})

app.put('/api/admin/pricing/cities/:id', authenticateToken, resolveActorContext, requireActorContext, requireCan('pricing.manage', 'pricing', async (req) => {
  const existing = await prisma.cityPricing.findFirst({
    where: { id: req.params.id, tenantId: req.actorContext?.tenantId || '' },
    select: { country: true, city: true }
  })
  if (!existing) return {}
  return {
    country: req.body?.country !== undefined ? req.body.country : existing.country,
    city: req.body?.city !== undefined ? req.body.city : existing.city
  }
}), async (req, res) => {
  try {
    const data = {}
    const nullableFields = ['country', 'routeFrom', 'routeTo', 'vehicleType', 'notes', 'source']
    for (const f of nullableFields) {
      if (req.body[f] !== undefined) data[f] = req.body[f] || null
    }
    if (req.body.city !== undefined) data.city = String(req.body.city || '').trim()
    if (req.body.currency !== undefined) data.currency = String(req.body.currency || '').trim() || 'EUR'

    if (req.body.fixedPrice !== undefined) data.fixedPrice = req.body.fixedPrice === null ? null : parseFloat(req.body.fixedPrice)
    if (req.body.pricePerKm !== undefined) data.pricePerKm = req.body.pricePerKm === null ? null : parseFloat(req.body.pricePerKm)
    if (req.body.hourlyRate !== undefined) data.hourlyRate = req.body.hourlyRate === null ? null : parseFloat(req.body.hourlyRate)
    if (req.body.childSeatPrice !== undefined) data.childSeatPrice = req.body.childSeatPrice === null ? null : parseFloat(req.body.childSeatPrice)
    if (req.body.isActive !== undefined) data.isActive = !!req.body.isActive

    const existing = await prisma.cityPricing.findFirst({
      where: { id: req.params.id, tenantId: req.actorContext.tenantId },
      select: { id: true }
    })
    if (!existing) return res.status(404).json({ error: 'City pricing row not found' })

    const wrapped = await withIdempotency(req, 'pricing.city.update', { id: req.params.id, data }, async () => {
      const row = await prisma.cityPricing.update({
        where: { id: req.params.id },
        data
      })
      await writeAuditLog({
        tenantId: req.actorContext.tenantId,
        actorId: req.actorContext.actorId,
        actorRole: req.actorContext.actorRole,
        action: 'pricing.city.update',
        resource: 'city_pricing',
        resourceId: row.id,
        traceId: req.actorContext.traceId,
        decision: 'policy_allowed',
        result: 'ok',
        context: data
      })
      return row
    })
    res.json({ ...wrapped.data, idempotent: wrapped.replayed })
  } catch (error) {
    console.error('Error updating city pricing:', error)
    res.status(500).json({ error: 'Failed to update city pricing' })
  }
})

app.get('/api/admin/pricing/counterparty-rules', authenticateToken, resolveActorContext, requireActorContext, requireCan('pricing.read', 'pricing'), async (req, res) => {
  try {
    const { q = '', active = '' } = req.query
    const where = {
      tenantId: req.actorContext.tenantId,
      ...buildCityScopeWhere(req, 'city')
    }
    if (active !== '') where.isActive = String(active) === 'true'
    if (q) {
      where.OR = [
        { counterpartyName: { contains: String(q), mode: 'insensitive' } },
        { city: { contains: String(q), mode: 'insensitive' } },
        { routeFrom: { contains: String(q), mode: 'insensitive' } },
        { routeTo: { contains: String(q), mode: 'insensitive' } }
      ]
    }
    const rows = await prisma.counterpartyPriceRule.findMany({
      where,
      include: {
        customerCompany: { select: { id: true, name: true } }
      },
      orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
      take: 300
    })
    res.json({ rows })
  } catch (error) {
    console.error('Error fetching counterparty pricing rules:', error)
    res.status(500).json({ error: 'Failed to fetch counterparty rules' })
  }
})

app.post('/api/admin/pricing/counterparty-rules', authenticateToken, resolveActorContext, requireActorContext, requireCan('pricing.manage', 'pricing', (req) => ({
  city: req.body?.city || null
})), async (req, res) => {
  try {
    const {
      customerCompanyId,
      counterpartyName,
      city,
      routeFrom,
      routeTo,
      vehicleType,
      sellPrice,
      markupPercent,
      minMarginAbs,
      currency,
      startsAt,
      endsAt,
      notes,
      isActive
    } = req.body || {}

    if (!counterpartyName) {
      return res.status(400).json({ error: 'counterpartyName is required' })
    }

    const payload = { customerCompanyId, counterpartyName, city, routeFrom, routeTo, vehicleType, sellPrice, markupPercent, minMarginAbs, currency, startsAt, endsAt, notes, isActive }
    const wrapped = await withIdempotency(req, 'pricing.counterparty.create', payload, async () => {
      const row = await prisma.counterpartyPriceRule.create({
        data: {
          tenantId: req.actorContext.tenantId,
          customerCompanyId: customerCompanyId || null,
          counterpartyName: String(counterpartyName).trim(),
          city: city || null,
          routeFrom: routeFrom || null,
          routeTo: routeTo || null,
          vehicleType: vehicleType || null,
          sellPrice: sellPrice === null || sellPrice === undefined || sellPrice === '' ? null : parseFloat(sellPrice),
          markupPercent: markupPercent === null || markupPercent === undefined || markupPercent === '' ? null : parseFloat(markupPercent),
          minMarginAbs: minMarginAbs === null || minMarginAbs === undefined || minMarginAbs === '' ? null : parseFloat(minMarginAbs),
          currency: currency || 'EUR',
          startsAt: startsAt ? new Date(startsAt) : null,
          endsAt: endsAt ? new Date(endsAt) : null,
          notes: notes || null,
          isActive: isActive === undefined ? true : !!isActive
        }
      })
      await writeAuditLog({
        tenantId: req.actorContext.tenantId,
        actorId: req.actorContext.actorId,
        actorRole: req.actorContext.actorRole,
        action: 'pricing.counterparty.create',
        resource: 'counterparty_rule',
        resourceId: row.id,
        traceId: req.actorContext.traceId,
        decision: 'policy_allowed',
        result: 'ok',
        context: payload
      })
      return row
    })
    res.json({ ...wrapped.data, idempotent: wrapped.replayed })
  } catch (error) {
    console.error('Error creating counterparty pricing rule:', error)
    res.status(500).json({ error: 'Failed to create counterparty rule' })
  }
})

app.put('/api/admin/pricing/counterparty-rules/:id', authenticateToken, resolveActorContext, requireActorContext, requireCan('pricing.manage', 'pricing', async (req) => {
  const existing = await prisma.counterpartyPriceRule.findFirst({
    where: { id: req.params.id, tenantId: req.actorContext?.tenantId || '' },
    select: { city: true }
  })
  if (!existing) return {}
  return {
    city: req.body?.city !== undefined ? req.body.city : existing.city
  }
}), async (req, res) => {
  try {
    const data = {}
    const nullableFields = ['customerCompanyId', 'city', 'routeFrom', 'routeTo', 'vehicleType', 'notes']
    for (const f of nullableFields) {
      if (req.body[f] !== undefined) data[f] = req.body[f] || null
    }
    if (req.body.counterpartyName !== undefined) data.counterpartyName = String(req.body.counterpartyName || '').trim()
    if (req.body.currency !== undefined) data.currency = String(req.body.currency || '').trim() || 'EUR'
    if (req.body.sellPrice !== undefined) data.sellPrice = req.body.sellPrice === null || req.body.sellPrice === '' ? null : parseFloat(req.body.sellPrice)
    if (req.body.markupPercent !== undefined) data.markupPercent = req.body.markupPercent === null || req.body.markupPercent === '' ? null : parseFloat(req.body.markupPercent)
    if (req.body.minMarginAbs !== undefined) data.minMarginAbs = req.body.minMarginAbs === null || req.body.minMarginAbs === '' ? null : parseFloat(req.body.minMarginAbs)
    if (req.body.startsAt !== undefined) data.startsAt = req.body.startsAt ? new Date(req.body.startsAt) : null
    if (req.body.endsAt !== undefined) data.endsAt = req.body.endsAt ? new Date(req.body.endsAt) : null
    if (req.body.isActive !== undefined) data.isActive = !!req.body.isActive

    const existing = await prisma.counterpartyPriceRule.findFirst({
      where: { id: req.params.id, tenantId: req.actorContext.tenantId },
      select: { id: true }
    })
    if (!existing) return res.status(404).json({ error: 'Counterparty rule not found' })

    const wrapped = await withIdempotency(req, 'pricing.counterparty.update', { id: req.params.id, data }, async () => {
      const row = await prisma.counterpartyPriceRule.update({
        where: { id: req.params.id },
        data
      })
      await writeAuditLog({
        tenantId: req.actorContext.tenantId,
        actorId: req.actorContext.actorId,
        actorRole: req.actorContext.actorRole,
        action: 'pricing.counterparty.update',
        resource: 'counterparty_rule',
        resourceId: row.id,
        traceId: req.actorContext.traceId,
        decision: 'policy_allowed',
        result: 'ok',
        context: data
      })
      return row
    })
    res.json({ ...wrapped.data, idempotent: wrapped.replayed })
  } catch (error) {
    console.error('Error updating counterparty pricing rule:', error)
    res.status(500).json({ error: 'Failed to update counterparty rule' })
  }
})

async function recalculatePriceConflicts(tenantId) {
  const orders = await prisma.order.findMany({
    where: {
      ...(tenantId ? { tenantId } : {}),
      driverPrice: { not: null },
      clientPrice: { gt: 0 },
      status: { in: ['assigned', 'accepted', 'completed'] }
    },
    select: {
      id: true,
      tenantId: true,
      clientPrice: true,
      driverPrice: true,
      fromPoint: true,
      toPoint: true,
      status: true,
      updatedAt: true
    },
    take: 5000
  })

  const seenConflictKeys = new Set()
  let createdOrUpdated = 0

  for (const order of orders) {
    const sellPrice = Number(order.clientPrice || 0)
    const driverCost = Number(order.driverPrice || 0)
    const marginAbs = sellPrice - driverCost
    const marginPct = sellPrice > 0 ? (marginAbs / sellPrice) * 100 : 0

    let issueType = null
    let severity = null
    if (driverCost > sellPrice) {
      issueType = 'driver_gt_sell'
      severity = 'critical'
    } else if (marginPct < 10) {
      issueType = 'low_margin'
      severity = 'warning'
    }

    if (!issueType) {
      continue
    }

    const key = `${order.id}:${issueType}`
    seenConflictKeys.add(key)

    await prisma.priceConflict.upsert({
      where: { orderId_issueType: { orderId: order.id, issueType } },
      update: {
        tenantId: order.tenantId || tenantId || null,
        severity,
        status: 'open',
        sellPrice,
        driverCost,
        marginAbs,
        marginPct,
        details: `${order.fromPoint} -> ${order.toPoint}`
      },
      create: {
        tenantId: order.tenantId || tenantId || null,
        orderId: order.id,
        issueType,
        severity,
        status: 'open',
        sellPrice,
        driverCost,
        marginAbs,
        marginPct,
        details: `${order.fromPoint} -> ${order.toPoint}`
      }
    })
    createdOrUpdated++
  }

  const openRows = await prisma.priceConflict.findMany({
    where: { status: 'open', ...(tenantId ? { tenantId } : {}) },
    select: { id: true, orderId: true, issueType: true }
  })
  for (const row of openRows) {
    const key = `${row.orderId}:${row.issueType}`
    if (!seenConflictKeys.has(key)) {
      await prisma.priceConflict.update({
        where: { id: row.id },
        data: {
          status: 'resolved',
          resolvedAt: new Date()
        }
      })
    }
  }

  return { processedOrders: orders.length, createdOrUpdated }
}

app.post('/api/admin/pricing/conflicts/recalculate', authenticateToken, resolveActorContext, requireActorContext, requireCan('pricing.manage', 'pricing'), async (req, res) => {
  try {
    const stats = await recalculatePriceConflicts(req.actorContext.tenantId)
    res.json({ ok: true, stats })
  } catch (error) {
    console.error('Error recalculating price conflicts:', error)
    res.status(500).json({ error: 'Failed to recalculate conflicts' })
  }
})

app.get('/api/admin/pricing/conflicts', authenticateToken, resolveActorContext, requireActorContext, requireCan('pricing.read', 'pricing'), async (req, res) => {
  try {
    const { status = 'open', severity = '', limit = '200' } = req.query
    const take = Math.min(parseInt(limit, 10) || 200, 500)
    const where = { tenantId: req.actorContext.tenantId }
    if (status) where.status = String(status)
    if (severity) where.severity = String(severity)
    const rows = await prisma.priceConflict.findMany({
      where,
      include: {
        order: {
          select: {
            id: true,
            source: true,
            fromPoint: true,
            toPoint: true,
            status: true,
            pickupAt: true,
            driverId: true
          }
        }
      },
      orderBy: [{ severity: 'asc' }, { updatedAt: 'desc' }],
      take
    })
    res.json({ rows })
  } catch (error) {
    console.error('Error fetching price conflicts:', error)
    res.status(500).json({ error: 'Failed to fetch price conflicts' })
  }
})

// ==================== OPS DRAFTS / AVAILABILITY ====================
async function detectDriverUnavailabilityFromText(text) {
  const pattern = /водитель\s+(.+?)\s+(?:в отпуске|недоступен)\s+с\s+(\d{4}-\d{2}-\d{2}|\d{1,2}\.\d{1,2}\.\d{4})\s+по\s+(\d{4}-\d{2}-\d{2}|\d{1,2}\.\d{1,2}\.\d{4})/i
  const match = String(text || '').match(pattern)
  if (!match) return null
  const [, driverNameRaw, start, end] = match
  const startAt = parseDateBoundary(start, 'start')
  const endAt = parseDateBoundary(end, 'end')
  if (!startAt || !endAt) return null
  return {
    type: 'driver_unavailable',
    driverNameRaw: driverNameRaw.trim(),
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString(),
    reason: 'vacation_or_unavailable'
  }
}

function isImportantMessage(text) {
  const t = String(text || '').toLowerCase()
  return t.includes('#важно') || t.startsWith('важно:') || t.includes('в отпуске') || t.includes('недоступен')
}

async function saveOpsDraftFromTelegram({ tenantId, chatId, telegramUserId, text, authorName, messageDate }) {
  const parsed = await detectDriverUnavailabilityFromText(text)
  const parsedType = parsed ? 'driver_unavailable' : 'generic_important'
  const payloadBase = {
    source: 'telegram_comment',
    authorName: authorName || null,
    messageDate: messageDate || null
  }
  const payload = parsed
    ? { ...parsed, ...payloadBase }
    : { type: 'generic_important', text: String(text || '').trim(), ...payloadBase }

  const draft = await prisma.opsEventDraft.create({
    data: {
      tenantId: tenantId || null,
      chatId: String(chatId),
      telegramUserId: String(telegramUserId),
      messageText: String(text || ''),
      parsedType,
      payloadJson: JSON.stringify(payload),
      status: 'pending'
    }
  })
  return draft
}

function formatUtcDateTime(value) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toISOString().replace('T', ' ').slice(0, 16) + ' UTC'
}

function buildCopilotMessage(lines) {
  return [
    'Я помощник Riderra, работаю в тестовом режиме.',
    ...lines.filter(Boolean)
  ].join('\n')
}

function sourceLabel(source) {
  const raw = String(source || '').trim().toLowerCase()
  if (!raw) return 'не указан'
  if (raw === 'manual') return 'прайс-лист Riderra (ручной ввод)'
  if (raw === 'sheet' || raw === 'google_sheet') return 'Google Sheet'
  if (raw === 'dispatch' || raw === 'easytaxi') return 'диспетчерская'
  if (raw === 'smoke_test') return 'тестовые данные'
  return raw
}

function localDateShort(value) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toISOString().slice(0, 10)
}

async function createOpsTask({
  tenantId = null,
  userId,
  title,
  details = null,
  type = 'general',
  priority = 'normal',
  source = 'telegram_private',
  sourceRef = null,
  dueAt = null,
  payload = null
}) {
  return prisma.opsTask.create({
    data: {
      tenantId,
      assignedUserId: userId,
      title,
      details,
      type,
      priority,
      source,
      sourceRef,
      dueAt,
      payloadJson: payload ? JSON.stringify(payload) : null
    }
  })
}

async function getOpenOpsTasksForUser(userId, tenantId = null, limit = 10) {
  return prisma.opsTask.findMany({
    where: {
      ...(tenantId ? { tenantId } : {}),
      assignedUserId: userId,
      status: { in: ['open', 'in_progress'] }
    },
    orderBy: [{ priority: 'desc' }, { dueAt: 'asc' }, { createdAt: 'desc' }],
    take: limit
  })
}

function formatOpsTasks(tasks) {
  if (!tasks.length) {
    return 'Открытых задач нет.'
  }
  return tasks.map((t, idx) => (
    `${idx + 1}. [${t.id}] ${t.title}\n` +
    `Статус: ${t.status}, приоритет: ${t.priority}, дедлайн: ${localDateShort(t.dueAt)}\n` +
    `Тип: ${t.type}, источник: ${sourceLabel(t.source)}`
  )).join('\n\n')
}

async function buildLosAngelesFinanceSummary(tenantId = null) {
  const rows = await prisma.order.findMany({
    where: {
      ...(tenantId ? { tenantId } : {}),
      OR: [
        { fromPoint: { contains: 'Los Angeles', mode: 'insensitive' } },
        { toPoint: { contains: 'Los Angeles', mode: 'insensitive' } }
      ],
      status: { in: ['assigned', 'accepted', 'completed'] }
    },
    select: {
      id: true,
      pickupAt: true,
      fromPoint: true,
      toPoint: true,
      clientPrice: true,
      driverPrice: true,
      commission: true,
      status: true
    },
    take: 200
  })

  const totalClient = rows.reduce((s, r) => s + Number(r.clientPrice || 0), 0)
  const totalDriver = rows.reduce((s, r) => s + Number(r.driverPrice || 0), 0)
  const totalCommission = rows.reduce((s, r) => s + Number(r.commission || 0), 0)

  return {
    count: rows.length,
    totalClient,
    totalDriver,
    totalCommission
  }
}

async function findAvailabilityConflicts(unavailability, tenantId = null) {
  if (!unavailability.driverId) return []
  return prisma.order.findMany({
    where: {
      ...(tenantId ? { tenantId } : {}),
      driverId: unavailability.driverId,
      pickupAt: {
        gte: unavailability.startAt,
        lte: unavailability.endAt
      },
      status: { notIn: ['cancelled', 'completed'] }
    },
    orderBy: { pickupAt: 'asc' },
    select: {
      id: true,
      externalKey: true,
      pickupAt: true,
      fromPoint: true,
      toPoint: true,
      status: true
    }
  })
}

app.get('/api/admin/ops/drafts', authenticateToken, resolveActorContext, requireActorContext, requireCan('ops.read', 'ops'), async (req, res) => {
  try {
    const { status = 'pending', limit = '100' } = req.query
    const take = Math.min(parseInt(limit, 10) || 100, 300)
    const rows = await prisma.opsEventDraft.findMany({
      where: {
        tenantId: req.actorContext.tenantId,
        ...(status ? { status: String(status) } : {})
      },
      orderBy: { createdAt: 'desc' },
      take
    })
    res.json({ rows })
  } catch (error) {
    console.error('Error fetching ops drafts:', error)
    res.status(500).json({ error: 'Failed to fetch ops drafts' })
  }
})

app.post('/api/admin/ops/drafts/:draftId/reject', authenticateToken, resolveActorContext, requireActorContext, requireCan('ops.drafts.resolve', 'ops_draft', () => ({
  businessHours: { enabled: true, startHour: 6, endHour: 23 }
})), async (req, res) => {
  try {
    const { draftId } = req.params
    const { comment } = req.body || {}
    const existing = await prisma.opsEventDraft.findFirst({
      where: { id: draftId, tenantId: req.actorContext.tenantId },
      select: { id: true }
    })
    if (!existing) return res.status(404).json({ error: 'Draft not found' })
    const draft = await prisma.opsEventDraft.update({
      where: { id: existing.id },
      data: {
        status: 'rejected',
        reviewerUserId: req.user.id,
        reviewerEmail: req.user.email,
        reviewedAt: new Date(),
        reviewComment: comment || null
      }
    })
    res.json({ success: true, draft })
  } catch (error) {
    console.error('Error rejecting ops draft:', error)
    res.status(500).json({ error: 'Failed to reject draft' })
  }
})

app.post('/api/admin/ops/drafts/:draftId/approve', authenticateToken, resolveActorContext, requireActorContext, requireCan('ops.drafts.resolve', 'ops_draft', () => ({
  businessHours: { enabled: true, startHour: 6, endHour: 23 }
})), async (req, res) => {
  try {
    const { draftId } = req.params
    const { comment } = req.body || {}
    const draft = await prisma.opsEventDraft.findFirst({
      where: { id: draftId, tenantId: req.actorContext.tenantId }
    })
    if (!draft) return res.status(404).json({ error: 'Draft not found' })
    if (draft.status !== 'pending') return res.status(400).json({ error: 'Draft is not pending' })

    const payload = JSON.parse(draft.payloadJson || '{}')
    const event = await prisma.opsEvent.create({
      data: {
        tenantId: req.actorContext.tenantId,
        type: draft.parsedType,
        payloadJson: draft.payloadJson,
        sourceDraftId: draft.id
      }
    })

    let unavailability = null
    let conflicts = []
    if (draft.parsedType === 'driver_unavailable') {
      const name = String(payload.driverNameRaw || '').trim()
      const driver = name
        ? await prisma.driver.findFirst({
            where: {
              tenantId: req.actorContext.tenantId,
              name: { contains: name, mode: 'insensitive' }
            },
            orderBy: { createdAt: 'asc' }
          })
        : null

      unavailability = await prisma.driverUnavailability.create({
        data: {
          tenantId: req.actorContext.tenantId,
          driverId: driver?.id || null,
          driverNameRaw: name || 'unknown',
          startAt: new Date(payload.startAt),
          endAt: new Date(payload.endAt),
          reason: payload.reason || 'unavailable',
          sourceDraftId: draft.id
        }
      })
      conflicts = await findAvailabilityConflicts(unavailability, req.actorContext.tenantId)
    }

    const updatedDraft = await prisma.opsEventDraft.update({
      where: { id: draft.id },
      data: {
        status: 'approved',
        reviewerUserId: req.user.id,
        reviewerEmail: req.user.email,
        reviewedAt: new Date(),
        reviewComment: comment || null,
        promotedEventId: event.id,
        promotedUnavailabilityId: unavailability?.id || null
      }
    })

    res.json({
      success: true,
      draft: updatedDraft,
      event,
      unavailability,
      conflicts
    })
  } catch (error) {
    console.error('Error approving ops draft:', error)
    res.status(500).json({ error: 'Failed to approve draft', details: error.message })
  }
})

app.get('/api/admin/ops/unavailability', authenticateToken, resolveActorContext, requireActorContext, requireCan('ops.read', 'ops'), async (req, res) => {
  try {
    const rows = await prisma.driverUnavailability.findMany({
      where: { tenantId: req.actorContext.tenantId, status: 'active' },
      include: { driver: { select: { id: true, name: true, email: true } } },
      orderBy: { startAt: 'asc' }
    })
    res.json({ rows })
  } catch (error) {
    console.error('Error fetching unavailability:', error)
    res.status(500).json({ error: 'Failed to fetch unavailability' })
  }
})

app.get('/api/admin/ops/unavailability/:id/conflicts', authenticateToken, resolveActorContext, requireActorContext, requireCan('ops.read', 'ops'), async (req, res) => {
  try {
    const row = await prisma.driverUnavailability.findFirst({
      where: { id: req.params.id, tenantId: req.actorContext.tenantId }
    })
    if (!row) return res.status(404).json({ error: 'Unavailability not found' })
    const conflicts = await findAvailabilityConflicts(row, req.actorContext.tenantId)
    res.json({ conflicts })
  } catch (error) {
    console.error('Error fetching availability conflicts:', error)
    res.status(500).json({ error: 'Failed to fetch conflicts' })
  }
})

// ==================== TELEGRAM CRM LOOKUP ====================
async function telegramSendMessage(chatId, text) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not configured')
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text
    })
  })
  if (!response.ok) {
    const details = await response.text()
    throw new Error(`Telegram sendMessage failed: ${details}`)
  }
}

function formatCompanyResult(rows) {
  if (!rows.length) return 'Ничего не найдено по компании.'
  return rows
    .map((r, idx) => {
      const segments = (r.segments || []).map((s) => s.segment).slice(0, 4).join(', ')
      return `${idx + 1}. ${r.name}\nID: ${r.id}\nEmail: ${r.email || '-'}\nТелефон: ${r.phone || '-'}\nСегменты: ${segments || '-'}`
    })
    .join('\n\n')
}

function formatContactResult(rows) {
  if (!rows.length) return 'Ничего не найдено по клиенту.'
  return rows
    .map((r, idx) => {
      const segments = (r.segments || []).map((s) => s.segment).slice(0, 4).join(', ')
      return `${idx + 1}. ${r.fullName}\nID: ${r.id}\nEmail: ${r.email || '-'}\nТелефон: ${r.phone || '-'}\nСегменты: ${segments || '-'}`
    })
    .join('\n\n')
}

function formatPricingResult(rows, askChildSeat = false) {
  if (!rows.length) {
    return buildCopilotMessage([
      'Вижу такую информацию: данных по прайсу в этом городе нет.',
      'Источник: прайс-лист Riderra.',
      'Статус: подтверждённых записей не найдено.'
    ])
  }
  return rows
    .map((r, i) => {
      const priceText = [
        r.fixedPrice !== null && r.fixedPrice !== undefined ? `фикс: ${r.fixedPrice} ${r.currency}` : null,
        r.pricePerKm !== null && r.pricePerKm !== undefined ? `км: ${r.pricePerKm} ${r.currency}` : null,
        r.hourlyRate !== null && r.hourlyRate !== undefined ? `час: ${r.hourlyRate} ${r.currency}` : null,
        r.childSeatPrice !== null && r.childSeatPrice !== undefined ? `кресло: ${r.childSeatPrice} ${r.currency}` : null
      ].filter(Boolean).join(', ')
      if (askChildSeat && r.childSeatPrice === null) {
        return `${i + 1}. ${r.city}: данных по креслу нет`
      }
      return `${i + 1}. ${r.city}${r.routeFrom && r.routeTo ? ` (${r.routeFrom} -> ${r.routeTo})` : ''}: ${priceText || 'цена не заполнена'}`
    })
    .join('\n')
}

app.post('/api/admin/telegram-links', authenticateToken, resolveActorContext, requireActorContext, requireCan('telegram.links.manage', 'telegram_link'), async (req, res) => {
  try {
    const { email, telegramUserId, telegramChatId } = req.body
    if (!email || !telegramUserId) {
      return res.status(400).json({ error: 'email and telegramUserId are required' })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return res.status(404).json({ error: 'User not found' })

    const link = await prisma.telegramLink.upsert({
      where: { telegramUserId: String(telegramUserId) },
      update: {
        userId: user.id,
        tenantId: req.actorContext.tenantId,
        telegramChatId: telegramChatId ? String(telegramChatId) : null
      },
      create: {
        tenantId: req.actorContext.tenantId,
        userId: user.id,
        telegramUserId: String(telegramUserId),
        telegramChatId: telegramChatId ? String(telegramChatId) : null
      }
    })

    res.json({ success: true, link })
  } catch (error) {
    console.error('Error creating telegram link:', error)
    res.status(500).json({ error: 'Failed to create telegram link' })
  }
})

app.get('/api/admin/telegram-links', authenticateToken, resolveActorContext, requireActorContext, requireCan('settings.manage', 'setting'), async (req, res) => {
  try {
    const rows = await prisma.telegramLink.findMany({
      where: { tenantId: req.actorContext.tenantId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 500
    })
    res.json({ rows })
  } catch (error) {
    console.error('Error fetching telegram links:', error)
    res.status(500).json({ error: 'Failed to fetch telegram links' })
  }
})

app.get('/api/admin/staff-users', authenticateToken, resolveActorContext, requireActorContext, requireCan('settings.manage', 'setting'), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        role: { not: 'driver' },
        memberships: {
          some: {
            tenantId: req.actorContext.tenantId,
            isActive: true
          }
        }
      },
      include: {
        roleLinks: {
          include: {
            role: {
              select: { code: true, name: true }
            }
          }
        },
        telegramLinks: {
          where: { tenantId: req.actorContext.tenantId },
          select: {
            telegramUserId: true,
            telegramChatId: true
          }
        }
      },
      orderBy: { email: 'asc' },
      take: 500
    })

    const rows = users.map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      roles: u.roleLinks.map((x) => x.role.code),
      telegramLinks: u.telegramLinks,
      abacCountries: parseScopeList(u.abacCountries),
      abacCities: parseScopeList(u.abacCities),
      abacTeams: parseScopeList(u.abacTeams)
    }))

    res.json({ rows })
  } catch (error) {
    console.error('Error fetching staff users:', error)
    res.status(500).json({ error: 'Failed to fetch staff users' })
  }
})

app.put('/api/admin/staff-users/:userId/abac', authenticateToken, resolveActorContext, requireActorContext, requireCan('settings.manage', 'setting'), async (req, res) => {
  try {
    const userId = String(req.params.userId || '').trim()
    if (!userId) return res.status(400).json({ error: 'Invalid user id' })

    const membership = await prisma.tenantMembership.findFirst({
      where: {
        userId,
        tenantId: req.actorContext.tenantId,
        isActive: true
      },
      select: { id: true }
    })
    if (!membership) return res.status(404).json({ error: 'User is not active in tenant' })

    const countries = parseScopeList(req.body?.countries)
    const cities = parseScopeList(req.body?.cities)
    const teams = parseScopeList(req.body?.teams)

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        abacCountries: countries.join(','),
        abacCities: cities.join(','),
        abacTeams: teams.join(',')
      },
      select: {
        id: true,
        email: true,
        abacCountries: true,
        abacCities: true,
        abacTeams: true
      }
    })

    await writeAuditLog({
      tenantId: req.actorContext.tenantId,
      actorId: req.actorContext.actorId,
      actorRole: req.actorContext.actorRole,
      action: 'settings.staff_abac.update',
      resource: 'user',
      resourceId: updated.id,
      traceId: req.actorContext.traceId,
      decision: 'policy_allowed',
      result: 'ok',
      context: {
        countries,
        cities,
        teams
      }
    })

    res.json({
      user: {
        id: updated.id,
        email: updated.email,
        abacCountries: parseScopeList(updated.abacCountries),
        abacCities: parseScopeList(updated.abacCities),
        abacTeams: parseScopeList(updated.abacTeams)
      }
    })
  } catch (error) {
    console.error('Error updating staff ABAC:', error)
    res.status(500).json({ error: 'Failed to update staff ABAC' })
  }
})

app.post('/api/telegram/webhook', resolveActorContext, requireActorContext, async (req, res) => {
  try {
    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET
    if (webhookSecret) {
      const receivedSecret = req.headers['x-telegram-bot-api-secret-token']
      if (receivedSecret !== webhookSecret) {
        return res.status(403).json({ error: 'Invalid telegram webhook secret' })
      }
    }

    const update = req.body || {}
    const message = update.message || update.edited_message
    if (!message || !message.text) return res.json({ ok: true })

    const telegramUserId = String(message.from?.id || '')
    const telegramChatId = String(message.chat?.id || '')
    if (!telegramUserId || !telegramChatId) return res.json({ ok: true })
    const tenantId = req.actorContext.tenantId
    const text = String(message.text || '').trim()
    const chatType = String(message.chat?.type || '')
    const isGroupChat = chatType === 'group' || chatType === 'supergroup'

    // Group chat mode: bot listens and can answer queries from shared knowledge.
    if (isGroupChat) {
      const allowedGroupId = process.env.TELEGRAM_GROUP_CHAT_ID
      if (text === '/chatid') {
        await telegramSendMessage(
          telegramChatId,
          buildCopilotMessage([
            `Текущий chat_id: ${telegramChatId}`,
            'Источник: Telegram metadata.',
            'Статус: сервисная информация.'
          ])
        )
        return res.json({ ok: true })
      }
      if (allowedGroupId && allowedGroupId !== telegramChatId) {
        return res.json({ ok: true })
      }

      if (isImportantMessage(text)) {
        const authorName = [
          String(message.from?.first_name || '').trim(),
          String(message.from?.last_name || '').trim()
        ].filter(Boolean).join(' ') || String(message.from?.username || '').trim() || telegramUserId
        const messageDate = message.date ? new Date(Number(message.date) * 1000).toISOString() : null
        const draft = await saveOpsDraftFromTelegram({
          tenantId,
          chatId: telegramChatId,
          telegramUserId,
          text,
          authorName,
          messageDate
        })
        await telegramSendMessage(
          telegramChatId,
          buildCopilotMessage([
            `Сохранил важное сообщение как черновик #${draft.id}.`,
            `Источник: комментарий сотрудника "${authorName}", ${formatUtcDateTime(messageDate)}.`,
            'Статус: не аппрувнуто в постоянную базу. После проверки можно утвердить в Riderra.'
          ])
        )
      }

      const pricingQuery = text.match(/(?:цена|стоимость|прайс)\s+в\s+([A-Za-zА-Яа-яЁё\-\s]+)/i)
      const childSeatQuery = text.match(/(?:кресл|детск).*?\s+в\s+([A-Za-zА-Яа-яЁё\-\s]+)/i)

      if (pricingQuery || childSeatQuery || text.startsWith('/price ') || text.startsWith('/childseat ')) {
        const cityCandidate = pricingQuery?.[1] ||
          childSeatQuery?.[1] ||
          text.replace('/price', '').replace('/childseat', '').trim()

        const city = String(cityCandidate || '').trim()
        if (!city) {
          await telegramSendMessage(telegramChatId, 'Укажи город: /price <город> или /childseat <город>')
          return res.json({ ok: true })
        }

        const rows = await prisma.cityPricing.findMany({
          where: {
            tenantId,
            isActive: true,
            city: { contains: city, mode: 'insensitive' }
          },
          take: 5,
          orderBy: { updatedAt: 'desc' }
        })
        const answer = formatPricingResult(
          rows,
          Boolean(childSeatQuery || text.startsWith('/childseat '))
        )
        if (answer.startsWith('Я помощник Riderra')) {
          await telegramSendMessage(telegramChatId, answer)
          return res.json({ ok: true })
        }
        const sourceLines = rows.map((r, idx) =>
          `${idx + 1}) ${r.city}${r.routeFrom && r.routeTo ? ` (${r.routeFrom} -> ${r.routeTo})` : ''} | источник: ${sourceLabel(r.source)} | обновлено: ${formatUtcDateTime(r.updatedAt)}`
        ).join('\n')
        await telegramSendMessage(
          telegramChatId,
          buildCopilotMessage([
            `Вижу такую информацию:\n${answer}`,
            `Источник:\n${sourceLines || 'прайс-лист Riderra'}`,
            'Статус: данные из подтверждённого прайс-листа.'
          ])
        )
        return res.json({ ok: true })
      }

      if (text.startsWith('/help')) {
        await telegramSendMessage(
          telegramChatId,
          buildCopilotMessage([
            'Команды: /price <город>, /childseat <город>, /customer <запрос>, /company <запрос>.',
            'Важные сообщения: #важно ... или "водитель ... в отпуске/недоступен с ... по ...".',
            'В ответах показываю источник и статус (подтверждено/не аппрувнуто).'
          ])
        )
      }

      return res.json({ ok: true })
    }

    const link = await prisma.telegramLink.findUnique({
      where: { telegramUserId },
      include: { user: true }
    })
    if (!link) {
      await telegramSendMessage(telegramChatId, 'Этот Telegram аккаунт не привязан к Riderra. Обратитесь к администратору.')
      return res.json({ ok: true })
    }
    const linkTenantId = link.tenantId || tenantId

    const acl = await getUserRolesAndPermissions(link.userId)
    const actor = {
      role: link.user.role,
      actorRole: link.user.role,
      permissions: acl.permissions || [],
      tenantId: linkTenantId
    }
    const canReadCrm = can(actor, 'permission.check', 'permission', {
      permissionCode: 'crm.read',
      tenantId: linkTenantId
    })
    const canUseOpsCopilot = can(actor, 'permission.check', 'permission', {
      anyOf: [
        'ops.read',
        'ops.manage',
        'orders.create_draft',
        'orders.validate',
        'orders.assign',
        'orders.reassign',
        'orders.confirmation.manage',
        'incidents.manage',
        'claims.compose'
      ],
      tenantId: linkTenantId
    })
    const canUseFinanceReports = can(actor, 'permission.check', 'permission', {
      anyOf: ['finance.report.export', 'reconciliation.run'],
      tenantId: linkTenantId
    })

    if (canUseOpsCopilot) {
      const lowerText = text.toLowerCase()

      if (text.startsWith('/tasks')) {
        const tasks = await getOpenOpsTasksForUser(link.userId, linkTenantId)
        await telegramSendMessage(
          telegramChatId,
          buildCopilotMessage([
            `Вижу такие задачи:\n${formatOpsTasks(tasks)}`,
            'Источник: оперативные задачи Riderra.',
            'Статус: актуально на текущий момент.'
          ])
        )
        return res.json({ ok: true })
      }

      if (text.startsWith('/task-done ')) {
        const taskId = text.replace('/task-done', '').trim()
        if (!taskId) {
          await telegramSendMessage(telegramChatId, buildCopilotMessage(['Формат: /task-done <task_id>']))
          return res.json({ ok: true })
        }
        const task = await prisma.opsTask.findFirst({
          where: { id: taskId, assignedUserId: link.userId, tenantId: linkTenantId }
        })
        if (!task) {
          await telegramSendMessage(telegramChatId, buildCopilotMessage([`Задача ${taskId} не найдена у вас.`]))
          return res.json({ ok: true })
        }
        await prisma.opsTask.update({
          where: { id: taskId },
          data: { status: 'done' }
        })
        await telegramSendMessage(
          telegramChatId,
          buildCopilotMessage([
            `Отметил задачу ${taskId} как выполненную.`,
            'Источник: ваш запрос в личном чате.',
            'Статус: сохранено в базе задач.'
          ])
        )
        return res.json({ ok: true })
      }

      if (text.startsWith('/report la') || lowerText.includes('отч') && lowerText.includes('лос') && lowerText.includes('анджел')) {
        if (!canUseFinanceReports) {
          await telegramSendMessage(
            telegramChatId,
            buildCopilotMessage(['Недостаточно прав для финансового отчёта. Нужна роль financial/owner.'])
          )
          return res.json({ ok: true })
        }
        const report = await buildLosAngelesFinanceSummary(linkTenantId)
        await telegramSendMessage(
          telegramChatId,
          buildCopilotMessage([
            `Вижу такую информацию по поездкам Los Angeles:`,
            `Количество поездок: ${report.count}`,
            `Сумма клиент: ${report.totalClient.toFixed(2)}`,
            `Сумма водитель: ${report.totalDriver.toFixed(2)}`,
            `Комиссия: ${report.totalCommission.toFixed(2)}`,
            'Источник: таблица заказов Riderra.',
            'Статус: оперативная сверка, проверьте финальные выплаты в бухгалтерии.'
          ])
        )
        return res.json({ ok: true })
      }

      if (lowerText.includes('нераспредел') && lowerText.includes('заказ') && lowerText.includes('хельсинки')) {
        const tomorrowStart = new Date()
        tomorrowStart.setDate(tomorrowStart.getDate() + 1)
        tomorrowStart.setHours(0, 0, 0, 0)
        const tomorrowEnd = new Date(tomorrowStart)
        tomorrowEnd.setHours(23, 59, 59, 999)

        const order = await prisma.order.findFirst({
          where: {
            tenantId: linkTenantId,
            driverId: null,
            pickupAt: { gte: tomorrowStart, lte: tomorrowEnd },
            OR: [
              { fromPoint: { contains: 'Helsinki', mode: 'insensitive' } },
              { toPoint: { contains: 'Helsinki', mode: 'insensitive' } }
            ]
          },
          orderBy: { pickupAt: 'asc' }
        })

        const task = await createOpsTask({
          tenantId: linkTenantId,
          userId: link.userId,
          type: 'assign_driver',
          priority: 'high',
          title: 'Назначить водителя на нераспределённый заказ в Helsinki',
          details: order ? `Заказ ${order.id} на ${formatUtcDateTime(order.pickupAt)}` : 'Проверить очередь нераспределённых заказов на завтра',
          dueAt: tomorrowStart,
          source: 'rule',
          payload: order ? { orderId: order.id } : null
        })

        await telegramSendMessage(
          telegramChatId,
          buildCopilotMessage([
            `Создал задачу: ${task.title} [${task.id}]`,
            `Источник: правило Riderra (нераспределённые заказы на завтра, Helsinki).`,
            'Статус: задача открыта.'
          ])
        )
        return res.json({ ok: true })
      }

      if ((lowerText.includes('новый заказ') && lowerText.includes('показать детали')) || text.startsWith('/new-order-check')) {
        const order = await prisma.order.findFirst({
          where: { tenantId: linkTenantId, status: { in: ['pending', 'assigned', 'accepted'] } },
          orderBy: { createdAt: 'desc' }
        })

        if (!order) {
          await telegramSendMessage(
            telegramChatId,
            buildCopilotMessage([
              'Новых заказов для показа не нашёл.',
              'Источник: таблица заказов Riderra.',
              'Статус: пусто.'
            ])
          )
          return res.json({ ok: true })
        }

        await telegramSendMessage(
          telegramChatId,
          buildCopilotMessage([
            `Показать детали заказа?`,
            `ID: ${order.id}, подача: ${formatUtcDateTime(order.pickupAt)}`,
            `Маршрут: ${order.fromPoint} -> ${order.toPoint}`,
            `Цена клиент: ${order.clientPrice}, статус: ${order.status}`,
            `Источник: ${sourceLabel(order.source)}.`,
            'Статус: данные заказа подтверждены в Riderra.'
          ])
        )
        return res.json({ ok: true })
      }

      if ((lowerText.includes('отправили заказ') && lowerText.includes('не назначили') && lowerText.includes('easytaxi')) || text.startsWith('/easytaxi-reminder')) {
        const task = await createOpsTask({
          tenantId: linkTenantId,
          userId: link.userId,
          type: 'easytaxi_sync',
          priority: 'high',
          title: 'Проверить назначение заказа в EasyTaxi',
          details: 'Вы отправили заказ, но назначение в EasyTaxi не подтверждено.',
          source: 'rule'
        })

        await telegramSendMessage(
          telegramChatId,
          buildCopilotMessage([
            `Создал напоминание: ${task.title} [${task.id}]`,
            'Источник: правило Riderra (контроль синхронизации с EasyTaxi).',
            'Статус: задача открыта.'
          ])
        )
        return res.json({ ok: true })
      }
    }

    if (!canReadCrm && !canUseOpsCopilot) {
      await telegramSendMessage(telegramChatId, buildCopilotMessage(['Недостаточно прав для команд в личном чате.']))
      return res.json({ ok: true })
    }

    if (text.startsWith('/company')) {
      const query = text.replace('/company', '').trim()
      if (!query) {
        await telegramSendMessage(telegramChatId, 'Использование: /company <название|email|телефон>')
        return res.json({ ok: true })
      }
      const rows = await prisma.customerCompany.findMany({
        where: {
          tenantId: linkTenantId,
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
            { phone: { contains: query } }
          ]
        },
        include: { segments: true },
        take: 5
      })
      await telegramSendMessage(telegramChatId, formatCompanyResult(rows))
      return res.json({ ok: true })
    }

    if (text.startsWith('/customer')) {
      const query = text.replace('/customer', '').trim()
      if (!query) {
        await telegramSendMessage(telegramChatId, 'Использование: /customer <имя|email|телефон>')
        return res.json({ ok: true })
      }
      const rows = await prisma.customerContact.findMany({
        where: {
          tenantId: linkTenantId,
          OR: [
            { fullName: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
            { phone: { contains: query } }
          ]
        },
        include: { segments: true },
        take: 5
      })
      await telegramSendMessage(telegramChatId, formatContactResult(rows))
      return res.json({ ok: true })
    }

    if (text.startsWith('/help')) {
      await telegramSendMessage(
        telegramChatId,
        buildCopilotMessage([
          'Команды: /customer <запрос>, /company <запрос>, /tasks, /task-done <id>, /report la, /new-order-check, /easytaxi-reminder',
          'Источник: системные команды Riderra.',
          'Статус: доступно в личном чате.'
        ])
      )
      return res.json({ ok: true })
    }

    return res.json({ ok: true })
  } catch (error) {
    console.error('Telegram webhook error:', error)
    return res.json({ ok: true })
  }
})

// Получение списка городов по стране
app.get('/api/admin/city-routes/cities', authenticateToken, resolveActorContext, requireActorContext, requireCan('directions.read', 'direction', (req) => ({
  country: req.query?.country || null
})), async (req, res) => {
  try {
    const { country } = req.query
    
    if (!country) {
      return res.status(400).json({ error: 'Country parameter is required' })
    }

    const cities = await prisma.cityRoute.findMany({
      where: { 
        tenantId: req.actorContext.tenantId,
        isActive: true,
        country: country
      },
      select: { city: true },
      distinct: ['city'],
      orderBy: { city: 'asc' }
    })

    res.json(cities.map(c => c.city))
  } catch (error) {
    console.error('Error fetching cities:', error)
    res.status(500).json({ error: 'Failed to fetch cities' })
  }
})

// Создание нового маршрута
app.post('/api/admin/city-routes', authenticateToken, resolveActorContext, requireActorContext, requireCan('directions.manage', 'direction', (req) => ({
  country: req.body?.country || null,
  city: req.body?.city || null
})), async (req, res) => {
  try {
    const { country, city, fromPoint, toPoint, vehicleType, passengers, distance, targetFare, currency } = req.body

    const route = await prisma.cityRoute.create({
      data: {
        tenantId: req.actorContext.tenantId,
        country,
        city,
        fromPoint,
        toPoint,
        vehicleType,
        passengers: parseInt(passengers),
        distance: parseFloat(distance),
        targetFare: parseFloat(targetFare),
        currency: currency || 'EUR'
      }
    })

    res.json(route)
  } catch (error) {
    console.error('Error creating city route:', error)
    res.status(500).json({ error: 'Failed to create city route' })
  }
})

// Обновление маршрута
app.put('/api/admin/city-routes/:routeId', authenticateToken, resolveActorContext, requireActorContext, requireCan('directions.manage', 'direction', async (req) => {
  const row = await prisma.cityRoute.findFirst({
    where: { id: req.params.routeId, tenantId: req.actorContext.tenantId },
    select: { country: true, city: true }
  })
  return { country: req.body?.country || row?.country || null, city: req.body?.city || row?.city || null }
}), async (req, res) => {
  try {
    const { routeId } = req.params
    const { country, city, fromPoint, toPoint, vehicleType, passengers, distance, targetFare, currency, isActive } = req.body

    const updateData = {}
    if (country !== undefined) updateData.country = country
    if (city !== undefined) updateData.city = city
    if (fromPoint !== undefined) updateData.fromPoint = fromPoint
    if (toPoint !== undefined) updateData.toPoint = toPoint
    if (vehicleType !== undefined) updateData.vehicleType = vehicleType
    if (passengers !== undefined) updateData.passengers = parseInt(passengers)
    if (distance !== undefined) updateData.distance = parseFloat(distance)
    if (targetFare !== undefined) updateData.targetFare = parseFloat(targetFare)
    if (currency !== undefined) updateData.currency = currency
    if (isActive !== undefined) updateData.isActive = isActive

    const existingRoute = await prisma.cityRoute.findFirst({
      where: { id: routeId, tenantId: req.actorContext.tenantId },
      select: { id: true }
    })
    if (!existingRoute) return res.status(404).json({ error: 'Route not found' })

    const route = await prisma.cityRoute.update({
      where: { id: existingRoute.id },
      data: updateData
    })

    res.json(route)
  } catch (error) {
    console.error('Error updating city route:', error)
    res.status(500).json({ error: 'Failed to update city route' })
  }
})

// Удаление маршрута (мягкое удаление)
app.delete('/api/admin/city-routes/:routeId', authenticateToken, resolveActorContext, requireActorContext, requireCan('directions.manage', 'direction', async (req) => {
  const row = await prisma.cityRoute.findFirst({
    where: { id: req.params.routeId, tenantId: req.actorContext.tenantId },
    select: { country: true, city: true }
  })
  return { country: row?.country || null, city: row?.city || null }
}), async (req, res) => {
  try {
    const { routeId } = req.params

    const existingRoute = await prisma.cityRoute.findFirst({
      where: { id: routeId, tenantId: req.actorContext.tenantId },
      select: { id: true }
    })
    if (!existingRoute) return res.status(404).json({ error: 'Route not found' })

    await prisma.cityRoute.update({
      where: { id: existingRoute.id },
      data: { isActive: false }
    })

    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting city route:', error)
    res.status(500).json({ error: 'Failed to delete city route' })
  }
})

// Массовая загрузка маршрутов из CSV
app.post('/api/admin/city-routes/bulk-import', authenticateToken, resolveActorContext, requireActorContext, requireCan('directions.manage', 'direction'), async (req, res) => {
  try {
    const { routes } = req.body // Массив маршрутов из CSV

    if (!Array.isArray(routes) || routes.length === 0) {
      return res.status(400).json({ error: 'Invalid routes data' })
    }

    const results = {
      added: 0,
      skipped: 0,
      errors: []
    }

    for (let i = 0; i < routes.length; i++) {
      const route = routes[i]
      
      try {
        // Проверяем обязательные поля
        if (!route.country || !route.city || !route.fromPoint || !route.toPoint || 
            !route.vehicleType || !route.passengers || !route.distance || !route.targetFare) {
          results.errors.push({
            row: i + 1,
            error: 'Missing required fields'
          })
          results.skipped++
          continue
        }

        // Проверяем, существует ли уже такой маршрут
        const existing = await prisma.cityRoute.findFirst({
          where: {
            tenantId: req.actorContext.tenantId,
            country: route.country,
            city: route.city,
            fromPoint: route.fromPoint,
            toPoint: route.toPoint,
            vehicleType: route.vehicleType,
            isActive: true
          }
        })

        if (existing) {
          results.skipped++
          continue
        }

        // Создаем новый маршрут
        await prisma.cityRoute.create({
          data: {
            tenantId: req.actorContext.tenantId,
            country: route.country.trim(),
            city: route.city.trim(),
            fromPoint: route.fromPoint.trim(),
            toPoint: route.toPoint.trim(),
            vehicleType: route.vehicleType.trim(),
            passengers: parseInt(route.passengers) || 1,
            distance: parseFloat(route.distance) || 0,
            targetFare: parseFloat(route.targetFare) || 0,
            currency: (route.currency || 'EUR').trim().toUpperCase()
          }
        })

        results.added++
      } catch (error) {
        results.errors.push({
          row: i + 1,
          error: error.message || 'Unknown error'
        })
        results.skipped++
      }
    }

    res.json({
      success: true,
      results
    })
  } catch (error) {
    console.error('Error bulk importing routes:', error)
    res.status(500).json({ error: 'Failed to import routes' })
  }
})

// Создание админа (только для разработки)
app.post('/api/auth/create-admin', async (req, res) => {
  try {
    const { email, password } = req.body
    const setupKey = req.headers['x-setup-key'] || req.body.setupKey

    if (!process.env.ADMIN_SETUP_KEY) {
      return res.status(403).json({ error: 'Admin bootstrap is disabled' })
    }

    if (setupKey !== process.env.ADMIN_SETUP_KEY) {
      return res.status(403).json({ error: 'Invalid setup key' })
    }

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    // Проверяем, существует ли админ
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'admin' }
    })

    if (existingAdmin) {
      return res.status(400).json({ error: 'Admin already exists' })
    }

    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(password, 10)

    // Создаем админа
    const admin = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: 'admin'
      }
    })

    res.json({
      message: 'Admin created successfully',
      admin: {
        id: admin.id,
        email: admin.email,
        role: admin.role
      }
    })
  } catch (error) {
    console.error('Create admin error:', error)
    res.status(500).json({ error: 'Failed to create admin' })
  }
})
