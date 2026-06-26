function languageCookieMiddleware(req, res, next) {
  const lang = String(req.query?.lang || '').toLowerCase()
  if (/^(ru|en|es|de|fr|el|th|ar|ha)$/.test(lang)) {
    res.cookie('riderra_lang', lang, {
      maxAge: 365 * 24 * 60 * 60 * 1000,
      sameSite: 'lax',
      path: '/'
    })
  }
  next()
}

module.exports = {
  languageCookieMiddleware
}
