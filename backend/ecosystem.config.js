module.exports = {
  apps: [{
    name: 'classtrack-backend',
    script: 'server.js',
    instances: process.env.NODE_ENV === 'production' ? 'max' : 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 5002
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5002
    },
    // Logging
    log_file: './logs/pm2-combined.log',
    out_file: './logs/pm2-out.log',
    error_file: './logs/pm2-error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Process management
    max_memory_restart: '1G',
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s',
    
    // Monitoring
    pmx: true,
    
    // Advanced features
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'uploads'],
    
    // Health monitoring
    health_check_grace_period: 3000,
    health_check_fatal_exceptions: true,
    
    // Environment specific settings
    node_args: process.env.NODE_ENV === 'production' ? 
      '--max-old-space-size=2048' : 
      '--max-old-space-size=1024',
    
    // Graceful shutdown
    kill_timeout: 5000,
    listen_timeout: 3000,
    
    // Source map support
    source_map_support: true,
    
    // Merge logs from all instances
    merge_logs: true,
    
    // Auto restart on file changes (development only)
    autorestart: true,
    
    // Cron restart (production - restart daily at 3 AM)
    cron_restart: process.env.NODE_ENV === 'production' ? '0 3 * * *' : undefined
  }]
};