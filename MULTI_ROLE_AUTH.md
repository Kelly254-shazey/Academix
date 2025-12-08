# Multi-Role Authentication System

## Overview

ClassTrack AI now supports a complete multi-role authentication system with three user roles:
- **Student**: Can attend classes, scan QR codes, view notifications
- **Lecturer**: Can send notifications, manage classes, generate reports
- **Admin**: Can manage all users, view system statistics, configure settings

## Demo Credentials

### Student Account
```
Email: student@university.edu
Password: password123
```
**Features:**
- QR code scanner for attendance
- Attendance history
- Real-time notifications
- Personal dashboard
- Message inbox

### Lecturer Account
```
Email: lecturer@university.edu
Password: password123
```
**Features:**
- Send notifications to students
- Manage courses and sessions
- View class statistics
- Generate attendance reports
- Track student attendance

### Admin Account
```
Email: admin@university.edu
Password: password123
```
**Features:**
- User management (view, edit, delete users)
- System statistics dashboard
- Attendance analytics
- Settings configuration
- System health monitoring

## Login Features

### Quick Login Buttons
The login page includes quick-login buttons for each role. Simply click the "Login as [Role]" button to auto-fill credentials and login.

### Manual Login
1. Enter email and password
2. Click "Sign In"
3. On successful authentication, JWT token is stored in localStorage
4. User is redirected to the dashboard

## Authentication Flow

```
User Login Request
       ↓
Validate Email/Password
       ↓
Hash Check (bcrypt)
       ↓
Generate JWT Token (24h expiry)
       ↓
Store Token in localStorage
       ↓
Redirect to Dashboard
```

## Backend Authentication API

### Login Endpoint
```
POST /auth/login
Content-Type: application/json

{
  "email": "student@university.edu",
  "password": "password123"
}

Response (200):
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "student_001",
    "name": "John Student",
    "email": "student@university.edu",
    "role": "student",
    "avatar": "👨‍🎓",
    "studentId": "CS2024001",
    "department": "Computer Science",
    "enrolledCourses": ["CS101", "MATH201", "ENG102"]
  }
}
```

### Register Endpoint
```
POST /auth/register
Content-Type: application/json

{
  "email": "newuser@university.edu",
  "password": "securepassword123",
  "name": "New User",
  "role": "student",
  "department": "Computer Science"
}

Response (201):
{
  "success": true,
  "message": "Registration successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

### Verify Token Endpoint
```
GET /auth/verify
Headers: Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "user": { ... }
}
```

### Get Demo Users (Admin only)
```
GET /auth/demo-users

Response:
{
  "success": true,
  "users": [
    { "email": "student@university.edu", "role": "student", "name": "John Student" },
    { "email": "lecturer@university.edu", "role": "lecturer", "name": "Dr. Smith" },
    { "email": "admin@university.edu", "role": "admin", "name": "Admin User" }
  ]
}
```

## Frontend Integration

### useAuth Hook
```javascript
import { useAuth } from '../context/AuthContext';

function MyComponent() {
  const { user, login, logout, signup, token } = useAuth();

  // user object:
  // {
  //   id, name, email, role, avatar, 
  //   studentId/employeeId, department, 
  //   enrolledCourses/courses, permissions
  // }

  return <div>{user?.name}</div>;
}
```

### Login Programmatically
```javascript
const { login } = useAuth();

const handleLogin = async () => {
  const response = await fetch('http://localhost:5000/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'student@university.edu',
      password: 'password123'
    })
  });

  const data = await response.json();
  localStorage.setItem('token', data.token);
  login(data.user);
};
```

### Protected Routes
```javascript
<Route
  path="/admin"
  element={
    <ProtectedRoute>
      <AdminDashboard />
    </ProtectedRoute>
  }
/>
```

## Role-Based UI

The application automatically adjusts UI based on user role:

### Student View
- QR Scanner menu item
- Attendance history
- Notifications center (receives notifications)
- Personal dashboard
- Messages

### Lecturer View
- QR Scanner disabled
- Notify Students portal (send notifications)
- Class management
- Attendance reports
- Student list

### Admin View
- Admin Panel menu item
- User management dashboard
- System statistics
- System settings
- Health monitoring

## Security Features

✅ **Password Hashing**: bcryptjs with salt rounds
✅ **JWT Tokens**: 24-hour expiration
✅ **Role-Based Access**: Protected routes check user role
✅ **Token Storage**: localStorage with automatic cleanup on logout
✅ **CORS**: Enabled for local development (configure for production)
✅ **Input Validation**: Email and password validation on both frontend and backend

## Token Management

### Token Storage
```javascript
localStorage.setItem('token', data.token);
```

### Token Usage in API Calls
```javascript
fetch('http://localhost:5000/protected-endpoint', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
});
```

### Token Verification
```javascript
const { verifyToken } = useAuth();
const isValid = await verifyToken(); // true or false
```

### Automatic Logout on Invalid Token
If token is invalid or expired, user is automatically logged out and redirected to login page.

## User Data Structure

### Student User
```javascript
{
  id: "student_001",
  name: "John Student",
  email: "student@university.edu",
  password: "hashed_password",
  role: "student",
  avatar: "👨‍🎓",
  studentId: "CS2024001",
  department: "Computer Science",
  enrolledCourses: ["CS101", "MATH201", "ENG102"]
}
```

### Lecturer User
```javascript
{
  id: "lecturer_001",
  name: "Dr. Smith",
  email: "lecturer@university.edu",
  password: "hashed_password",
  role: "lecturer",
  avatar: "👨‍🏫",
  employeeId: "PROF001",
  department: "Computer Science",
  courses: ["CS101", "CS201"]
}
```

### Admin User
```javascript
{
  id: "admin_001",
  name: "Admin User",
  email: "admin@university.edu",
  password: "hashed_password",
  role: "admin",
  avatar: "👨‍💼",
  department: "Administration",
  permissions: ["all"]
}
```

## Admin Dashboard Features

### Overview Tab
- System status (Online/Offline)
- Database status
- WebSocket connection status
- API health check
- List of enabled features

### Users Tab
- List all system users
- View user details (name, email, role)
- Edit user information (future)
- Delete user account (future)
- Create new user (future)

### Settings Tab
- System configuration
- Database settings
- Port configuration
- JWT settings
- Save/Update settings

## Future Enhancements

- [ ] Email verification on signup
- [ ] Password reset functionality
- [ ] Two-factor authentication
- [ ] Social login (Google, Microsoft)
- [ ] User profile customization
- [ ] Role-based permissions system
- [ ] Session management
- [ ] Login activity tracking
- [ ] Account lockout after failed attempts
- [ ] PostgreSQL integration for persistent storage

## Testing the Multi-Role System

### Test 1: Login as Student
1. Click "Login as Student" button
2. You should see student dashboard
3. Navbar shows: Dashboard, QR Scanner, Attendance, Messages, Notifications
4. Click on "Notifications" to see student notification center

### Test 2: Login as Lecturer
1. Go to http://localhost:3000/login
2. Click "Login as Lecturer" button
3. You should see lecturer dashboard
4. Navbar shows: Dashboard, QR Scanner, Attendance, Messages, Notify Students
5. Click on "Notify Students" to send notifications

### Test 3: Login as Admin
1. Go to http://localhost:3000/login
2. Click "Login as Admin" button
3. You should see admin dashboard
4. Navbar shows: Dashboard, QR Scanner, Attendance, Messages, Admin Panel
5. Click on "Admin Panel" to access system administration

### Test 4: Multi-Tab Synchronization
1. Open application in two different browser tabs
2. Login as Student in Tab 1
3. Login as Lecturer in Tab 2
4. Both tabs should work independently with their respective roles
5. Real-time notifications should sync across tabs

## API Integration

### Backend URL
```
http://localhost:5000
```

### Authentication Headers
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

### Error Handling
```javascript
try {
  const response = await fetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    const error = await response.json();
    console.error(error.message);
  }
} catch (error) {
  console.error('Network error:', error);
}
```

## Troubleshooting

### Issue: "Invalid email or password"
- Verify you're using correct credentials
- Check email is in lowercase
- Ensure password is exactly "password123"

### Issue: "Failed to connect to server"
- Check backend is running on http://localhost:5000
- Verify no firewall is blocking port 5000
- Check CORS settings in backend/server.js

### Issue: "Token expired"
- Login again to get new token
- Token expires after 24 hours
- Automatic logout will occur on expiration

### Issue: "Admin panel not accessible"
- Verify you're logged in as admin
- Check user role is set to "admin"
- Verify protected route is properly configured

## Production Deployment Checklist

- [ ] Change JWT_SECRET to strong random string
- [ ] Replace in-memory database with PostgreSQL
- [ ] Enable HTTPS for all API calls
- [ ] Configure CORS for production domain
- [ ] Set up email verification
- [ ] Implement rate limiting on auth endpoints
- [ ] Add audit logging for admin actions
- [ ] Set up automated backups
- [ ] Configure environment variables for production
- [ ] Test multi-role functionality in production environment

---

**Version**: 1.0.0
**Last Updated**: December 6, 2025
**Backend**: Node.js + Express + JWT
**Frontend**: React + React Router + Context API
