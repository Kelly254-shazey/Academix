################################################################################
#  CLASSTRACK AI - SYSTEM REPAIR MASTER CHECKLIST
#  STATUS: IN PROGRESS (Phase 2 of 6)
#  Last Updated: December 15, 2025
################################################################################

## ✅ COMPLETED FIXES

### [DONE] 1. Database Schema Creation (Migration 001)
- ✅ Created 001_create_base_schema.js with all foundational tables:
  - users (id, name, email, role, student_id, department, avatar)
  - classes (id, name, class_code, lecturer_id, location, lat/lng)
  - course_enrollments (class_id, student_id)
  - class_sessions (class_id, lecturer_id, start_time, end_time, location, lat/lng, qr_code)
  - attendance_logs (class_session_id, student_id, checkin_time, verification_status)
  - notifications (student_id, title, message, type, is_read)
  - student_profiles (student_id extended info)
  - verified_devices (student_id, device tracking)
  - student_attendance_analytics (student_id, class_id, attendance stats)
  - student_grades (student_id, class_id, assessment_type, score)
  - course_resources (class_id, file_url, category)

### [DONE] 2. Student Route Fixes (backend/routes/student.js)
Fixed ALL errors in student.js:
- ✅ FIXED: 'courses' table → 'classes' table
- ✅ FIXED: 'course_enrollments' table reference (was 'courses')
- ✅ FIXED: 'class_sessions' FK reference (course_id → class_id)
- ✅ FIXED: Removed 'instructor_id' → use 'lecturer_id' 
- ✅ FIXED: Removed 'device_history' → use 'verified_devices'
- ✅ FIXED: Fixed column names: classroom_lat/lng → classroom, location
- ✅ FIXED: Changed 'timestamp' → 'created_at'
- ✅ FIXED: Changed 'read_status' → 'is_read' (consistent naming)
- ✅ REMOVED mock data from /dashboard
- ✅ ADDED all missing endpoints:
  - GET /api/student/grades (student_grades table)
  - GET /api/student/resources (course_resources table)
  - GET /api/student/performance (analytics)
  - GET /api/student/device-history (verified_devices table)
  - PUT /api/student/settings (placeholder)
  - POST /api/student/reset-password
  - POST /api/student/support

Current API Response Structure (NOW CORRECT):
```json
/api/student/dashboard:
{
  "success": true,
  "data": {
    "summary": { "totalCourses", "overallAttendance", "todayClasses" },
    "courses": [ { "id", "name", "code", "attendance_percentage" } ],
    "todayClasses": [ { "id", "name", "startTime", "endTime", "classroom" } ]
  }
}

/api/student/timetable:
{
  "success": true,
  "data": [
    { "id", "className", "classCode", "instructor", "startTime", "endTime", "classroom", "dayOfWeek" }
  ]
}

/api/student/notifications:
{
  "success": true,
  "data": [ { "id", "title", "message", "type", "is_read", "priority", "created_at" } ],
  "unreadCount": 5,
  "pagination": { "limit", "offset", "total" }
}

/api/student/grades:
{
  "success": true,
  "data": [ { "id", "assessment_type", "score", "grade_letter", "course_name", "date_graded" } ]
}

/api/student/resources:
{
  "success": true,
  "data": [ { "id", "name", "description", "category", "file_url", "course_name", "uploaded_date" } ]
}

/api/student/performance:
{
  "success": true,
  "data": { "averageScore", "completedAssignments", "improvement", "recommendations" }
}

/api/student/device-history:
{
  "success": true,
  "data": [ { "id", "device_name", "device_id", "device_type", "last_login" } ]
}
```

---

## ⏳ REMAINING CRITICAL FIXES (IN ORDER)

### [TODO] 3. Fix Lecturer Routes (backend/routes/lecturer.js)
ERRORS TO FIX:
- ❌ Line 65: Uses 'sessions' table (SHOULD BE 'class_sessions')
- ❌ Line 103: Queries u.full_name (SHOULD BE u.name)
- ❌ Line 108: Queries u.profile_picture (CHECK IF COLUMN EXISTS)
- ❌ References to 'student_attendance_analytics' (verify it's created)
- ❌ References to undefined lecturer overview fields

REQUIRED FIXES:
1. Replace all 'sessions' with 'class_sessions'
2. Replace all 'u.full_name' with 'u.name'
3. Verify u.profile_picture exists or map from another field
4. Fix analytics table joins
5. Return response structure matching expected format

---

### [TODO] 4. Fix Attendance Routes
Files to fix:
- backend/routes/attendance.js
- backend/routes/attendanceAPI.js

CRITICAL ERRORS:
- ❌ Two different attendance tables: 'attendance_logs' vs 'attendance_scans'
- ❌ Column name inconsistencies:
  - Uses: captured_lat, captured_lng, captured_fingerprint
  - But 'attendance_scans' has: latitude, longitude, device_fingerprint
  - And 'attendance_logs' has: captured_lat, captured_lng
- ❌ Missing table references in joins

REQUIRED ACTION:
Determine SINGLE attendance table to use:
Option A: Use 'attendance_logs' (base migration)
Option B: Use 'attendance_scans' (Migration 002 for AI)
RECOMMENDATION: Use 'attendance_logs' as primary, 'attendance_scans' for QR verification

Update all queries to use consistent column names:
- checkin_time (not timestamp)
- captured_lat / captured_lng (or latitude / longitude)
- verification_status (consistency)

---

### [TODO] 5. Fix Dashboard Route (backend/routes/dashboard.js)
CURRENT ISSUE: Returns mock data
- ❌ attendanceStats returns hardcoded 0s
- ❌ activeSessions returns empty array
- ❌ recentScans returns empty array

REQUIRED FIX:
Replace mock data with actual queries from:
- attendance_logs table
- class_sessions table
- course_enrollments table
- student_attendance_analytics table

---

### [TODO] 6. Update Migration 002 (attendance_ai_schema.js)
NEEDED:
- ✅ Verify `qr_tokens` table FK references `class_sessions` correctly
- ✅ Verify `attendance_scans` uses correct column names
- ✅ Verify `ai_risk_scores` references are correct
- ⚠️ Ensure it runs AFTER Migration 001

---

### [TODO] 7. Frontend React Fixes (StudentPortal.jsx, others)
In Student Portal:
- DashboardTab: expects summary.totalCourses, summary.overallAttendance ✅ NOW CORRECT
- TimetableTab: expects cls.className ✅ NOW CORRECT, cls.instructor ✅ NOW CORRECT
- NotificationsTab: uses n.is_read (was using both 'read' and 'read_status') ✅ FIX APPLIED

In other components:
- Fix any remaining field mappings to match new API structure
- Ensure all components handle empty/null data gracefully
- Add loading states for all async operations

---

### [TODO] 8. Authentication & Role-Based Access
VERIFY:
- Login returns token and user role correctly
- StudentPortal checks user.role includes 'student'/'learner'/'pupil'
- Protected routes enforce role-based access
- Token refresh mechanism works

---

### [TODO] 9. Real-Time Layer (Socket.IO)
VERIFY:
- Socket.IO connections establish properly
- Event names are consistent across frontend/backend
- Attendance closed event triggers frontend update
- Real-time notifications propagate correctly

---

### [TODO] 10. AI Module Safety
VERIFY:
- AI risk scoring doesn't block attendance flow
- AI runs asynchronously after database write
- AI failures logged but don't crash system
- Results stored separately for later analysis

---

## 🔍 VERIFICATION CHECKLIST

Before marking COMPLETE, verify:

### Database Level:
- [ ] Run: `SHOW TABLES;` - Confirm all tables exist
- [ ] Run: `DESCRIBE users;` - Verify columns: id, name, email, role, student_id, department, avatar
- [ ] Run: `DESCRIBE classes;` - Verify: id, name, class_code, lecturer_id, latitude, longitude
- [ ] Run: `DESCRIBE class_sessions;` - Verify: id, class_id, lecturer_id, start_time, end_time, classroom
- [ ] Run: `DESCRIBE attendance_logs;` - Verify: id, class_session_id, student_id, checkin_time, captured_lat, captured_lng
- [ ] Run: `DESCRIBE notifications;` - Verify: id, student_id, title, message, is_read

### Backend Level:
- [ ] No SQL errors in console logs
- [ ] GET /api/student/dashboard returns correct structure
- [ ] GET /api/student/timetable returns array of classes
- [ ] GET /api/student/notifications works
- [ ] GET /api/student/grades works
- [ ] GET /api/student/resources works
- [ ] GET /api/student/performance works

### Frontend Level:
- [ ] StudentPortal renders without errors
- [ ] DashboardTab displays summary stats
- [ ] TimetableTab displays class schedule
- [ ] NotificationsTab displays messages
- [ ] GradesTab displays grades
- [ ] ResourcesTab displays materials
- [ ] PerformanceTab displays analytics
- [ ] All field names correctly mapped from API

### Integration Level:
- [ ] Login → Dashboard loads correctly
- [ ] Student can view timetable
- [ ] Student can view notifications
- [ ] Real-time updates work (if applicable)
- [ ] No console errors in browser

---

## 📋 EXECUTION ORDER

1. ✅ Migration 001 - CREATE (Already done)
2. ✅ Student routes - CREATE (Already done)
3. ⏳ Lecturer routes - FIX (NEXT PRIORITY)
4. ⏳ Attendance routes - FIX
5. ⏳ Dashboard route - FIX
6. ⏳ Migration 002 - VERIFY
7. ⏳ Frontend React - FIX
8. ⏳ Auth & Roles - VERIFY
9. ⏳ Real-time layer - VERIFY
10. ⏳ AI module - VERIFY
11. ⏳ End-to-End Testing - EXECUTE

---

## 🚨 CRITICAL ERRORS RESOLVED

1. ✅ Database schema missing - CREATED
2. ✅ Table name inconsistency (courses vs classes) - FIXED
3. ✅ Column name mismatches (instructor_id vs lecturer_id) - FIXED
4. ✅ Student API returning mock data - FIXED
5. ✅ Student API response structure mismatch - FIXED
6. ⏳ Lecturer API errors - TODO
7. ⏳ Attendance table inconsistency - TODO
8. ⏳ Dashboard mock data - TODO

---

## 📊 SYSTEM STATUS

Frontend: ⚠️ Partially fixed (awaiting backend completion)
Backend: 🟡 Partially fixed (student routes done, others pending)
Database: ✅ Schema created (migrations ready)
Real-time: ⚠️ Not yet verified
AI Module: ⚠️ Not yet verified

**ESTIMATED COMPLETION**: After fixing remaining 7 critical routes and verifying integration

---

END CHECKLIST
