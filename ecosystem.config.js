module.exports = {
  apps: [{
    name: 'riderra',
    script: 'npm',
    args: 'start',
    cwd: '/opt/riderra',
    env: {
      NODE_ENV: 'production',
      HOST: '0.0.0.0',
      PORT: 3000
    }
  }]
}
