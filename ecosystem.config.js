module.exports = {
  apps: [{
    name: 'poly-copy-trading',
    script: 'pnpm',
    args: 'start',
    cwd: process.cwd(),
    interpreter: '/bin/bash',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    // 日志文件大小限制
    log_file: './logs/combined.log',
    time: true
  }]
};
