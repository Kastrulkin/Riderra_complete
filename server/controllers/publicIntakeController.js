const { createPublicIntakeService } = require('../services/publicIntakeService')

function createPublicIntakeController(dependencies) {
  const service = createPublicIntakeService(dependencies)
  const { normalizeText } = dependencies

  function validateOrderRequest(req, res) {
    const result = service.validateDraftOrderRequest(req.body || {})
    res.status(result.statusCode).json(result.body)
  }

  async function orderRequestStatus(req, res) {
    try {
      const requestId = String(req.params.requestId || '').trim()
      const email = normalizeText(req.query.email, 254)
      const phone = normalizeText(req.query.phone, 80)
      const result = await service.getDraftOrderRequestStatus({
        tenantId: req.actorContext.tenantId,
        requestId,
        email,
        phone
      })
      res.status(result.statusCode).json(result.body)
    } catch (error) {
      console.error('Error in /api/public/order-requests/:requestId/status:', error)
      res.status(500).json({ error: 'failed' })
    }
  }

  async function createOrderRequest(req, res) {
    try {
      const result = await service.createDraftOrderRequest(req)
      res.status(result.statusCode).json(result.body)
    } catch (error) {
      console.error('Error in /api/public/order-requests:', error)
      res.status(error.statusCode || 500).json({ error: error.message || 'failed' })
    }
  }

  async function createRequest(req, res) {
    try {
      const created = await service.createPublicRequest({
        tenantId: req.actorContext.tenantId,
        body: req.body
      })
      res.json(created)
    } catch (e) {
      console.error(e)
      res.status(500).json({ error: 'failed' })
    }
  }

  async function createDriver(req, res) {
    try {
      const created = await service.createDriverApplication({
        tenantId: req.actorContext.tenantId,
        body: req.body
      })
      res.json({ success: true, driver: created })
    } catch (e) {
      console.error('Error in /api/drivers:', e)
      console.error('Error stack:', e.stack)
      res.status(500).json({ error: 'failed', message: e.message })
    }
  }

  return {
    createDriver,
    createOrderRequest,
    createRequest,
    orderRequestStatus,
    validateOrderRequest
  }
}

module.exports = {
  createPublicIntakeController
}
