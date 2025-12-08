# 🎓 Attendance System - Frontend README

## Overview

React-based frontend for the Real-Time Attendance Management System. Provides role-based dashboards for Students, Lecturers, and Admins with real-time WebSocket integration.

## 🏗️ Architecture

### Context Providers
1. **AuthContext** - User authentication and JWT token management
2. **NotificationContext** - Socket.IO connection and real-time events

### Custom Hooks
- **useClasses()** - Class management API calls
- **useAttendance()** - Attendance marking and retrieval
- **useAnalytics()** - Analytics and reporting

### Components
- **ProtectedRoute** - Route guard for authenticated users
- **Navbar** - Navigation with user menu and notifications

### Pages
- **Login** - User authentication
- **StudentDashboard** - View classes, attendance, notifications
- **LecturerDashboard** - Mark attendance, view analytics
- **AdminDashboard** - Platform-wide statistics

## 🚀 Getting Started

### Installation
```bash
npm install
```

### Environment Configuration
```bash
# .env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

### Start Development Server
```bash
npm start
```

## 📱 Features

### Student Dashboard
- View enrolled classes
- Check attendance records
- View real-time notifications
- Download attendance reports

### Lecturer Dashboard
- View all classes
- Mark student attendance
- View class statistics
- Access attendance analytics

### Admin Dashboard
- Platform overview statistics
- User management
- System monitoring
- Report generation

## 🔌 Real-Time Integration

### Socket.IO Events
```javascript
// Connect to WebSocket
socket.emit('user:join', userId);
socket.emit('class:join', classId);

// Listen for updates
socket.on('notification:received', (data) => {});
socket.on('attendance:updated', (data) => {});
socket.on('class:cancelled', (data) => {});
```

## 📚 API Integration

All API calls are handled through custom hooks:
```javascript
const { classes, getStudentClasses } = useClasses();
const { markAttendance } = useAttendance();
const { report, getStudentReport } = useAnalytics();
```

## 🎨 Styling

- **Mobile-First Design** - Works on all screen sizes
- **Responsive Breakpoints** - 320px, 768px, 1200px+
- **CSS Variables** - Easy theme customization
- **Gradient Backgrounds** - Modern UI design

## 🧪 Local Testing

1. **Login**: Use demo credentials
2. **Real-Time**: Open two browser windows to test notifications
3. **Responsive**: Use DevTools to test mobile layout
4. **WebSocket**: Check Network tab in DevTools for Socket.IO connections

## 📦 Dependencies

- react@18.2.0
- react-router-dom@6.8.0
- axios@1.3.2
- socket.io-client@4.5.4
- date-fns@2.29.3

---

See main README.md for full documentation.
