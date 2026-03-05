module.exports = {
  apps: [
    {
      name: 'varmi-mail-server',
      script: 'dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 8787,
      },
      watch: false,
      autorestart: true,
      max_restarts: 10,
      out_file: 'logs/out.log',
      error_file: 'logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm Z',
      // PM2 Monitoring
      error_log: 'logs/error.log',
      combine_logs: true,
      merge_logs: true,
      max_memory_restart: '500M',
      min_uptime: '10s',
      listen_timeout: 3000,
      kill_timeout: 5000,
      // Metrics
      instance_var: 'INSTANCE_ID',
      increment_var: 'PORT',
    },
  ],
};
