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
      GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
      DATABASE_URL: process.env.DATABASE_URL
    }
  }]
}
