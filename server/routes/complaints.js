const crypto = require('crypto')
const bodyParser = require('body-parser')
const {
  complaintCategory,
  complaintSeverity,
  composeComplaintResponse,
  extractDateHints,
  extractEmailAddress,
  extractOrderReferences,
  investigationChecklist,
  isComplaintEmail,
  normalizeInvestigation,
  parseJson,
  scoreOrderCandidate,
  summarizeComplaint
} = require('../utils/complaints')

const ACTIVE_STATUSES = ['new', 'needs_match', 'investigating', 'waiting_info', 'response_ready', 'response_sent']
const STATUS_VIEWS = {
  new: ['new', 'needs_match'],
  working: ['investigating'],
  waiting: ['waiting_info'],
  ready: ['response_ready', 'response_sent'],
  closed: ['closed']
}

function actorId(req) { return req.actorContext?.actorId || req.user?.id || null }
function actorEmail(req) { return req.user?.email || null }
function decodeHeader(value, fallback) {
  try { return decodeURIComponent(String(value || fallback || '')) } catch (_) { return String(fallback || '') }
}
function actorPermissions(req) { return new Set(req.actorContext?.permissions || req.user?.permissions || []) }
function canManage(req) {
  const permissions = actorPermissions(req)
  return req.actorContext?.actorRole === 'owner' || req.user?.role === 'admin' || ['*', 'incidents.manage', 'claims.compose', 'ops.drafts.resolve', 'ops.manage', 'approvals.resolve'].some(value => permissions.has(value))
}

function publicRule(rule) {
  if (!rule) return null
  return {
    ...rule,
    requiredActions: parseJson(rule.requiredActionsJson, []),
    approvedStatements: parseJson(rule.approvedStatementsJson, []),
    prohibitedStatements: parseJson(rule.prohibitedStatementsJson, []),
    requiredActionsJson: undefined,
    approvedStatementsJson: undefined,
    prohibitedStatementsJson: undefined
  }
}

function complaintWhere(view, query) {
  const statuses = STATUS_VIEWS[view] || ACTIVE_STATUSES
  const search = String(query || '').trim()
  return {
    status: { in: statuses },
    ...(search ? {
      OR: [
        { subject: { contains: search, mode: 'insensitive' } },
        { summary: { contains: search, mode: 'insensitive' } },
        { complainantEmail: { contains: search, mode: 'insensitive' } },
        { order: { is: { OR: [
          { sourceOrderNumber: { contains: search, mode: 'insensitive' } },
          { sourceBookingId: { contains: search, mode: 'insensitive' } },
          { sourceInternalOrderNumber: { contains: search, mode: 'insensitive' } }
        ] } } }
      ]
    } : {})
  }
}

async function findComplaintOrder(prisma, tenantId, text) {
  const references = extractOrderReferences(text)
  const dateHints = extractDateHints(text)
  const refWhere = references.length ? {
    OR: references.flatMap(reference => [
      { sourceOrderNumber: { contains: reference, mode: 'insensitive' } },
      { sourceBookingId: { contains: reference, mode: 'insensitive' } },
      { sourceInternalOrderNumber: { contains: reference, mode: 'insensitive' } }
    ])
  } : null
  const dateWhere = dateHints.length ? {
    pickupAt: {
      gte: new Date(Date.UTC(Math.min(...dateHints.map(item => item.year)), 0, 1)),
      lte: new Date(Date.UTC(Math.max(...dateHints.map(item => item.year)) + 1, 0, 2))
    }
  } : null
  const candidates = await prisma.order.findMany({
    where: { tenantId, ...(refWhere || dateWhere || { id: '__none__' }) },
    include: { changeLogs: { orderBy: { createdAt: 'desc' }, take: 20 } },
    take: 80
  })
  const scored = candidates.map(order => {
    let result = scoreOrderCandidate(order, { references, dateHints, routeText: text })
    for (const change of order.changeLogs || []) {
      const before = parseJson(change.beforeJson, {})
      const history = scoreOrderCandidate({ ...order, pickupAt: before.pickupAt || order.pickupAt }, { references, dateHints, routeText: text })
      if (history.score > result.score) result = { ...history, reasons: [...history.reasons, 'прежнее время подачи'] }
    }
    return { order, ...result }
  }).sort((a, b) => b.score - a.score)
  const best = scored[0]
  const second = scored[1]
  const unambiguous = best && best.score >= 70 && (!second || best.score - second.score >= 15)
  return {
    order: unambiguous ? best.order : null,
    confidence: best ? Math.min(best.score / 100, 1) : 0,
    reason: best?.reasons?.join(', ') || null,
    candidates: scored.slice(0, 5).map(item => ({
      id: item.order.id,
      orderNumber: item.order.sourceOrderNumber || item.order.sourceBookingId || item.order.sourceInternalOrderNumber,
      pickupAt: item.order.pickupAt,
      fromPoint: item.order.fromPoint,
      toPoint: item.order.toPoint,
      score: item.score,
      reason: item.reasons.join(', ')
    }))
  }
}

async function activeRuleForOrder(prisma, tenantId, order) {
  if (!order?.counterpartyName) return null
  return prisma.counterpartyComplaintRule.findFirst({
    where: { tenantId, counterpartyName: { equals: order.counterpartyName, mode: 'insensitive' }, isActive: true },
    orderBy: { version: 'desc' }
  })
}

async function ingestComplaintEmail({ prisma, tenantId, rawText, subject, fromEmail, toEmail, externalMessageId, externalThreadId, rfcMessageId, sourceDraftId, attachments = [], createOpsTask }) {
  if (!isComplaintEmail({ subject, rawText })) return { complaint: false }
  if (externalMessageId) {
    const existing = await prisma.complaintMessage.findFirst({ where: { tenantId, externalMessageId }, include: { complaint: true } })
    if (existing) return { complaint: true, idempotent: true, case: existing.complaint }
  }
  const matching = await findComplaintOrder(prisma, tenantId, `${subject || ''}\n${rawText || ''}`)
  const threadId = externalThreadId || externalMessageId || `manual-${crypto.randomUUID()}`
  const now = new Date()
  const existingCase = externalThreadId ? await prisma.complaintCase.findFirst({ where: { tenantId, externalThreadId } }) : null
  const rule = matching.order ? await activeRuleForOrder(prisma, tenantId, matching.order) : null
  const complaint = existingCase || await prisma.complaintCase.create({
    data: {
      tenantId,
      orderId: matching.order?.id || null,
      sourceDraftId: sourceDraftId || null,
      source: 'email',
      externalThreadId: threadId,
      complainantEmail: extractEmailAddress(fromEmail),
      complainantName: String(fromEmail || '').replace(/<[^>]+>/g, '').trim() || null,
      subject: subject || null,
      summary: summarizeComplaint({ subject, rawText }),
      category: complaintCategory(`${subject || ''}\n${rawText || ''}`),
      severity: complaintSeverity(`${subject || ''}\n${rawText || ''}`),
      status: matching.order ? 'new' : 'needs_match',
      firstResponseDueAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      matchConfidence: matching.confidence,
      matchReason: matching.reason,
      aiAnalysisJson: JSON.stringify({ source: 'rules', candidates: matching.candidates, generatedAt: now.toISOString() }),
      contractRuleId: rule?.id || null
    }
  })
  await prisma.complaintMessage.create({
    data: {
      tenantId,
      complaintId: complaint.id,
      direction: 'inbound',
      externalMessageId: externalMessageId || null,
      externalThreadId: threadId,
      sender: fromEmail || null,
      recipientsJson: JSON.stringify([toEmail].filter(Boolean)),
      subject: subject || null,
      bodyText: rawText,
      attachmentsJson: attachments.length ? JSON.stringify(attachments) : null,
      providerMessageId: rfcMessageId || null,
      deliveryStatus: 'received'
    }
  })
  await prisma.complaintActivity.create({
    data: { tenantId, complaintId: complaint.id, type: existingCase ? 'email_received' : 'created', title: existingCase ? 'Получено новое письмо' : 'Жалоба зарегистрирована', details: subject || fromEmail || null }
  })
  if (!existingCase && createOpsTask) {
    await createOpsTask({
      tenantId,
      userId: null,
      title: `Новая жалоба${matching.order ? ` по заказу ${matching.order.sourceOrderNumber || matching.order.sourceBookingId || ''}` : ''}`.trim(),
      details: summarizeComplaint({ subject, rawText }),
      type: 'complaint_new',
      priority: complaint.severity === 'critical' ? 'urgent' : complaint.severity === 'high' ? 'high' : 'normal',
      source: 'email_ingest',
      sourceRef: complaint.id,
      dueAt: complaint.firstResponseDueAt,
      dedupKey: `complaint-new:${complaint.id}`,
      linkUrl: `/admin-complaints?complaintId=${complaint.id}`,
      payload: { complaintId: complaint.id, orderId: complaint.orderId }
    })
  }
  return { complaint: true, idempotent: false, case: complaint, matching }
}

function registerComplaintRoutes(app, dependencies) {
  const { prisma, authenticateToken, resolveActorContext, requireActorContext, requireCan, createOpsTask, transporter, emailFrom, createMediaUrl, uploadMedia } = dependencies
  const read = [authenticateToken, resolveActorContext, requireActorContext, requireCan('orders.read', 'order')]
  let slaTimer = null

  async function loadCase(req, res, include = {}) {
    const complaint = await prisma.complaintCase.findFirst({ where: { id: req.params.id, tenantId: req.actorContext.tenantId }, ...include })
    if (!complaint) { res.status(404).json({ error: 'Жалоба не найдена' }); return null }
    return complaint
  }
  async function allowWrite(req, res, complaint, allowTake = false) {
    if (!canManage(req)) { res.status(403).json({ error: 'Недостаточно прав для изменения жалобы' }); return false }
    if (complaint.assignedToUserId && complaint.assignedToUserId !== actorId(req) && !actorPermissions(req).has('incidents.manage') && !actorPermissions(req).has('approvals.resolve') && req.user?.role !== 'admin') {
      res.status(403).json({ error: 'Жалобу ведёт другой сотрудник' }); return false
    }
    if (!allowTake && !complaint.assignedToUserId) { res.status(409).json({ error: 'Сначала возьмите жалобу в работу' }); return false }
    return true
  }
  async function activity(req, complaintId, type, title, details, metadata) {
    return prisma.complaintActivity.create({ data: { tenantId: req.actorContext.tenantId, complaintId, type, title, details: details || null, actorUserId: actorId(req), actorEmail: actorEmail(req), metadataJson: metadata ? JSON.stringify(metadata) : null } })
  }

  app.get('/api/admin/complaints/counts', ...read, async (req, res) => {
    ensureSlaTimer()
    const tenantId = req.actorContext.tenantId
    const now = new Date()
    const [newCount, overdue, total] = await Promise.all([
      prisma.complaintCase.count({ where: { tenantId, status: { in: ['new', 'needs_match'] } } }),
      prisma.complaintCase.count({ where: { tenantId, firstRespondedAt: null, status: { not: 'closed' }, firstResponseDueAt: { lt: now } } }),
      prisma.complaintCase.count({ where: { tenantId, status: { in: ACTIVE_STATUSES } } })
    ])
    res.json({ new: newCount, overdue, total })
  })

  app.get('/api/admin/complaints', ...read, async (req, res) => {
    const tenantId = req.actorContext.tenantId
    const rows = await prisma.complaintCase.findMany({
      where: { tenantId, ...complaintWhere(String(req.query.view || 'new'), req.query.search) },
      include: {
        order: { select: { id: true, sourceOrderNumber: true, sourceBookingId: true, sourceInternalOrderNumber: true, pickupAt: true, fromPoint: true, toPoint: true, counterpartyName: true, driverNameRaw: true } },
        assignedToUser: { select: { id: true, email: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 }
      },
      orderBy: [{ firstResponseDueAt: 'asc' }, { updatedAt: 'desc' }],
      take: Math.min(Number(req.query.limit || 200), 500)
    })
    res.json({ complaints: rows, now: new Date().toISOString() })
  })

  app.get('/api/admin/complaints/:id', ...read, async (req, res) => {
    const complaint = await loadCase(req, res, { include: {
      assignedToUser: { select: { id: true, email: true } },
      contractRule: true,
      messages: { orderBy: { createdAt: 'asc' } },
      activities: { orderBy: { createdAt: 'asc' } },
      evidence: { orderBy: { createdAt: 'asc' } },
      order: { include: {
        driver: true,
        changeLogs: { orderBy: { createdAt: 'asc' } },
        statusHistory: { orderBy: { createdAt: 'asc' } },
        sourceHistory: { orderBy: { createdAt: 'desc' }, take: 3 },
        chatTasks: { include: { messages: { orderBy: { createdAt: 'asc' } } }, orderBy: { updatedAt: 'desc' } },
        providerTripEvents: { orderBy: { occurredAt: 'asc' } }
      } }
    } })
    if (!complaint) return
    const analysis = parseJson(complaint.aiAnalysisJson, {})
    const canSupervise = req.actorContext?.actorRole === 'owner' || req.user?.role === 'admin' || actorPermissions(req).has('incidents.manage') || actorPermissions(req).has('approvals.resolve') || actorPermissions(req).has('*')
    const canEditRules = req.actorContext?.actorRole === 'owner' || req.user?.role === 'admin' || actorPermissions(req).has('*')
    res.json({ complaint: { ...complaint, contractRule: publicRule(complaint.contractRule), investigation: normalizeInvestigation(complaint.investigationJson), missingInvestigation: investigationChecklist(complaint.investigationJson, publicRule(complaint.contractRule) || {}), matchCandidates: Array.isArray(analysis.candidates) ? analysis.candidates : [], canSupervise, canEditRules } })
  })

  app.post('/api/admin/complaints', ...read, async (req, res) => {
    if (!canManage(req)) return res.status(403).json({ error: 'Недостаточно прав для создания жалобы' })
    const order = req.body.orderId ? await prisma.order.findFirst({ where: { id: String(req.body.orderId), tenantId: req.actorContext.tenantId } }) : null
    if (req.body.orderId && !order) return res.status(404).json({ error: 'Заказ не найден' })
    const rule = await activeRuleForOrder(prisma, req.actorContext.tenantId, order)
    const complaint = await prisma.complaintCase.create({ data: {
      tenantId: req.actorContext.tenantId,
      orderId: order?.id || null,
      source: String(req.body.source || 'manual'),
      complainantName: String(req.body.complainantName || '').trim() || null,
      complainantEmail: extractEmailAddress(req.body.complainantEmail),
      subject: String(req.body.subject || '').trim() || null,
      summary: String(req.body.summary || '').trim() || 'Жалоба создана сотрудником',
      category: String(req.body.category || 'other'),
      severity: String(req.body.severity || 'normal'),
      status: order ? 'new' : 'needs_match',
      createdByUserId: actorId(req),
      firstResponseDueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      contractRuleId: rule?.id || null
    } })
    await activity(req, complaint.id, 'created', 'Жалоба создана сотрудником', complaint.summary)
    res.status(201).json({ complaint })
  })

  app.post('/api/admin/complaints/:id/take', ...read, async (req, res) => {
    const complaint = await loadCase(req, res)
    if (!complaint || !(await allowWrite(req, res, complaint, true))) return
    const updated = await prisma.complaintCase.update({ where: { id: complaint.id }, data: { assignedToUserId: actorId(req), status: complaint.status === 'new' ? 'investigating' : complaint.status } })
    await activity(req, complaint.id, 'assigned', 'Жалоба взята в работу', actorEmail(req))
    res.json({ complaint: updated })
  })

  app.patch('/api/admin/complaints/:id', ...read, async (req, res) => {
    const complaint = await loadCase(req, res)
    if (!complaint || !(await allowWrite(req, res, complaint))) return
    const allowedStatuses = [...ACTIVE_STATUSES, 'closed']
    const nextStatus = req.body.status ? String(req.body.status) : complaint.status
    if (!allowedStatuses.includes(nextStatus)) return res.status(400).json({ error: 'Неизвестный статус жалобы' })
    const supervisor = req.actorContext?.actorRole === 'owner' || req.user?.role === 'admin' || actorPermissions(req).has('incidents.manage') || actorPermissions(req).has('approvals.resolve') || actorPermissions(req).has('*')
    if ((nextStatus === 'closed' || (req.body.isEscalated != null && Boolean(req.body.isEscalated) !== complaint.isEscalated)) && !supervisor) return res.status(403).json({ error: 'Закрыть или эскалировать жалобу может только руководитель' })
    const updated = await prisma.complaintCase.update({ where: { id: complaint.id }, data: {
      status: nextStatus,
      isEscalated: req.body.isEscalated == null ? complaint.isEscalated : Boolean(req.body.isEscalated),
      resolution: req.body.resolution == null ? complaint.resolution : String(req.body.resolution).trim() || null,
      closedAt: nextStatus === 'closed' ? new Date() : null
    } })
    await activity(req, complaint.id, 'status_changed', `Статус: ${nextStatus}`, req.body.resolution)
    res.json({ complaint: updated })
  })

  app.post('/api/admin/complaints/:id/match', ...read, async (req, res) => {
    const complaint = await loadCase(req, res)
    if (!complaint || !(await allowWrite(req, res, complaint))) return
    const order = await prisma.order.findFirst({ where: { id: String(req.body.orderId || ''), tenantId: req.actorContext.tenantId } })
    if (!order) return res.status(404).json({ error: 'Заказ не найден' })
    const rule = await activeRuleForOrder(prisma, req.actorContext.tenantId, order)
    const updated = await prisma.complaintCase.update({ where: { id: complaint.id }, data: { orderId: order.id, contractRuleId: rule?.id || null, status: complaint.status === 'needs_match' ? 'investigating' : complaint.status, matchConfidence: 1, matchReason: 'Выбрано сотрудником' } })
    await activity(req, complaint.id, 'matched', 'Жалоба связана с заказом', order.sourceOrderNumber || order.sourceBookingId || order.id)
    res.json({ complaint: updated })
  })

  app.post('/api/admin/complaints/:id/investigation', ...read, async (req, res) => {
    const complaint = await loadCase(req, res, { include: { contractRule: true } })
    if (!complaint || !(await allowWrite(req, res, complaint))) return
    const investigation = normalizeInvestigation(req.body)
    const rule = publicRule(complaint.contractRule) || {}
    const missing = investigationChecklist(investigation, rule)
    const updated = await prisma.complaintCase.update({ where: { id: complaint.id }, data: { investigationJson: JSON.stringify(investigation), missingInfoJson: JSON.stringify(missing) } })
    await activity(req, complaint.id, 'investigation_updated', 'Хронология расследования обновлена', missing.length ? `Осталось заполнить: ${missing.join(', ')}` : 'Обязательные факты собраны')
    res.json({ complaint: updated, investigation, missing })
  })

  app.post('/api/admin/complaints/:id/notes', ...read, async (req, res) => {
    const complaint = await loadCase(req, res)
    if (!complaint || !(await allowWrite(req, res, complaint))) return
    const text = String(req.body.text || '').trim()
    if (!text) return res.status(400).json({ error: 'Введите заметку' })
    const row = await activity(req, complaint.id, 'note', 'Внутренняя заметка', text)
    res.status(201).json({ activity: row })
  })

  app.post('/api/admin/complaints/:id/evidence', ...read, async (req, res) => {
    const complaint = await loadCase(req, res)
    if (!complaint || !(await allowWrite(req, res, complaint))) return
    const title = String(req.body.title || req.body.filename || '').trim()
    if (!title) return res.status(400).json({ error: 'Укажите название подтверждения' })
    const row = await prisma.complaintEvidence.create({ data: {
      tenantId: req.actorContext.tenantId,
      complaintId: complaint.id,
      type: String(req.body.type || 'document'),
      title,
      contentText: String(req.body.contentText || '').slice(0, 500000) || null,
      objectKey: String(req.body.objectKey || '').trim() || null,
      mimeType: String(req.body.mimeType || '').trim() || null,
      filename: String(req.body.filename || '').trim() || null,
      size: Number.isFinite(Number(req.body.size)) ? Number(req.body.size) : null,
      source: String(req.body.source || 'manual'),
      createdByUserId: actorId(req)
    } })
    await activity(req, complaint.id, 'evidence_added', 'Добавлено подтверждение', title)
    res.status(201).json({ evidence: row })
  })

  app.post('/api/admin/complaints/:id/evidence/upload', bodyParser.raw({ type: 'application/octet-stream', limit: '10mb' }), ...read, async (req, res) => {
    const complaint = await loadCase(req, res)
    if (!complaint || !(await allowWrite(req, res, complaint))) return
    if (!uploadMedia) return res.status(503).json({ error: 'Загрузка файлов временно недоступна' })
    const content = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0)
    if (!content.length) return res.status(400).json({ error: 'Выберите файл' })
    const filename = decodeHeader(req.headers['x-file-name'], 'evidence.bin').slice(0, 180)
    const mimeType = String(req.headers['content-type'] || 'application/octet-stream').slice(0, 120)
    const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/csv', 'text/plain', 'application/vnd.ms-excel', 'application/octet-stream'])
    if (!allowedMimeTypes.has(mimeType)) return res.status(415).json({ error: 'Разрешены изображения, PDF, CSV и TXT' })
    const title = decodeHeader(req.headers['x-evidence-title'], filename).slice(0, 220)
    try {
      const stored = await uploadMedia({ complaintId: complaint.id, filename, mimeType, content, tenantCode: req.actorContext.tenantCode })
      const row = await prisma.complaintEvidence.create({ data: {
        tenantId: req.actorContext.tenantId,
        complaintId: complaint.id,
        type: String(req.headers['x-evidence-type'] || 'document').slice(0, 60),
        title,
        objectKey: stored.objectKey,
        mimeType: stored.mimeType || mimeType,
        filename: stored.filename || filename,
        size: Number(stored.size) || content.length,
        source: 'manual_upload',
        metadataJson: JSON.stringify({ sha256: stored.sha256 || null }),
        createdByUserId: actorId(req)
      } })
      await activity(req, complaint.id, 'evidence_added', 'Добавлен файл-подтверждение', title)
      res.status(201).json({ evidence: row })
    } catch (error) {
      res.status(error.statusCode || 502).json({ error: error.message || 'Не удалось сохранить файл' })
    }
  })

  app.post('/api/admin/complaints/:id/evidence/:evidenceId/url', ...read, async (req, res) => {
    const complaint = await loadCase(req, res)
    if (!complaint) return
    const evidence = await prisma.complaintEvidence.findFirst({ where: { id: req.params.evidenceId, complaintId: complaint.id, tenantId: req.actorContext.tenantId } })
    if (!evidence?.objectKey) return res.status(409).json({ error: 'Для этого подтверждения нет сохранённого файла' })
    try { res.json(await createMediaUrl({ objectKey: evidence.objectKey, tenantCode: req.actorContext.tenantCode })) } catch (error) { res.status(502).json({ error: 'Не удалось открыть файл. Повторите позже.' }) }
  })

  app.post('/api/admin/complaints/:id/response/prepare', ...read, async (req, res) => {
    const complaint = await loadCase(req, res, { include: { order: true, contractRule: true } })
    if (!complaint || !(await allowWrite(req, res, complaint))) return
    const rule = publicRule(complaint.contractRule) || {}
    const missing = investigationChecklist(complaint.investigationJson, rule)
    if (missing.length) return res.status(409).json({ error: 'Сначала заполните факты расследования', missing })
    const bodyText = composeComplaintResponse({ complaint, order: complaint.order, investigation: complaint.investigationJson, rules: rule })
    const latestInbound = await prisma.complaintMessage.findFirst({ where: { complaintId: complaint.id, direction: 'inbound' }, orderBy: { createdAt: 'desc' } })
    const idempotencyKey = `complaint-response-draft:${complaint.id}:${crypto.createHash('sha256').update(bodyText).digest('hex').slice(0, 16)}`
    const message = await prisma.complaintMessage.upsert({ where: { tenantId_idempotencyKey: { tenantId: req.actorContext.tenantId, idempotencyKey } }, create: {
      tenantId: req.actorContext.tenantId,
      complaintId: complaint.id,
      direction: 'outbound',
      externalThreadId: complaint.externalThreadId,
      sender: emailFrom,
      recipientsJson: JSON.stringify([complaint.complainantEmail].filter(Boolean)),
      subject: complaint.subject ? `Re: ${complaint.subject.replace(/^Re:\s*/i, '')}` : 'Re: Transfer complaint',
      bodyText,
      providerMessageId: latestInbound?.providerMessageId || null,
      approvalStatus: 'pending_human',
      deliveryStatus: 'draft',
      idempotencyKey,
      createdByUserId: actorId(req)
    }, update: { bodyText, approvalStatus: 'pending_human', deliveryStatus: 'draft', deliveryError: null } })
    await prisma.complaintCase.update({ where: { id: complaint.id }, data: { status: 'response_ready' } })
    await activity(req, complaint.id, 'response_prepared', 'Ответ подготовлен', 'Проверьте факты и подтвердите отправку')
    res.json({ message })
  })

  app.post('/api/admin/complaints/:id/response/send', ...read, async (req, res) => {
    const complaint = await loadCase(req, res)
    if (!complaint || !(await allowWrite(req, res, complaint))) return
    const message = await prisma.complaintMessage.findFirst({ where: { id: String(req.body.messageId || ''), complaintId: complaint.id, tenantId: req.actorContext.tenantId, direction: 'outbound' } })
    if (!message) return res.status(404).json({ error: 'Черновик ответа не найден' })
    if (message.deliveryStatus === 'sent') return res.json({ message, idempotent: true })
    if (!transporter) return res.status(503).json({ error: 'Отправка почты не настроена. Черновик сохранён.' })
    const recipients = parseJson(message.recipientsJson, [])
    if (!recipients.length) return res.status(409).json({ error: 'В жалобе не указан email заявителя' })
    try {
      const evidence = await prisma.complaintEvidence.findMany({ where: { complaintId: complaint.id, tenantId: req.actorContext.tenantId, objectKey: { not: null } }, orderBy: { createdAt: 'asc' }, take: 20 })
      const attachments = []
      for (const item of evidence) {
        try {
          const signed = await createMediaUrl({ objectKey: item.objectKey, tenantCode: req.actorContext.tenantCode })
          attachments.push({ filename: item.filename || item.title, path: signed.url, contentType: item.mimeType || undefined })
        } catch (_) {
          return res.status(502).json({ error: `Не удалось подготовить вложение «${item.title}». Письмо не отправлено.` })
        }
      }
      const info = await transporter.sendMail({ from: emailFrom, to: recipients.join(', '), subject: message.subject, text: String(req.body.bodyText || message.bodyText), inReplyTo: message.providerMessageId || undefined, references: message.providerMessageId ? [message.providerMessageId] : undefined, attachments })
      const updated = await prisma.complaintMessage.update({ where: { id: message.id }, data: { bodyText: String(req.body.bodyText || message.bodyText), providerMessageId: info.messageId || message.providerMessageId, approvalStatus: 'approved', deliveryStatus: 'sent', sentAt: new Date(), deliveryError: null } })
      await prisma.complaintCase.update({ where: { id: complaint.id }, data: { status: 'response_sent', firstRespondedAt: complaint.firstRespondedAt || new Date() } })
      await activity(req, complaint.id, 'response_sent', 'Ответ отправлен', recipients.join(', '))
      res.json({ message: updated, idempotent: false })
    } catch (error) {
      await prisma.complaintMessage.update({ where: { id: message.id }, data: { approvalStatus: 'approved', deliveryStatus: 'failed', deliveryError: String(error.message || error).slice(0, 500) } })
      await createOpsTask({ tenantId: req.actorContext.tenantId, userId: actorId(req), title: 'Не удалось отправить ответ по жалобе', details: 'Черновик сохранён. Откройте жалобу и повторите отправку.', type: 'complaint_response_failed', priority: 'high', source: 'complaints', sourceRef: complaint.id, dedupKey: `complaint-send-failed:${message.id}`, linkUrl: `/admin-complaints?complaintId=${complaint.id}`, payload: { complaintId: complaint.id, messageId: message.id } }).catch(() => null)
      res.status(502).json({ error: 'Письмо не отправлено. Черновик сохранён — можно повторить.' })
    }
  })

  app.get('/api/admin/complaint-rules', ...read, async (req, res) => {
    const rules = await prisma.counterpartyComplaintRule.findMany({ where: { tenantId: req.actorContext.tenantId, isActive: true }, orderBy: [{ counterpartyName: 'asc' }, { version: 'desc' }] })
    res.json({ rules: rules.map(publicRule) })
  })

  app.post('/api/admin/complaint-rules', ...read, async (req, res) => {
    if (req.actorContext?.actorRole !== 'owner' && !actorPermissions(req).has('*') && req.user?.role !== 'admin') return res.status(403).json({ error: 'Правила договоров может публиковать только владелец' })
    const counterpartyName = String(req.body.counterpartyName || '').trim()
    if (!counterpartyName) return res.status(400).json({ error: 'Укажите заказчика' })
    const sourceDocumentName = String(req.body.sourceDocumentName || '').trim()
    if (!sourceDocumentName) return res.status(400).json({ error: 'Укажите договор или докумен, из которого взяты правила' })
    const latest = await prisma.counterpartyComplaintRule.findFirst({ where: { tenantId: req.actorContext.tenantId, counterpartyName: { equals: counterpartyName, mode: 'insensitive' } }, orderBy: { version: 'desc' } })
    await prisma.counterpartyComplaintRule.updateMany({ where: { tenantId: req.actorContext.tenantId, counterpartyName: { equals: counterpartyName, mode: 'insensitive' }, isActive: true }, data: { isActive: false } })
    const rule = await prisma.counterpartyComplaintRule.create({ data: {
      tenantId: req.actorContext.tenantId,
      counterpartyName,
      title: String(req.body.title || `Правила ${counterpartyName}`),
      version: (latest?.version || 0) + 1,
      waitingMinutes: Number.isFinite(Number(req.body.waitingMinutes)) ? Number(req.body.waitingMinutes) : null,
      arrivalToleranceMin: Number.isFinite(Number(req.body.arrivalToleranceMin)) ? Number(req.body.arrivalToleranceMin) : null,
      requiredActionsJson: JSON.stringify(req.body.requiredActions || []),
      approvedStatementsJson: JSON.stringify(req.body.approvedStatements || []),
      prohibitedStatementsJson: JSON.stringify(req.body.prohibitedStatements || []),
      sourceDocumentName,
      sourceObjectKey: String(req.body.sourceObjectKey || '').trim() || null,
      notes: String(req.body.notes || '').trim() || null,
      createdByUserId: actorId(req)
    } })
    res.status(201).json({ rule: publicRule(rule) })
  })

  app.post('/api/admin/complaints/:id/provider-events/import', ...read, async (req, res) => {
    const complaint = await loadCase(req, res)
    if (!complaint || !(await allowWrite(req, res, complaint))) return
    if (!complaint.orderId) return res.status(409).json({ error: 'Сначала свяжите жалобу с заказом' })
    const events = Array.isArray(req.body.events) ? req.body.events : []
    let created = 0
    for (const event of events.slice(0, 5000)) {
      const occurredAt = new Date(event.occurredAt)
      if (!event.eventType || Number.isNaN(occurredAt.getTime())) continue
      const externalEventId = String(event.externalEventId || crypto.createHash('sha256').update(`${complaint.orderId}:${event.eventType}:${occurredAt.toISOString()}:${event.latitude || ''}:${event.longitude || ''}`).digest('hex'))
      const result = await prisma.providerTripEvent.createMany({ data: [{ tenantId: req.actorContext.tenantId, orderId: complaint.orderId, provider: String(req.body.provider || 'easytaxi'), externalEventId, eventType: String(event.eventType), occurredAt, driverName: String(event.driverName || '').trim() || null, latitude: Number.isFinite(Number(event.latitude)) ? Number(event.latitude) : null, longitude: Number.isFinite(Number(event.longitude)) ? Number(event.longitude) : null, source: String(req.body.source || 'csv'), payloadJson: JSON.stringify(event) }], skipDuplicates: true })
      created += result.count
    }
    await activity(req, complaint.id, 'provider_events_imported', 'Добавлена история поездки', `${created} событий`)
    res.json({ created })
  })

  app.get('/api/admin/complaint-integrations/easytaxi/health', ...read, async (req, res) => {
    res.json({ configured: false, status: 'manual_evidence', message: 'API чтения Tracking History не настроен. Добавьте CSV или заполните хронологию вручную.' })
  })

  async function checkComplaintSla() {
    const now = new Date()
    const warningAt = new Date(now.getTime() + 2 * 60 * 60 * 1000)
    const rows = await prisma.complaintCase.findMany({
      where: {
        firstRespondedAt: null,
        status: { in: ACTIVE_STATUSES },
        firstResponseDueAt: { lte: warningAt }
      },
      select: { id: true, tenantId: true, assignedToUserId: true, summary: true, firstResponseDueAt: true }
    })
    for (const complaint of rows) {
      const overdue = complaint.firstResponseDueAt < now
      await createOpsTask({
        tenantId: complaint.tenantId,
        userId: complaint.assignedToUserId,
        title: overdue ? 'Просрочен первый ответ по жалобе' : 'До ответа по жалобе меньше 2 часов',
        details: complaint.summary,
        type: overdue ? 'complaint_sla_overdue' : 'complaint_sla_warning',
        priority: overdue ? 'urgent' : 'high',
        source: 'complaints',
        sourceRef: complaint.id,
        dueAt: complaint.firstResponseDueAt,
        dedupKey: `${overdue ? 'complaint-sla-overdue' : 'complaint-sla-warning'}:${complaint.id}`,
        linkUrl: `/admin-complaints?complaintId=${complaint.id}`,
        payload: { complaintId: complaint.id }
      }).catch(() => null)
    }
  }

  function ensureSlaTimer() {
    if (slaTimer) return
    checkComplaintSla().catch(error => console.error('Complaint SLA initial check failed:', error?.message || error))
    slaTimer = setInterval(() => checkComplaintSla().catch(error => console.error('Complaint SLA check failed:', error?.message || error)), 5 * 60 * 1000)
    slaTimer.unref?.()
  }
}

module.exports = { findComplaintOrder, ingestComplaintEmail, registerComplaintRoutes }
