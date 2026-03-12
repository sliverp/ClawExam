module.exports = {
  apps: [{
    name: 'clawexam',
    script: 'src/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      PORT: 3210,
      NODE_ENV: 'production',
    },
    // ESM 项目需要这个
    node_args: '--env-file-if-exists=.env',
    max_memory_restart: '512M',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: 'logs/error.log',
    out_file: 'logs/out.log',
    merge_logs: true,
  }],
};
