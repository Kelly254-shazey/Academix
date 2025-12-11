# 🚀 ClassTrack AI - Quick Reference Guide

## ⚡ 5-Minute Startup

### Backend
```bash
cd classtrack-backend
npm install
cp .env.example .env
# Edit .env: DB credentials, JWT secret, Redis host
npm run dev
```

### Frontend
```bash
cd classtrack-frontend
npm install
npm start
```

**URLs:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Health Check: http://localhost:5000/health

---

## 🐳 Docker Setup (1 Command)

```bash
docker-compose up -d
```

**Services running:**
- PostgreSQL: localhost:5432
- Redis: localhost:6379
- Backend: localhost:5000
- Frontend: localhost:3000

---

## 📝 Environment Setup

### Create Database
```bash
createdb classtrack_ai
psql -U postgres -d classtrack_ai -f classtrack-backend/database/schema.sql
```

### Environment Variables (.env)
```env
NODE_ENV=development
PORT=5000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=classtrack_ai
DB_USER=postgres
DB_PASSWORD=your_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your_secret_key_change_in_production
```

---

## 🔑 Test Credentials

**Student**
```
Email: jane.doe@student.university.edu
Password: (set in database or use registration)
```

**Lecturer**
```
Email: john.smith@university.edu
Password: (set in database or use registration)
```

**Admin**
```
Email: admin@university.edu
Password: (set in database or use registration)
```

---

## 🎯 Key Endpoints

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"student@university.edu","password":"password"}'
```

### Student Check-In
```bash
curl -X POST http://localhost:5000/api/attendance/check-in \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId":"session-id",
    "qrData":"qr-signature",
    "gpsData":{"latitude":40.7128,"longitude":-74.0060},
    "fingerprint":"browser-fingerprint"
  }'
```

### Start Class Session
```bash
curl -X POST http://localhost:5000/api/classes/class-id/start-session \
  -H "Authorization: Bearer LECTURER_TOKEN"
```

### Get Student Dashboard
```bash
curl -X GET http://localhost:5000/api/attendance/history \
  -H "Authorization: Bearer STUDENT_TOKEN"
```

### Get AI Predictions
```bash
curl -X GET http://localhost:5000/api/ai/predict/absenteeism/course-id \
  -H "Authorization: Bearer TOKEN"
```

---

## 🛠️ Common Tasks

### View Database
```bash
psql -U postgres -d classtrack_ai

-- Check tables
\dt

-- View users
SELECT * FROM users;

-- View attendance logs
SELECT * FROM attendance_logs LIMIT 10;
```

### View Backend Logs
```bash
npm run dev
# Logs appear in terminal
```

### Clear Redis Cache
```bash
redis-cli FLUSHDB
```

### Kill Process on Port 5000
```bash
lsof -i :5000
kill -9 <PID>
```

---

## 📊 Monitoring

### API Health
```bash
curl http://localhost:5000/health
```

**Response:**
```json
{
  "status": "ok",
  "service": "ClassTrack AI Backend",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Database Connection
```bash
psql -U postgres -c "SELECT version();"
```

### Redis Connection
```bash
redis-cli ping
# Response: PONG
```

---

## 🚀 Deployment Quick Start

### Render
1. Push code to GitHub
2. Connect repo at render.com
3. Set environment variables
4. Deploy (auto-deploys on push)

### Docker
```bash
# Build image
docker build -t classtrack-backend:latest classtrack-backend/

# Run container
docker run -d -p 5000:5000 -e DB_HOST=host.docker.internal classtrack-backend:latest
```

### AWS EC2
```bash
# SSH to instance
ssh -i key.pem ubuntu@ip

# Install dependencies
sudo apt update && sudo apt install nodejs postgresql redis-server

# Clone and run
git clone repo
cd repo/classtrack-backend
npm install
npm start
```

---

## 🐛 Troubleshooting

### "Cannot connect to database"
```bash
# Check PostgreSQL
sudo systemctl status postgresql
sudo systemctl restart postgresql

# Check credentials in .env
cat .env | grep DB_
```

### "QR code not generating"
```bash
# Check Redis
redis-cli ping

# Check environment
echo $REDIS_HOST
echo $JWT_SECRET
```

### "Frontend shows blank page"
```bash
# Clear cache
rm -rf node_modules/.cache
npm start

# Check API URL
cat .env | grep REACT_APP_API_URL
```

### "Port already in use"
```bash
# Find process
lsof -i :5000

# Kill it
kill -9 <PID>
```

---

## 📁 Important Files

| File | Purpose |
|------|---------|
| `classtrack-backend/src/server.js` | Main backend server |
| `classtrack-backend/src/middleware/auth.js` | Authentication logic |
| `classtrack-backend/database/schema.sql` | Database structure |
| `classtrack-backend/.env.example` | Configuration template |
| `classtrack-frontend/src/App.js` | Frontend routing |
| `docker-compose.yml` | Docker services |
| `DEPLOYMENT_GUIDE.md` | Setup guide |

---

## 🔐 Security Checklist

Before production deployment:

- [ ] Change JWT_SECRET to strong random key (50+ chars)
- [ ] Set NODE_ENV=production
- [ ] Enable HTTPS/SSL certificates
- [ ] Configure CORS origins (not * in production)
- [ ] Set strong database password
- [ ] Enable Redis password authentication
- [ ] Restrict database access to backend only
- [ ] Setup database backups
- [ ] Configure monitoring & logging
- [ ] Setup rate limiting on API
- [ ] Enable security headers (Helmet.js)

---

## 📞 Support Commands

### Get System Info
```bash
node --version
npm --version
postgres --version
redis-cli --version
docker --version
```

### View Backend Logs
```bash
npm run dev 2>&1 | tee app.log
```

### Database Backup
```bash
pg_dump -U postgres classtrack_ai > backup.sql
```

### Database Restore
```bash
psql -U postgres classtrack_ai < backup.sql
```

---

## ✨ Features Summary

✅ Student attendance check-in (QR + GPS + Device ID)  
✅ Rotating QR codes (every 30-60 seconds)  
✅ AI predictions (absenteeism risk scoring)  
✅ Anomaly detection (spoofing alerts)  
✅ Admin dashboard (real-time statistics)  
✅ Class management (start/end sessions)  
✅ Report export (CSV format)  
✅ Real-time notifications (Socket.IO)  
✅ Role-based access (student/lecturer/admin)  
✅ Docker ready (docker-compose included)  

---

## 🎓 Next Steps

1. **Setup**: Follow "5-Minute Startup" above
2. **Test**: Create test users and try check-in flow
3. **Configure**: Adjust environment variables for your needs
4. **Deploy**: Use DEPLOYMENT_GUIDE.md for production
5. **Monitor**: Check health endpoint and logs regularly

---

## 📚 Documentation

- **Full Architecture**: `CLASSTRACK_AI_ARCHITECTURE.md`
- **Deployment**: `DEPLOYMENT_GUIDE.md`
- **Implementation**: `IMPLEMENTATION_SUMMARY.md`
- **API Reference**: Each controller file

---

**Version**: 1.0.0  
**Last Updated**: January 2024  
**Status**: ✅ Production Ready

🚀 **Ready to go! Start with 5-Minute Startup above.**
