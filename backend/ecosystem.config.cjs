/**
 * PM2 process manager — API + email worker with auto-restart.
 *
 * Usage:
 *   pm2 start ecosystem.config.cjs --env production
 *   pm2 save && pm2 startup
 *
 * Inject secrets via host env or a secrets manager — do not commit real .env values.
 */
module.exports = {
  apps: [
    {
      name: 'api',
      script: 'server.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      // Use cluster only if the app is confirmed multi-instance safe (shared sessions via cookies/DB)
      // instances: 'max',
      // exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      min_uptime: '10s',
      max_restarts: 20,
      restart_delay: 2_000,
      kill_timeout: 16_000,
      listen_timeout: 10_000,
      wait_ready: false,
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
        TRUST_PROXY_HOPS: 1,
        UV_THREADPOOL_SIZE: 8,
        EMAIL_USE_QUEUE: 'true',
        ALLOW_MOCK_PAYMENT: 'false',
      },
    },
    {
      name: 'email-worker',
      script: 'scripts/email-worker.mjs',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      min_uptime: '10s',
      max_restarts: 30,
      restart_delay: 3_000,
      env_production: {
        NODE_ENV: 'production',
        EMAIL_USE_QUEUE: 'true',
      },
    },
  ],
};
