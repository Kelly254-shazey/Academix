# Admin Dashboard Quick Start Guide

**Version**: 1.0.0
**Last Updated**: December 11, 2025

---

## 🚀 Quick Setup (5 Minutes)

### Step 1: Deploy Database Migration

```bash
# Navigate to project root
cd c:\Users\w\Academix

# Run the migration
mysql -u root -p academix < database/migrations/002_admin_dashboard_schema.sql

# Verify installation
mysql -u root -p -e "SELECT * FROM role_permissions LIMIT 1;"
```

✅ You should see pre-loaded permissions

### Step 2: Start Backend Server

```bash
# Navigate to backend
cd backend

# Install dependencies (if not already done)
npm install

# Start server
npm start
# or: node server.js
```

✅ Server should start on port 5002 (check console for "Server running on port 5002")

### Step 3: Test Basic Endpoint

```bash
# Get institution overview
curl -X GET http://localhost:5002/api/admin/overview \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

✅ Should return dashboard data

---

## 🔐 Authentication Setup

### 1. Create Admin User

First, create an admin account via existing auth endpoint:

```bash
curl -X POST http://localhost:5002/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Super Admin",
    "email": "admin@academix.com",
    "password": "Admin@123456",
    "role": "super-admin"
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": 1,
      "email": "admin@academix.com",
      "role": "super-admin"
    }
  }
}
```

### 2. Store Token

Save the JWT token. Use it for all admin endpoints:

```bash
export ADMIN_TOKEN="eyJhbGciOiJIUzI1NiIs..."
```

### 3. Verify Authentication

```bash
curl -X GET http://localhost:5002/api/admin/dashboard-summary \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## 📊 Common Tasks

### Create a Department

```bash
curl -X POST http://localhost:5002/api/admin/departments \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Computer Science",
    "code": "CS",
    "description": "Department of Computer Science",
    "budget_allocation": 100000,
    "location": "Building A, Floor 2"
  }'
```

### List All Departments

```bash
curl -X GET http://localhost:5002/api/admin/departments \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Create a Lecturer

```bash
curl -X POST http://localhost:5002/api/admin/lecturers \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dr. John Smith",
    "email": "john@academix.com",
    "password": "Lecturer@123",
    "phone": "+1-800-111-2222",
    "department_id": 1
  }'
```

### Create a Student

```bash
curl -X POST http://localhost:5002/api/admin/students \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@academix.com",
    "password": "Student@123",
    "phone": "+1-800-333-4444",
    "department_id": 1
  }'
```

### Flag a Student for Intervention

```bash
curl -X POST http://localhost:5002/api/admin/students/5/flag \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "flag_type": "low_attendance",
    "severity": "critical",
    "description": "Student has missed 8 out of 12 sessions"
  }'
```

### Get At-Risk Students

```bash
curl -X GET http://localhost:5002/api/admin/students?flagged=true \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### View Audit Logs

```bash
curl -X GET "http://localhost:5002/api/admin/audit-logs?action=create&severity=high&limit=50" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Generate Compliance Report

```bash
curl -X GET "http://localhost:5002/api/admin/compliance-report?startDate=2025-01-01&endDate=2025-01-31" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Export Audit Logs

```bash
# As JSON
curl -X GET "http://localhost:5002/api/admin/export-audit-logs?format=json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" > audit_logs.json

# As CSV
curl -X GET "http://localhost:5002/api/admin/export-audit-logs?format=csv" \
  -H "Authorization: Bearer $ADMIN_TOKEN" > audit_logs.csv
```

---

## 🔄 Real-time Events (Socket.IO)

### Connect to Dashboard

```javascript
// Frontend code
const socket = io('http://localhost:5002', {
  auth: {
    token: localStorage.getItem('authToken')
  }
});

// Join admin dashboard
socket.emit('admin-join-dashboard', { adminId: 1 });

// Listen for broadcasts
socket.on('new-broadcast', (data) => {
  console.log('New broadcast:', data.message);
  // Update UI
});

// Listen for audit updates
socket.on('audit-update', (data) => {
  console.log('Action logged:', data.action);
});

// Listen for student flags
socket.on('student-flagged', (data) => {
  console.log(`${data.studentName} flagged as ${data.flagType}`);
});

// Listen for export job progress
socket.on('export-job-progress', (data) => {
  console.log(`Export job ${data.jobId}: ${data.progress}%`);
});

// Listen for system alerts
socket.on('system-alert', (data) => {
  console.log(`System alert: ${data.message} (${data.severity})`);
});
```

---

## 📝 Validation Rules

### Department Creation
- **name**: Required, 3-100 chars
- **code**: Required, 2-10 chars (uppercase)
- **description**: Optional, max 500 chars
- **budget_allocation**: Optional, positive number
- **location**: Optional, max 200 chars
- **email**: Optional, valid email format
- **phone**: Optional, valid phone format

### Lecturer Creation
- **name**: Required, 3-100 chars
- **email**: Required, unique email
- **password**: Required, min 8 chars
- **phone**: Optional, valid phone format
- **department_id**: Required, must exist

### Student Flag
- **flag_type**: Required, one of: `low_attendance`, `poor_performance`, `behavioral`, `financial`, `medical`, `other`
- **severity**: Required, one of: `warning`, `critical`
- **description**: Required, max 500 chars

---

## 🛡️ Role-Based Access

### Super-Admin
```
Can access ALL endpoints and manage everything including:
- Create/delete admin users
- Manage all departments (any department)
- Manage all lecturers and students
- View all audit logs
- Configure system settings
```

### Admin
```
Can manage:
- Lecturers and students (in their department or globally if no department assigned)
- View audit logs
- Create broadcasts
- Create export jobs
Cannot:
- Delete departments
- Manage other admins
- Access system configuration
```

### System-Auditor
```
Can view:
- All audit logs
- Compliance reports
- Export audit data
Cannot:
- Modify any data
- Create users or departments
```

### HOD (Head of Department)
```
Can manage:
- Lecturers in their department
- Students in their department
- Flag students
Cannot:
- Access other departments
- Manage system settings
```

---

## 🐛 Troubleshooting

### "Authentication required" Error

✅ Solution: Make sure to include the JWT token in header:
```bash
-H "Authorization: Bearer YOUR_TOKEN"
```

### "Access denied" Error

✅ Solution: Check your user role has permission. Super-admin has all permissions:
```bash
# Login as super-admin
curl -X POST http://localhost:5002/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@academix.com",
    "password": "Admin@123456"
  }'
```

### Database Connection Error

✅ Solution: Verify database is running and migration was applied:
```bash
# Check if academix database exists
mysql -u root -p -e "SHOW DATABASES;"

# Check if admin tables exist
mysql -u root -p academix -e "SHOW TABLES LIKE 'admin%';"
```

### "Department not found" Error

✅ Solution: Create a department first:
```bash
curl -X POST http://localhost:5002/api/admin/departments \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Department",
    "code": "TEST"
  }'
```

---

## 📈 Performance Tips

### 1. Use Pagination

```bash
# Fetch students in batches
curl -X GET "http://localhost:5002/api/admin/students?limit=50&offset=0" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

curl -X GET "http://localhost:5002/api/admin/students?limit=50&offset=50" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### 2. Filter Results

```bash
# Instead of fetching all, filter by department
curl -X GET "http://localhost:5002/api/admin/lecturers?department_id=1" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### 3. Use Date Ranges for Audit

```bash
# Instead of all logs, filter by date
curl -X GET "http://localhost:5002/api/admin/audit-logs?startDate=2025-01-10&endDate=2025-01-11" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## 🔄 API Integration Checklist

- [ ] Database migration deployed (`002_admin_dashboard_schema.sql`)
- [ ] Admin user created with super-admin role
- [ ] JWT token obtained and working
- [ ] Dashboard overview endpoint tested
- [ ] Department CRUD endpoints tested
- [ ] Lecturer management endpoints tested
- [ ] Student management endpoints tested
- [ ] Audit log endpoints tested
- [ ] Socket.IO connection established
- [ ] Error handling implemented in frontend

---

## 📚 Next Steps

1. **Read Full Documentation**: See `ADMIN_DASHBOARD_IMPLEMENTATION.md`
2. **API Reference**: See `ADMIN_DASHBOARD_API.md`
3. **Advanced Features**: Implement analytics, reports, and AI integration services
4. **Frontend**: Build React dashboard component with this backend

---

## 📞 Support

For detailed information:
- Implementation Guide: [ADMIN_DASHBOARD_BACKEND_IMPLEMENTATION.md](./ADMIN_DASHBOARD_BACKEND_IMPLEMENTATION.md)
- API Reference: [ADMIN_DASHBOARD_API.md](./ADMIN_DASHBOARD_API.md)
- Database Schema: [database/migrations/002_admin_dashboard_schema.sql](./database/migrations/002_admin_dashboard_schema.sql)

---

**Happy Administering! 🎉**
