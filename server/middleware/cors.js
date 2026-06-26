function createCorsMiddleware(allowedOrigins = []) {
  return (req, res, next) => {
    const requestOrigin = req.headers.origin
    if (allowedOrigins.length === 0 && process.env.NODE_ENV !== 'production') {
      res.header('Access-Control-Allow-Origin', '*')
    } else if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
      res.header('Access-Control-Allow-Origin', requestOrigin)
    }
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Idempotency-Key, X-EasyTaxi-Webhook-Secret, X-EasyTaxi-Signature, X-OpenClaw-Signature, X-OpenClaw-Internal-Token, X-Riderra-Internal-Token')
    res.header('Vary', 'Origin')
    if (String(req.path || req.url || '').startsWith('/_nuxt/')) {
      res.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
      res.header('Pragma', 'no-cache')
      res.header('Expires', '0')
    }
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200)
    }
    next()
  }
}

module.exports = {
  createCorsMiddleware
}
