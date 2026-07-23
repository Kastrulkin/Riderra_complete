function staffChatReadWhere(tenantId, filters = {}) {
  const normalizedTenantId = String(tenantId || '').trim()
  if (!normalizedTenantId) throw new Error('tenantId is required for chat visibility')

  // Assignment is workflow metadata, not an access boundary. Every staff member
  // with chat read access sees the tenant's complete conversation history.
  return {
    ...filters,
    tenantId: normalizedTenantId
  }
}

module.exports = { staffChatReadWhere }
