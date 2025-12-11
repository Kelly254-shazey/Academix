# Backend Deployment Guide

## Pre-Deployment Checklist

### ✅ Development Environment
- [ ] Node.js v14+ installed
- [ ] MySQL/MariaDB server running
- [ ] All npm packages installed (`npm install`)
- [ ] Environment variables configured (.env file)
- [ ] Database created (`class_ai_db`)
- [ ] Schema migrated (schema.sql applied)

### ✅ Code Quality
- [ ] All routes properly authenticated
- [ ] Error handling implemented
- [ ] Logging configured
- [ ] Validation schemas complete
- [ ] Database connections tested
- [ ] Socket.IO events configured

---

## Step 1: Database Setup

### 1.1 Create Database
```bash
mysql -u root -p
```

```sql
CREATE DATABASE class_ai_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE class_ai_db;
```

### 1.2 Run Schema Migration
```bash
mysql -u root -p class_ai_db < database/schema.sql
```

### 1.3 Verify Tables
```sql
SHOW TABLES;
```

Should show 30+ tables including:
- users, classes, sessions, attendance_logs (existing)
- student_profiles, verified_devices, user_settings (new)
- support_tickets, support_responses (new)
- badges, student_badges, attendance_streaks (new)
- calendar_events, course_analytics (new)
- active_sessions (new)

### 1.4 Add Indexes for Performance
```sql
CREATE INDEX idx_attendance_student_date ON attendance_logs(student_id, created_at);
CREATE INDEX idx_sessions_class ON sessions(class_id);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_classes_course ON classes(course_code);
```

---

## Step 2: Environment Configuration

### 2.1 Create .env File
```bash
cd backend
cp .env.example .env
```

### 2.2 Configure Variables
```env
# Server
NODE_ENV=production
PORT=5002
LOG_LEVEL=info

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_database_password
DB_NAME=class_ai_db
DB_POOL_MAX=20
DB_POOL_MIN=5

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRY=7d

# External Services
AI_SERVICE_URL=http://localhost:5003
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5002

# Logging
LOG_DIR=./logs
LOG_MAX_SIZE=10m
LOG_MAX_FILES=14d

# Session
SESSION_EXPIRY_DAYS=7

# QR Code
QR_VALIDITY_MINUTES=10
LOCATION_TOLERANCE_METERS=100
```

### 2.3 Secure Sensitive Variables
```bash
# Never commit .env to git
echo ".env" >> .gitignore
echo "logs/" >> .gitignore

# Set strong JWT_SECRET
# Option 1: Generate random string
openssl rand -base64 32

# Option 2: Use environment-specific values
# Production: Use strong, cryptographically secure secret from secure vault
```

---

## Step 3: Application Setup

### 3.1 Install Dependencies
```bash
cd backend
npm install

# Verify required packages
npm list joi socket.io bcryptjs axios mysql2
```

### 3.2 Verify Server Configuration
Check `backend/server.js` includes:
- All 11 route imports
- Global io assignment
- 11 app.use() route registrations
- Socket.IO connection handler with 6 events
- Error middleware
- Logger initialization

### 3.3 Test Development Server
```bash
# Terminal 1: Start server
npm start

# Terminal 2: Test endpoints
curl http://localhost:5002/api/health
```

Expected response:
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2024-12-11T10:30:00Z"
}
```

---

## Step 4: Docker Deployment (Recommended)

### 4.1 Build Docker Image
```bash
# From project root
cd backend
docker build -t academix-backend:2.0 .
```

### 4.2 Docker Compose Setup
```yaml
version: '3.8'

services:
  database:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_PASSWORD}
      MYSQL_DATABASE: ${DB_NAME}
    ports:
      - "3306:3306"
    volumes:
      - db_data:/var/lib/mysql
      - ./database/schema.sql:/docker-entrypoint-initdb.d/schema.sql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      NODE_ENV: ${NODE_ENV}
      DB_HOST: database
      DB_PORT: 3306
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      DB_NAME: ${DB_NAME}
      JWT_SECRET: ${JWT_SECRET}
      AI_SERVICE_URL: ${AI_SERVICE_URL}
      FRONTEND_URL: ${FRONTEND_URL}
    ports:
      - "5002:5002"
    depends_on:
      database:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5002/api/health"]
      interval: 10s
      timeout: 5s
      retries: 3

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      REACT_APP_API_URL: http://localhost:5002/api
      REACT_APP_SOCKET_URL: http://localhost:5002
    depends_on:
      - backend

volumes:
  db_data:
```

### 4.3 Deploy with Docker Compose
```bash
# From project root
docker-compose -f docker-compose.yml up -d

# Verify services
docker-compose ps

# Check logs
docker-compose logs -f backend
```

---

## Step 5: Reverse Proxy Configuration (Nginx)

### 5.1 Nginx Configuration
```nginx
# /etc/nginx/sites-available/academix

upstream backend {
    server localhost:5002;
}

upstream frontend {
    server localhost:3000;
}

server {
    listen 80;
    listen [::]:80;
    server_name api.academix.example.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.academix.example.com;

    # SSL Certificates
    ssl_certificate /etc/letsencrypt/live/academix.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/academix.example.com/privkey.pem;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # CORS Headers
    add_header Access-Control-Allow-Origin "https://academix.example.com" always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Content-Type, Authorization" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/m;
    limit_req zone=api_limit burst=200 nodelay;

    # API Routes
    location /api/ {
        limit_req zone=api_limit burst=200 nodelay;
        
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket Support
    location /socket.io {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_buffering off;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name academix.example.com;

    ssl_certificate /etc/letsencrypt/live/academix.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/academix.example.com/privkey.pem;

    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 5.2 Enable Nginx Configuration
```bash
sudo ln -s /etc/nginx/sites-available/academix /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl restart nginx
```

---

## Step 6: SSL/TLS Setup (Let's Encrypt)

### 6.1 Install Certbot
```bash
sudo apt-get install certbot python3-certbot-nginx
```

### 6.2 Generate Certificate
```bash
sudo certbot certonly --nginx -d api.academix.example.com -d academix.example.com
```

### 6.3 Auto-Renewal
```bash
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

---

## Step 7: Database Backups

### 7.1 Automated Backup Script
```bash
#!/bin/bash
# /usr/local/bin/backup-academix-db.sh

BACKUP_DIR="/backups/academix"
DB_NAME="class_ai_db"
DB_USER="backup_user"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

mkdir -p $BACKUP_DIR

# Full backup
mysqldump -u $DB_USER -p$DB_PASSWORD $DB_NAME > $BACKUP_DIR/db_full_$TIMESTAMP.sql

# Compress
gzip $BACKUP_DIR/db_full_$TIMESTAMP.sql

# Keep only last 7 days
find $BACKUP_DIR -name "db_full_*.sql.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/db_full_$TIMESTAMP.sql.gz"
```

### 7.2 Schedule Cron Job
```bash
# Run daily at 2 AM
crontab -e

# Add line:
0 2 * * * /usr/local/bin/backup-academix-db.sh >> /var/log/academix-backup.log 2>&1
```

---

## Step 8: Monitoring & Logging

### 8.1 Log Rotation
```bash
# /etc/logrotate.d/academix

/backend/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 nobody nobody
    sharedscripts
}
```

### 8.2 Monitor Server Health
```bash
#!/bin/bash
# Monitor script

while true; do
  echo "=== API Health Check ==="
  curl -s http://localhost:5002/api/health | jq .
  
  echo "=== Database Connection ==="
  mysql -u root -p$DB_PASSWORD -e "SELECT NOW();" class_ai_db
  
  echo "=== Disk Usage ==="
  df -h | grep -E "/$|mysql"
  
  echo "=== Memory Usage ==="
  free -h
  
  sleep 300  # Check every 5 minutes
done
```

### 8.3 Application Metrics
```javascript
// Add to server.js for monitoring
setInterval(() => {
  logger.info(`Active Connections: ${require('os').cpus().length}`, {
    memory: process.memoryUsage(),
    uptime: process.uptime()
  });
}, 60000); // Every minute
```

---

## Step 9: PM2 Process Manager (Alternative to Docker)

### 9.1 Install PM2
```bash
npm install -g pm2
```

### 9.2 Ecosystem Configuration
```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'academix-backend',
      script: './server.js',
      cwd: './backend',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      },
      watch: false,
      ignore_watch: ['logs', 'node_modules'],
      max_memory_restart: '1G',
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      listen_timeout: 10000,
      kill_timeout: 5000
    }
  ]
};
```

### 9.3 Start with PM2
```bash
# Start application
pm2 start ecosystem.config.js --env production

# Setup startup on reboot
pm2 startup
pm2 save

# Monitor
pm2 monit

# Logs
pm2 logs academix-backend
```

---

## Step 10: Health Checks & Monitoring

### 10.1 Health Endpoint
```javascript
// Add to server.js
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: true // Add real DB check
  });
});
```

### 10.2 Monitoring Services
Recommended external services:
- **Uptime Monitoring**: Uptime Robot, StatusPage.io
- **Error Tracking**: Sentry, Rollbar
- **APM**: New Relic, DataDog, Scout
- **Log Aggregation**: ELK Stack, Splunk, Papertrail

---

## Step 11: Performance Optimization

### 11.1 Database Optimization
```sql
-- Analyze table structure
ANALYZE TABLE attendance_logs;
ANALYZE TABLE notifications;

-- Check slow queries
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL slow_query_log_file = '/var/log/mysql/slow.log';
SET GLOBAL long_query_time = 2;
```

### 11.2 Caching Layer (Redis)
```javascript
// If implementing Redis
const redis = require('redis');
const client = redis.createClient({
  host: 'localhost',
  port: 6379,
  password: process.env.REDIS_PASSWORD
});

// Cache user settings
app.get('/api/settings', async (req, res) => {
  const cacheKey = `user_settings_${req.user.id}`;
  const cached = await client.get(cacheKey);
  
  if (cached) {
    return res.json(JSON.parse(cached));
  }
  
  const settings = await userSettingsService.getSettings(req.user.id);
  await client.setex(cacheKey, 3600, JSON.stringify(settings));
  
  res.json(settings);
});
```

### 11.3 Connection Pooling
Ensure in server.js:
```javascript
const pool = mysql.createPool({
  connectionLimit: 20,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  enableKeepAlive: true,
  keepAliveInitialDelayMs: 0
});
```

---

## Step 12: Security Hardening

### 12.1 Environment Hardening
```bash
# Run application as non-root user
useradd -m -u 1000 -s /sbin/nologin academix
chown -R academix:academix /opt/academix

# Restrict file permissions
chmod 750 /opt/academix
chmod 640 /opt/academix/.env
```

### 12.2 Firewall Configuration
```bash
# Allow only necessary ports
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw allow 3306/tcp --from 10.0.0.0/8  # MySQL (internal only)
sudo ufw enable
```

### 12.3 Secrets Management
```bash
# Use secrets manager instead of .env in production
# Options:
# - HashiCorp Vault
# - AWS Secrets Manager
# - Azure Key Vault
# - GitHub Secrets (for CI/CD)

# Example: Load from environment
const JWT_SECRET = process.env.JWT_SECRET || (() => {
  throw new Error('JWT_SECRET not set!');
})();
```

---

## Step 13: Deployment Checklist

### Pre-Deployment
- [ ] Code reviewed and tested
- [ ] Database migrations tested on staging
- [ ] Environment variables set
- [ ] SSL certificates configured
- [ ] Backups configured
- [ ] Monitoring set up
- [ ] Team notified

### Deployment
- [ ] Stop current application
- [ ] Backup database
- [ ] Pull latest code
- [ ] Install dependencies
- [ ] Run migrations
- [ ] Start application
- [ ] Verify all endpoints
- [ ] Monitor logs

### Post-Deployment
- [ ] Health checks passing
- [ ] No error spikes in logs
- [ ] Team verifies functionality
- [ ] Monitor for 24 hours
- [ ] Plan rollback if needed

---

## Step 14: Rollback Procedure

### 14.1 Automated Rollback
```bash
#!/bin/bash
# rollback.sh

BACKUP_DATE=$1
BACKUP_FILE="/backups/academix/db_full_$BACKUP_DATE.sql.gz"

if [ ! -f $BACKUP_FILE ]; then
  echo "Backup not found: $BACKUP_FILE"
  exit 1
fi

# Stop application
pm2 stop academix-backend

# Restore database
gunzip -c $BACKUP_FILE | mysql -u root -p$DB_PASSWORD class_ai_db

# Start application
pm2 start academix-backend

echo "Rollback completed"
```

### 14.2 Git Rollback
```bash
# Rollback to previous commit
git revert HEAD
git push origin main

# Or reset to specific commit
git reset --hard commit_hash
git push -f origin main
```

---

## Step 15: Production Monitoring Dashboard

### Key Metrics to Monitor
- API response time (target: <200ms)
- Error rate (target: <0.1%)
- Database query time (target: <100ms)
- Active connections
- Memory usage
- Disk space
- Network I/O
- Concurrent WebSocket connections

### Alert Thresholds
- API response time > 1000ms
- Error rate > 1%
- CPU usage > 80%
- Memory usage > 90%
- Disk space < 10%
- Database down

---

## Troubleshooting

### Issue: Connection Refused
```bash
# Check if service is running
systemctl status academix-backend
# or
pm2 list

# Check ports
netstat -tlnp | grep 5002
```

### Issue: Database Connection Failed
```bash
# Test MySQL connection
mysql -u root -p -h localhost -P 3306
# Verify credentials in .env
# Check database exists
mysql -u root -p -e "SHOW DATABASES;"
```

### Issue: Out of Memory
```bash
# Increase Node.js heap size
NODE_OPTIONS=--max-old-space-size=4096 npm start

# Monitor memory
top -p $(pgrep -f "node server.js")
```

### Issue: WebSocket Connection Issues
```bash
# Check CORS configuration
# Verify FRONTEND_URL in .env
# Test Socket.IO connection
curl http://localhost:5002/socket.io/?EIO=4&transport=polling
```

---

## Maintenance Tasks

### Weekly
- [ ] Review application logs
- [ ] Check disk space
- [ ] Monitor database size
- [ ] Verify backups completed

### Monthly
- [ ] Run VACUUM on database
- [ ] Review security updates
- [ ] Update dependencies
- [ ] Test disaster recovery

### Quarterly
- [ ] Load testing
- [ ] Security audit
- [ ] Performance optimization review
- [ ] Capacity planning

---

## Support & Resources

- Documentation: `BACKEND_UPGRADE_DOCUMENTATION.md`
- Quick Start: `BACKEND_QUICKSTART.md`
- API Reference: `API_REFERENCE.md`
- GitHub: `https://github.com/Kelly254-shazey/Academix`

---

**Last Updated:** December 11, 2025  
**Status:** Production Ready ✅  
**Backend Version:** 2.0.0
