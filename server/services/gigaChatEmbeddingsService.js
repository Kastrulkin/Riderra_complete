const fs = require('fs')
const https = require('https')
const crypto = require('crypto')

const EMBEDDING_DIMENSIONS = 2560
let cachedToken = null
let tokenExpiresAt = 0

function enabled() {
  return ['1', 'true', 'yes', 'on'].includes(String(process.env.PRICING_EMBEDDINGS_ENABLED || '').toLowerCase())
}

function credentials() {
  const clientId = String(process.env.GIGACHAT_CLIENT_ID || '').trim()
  const clientSecret = String(process.env.GIGACHAT_CLIENT_SECRET || '').trim()
  if (!clientId || !clientSecret) throw new Error('GigaChat embedding credentials are not configured')
  return { clientId, clientSecret }
}

function requestJson(url, options = {}, body = null, timeoutMs = 90000) {
  return new Promise((resolve, reject) => {
    const caPath = String(process.env.GIGACHAT_CA_BUNDLE || '').trim()
    const verifyTls = String(process.env.GIGACHAT_SSL_VERIFY || 'true').toLowerCase() !== 'false'
    const req = https.request(url, {
      ...options,
      rejectUnauthorized: verifyTls,
      ...(caPath && fs.existsSync(caPath) ? { ca: fs.readFileSync(caPath) } : {})
    }, (res) => {
      const chunks = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8')
        let payload = {}
        try { payload = text ? JSON.parse(text) : {} } catch (_) {}
        if (res.statusCode < 200 || res.statusCode >= 300) {
          const error = new Error(`GigaChat request failed: HTTP ${res.statusCode}`)
          error.statusCode = res.statusCode
          return reject(error)
        }
        resolve({ payload, headers: res.headers })
      })
    })
    req.setTimeout(timeoutMs, () => req.destroy(new Error('GigaChat request timeout')))
    req.on('error', reject)
    if (body) req.write(body)
    req.end()
  })
}

async function accessToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken
  const { clientId, clientSecret } = credentials()
  const body = 'scope=GIGACHAT_API_PERS'
  const { payload } = await requestJson('https://ngw.devices.sberbank.ru:9443/api/v2/oauth', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      RqUID: crypto.randomUUID(),
      'Content-Length': Buffer.byteLength(body)
    }
  }, body, 30000)
  if (!payload.access_token) throw new Error('GigaChat access token is missing')
  cachedToken = payload.access_token
  tokenExpiresAt = Date.now() + 25 * 60 * 1000
  return cachedToken
}

async function embedTexts(texts) {
  if (!enabled()) throw new Error('Pricing embeddings are disabled')
  const input = (Array.isArray(texts) ? texts : []).map((text) => String(text || '').trim()).filter(Boolean)
  if (!input.length) return { vectors: [], model: model(), requestId: '' }
  if (input.length > 32) throw new Error('Embedding batch is too large')
  const body = JSON.stringify({ model: model(), input })
  const baseUrl = String(process.env.PRICING_EMBEDDINGS_BASE_URL || 'https://api.giga.chat/v1').replace(/\/+$/, '')
  let response
  let lastError
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const token = await accessToken()
      response = await requestJson(`${baseUrl}/embeddings`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json', 'Content-Length': Buffer.byteLength(body) }
      }, body)
      break
    } catch (error) {
      lastError = error
      if (error.statusCode === 401 || error.statusCode === 403) {
        cachedToken = null
        tokenExpiresAt = 0
      }
      if (![401, 403, 429, 503].includes(error.statusCode) || attempt === 2) throw error
      await new Promise((resolve) => setTimeout(resolve, 750 * (2 ** attempt)))
    }
  }
  if (!response) throw lastError
  const { payload, headers } = response
  const rows = Array.isArray(payload.data) ? [...payload.data].sort((a, b) => Number(a.index) - Number(b.index)) : []
  const vectors = rows.map((row) => row.embedding)
  if (vectors.length !== input.length || vectors.some((vector) => !Array.isArray(vector) || vector.length !== EMBEDDING_DIMENSIONS)) {
    throw new Error('GigaChat embedding dimension mismatch')
  }
  return { vectors, model: model(), requestId: String(payload.id || headers['x-request-id'] || '') }
}

function model() {
  return String(process.env.PRICING_EMBEDDINGS_MODEL || 'EmbeddingsGigaR').trim()
}

module.exports = { EMBEDDING_DIMENSIONS, embedTexts, enabled, model }
