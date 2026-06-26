function loadEnv() {
  if (process.env.NODE_ENV === 'production') return
  try {
    require('dotenv').config()
  } catch (e) {
    // dotenv is optional in environments where variables are injected externally.
  }
}

module.exports = {
  loadEnv
}
