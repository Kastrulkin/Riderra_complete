const OPENCLAW_CONTRACT_VERSION = '1.0.0'
const SUPPORTED_OPENCLAW_CONTRACT_VERSIONS = new Set([OPENCLAW_CONTRACT_VERSION])

const CLASSIFICATION_CLASSES = new Set([
  'answer',
  'question',
  'negative',
  'irrelevant',
  'ack',
  'no_reply',
  'unclassified'
])

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== ''
}

function pushError(errors, condition, message) {
  if (!condition) errors.push(message)
}

function normalizeResponseRoot(data = {}) {
  if (!isPlainObject(data)) return {}
  return data.result || data.payload?.result || data
}

function buildOpenClawEnvelope({
  tenantId,
  traceId,
  idempotencyKey = null,
  actor = null,
  capability,
  approval = null,
  billing = null,
  extra = {}
}) {
  return {
    contract_version: OPENCLAW_CONTRACT_VERSION,
    tenant_id: tenantId,
    trace_id: traceId,
    idempotency_key: idempotencyKey || null,
    actor: {
      id: actor?.id || null,
      role: actor?.role || 'system'
    },
    capability,
    approval: approval || { mode: 'human_required' },
    billing: billing || { mode: 'track_only', unit: 'message' },
    ...extra
  }
}

function validateEnvelopeBase(payload, expectedCapability) {
  const errors = []
  pushError(errors, isPlainObject(payload), 'payload must be an object')
  if (!errors.length) {
    pushError(errors, isNonEmptyString(payload.contract_version), 'contract_version is required')
    pushError(errors, SUPPORTED_OPENCLAW_CONTRACT_VERSIONS.has(String(payload.contract_version || '').trim()), `unsupported contract_version: ${payload.contract_version || 'empty'}`)
    pushError(errors, isNonEmptyString(payload.tenant_id), 'tenant_id is required')
    pushError(errors, isNonEmptyString(payload.trace_id), 'trace_id is required')
    pushError(errors, isPlainObject(payload.actor), 'actor is required')
    pushError(errors, isPlainObject(payload.approval), 'approval is required')
    pushError(errors, isPlainObject(payload.billing), 'billing is required')
    pushError(errors, isNonEmptyString(payload.capability), 'capability is required')
    if (expectedCapability) {
      pushError(errors, String(payload.capability || '').trim() === expectedCapability, `capability must be ${expectedCapability}`)
    }
    if (isPlainObject(payload.actor)) {
      pushError(errors, isNonEmptyString(payload.actor.role), 'actor.role is required')
    }
    if (isPlainObject(payload.approval)) {
      pushError(errors, isNonEmptyString(payload.approval.mode), 'approval.mode is required')
    }
    if (isPlainObject(payload.billing)) {
      pushError(errors, isNonEmptyString(payload.billing.mode), 'billing.mode is required')
    }
  }
  return errors
}

function validateBuildPayload(payload) {
  const errors = validateEnvelopeBase(payload, 'riderra.customer.message.compose')
  pushError(errors, isPlainObject(payload.task), 'task is required')
  pushError(errors, isPlainObject(payload.order), 'order is required')
  pushError(errors, isPlainObject(payload.agent), 'agent is required')
  pushError(errors, Array.isArray(payload.conversation_history), 'conversation_history must be an array')
  if (isPlainObject(payload.task)) {
    pushError(errors, isNonEmptyString(payload.task.id), 'task.id is required')
    pushError(errors, isNonEmptyString(payload.task.type), 'task.type is required')
  }
  if (isPlainObject(payload.agent)) {
    pushError(errors, isNonEmptyString(payload.agent.code), 'agent.code is required')
    pushError(errors, isNonEmptyString(payload.agent.name), 'agent.name is required')
    pushError(errors, isNonEmptyString(payload.agent.prompt), 'agent.prompt is required')
  }
  return errors
}

function validateSendPayload(payload) {
  const errors = validateEnvelopeBase(payload, 'riderra.customer.message.send')
  pushError(errors, isPlainObject(payload.task), 'task is required')
  pushError(errors, isPlainObject(payload.order), 'order is required')
  pushError(errors, isPlainObject(payload.message), 'message is required')
  if (isPlainObject(payload.message)) {
    pushError(errors, isNonEmptyString(payload.message.channel), 'message.channel is required')
    pushError(errors, isNonEmptyString(payload.message.text), 'message.text is required')
  }
  return errors
}

function validateClassifyPayload(payload) {
  const errors = validateEnvelopeBase(payload, 'riderra.customer.reply.classify')
  pushError(errors, isPlainObject(payload.task), 'task is required')
  pushError(errors, isPlainObject(payload.message), 'message is required')
  pushError(errors, Array.isArray(payload.conversation_history), 'conversation_history must be an array')
  if (isPlainObject(payload.message)) {
    pushError(errors, isNonEmptyString(payload.message.text), 'message.text is required')
  }
  return errors
}

function validateExtractPayload(payload) {
  const errors = validateEnvelopeBase(payload, 'riderra.order.field.extract_validate')
  pushError(errors, isPlainObject(payload.task), 'task is required')
  pushError(errors, isPlainObject(payload.order), 'order is required')
  pushError(errors, isPlainObject(payload.message), 'message is required')
  if (isPlainObject(payload.message)) {
    pushError(errors, isNonEmptyString(payload.message.text), 'message.text is required')
  }
  return errors
}

function validateBuildResponse(data) {
  const errors = []
  pushError(errors, isPlainObject(data), 'response must be an object')
  if (!errors.length) {
    pushError(errors, isNonEmptyString(data.contract_version), 'contract_version is required in response')
    pushError(
      errors,
      SUPPORTED_OPENCLAW_CONTRACT_VERSIONS.has(String(data.contract_version || '').trim()),
      `unsupported response contract_version: ${data.contract_version || 'empty'}`
    )
  }
  const textVariants = [
    data?.text,
    data?.message,
    data?.response,
    data?.draft,
    data?.result?.text,
    data?.result?.message,
    data?.result?.response,
    data?.result?.draft,
    data?.payload?.text,
    data?.payload?.message,
    data?.payload?.draft
  ]
  pushError(errors, textVariants.some((value) => isNonEmptyString(value)), 'build response must contain draft text')
  return errors
}

function validateSendResponse(data) {
  const errors = []
  pushError(errors, isPlainObject(data), 'send response must be an object')
  if (!errors.length) {
    pushError(errors, isNonEmptyString(data.contract_version), 'contract_version is required in response')
    pushError(
      errors,
      SUPPORTED_OPENCLAW_CONTRACT_VERSIONS.has(String(data.contract_version || '').trim()),
      `unsupported response contract_version: ${data.contract_version || 'empty'}`
    )
    const providerId = String(
      data?.provider_message_id ||
      data?.providerMessageId ||
      data?.message_id ||
      data?.id ||
      ''
    ).trim()
    const accepted = data?.accepted === true || data?.queued === true || data?.ok === true
    pushError(errors, Boolean(providerId || accepted), 'send response must contain provider_message_id or accepted=true')
  }
  return errors
}

function validateClassifyResponse(data) {
  const errors = []
  pushError(errors, isPlainObject(data), 'classify response must be an object')
  if (!errors.length) {
    pushError(errors, isNonEmptyString(data.contract_version), 'contract_version is required in response')
    pushError(
      errors,
      SUPPORTED_OPENCLAW_CONTRACT_VERSIONS.has(String(data.contract_version || '').trim()),
      `unsupported response contract_version: ${data.contract_version || 'empty'}`
    )
  }
  const result = normalizeResponseRoot(data)
  const cls = String(result?.class || result?.classification || result?.label || '').trim().toLowerCase()
  pushError(errors, isNonEmptyString(cls), 'classify response must contain class')
  if (cls) {
    pushError(errors, CLASSIFICATION_CLASSES.has(cls), `unsupported classify class: ${cls}`)
  }
  if (result?.confidence != null) {
    const confidence = Number(result.confidence)
    pushError(errors, Number.isFinite(confidence) && confidence >= 0 && confidence <= 1, 'classify confidence must be between 0 and 1')
  }
  return errors
}

function validateExtractResponse(data) {
  const errors = []
  pushError(errors, isPlainObject(data), 'extract response must be an object')
  if (!errors.length) {
    pushError(errors, isNonEmptyString(data.contract_version), 'contract_version is required in response')
    pushError(
      errors,
      SUPPORTED_OPENCLAW_CONTRACT_VERSIONS.has(String(data.contract_version || '').trim()),
      `unsupported response contract_version: ${data.contract_version || 'empty'}`
    )
  }
  const result = normalizeResponseRoot(data)
  pushError(errors, typeof result?.valid === 'boolean' || typeof result?.is_valid === 'boolean' || typeof result?.validated === 'boolean', 'extract response must contain valid boolean')
  const valid = typeof result?.valid === 'boolean'
    ? result.valid
    : (typeof result?.is_valid === 'boolean' ? result.is_valid : result?.validated)
  if (result?.confidence != null) {
    const confidence = Number(result.confidence)
    pushError(errors, Number.isFinite(confidence) && confidence >= 0 && confidence <= 1, 'extract confidence must be between 0 and 1')
  }
  if (valid) {
    const hasValue = result?.value != null || result?.normalized_value != null || result?.normalizedValue != null
    pushError(errors, hasValue, 'extract response with valid=true must contain value')
  }
  return errors
}

function validateOpenClawPayload(kind, payload) {
  switch (kind) {
    case 'build':
      return validateBuildPayload(payload)
    case 'send':
      return validateSendPayload(payload)
    case 'classify':
      return validateClassifyPayload(payload)
    case 'extract':
      return validateExtractPayload(payload)
    default:
      return [`unsupported validation kind: ${kind}`]
  }
}

function validateOpenClawResponse(kind, data) {
  switch (kind) {
    case 'build':
      return validateBuildResponse(data)
    case 'send':
      return validateSendResponse(data)
    case 'classify':
      return validateClassifyResponse(data)
    case 'extract':
      return validateExtractResponse(data)
    default:
      return [`unsupported validation kind: ${kind}`]
  }
}

module.exports = {
  OPENCLAW_CONTRACT_VERSION,
  SUPPORTED_OPENCLAW_CONTRACT_VERSIONS,
  buildOpenClawEnvelope,
  validateOpenClawPayload,
  validateOpenClawResponse
}
