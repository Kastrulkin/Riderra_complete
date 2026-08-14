const METRIKA_ID = 108482177
const METRIKA_SRC = `https://mc.yandex.ru/metrika/tag.js?id=${METRIKA_ID}`
const MONTSERRAT_CSS = 'https://fonts.googleapis.com/css?family=Montserrat:300,400,500,700,800&subset=cyrillic-ext'

function appendOnce (selector, createElement) {
  if (document.querySelector(selector)) return
  document.head.appendChild(createElement())
}

function loadMontserrat () {
  appendOnce(`link[href="${MONTSERRAT_CSS}"]`, () => {
    const preconnectGoogle = document.createElement('link')
    preconnectGoogle.rel = 'preconnect'
    preconnectGoogle.href = 'https://fonts.googleapis.com'
    document.head.appendChild(preconnectGoogle)

    const preconnectGstatic = document.createElement('link')
    preconnectGstatic.rel = 'preconnect'
    preconnectGstatic.href = 'https://fonts.gstatic.com'
    preconnectGstatic.crossOrigin = 'anonymous'
    document.head.appendChild(preconnectGstatic)

    const fontStylesheet = document.createElement('link')
    fontStylesheet.rel = 'stylesheet'
    fontStylesheet.href = MONTSERRAT_CSS
    return fontStylesheet
  })
}

function loadYandexMetrika () {
  window.dataLayer = window.dataLayer || []
  window.ym = window.ym || function () {
    ;(window.ym.a = window.ym.a || []).push(arguments)
  }
  window.ym.l = window.ym.l || Number(new Date())

  window.ym(METRIKA_ID, 'init', {
    webvisor: true,
    clickmap: true,
    ecommerce: 'dataLayer',
    referrer: document.referrer,
    url: window.location.href,
    accurateTrackBounce: true,
    trackLinks: true
  })

  appendOnce(`script[src="${METRIKA_SRC}"]`, () => {
    const script = document.createElement('script')
    script.async = true
    script.src = METRIKA_SRC
    return script
  })
}

function runAfterFirstPaint (callback) {
  const schedule = window.requestIdleCallback || function (fn) {
    return window.setTimeout(fn, 1200)
  }

  if (document.readyState === 'complete') {
    schedule(callback)
    return
  }

  window.addEventListener('load', () => schedule(callback), { once: true })
}

export default function () {
  runAfterFirstPaint(() => {
    loadMontserrat()
    loadYandexMetrika()
  })
}
