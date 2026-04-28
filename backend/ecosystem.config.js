// ecosystem.config.js — PM2 Cluster Configuration
// Runs one Node.js process per CPU core for horizontal scaling on a single machine.
// Usage:
//   Development:  npm run dev (nodemon, single process)
//   Production:   pm2 start ecosystem.config.js --env production
//   Monitor:      pm2 monit
//   Logs:         pm2 logs pakdare-backend

module.exports = {
  apps: [{
    name: 'pakdare-backend',
    script: './index.js',
    
    // CLUSTER MODE: spawns one process per CPU core
    // On a 4-core server = 4 Node.js processes = ~4x throughput
    instances: 'max',  // or set a number like 4
    exec_mode: 'cluster',

    // Auto-restart on crash
    autorestart: true,
    watch: false,  // disable in production
    max_memory_restart: '1G',  // restart if process exceeds 1GB RAM

    // Environment variables per environment
    env: {
      NODE_ENV: 'development',
      PORT: 5000,
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000,
    },

    // Graceful shutdown: wait for in-flight requests to finish
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000,

    // Log config
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    merge_logs: true,
  }],
};
