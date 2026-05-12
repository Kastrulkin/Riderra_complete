const RELOAD_KEY = 'riderra:chunk-reload-at'
const RELOAD_COOLDOWN_MS = 30000

function isChunkLoadError (error) {
  const message = String((error && (error.message || error.name)) || error || '')
  return /ChunkLoadError|Loading chunk \d+ failed|Loading CSS chunk \d+ failed|CSS_CHUNK_LOAD_FAILED/i.test(message)
}

function reloadOnceForFreshAssets () {
  const now = Date.now()
  const lastReload = Number(window.sessionStorage.getItem(RELOAD_KEY) || 0)

  if (lastReload && now - lastReload < RELOAD_COOLDOWN_MS) return

  window.sessionStorage.setItem(RELOAD_KEY, String(now))
  window.location.reload()
}

export default function ({ app }) {
  if (app && app.router) {
    app.router.onError((error) => {
      if (isChunkLoadError(error)) reloadOnceForFreshAssets()
    })
  }

  window.addEventListener('error', (event) => {
    if (isChunkLoadError(event.error || event.message)) reloadOnceForFreshAssets()
  })

  window.addEventListener('unhandledrejection', (event) => {
    if (isChunkLoadError(event.reason)) reloadOnceForFreshAssets()
  })
}
