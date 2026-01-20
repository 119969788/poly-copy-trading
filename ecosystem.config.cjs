const path = require('path');

module.exports = {
  apps: [{
    name: 'poly-copy-trading',
    script: 'npx',
    args: 'tsx src/index.ts',
    cwd: __dirname,
    interpreter: 'node',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production'
    },
    error_file: path.join(__dirname, 'logs', 'err.log'),
    out_file: path.join(__dirname, 'logs', 'out.log'),
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    log_file: path.join(__dirname, 'logs', 'combined.log'),
    time: true
  }]
};
