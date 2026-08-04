#!/usr/bin/env node
require('dotenv').config()

const fs = require('fs/promises')
const path = require('path')
const axios = require('axios')
const { SocksProxyAgent } = require('socks-proxy-agent')

const token = String(process.env.TELEGRAM_BOT_TOKEN || '').trim()
const webhookSecret = String(process.env.TELEGRAM_WEBHOOK_SECRET || '').trim()
const proxyUrl = String(process.env.TELEGRAM_PROXY_URL || '').trim()
const forwardUrl = String(process.env.TELEGRAM_POLLING_FORWARD_URL || 'http://127.0.0.1:3000/api/telegram/webhook').trim()
const offsetPath = String(process.env.TELEGRAM_POLLING_OFFSET_PATH || path.join(process.cwd(), 'var', 'telegram-poller-offset.json')).trim()

if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not configured')
if (!webhookSecret) throw new Error('TELEGRAM_WEBHOOK_SECRET is not configured')
if (!proxyUrl) throw new Error('TELEGRAM_PROXY_URL is not configured')
if (!/^http:\/\/127\.0\.0\.1(?::\d+)?\//.test(forwardUrl)) {
  throw new Error('TELEGRAM_POLLING_FORWARD_URL must use loopback HTTP')
}

const telegram = axios.create({
  baseURL: `https://api.telegram.org/bot${token}`,
  httpsAgent: new SocksProxyAgent(proxyUrl),
  proxy: false,
  timeout: 35000,
  validateStatus: () => true
})

let stopping = false
let nextOffset = 0

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function telegramCall(method, payload = {}) {
  const response = await telegram.post(`/${method}`, payload)
  if (response.status < 200 || response.status >= 300 || response.data?.ok !== true) {
    throw new Error(`Telegram ${method} failed: ${JSON.stringify(response.data)}`)
  }
  return response.data.result
}

async function loadOffset() {
  try {
    const payload = JSON.parse(await fs.readFile(offsetPath, 'utf8'))
    return Number.isSafeInteger(payload.nextOffset) && payload.nextOffset >= 0 ? payload.nextOffset : 0
  } catch (error) {
    if (error.code !== 'ENOENT') console.error('Telegram poller offset read failed:', error.message)
    return 0
  }
}

async function saveOffset(value) {
  await fs.mkdir(path.dirname(offsetPath), { recursive: true })
  const temporaryPath = `${offsetPath}.${process.pid}.tmp`
  await fs.writeFile(temporaryPath, JSON.stringify({ nextOffset: value, updatedAt: new Date().toISOString() }), { mode: 0o600 })
  await fs.rename(temporaryPath, offsetPath)
}

async function forwardUpdate(update) {
  const response = await axios.post(forwardUrl, update, {
    headers: {
      'Content-Type': 'application/json',
      'X-Telegram-Bot-Api-Secret-Token': webhookSecret
    },
    timeout: 30000,
    proxy: false,
    validateStatus: () => true
  })
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Riderra webhook returned HTTP ${response.status}: ${JSON.stringify(response.data)}`)
  }
}

async function run() {
  nextOffset = await loadOffset()
  await telegramCall('deleteWebhook', { drop_pending_updates: false })
  console.log(`Telegram polling started from offset ${nextOffset}`)

  while (!stopping) {
    try {
      const updates = await telegramCall('getUpdates', {
        offset: nextOffset,
        limit: 50,
        timeout: 25,
        allowed_updates: ['message', 'edited_message']
      })
      for (const update of updates) {
        if (stopping) break
        await forwardUpdate(update)
        nextOffset = Number(update.update_id) + 1
        await saveOffset(nextOffset)
      }
    } catch (error) {
      console.error('Telegram polling iteration failed:', error.message)
      if (!stopping) await delay(3000)
    }
  }
}

process.on('SIGTERM', () => { stopping = true })
process.on('SIGINT', () => { stopping = true })

run().catch((error) => {
  console.error('Telegram polling worker failed:', error)
  process.exitCode = 1
})
