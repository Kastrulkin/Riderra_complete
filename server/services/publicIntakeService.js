const { parseDriverCommissionRate } = require('../utils/driverPricing')

function createPublicIntakeService({
  prisma,
  normalizeText,
  ensureIdempotencyKey,
  withIdempotency,
  sendDriverRegistrationEmail
}) {
  function normalizePublicOrderRequestBody(body = {}) {
    const pickupAtRaw = normalizeText(body.pickupAt, 80)
    const passengers = body.passengers === undefined || body.passengers === null || body.passengers === ''
      ? null
      : parseInt(body.passengers, 10)
    const luggage = body.luggage === undefined || body.luggage === null || body.luggage === ''
      ? null
      : parseInt(body.luggage, 10)
    return {
      name: normalizeText(body.name, 160),
      email: normalizeText(body.email, 254),
      phone: normalizeText(body.phone, 80),
      fromPoint: normalizeText(body.fromPoint, 500),
      toPoint: normalizeText(body.toPoint, 500),
      pickupAtRaw,
      pickupAt: pickupAtRaw ? new Date(pickupAtRaw) : null,
      passengers: Number.isFinite(passengers) && passengers > 0 ? passengers : null,
      luggage: Number.isFinite(luggage) && luggage >= 0 ? luggage : null,
      comment: normalizeText(body.comment, 1500),
      lang: normalizeText(body.lang, 10) || 'en',
      extras: {
        vehicleClass: normalizeText(body.vehicleClass, 120),
        flightNumber: normalizeText(body.flightNumber, 120),
        agentName: normalizeText(body.agentName, 160),
        agentContact: normalizeText(body.agentContact, 254),
        sourceUrl: normalizeText(body.sourceUrl, 500)
      }
    }
  }

  function validatePublicOrderRequest(input) {
    const missing = ['name', 'email', 'phone', 'fromPoint', 'toPoint', 'pickupAtRaw'].filter((field) => !input[field])
    const errors = []
    if (missing.length) errors.push({ code: 'missing_required_fields', fields: missing.map((field) => field === 'pickupAtRaw' ? 'pickupAt' : field) })
    if (input.pickupAtRaw && (!input.pickupAt || Number.isNaN(input.pickupAt.getTime()))) {
      errors.push({ code: 'invalid_pickupAt', field: 'pickupAt', message: 'pickupAt must be a valid ISO 8601 date/time.' })
    }
    if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
      errors.push({ code: 'invalid_email', field: 'email' })
    }
    return {
      valid: errors.length === 0,
      errors,
      normalized: {
        ...input,
        pickupAt: input.pickupAt && !Number.isNaN(input.pickupAt.getTime()) ? input.pickupAt.toISOString() : null
      }
    }
  }

  function publicOrderRequestComment(input) {
    return [
      input.comment,
      '--- AI-agent/public request metadata ---',
      ...Object.entries(input.extras)
        .filter(([, value]) => value)
        .map(([key, value]) => `${key}: ${value}`),
      'source: AI/public API',
      'status: draft_received; not a confirmed booking; final price requires Riderra confirmation'
    ].filter(Boolean).join('\n')
  }

  function validateDraftOrderRequest(body = {}) {
    const validation = validatePublicOrderRequest(normalizePublicOrderRequestBody(body || {}))
    return {
      success: validation.valid,
      statusCode: validation.valid ? 200 : 400,
      body: {
        success: validation.valid,
        status: validation.valid ? 'valid_draft_request' : 'invalid_draft_request',
        errors: validation.errors,
        nextStep: validation.valid
          ? 'Submit the same payload to POST /api/public/order-requests. Riderra will review and confirm availability and final price.'
          : 'Fix the listed fields before submitting a draft request.'
      }
    }
  }

  async function getDraftOrderRequestStatus({ tenantId, requestId, email, phone }) {
    if (!email && !phone) {
      return {
        statusCode: 400,
        body: { error: 'contact_verification_required', message: 'Provide email or phone used in the draft request.' }
      }
    }
    const row = await prisma.request.findFirst({
      where: {
        id: requestId,
        tenantId,
        ...(email ? { email } : { phone })
      }
    })
    if (!row) return { statusCode: 404, body: { error: 'request_not_found' } }
    return {
      statusCode: 200,
      body: {
        success: true,
        requestId: row.id,
        status: 'draft_received',
        createdAt: row.createdAt,
        nextStep: 'Riderra will review and confirm availability and final price.',
        confirmedBooking: false,
        finalPriceConfirmed: false
      }
    }
  }

  async function createDraftOrderRequest(req) {
    const input = normalizePublicOrderRequestBody(req.body || {})
    const validation = validatePublicOrderRequest(input)
    if (!validation.valid) {
      return { statusCode: 400, body: { error: 'invalid_draft_request', errors: validation.errors } }
    }
    ensureIdempotencyKey(req, 'public.order_request.create', {
      name: input.name,
      email: input.email,
      phone: input.phone,
      fromPoint: input.fromPoint,
      toPoint: input.toPoint,
      pickupAt: input.pickupAt.toISOString()
    })
    const wrapped = await withIdempotency(req, 'public.order_request.create', validation.normalized, async () => {
      const created = await prisma.request.create({
        data: {
          tenantId: req.actorContext.tenantId,
          name: input.name,
          email: input.email,
          phone: input.phone,
          fromPoint: input.fromPoint,
          toPoint: input.toPoint,
          date: input.pickupAt,
          passengers: input.passengers,
          luggage: input.luggage,
          comment: publicOrderRequestComment(input).slice(0, 2000),
          lang: input.lang
        }
      })
      return {
        requestId: created.id,
        status: 'draft_received',
        nextStep: 'Riderra will review and confirm availability and final price.',
        confirmedBooking: false,
        finalPriceConfirmed: false
      }
    })

    return {
      statusCode: wrapped.replayed ? 200 : 201,
      body: {
        success: true,
        ...wrapped.data,
        idempotent: wrapped.replayed
      }
    }
  }

  async function createPublicRequest({ tenantId, body = {} }) {
    const { name, email, phone, fromPoint, toPoint, date, passengers, luggage, comment, lang } = body
    return prisma.request.create({ data: {
      tenantId,
      name: normalizeText(name, 160),
      email: normalizeText(email, 254),
      phone: normalizeText(phone, 80),
      fromPoint: normalizeText(fromPoint, 500),
      toPoint: normalizeText(toPoint, 500),
      date: date ? new Date(date) : null,
      passengers: passengers ?? null,
      luggage: luggage ?? null,
      comment: normalizeText(comment, 2000),
      lang: normalizeText(lang, 10)
    }})
  }

  async function createDriverApplication({ tenantId, body = {} }) {
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
    } = body

    const normalizedCommissionRate = parseDriverCommissionRate(commissionRate)

    const created = await prisma.driver.create({ data: {
      tenantId,
      name: normalizeText(name, 160),
      email: normalizeText(email, 254),
      phone: normalizeText(phone, 80),
      country: normalizeText(country, 120),
      city: normalizeText(city, 160),
      fixedRoutesJson: fixedRoutesJson || (fixedRoutes ? JSON.stringify(fixedRoutes) : null),
      pricePerKm: normalizeText(pricePerKm, 80),
      kmRate: kmRate !== undefined && kmRate !== null && kmRate !== '' ? parseFloat(kmRate) : null,
      hourlyRate: hourlyRate !== undefined && hourlyRate !== null && hourlyRate !== '' ? parseFloat(hourlyRate) : null,
      childSeatPrice: childSeatPrice !== undefined && childSeatPrice !== null && childSeatPrice !== '' ? parseFloat(childSeatPrice) : null,
      pricingCurrency: pricingCurrency ? String(pricingCurrency) : null,
      comment: normalizeText(comment, 2000),
      lang: normalizeText(lang, 10),
      commissionRate: normalizedCommissionRate
    }})

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
        name: normalizeText(name, 160),
        email: normalizeText(email, 254),
        phone: normalizeText(phone, 80),
        city: normalizeText(city, 160),
        pricePerKm: normalizeText(pricePerKm, 80),
        commissionRate: normalizedCommissionRate,
        routes: routesData,
        comment: normalizeText(comment, 2000),
        lang: normalizeText(lang, 10) || 'ru'
      })
      if (emailSent) {
        console.info('Driver registration notification email sent')
      } else {
        console.warn('Email not sent (SMTP not configured)')
      }
    } catch (emailError) {
      console.error('Error sending email (non-blocking):', emailError)
    }

    return created
  }

  return {
    createDraftOrderRequest,
    createDriverApplication,
    createPublicRequest,
    getDraftOrderRequestStatus,
    validateDraftOrderRequest
  }
}

module.exports = {
  createPublicIntakeService
}
