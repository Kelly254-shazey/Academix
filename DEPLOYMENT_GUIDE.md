# ClassTrack AI - Deployment & Setup Guide

## Overview

ClassTrack AI is a comprehensive, AI-powered attendance management system built with Node.js, React, PostgreSQL, and Redis. This guide covers local development setup, Docker deployment, and production deployment.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Docker Deployment](#docker-deployment)
4. [Production Deployment](#production-deployment)
5. [Configuration](#configuration)
6. [API Documentation](#api-documentation)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

- **Node.js** >= 16 LTS
- **PostgreSQL** >= 12
- **Redis** >= 6.0
- **Docker** >= 20.10 (for Docker deployment)
- **Git**
- **npm** or **yarn**

### System Requirements

- **RAM**: Minimum 4GB, Recommended 8GB+
- **Storage**: Minimum 10GB for development
- **OS**: Linux, macOS, or Windows (WSL2 recommended)

---

## Local Development Setup

### 1. Clone Repository

```bash
cd ~/projects
git clone https://github.com/BONCHEZZ/Academix.git classtrack-ai
cd classtrack-ai
```

### 2. Setup Backend

```bash
cd classtrack-backend

# Install dependencies
npm install

# Create .env file from template
cp .env.example .env

# Configure .env with your values
# - DB credentials
# - JWT secret
# - Redis connection
# - Email configuration
nano .env

# Create PostgreSQL database
createdb classtrack_ai

# Run migrations/schema
psql -U postgres -d classtrack_ai -f database/schema.sql

# Start backend server (development mode with hot reload)
npm run dev
```

**Backend runs on**: http://localhost:5000

### 3. Setup Frontend

```bash
cd ../classtrack-frontend

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_WS_URL=ws://localhost:5000
REACT_APP_ENV=development
EOF

# Start frontend development server
npm start
```

**Frontend runs on**: http://localhost:3000

### 4. Verify Setup

```bash
# Backend health check
curl http://localhost:5000/health

# Frontend should be accessible at
# http://localhost:3000/login
```

### 5. Create Test Users

Access PostgreSQL and insert test data:

```bash
psql -U postgres -d classtrack_ai

-- Create student user
INSERT INTO users (id, name, email, password_hash, role)
VALUES (
  gen_random_uuid(),
  'John Student',
  'student@university.edu',
  '$2b$10$placeholder_hash',
  'student'
);

-- Create lecturer user
INSERT INTO users (id, name, email, password_hash, role)
VALUES (
  gen_random_uuid(),
  'Dr. Jane Lecturer',
  'lecturer@university.edu',
  '$2b$10$placeholder_hash',
  'lecturer'
);

-- Create admin user
INSERT INTO users (id, name, email, password_hash, role)
VALUES (
  gen_random_uuid(),
  'Admin User',
  'admin@university.edu',
  '$2b$10$placeholder_hash',
  'admin'
);
```

---

## Docker Deployment

### 1. Using Docker Compose (Recommended)

```bash
# From project root
cd ~/projects/classtrack-ai

# Copy environment template
cp classtrack-backend/.env.example .env.docker

# Edit .env.docker with production values
nano .env.docker

# Build and start all services
docker-compose up -d --build

# Check service status
docker-compose ps

# View backend logs
docker-compose logs -f backend

# View database logs
docker-compose logs -f postgres

# Stop services
docker-compose down

# Stop and remove volumes (WARNING: deletes data!)
docker-compose down -v
```

### 2. Manual Docker Build

```bash
# Build backend image
cd classtrack-backend
docker build -t classtrack-backend:latest .

# Run PostgreSQL
docker run -d \
  --name classtrack-postgres \
  -e POSTGRES_PASSWORD=your_password \
  -e POSTGRES_DB=classtrack_ai \
  -p 5432:5432 \
  postgres:15-alpine

# Run Redis
docker run -d \
  --name classtrack-redis \
  -p 6379:6379 \
  redis:7-alpine

# Run backend
docker run -d \
  --name classtrack-backend \
  -p 5000:5000 \
  -e DB_HOST=classtrack-postgres \
  -e DB_PORT=5432 \
  --link classtrack-postgres \
  classtrack-backend:latest
```

### 3. Docker Network Setup

```bash
# Create network
docker network create classtrack-network

# Connect containers to network
docker network connect classtrack-network classtrack-postgres
docker network connect classtrack-network classtrack-redis
docker network connect classtrack-network classtrack-backend
```

---

## Production Deployment

### Option 1: Deploy to Render

#### Backend Deployment

1. **Create Render Account**: https://render.com

2. **Connect GitHub Repository**:
   - Go to Render Dashboard
   - Click "New +" → "Web Service"
   - Connect your GitHub repo
   - Select branch: `main`

3. **Configure Service**:
   ```
   Name: classtrack-ai-backend
   Environment: Node
   Build Command: npm install
   Start Command: npm run start
   ```

4. **Set Environment Variables**:
   ```
   DB_HOST=your-postgres-host
   DB_PORT=5432
   DB_NAME=classtrack_ai
   DB_USER=postgres
   DB_PASSWORD=your_secure_password
   JWT_SECRET=your_super_secret_key
   REDIS_HOST=your-redis-host
   REDIS_PORT=6379
   NODE_ENV=production
   ```

5. **Add PostgreSQL** (Render Postgres Add-on):
   - Add PostgreSQL database addon
   - Configure schema on first deployment

6. **Deploy**: Click "Create Web Service"

#### Frontend Deployment

1. **Deploy to Vercel or Netlify**:

   **Vercel:**
   ```bash
   npm install -g vercel
   cd classtrack-frontend
   vercel
   # Follow prompts
   ```

   **Environment Variables**:
   ```
   REACT_APP_API_URL=https://your-backend.render.com/api
   REACT_APP_WS_URL=wss://your-backend.render.com
   ```

### Option 2: Deploy to AWS

#### EC2 Deployment

1. **Launch EC2 Instance**:
   ```bash
   # Ubuntu 22.04 LTS, t3.medium
   # Security group: Allow 22 (SSH), 80 (HTTP), 443 (HTTPS), 5000 (API)
   ```

2. **SSH into Instance**:
   ```bash
   ssh -i your-key.pem ubuntu@your-ec2-ip
   ```

3. **Install Dependencies**:
   ```bash
   sudo apt update && sudo apt upgrade -y
   sudo apt install -y nodejs npm postgresql redis-server git
   
   # Install Node.js 18
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt install -y nodejs
   ```

4. **Clone and Setup**:
   ```bash
   git clone https://github.com/BONCHEZZ/Academix.git
   cd Academix
   
   # Backend setup
   cd classtrack-backend
   npm install
   cp .env.example .env
   # Edit .env
   nano .env
   
   # Start backend with PM2
   npm install -g pm2
   pm2 start npm --name "classtrack-backend" -- start
   pm2 save
   pm2 startup
   ```

5. **Setup Nginx Reverse Proxy**:
   ```bash
   sudo apt install -y nginx
   sudo nano /etc/nginx/sites-available/default
   ```

   Configure:
   ```nginx
   server {
       listen 80 default_server;
       server_name _;
   
       location /api {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   
       location / {
           proxy_pass http://localhost:3000;
       }
   }
   ```

   ```bash
   sudo systemctl restart nginx
   ```

6. **Enable HTTPS with Let's Encrypt**:
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot certonly --nginx -d yourdomain.com
   ```

### Option 3: Deploy to DigitalOcean

1. **Create Droplet**:
   - Ubuntu 22.04, 2GB RAM minimum
   - Enable VPC

2. **SSH and Setup**:
   ```bash
   ssh root@your-droplet-ip
   ```

3. **Install Docker**:
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   sudo usermod -aG docker $USER
   ```

4. **Deploy with Docker Compose**:
   ```bash
   git clone your-repo
   cd project
   docker-compose -f docker-compose.prod.yml up -d
   ```

---

## Configuration

### Environment Variables

See `.env.example` for all available options. Key variables:

```env
# Server
NODE_ENV=production
PORT=5000

# Database
DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=classtrack_ai
DB_USER=postgres
DB_PASSWORD=your_secure_password

# Cache
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=redis_secure_password

# Authentication
JWT_SECRET=your_long_random_secret_key_at_least_32_chars
JWT_EXPIRY=24h

# Email Notifications
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your_app_password

# Frontend
FRONTEND_URL=https://yourdomain.com

# QR Code
QR_EXPIRY_SECONDS=45
QR_ROTATION_INTERVAL_SECONDS=30
```

### Database Initialization

```bash
# Create database
createdb classtrack_ai

# Run schema
psql -U postgres -d classtrack_ai -f database/schema.sql

# Verify tables
psql -U postgres -d classtrack_ai -c "\dt"
```

---

## API Documentation

### Authentication Endpoints

```
POST   /api/auth/register          - User registration
POST   /api/auth/login             - User login
GET    /api/auth/me                - Current user profile
POST   /api/auth/logout            - Logout
PUT    /api/auth/profile           - Update profile
```

### Attendance Endpoints

```
POST   /api/attendance/check-in    - Student check-in (QR)
POST   /api/attendance/lecturer-check-in
GET    /api/attendance/history     - Attendance history
GET    /api/attendance/class/:classId/summary
GET    /api/attendance/percentage/:courseId
```

### Class Endpoints

```
POST   /api/classes                - Create class
GET    /api/classes/my-classes     - Lecturer's classes
POST   /api/classes/:classId/start-session
POST   /api/classes/:classId/sessions/:sessionId/end
POST   /api/classes/:classId/sessions/:sessionId/cancel
```

### AI/Insights Endpoints

```
GET    /api/ai/predict/absenteeism/:courseId
GET    /api/ai/anomalies/:classId
GET    /api/ai/trends/:courseId
GET    /api/ai/lecturer/insights
```

### Admin Endpoints

```
GET    /api/admin/dashboard        - Dashboard data
GET    /api/admin/analytics        - Analytics
GET    /api/admin/at-risk-students
GET    /api/admin/security-alerts
GET    /api/admin/reports/attendance-export
```

---

## Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql

# Check connection
psql -U postgres -c "SELECT version();"
```

### Redis Connection Issues

```bash
# Check Redis status
redis-cli ping

# Start Redis server
redis-server

# Check Redis info
redis-cli info
```

### Port Already in Use

```bash
# Find process using port 5000
lsof -i :5000

# Kill process
kill -9 <PID>
```

### Backend Not Starting

```bash
# Check logs
npm run dev 2>&1 | tee debug.log

# Verify environment variables
cat .env

# Check Node version
node --version

# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Frontend Build Issues

```bash
# Clear cache
rm -rf node_modules .next build
npm install

# Rebuild
npm run build

# Check for TypeScript errors
npm run type-check
```

### SSL/HTTPS Issues

```bash
# Generate self-signed certificate (development)
openssl req -x509 -newkey rsa:4096 -nodes -out cert.pem -keyout key.pem -days 365

# Verify certificate
openssl x509 -in cert.pem -text -noout
```

---

## Monitoring & Maintenance

### Check Application Health

```bash
curl -X GET http://localhost:5000/health
```

### View Logs

```bash
# Backend logs
pm2 logs classtrack-backend

# PostgreSQL logs
tail -f /var/log/postgresql/postgresql.log

# Nginx logs
tail -f /var/log/nginx/error.log
```

### Performance Monitoring

```bash
# Check system resources
top

# Check disk usage
df -h

# Check database size
psql -U postgres -d classtrack_ai -c "\l+ classtrack_ai"
```

### Database Backup

```bash
# Full backup
pg_dump -U postgres classtrack_ai > backup_$(date +%Y%m%d).sql

# Restore
psql -U postgres classtrack_ai < backup_20240101.sql
```

---

## Support & Resources

- **Documentation**: https://docs.classtrack-ai.com
- **Issues**: https://github.com/BONCHEZZ/Academix/issues
- **Email**: support@classtrack-ai.com

---

**Last Updated**: January 2024  
**Version**: 1.0.0
