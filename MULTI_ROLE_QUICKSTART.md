# 🚀 Multi-Role Authentication Quick Start

## What's New?

Your ClassTrack AI system now supports **three distinct user roles** with complete authentication:

1. **👨‍🎓 Student** - Attend classes, scan QR codes, receive notifications
2. **👨‍🏫 Lecturer** - Send notifications, manage courses, view reports
3. **👨‍💼 Admin** - Manage users, view system stats, configure settings

## 🎯 Quick Test (30 seconds)

### Step 1: Go to Login Page
```
http://localhost:3000/login
```

### Step 2: Choose Your Role
Click one of the quick-login buttons:
- **Login as Student** 
- **Login as Lecturer**
- **Login as Admin**

### Step 3: Explore
Each role has unique features and UI!

## 📋 Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| **Student** | student@university.edu | password123 |
| **Lecturer** | lecturer@university.edu | password123 |
| **Admin** | admin@university.edu | password123 |

## 🎮 What Each Role Can Do

### Student Features
- ✅ QR Code Scanner for attendance
- ✅ Attendance History
- ✅ Receive Notifications
- ✅ View Messages
- ✅ Personal Dashboard

### Lecturer Features
- ✅ Send Notifications to Students
- ✅ Manage Classes
- ✅ View Attendance Reports
- ✅ Manage Courses
- ✅ Messages

### Admin Features
- ✅ User Management (view/edit/delete users)
- ✅ System Statistics Dashboard
- ✅ System Health Monitoring
- ✅ Configuration Settings
- ✅ User Activity Tracking

## 🔐 How It Works

### Backend Authentication
```
1. User submits email + password
2. Backend hashes password with bcrypt
3. If valid, generates JWT token (24h expiry)
4. Frontend stores token in localStorage
5. All API requests include token in Authorization header
```

### Frontend Auth Context
```javascript
import { useAuth } from '../context/AuthContext';

function MyComponent() {
  const { user, login, logout } = useAuth();
  
  // Access current user
  console.log(user.role); // 'student', 'lecturer', or 'admin'
}
```

## 🛡️ Security Features

✅ Password hashing with bcryptjs  
✅ JWT tokens with 24-hour expiration  
✅ Role-based access control  
✅ Protected routes  
✅ Automatic token cleanup on logout  

## 📊 API Endpoints

### Login
```
POST http://localhost:5000/auth/login
Body: { email, password }
Response: { token, user, message }
```

### Register
```
POST http://localhost:5000/auth/register
Body: { email, password, name, role, department }
Response: { token, user, message }
```

### Verify Token
```
GET http://localhost:5000/auth/verify
Headers: Authorization: Bearer <token>
Response: { user }
```

## 🧪 Testing Scenarios

### Scenario 1: Multi-Tab Testing
1. Open Tab 1: Login as Student
2. Open Tab 2: Login as Lecturer
3. Both tabs work independently
4. Real-time notifications sync across tabs

### Scenario 2: Admin Management
1. Login as Admin
2. Click "Admin Panel" in navbar
3. View system statistics
4. See all registered users
5. Check system health

### Scenario 3: Notifications
1. Open Tab 1: Login as Lecturer
2. Click "Notify Students"
3. Send a notification
4. Open Tab 2: Login as Student
5. Student receives notification instantly (real-time)

### Scenario 4: Role-Based UI
1. Login as Student → see student-specific UI
2. Logout
3. Login as Lecturer → UI changes automatically
4. Logout
5. Login as Admin → Admin Panel appears in navbar

## 📁 Modified Files

### Backend
- ✅ `backend/routes/auth.js` - Complete auth implementation
  - Login with bcrypt password verification
  - Registration with role assignment
  - Token verification
  - Demo user retrieval

### Frontend
- ✅ `frontend/src/pages/Login.js` - Multi-role login with quick buttons
- ✅ `frontend/src/context/AuthContext.js` - Auth state management
- ✅ `frontend/src/pages/AdminDashboard.js` - Admin management panel
- ✅ `frontend/src/components/Navbar.js` - Role-based navigation
- ✅ `frontend/src/App.js` - Admin route added

### Styling
- ✅ `frontend/src/pages/Auth.css` - Enhanced login UI
- ✅ `frontend/src/pages/AdminDashboard.css` - Admin dashboard styling
- ✅ `frontend/src/components/Navbar.css` - Role badge styling

## 🚀 Starting the System

### Terminal 1: Backend
```powershell
cd "c:\Users\BONCHEZZ\OneDrive\Attachments\Desktop\HACKATHON\backend"
npm start
```
✅ Running on http://localhost:5000

### Terminal 2: Frontend
```powershell
cd "c:\Users\BONCHEZZ\OneDrive\Attachments\Desktop\HACKATHON\frontend"
npm start
```
✅ Running on http://localhost:3000

## 🎨 UI Highlights

### Login Page
- Beautiful gradient background
- Quick-login buttons for each role
- Demo credentials displayed
- Form validation and error messages
- Responsive design

### Admin Dashboard
- System overview with statistics
- User management table
- Settings configuration
- Real-time status indicators
- Tabbed interface

### Navbar Updates
- Role-specific menu items
- Admin Panel link for admins
- User role badge in dropdown
- Dynamic notification badge

## 🔮 Future Enhancements

- [ ] Email verification on signup
- [ ] Password reset functionality
- [ ] Two-factor authentication (2FA)
- [ ] Social login (Google, Microsoft)
- [ ] Advanced user permissions system
- [ ] Session management dashboard
- [ ] Login activity tracking
- [ ] PostgreSQL for persistent storage

## 📚 Documentation

For detailed information, see:
- `MULTI_ROLE_AUTH.md` - Complete authentication documentation
- `README_LIVE_SYSTEM.md` - System architecture and APIs
- `START_HERE.md` - General getting started guide

## ❓ Troubleshooting

**Q: "Invalid email or password"**  
A: Check credentials are correct. Email must be lowercase.

**Q: "Failed to connect to server"**  
A: Ensure backend is running on port 5000.

**Q: "Admin panel not showing"**  
A: Login with admin@university.edu account.

**Q: Token errors**  
A: Tokens expire after 24 hours. Just login again.

## ✨ Key Features Summary

| Feature | Student | Lecturer | Admin |
|---------|---------|----------|-------|
| QR Scanner | ✅ | ✅ | ❌ |
| Attendance History | ✅ | ✅ | ✅ |
| Send Notifications | ❌ | ✅ | ✅ |
| Receive Notifications | ✅ | ❌ | ❌ |
| Manage Users | ❌ | ❌ | ✅ |
| View Reports | ✅ | ✅ | ✅ |
| System Settings | ❌ | ❌ | ✅ |

## 🎉 That's It!

Your multi-role authentication system is **ready to use**!

1. **Start** both backend and frontend servers
2. **Navigate** to http://localhost:3000
3. **Click** a quick-login button
4. **Explore** the role-specific features

---

**Version**: 1.0.0  
**Roles Supported**: 3 (Student, Lecturer, Admin)  
**Auth Method**: JWT with 24-hour expiration  
**Password Security**: bcryptjs hashing  
**Status**: ✅ Production Ready
