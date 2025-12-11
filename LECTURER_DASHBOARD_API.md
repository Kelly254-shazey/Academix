// LECTURER_DASHBOARD_API.md
// Comprehensive API Reference for Lecturer Dashboard Backend
// Author: Backend Team
// Date: December 11, 2025

# Lecturer Dashboard API Reference

## Overview
Complete REST API and WebSocket reference for Lecturer Dashboard backend integration. All endpoints require JWT authentication and lecturer role.

---

## Authentication
- **Header**: `Authorization: Bearer <JWT_TOKEN>`
- **Role Required**: `lecturer` or `admin`
- **Device Headers** (required for most requests):
  - `X-Device-ID`: Unique device identifier
  - `X-Device-Fingerprint`: Device fingerprint for security

---

## 1. LECTURER OVERVIEW APIs

### 1.1 Get Dashboard Overview
```
GET /api/lecturer/overview
```
**Response:**
```json
{
  "success": true,
  "data": {
    "totalSessions": 12,
    "completedSessions": 8,
    "upcomingSessions": 2,
    "averageAttendance": 87.5,
    "totalStudents": 120,
    "classesTeaching": 3,
    "alerts": 2
  }
}
```

### 1.2 Get Today's Classes
```
GET /api/lecturer/today-classes
```
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "classId": 1,
      "className": "Introduction to AI",
      "sessionId": 5,
      "scheduledTime": "09:00 AM",
      "room": "Lab 101",
      "status": "scheduled",
      "enrolledCount": 45,
      "checkedInCount": 38,
      "absentCount": 7
    }
  ],
  "count": 3
}
```

### 1.3 Get Next Class
```
GET /api/lecturer/next-class
```
**Response:**
```json
{
  "success": true,
  "data": {
    "classId": 1,
    "className": "Introduction to AI",
    "sessionId": 5,
    "startTime": "2025-12-11T14:00:00Z",
    "room": "Lab 101",
    "minutesUntilStart": 35,
    "enrolledCount": 45
  }
}
```

### 1.4 Get Quick Stats
```
GET /api/lecturer/stats
```
**Response:**
```json
{
  "success": true,
  "data": {
    "healthyClasses": 2,
    "atRiskClasses": 1,
    "averageAttendance": 87.5,
    "highRiskStudents": 3,
    "alertCount": 2
  }
}
```

### 1.5 Get Detailed Statistics
```
GET /api/lecturer/statistics?startDate=2025-12-01&endDate=2025-12-11
```
**Parameters:**
- `startDate` (required): ISO date format (YYYY-MM-DD)
- `endDate` (required): ISO date format (YYYY-MM-DD)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "date": "2025-12-11",
      "sessionsHeld": 3,
      "avgAttendance": 85.5,
      "totalStudents": 120,
      "presentCount": 103,
      "absentCount": 17
    }
  ]
}
```

### 1.6 Get Alerts
```
GET /api/lecturer/alerts?limit=20
```
**Parameters:**
- `limit` (optional): Number of alerts (default: 20)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "type": "low_attendance",
      "severity": "warning",
      "message": "Class AI-101 has 72% attendance",
      "classId": 1,
      "isRead": false,
      "createdAt": "2025-12-11T10:30:00Z"
    }
  ],
  "count": 2
}
```

### 1.7 Acknowledge Alerts
```
POST /api/lecturer/alerts/acknowledge
```
**Body:**
```json
{
  "alertIds": [1, 2, 3]
}
```
**Response:**
```json
{
  "success": true,
  "message": "Alerts marked as read",
  "data": {
    "markedCount": 3
  }
}
```

### 1.8 Get Lecturer Profile
```
GET /api/lecturer/profile
```
**Response:**
```json
{
  "success": true,
  "data": {
    "id": 5,
    "name": "Dr. John Smith",
    "email": "john.smith@university.edu",
    "role": "lecturer",
    "department": "Computer Science",
    "phone": "+1234567890",
    "profilePicture": "https://cdn.example.com/profiles/5.jpg"
  }
}
```

---

## 2. CLASS SESSION CONTROL APIs

### 2.1 Start Session
```
POST /api/classes/{classId}/sessions/{sessionId}/start
```
**Headers:**
```
X-Device-ID: device-12345
X-Device-Fingerprint: abc123xyz
```

**Body:**
```json
{
  "deviceId": "device-12345",
  "deviceFingerprint": "abc123xyz"
}
```
**Response:**
```json
{
  "success": true,
  "message": "Session started successfully",
  "data": {
    "sessionId": 5,
    "classId": 1,
    "status": "in_progress",
    "scanningEnabled": true,
    "sessionToken": "abc123def456ghi789jkl",
    "startedAt": "2025-12-11T14:00:00Z"
  }
}
```

### 2.2 Delay Session
```
POST /api/classes/{classId}/sessions/{sessionId}/delay
```
**Body:**
```json
{
  "delayMinutes": 15,
  "reason": "Traffic jam on the way",
  "deviceId": "device-12345",
  "deviceFingerprint": "abc123xyz"
}
```
**Response:**
```json
{
  "success": true,
  "message": "Session delayed successfully",
  "data": {
    "sessionId": 5,
    "delayMinutes": 15,
    "newStartTime": "2025-12-11T14:15:00Z",
    "reason": "Traffic jam on the way",
    "delayedAt": "2025-12-11T13:58:00Z"
  }
}
```

### 2.3 Cancel Session
```
POST /api/classes/{classId}/sessions/{sessionId}/cancel
```
**Body:**
```json
{
  "reason": "Lecturer is ill",
  "deviceId": "device-12345",
  "deviceFingerprint": "abc123xyz"
}
```
**Response:**
```json
{
  "success": true,
  "message": "Session cancelled successfully",
  "data": {
    "sessionId": 5,
    "status": "cancelled",
    "reason": "Lecturer is ill",
    "cancelledAt": "2025-12-11T13:58:00Z"
  }
}
```

### 2.4 Change Room
```
POST /api/classes/{classId}/sessions/{sessionId}/room-change
```
**Body:**
```json
{
  "newRoom": "Auditorium A",
  "reason": "Lab is occupied",
  "deviceId": "device-12345",
  "deviceFingerprint": "abc123xyz"
}
```
**Response:**
```json
{
  "success": true,
  "message": "Room changed successfully",
  "data": {
    "sessionId": 5,
    "oldRoom": "Lab 101",
    "newRoom": "Auditorium A",
    "changedAt": "2025-12-11T13:58:00Z"
  }
}
```

### 2.5 Toggle Scanning
```
POST /api/classes/{classId}/sessions/{sessionId}/scanning
```
**Body:**
```json
{
  "enabled": true,
  "deviceId": "device-12345",
  "deviceFingerprint": "abc123xyz"
}
```
**Response:**
```json
{
  "success": true,
  "message": "Scanning enabled successfully",
  "data": {
    "sessionId": 5,
    "scanningEnabled": true,
    "enabledAt": "2025-12-11T14:05:00Z"
  }
}
```

### 2.6 Get Session State
```
GET /api/classes/{classId}/sessions/{sessionId}/state
```
**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": 5,
    "classId": 1,
    "status": "in_progress",
    "scanningEnabled": true,
    "room": "Lab 101",
    "startedAt": "2025-12-11T14:00:00Z",
    "startedBy": 5,
    "sessionToken": "abc123def456"
  }
}
```

---

## 3. QR MANAGEMENT APIs

### 3.1 Generate QR Code
```
POST /api/classes/{classId}/sessions/{sessionId}/qr
```
**Body:**
```json
{
  "validityMinutes": 10
}
```
**Response:**
```json
{
  "success": true,
  "message": "QR code generated successfully",
  "data": {
    "qrId": 123,
    "qrToken": "abc123def456ghi789",
    "signature": "xkdhsd93kslkd92ksd",
    "sessionId": 5,
    "classId": 1,
    "expiresAt": "2025-12-11T14:10:00Z",
    "qrPayload": {
      "sessionId": 5,
      "classId": 1,
      "generatedAt": "2025-12-11T14:00:00Z"
    }
  }
}
```

### 3.2 Rotate QR Code
```
POST /api/classes/{classId}/sessions/{sessionId}/qr/rotate
```
**Response:**
```json
{
  "success": true,
  "message": "QR code rotated successfully",
  "data": {
    "qrId": 124,
    "qrToken": "new_token_abc123",
    "signature": "new_signature_xkdhsd",
    "rotationIndex": 1,
    "expiresAt": "2025-12-11T14:10:00Z"
  }
}
```

### 3.3 Get Active QR
```
GET /api/classes/{classId}/sessions/{sessionId}/qr
```
**Response:**
```json
{
  "success": true,
  "data": {
    "qrId": 124,
    "qrToken": "abc123def456",
    "signature": "xkdhsd93kslkd",
    "scanCount": 35,
    "expiresAt": "2025-12-11T14:10:00Z",
    "rotationIndex": 1
  }
}
```

### 3.4 Validate QR Code
```
POST /api/classes/{classId}/sessions/{sessionId}/qr/validate
```
**Body:**
```json
{
  "qrToken": "abc123def456ghi789",
  "signature": "xkdhsd93kslkd92ksd"
}
```
**Response:**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "qrId": 123
  }
}
```

### 3.5 Get QR History
```
GET /api/classes/{classId}/sessions/{sessionId}/qr/history?limit=10
```
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "qrId": 124,
      "qrToken": "abc123def456",
      "generatedAt": "2025-12-11T14:00:00Z",
      "expiresAt": "2025-12-11T14:10:00Z",
      "scanCount": 35,
      "rotationIndex": 1
    }
  ],
  "count": 3
}
```

### 3.6 Lecturer QR Check-in
```
POST /api/lecturer/checkin
```
**Body:**
```json
{
  "classId": 1,
  "sessionId": 5,
  "qrToken": "abc123def456ghi789",
  "signature": "xkdhsd93kslkd92ksd",
  "deviceId": "device-12345",
  "deviceFingerprint": "abc123xyz"
}
```
**Response:**
```json
{
  "success": true,
  "message": "Check-in successful",
  "data": {
    "sessionId": 5,
    "classId": 1,
    "lecturerId": 5,
    "checkedInAt": "2025-12-11T14:00:30Z"
  }
}
```

---

## 4. ROSTER & ATTENDANCE APIs

### 4.1 Get Live Roster
```
GET /api/classes/{classId}/sessions/{sessionId}/roster
```
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "studentId": 1,
      "studentName": "Alice Johnson",
      "studentEmail": "alice@university.edu",
      "attendanceStatus": "present",
      "isVerified": true,
      "checkInTime": "2025-12-11T14:05:00Z",
      "checkInMethod": "qr",
      "verificationTime": "2025-12-11T14:05:30Z",
      "verificationNotes": "Verified by lecturer"
    }
  ],
  "count": 45
}
```

### 4.2 Get Attendance Summary
```
GET /api/classes/{classId}/sessions/{sessionId}/roster/summary
```
**Response:**
```json
{
  "success": true,
  "data": {
    "totalStudents": 45,
    "present": 38,
    "absent": 5,
    "excused": 2,
    "late": 0,
    "unmarked": 0,
    "verifiedCount": 35,
    "attendancePercentage": 84
  }
}
```

### 4.3 Mark Single Student
```
POST /api/classes/{classId}/sessions/{sessionId}/roster/mark
```
**Body:**
```json
{
  "studentId": 1,
  "status": "present",
  "reason": "Manual marking",
  "notes": "Marked by lecturer",
  "deviceId": "device-12345",
  "deviceFingerprint": "abc123xyz"
}
```
**Response:**
```json
{
  "success": true,
  "message": "Attendance marked successfully",
  "data": {
    "attendanceId": 456,
    "studentId": 1,
    "status": "present",
    "markedAt": "2025-12-11T14:10:00Z"
  }
}
```

### 4.4 Bulk Mark Attendance
```
POST /api/classes/{classId}/sessions/{sessionId}/roster/bulk-mark
```
**Body:**
```json
{
  "markings": [
    {
      "studentId": 1,
      "status": "present",
      "reason": "Bulk marking"
    },
    {
      "studentId": 2,
      "status": "absent",
      "reason": "Bulk marking"
    }
  ],
  "deviceId": "device-12345",
  "deviceFingerprint": "abc123xyz"
}
```
**Response:**
```json
{
  "success": true,
  "message": "Bulk marking completed",
  "data": {
    "processedCount": 45,
    "successCount": 43,
    "failureCount": 2
  }
}
```

### 4.5 Verify Attendance
```
POST /api/classes/{classId}/sessions/{sessionId}/attendance/verify
```
**Body:**
```json
{
  "studentId": 1,
  "attendanceId": 456,
  "verificationReason": "Manual verification",
  "notes": "Student showed ID",
  "deviceId": "device-12345",
  "deviceFingerprint": "abc123xyz"
}
```
**Response:**
```json
{
  "success": true,
  "message": "Attendance verified successfully",
  "data": {
    "verificationId": 789,
    "attendanceId": 456,
    "studentId": 1,
    "verified": true,
    "verifiedAt": "2025-12-11T14:10:30Z"
  }
}
```

### 4.6 Unverify Attendance
```
POST /api/classes/{classId}/sessions/{sessionId}/attendance/unverify
```
**Body:**
```json
{
  "attendanceId": 456,
  "reason": "Incorrect marking",
  "deviceId": "device-12345",
  "deviceFingerprint": "abc123xyz"
}
```
**Response:**
```json
{
  "success": true,
  "message": "Attendance unverified successfully",
  "data": {
    "attendanceId": 456,
    "verified": false,
    "unverifiedAt": "2025-12-11T14:10:45Z"
  }
}
```

### 4.7 Get At-Risk Students
```
GET /api/classes/{classId}/roster/at-risk?threshold=75
```
**Parameters:**
- `threshold` (optional): Attendance percentage threshold (default: 75)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "studentId": 5,
      "studentName": "Bob Wilson",
      "email": "bob@university.edu",
      "totalSessions": 10,
      "presentCount": 6,
      "attendancePercentage": 60,
      "absences": 4
    }
  ],
  "count": 3
}
```

### 4.8 Get Student Attendance History
```
GET /api/classes/{classId}/roster/student/{studentId}/history?limit=50
```
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 456,
      "sessionId": 5,
      "sessionDate": "2025-12-11",
      "status": "present",
      "checkInTime": "2025-12-11T14:05:00Z",
      "checkInMethod": "qr",
      "verified": true,
      "verificationTime": "2025-12-11T14:05:30Z"
    }
  ]
}
```

---

## 5. SOCKET.IO REAL-TIME EVENTS

### 5.1 Join Events

**Join User Room**
```javascript
socket.emit('join-user-room', lecturerId);
// Listener: socket.on('connection-confirmed', (data) => {...})
```

**Join Class Room**
```javascript
socket.emit('join-class-room', classId);
```

**Join Session Room**
```javascript
socket.emit('join-session-room', sessionId);
```

### 5.2 Session Events

**Session Started**
```javascript
// Emit from lecturer app
socket.emit('lecturer-session-started', {
  classId: 1,
  sessionId: 5,
  lecturerId: 5
});

// Listen on student app
socket.on('lecturer-session-started', (data) => {
  // classId, sessionId, lecturerId, message, timestamp
});
```

**Session Delayed**
```javascript
socket.emit('lecturer-session-delayed', {
  classId: 1,
  sessionId: 5,
  delayMinutes: 15,
  newStartTime: '2025-12-11T14:15:00Z'
});

socket.on('lecturer-session-delayed', (data) => {
  // classId, sessionId, delayMinutes, newStartTime, message, timestamp
});
```

**Session Cancelled**
```javascript
socket.emit('lecturer-session-cancelled', {
  classId: 1,
  sessionId: 5,
  reason: 'Lecturer is ill'
});

socket.on('lecturer-session-cancelled', (data) => {
  // classId, sessionId, reason, message, timestamp
});
```

### 5.3 QR Events

**QR Rotated**
```javascript
socket.emit('lecturer-qr-rotated', {
  classId: 1,
  sessionId: 5
});

socket.on('lecturer-qr-rotated', (data) => {
  // classId, sessionId, message, timestamp
});
```

### 5.4 Attendance Events

**Attendance Verified**
```javascript
socket.emit('lecturer-attendance-verified', {
  classId: 1,
  sessionId: 5,
  studentId: 10,
  status: 'present'
});

socket.on('lecturer-attendance-verified', (data) => {
  // classId, sessionId, studentId, status, message, timestamp
});
```

**Roster Updated**
```javascript
socket.emit('lecturer-roster-updated', {
  classId: 1,
  sessionId: 5,
  totalStudents: 45,
  presentCount: 38
});

socket.on('lecturer-roster-updated', (data) => {
  // classId, sessionId, totalStudents, presentCount, message, timestamp
});
```

### 5.5 Alert Events

**Alert Created**
```javascript
socket.emit('lecturer-alert-created', {
  lecturerId: 5,
  alertType: 'low_attendance',
  severity: 'warning',
  message: 'Class has low attendance'
});

socket.on('lecturer-alert-created', (data) => {
  // lecturerId, alertType, severity, message, timestamp
});
```

---

## 6. ERROR HANDLING

All endpoints return standardized error responses:

**400 Bad Request**
```json
{
  "success": false,
  "message": "Validation error",
  "details": "sessionId must be a positive integer"
}
```

**401 Unauthorized**
```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```

**403 Forbidden**
```json
{
  "success": false,
  "message": "Access denied. Lecturer role required."
}
```

**404 Not Found**
```json
{
  "success": false,
  "message": "Session not found"
}
```

**500 Internal Server Error**
```json
{
  "success": false,
  "message": "Failed to process request",
  "error": "(development only) error details here"
}
```

---

## 7. AUDIT LOGGING

All lecturer actions are logged with:
- **Action**: SESSION_STARTED, SESSION_DELAYED, ATTENDANCE_MARKED, etc.
- **Resource**: Affected object (session, attendance, etc.)
- **Device**: Device ID and fingerprint for security
- **Timestamp**: When action occurred
- **User**: Lecturer ID
- **Changes**: Old value → New value

Access audit logs via database queries for compliance and forensics.

---

## 8. RATE LIMITING

Rate limits enforced per endpoint:
- QR Generation: 10 requests/minute per session
- Attendance Marking: 30 requests/minute per session
- Session Control: 5 requests/minute per session

Exceeding limits returns `429 Too Many Requests`

---

## 9. BACKWARD COMPATIBILITY

✅ All endpoints preserve existing Student Dashboard functionality:
- Student check-in continues to work with QR codes
- Attendance logs unaffected by lecturer verification
- Classes and sessions maintain existing structure
- No breaking changes to existing APIs

---

## 10. INTEGRATION CHECKLIST

Frontend checklist for Lecturer Dashboard integration:

- [ ] Implement authentication with JWT tokens
- [ ] Display lecturer overview dashboard
- [ ] Build today's classes interface
- [ ] Create session control panel (start/delay/cancel)
- [ ] Implement QR code display and rotation
- [ ] Build live roster interface
- [ ] Add bulk marking functionality
- [ ] Implement attendance verification UI
- [ ] Show at-risk students list
- [ ] Display alerts and notifications
- [ ] Set up Socket.IO connections
- [ ] Implement real-time status updates
- [ ] Add error handling and retry logic
- [ ] Test with actual device fingerprints

---

End of API Documentation
Version: 1.0
Status: Ready for Integration
