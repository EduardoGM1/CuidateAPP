/**
 * PM2 - CuidateAPP API (api-clinica)
 * Ejecutar desde la raíz del repo: cd /var/www/CuidateAPP && pm2 start deploy/ecosystem.config.cjs
 * O desde api-clinica: pm2 start index.js --name api-clinica
 */

module.exports = {
  apps: [
    {
      name: 'api-clinica',
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
