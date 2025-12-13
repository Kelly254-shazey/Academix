# ClassTrack AI - Deployment Guide

## System Overview
A comprehensive role-based attendance and class management system with real-time WebSocket support, AI insights, and multi-role portals (Student, Lecturer, Admin).

### Technology Stack
- **Frontend**: React 18, React Router v6, TailwindCSS, Socket.IO Client
- **Backend**: Node.js/Express, MySQL, Socket.IO Server
- **AI**: Python (Flask), scikit-learn for analytics and anomaly detection
- **Containerization**: Docker & Docker Compose

---

## Pre-Deployment Checklist

### ✅ Frontend Status
- [x] Zero compilation errors
- [x] All unused imports removed
- [x] Responsive design (mobile/tablet/desktop)
- [x] Role-based portals (Student/Lecturer/Admin)
- [x] Real-time WebSocket integration
- [x] Logout functionality in all portals
- [x] Error handling with graceful fallbacks
- [x] Debug logging wrapped in environment checks
- [x] Production build: 399.94 kB JS, 8.34 kB CSS (gzipped)

### ✅ Backend Status
- [x] Server running on port 5000
- [x] MySQL database configured
- [x] Socket.IO server setup
- [x] Environment variables configured
- [x] CORS enabled for frontend
- [x] API endpoints documented

### ⚠️ AI Service Status
- [ ] Python environment configured
- [ ] Required packages installed (scikit-learn, flask, pandas)
- [ ] ML models trained (optional)

---

## Installation & Setup

### 1. Clone Repository
```bash
git clone https://github.com/Kelly254-shazey/Academix.git
cd Academix
```

### 2. Environment Configuration

#### Backend (.env)
```bash
cd backend
cp .env.example .env

# Edit .env with your values:
# DB_HOST=localhost
# DB_USER=root
# DB_PASSWORD=your_password
# DB_NAME=classtrack
# JWT_SECRET=your-secret-key
# NODE_ENV=production
# PORT=5000
# FRONTEND_URL=http://localhost:3000
```

#### Frontend (.env)
```bash
cd ../frontend
cp .env.example .env

# Edit .env with your values:
# REACT_APP_API_URL=http://localhost:5000/api
# REACT_APP_SOCKET_URL=http://localhost:5000
# REACT_APP_DEBUG_MODE=false
```

### 3. Database Setup
```bash
cd database
# Create database and tables
mysql -u root -p < schema.sql

# Run migrations
node migrations/run.js
```

### 4. Install Dependencies

#### Backend
```bash
cd backend
npm install
npm run start
# Server running at http://localhost:5000
```

#### Frontend
```bash
cd frontend
npm install
npm start
# Dev server at http://localhost:3000
```

#### AI Service (Optional)
```bash
cd ai
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
# API at http://localhost:5001
```

---

## Docker Deployment

### Option 1: Docker Compose (Recommended)
```bash
# Build and start all services
docker-compose up --build

# Services:
# - Frontend: http://localhost:3000
# - Backend: http://localhost:5000
# - MySQL: localhost:3306
# - Socket.IO: ws://localhost:5000
```

### Option 2: Individual Containers

#### Build Backend
```bash
cd backend
docker build -t classtrack-backend:latest .
docker run -p 5000:5000 --env-file .env classtrack-backend:latest
```

#### Build Frontend
```bash
cd frontend
docker build -t classtrack-frontend:latest .
docker run -p 80:3000 classtrack-frontend:latest
```

---

## API Endpoints Reference

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh-token` - Token refresh

### Student Portal
- `GET /api/schedule/today` - Today's schedule
- `GET /api/classes` - Enrolled courses
- `GET /api/attendance-analytics/overall` - Attendance stats
- `GET /api/notifications?limit=10` - Recent notifications
- `GET /api/messages` - User messages
- `POST /api/attendance/mark` - Mark attendance via QR

### Lecturer Portal
- `GET /api/classes` - Lecturer's classes
- `POST /api/classes/create` - Create new class
- `GET /api/attendance/class/:classId` - Class attendance records
- `POST /api/notifications/send` - Send notifications

### Admin Portal
- `GET /api/admin/users` - List all users
- `GET /api/admin/reports/attendance` - Attendance reports
- `GET /api/admin/analytics` - System analytics
- `POST /api/admin/notifications/broadcast` - Broadcast notifications

### Real-time Events (Socket.IO)
- `notification` - New notification received
- `attendance:marked` - Attendance marked
- `message:new` - New message
- `connection-confirmed` - Socket connection confirmed

---

## Testing the System

### 1. Test User Credentials (if seeded)
```
Student:
  Email: student@test.com
  Password: password123
  
Lecturer:
  Email: lecturer@test.com
  Password: password123
  
Admin:
  Email: admin@test.com
  Password: password123
```

### 2. Feature Verification
- [ ] Login with each role
- [ ] Dashboard loads without errors
- [ ] Real-time notifications work
- [ ] Logout button present and functional
- [ ] Responsive design on mobile
- [ ] QR scanning works (Student)
- [ ] Messages send/receive
- [ ] No console errors in production mode

### 3. Performance Testing
```bash
# Frontend build size
cd frontend
npm run build
# Expected: ~400KB JS, ~8KB CSS (gzipped)

# Load testing backend
npm install -g autocannon
autocannon http://localhost:5000/api/health -c 100 -d 10
```

---

## Troubleshooting

### Frontend Issues

**Issue**: "Cannot find module" errors
```bash
Solution:
cd frontend
rm -rf node_modules package-lock.json
npm install
npm start
```

**Issue**: WebSocket connection failing
```bash
Check:
1. Backend is running on port 5000
2. REACT_APP_SOCKET_URL is correct in .env
3. CORS is enabled on backend
4. Firewall allows WebSocket connections
```

**Issue**: API calls returning 401 or 500
```bash
Solution:
1. Verify backend is running
2. Check API_URL in frontend .env
3. Ensure JWT tokens are valid
4. Check backend logs: tail -f backend/logs/app-*.log
```

### Backend Issues

**Issue**: Database connection failed
```bash
Check:
1. MySQL is running
2. DB_HOST, DB_USER, DB_PASSWORD are correct
3. Database exists (CREATE DATABASE classtrack;)
4. User has correct privileges
```

**Issue**: Port 5000 already in use
```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9  # Unix/Linux/Mac
netstat -ano | findstr :5000   # Windows - then taskkill /PID <PID>

# Or change port in .env and frontend .env
```

---

## Production Deployment

### Environment Variables for Production

#### Backend (.env)
```
NODE_ENV=production
JWT_EXPIRY=7d
SESSION_SECRET=generate-random-key
DB_POOL_LIMIT=20
RATE_LIMIT_WINDOW=15m
RATE_LIMIT_MAX_REQUESTS=100
```

#### Frontend (.env.production)
```
REACT_APP_DEBUG_MODE=false
REACT_APP_API_URL=https://api.youromain.com
REACT_APP_SOCKET_URL=https://api.youromain.com
```

### Security Checklist
- [ ] HTTPS enabled on all endpoints
- [ ] CORS properly configured (specific origins, not *)
- [ ] Database credentials in secure environment variables
- [ ] JWT secrets rotated regularly
- [ ] Input validation on all endpoints
- [ ] Rate limiting enabled
- [ ] Error messages don't leak system info
- [ ] Sensitive logs removed (REACT_APP_DEBUG_MODE=false)

### Deployment to Cloud

#### Heroku
```bash
# Prepare backend
cd backend
heroku create classtrack-api
heroku buildpacks:add heroku/nodejs
git push heroku main

# Prepare frontend
cd ../frontend
npm run build
# Deploy build folder to Netlify or Vercel
```

#### AWS EC2
```bash
# Launch EC2 instance (Ubuntu 20.04)
ssh -i key.pem ubuntu@your-instance-ip

# Install dependencies
sudo apt update && sudo apt install nodejs npm mysql-server

# Clone and setup
git clone <repo>
cd Academix/backend
npm install
npm start &

cd ../frontend
npm install
npm run build
# Serve with Nginx
```

#### Docker Swarm / Kubernetes
```bash
# Initialize Swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml classtrack

# Scale services
docker service scale classtrack_backend=3
docker service scale classtrack_frontend=2
```

---

## Monitoring & Maintenance

### Logs
```bash
# Backend logs
tail -f backend/logs/app-*.log

# Frontend browser console
F12 → Console tab

# Docker logs
docker logs <container-id>
docker logs -f --tail=100 <container-id>
```

### Performance Metrics
- Response time: Target <500ms for API endpoints
- WebSocket latency: Target <100ms
- Build size: Keep JS <500KB, CSS <20KB (gzipped)
- Database queries: Monitor slow queries

### Regular Maintenance
- [ ] Database backups (daily)
- [ ] Log rotation (weekly)
- [ ] Security updates (monthly)
- [ ] Performance optimization (quarterly)
- [ ] SSL certificate renewal (every 3 months)

---

## Support & Documentation

### API Documentation
See [backend/README.md](backend/README.md) for detailed API docs.

### Frontend Component Guide
See [frontend/README.md](frontend/README.md) for component documentation.

### Architecture Diagram
```
┌─────────────────┐
│   React App     │  (Frontend: Port 3000)
├─────────────────┤
│ - StudentPortal │
│ - LecturerPortal│
│ - AdminPortal   │
└────────┬────────┘
         │ HTTP/WebSocket
         ↓
┌─────────────────────┐
│  Express Server     │  (Backend: Port 5000)
├─────────────────────┤
│ - Auth Routes       │
│ - API Routes        │
│ - Socket.IO Server  │
└────────┬────────────┘
         │ SQL
         ↓
    ┌──────────┐
    │ MySQL DB │
    └──────────┘
```

### Contact & Issues
- GitHub Issues: [Report bugs here]
- Email: support@classtrack.ai
- Documentation: [Full docs available]

---

## Version History
- **v1.0.0** (Current) - Production-ready system with three role-based portals
- **v0.9.0** - Beta release with core features
- **v0.1.0** - Initial prototype

**Last Updated**: December 2024
