# Smart Attendance System - API Reference

## Base URL
```
http://localhost:5002/api
```

## Authentication
All endpoints except `/api/auth/*` require:
```
Header: Authorization: Bearer {jwt_token}
```

---

## 1. Attendance Analytics Endpoints

### Get Overall Attendance
```
GET /attendance-analytics/overall
Description: Get student's overall attendance percentage
Auth: Required

Query Parameters:
  - None

Response (200):
{
  "success": true,
  "data": {
    "attendance": 85.5,
    "sessions": 20,
    "attended": 17,
    "absences": 3,
    "lates": 0
  }
}
```

### Get Per-Course Attendance
```
GET /attendance-analytics/per-course
Description: Get attendance breakdown by course
Auth: Required

Query Parameters:
  - None

Response (200):
{
  "success": true,
  "data": [
    {
      "courseCode": "CS101",
      "courseName": "Intro to Computer Science",
      "attendance": 95.0,
      "sessions": 20,
      "attended": 19,
      "absences": 1,
      "lates": 0
    },
    {
      "courseCode": "MATH201",
      "courseName": "Calculus II",
      "attendance": 75.0,
      "sessions": 20,
      "attended": 15,
      "absences": 5,
      "lates": 0
    }
  ]
}
```

### Get Attendance Analytics with Trends
```
GET /attendance-analytics/analytics
Description: Get detailed analytics with date range
Auth: Required

Query Parameters:
  - startDate (required): YYYY-MM-DD
  - endDate (required): YYYY-MM-DD

Example: GET /attendance-analytics/analytics?startDate=2024-11-01&endDate=2024-12-11

Response (200):
{
  "success": true,
  "data": {
    "totalSessions": 22,
    "attended": 18,
    "absences": 4,
    "byDate": [
      {
        "date": "2024-12-01",
        "status": "present",
        "courseCode": "CS101",
        "courseName": "Intro to Computer Science"
      }
    ],
    "trend": "improving"
  }
}
```

### Check Low Attendance Threshold
```
GET /attendance-analytics/low-threshold-check
Description: Check if attendance is below threshold
Auth: Required

Query Parameters:
  - threshold (optional, default=75): number

Example: GET /attendance-analytics/low-threshold-check?threshold=80

Response (200):
{
  "success": true,
  "data": {
    "isBelowThreshold": true,
    "currentAttendance": 75.5,
    "threshold": 80,
    "gap": 4.5,
    "coursesAtRisk": [
      {
        "courseCode": "MATH201",
        "courseName": "Calculus II",
        "attendance": 70.0,
        "gap": 10.0
      }
    ]
  }
}
```

### Get Missed Classes
```
GET /attendance-analytics/missed-classes
Description: Get recent missed classes
Auth: Required

Query Parameters:
  - limit (optional, default=10): number

Example: GET /attendance-analytics/missed-classes?limit=5

Response (200):
{
  "success": true,
  "data": [
    {
      "sessionId": "sess_123",
      "courseCode": "MATH201",
      "courseName": "Calculus II",
      "date": "2024-12-10",
      "time": "10:00-11:30",
      "reason": "absent"
    }
  ]
}
```

### Get Absentee Risk Assessment
```
GET /attendance-analytics/absentee-risk
Description: Get risk level per course
Auth: Required

Query Parameters:
  - None

Response (200):
{
  "success": true,
  "data": [
    {
      "courseCode": "CS101",
      "courseName": "Intro to Computer Science",
      "riskLevel": "low",
      "attendance": 95.0,
      "recommendation": "maintain current attendance"
    },
    {
      "courseCode": "MATH201",
      "courseName": "Calculus II",
      "riskLevel": "high",
      "attendance": 70.0,
      "recommendation": "attend at least 3 more classes"
    }
  ]
}
```

### Get Attendance Summary
```
GET /attendance-analytics/summary
Description: Get summary statistics for date range
Auth: Required

Query Parameters:
  - startDate (required): YYYY-MM-DD
  - endDate (required): YYYY-MM-DD

Example: GET /attendance-analytics/summary?startDate=2024-11-01&endDate=2024-12-11

Response (200):
{
  "success": true,
  "data": {
    "totalSessions": 22,
    "onTime": 18,
    "late": 2,
    "absent": 2,
    "attendancePercent": 90.9,
    "punctualityPercent": 81.8
  }
}
```

---

## 2. QR Check-in Endpoints

### Validate and Check-in
```
POST /qr/validate-and-checkin
Description: Complete QR check-in process
Auth: Required

Body:
{
  "qrToken": "abc123xyz",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "deviceFingerprint": "device_fp_123",
  "deviceName": "iPhone 12"
}

Response (200):
{
  "success": true,
  "data": {
    "attendanceId": "att_123",
    "status": "verified",
    "courseCode": "CS101",
    "courseName": "Intro to Computer Science",
    "timestamp": "2024-12-11T09:15:00Z",
    "message": "Check-in successful. Welcome to class!"
  }
}

Error (400):
{
  "success": false,
  "message": "QR token has expired. Please request a new QR code.",
  "code": "QR_EXPIRED"
}

Error (400):
{
  "success": false,
  "message": "Location validation failed. You are 250m from classroom (max 100m).",
  "code": "LOCATION_VALIDATION_FAILED"
}

Error (400):
{
  "success": false,
  "message": "Device not registered. Please register this device first.",
  "code": "DEVICE_NOT_REGISTERED"
}
```

### Validate QR Token Only
```
POST /qr/validate
Description: Validate QR token without checking in
Auth: Required

Body:
{
  "qrToken": "abc123xyz"
}

Response (200):
{
  "success": true,
  "data": {
    "valid": true,
    "classId": "class_123",
    "courseName": "Intro to Computer Science",
    "expiresAt": "2024-12-11T09:25:00Z",
    "timeRemaining": 600 // seconds
  }
}

Error (400):
{
  "success": false,
  "message": "Invalid or expired QR token"
}
```

### Register Device
```
POST /qr/register-device
Description: Register or verify device for check-in
Auth: Required

Body:
{
  "deviceFingerprint": "device_fp_123",
  "deviceName": "iPhone 12"
}

Response (200):
{
  "success": true,
  "data": {
    "deviceId": "dev_123",
    "deviceName": "iPhone 12",
    "verified": true,
    "message": "Device registered successfully"
  }
}
```

### Generate QR Code (Lecturer)
```
POST /qr/generate/:sessionId
Description: Generate QR code for class session
Auth: Required (lecturer/admin only)

URL Parameters:
  - sessionId: Session ID

Response (200):
{
  "success": true,
  "data": {
    "qrToken": "abc123xyz",
    "expiresAt": "2024-12-11T09:25:00Z",
    "validityMinutes": 10,
    "qrCodeUrl": "data:image/png;base64,..." // Base64 encoded PNG
  }
}

Error (403):
{
  "success": false,
  "message": "Only lecturers can generate QR codes"
}
```

---

## 3. Schedule Endpoints

### Get Today's Classes
```
GET /schedule/today
Description: Get all classes for today with check-in status
Auth: Required

Query Parameters:
  - None

Response (200):
{
  "success": true,
  "data": [
    {
      "classId": "class_123",
      "courseCode": "CS101",
      "courseName": "Intro to Computer Science",
      "startTime": "09:00",
      "endTime": "10:30",
      "location": {
        "building": "STEM Building",
        "room": "101",
        "latitude": 40.7128,
        "longitude": -74.0060
      },
      "lecturerName": "Dr. Smith",
      "checkedIn": true,
      "status": "ongoing"
    }
  ]
}
```

### Get Upcoming Classes
```
GET /schedule/upcoming
Description: Get upcoming classes for next N days
Auth: Required

Query Parameters:
  - daysAhead (optional, default=7): number

Example: GET /schedule/upcoming?daysAhead=14

Response (200):
{
  "success": true,
  "data": [
    {
      "classId": "class_123",
      "courseCode": "CS101",
      "date": "2024-12-11",
      "startTime": "09:00",
      "endTime": "10:30",
      "courseName": "Intro to Computer Science",
      "daysUntil": 0,
      "status": "upcoming"
    }
  ]
}
```

### Get Weekly Schedule
```
GET /schedule/weekly
Description: Get all classes for the week (Mon-Sun)
Auth: Required

Query Parameters:
  - None

Response (200):
{
  "success": true,
  "data": {
    "Monday": [
      {
        "classId": "class_123",
        "courseCode": "CS101",
        "courseName": "Intro to Computer Science",
        "startTime": "09:00",
        "endTime": "10:30"
      }
    ],
    "Tuesday": [],
    "Wednesday": [
      {
        "classId": "class_456",
        "courseCode": "MATH201",
        "courseName": "Calculus II",
        "startTime": "14:00",
        "endTime": "15:30"
      }
    ]
  }
}
```

---

## 4. Notification Endpoints

### Get Notifications
```
GET /notifications
Description: Get paginated notifications
Auth: Required

Query Parameters:
  - limit (optional, default=20): number
  - offset (optional, default=0): number
  - unreadOnly (optional, default=false): boolean

Example: GET /notifications?limit=10&unreadOnly=true

Response (200):
{
  "success": true,
  "data": [
    {
      "id": "notif_123",
      "type": "attendance_warning",
      "title": "Low Attendance Alert",
      "message": "Your attendance in CS101 is below 75%",
      "isRead": false,
      "relatedData": {
        "courseCode": "CS101",
        "attendance": 70.0
      },
      "createdAt": "2024-12-11T08:00:00Z"
    }
  ],
  "pagination": {
    "total": 45,
    "limit": 20,
    "offset": 0
  }
}
```

### Get Unread Count
```
GET /notifications/unread-count
Description: Get count of unread notifications
Auth: Required

Response (200):
{
  "success": true,
  "data": {
    "unreadCount": 5
  }
}
```

### Mark Notifications as Read
```
POST /notifications/mark-read
Description: Mark multiple notifications as read
Auth: Required

Body:
{
  "notificationIds": ["notif_123", "notif_456"]
}

Response (200):
{
  "success": true,
  "message": "Marked 2 notifications as read"
}
```

### Mark Notifications as Unread
```
POST /notifications/mark-unread
Description: Mark multiple notifications as unread
Auth: Required

Body:
{
  "notificationIds": ["notif_123"]
}

Response (200):
{
  "success": true,
  "message": "Marked 1 notification as unread"
}
```

### Delete Notification
```
DELETE /notifications/:id
Description: Delete a specific notification
Auth: Required

URL Parameters:
  - id: Notification ID

Response (200):
{
  "success": true,
  "message": "Notification deleted"
}
```

### Clear All Notifications
```
POST /notifications/clear
Description: Delete all notifications for user
Auth: Required

Body: {} (empty)

Response (200):
{
  "success": true,
  "message": "All notifications cleared"
}
```

---

## 5. Student Profile Endpoints

### Get Profile
```
GET /profile
Description: Get student's complete profile
Auth: Required

Response (200):
{
  "success": true,
  "data": {
    "studentId": "stu_123",
    "studentName": "John Doe",
    "email": "john@example.com",
    "bio": "Computer Science major",
    "avatarUrl": "https://...",
    "phone": "+1234567890",
    "verified": true,
    "riskLevel": "low",
    "averageAttendance": 85.5,
    "deviceCount": 2,
    "createdAt": "2024-01-15T00:00:00Z"
  }
}
```

### Update Profile
```
PUT /profile
Description: Update profile information
Auth: Required

Body:
{
  "bio": "CS major, interested in AI",
  "phone": "+1234567890",
  "avatarUrl": "https://..."
}

Response (200):
{
  "success": true,
  "message": "Profile updated successfully"
}
```

### Update Avatar
```
PUT /profile/avatar
Description: Update profile avatar
Auth: Required

Body:
{
  "avatarUrl": "https://cdn.example.com/avatar.jpg"
}

Response (200):
{
  "success": true,
  "message": "Avatar updated successfully"
}
```

### Get Verified Devices
```
GET /profile/devices
Description: Get list of registered devices
Auth: Required

Response (200):
{
  "success": true,
  "data": [
    {
      "deviceId": "dev_123",
      "deviceName": "iPhone 12",
      "deviceFingerprint": "fp_123",
      "verified": true,
      "lastUsed": "2024-12-11T09:15:00Z"
    },
    {
      "deviceId": "dev_456",
      "deviceName": "iPad Air",
      "deviceFingerprint": "fp_456",
      "verified": true,
      "lastUsed": "2024-12-10T14:30:00Z"
    }
  ]
}
```

### Register Device
```
POST /profile/devices
Description: Register new device for check-in
Auth: Required

Body:
{
  "deviceFingerprint": "device_fp_123",
  "deviceName": "iPhone 12"
}

Response (200):
{
  "success": true,
  "message": "Device registered successfully",
  "data": {
    "deviceId": "dev_123",
    "deviceName": "iPhone 12",
    "verified": true
  }
}
```

### Delete Device
```
DELETE /profile/devices/:id
Description: Remove registered device
Auth: Required

URL Parameters:
  - id: Device ID

Response (200):
{
  "success": true,
  "message": "Device removed successfully"
}
```

### Get Profile Completion
```
GET /profile/completion
Description: Get profile completion percentage
Auth: Required

Response (200):
{
  "success": true,
  "data": {
    "completionPercent": 85,
    "filledFields": ["email", "bio", "phone", "avatar"],
    "missingFields": ["phone"]
  }
}
```

---

## 6. Settings Endpoints

### Get Settings
```
GET /settings
Description: Get user preferences and settings
Auth: Required

Response (200):
{
  "success": true,
  "data": {
    "userId": "user_123",
    "notificationsEnabled": true,
    "emailNotifications": true,
    "pushNotifications": true,
    "smsNotifications": false,
    "darkMode": false,
    "timezone": "UTC"
  }
}
```

### Update Settings
```
PUT /settings
Description: Update user preferences
Auth: Required

Body:
{
  "notificationsEnabled": true,
  "emailNotifications": false,
  "pushNotifications": true,
  "smsNotifications": false,
  "darkMode": true,
  "timezone": "America/New_York"
}

Response (200):
{
  "success": true,
  "message": "Settings updated successfully"
}
```

### Change Password
```
POST /settings/change-password
Description: Change user password (invalidates all sessions)
Auth: Required

Body:
{
  "currentPassword": "oldPassword123",
  "newPassword": "newPassword456",
  "confirmPassword": "newPassword456"
}

Response (200):
{
  "success": true,
  "message": "Password changed successfully. You have been logged out of all devices.",
  "data": {
    "requiresLogin": true
  }
}

Error (400):
{
  "success": false,
  "message": "Current password is incorrect"
}
```

### Get Active Sessions
```
GET /settings/sessions
Description: Get list of active sessions across devices
Auth: Required

Response (200):
{
  "success": true,
  "data": [
    {
      "sessionId": "sess_123",
      "deviceName": "iPhone 12",
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "createdAt": "2024-12-11T09:00:00Z",
      "expiresAt": "2024-12-18T09:00:00Z",
      "isCurrent": true
    }
  ]
}
```

### Logout Other Sessions
```
POST /settings/logout-other-sessions
Description: Logout all other devices, keep current session
Auth: Required

Body: {} (empty)

Response (200):
{
  "success": true,
  "message": "All other sessions have been logged out"
}
```

### Revoke Specific Session
```
DELETE /settings/sessions/:id
Description: Revoke a specific session/device
Auth: Required

URL Parameters:
  - id: Session ID

Response (200):
{
  "success": true,
  "message": "Session revoked successfully"
}
```

---

## 7. Support System Endpoints

### Create Support Ticket
```
POST /support/tickets
Description: Create new support ticket
Auth: Required

Body:
{
  "category": "technical",
  "subject": "Login issues",
  "description": "Cannot log in with valid credentials",
  "priority": "high"
}

Response (201):
{
  "success": true,
  "data": {
    "ticketId": "tik_123",
    "ticketNumber": "TIK-001234",
    "status": "open",
    "priority": "high",
    "createdAt": "2024-12-11T10:00:00Z"
  }
}
```

### Get Student's Tickets
```
GET /support/tickets
Description: Get tickets submitted by student
Auth: Required

Query Parameters:
  - status (optional): open|in_progress|resolved|closed
  - limit (optional, default=20): number
  - offset (optional, default=0): number

Example: GET /support/tickets?status=open&limit=10

Response (200):
{
  "success": true,
  "data": [
    {
      "ticketId": "tik_123",
      "ticketNumber": "TIK-001234",
      "subject": "Login issues",
      "status": "in_progress",
      "priority": "high",
      "assignedAdmin": "Admin Name",
      "createdAt": "2024-12-10T10:00:00Z",
      "updatedAt": "2024-12-11T09:30:00Z"
    }
  ]
}
```

### Get Specific Ticket
```
GET /support/tickets/:id
Description: Get ticket details with responses
Auth: Required

URL Parameters:
  - id: Ticket ID

Response (200):
{
  "success": true,
  "data": {
    "ticketId": "tik_123",
    "ticketNumber": "TIK-001234",
    "subject": "Login issues",
    "description": "Cannot log in with valid credentials",
    "status": "in_progress",
    "priority": "high",
    "category": "technical",
    "studentName": "John Doe",
    "assignedAdmin": "Admin Name",
    "createdAt": "2024-12-10T10:00:00Z",
    "responses": [
      {
        "responseId": "resp_123",
        "responderId": "admin_456",
        "responderName": "Admin Smith",
        "message": "Have you tried clearing your browser cache?",
        "isInternal": false,
        "createdAt": "2024-12-11T09:00:00Z"
      }
    ]
  }
}
```

### Add Response to Ticket
```
POST /support/tickets/:id/responses
Description: Add response to ticket (admin/student)
Auth: Required

URL Parameters:
  - id: Ticket ID

Body:
{
  "message": "Please try clearing your browser cache and cookies",
  "isInternal": false // true = only visible to admins
}

Response (201):
{
  "success": true,
  "data": {
    "responseId": "resp_123",
    "message": "Please try clearing your browser cache and cookies",
    "createdAt": "2024-12-11T10:15:00Z"
  }
}
```

### Update Ticket (Admin)
```
PUT /support/tickets/:id
Description: Update ticket status/priority (admin only)
Auth: Required (admin only)

URL Parameters:
  - id: Ticket ID

Body:
{
  "status": "resolved",
  "priority": "medium"
}

Response (200):
{
  "success": true,
  "message": "Ticket updated successfully"
}
```

### Get Support Statistics (Admin)
```
GET /support/stats
Description: Get support dashboard statistics (admin only)
Auth: Required (admin only)

Response (200):
{
  "success": true,
  "data": {
    "totalTickets": 150,
    "openTickets": 12,
    "inProgressTickets": 8,
    "resolvedTickets": 120,
    "closedTickets": 10,
    "averageResolutionHours": 24.5,
    "byCategory": {
      "technical": 45,
      "attendance": 60,
      "general": 40,
      "other": 5
    }
  }
}
```

---

## 8. Gamification Endpoints

### Get Badges
```
GET /gamification/badges
Description: Get all badges with earned status
Auth: Required

Response (200):
{
  "success": true,
  "data": [
    {
      "badgeId": "badge_1",
      "name": "Perfect Attendee",
      "description": "Achieved 100% attendance",
      "iconUrl": "https://...",
      "earned": true,
      "earnedAt": "2024-12-01T00:00:00Z",
      "progress": 100
    },
    {
      "badgeId": "badge_2",
      "name": "Streak Master",
      "description": "Attended 10 consecutive classes",
      "iconUrl": "https://...",
      "earned": false,
      "earnedAt": null,
      "progress": 75 // 7.5 out of 10
    }
  ]
}
```

### Get All Streaks
```
GET /gamification/streaks
Description: Get attendance streaks for all courses
Auth: Required

Response (200):
{
  "success": true,
  "data": [
    {
      "courseCode": "CS101",
      "courseName": "Intro to Computer Science",
      "currentStreak": 15,
      "maxStreak": 20,
      "lastAttendanceDate": "2024-12-11"
    },
    {
      "courseCode": "MATH201",
      "courseName": "Calculus II",
      "currentStreak": 0,
      "maxStreak": 5,
      "lastAttendanceDate": "2024-12-09"
    }
  ]
}
```

### Get Student Progress
```
GET /gamification/progress
Description: Get overall progress and leaderboard score
Auth: Required

Response (200):
{
  "success": true,
  "data": {
    "badgesEarned": 2,
    "totalBadges": 4,
    "highestStreak": 15,
    "averageAttendance": 85.5,
    "progressScore": 850,
    "leaderboardRank": 12
  }
}
```

### Get Course Streak
```
GET /gamification/streak/:courseId
Description: Get streak details for specific course
Auth: Required

URL Parameters:
  - courseId: Course ID

Response (200):
{
  "success": true,
  "data": {
    "courseCode": "CS101",
    "courseName": "Intro to Computer Science",
    "currentStreak": 15,
    "maxStreak": 20,
    "streakProgress": 75,
    "message": "Keep it up! 5 more classes to beat your personal record!"
  }
}
```

---

## 9. Calendar Endpoints

### Create Event
```
POST /calendar/events
Description: Create calendar event (lecturer/admin only)
Auth: Required (lecturer/admin only)

Body:
{
  "title": "Midterm Exam",
  "eventType": "exam",
  "startDate": "2024-12-20",
  "endDate": "2024-12-20",
  "startTime": "09:00",
  "endTime": "11:00",
  "location": "Exam Hall A",
  "description": "Comprehensive exam covering chapters 1-5",
  "classId": "class_123"
}

Response (201):
{
  "success": true,
  "data": {
    "eventId": "evt_123",
    "title": "Midterm Exam",
    "createdAt": "2024-12-11T10:30:00Z"
  }
}
```

### Get Events
```
GET /calendar/events
Description: Get events for date range
Auth: Required

Query Parameters:
  - startDate (required): YYYY-MM-DD
  - endDate (required): YYYY-MM-DD
  - eventType (optional): class|exam|academic_activity|holiday
  - classId (optional): Filter by class

Example: GET /calendar/events?startDate=2024-12-01&endDate=2024-12-31&eventType=exam

Response (200):
{
  "success": true,
  "data": [
    {
      "eventId": "evt_123",
      "title": "Midterm Exam",
      "eventType": "exam",
      "startDate": "2024-12-20",
      "startTime": "09:00",
      "endTime": "11:00",
      "location": "Exam Hall A",
      "description": "Comprehensive exam covering chapters 1-5"
    }
  ]
}
```

### Get Events by Type
```
GET /calendar/events/type/:type
Description: Get events filtered by type
Auth: Required

URL Parameters:
  - type: class|exam|academic_activity|holiday

Query Parameters:
  - limit (optional, default=20): number

Response (200):
{
  "success": true,
  "data": [/* events */]
}
```

### Get Upcoming Events
```
GET /calendar/upcoming
Description: Get next upcoming events
Auth: Required

Query Parameters:
  - limit (optional, default=10): number

Response (200):
{
  "success": true,
  "data": [
    {
      "eventId": "evt_123",
      "title": "Midterm Exam",
      "eventType": "exam",
      "date": "2024-12-20",
      "startTime": "09:00",
      "daysUntil": 9
    }
  ]
}
```

### Get Class Events
```
GET /calendar/class/:classId
Description: Get events for specific class
Auth: Required

URL Parameters:
  - classId: Class ID

Response (200):
{
  "success": true,
  "data": [/* events for class */]
}
```

### Get Month Calendar
```
GET /calendar/month/:year/:month
Description: Get calendar view for entire month
Auth: Required

URL Parameters:
  - year: 2024
  - month: 12 (1-12)

Example: GET /calendar/month/2024/12

Response (200):
{
  "success": true,
  "data": {
    "year": 2024,
    "month": 12,
    "days": {
      "1": [],
      "5": [
        {
          "eventId": "evt_123",
          "title": "Class CS101",
          "eventType": "class"
        }
      ],
      "20": [
        {
          "eventId": "evt_456",
          "title": "Midterm Exam",
          "eventType": "exam"
        }
      ]
    }
  }
}
```

### Update Event
```
PUT /calendar/events/:id
Description: Update event (lecturer/admin only)
Auth: Required (lecturer/admin only)

URL Parameters:
  - id: Event ID

Body: (any fields to update)
{
  "title": "Midterm Exam - Updated",
  "startTime": "10:00"
}

Response (200):
{
  "success": true,
  "message": "Event updated successfully"
}
```

### Delete Event
```
DELETE /calendar/events/:id
Description: Delete event (lecturer/admin only)
Auth: Required (lecturer/admin only)

URL Parameters:
  - id: Event ID

Response (200):
{
  "success": true,
  "message": "Event deleted successfully"
}
```

---

## 10. Course Analytics Endpoints

### Get Course Analytics
```
GET /course-analytics/course/:courseId
Description: Get comprehensive course analytics
Auth: Required

URL Parameters:
  - courseId: Class ID

Response (200):
{
  "success": true,
  "data": {
    "courseCode": "CS101",
    "courseName": "Intro to Computer Science",
    "totalStudents": 45,
    "totalSessions": 30,
    "averageAttendance": 82.5,
    "byStudent": [
      {
        "studentId": "stu_123",
        "studentName": "John Doe",
        "sessionsAvailable": 30,
        "attended": 25,
        "lates": 2,
        "absences": 3,
        "attendancePercent": 83.3
      }
    ]
  }
}
```

### Get Attendance Trends
```
GET /course-analytics/course/:courseId/trends
Description: Get 30-day attendance trends
Auth: Required

URL Parameters:
  - courseId: Class ID

Response (200):
{
  "success": true,
  "data": {
    "courseCode": "CS101",
    "trendData": [
      {
        "date": "2024-11-11",
        "classesHeld": 1,
        "studentsPresent": 42,
        "attendancePercent": 93.3
      }
    ],
    "trend": "stable"
  }
}
```

### Get Missed Classes Breakdown
```
GET /course-analytics/course/:courseId/missed-classes
Description: Get detailed missed class analysis
Auth: Required

URL Parameters:
  - courseId: Class ID

Response (200):
{
  "success": true,
  "data": {
    "courseCode": "CS101",
    "missedByStudent": [
      {
        "studentId": "stu_123",
        "studentName": "John Doe",
        "totalMissed": 3,
        "missedDates": ["2024-12-01", "2024-12-08"]
      }
    ]
  }
}
```

### Get Absentee Risk Assessment
```
GET /course-analytics/course/:courseId/absentee-risk
Description: Identify at-risk students in course
Auth: Required

URL Parameters:
  - courseId: Class ID

Query Parameters:
  - threshold (optional, default=75): number

Response (200):
{
  "success": true,
  "data": {
    "courseCode": "CS101",
    "threshold": 75,
    "atRiskStudents": [
      {
        "studentId": "stu_456",
        "studentName": "Jane Smith",
        "attendance": 60.0,
        "riskLevel": "critical",
        "intervention": "Required"
      }
    ]
  }
}
```

### Update Course Analytics
```
POST /course-analytics/course/:courseId/update
Description: Refresh course analytics (admin/lecturer)
Auth: Required (admin/lecturer only)

URL Parameters:
  - courseId: Class ID

Body: {} (empty)

Response (200):
{
  "success": true,
  "message": "Course analytics updated successfully"
}
```

---

## 11. AI Insights Endpoints

### Get Absenteeism Risk Prediction
```
GET /ai-insights/absenteeism-risk
Description: Get ML prediction for absenteeism risk
Auth: Required

Response (200):
{
  "success": true,
  "data": {
    "riskLevel": "high",
    "riskScore": 0.75, // 0-1 scale
    "factors": [
      "Low attendance in MATH201 (60%)",
      "3 absences in past month",
      "Inconsistent check-in pattern"
    ],
    "recommendation": "Meet with academic advisor. Attend at least 4 more classes."
  }
}
```

### Get Recommendations
```
GET /ai-insights/recommendations
Description: Get personalized recommendations
Auth: Required

Response (200):
{
  "success": true,
  "data": [
    {
      "type": "attendance",
      "message": "Your attendance is below 75%. Attend 3 more classes in CS101 to reach target.",
      "priority": "high",
      "courseCode": "CS101"
    },
    {
      "type": "punctuality",
      "message": "You have been late 5 times. Try arriving 10 minutes earlier.",
      "priority": "medium"
    }
  ]
}
```

### Get Required Classes
```
GET /ai-insights/required-classes/:courseId
Description: Calculate classes needed to reach minimum attendance
Auth: Required

URL Parameters:
  - courseId: Class ID

Query Parameters:
  - minimumAttendance (optional, default=75): number

Example: GET /ai-insights/required-classes/class_123?minimumAttendance=80

Response (200):
{
  "success": true,
  "data": {
    "courseCode": "CS101",
    "courseName": "Intro to Computer Science",
    "currentAttendance": 70.0,
    "targetAttendance": 80.0,
    "classesRequired": 4,
    "totalSessions": 30,
    "attended": 21,
    "message": "You need to attend 4 more classes to reach 80% attendance"
  }
}
```

### Get Specific Prediction
```
GET /ai-insights/predictions/:type
Description: Get specific type of prediction
Auth: Required

URL Parameters:
  - type: absenteeism_risk|punctuality_score|anomaly_detection

Response (200):
{
  "success": true,
  "data": {
    "type": "absenteeism_risk",
    "prediction": {
      "riskLevel": "high",
      "riskScore": 0.75,
      "timestamp": "2024-12-11T10:00:00Z"
    }
  }
}
```

### Get All Predictions
```
GET /ai-insights/all-predictions
Description: Get all latest predictions for student
Auth: Required

Response (200):
{
  "success": true,
  "data": {
    "absenteeism_risk": {
      "riskLevel": "high",
      "riskScore": 0.75
    },
    "punctuality_score": {
      "score": 0.65,
      "rating": "Fair"
    },
    "anomaly_detection": {
      "anomalies": 2,
      "lastDetected": "2024-12-10T14:30:00Z"
    }
  }
}
```

### Get Performance Report
```
GET /ai-insights/performance-report
Description: Get comprehensive performance report
Auth: Required

Response (200):
{
  "success": true,
  "data": {
    "student": {
      "studentId": "stu_123",
      "studentName": "John Doe"
    },
    "overallAttendance": 82.5,
    "courseBreakdown": [
      {
        "courseCode": "CS101",
        "courseName": "Intro to Computer Science",
        "attendance": 95.0,
        "status": "Excellent"
      },
      {
        "courseCode": "MATH201",
        "courseName": "Calculus II",
        "attendance": 70.0,
        "status": "At Risk"
      }
    ],
    "trend": "improving",
    "summary": "Your attendance has improved by 5% over the past month. Continue focusing on MATH201.",
    "generatedAt": "2024-12-11T10:30:00Z"
  }
}
```

---

## Error Responses

### Standard Error Format
```json
{
  "success": false,
  "message": "Descriptive error message",
  "code": "ERROR_CODE",
  "details": {} // Optional additional details
}
```

### Common Error Codes
- `UNAUTHORIZED` (401) - Invalid or missing JWT token
- `FORBIDDEN` (403) - User doesn't have permission
- `NOT_FOUND` (404) - Resource not found
- `VALIDATION_ERROR` (400) - Invalid request body
- `CONFLICT` (409) - Resource already exists
- `INTERNAL_SERVER_ERROR` (500) - Server error

### Example Error Response
```json
{
  "success": false,
  "message": "Student not found",
  "code": "NOT_FOUND",
  "statusCode": 404
}
```

---

## Rate Limiting (Future)
Currently no rate limiting. Recommended limits for production:
- 100 requests/minute per IP
- 1000 requests/hour per authenticated user
- 10 QR validations/minute per student

---

## Pagination
All list endpoints support:
- `limit`: Number of items (default 20, max 100)
- `offset`: Number of items to skip (default 0)

Response includes:
```json
{
  "data": [],
  "pagination": {
    "total": 45,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

---

## WebSocket Events

### Emit (Client → Server)
```javascript
socket.emit('join-user-room', userId);
socket.emit('join-course-room', courseId);
socket.emit('send-notification', { type: 'message', data: {...} });
```

### Listen (Server → Client)
```javascript
socket.on('new_notification', (data) => {});
socket.on('class-started', (data) => {});
socket.on('class-cancelled', (data) => {});
socket.on('room-changed', (data) => {});
socket.on('lecturer-delay', (data) => {});
```

---

**Last Updated:** December 11, 2025  
**API Version:** 2.0.0  
**Status:** Production Ready ✅
