# ClassTrack AI - Enterprise Architecture Document
## Real-Time, AI-Powered, Database-First Attendance Platform

---

## 🏗️ SYSTEM ARCHITECTURE OVERVIEW

### Core Principle: **Database-First, Backend-Authority, Frontend-Display**

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND PORTALS                          │
│  (Student | Lecturer | Admin) - Display ONLY                │
│  All interactions go through REST API + Socket.IO             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              BACKEND API LAYER (Node.js/Express)             │
│  • Request validation                                        │
│  • Database queries (always)                                 │
│  • Business logic                                            │
│  • Error handling                                            │
│  • Audit logging                                             │
│  • Socket.IO real-time updates                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         DATABASE LAYER (MySQL - Single Source of Truth)      │
│  • users (id, email, password_hash, role, status)           │
│  • class_sessions (id, lecturer_id, status, attendance_...)  │
│  • attendance_scans (student_id, session_id, verified...)     │
│  • login_attempts (for rate limiting)                        │
│  • admin_messages (all communications)                       │
│  • audit_logs (complete action history)                      │
│  • communication_audit_log (message tracking)                │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 DATA FLOW ENFORCEMENT

### Rule 1: Frontend DISPLAYS Only
- ❌ No data generated on frontend
- ❌ No attendance marked on frontend
- ❌ No QR code created on frontend
- ✅ Display live data from backend API
- ✅ Show cached data until real-time update arrives

### Rule 2: Backend VALIDATES & STORES Only
- ✅ All requests validated server-side
- ✅ All data persisted to database
- ✅ All errors logged
- ✅ All state changes audited
- ❌ No trust in client-sent values

### Rule 3: Database is AUTHORITY
- ✅ Only source of truth
- ✅ Every action creates audit entry
- ✅ Impossible to bypass
- ✅ Recoverable history
- ❌ No direct frontend DB access

---

## 📋 COMPLETE ENDPOINT SPECIFICATION

### ✅ AUTHENTICATION ENDPOINTS
```
POST /auth/login
  → Validates credentials
  → Checks IP (rate limit)
  → Logs attempt to login_attempts table
  → Returns JWT token + user data
  → STORES: login_attempts record

GET /auth/verify-token
  → Validates JWT from Authorization header
  → Fetches fresh user data from users table
  → Returns current user state
  → ALWAYS reads from DB

POST /auth/logout
  → Invalidates token (adds to token_blacklist)
  → STORES: token_blacklist record
```

### ✅ STUDENT PORTAL ENDPOINTS
```
GET /api/student/dashboard
  → Returns real-time attendance stats from DB
  → Queries: users, attendance_scans, class_sessions
  → Includes: total, attended, percentage, risk score

POST /api/attendance/scan
  → Validates QR token
  → Checks device fingerprint
  → Validates location (geo-radius)
  → Calculates AI risk score
  → STORES: attendance_scans, ai_risk_scores
  → Broadcasts via Socket.IO to lecturer
  → Logs to attendance_audit_logs

GET /api/student/timetable
  → Fetches class_sessions for enrolled student
  → Real-time from database
  → Syncs with enrollment records

GET /api/student/attendance-history
  → All attendance_scans for student
  → With risk_scores and status
  → Sorted by date DESC

GET /api/student/notifications
  → All unread messages from admin_messages table
  → Status = 'unread'
  → Broadcast via Socket.IO when new arrives

GET /api/student/device-history
  → Device fingerprints used in scans
  → IP addresses used
  → Locations accessed from
```

### ✅ LECTURER PORTAL ENDPOINTS
```
POST /api/attendance/session/:id/start
  → Generates QR token (backend only, JWT-signed)
  → Sets expiry to 25 seconds
  → STORES: qr_tokens table
  → Broadcasts to all students via Socket.IO
  → Updates class_sessions.attendance_status = 'open'

GET /api/attendance/session/:id/qr
  → Returns current QR token from class_sessions
  → Validates lecturer owns this session
  → Checks attendance window is open

POST /api/attendance/session/:id/stop
  → Invalidates QR token
  → Calculates attendance summary
  → STORES: session as 'closed'
  → Broadcasts final summary to students

GET /api/lecturer/dashboard
  → Live attendance count (real-time from attendance_scans)
  → Risk alerts (from ai_risk_scores where risk_level >= 'high')
  → Class sessions with status
  → Student attendance percentages

GET /api/lecturer/alerts
  → Rows from lecturer_alerts where lecturer_id = req.user.id
  → Unread alerts only
  → With student details

GET /api/lecturer/attendance-log/:sessionId
  → All attendance_scans for this session
  → With student names and risk levels
  → Verified/flagged status

POST /api/lecturer/acknowledge-alert/:alertId
  → Updates lecturer_alerts.acknowledged_at
  → STORES: change to DB

GET /api/lecturer/reports/:sessionId
  → Attendance data for export
  → Real-time data from attendance_scans
  → Includes risk analysis
```

### ✅ ADMIN PORTAL ENDPOINTS
```
POST /api/admin/communicate/message/:userId
  → Creates message in admin_messages table
  → Broadcasts via Socket.IO
  → STORES: admin_messages record
  → Logs to communication_audit_log

POST /api/admin/communicate/broadcast/:role
  → Creates message for all users with role
  → Broadcasts to all connected sockets
  → STORES: admin_messages (recipient_type='role')

GET /api/admin/system/dashboard
  → Real-time metrics from DB
  → Total users (SELECT COUNT(*) FROM users)
  → Active sessions (FROM class_sessions WHERE status='open')
  → Pending alerts (FROM attendance_alerts WHERE status='pending')
  → System health checks

GET /api/admin/users
  → All users from users table
  → With role, status, last_login
  → Filterable and sortable

POST /api/admin/users/:id/status
  → Updates users.status
  → STORES: status change
  → Logs to audit_logs

GET /api/admin/audit-logs
  → All records from attendance_audit_logs
  → All from communication_audit_log
  → Filterable by user, action, date range
  → Immutable (read-only)

GET /api/admin/attendance-analytics
  → Statistics from attendance_scans
  → Grouped by class, student, time period
  → Risk distribution
  → Fraud patterns detected

POST /api/admin/system/alert
  → Creates system-wide alert
  → Broadcasts to all users
  → STORES: system_alerts table
  → Visible in all portals

GET /api/admin/notifications/pending
  → All undelivered notifications
  → Message queue status
  → Retry information
```

### ✅ REAL-TIME SOCKET.IO EVENTS
```
// Admin → Users
emit admin:message              ← Direct message to user
emit admin:broadcast            ← Broadcast to role
emit system:alert-critical      ← Critical system alert

// Attendance Updates
emit qr:refreshed               ← New QR code available
emit attendance:opened          ← Attendance window open
emit attendance:closed          ← Attendance window closed
emit student:scanned            ← Student scan received
emit session:status-update      ← Session status changed

// Alerts
emit lecturer:alert             ← Alert for lecturer
emit admin:urgent-alert         ← Urgent alert to lecturer

// Data Updates
emit data:update                ← Real-time data sync
emit message:read-status        ← Message read acknowledgment
```

---

## 🗄️ COMPLETE DATABASE SCHEMA

### users
```sql
id INT PRIMARY KEY
name VARCHAR(255)
email VARCHAR(255) UNIQUE
password_hash VARCHAR(255)
role ENUM('student', 'lecturer', 'admin')
student_id VARCHAR(50)
department VARCHAR(100)
status ENUM('active', 'inactive', 'suspended')
avatar VARCHAR(255)
last_login TIMESTAMP
created_at TIMESTAMP
```

### login_attempts
```sql
id INT PRIMARY KEY
email VARCHAR(255)
status ENUM('success', 'failed-user-not-found', 'failed-invalid-password', 'failed-rate-limited')
ip_address VARCHAR(45)
user_agent TEXT
created_at TIMESTAMP
INDEX idx_email_status (email, status)
INDEX idx_created (created_at)
```

### token_blacklist
```sql
id INT PRIMARY KEY
user_id INT FOREIGN KEY
token VARCHAR(500)
created_at TIMESTAMP
```

### admin_messages
```sql
id INT PRIMARY KEY
sender_id INT FOREIGN KEY (users.id)
recipient_type ENUM('user', 'role', 'all')
recipient_id INT
recipient_role VARCHAR(50)
message LONGTEXT
message_type ENUM('info', 'warning', 'announcement', 'urgent')
priority ENUM('low', 'normal', 'high', 'critical')
status ENUM('sent', 'read', 'archived')
read_at TIMESTAMP
read_by INT
created_at TIMESTAMP
INDEX idx_recipient (recipient_type, recipient_id)
INDEX idx_status (status)
```

### class_sessions
```sql
id INT PRIMARY KEY
class_id INT FOREIGN KEY
lecturer_id INT FOREIGN KEY (users.id)
session_date DATE
start_time TIME
end_time TIME
latitude DECIMAL(10,8)
longitude DECIMAL(11,8)
attendance_status ENUM('scheduled', 'open', 'closed')
current_qr_token VARCHAR(500)
qr_expiry TIMESTAMP
attendance_count INT DEFAULT 0
created_at TIMESTAMP
INDEX idx_session_date (session_date)
INDEX idx_status (attendance_status)
```

### attendance_scans
```sql
id INT PRIMARY KEY
class_session_id INT FOREIGN KEY
student_id INT FOREIGN KEY (users.id)
scan_time TIMESTAMP
latitude DECIMAL(10,8)
longitude DECIMAL(11,8)
device_hash VARCHAR(256)
ip_address VARCHAR(45)
risk_score INT
risk_level ENUM('minimal', 'low', 'medium', 'high', 'critical')
status ENUM('pending', 'verified', 'flagged', 'rejected')
created_at TIMESTAMP
INDEX idx_student_session (student_id, class_session_id)
INDEX idx_risk (risk_level)
INDEX idx_status (status)
```

### ai_risk_scores
```sql
id INT PRIMARY KEY
attendance_scan_id INT FOREIGN KEY
student_id INT FOREIGN KEY
class_session_id INT FOREIGN KEY
device_risk INT (0-100)
location_risk INT (0-100)
network_risk INT (0-100)
temporal_risk INT (0-100)
anomaly_risk INT (0-100)
overall_score INT (0-100)
risk_level ENUM('minimal', 'low', 'medium', 'high', 'critical')
recommendations JSON
created_at TIMESTAMP
```

### lecturer_alerts
```sql
id INT PRIMARY KEY
lecturer_id INT FOREIGN KEY
class_session_id INT FOREIGN KEY
student_id INT FOREIGN KEY
alert_type ENUM('suspicious_activity', 'low_attendance', 'anomaly', 'system')
severity ENUM('info', 'warning', 'critical')
alert_message TEXT
status ENUM('unread', 'read', 'acknowledged', 'resolved')
acknowledged_at TIMESTAMP
resolved_at TIMESTAMP
created_at TIMESTAMP
INDEX idx_lecturer (lecturer_id)
INDEX idx_status (status)
```

### attendance_audit_logs
```sql
id INT PRIMARY KEY
student_id INT FOREIGN KEY
class_session_id INT FOREIGN KEY
action VARCHAR(100) (e.g., 'qr_scan', 'verification', 'alert')
event_data JSON (complete context)
created_at TIMESTAMP
INDEX idx_student (student_id)
INDEX idx_action (action)
```

### communication_audit_log
```sql
id INT PRIMARY KEY
sender_id INT FOREIGN KEY
sender_role VARCHAR(50)
recipient_id INT
recipient_role VARCHAR(50)
communication_type ENUM('direct_message', 'broadcast', 'alert')
event_type ENUM('sent', 'received', 'read', 'failed')
event_data JSON
timestamp TIMESTAMP
INDEX idx_sender (sender_id)
INDEX idx_event_type (event_type)
```

---

## 🛡️ SECURITY & VALIDATION RULES

### Authentication Layer
```javascript
✓ Rate limit: 5 login attempts per 15 minutes per IP
✓ Password hashing: bcryptjs with 10 rounds
✓ JWT expiry: 24 hours
✓ Token verification: Always fetch fresh user data from DB
✓ Account lockout: After 5 failed attempts
```

### QR Code Validation
```javascript
✓ Generated backend-only (never client-side)
✓ JWT-signed with nonce
✓ 25-second expiry
✓ Single-use per student per session
✓ Geo-location validation (50-meter radius)
✓ Device fingerprint check
✓ Cannot be forwarded/shared
```

### Attendance Recording
```javascript
✓ Only via POST /api/attendance/scan
✓ Must have valid QR token
✓ Must pass device validation
✓ Must be within session time window
✓ AI risk analysis mandatory
✓ Logged to attendance_audit_logs
✓ Cannot edit manually
```

### Admin Restrictions
```javascript
✓ All actions logged to audit_logs
✓ Reversible (history available)
✓ Cannot directly edit attendance
✓ Cannot generate QR codes
✓ Cannot modify user role without super-admin
✓ All messages must have timestamp + sender
```

---

## 📡 OFFLINE BEHAVIOR (SAFE MODE)

### Frontend Can Cache (Read-Only)
```javascript
✓ Timetable data (fetch on next login)
✓ Past attendance history
✓ Notifications (display cached)
✓ User profile info
```

### Frontend Must Queue (Write Operations)
```javascript
✓ Scan attempts → Queue locally
✓ Message acknowledgments → Queue
✓ User actions → Queue
```

### Backend Must Re-Validate
```javascript
✓ Reject offline scans as "pending"
✓ Re-validate on reconnection
✓ Check IP/device changed
✓ Verify time still within session
✓ Re-run risk analysis
✓ Either confirm or reject after validation
```

---

## 🔍 AUDIT & TRACEABILITY

### Every Action Logged
```javascript
{
  user_id: 5,
  role: 'student',
  action: 'attendance_scan',
  device_id: 'sha256-hash',
  ip_address: '192.168.1.1',
  location: { lat: 40.7128, lon: -74.0060 },
  timestamp: '2024-12-14T10:30:00Z',
  outcome: 'success' | 'failure',
  error_code: 'INVALID_QR_TOKEN',
  session_id: 15,
  scan_id: 123
}
```

### Immutable History
```javascript
✓ No updates to audit logs
✓ No deletion of records
✓ Archive only (read-only)
✓ Monthly exports to archive storage
✓ Queryable by user, date, action, device
```

---

## 🚀 DEPLOYMENT CHECKLIST

- [ ] All database tables created
- [ ] Backend API tested with curl
- [ ] Socket.IO connections established
- [ ] Frontend portals loading
- [ ] Authentication working (login/logout)
- [ ] Student portal QR scanning
- [ ] Lecturer QR generation
- [ ] Admin messaging
- [ ] Real-time updates appearing
- [ ] Offline queue working
- [ ] Audit logs recording
- [ ] Error handling graceful
- [ ] Load tested (min 100 concurrent users)
- [ ] Security scan completed
- [ ] Backup strategy in place

---

## 📊 MONITORING & ALERTS

### System Health Checks (Every 5 minutes)
```
✓ Database connection alive
✓ API response time < 500ms
✓ Socket.IO connections active
✓ Failed login attempts > threshold
✓ System alerts generated in last hour
✓ Attendance anomalies detected
```

### Admin Dashboard (Real-Time)
```
✓ Connected users count
✓ Active sessions count
✓ Pending alerts count
✓ High-risk attendances this hour
✓ System errors/warnings
✓ Database size
✓ Backup status
```

---

**This is a production-ready, database-first, enterprise-grade system.**
**Zero data loss. Complete traceability. Full audit trail.**
