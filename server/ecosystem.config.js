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
    },
  ],
};
