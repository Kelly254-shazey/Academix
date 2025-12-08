# API Reference - ClassTrack AI

## Base URL
```
http://localhost:5000
```

---

## 🔐 Authentication

All endpoints accept requests. For production, add JWT bearer token:
```
Authorization: Bearer <token>
Content-Type: application/json
```

---

## 📋 Anonymous Messages API

### Submit Anonymous Message
**Endpoint**: `POST /feedback/anonymous-message`

**Description**: Student submits anonymous feedback about a missed lecture

**Request**:
```json
{
  "lectureId": "lec_001",
  "courseName": "Computer Science 101",
  "reason": "Had a family emergency that day",
  "studentName": "Anonymous Student"  // Optional, defaults to "Anonymous Student"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "message": "Anonymous message submitted successfully",
  "data": {
    "id": "msg_1733529600000",
    "lectureId": "lec_001",
    "studentName": "Anonymous Student",
    "courseName": "Computer Science 101",
    "reason": "Had a family emergency that day",
    "timestamp": "2025-12-06T10:00:00.000Z",
    "status": "unread",
    "createdAt": "2025-12-06T10:00:00.000Z"
  }
}
```

**Error** (400 Bad Request):
```json
{
  "success": false,
  "message": "lectureId, courseName, and reason are required"
}
```

---

### Get All Anonymous Messages
**Endpoint**: `GET /feedback/anonymous-messages`

**Description**: Retrieve all anonymous messages (admin only)

**Response** (200 OK):
```json
{
  "success": true,
  "messages": [
    {
      "id": "msg_1",
      "lectureId": "lec_001",
      "studentName": "Anonymous Student",
      "courseName": "Computer Science 101",
      "reason": "Family emergency",
      "timestamp": "2025-12-05T10:00:00.000Z",
      "status": "unread",
      "createdAt": "2025-12-05T10:00:00.000Z"
    },
    {
      "id": "msg_2",
      "lectureId": "lec_002",
      "studentName": "Anonymous Student",
      "courseName": "Advanced Mathematics",
      "reason": "Medical issue",
      "timestamp": "2025-12-04T10:00:00.000Z",
      "status": "reviewed",
      "adminNotes": "Contact student for medical cert",
      "reviewedAt": "2025-12-04T14:00:00.000Z"
    }
  ],
  "count": 3
}
```

---

### Get Specific Message
**Endpoint**: `GET /feedback/anonymous-messages/:id`

**Description**: Get specific message by ID (auto-marks as read)

**Parameters**:
- `id` (path): Message ID (e.g., "msg_1")

**Response** (200 OK):
```json
{
  "success": true,
  "message": {
    "id": "msg_1",
    "lectureId": "lec_001",
    "studentName": "Anonymous Student",
    "courseName": "Computer Science 101",
    "reason": "Family emergency",
    "timestamp": "2025-12-05T10:00:00.000Z",
    "status": "read"
  }
}
```

**Error** (404 Not Found):
```json
{
  "success": false,
  "message": "Message not found"
}
```

---

### Mark Message as Reviewed
**Endpoint**: `PUT /feedback/anonymous-messages/:id/review`

**Description**: Mark message as reviewed and add admin notes

**Parameters**:
- `id` (path): Message ID

**Request**:
```json
{
  "notes": "Contacted student, will provide medical documentation",
  "actionTaken": "pending_documentation"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Message marked as reviewed",
  "data": {
    "id": "msg_1",
    "lectureId": "lec_001",
    "studentName": "Anonymous Student",
    "courseName": "Computer Science 101",
    "reason": "Family emergency",
    "status": "reviewed",
    "adminNotes": "Contacted student, will provide medical documentation",
    "actionTaken": "pending_documentation",
    "reviewedAt": "2025-12-06T11:00:00.000Z"
  }
}
```

---

### Delete Message
**Endpoint**: `DELETE /feedback/anonymous-messages/:id`

**Description**: Delete an anonymous message

**Parameters**:
- `id` (path): Message ID

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Anonymous message deleted"
}
```

---

## 📊 Attendance API

### Record Attendance
**Endpoint**: `POST /feedback/attendance/record`

**Description**: Record attendance for a student in a lecture

**Request**:
```json
{
  "studentId": "STU001",
  "lectureId": "lec_001",
  "courseName": "Computer Science 101",
  "date": "2025-12-06",
  "status": "present"
}
```

**Status Values**:
- `present` - Student attended
- `absent` - Student did not attend
- `late` - Student arrived late
- `excused` - Absence excused (medical, etc.)

**Response** (201 Created):
```json
{
  "success": true,
  "message": "Attendance recorded",
  "data": {
    "id": "att_STU001_1",
    "studentId": "STU001",
    "lectureId": "lec_001",
    "courseName": "Computer Science 101",
    "date": "2025-12-06",
    "status": "present",
    "timestamp": "2025-12-06T10:00:00.000Z"
  }
}
```

---

### Get Overall Attendance Analysis
**Endpoint**: `GET /feedback/attendance/analysis`

**Description**: Get attendance statistics for all students in system

**Response** (200 OK):
```json
{
  "success": true,
  "analysis": {
    "STU001": {
      "total": 15,
      "present": 14,
      "absent": 1,
      "late": 0,
      "excused": 0,
      "attendancePercentage": 93.33,
      "status": "Good"
    },
    "STU002": {
      "total": 15,
      "present": 5,
      "absent": 8,
      "late": 1,
      "excused": 1,
      "attendancePercentage": 33.33,
      "status": "Critical"
    },
    "STU003": {
      "total": 15,
      "present": 9,
      "absent": 5,
      "late": 1,
      "excused": 0,
      "attendancePercentage": 60.0,
      "status": "Warning"
    }
  },
  "totalStudents": 6
}
```

**Status Values**:
- `Good` - 75% or above attendance
- `Warning` - 60-75% attendance
- `Critical` - Below 60% attendance

---

### Get Student Attendance Details
**Endpoint**: `GET /feedback/attendance/analysis/:studentId`

**Description**: Get detailed attendance records and analysis for specific student

**Parameters**:
- `studentId` (path): Student ID (e.g., "STU001")

**Response** (200 OK):
```json
{
  "success": true,
  "studentId": "STU001",
  "records": [
    {
      "id": "att_STU001_15",
      "studentId": "STU001",
      "lectureId": "lec_015",
      "courseName": "Data Science",
      "date": "2025-12-06",
      "status": "present",
      "timestamp": "2025-12-06T10:00:00.000Z"
    },
    {
      "id": "att_STU001_14",
      "studentId": "STU001",
      "lectureId": "lec_014",
      "courseName": "Physics I",
      "date": "2025-12-05",
      "status": "present",
      "timestamp": "2025-12-05T10:00:00.000Z"
    }
  ],
  "analysis": {
    "total": 15,
    "present": 14,
    "absent": 1,
    "late": 0,
    "excused": 0,
    "attendancePercentage": 93.33,
    "status": "Good"
  },
  "courseAnalysis": {
    "Computer Science 101": {
      "total": 4,
      "present": 4,
      "absent": 0,
      "percentage": 100.0
    },
    "Advanced Mathematics": {
      "total": 4,
      "present": 3,
      "absent": 1,
      "percentage": 75.0
    },
    "Data Science": {
      "total": 4,
      "present": 4,
      "absent": 0,
      "percentage": 100.0
    },
    "Physics I": {
      "total": 3,
      "present": 3,
      "absent": 0,
      "percentage": 100.0
    }
  }
}
```

---

### Get Course Attendance Statistics
**Endpoint**: `GET /feedback/attendance/course/:courseName`

**Description**: Get attendance statistics for all students in a specific course

**Parameters**:
- `courseName` (path): Course name (e.g., "Computer Science 101")

**Response** (200 OK):
```json
{
  "success": true,
  "courseName": "Computer Science 101",
  "students": [
    {
      "studentId": "STU002",
      "total": 4,
      "present": 2,
      "absent": 2,
      "late": 0,
      "percentage": 50.0,
      "status": "Critical"
    },
    {
      "studentId": "STU005",
      "total": 4,
      "present": 3,
      "absent": 1,
      "late": 0,
      "percentage": 75.0,
      "status": "Good"
    },
    {
      "studentId": "STU001",
      "total": 4,
      "present": 4,
      "absent": 0,
      "late": 0,
      "percentage": 100.0,
      "status": "Good"
    }
  ],
  "averageAttendance": 75.0
}
```

---

### Get Attendance Alerts
**Endpoint**: `GET /feedback/attendance/alerts`

**Description**: Get list of students with attendance below 60% threshold

**Response** (200 OK):
```json
{
  "success": true,
  "alerts": [
    {
      "studentId": "STU002",
      "attendancePercentage": 33.33,
      "total": 15,
      "present": 5,
      "absent": 10,
      "severity": "Critical",
      "message": "Student STU002 has 33.33% attendance (below 60% threshold)"
    },
    {
      "studentId": "STU005",
      "attendancePercentage": 53.33,
      "total": 15,
      "present": 8,
      "absent": 7,
      "severity": "Warning",
      "message": "Student STU005 has 53.33% attendance (below 60% threshold)"
    }
  ],
  "count": 2,
  "criticalCount": 1,
  "warningCount": 1
}
```

**Severity Levels**:
- `Critical` - Below 40% attendance
- `Warning` - 40-60% attendance

---

### Generate Attendance Report
**Endpoint**: `POST /feedback/attendance/report`

**Description**: Generate filtered attendance report

**Request**:
```json
{
  "startDate": "2025-11-25",
  "endDate": "2025-12-06",
  "courseName": "Computer Science 101"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "report": {
    "generatedAt": "2025-12-06T11:00:00.000Z",
    "filters": {
      "startDate": "2025-11-25",
      "endDate": "2025-12-06",
      "courseName": "Computer Science 101"
    },
    "totalRecords": 18,
    "summary": {
      "totalPresent": 16,
      "totalAbsent": 2,
      "totalLate": 0,
      "totalExcused": 0
    },
    "records": [
      {
        "id": "att_STU001_15",
        "studentId": "STU001",
        "lectureId": "lec_015",
        "courseName": "Computer Science 101",
        "date": "2025-12-06",
        "status": "present"
      }
    ]
  }
}
```

---

## 🧪 Testing Examples

### Using Fetch in JavaScript
```javascript
// Submit anonymous message
const response = await fetch('http://localhost:5000/feedback/anonymous-message', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    lectureId: 'lec_001',
    courseName: 'Computer Science 101',
    reason: 'Had a family emergency'
  })
});
const data = await response.json();
console.log(data);
```

### Using cURL
```bash
# Get all messages
curl http://localhost:5000/feedback/anonymous-messages

# Get attendance analysis
curl http://localhost:5000/feedback/attendance/analysis

# Get alerts
curl http://localhost:5000/feedback/attendance/alerts
```

### Using PowerShell
```powershell
# Get attendance analysis
$response = Invoke-WebRequest -Uri "http://localhost:5000/feedback/attendance/analysis" -Method Get
$response.Content | ConvertFrom-Json | ConvertTo-Json

# Submit message
$body = @{
  lectureId = "lec_001"
  courseName = "Computer Science 101"
  reason = "Family emergency"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:5000/feedback/anonymous-message" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

---

## 📈 Response Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| `200` | OK | Successful GET request |
| `201` | Created | Successfully created resource |
| `400` | Bad Request | Missing required fields |
| `404` | Not Found | Resource doesn't exist |
| `500` | Server Error | Internal server error |

---

## 🔍 Error Handling

All error responses follow this format:
```json
{
  "success": false,
  "message": "Error description here"
}
```

**Common Errors**:
```
"lectureId, courseName, and reason are required"
"studentId, lectureId, courseName, and status are required"
"Message not found"
"Server error while submitting message"
```

---

## 📝 Data Validation

### Anonymous Message
- `lectureId` (required, string)
- `courseName` (required, string)
- `reason` (required, string)
- `studentName` (optional, string)

### Attendance Record
- `studentId` (required, string)
- `lectureId` (required, string)
- `courseName` (required, string)
- `status` (required, enum: present|absent|late|excused)
- `date` (optional, ISO date string)

---

## 🔐 CORS & Security

Current implementation allows all origins (demo mode).

For production, configure CORS:
```javascript
const cors = require('cors');
app.use(cors({
  origin: 'https://yourdomain.com',
  credentials: true
}));
```

---

## 📚 Rate Limiting

Not implemented in demo. For production:
```javascript
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);
```

---

**API Reference v1.0**  
Last Updated: December 6, 2025  
Ready for: Production Implementation
