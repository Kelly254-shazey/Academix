# ClassTrack AI - Backend & Deployment Guide

## 📋 Project Overview

ClassTrack AI is a comprehensive web-based university attendance and class monitoring system built with Node.js, Express, MySQL, and Redis.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MySQL 8+
- Redis
- Docker & Docker Compose (optional)

### Local Development Setup

#### 1. Clone & Install

```bash
cd backend
npm install
```

#### 2. Setup Database

```bash
# Create database and tables (ensure DB name in schema matches .env)
mysql -u root -p < ../database/schema.sql
```

#### 3. Environment Variables

Copy `.env.example` to `.env` and update with your credentials:

```bash
cp .env.example .env
```

Update the following:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=kelly123
JWT_SECRET=your-secret-key
```

#### 4. Run Server

```bash
npm start
```

Server will run on `http://localhost:5002`

---

## 🐳 Docker Deployment

### Using Docker Compose (Recommended)

```bash
# Build and start all services (MySQL, Redis, Backend, Frontend)
docker-compose up --build

# Stop services
docker-compose down

# View logs
docker-compose logs -f backend
```

Access:
- Backend API: `http://localhost:5002`
- Frontend: `http://localhost:3000`
- MySQL: `localhost:3306`
- Redis: `localhost:6379`

---

## 📦 Production Deployment

### Option 1: Render (PaaS)

```bash
# 1. Push code to GitHub
git push origin main

# 2. Create new Service on Render.com
# - Select GitHub repo
# - Runtime: Node
# - Build: npm install
# - Start: npm start
# - Environment: Add from .env.example
```

### Option 2: Railway

```bash
# 1. Install Railway CLI
npm i -g @railway/cli

# 2. Login and deploy
railway login
railway up
```

### Option 3: AWS EC2

```bash
# 1. SSH into EC2 instance
ssh -i your-key.pem ec2-user@your-instance-ip

# 2. Install Node and dependencies
curl -sL https://rpm.nodesource.com/setup_18.x | sudo bash
sudo yum install -y nodejs

# 3. Clone repo and setup
git clone your-repo-url
cd backend
npm install
cp .env.example .env  # Edit with production values

# 4. Install PM2 globally
npm i -g pm2

# 5. Start with PM2
pm2 start ecosystem.config.js
pm2 save
```

### Option 4: cPanel/Shared Hosting

1. Upload files via FTP
2. Create Node.js app in cPanel
3. Set environment variables in control panel
4. Point to `server.js` as entry point

---

## 📚 API Documentation

### Authentication Endpoints

#### POST /auth/register
```json
{
  "name": "John Doe",
  "email": "john@university.edu",
  "password": "securePassword123",
  "role": "student"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@university.edu",
    "role": "student"
  }
}
```

#### POST /auth/login
```json
{
  "email": "john@university.edu",
  "password": "securePassword123"
}
```

#### GET /auth/verify
Headers: `Authorization: Bearer <token>`

---

### Class Management

#### GET /classes
List all classes

#### POST /classes
Create new class
```json
{
  "course_code": "CS101",
  "course_name": "Introduction to Computer Science",
  "lecturer_id": 2,
  "day_of_week": "Monday",
  "start_time": "09:00",
  "end_time": "11:00",
  "location_lat": 40.7128,
  "location_lng": -74.0060
}
```

#### POST /classes/:classId/sessions
Start a class session

#### POST /classes/:classId/sessions/:sessionId/scan
Student QR scan check-in
```json
{
  "studentId": 1,
  "qr_signature": "abc123xyz",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "browser_fingerprint": "fp123"
}
```

---

## 🔒 Security Best Practices

1. **JWT Tokens**: Set expiry and refresh rotation
2. **Password Hashing**: Uses bcrypt with 10 rounds
3. **SQL Injection**: All queries are parameterized
4. **CORS**: Configured for specific origins (update in production)
5. **Environment Variables**: Never commit `.env` files
6. **HTTPS**: Enable in production (via reverse proxy like Nginx)

---

## 🧪 Testing

```bash
# Run tests (if Jest is configured)
npm test

# Run with coverage
npm run test:coverage
```

---

## 📊 Monitoring

### PM2 Monitoring

```bash
# View running processes
pm2 list

# Monitor performance
pm2 monit

# View logs
pm2 logs

# Restart application
pm2 restart classtrack-backend
```

### Database Health

```bash
mysql -u root -p -e "SHOW PROCESSLIST;"
mysql -u root -p classtrack -e "SELECT COUNT(*) FROM users;"
```

---

## 🔧 Troubleshooting

### Port Already in Use
```bash
# Find and kill process on port 5002
lsof -i :5002
kill -9 <PID>
```

### Database Connection Error
```bash
# Check MySQL status
sudo systemctl status mysql

# Test connection
mysql -u root -p -h localhost
```

### JWT Token Issues
1. Ensure `JWT_SECRET` is set correctly in `.env`
2. Check token expiry in client
3. Verify `Authorization` header format: `Bearer <token>`

---

## 📝 Environment Variables Reference

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| PORT | number | 5002 | Server port |
| NODE_ENV | string | development | Environment mode |
| DB_HOST | string | localhost | MySQL hostname |
| DB_USER | string | root | MySQL user |
| DB_PASS | string | - | MySQL password |
| DB_NAME | string | classtrack | Database name |
| JWT_SECRET | string | - | JWT signing key |
| REDIS_URL | string | redis://localhost:6379 | Redis connection |
| FRONTEND_URL | string | http://localhost:3000 | Frontend origin |

---

## 🎯 Next Steps

1. ✅ Backend setup and deployment
2. ⚙️ Configure frontend `.env` to match backend URL
3. 🗄️ Seed database with test data
4. 🔌 Connect frontend to backend APIs
5. 🧪 Run integration tests
6. 📈 Set up monitoring and logging

---

## 📞 Support

For issues or questions:
1. Check `.env` configuration
2. Review server logs: `pm2 logs`
3. Verify database connection
4. Check CORS settings if frontend cannot reach backend

---

## ✅ Production Checklist

- [ ] Update `JWT_SECRET` to a strong value
- [ ] Set `NODE_ENV=production`
- [ ] Configure MySQL backups
- [ ] Enable HTTPS/SSL
- [ ] Set up monitoring (PM2+, New Relic, etc.)
- [ ] Configure email service (SendGrid/Mailgun)
- [ ] Set up error tracking (Sentry)
- [ ] Configure CDN for static assets
- [ ] Enable rate limiting
- [ ] Set up automated deployments (CI/CD)
