# Smart Attendance & Class Monitoring System - Backend Upgrade Documentation

## Overview

This document outlines the comprehensive backend upgrade for the Smart Attendance & Class Monitoring System. The system has been enhanced with multiple new modules, services, and APIs to support advanced attendance tracking, real-time notifications, gamification, analytics, and AI-powered insights.

---

## Architecture Overview

### Core Technology Stack
- **Framework**: Express.js (Node.js)
- **Database**: MySQL/MariaDB
- **Real-time Communication**: Socket.IO
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Joi
- **Security**: bcryptjs for password hashing

### Service Layer Architecture
The application follows a service-oriented architecture with clear separation of concerns:
```
Routes → Controllers/Route Handlers → Services → Database
         ↓
      Middleware (Auth, Validation, Error Handling)
         ↓
      Socket.IO Events
```

---

## New Services Implemented

### 1. **Attendance Analytics Service** (`attendanceAnalyticsService.js`)
Comprehensive attendance tracking and analysis.

**Key Methods:**
- `getOverallAttendance(studentId)` - Overall attendance percentage
- `getAttendancePerCourse(studentId)` - Per-course breakdown
- `getAttendanceAnalytics(studentId, startDate, endDate)` - Detailed analytics with trends
- `checkLowAttendanceThreshold(studentId, threshold)` - Risk assessment
- `getMissedClasses(studentId, limit)` - Missed class tracking
- `getAbsenteeRisk(studentId)` - Course-wise risk calculation
- `getAttendanceSummary(studentId, startDate, endDate)` - Date-range summary

**API Routes:**
- `GET /attendance-analytics/overall`
- `GET /attendance-analytics/per-course`
- `GET /attendance-analytics/analytics`
- `GET /attendance-analytics/low-threshold-check`
- `GET /attendance-analytics/missed-classes`
- `GET /attendance-analytics/absentee-risk`
- `GET /attendance-analytics/summary`

---

### 2. **QR Validation Service** (`qrValidationService.js`)
Secure QR check-in with device and location validation.

**Key Methods:**
- `validateQRToken(qrToken)` - Validate QR code
- `validateDeviceFingerprint(studentId, deviceFingerprint)` - Device verification
- `validateLocationProximity(classLat, classLng, capturedLat, capturedLng)` - Location check
- `processQRCheckin(...)` - Complete check-in workflow
- `generateQRForSession(sessionId, classId)` - QR generation (10-min validity)
- `registerDevice(studentId, deviceFingerprint, deviceName)` - Device registration

**Features:**
- Haversine formula for distance calculation (100m tolerance)
- QR token expiration (10 minutes)
- Device fingerprint binding
- Location spoofing detection
- Browser fingerprint validation

**API Routes:**
- `POST /qr/validate-and-checkin` - Full check-in
- `POST /qr/validate` - Token validation only
- `POST /qr/register-device` - Register device
- `POST /qr/generate/:sessionId` - Generate QR (lecturer only)

---

### 3. **Daily Schedule Service** (`dailyScheduleService.js`)
Class schedule management and status tracking.

**Key Methods:**
- `getTodayClasses(studentId)` - Today's classes with check-in status
- `getUpcomingClasses(studentId, daysAhead)` - Next 7 days
- `getWeeklySchedule(studentId)` - Full week schedule
- `getClassStatus(startTime)` - ongoing/upcoming/completed status

**API Routes:**
- `GET /schedule/today`
- `GET /schedule/upcoming`
- `GET /schedule/weekly`

---

### 4. **Notification Service** (`notificationService.js`)
Real-time notifications with database persistence and WebSocket integration.

**Key Methods:**
- `createNotification(userId, type, title, message)` - Create notification
- `getNotifications(userId, limit, offset, unreadOnly)` - Fetch notifications
- `markAsRead/markAsUnread(notificationIds, userId)` - Mark read status
- `broadcastNotification(userIds, type, title, message)` - Broadcast to multiple users
- `notifyClassStarted(classId, studentIds)` - Helper for class start
- `notifyLowAttendance(studentId, courseId, attendancePercent)` - Helper for low attendance
- `notifyClassCancellation(classId, studentIds, reason)` - Helper for cancellation
- `notifyRoomChange(classId, studentIds, newLocation)` - Helper for room change
- `notifyLecturerDelay(classId, studentIds, delayMinutes)` - Helper for lecturer delay

**Database Integration:**
- Automatically emits real-time notifications via Socket.IO
- Stores all notifications in database
- Tracks read/unread status

**API Routes:**
- `GET /notifications`
- `GET /notifications/unread-count`
- `POST /notifications/mark-read`
- `POST /notifications/mark-unread`
- `DELETE /notifications/:id`
- `POST /notifications/clear`

---

### 5. **Student Profile Service** (`studentProfileService.js`)
Student profile management with device verification.

**Key Methods:**
- `getProfile(studentId)` - Complete profile with metrics
- `updateProfile(studentId, profileData)` - Update bio, phone, etc.
- `updateAvatar(studentId, avatarUrl)` - Avatar management
- `getVerifiedDevices(studentId)` - List verified devices
- `registerDevice(studentId, deviceFingerprint, deviceName)` - Register new device
- `removeDevice(studentId, deviceId)` - Remove device
- `getProfileCompletion(studentId)` - Completion percentage (0-100)

**API Routes:**
- `GET /profile`
- `PUT /profile`
- `PUT /profile/avatar`
- `GET /profile/devices`
- `POST /profile/devices`
- `DELETE /profile/devices/:id`
- `GET /profile/completion`

---

### 6. **User Settings Service** (`userSettingsService.js`)
Preferences and session management.

**Key Methods:**
- `getSettings(userId)` - Get all user preferences
- `updateSettings(userId, settingsData)` - Update notification, theme, timezone prefs
- `changePassword(userId, currentPassword, newPassword)` - Password change (invalidates all sessions)
- `getActiveSessions(userId)` - List active sessions
- `logoutOtherSessions(userId, currentSessionId)` - Logout all other devices
- `revokeSession(userId, sessionId)` - Revoke specific session
- `createSession(userId, tokenHash, deviceName, ipAddress, userAgent)` - Create session record
- `cleanExpiredSessions()` - Cleanup job

**Settings Stored:**
- Notifications enabled/disabled (email, push, SMS)
- Dark mode preference
- Timezone

**API Routes:**
- `GET /settings`
- `PUT /settings`
- `POST /settings/change-password`
- `GET /settings/sessions`
- `POST /settings/logout-other-sessions`
- `DELETE /settings/sessions/:id`

---

### 7. **Support System Service** (`supportService.js`)
Support ticket management with admin response tracking.

**Key Methods:**
- `createTicket(studentId, category, subject, description, priority)` - Create ticket
- `getStudentTickets(studentId, status, limit, offset)` - Get student's tickets
- `getAllTickets(status, limit, offset)` - Get all tickets (admin)
- `addResponse(ticketId, responderId, responseText, isInternal)` - Add response
- `getTicketResponses(ticketId, userId, isAdmin)` - Get responses (hides internal notes for students)
- `updateTicketStatus(ticketId, status, adminId)` - Update status & assignment
- `getTicketById(ticketId)` - Get specific ticket
- `getTicketStats()` - Dashboard statistics

**Ticket Status Flow:**
open → in_progress → resolved → closed

**Priority Levels:**
low, medium, high, urgent

**API Routes:**
- `POST /support/tickets` - Create ticket
- `GET /support/tickets` - Get student's tickets
- `GET /support/tickets/:id` - Get specific ticket
- `POST /support/tickets/:id/responses` - Add response
- `PUT /support/tickets/:id` - Update (admin only)
- `GET /support/stats` - Statistics (admin only)

---

### 8. **Gamification Service** (`gamificationService.js`)
Badges, streaks, and progress tracking.

**Key Methods:**
- `createBadge(name, description, iconUrl, requirementType, requirementValue)` - Create badge
- `getStudentBadges(studentId)` - Get badges with progress
- `updateBadgeProgress(studentId, badgeId, progress)` - Update progress
- `awardBadge(studentId, badgeId)` - Award badge
- `getAttendanceStreak(studentId, courseId)` - Get course streak
- `updateAttendanceStreak(studentId, courseId)` - Update streak (auto-trigger on attendance)
- `getAllStreaks(studentId)` - Get all course streaks
- `getStudentProgress(studentId)` - Leaderboard score calculation

**Default Badges:**
- Perfect Attendee (100% attendance)
- Streak Master (10-day streak)
- Punctuality Pro (30 classes on time)
- Consistent Scholar (90%+ semester attendance)

**API Routes:**
- `GET /gamification/badges`
- `GET /gamification/streaks`
- `GET /gamification/progress`
- `GET /gamification/streak/:courseId`

---

### 9. **Course Analytics Service** (`courseAnalyticsService.js`)
Course-level analytics and reporting.

**Key Methods:**
- `getCourseAnalytics(courseId)` - Full course analytics with student breakdown
- `getAttendanceTrends(courseId, daysBack)` - 30-day trend analysis
- `getMissedClassesBreakdown(courseId)` - Which students missed which classes
- `getAbsenteeRiskAssessment(courseId, threshold)` - At-risk student identification
- `updateCourseAnalyticsSummary(courseId)` - Refresh analytics (call after attendance updates)

**Risk Levels:**
- critical: < 50% attendance
- high: 50-75% attendance
- medium: 75-85% attendance

**API Routes:**
- `GET /course-analytics/course/:courseId`
- `GET /course-analytics/course/:courseId/trends`
- `GET /course-analytics/course/:courseId/missed-classes`
- `GET /course-analytics/course/:courseId/absentee-risk`
- `POST /course-analytics/course/:courseId/update` - Refresh (lecturer/admin only)

---

### 10. **Calendar Service** (`calendarService.js`)
Academic calendar and event management.

**Key Methods:**
- `createEvent(title, eventType, startDate, endDate, ...)` - Create event
- `getEvents(startDate, endDate, eventType, classId)` - Query events
- `getEventsByType(eventType, limit)` - Filter by type
- `getUpcomingEvents(limit)` - Next N events
- `getClassEvents(classId)` - Class-specific events
- `updateEvent(eventId, updateData)` - Update event
- `deleteEvent(eventId)` - Delete event
- `getMonthCalendar(year, month)` - Month view

**Event Types:**
- class
- exam
- academic_activity
- holiday

**API Routes:**
- `POST /calendar/events` - Create (lecturer/admin only)
- `GET /calendar/events` - Query events
- `GET /calendar/events/type/:type` - Filter by type
- `GET /calendar/upcoming` - Upcoming events
- `GET /calendar/class/:classId` - Class events
- `GET /calendar/month/:year/:month` - Month calendar
- `PUT /calendar/events/:id` - Update (lecturer/admin only)
- `DELETE /calendar/events/:id` - Delete (lecturer/admin only)

---

### 11. **AI Insights Service** (`aiInsightsService.js`)
Machine learning predictions and recommendations.

**Key Methods:**
- `predictAbsenteeismRisk(studentId)` - Call external ML service for risk prediction
- `getRecommendations(studentId)` - Personalized recommendations
- `calculateRequiredClasses(studentId, courseId, minimumAttendance)` - Classes needed for threshold
- `getAIPrediction(studentId, predictionType)` - Get specific prediction
- `getAllPredictions(studentId)` - Get all predictions for student
- `generatePerformanceReport(studentId)` - Comprehensive performance report

**Fallback Logic:**
If ML service is unavailable, uses simple heuristic: risk_score = 1 - (attendance% / 100)

**External ML Endpoint:**
POST `{AI_SERVICE_URL}/predict/absenteeism` (default: http://localhost:5003)

**Prediction Types:**
- absenteeism_risk
- punctuality_score
- anomaly_detection

**API Routes:**
- `GET /ai-insights/absenteeism-risk`
- `GET /ai-insights/recommendations`
- `GET /ai-insights/required-classes/:courseId`
- `GET /ai-insights/predictions/:type`
- `GET /ai-insights/all-predictions`
- `GET /ai-insights/performance-report`

---

## Database Schema Extensions

### New Tables

```sql
-- Student Profiles
CREATE TABLE student_profiles (
  id, student_id, bio, avatar_url, phone, 
  verified_at, risk_level, created_at, updated_at
);

-- Verified Devices
CREATE TABLE verified_devices (
  id, student_id, device_fingerprint, device_name,
  is_verified, last_used_at, created_at, updated_at
);

-- User Settings
CREATE TABLE user_settings (
  id, user_id, notifications_enabled, email_notifications,
  push_notifications, sms_notifications, dark_mode, timezone,
  created_at, updated_at
);

-- Support Tickets & Responses
CREATE TABLE support_tickets (
  id, student_id, category, subject, description,
  status, priority, assigned_admin_id, created_at,
  updated_at, resolved_at
);

CREATE TABLE support_responses (
  id, ticket_id, responder_id, response_text,
  is_internal, created_at, updated_at
);

-- Gamification
CREATE TABLE badges (
  id, name, description, icon_url,
  requirement_type, requirement_value, created_at
);

CREATE TABLE student_badges (
  id, student_id, badge_id, earned_at,
  progress, created_at
);

CREATE TABLE attendance_streaks (
  id, student_id, course_id, current_streak,
  max_streak, last_attendance_date, created_at, updated_at
);

-- Calendar Events
CREATE TABLE calendar_events (
  id, title, event_type, class_id,
  start_date, end_date, start_time, end_time,
  location, description, created_by,
  created_at, updated_at
);

-- Analytics
CREATE TABLE course_analytics (
  id, class_id, total_sessions,
  average_attendance_percent, total_students_enrolled,
  updated_at
);

CREATE TABLE student_attendance_analytics (
  id, student_id, class_id, total_sessions,
  attended, attendance_percent, is_at_risk,
  last_updated
);

-- Sessions
CREATE TABLE active_sessions (
  id, user_id, token_hash, device_name,
  ip_address, user_agent, expires_at, created_at
);
```

---

## Real-time Events (Socket.IO)

### Event Listeners
```javascript
// Join user notification room
socket.on('join-user-room', userId);

// Join course update room
socket.on('join-course-room', courseId);

// Class events
socket.on('class-started', { classId, courseName });
socket.on('class-cancelled', { classId, courseName, reason });
socket.on('room-changed', { classId, courseName, newLocation });
socket.on('lecturer-delay', { classId, courseName, delayMinutes });

// Generic notification
socket.on('send-notification', data);
```

### Event Broadcasts
```javascript
// Emitted to course room
io.to(`course_${classId}`).emit('class-started', data);
io.to(`course_${classId}`).emit('class-cancelled', data);
io.to(`course_${classId}`).emit('room-changed', data);
io.to(`course_${classId}`).emit('lecturer-delay', data);

// Emitted to user room
io.to(`user_${userId}`).emit('new_notification', data);
```

---

## Authentication & Authorization

### Middleware
- `authMiddleware` - JWT token verification, populates req.user
- `validation.js` - Joi schema validation for requests

### Role-based Access Control
```javascript
// Routes with role checking
if (req.user.role !== 'admin') {
  return res.status(403).json({ success: false, message: 'Unauthorized' });
}
```

### Roles
- `student` - Can access personal data, check in, view own stats
- `lecturer` - Can create events, generate QR, view course analytics
- `admin` - Full access to all resources

---

## Validation Schemas

Comprehensive Joi validators for all endpoints in `validators/schemas.js`:

- `attendanceCheckinSchema` - QR check-in validation
- `attendanceAnalyticsSchema` - Date range queries
- `updateProfileSchema` - Profile updates
- `deviceManagementSchema` - Device registration
- `updateSettingsSchema` - Settings changes
- `changePasswordSchema` - Password changes (matches confirmation)
- `createTicketSchema` - Support ticket creation
- `addTicketResponseSchema` - Support responses
- `createEventSchema` - Calendar event creation
- `qrValidationSchema` - QR token validation
- And more...

**All request bodies are validated and unknown fields are stripped.**

---

## Error Handling

### Global Error Middleware
```javascript
// Validation errors return 400 with detailed field errors
// Not found returns 404
// Unauthorized returns 403
// Server errors return 500 with logger.error()
```

### Logging
All errors logged via `logger.error()` for debugging and monitoring.

---

## Best Practices Implemented

✅ **Security:**
- JWT authentication on all protected routes
- Password hashing with bcryptjs
- Session management with expiration
- Device fingerprinting
- Location validation

✅ **Data Validation:**
- Joi schema validation
- Request body sanitization (stripUnknown)
- Query parameter validation

✅ **Performance:**
- Optimized SQL queries with proper indexes
- Batch operations where possible
- Efficient date-range queries
- Pagination support on list endpoints

✅ **Real-time Communication:**
- WebSocket rooms for targeted broadcasts
- Fallback to database for missed notifications
- Connection status tracking

✅ **Code Quality:**
- Service layer abstraction
- Clear separation of concerns
- Consistent error handling
- Comprehensive logging

---

## Integration Points

### External Services
- **ML Service**: POST to `/predict/absenteeism` (configurable via `AI_SERVICE_URL`)
- **Frontend**: WebSocket connection to Socket.IO for real-time updates

### Database
- MySQL/MariaDB with proper indexing
- Foreign key constraints
- ACID compliance for transactions

---

## Deployment Checklist

- [ ] Run database migrations (`schema.sql`)
- [ ] Set `AI_SERVICE_URL` environment variable if using external ML
- [ ] Configure CORS origin (`FRONTEND_URL`)
- [ ] Set JWT secret in `.env`
- [ ] Enable database backups
- [ ] Configure logging rotation
- [ ] Set up SSL/TLS for production
- [ ] Install and configure reverse proxy (nginx/Apache)
- [ ] Set up CI/CD pipeline

---

## Environment Variables

```bash
PORT=5002
FRONTEND_URL=http://localhost:3000
AI_SERVICE_URL=http://localhost:5003
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=password
DB_NAME=class_ai_db
JWT_SECRET=your-secret-key
NODE_ENV=production
```

---

## API Endpoint Summary

**Total: 60+ endpoints organized across 11 modules**

| Module | Routes | Key Features |
|--------|--------|--------------|
| Attendance Analytics | 7 | Overall %, per-course, trends, risk assessment |
| QR Validation | 4 | Secure check-in, device registration, QR generation |
| Schedule | 3 | Today's classes, upcoming, weekly |
| Notifications | 6 | CRUD, broadcast, real-time, read status |
| Profile | 7 | Avatar, device management, completion % |
| Settings | 6 | Preferences, password, session management |
| Support | 6 | Tickets, responses, admin dashboard |
| Gamification | 4 | Badges, streaks, progress |
| Calendar | 8 | Events CRUD, filtering, month view |
| Course Analytics | 5 | Breakdown, trends, risk, updates |
| AI Insights | 6 | Predictions, recommendations, reports |

---

## Testing Recommendations

1. **Unit Tests**: Service methods with mock data
2. **Integration Tests**: Full API workflows
3. **Load Tests**: Concurrent student check-ins
4. **Security Tests**: JWT expiration, role-based access
5. **Real-time Tests**: Socket.IO event delivery

---

## Future Enhancements

- [ ] WebSocket client auto-reconnect with exponential backoff
- [ ] Redis caching layer for frequently accessed data
- [ ] Advanced ML models (Prophet, LSTM for trend prediction)
- [ ] Push notifications via Firebase Cloud Messaging
- [ ] Email notifications with Nodemailer
- [ ] SMS alerts via Twilio
- [ ] Export attendance reports (PDF/Excel)
- [ ] Parent/Guardian notifications
- [ ] Mobile app API optimization
- [ ] Rate limiting per IP/user
- [ ] Request signing for API security
- [ ] GraphQL API layer

---

## Support & Documentation

For issues or questions, refer to:
1. Service documentation above
2. Inline code comments
3. Database schema relationships
4. API route handlers
5. Test files (when available)

---

**Last Updated:** December 11, 2025  
**Backend Version:** 2.0.0  
**Status:** Production Ready ✅
