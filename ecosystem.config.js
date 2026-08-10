module.exports = {
  apps: [{
    name: 'riderra',
    script: 'npm',
    args: 'start',
    cwd: '/opt/riderra',
    env: {
      NODE_ENV: 'production',
      HOST: process.env.HOST || '0.0.0.0',
      PORT: process.env.PORT || 3000,
      EMAIL_TO: process.env.EMAIL_TO,
      EMAIL_FROM: process.env.EMAIL_FROM,
      SMTP_HOST: process.env.SMTP_HOST,
      SMTP_PORT: process.env.SMTP_PORT,
      SMTP_USER: process.env.SMTP_USER,
      SMTP_PASS: process.env.SMTP_PASS,
      JWT_SECRET: process.env.JWT_SECRET,
      ADMIN_SETUP_KEY: process.env.ADMIN_SETUP_KEY,
      CORS_ORIGIN: process.env.CORS_ORIGIN,
      EASYTAXI_WEBHOOK_SECRET: process.env.EASYTAXI_WEBHOOK_SECRET,
      OPENCLAW_WEBHOOK_SECRET: process.env.OPENCLAW_WEBHOOK_SECRET,
      TELEGRAM_WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET,
      GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
      DATABASE_URL: process.env.DATABASE_URL
    }
  }, {
    name: 'booking-price-monitor',
    script: 'scripts/booking_morning_monitor.js',
    cwd: '/opt/riderra',
    cron_restart: '*/5 * * * *',
    autorestart: false,
    watch: false,
    env: {
      NODE_ENV: 'production'
    }
  }]
}
