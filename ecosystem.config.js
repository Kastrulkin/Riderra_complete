module.exports = {
  apps: [{
    name: 'riderra',
    script: 'npm',
    args: 'start',
    cwd: '/opt/riderra',
    env: {
      NODE_ENV: 'production',
      HOST: '0.0.0.0',
      PORT: 3000,
      EMAIL_TO: 'demyanov@riderra.com',
      EMAIL_FROM: 'farmout@riderra.com',
      SMTP_HOST: 'smtp.yandex.ru',
      SMTP_PORT: '587',
      SMTP_USER: 'farmout@riderra.com',
      SMTP_PASS: 'bvxnlrthypblyvwv'
    }
  }]
}
