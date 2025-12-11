# ClassTrack AI - System Architecture

## 📋 System Overview

ClassTrack AI is a fully web-based AI-powered university attendance and class monitoring platform that solves manual attendance issues through dynamic QR codes, geo-fencing, real-time notifications, and AI-driven insights.

---

## 🏗️ Architecture Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENT LAYER (Web)                           │
├──────────────────┬──────────────────┬─────────────────────────┤
│  Student Web App │ Lecturer Web App │  Admin/HOD Dashboard    │
│   (React PWA)    │   (React PWA)    │   (React + Charts)      │
└──────────────────┴──────────────────┴─────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│              API GATEWAY & MIDDLEWARE                            │
│  ├─ Authentication (JWT + Browser Fingerprint)                 │
│  ├─ Rate Limiting                                               │
│  ├─ CORS & Security Headers                                    │
│  └─ Error Handling & Logging                                   │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│              BUSINESS LOGIC LAYER (Services)                    │
├──────────────┬───────────┬──────────┬─────────┬─────────────┤
│ Auth Service │  QR Svc   │ Attend.  │ Notif.  │ Class Mgmt  │
├──────────────┼───────────┼──────────┼─────────┼─────────────┤
│ AI Engine    │ Reporting │ GPS Svc  │ Browser │ Cache       │
└──────────────┴───────────┴──────────┴─────────┴─────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│            DATA & EXTERNAL SERVICES LAYER                        │
├────────────────┬──────────────┬──────────┬──────────────────┤
│ PostgreSQL DB  │ Redis Cache  │ Firebase │ Email Service    │
│                │ (QR tokens)  │ (Push)   │ (SendGrid)       │
└────────────────┴──────────────┴──────────┴──────────────────┘
```

---

## 🔹 Microservices / Modular Services

### 1. **Authentication Service**
- JWT token generation & validation
- Role-based access control (RBAC)
- Browser fingerprinting (device binding)
- Session management

### 2. **QR Code Service**
- Generate rotating QR codes (30-60 sec refresh)
- Encrypt session tokens
- Validate QR signatures
- Redis caching for token states

### 3. **Attendance Service**
- Student check-in validation
- Lecturer check-in tracking
- GPS verification (geofencing)
- Browser fingerprint logging
- Anomaly detection

### 4. **Class Management Service**
- Schedule classes
- Assign lecturers
- Start/end sessions
- Cancel/reschedule classes
- Real-time class status

### 5. **Notification Service**
- Web Push API (Service Workers)
- Email fallback (SendGrid/Mailgun)
- Notification preferences
- Delivery tracking

### 6. **AI Engine**
- Attendance trend analysis
- Absenteeism prediction model
- Lecturer punctuality scoring
- Anomaly detection
- Weekly automated insights

### 7. **Reporting Service**
- Attendance analytics & statistics
- CSV/PDF export
- Course-wide trends
- Lecturer performance reports
- Dashboard visualizations

---

## 📊 Database Schema (PostgreSQL)

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('student', 'lecturer', 'admin') NOT NULL,
  department_id UUID,
  browser_fingerprint VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Classes Table
```sql
CREATE TABLE classes (
  id UUID PRIMARY KEY,
  course_code VARCHAR(50) NOT NULL,
  course_name VARCHAR(255) NOT NULL,
  lecturer_id UUID NOT NULL REFERENCES users(id),
  department_id UUID,
  day_of_week INT, -- 0-6 (Monday-Sunday)
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location_name VARCHAR(255),
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  geofence_radius_meters INT DEFAULT 100,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Class Sessions Table
```sql
CREATE TABLE class_sessions (
  id UUID PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES classes(id),
  session_date DATE NOT NULL,
  session_number INT,
  qr_code_current VARCHAR(500),
  qr_signature VARCHAR(500),
  qr_expires_at TIMESTAMP,
  lecturer_checked_in BOOLEAN DEFAULT FALSE,
  lecturer_check_in_time TIMESTAMP,
  status ENUM('scheduled', 'ongoing', 'completed', 'cancelled') DEFAULT 'scheduled',
  cancellation_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Attendance Logs Table
```sql
CREATE TABLE attendance_logs (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES class_sessions(id),
  student_id UUID NOT NULL REFERENCES users(id),
  check_in_timestamp TIMESTAMP NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  browser_fingerprint VARCHAR(255),
  verification_status ENUM('success', 'gps_fail', 'expired_qr', 'spoofed', 'pending') DEFAULT 'pending',
  gps_distance_meters FLOAT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Notifications Table
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  notification_type ENUM('attendance', 'class_update', 'alert', 'report'),
  status ENUM('sent', 'failed', 'read') DEFAULT 'sent',
  sent_at TIMESTAMP DEFAULT NOW(),
  read_at TIMESTAMP
);
```

### AI Predictions Table
```sql
CREATE TABLE ai_predictions (
  id UUID PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES users(id),
  course_id UUID,
  prediction_type ENUM('absenteeism', 'dropout_risk', 'performance_score'),
  predicted_value FLOAT NOT NULL,
  confidence_score FLOAT,
  features_used JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Attendance Analytics Table
```sql
CREATE TABLE attendance_analytics (
  id UUID PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES users(id),
  course_id UUID,
  total_classes INT,
  attended_classes INT,
  attendance_percentage FLOAT,
  trend_direction ENUM('improving', 'declining', 'stable'),
  generated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔌 API Endpoints

### Authentication
```
POST   /api/auth/register           → Register new user
POST   /api/auth/login              → Login with email/password
POST   /api/auth/logout             → Logout user
GET    /api/auth/me                 → Get current user profile
POST   /api/auth/refresh-token      → Refresh JWT token
```

### Classes
```
GET    /api/classes                 → Get all classes (filtered by role)
GET    /api/classes/:id             → Get class details
POST   /api/classes/create          → Create new class (lecturer/admin)
PUT    /api/classes/:id             → Update class
POST   /api/classes/:id/start-session → Start class session (lecturer)
POST   /api/classes/:id/end-session   → End class session (lecturer)
POST   /api/classes/:id/cancel      → Cancel class (lecturer/admin)
GET    /api/classes/:id/sessions    → Get class sessions (attendance history)
```

### QR Code
```
GET    /api/qr/:sessionId           → Get current QR code
POST   /api/qr/:sessionId/validate  → Validate QR token
GET    /api/qr/:sessionId/status    → Check QR validity
```

### Attendance
```
POST   /api/attendance/student-checkin → Student QR + GPS check-in
POST   /api/attendance/lecturer-checkin → Lecturer check-in
GET    /api/attendance/:studentId   → Get student attendance history
GET    /api/attendance/class/:classId → Get class attendance
GET    /api/attendance/analytics/:studentId → Student analytics
```

### Notifications
```
POST   /api/notifications/subscribe → Subscribe to push notifications
GET    /api/notifications          → Get user notifications
POST   /api/notifications/:id/read → Mark notification as read
DELETE /api/notifications/:id      → Delete notification
```

### AI & Analytics
```
GET    /api/ai/predictions/:studentId → Get student predictions
GET    /api/ai/insights/:courseId   → Course insights
GET    /api/ai/lecturer-score/:lecturerId → Lecturer punctuality score
GET    /api/reports/attendance    → Generate attendance report
GET    /api/reports/export/:format → Export report (csv/pdf)
GET    /api/dashboard/summary      → Admin dashboard summary
GET    /api/dashboard/realtime     → Real-time class status
```

---

## 🗂️ Project Structure

```
classtrack-ai/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js
│   │   │   ├── redis.js
│   │   │   └── firebase.js
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   ├── errorHandler.js
│   │   │   └── validation.js
│   │   ├── services/
│   │   │   ├── AuthService.js
│   │   │   ├── QRService.js
│   │   │   ├── AttendanceService.js
│   │   │   ├── ClassService.js
│   │   │   ├── NotificationService.js
│   │   │   ├── AIEngine.js
│   │   │   └── ReportingService.js
│   │   ├── controllers/
│   │   │   ├── AuthController.js
│   │   │   ├── ClassController.js
│   │   │   ├── AttendanceController.js
│   │   │   ├── NotificationController.js
│   │   │   └── DashboardController.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── classes.js
│   │   │   ├── attendance.js
│   │   │   ├── qr.js
│   │   │   ├── notifications.js
│   │   │   └── dashboard.js
│   │   ├── models/
│   │   │   └── (Sequelize/TypeORM models)
│   │   ├── utils/
│   │   │   ├── qrGenerator.js
│   │   │   ├── fingerprinting.js
│   │   │   ├── gpsValidator.js
│   │   │   └── encryption.js
│   │   ├── ai/
│   │   │   ├── models/
│   │   │   │   ├── absenteeismPredictor.js
│   │   │   │   ├── lecturerScorer.js
│   │   │   │   └── anomalyDetector.js
│   │   │   └── train.py (Python ML scripts)
│   │   └── index.js
│   ├── database/
│   │   ├── migrations/
│   │   ├── schema.sql
│   │   └── seeds/
│   ├── .env.example
│   ├── package.json
│   └── Dockerfile
│
├── frontend/
│   ├── public/
│   │   ├── service-worker.js (PWA)
│   │   ├── manifest.json (PWA)
│   │   └── index.html
│   ├── src/
│   │   ├── pages/
│   │   │   ├── student/
│   │   │   │   ├── Dashboard.jsx
│   │   │   │   ├── TodayClasses.jsx
│   │   │   │   ├── QRScanner.jsx
│   │   │   │   ├── AttendanceHistory.jsx
│   │   │   │   └── Profile.jsx
│   │   │   ├── lecturer/
│   │   │   │   ├── Dashboard.jsx
│   │   │   │   ├── MyCourses.jsx
│   │   │   │   ├── StartSession.jsx
│   │   │   │   ├── ClassStatus.jsx
│   │   │   │   └── PunctualityScore.jsx
│   │   │   └── admin/
│   │   │       ├── Dashboard.jsx
│   │   │       ├── RealtimeMonitor.jsx
│   │   │       ├── Analytics.jsx
│   │   │       └── Reports.jsx
│   │   ├── components/
│   │   │   ├── QRDisplay.jsx
│   │   │   ├── QRScanner.jsx
│   │   │   ├── GPSMap.jsx
│   │   │   ├── NotificationBell.jsx
│   │   │   └── Charts.jsx
│   │   ├── hooks/
│   │   │   ├── useAuth.js
│   │   │   ├── useGeolocation.js
│   │   │   ├── useNotifications.js
│   │   │   └── useBrowserFingerprint.js
│   │   ├── services/
│   │   │   ├── api.js
│   │   │   ├── authService.js
│   │   │   ├── notificationService.js
│   │   │   └── gpsService.js
│   │   ├── App.jsx
│   │   └── index.js
│   ├── package.json
│   └── tailwind.config.js
│
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 🚀 Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Cache**: Redis
- **Push Notifications**: Firebase Cloud Messaging / Web Push API
- **ML/AI**: Python (TensorFlow/Scikit-learn) + Node.js integration
- **Email**: SendGrid / Mailgun
- **Deployment**: Docker + Docker Compose

### Frontend
- **Framework**: React 18+
- **Styling**: Tailwind CSS
- **State Management**: Redux Toolkit / RTK Query
- **Routing**: React Router v6
- **Charts**: Recharts / Chart.js
- **PWA**: Service Workers, Manifest
- **Geolocation**: Web Geolocation API
- **Camera**: HTML5 getUserMedia (QR scanning)

---

## 🔒 Security Features

- ✅ JWT authentication with refresh tokens
- ✅ Browser fingerprinting (device binding)
- ✅ HTTPS/TLS encryption
- ✅ CORS protection
- ✅ Rate limiting
- ✅ Input validation & sanitization
- ✅ SQL injection prevention (prepared statements)
- ✅ XSS protection
- ✅ CSRF tokens
- ✅ Encrypted GPS coordinates
- ✅ QR signature validation

---

## 📱 Progressive Web App (PWA) Features

- ✅ Offline capability (Service Worker)
- ✅ Push notifications (Web Push API)
- ✅ Install to homescreen
- ✅ Responsive design (mobile-first)
- ✅ Camera access for QR scanning
- ✅ Geolocation API
- ✅ Fast load times with caching

---

## 🤖 AI/ML Models

### 1. Absenteeism Prediction
**Type**: Binary Classification  
**Features**:
- Past attendance rate
- Class time (morning vs afternoon)
- Day of week
- Course difficulty score
- Lecturer punctuality rating

**Output**: Probability of missing next class

### 2. Lecturer Punctuality Score
**Type**: Regression  
**Features**:
- Average check-in delay (minutes)
- Number of on-time sessions
- Number of late sessions
- Session frequency

**Output**: Punctuality score (0-100)

### 3. Attendance Anomaly Detection
**Type**: Unsupervised (Isolation Forest)  
**Detects**:
- Sudden drop in attendance
- Identical GPS coordinates (multiple students)
- Same browser fingerprint across users
- Unusual check-in patterns

---

## 📈 Real-Time Capabilities

- ✅ WebSocket connections for live class status
- ✅ Real-time QR code refresh (30-60 sec)
- ✅ Live attendance count in class
- ✅ Push notifications on class events
- ✅ Real-time analytics dashboard (admin)

---

## 🔄 Deployment Architecture

```
┌─────────────────┐
│  GitHub Repo    │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Docker Hub     │ (Build & Push images)
└────────┬────────┘
         │
         ↓
┌─────────────────┐        ┌──────────────┐
│  Docker Compose │───────→│ Render.com   │ (or AWS/Heroku)
│  (Local/Prod)   │        │  Deployment  │
└─────────────────┘        └──────────────┘
         │
         ├─→ PostgreSQL Container
         ├─→ Redis Container
         ├─→ Node.js Backend Container
         └─→ React Frontend Container (Static)
```

---

## 📋 Development Checklist

- [ ] Database schema & migrations
- [ ] Authentication service (JWT + fingerprinting)
- [ ] QR code generation & validation
- [ ] Attendance tracking service
- [ ] Class management APIs
- [ ] Notification system (Web Push + Email)
- [ ] AI/ML models & training
- [ ] Admin dashboard
- [ ] Student web app
- [ ] Lecturer web app
- [ ] PWA configuration
- [ ] Docker & deployment setup
- [ ] Testing & documentation

---

## 🎯 Next Steps

1. Initialize backend project structure
2. Set up database and migrations
3. Implement authentication service
4. Build QR code service
5. Create attendance validation APIs
6. Implement notification system
7. Develop React web apps
8. Integrate AI/ML models
9. Set up Docker & deployment
10. Testing & optimization

