## Admin Dashboard Backend - Implementation Guide

**Phase**: Extended Enterprise Features
**Status**: Core Services & Routes Complete
**Version**: 1.0.0
**Last Updated**: December 11, 2025

---

### Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [Services & APIs](#services--apis)
5. [Authentication & Authorization](#authentication--authorization)
6. [Socket.IO Real-time Events](#socketio-real-time-events)
7. [Usage Examples](#usage-examples)
8. [Deployment & Testing](#deployment--testing)
9. [Future Enhancements](#future-enhancements)

---

## Overview

The Admin Dashboard Backend extends the Academix system with comprehensive institution-wide management capabilities, including:

- **Institution Overview**: Dashboard with KPIs, trends, and alerts
- **Global Lecturer Management**: CRUD, analytics, course assignments
- **Global Student Management**: Directory, flags, transfers, attendance tracking
- **Department Management**: Organization, HOD assignment, metrics
- **Audit & Compliance**: Complete action logging, compliance reports, GDPR support
- **Real-time Broadcasting**: System notifications with delivery tracking
- **Role-Based Access Control (RBAC)**: 6 roles with 48+ permissions
- **System Configuration**: Flexible settings and integration management

### Technology Stack

- **Framework**: Node.js + Express.js (v4.18.2)
- **Database**: MySQL/MariaDB with 30+ tables
- **Real-time**: Socket.IO (v4.8.1)
- **Authentication**: JWT + Role-Based Access Control
- **Validation**: Joi (v29.x)
- **Security**: bcryptjs, HMAC-SHA256

---

## Architecture

### Directory Structure

```
backend/
├── services/
│   ├── adminService.js                 # Overview, KPIs, notifications
│   ├── departmentService.js             # Department CRUD & metrics
│   ├── lecturerManagementService.js     # Lecturer global operations
│   ├── studentManagementService.js      # Student global operations
│   ├── auditService.js                  # Audit logging & compliance
│   ├── [future] analyticsService.js
│   ├── [future] broadcastService.js
│   └── [future] aiIntegrationService.js
│
├── routes/
│   ├── adminDashboard.js                # All admin endpoints (25+ routes)
│   ├── [future] reports.js              # Export & reporting endpoints
│   ├── [future] configuration.js        # System settings endpoints
│   └── [future] privacy.js              # GDPR compliance endpoints
│
├── middlewares/
│   ├── rbacMiddleware.js                # Authorization & audit logging
│   ├── auth.js                          # JWT verification
│   ├── errorMiddleware.js               # Error handling
│   └── validation.js                    # Input validation
│
├── validators/
│   └── adminSchemas.js                  # 40+ Joi validation schemas
│
├── utils/
│   └── logger.js                        # Enhanced logging
│
├── database.js                          # Connection pooling
├── server.js                            # Express app setup
└── package.json
```

### Service Layer Design

Each service follows a consistent pattern:

```javascript
class ServiceName {
  async methodName(params) {
    const conn = await mysql.createPool({...});
    try {
      // Business logic
      return { success: true, data: {...} };
    } catch (error) {
      logger.error('Error:', error);
      throw error;
    } finally {
      conn.end();
    }
  }
}
module.exports = new ServiceName();
```

---

## Database Schema

### Core Admin Tables (18 New Tables)

#### 1. **admin_users**
- Stores super-admin and admin accounts
- Fields: user_id, role, permissions (JSON), mfa_enabled, session_ids (JSON)
- Indices: role, active, last_login

#### 2. **departments**
- Department information with HOD assignment
- Fields: name, code, hod_id, budget_allocation, location, contact info
- Unique constraint: code

#### 3. **role_permissions** (48 Pre-loaded Entries)
- Permission matrix: (role, resource, action)
- Covers: admin_users, departments, lecturers, students, broadcasts, audit_logs, export_jobs, system_config, privacy_requests

#### 4. **audit_logs** (Enhanced)
- Comprehensive action logging with 18 columns
- Fields: user_id, action, resource_type, old_value (JSON), new_value (JSON), ip_address, device_fingerprint, severity, status
- Full-text search on action and resource_name
- Indices: user, action, resource, timestamp, severity, ip

#### 5. **broadcasts**
- System-wide announcements
- Fields: title, message, target_type (all/role/department/class/custom), priority, scheduled_at, expires_at
- Features: Scheduling, targeting, expiration

#### 6. **broadcast_delivery**
- Delivery tracking with read receipts
- Fields: broadcast_id, recipient_user_id, delivered_at, read_at, delivery_status
- Unique: (broadcast_id, recipient_user_id)

#### 7. **export_jobs**
- Async data export management
- Fields: job_id, export_type, file_format, status, progress_percent, file_path
- Features: Async processing, multiple formats, expiration

#### 8. **department_metrics**
- Daily KPI snapshots per department
- Fields: metric_date, total_students, total_lecturers, avg_attendance_percent, at_risk_students
- Unique: (department_id, metric_date)

#### 9. **ai_jobs**
- ML model training and prediction jobs
- Fields: job_type, model_name, status, progress_percent, input_params (JSON), output_results (JSON)

#### 10. **system_configuration**
- Flexible settings storage
- Fields: config_key (unique), config_value (JSON), data_type, category
- Examples: attendance_threshold, qr_validity, enable_ai_predictions, session_timeout

#### 11-18. Additional Tables
- **integration_tokens**: External service credentials
- **student_flags**: At-risk student tracking
- **student_transfers**: Department transfer management
- **privacy_requests**: GDPR compliance requests
- **institution_settings**: Global configuration
- **session_overrides**: Admin session management
- **course_assignments**: Lecturer-course binding
- **backup_jobs**: Database backup tracking

### Deployment

```bash
# Run migration
mysql -u root -p < database/migrations/002_admin_dashboard_schema.sql

# Verify schema version
mysql -u root -p -e "SELECT * FROM schema_versions WHERE version = '002_admin_dashboard';"
```

---

## Services & APIs

### Service: adminService

**Purpose**: Core admin dashboard operations

```javascript
// Overview with totals, today's stats, department data, alerts, trends
const overview = await adminService.getInstitutionOverview(adminId);

// Active broadcasts
const notifications = await adminService.getSystemNotifications(adminId, limit);

// Dashboard counters
const summary = await adminService.getAdminDashboardSummary();

// KPI trends for charts
const trends = await adminService.getKPITrends(startDate, endDate);
```

**Endpoints**:
- `GET /api/admin/overview` - Institution overview
- `GET /api/admin/notifications` - System notifications
- `GET /api/admin/dashboard-summary` - Dashboard summary
- `GET /api/admin/kpi-trends` - KPI trends

---

### Service: departmentService

**Purpose**: Department CRUD and metrics

```javascript
// Get all departments with filters
const departments = await departmentService.getAllDepartments({
  search: 'Engineering',
  is_active: true
});

// Get department details with roster
const dept = await departmentService.getDepartmentDetails(deptId);

// Create new department
const created = await departmentService.createDepartment({
  name: 'Computer Science',
  code: 'CS',
  budget_allocation: 50000
}, adminId);

// Assign HOD
const assigned = await departmentService.assignHOD(deptId, userId, adminId);

// Get metrics for date range
const metrics = await departmentService.getDepartmentMetrics(deptId, startDate, endDate);
```

**Endpoints**:
- `GET /api/admin/departments` - List departments
- `GET /api/admin/departments/:id` - Get department details
- `POST /api/admin/departments` - Create department
- `PATCH /api/admin/departments/:id` - Update department
- `POST /api/admin/departments/:id/assign-hod` - Assign HOD
- `DELETE /api/admin/departments/:id` - Delete department

---

### Service: lecturerManagementService

**Purpose**: Global lecturer operations

```javascript
// Get all lecturers with analytics
const lecturers = await lecturerManagementService.getAllLecturers({
  search: 'Dr. John',
  department_id: 1,
  is_active: true
});

// Get lecturer profile with classes and analytics
const profile = await lecturerManagementService.getLecturerProfile(lecturerId);

// Create lecturer
const created = await lecturerManagementService.createLecturer({
  name: 'Dr. Jane Smith',
  email: 'jane@academix.com',
  password: 'secure123',
  department_id: 1
}, adminId);

// Assign courses
const assigned = await lecturerManagementService.assignCourses(lecturerId, [1, 2, 3], adminId);
```

**Endpoints**:
- `GET /api/admin/lecturers` - List lecturers
- `GET /api/admin/lecturers/:id` - Get lecturer profile
- `POST /api/admin/lecturers` - Create lecturer
- `PATCH /api/admin/lecturers/:id` - Update lecturer
- `POST /api/admin/lecturers/:id/deactivate` - Deactivate lecturer

---

### Service: studentManagementService

**Purpose**: Global student operations

```javascript
// Get all students with flags
const students = await studentManagementService.getAllStudents({
  search: 'John Doe',
  department_id: 1,
  flagged: true
});

// Get student profile with flags and attendance
const profile = await studentManagementService.getStudentProfile(studentId);

// Create student
const created = await studentManagementService.createStudent({
  name: 'John Doe',
  email: 'john@academix.com',
  password: 'secure123',
  department_id: 1
}, adminId);

// Flag student for intervention
const flagged = await studentManagementService.flagStudent(
  studentId, 'low_attendance', 'critical', 'Attendance below 50%', adminId
);

// Transfer student
const transferred = await studentManagementService.transferStudent(
  studentId, newDeptId, 'Major change', adminId
);

// Get at-risk students
const atRisk = await studentManagementService.getAtRiskStudents(deptId, 75);
```

**Endpoints**:
- `GET /api/admin/students` - List students
- `GET /api/admin/students/:id` - Get student profile
- `POST /api/admin/students` - Create student
- `PATCH /api/admin/students/:id` - Update student
- `POST /api/admin/students/:id/flag` - Flag student
- `POST /api/admin/students/:id/transfer` - Transfer student

---

### Service: auditService

**Purpose**: Audit logging and compliance

```javascript
// Get audit logs with advanced filtering
const logs = await auditService.getAuditLogs({
  user_id: adminId,
  action: 'create',
  severity: 'high',
  startDate: '2025-01-01',
  endDate: '2025-01-31'
}, limit=100, offset=0);

// User action history
const history = await auditService.getAuditLogsByUser(userId, startDate, endDate);

// Resource change history
const changeHistory = await auditService.getAuditLogsByResource('department', deptId);

// Compliance report
const report = await auditService.getComplianceReport(startDate, endDate);
// Returns: stats, actionsByType, failedActions, privilegedOperations

// Export audit logs
const csv = await auditService.exportAuditLogs({...filters}, 'csv');

// Delete old logs (retention policy)
const deleted = await auditService.deleteOldLogs(90); // Older than 90 days
```

**Endpoints**:
- `GET /api/admin/audit-logs` - Search audit logs
- `GET /api/admin/compliance-report` - Compliance report
- `GET /api/admin/export-audit-logs` - Export audit logs

---

## Authentication & Authorization

### RBAC Implementation

#### Roles Hierarchy

```
super-admin (highest privileges)
├── Can: Manage all resources, assign roles, override permissions
├── Can: Access all departments/data
└── Can: Manage system configuration, backups, integrations

admin (department or global)
├── Can: Manage lecturers, students, departments (if assigned)
├── Can: View audit logs
└── Can: Create broadcasts, manage exports

system-auditor (read-only)
├── Can: View all audit logs, compliance reports
├── Can: Export audit data
└── Cannot: Modify any data

hod (head of department)
├── Can: View own department data
├── Can: Flag students, view attendance
└── Cannot: Create/modify departments, manage other departments

lecturer (instructor)
├── Can: Manage own sessions
├── Can: Mark attendance
└── Cannot: Access admin functions

student (learner)
├── Can: View own attendance, feedback
└── Cannot: Manage any other users
```

#### Permission Matrix

Pre-loaded permissions in `role_permissions` table:

```
super-admin:
  - admin_users: create, read, update, delete
  - departments: create, read, update, delete
  - lecturers: create, read, update, delete
  - students: create, read, update, delete
  - broadcasts: create, read, update, delete
  - audit_logs: read, export, delete
  - export_jobs: create, read, delete
  - system_config: create, read, update, delete
  - backup_jobs: create, read
  - privacy_requests: read, approve

admin (global or department-scoped):
  - departments: read, update (own dept only)
  - lecturers: create, read, update
  - students: create, read, update
  - student_flags: create, read, update
  - broadcasts: create, read
  - audit_logs: read
  - export_jobs: create, read
  
system-auditor:
  - audit_logs: read, export
  - reports: read

hod (department-scoped):
  - lecturers: read (own dept)
  - students: read, flag (own dept)
  - student_transfers: approve (own dept)
  - audit_logs: read (own dept)

lecturer:
  - own sessions, classes, attendance

student:
  - own attendance, profile
```

### Middleware Usage

```javascript
// Require specific role
router.get('/endpoint', requireRole(['super-admin', 'admin']), handler);

// Require specific permission
router.post('/endpoint', 
  requirePermission('department', 'create'), 
  handler
);

// Department-scoped access (for HOD)
router.get('/endpoint/:departmentId', 
  requireDepartmentAccess, 
  handler
);

// Audit action
router.post('/endpoint',
  auditAction('resource_type', 'action'),
  handler
);
```

### Token Structure (JWT Payload)

```javascript
{
  id: 1,
  email: 'admin@academix.com',
  role: 'admin',
  department_id: 1, // null for global admin
  permissions: ['read', 'create', ...],
  iat: 1234567890,
  exp: 1234571490
}
```

---

## Socket.IO Real-time Events

### Admin Dashboard Events

#### Broadcasting Events (Server → Client)

```javascript
// New broadcast sent
socket.emit('new-broadcast', {
  broadcastId: 1,
  message: 'System maintenance scheduled',
  priority: 'high',
  timestamp: new Date()
});

// Audit log update
socket.emit('audit-update', {
  action: 'create',
  resourceType: 'student',
  severity: 'low',
  timestamp: new Date()
});

// Department updated
socket.emit('department-updated', {
  departmentId: 1,
  departmentName: 'Computer Science',
  timestamp: new Date()
});

// Student flagged
socket.emit('student-flagged', {
  studentId: 5,
  studentName: 'John Doe',
  flagType: 'low_attendance',
  severity: 'critical',
  timestamp: new Date()
});

// Export job progress
socket.emit('export-job-progress', {
  jobId: 'job_123',
  status: 'processing',
  exportType: 'students',
  format: 'csv',
  progress: 45,
  timestamp: new Date()
});

// System alerts
socket.emit('system-alert', {
  alertType: 'database_full',
  severity: 'critical',
  message: 'Database usage at 95%',
  timestamp: new Date()
});
```

#### Client-side Usage

```javascript
// Connect and join admin dashboard
socket.emit('admin-join-dashboard', { adminId: 1 });

// Listen for broadcasts
socket.on('new-broadcast', (data) => {
  console.log('New broadcast:', data.message);
  // Update UI
});

// Listen for audit updates
socket.on('audit-update', (data) => {
  console.log('Action logged:', data.action);
  // Refresh audit logs view
});

// Listen for student flags
socket.on('student-flagged', (data) => {
  console.log(`${data.studentName} flagged`);
  // Show alert or update student list
});
```

---

## Usage Examples

### Creating a Department

```bash
curl -X POST http://localhost:5002/api/admin/departments \
  -H "Authorization: Bearer {JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Computer Science",
    "code": "CS",
    "description": "Department of Computer Science",
    "budget_allocation": 100000,
    "location": "Building A, Floor 2",
    "phone": "+1-800-123-4567",
    "email": "cs@academix.edu",
    "website": "https://cs.academix.edu"
  }'
```

**Response**:
```json
{
  "success": true,
  "data": {
    "departmentId": 1,
    "name": "Computer Science",
    "code": "CS"
  }
}
```

### Assigning HOD

```bash
curl -X POST http://localhost:5002/api/admin/departments/1/assign-hod \
  -H "Authorization: Bearer {JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "hod_user_id": 5
  }'
```

### Flagging an At-Risk Student

```bash
curl -X POST http://localhost:5002/api/admin/students/10/flag \
  -H "Authorization: Bearer {JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "flag_type": "low_attendance",
    "severity": "critical",
    "description": "Student has missed 8 out of 12 sessions"
  }'
```

### Retrieving Audit Logs

```bash
curl -X GET "http://localhost:5002/api/admin/audit-logs?action=create&severity=high&limit=50" \
  -H "Authorization: Bearer {JWT_TOKEN}"
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user_id": 2,
      "actor_role": "admin",
      "action": "create",
      "resource_type": "student",
      "resource_id": 15,
      "resource_name": "John Doe",
      "old_value": null,
      "new_value": {"email": "john@academix.com"},
      "ip_address": "192.168.1.1",
      "severity": "low",
      "status": "success",
      "action_timestamp": "2025-01-10T14:23:45Z"
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0,
    "pages": 3
  }
}
```

---

## Deployment & Testing

### Prerequisites

```bash
# Environment variables (.env)
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=admin123
DB_NAME=academix
NODE_ENV=production
JWT_SECRET=your-secret-key
FRONTEND_URL=http://localhost:3000
PORT=5002
```

### Running Migrations

```bash
# Create backup first
mysqldump -u root -p academix > backup_before_migration.sql

# Run migration
mysql -u root -p academix < database/migrations/002_admin_dashboard_schema.sql

# Verify
mysql -u root -p -e "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA='academix';"
```

### Testing Endpoints

```bash
# Test overview endpoint
curl -X GET http://localhost:5002/api/admin/overview \
  -H "Authorization: Bearer {TOKEN}"

# Test permissions (should fail with 403)
curl -X GET http://localhost:5002/api/admin/overview \
  -H "Authorization: Bearer {STUDENT_TOKEN}"
  # Expected: 403 Forbidden

# Test audit log search
curl -X GET "http://localhost:5002/api/admin/audit-logs?action=create&limit=10" \
  -H "Authorization: Bearer {TOKEN}"
```

### Unit Tests (Example)

```javascript
// tests/adminService.test.js
const adminService = require('../services/adminService');

describe('adminService', () => {
  it('should get institution overview', async () => {
    const result = await adminService.getInstitutionOverview(1);
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('totals');
    expect(result.data).toHaveProperty('today_stats');
    expect(result.data).toHaveProperty('department_overview');
  });

  it('should throw error for invalid admin', async () => {
    await expect(adminService.getInstitutionOverview(99999))
      .rejects.toThrow();
  });
});
```

---

## Future Enhancements

### Phase 2: Advanced Services

1. **analyticsService.js** (4-6 methods)
   - KPI drill-down reports
   - Trend analysis
   - Comparative analytics

2. **reportingService.js** (4-6 methods)
   - Async PDF/Excel generation
   - Scheduled reports
   - Email delivery

3. **broadcastService.js** (3-5 methods)
   - Announcement creation
   - Delivery tracking
   - Read receipt analytics

4. **privacyService.js** (4-6 methods)
   - GDPR data export
   - Secure data deletion
   - Consent management

5. **aiIntegrationService.js** (4-6 methods)
   - Microservice proxy
   - Model training jobs
   - Prediction requests

### Phase 3: Additional Routes

- `/api/admin/reports/*` - Reporting endpoints
- `/api/admin/configuration/*` - System settings
- `/api/admin/privacy/*` - GDPR compliance
- `/api/admin/broadcasts/*` - Announcement management
- `/api/admin/ai/*` - AI job management

### Phase 4: Enhancements

- Dashboard caching (Redis)
- Background job queue (Bull/Agenda)
- Email/SMS integration
- Webhook notifications
- API key management
- Rate limiting per role
- Multi-language support
- Advanced search (Elasticsearch)
- Data visualization exports

---

## Support & Contact

For issues or questions:
- Documentation: See ADMIN_DASHBOARD_API.md
- Implementation: See this file
- Database: See database/migrations/002_admin_dashboard_schema.sql

**Development Team**: Backend Team
**Last Updated**: December 11, 2025
