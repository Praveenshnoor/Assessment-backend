/**
 * PM2 Ecosystem Configuration
 * Enables clustering for 4x capacity increase
 * 
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 logs
 *   pm2 monit
 *   pm2 stop all
 */

module.exports = {
  apps: [{
    name: 'mcq-backend',
    script: './server.js',
    
    // Clustering Configuration
    instances: 4, // Use 4 instances (Windows compatible)
    exec_mode: 'cluster', // Enable cluster mode
    
    // Environment Variables
    env: {
      NODE_ENV: 'development',
      PORT: 5000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    
    // Auto-restart Configuration
    watch: false, // Disable in production
    max_memory_restart: '1G', // Restart if memory exceeds 1GB
    
    // Logging
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    
    // Advanced Options
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    listen_timeout: 10000,
    kill_timeout: 5000,
    
    // Health Monitoring
    exp_backoff_restart_delay: 100,
    
    // Graceful Shutdown
    wait_ready: false,  // Disabled temporarily for easier startup
    shutdown_with_message: true
  }]
};
