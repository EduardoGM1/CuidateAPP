/**
 * Configuracion PM2 para CuidateAPP en VPS (LightNode)
 * Uso: desde la raiz del repo: pm2 start deploy/ecosystem.config.cjs
 */

module.exports = {
  apps: [
    {
      name: 'cuidateapp-api',
      cwd: './api-clinica',
      script: 'index.js',
      interpreter: 'node',
      env: { NODE_ENV: 'production' },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      merge_logs: true,
      time: true,
    },
  ],
};
