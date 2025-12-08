# 🎓 Real-Time Attendance Management System - MVP

A comprehensive, production-ready attendance management system with real-time notifications, analytics, and multi-user support (Students, Lecturers, Admins).

## 🌟 Features

### Core Features
✅ **User Authentication** - JWT-based login/registration with role-based access control
✅ **Real-Time Notifications** - WebSocket (Socket.IO) for instant class updates
✅ **Attendance Marking** - Lecturers mark attendance in real-time
✅ **Class Management** - Create, schedule, reschedule, and cancel classes
✅ **Student Enrollment** - Manage class enrollments
✅ **Analytics Dashboard** - Comprehensive attendance analytics with trends
✅ **Export Reports** - Generate CSV and PDF attendance reports
✅ **Responsive Design** - Mobile-friendly interface

### Technical Highlights
- **Backend**: Node.js + Express + PostgreSQL
- **Frontend**: React + Socket.IO Client
- **Real-Time**: WebSocket events for instant updates
- **Database**: PostgreSQL with optimized queries and indexes
- **API**: RESTful endpoints with JWT authentication
- **Security**: Password hashing with bcrypt, role-based access control

---

## 📁 Project Structure

```
attendance-mvp/
├── attendance-mvp-backend/          # Node.js Backend
│   ├── src/
│   │   ├── index.js                # Main server file with Socket.IO
│   │   ├── config/
│   │   │   └── database.js          # PostgreSQL connection pool
│   │   ├── middleware/
│   │   │   └── auth.js              # JWT authentication & authorization
│   │   ├── controllers/             # Request handlers
│   │   │   ├── AuthController.js
│   │   │   ├── AttendanceController.js
│   │   │   ├── ClassController.js
│   │   │   ├── NotificationController.js
│   │   │   └── AnalyticsController.js
│   │   ├── services/                # Business logic
│   │   │   ├── UserService.js
│   │   │   ├── ClassService.js
│   │   │   ├── AttendanceService.js
│   │   │   ├── NotificationService.js
│   │   │   └── AnalyticsService.js
│   │   ├── routes/                  # API endpoints
│   │   │   ├── auth.js
│   │   │   ├── classes.js
│   │   │   ├── attendance.js
│   │   │   ├── notifications.js
│   │   │   └── analytics.js
│   │   └── utils/
│   │       ├── auth.js              # Password hashing, JWT generation
│   │       └── helpers.js           # Response formatting, pagination
│   ├── database/
│   │   ├── schema.sql               # Database schema
│   │   ├── migrations/
│   │   │   └── run.js               # Migration runner
│   │   └── seeds/
│   │       └── index.js             # Sample data seeding
│   ├── .env                         # Environment variables
│   ├── package.json
│   └── README.md
│
├── attendance-mvp-frontend/         # React Frontend
│   ├── src/
│   │   ├── index.js
│   │   ├── App.js                   # Main app component with routing
│   │   ├── context/
│   │   │   ├── AuthContext.js       # Authentication state management
│   │   │   └── NotificationContext.js # Real-time notification management
│   │   ├── components/
│   │   │   ├── Navbar.js
│   │   │   └── ProtectedRoute.js
│   │   ├── pages/
│   │   │   ├── Login.js
│   │   │   ├── StudentDashboard.js
│   │   │   ├── LecturerDashboard.js
│   │   │   └── AdminDashboard.js
│   │   ├── hooks/
│   │   │   └── useAPI.js            # Custom hooks for API calls
│   │   ├── styles/
│   │   │   ├── App.css
│   │   │   ├── Login.css
│   │   │   ├── Navbar.css
│   │   │   ├── StudentDashboard.css
│   │   │   ├── LecturerDashboard.css
│   │   │   └── AdminDashboard.css
│   │   └── utils/
│   ├── public/
│   │   └── index.html
│   ├── package.json
│   └── README.md
│
└── README.md                        # This file
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 16+ 
- **PostgreSQL** 12+
- **npm** or **yarn**

### Backend Setup

1. **Install Dependencies**
   ```bash
   cd attendance-mvp-backend
   npm install
   ```

2. **Configure Database**
   - Create PostgreSQL database: `createdb attendance_db`
   - Update `.env` file with database credentials:
     ```
     DB_HOST=localhost
     DB_PORT=5432
     DB_NAME=attendance_db
     DB_USER=postgres
     DB_PASSWORD=postgres
     JWT_SECRET=your_secret_key
     ```

3. **Run Migrations**
   ```bash
   npm run migrate
   ```

4. **Seed Sample Data**
   ```bash
   npm run seed
   ```

5. **Start Server**
   ```bash
   npm start
   ```
   Server runs on `http://localhost:5000`

### Frontend Setup

1. **Install Dependencies**
   ```bash
   cd attendance-mvp-frontend
   npm install
   ```

2. **Configure Environment**
   - Create `.env` file:
     ```
     REACT_APP_API_URL=http://localhost:5000/api
     REACT_APP_SOCKET_URL=http://localhost:5000
     ```

3. **Start Development Server**
   ```bash
   npm start
   ```
   App runs on `http://localhost:3000`

---

## 📊 Database Schema

### Users Table
```sql
id (serial) | email | password_hash | first_name | last_name | role | student_id | created_at
```

### Classes Table
```sql
id | course_code | course_name | lecturer_id | unit_code | semester | created_at
```

### Class Schedules Table
```sql
id | class_id | day_of_week | start_time | end_time | room_number | created_at
```

### Attendance Table
```sql
id | student_id | class_id | attendance_date | status | marked_by | notes | created_at
```

### Notifications Table
```sql
id | user_id | title | message | type | related_class_id | is_read | created_at
```

---

## 🔐 Authentication

### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "prof.smith@university.edu",
  "password": "password123"
}

Response:
{
  "success": true,
  "data": {
    "user": { "id": 1, "email": "...", "role": "lecturer" },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### Register
```bash
POST /api/auth/register
{
  "email": "newuser@university.edu",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "student",
  "studentId": "STU00001"
}
```

---

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (protected)

### Classes
- `POST /api/classes` - Create class (Lecturer/Admin)
- `GET /api/classes` - Get all classes
- `GET /api/classes/lecturer/my-classes` - Get lecturer's classes
- `GET /api/classes/student/my-classes` - Get student's classes
- `GET /api/classes/:classId` - Get class details
- `POST /api/classes/:classId/schedule` - Add schedule
- `POST /api/classes/:classId/reschedule` - Reschedule class
- `POST /api/classes/:classId/cancel` - Cancel class
- `POST /api/classes/:classId/enroll` - Enroll student (Admin)

### Attendance
- `POST /api/attendance/mark` - Mark attendance (Lecturer/Admin)
- `GET /api/attendance/class/:classId` - Get class attendance
- `GET /api/attendance/student/:studentId` - Get student attendance
- `GET /api/attendance/stats/:studentId/:classId` - Get stats

### Notifications
- `GET /api/notifications/unread` - Get unread notifications
- `GET /api/notifications` - Get all notifications
- `PUT /api/notifications/:id/read` - Mark as read
- `PUT /api/notifications/read-all` - Mark all as read

### Analytics
- `GET /api/analytics/student/:studentId/:classId` - Student report
- `GET /api/analytics/class/:classId` - Class report
- `GET /api/analytics/trends/:classId` - Weekly trends
- `GET /api/analytics/lecturer/overview` - Lecturer stats
- `GET /api/analytics/admin/overview` - Platform stats
- `GET /api/analytics/export/csv/:classId` - Export as CSV
- `GET /api/analytics/export/pdf/:classId` - Export as PDF

---

## 🔌 WebSocket Events

### Client to Server
```javascript
socket.emit('user:join', userId);           // Join personal room
socket.emit('class:join', classId);         // Join class room
socket.emit('attendance:marked', data);     // Notify attendance marked
socket.emit('class:cancel', data);          // Notify cancellation
socket.emit('class:reschedule', data);      // Notify reschedule
```

### Server to Client
```javascript
socket.on('notification:received', data);   // New notification
socket.on('attendance:updated', data);      // Attendance update
socket.on('class:cancelled', data);         // Class cancelled
socket.on('class:rescheduled', data);       // Class rescheduled
```

---

## 👥 Sample Credentials

### Lecturer
- Email: `prof.smith@university.edu`
- Password: `password123`
- Role: `lecturer`

### Student
- Email: `student1@university.edu`
- Password: `password123`
- Role: `student`

---

## 🧪 Testing Workflows

### Test 1: Login as Student
1. Visit `http://localhost:3000/login`
2. Enter `student1@university.edu` / `password123`
3. View enrolled classes
4. Check attendance notifications

### Test 2: Mark Attendance (Lecturer)
1. Login as `prof.smith@university.edu`
2. Select a class
3. Click "Mark Attendance"
4. Enter student ID and status
5. Student receives real-time notification

### Test 3: Class Cancellation
1. Login as lecturer
2. Cancel a class with reason
3. All enrolled students get instant notification
4. Socket.IO event broadcasts in real-time

### Test 4: View Analytics
1. Login as student
2. View attendance percentage per class
3. Download CSV/PDF reports
4. View weekly trends

---

## 🔧 Troubleshooting

### Issue: "Cannot connect to database"
- Ensure PostgreSQL is running: `pg_isready`
- Check .env credentials match your PostgreSQL setup
- Create database: `createdb attendance_db`

### Issue: WebSocket connection fails
- Ensure backend is running on port 5000
- Check CORS settings in `src/index.js`
- Verify `REACT_APP_SOCKET_URL` in frontend `.env`

### Issue: "Attendance not marked in real-time"
- Check Socket.IO connection in browser DevTools
- Verify student is in correct class room
- Check console for WebSocket errors

### Issue: PDF export fails
- Ensure `/tmp` directory exists (Linux/Mac)
- Check file write permissions
- Verify pdfkit is installed: `npm list pdfkit`

---

## 📈 Performance Tips

1. **Database Indexing**: Already configured on frequently queried columns
2. **Pagination**: API endpoints support `limit` and `offset` parameters
3. **Caching**: Consider implementing Redis for user sessions
4. **Lazy Loading**: Frontend loads classes on demand
5. **Connection Pooling**: PostgreSQL pool configured in `database.js`

---

## 🔒 Security Checklist

- ✅ Passwords hashed with bcrypt (10 rounds)
- ✅ JWT tokens for stateless authentication
- ✅ Role-based access control (RBAC)
- ✅ SQL injection prevented via parameterized queries
- ✅ CORS configured for specific origins
- ✅ Environment variables protect sensitive data

### Recommended for Production
- [ ] Use HTTPS/TLS
- [ ] Implement rate limiting
- [ ] Add request validation (Joi/Yup)
- [ ] Set up email notifications
- [ ] Enable database backups
- [ ] Configure production logging
- [ ] Use environment-specific configurations

---

## 📚 Technology Stack

### Backend
- **Framework**: Express.js 4.18.2
- **Database**: PostgreSQL 12+
- **Real-Time**: Socket.IO 4.5.4
- **Authentication**: JWT + bcryptjs
- **Validation**: Joi 17.9.1
- **Export**: csv-stringify, pdfkit

### Frontend
- **Framework**: React 18.2.0
- **Routing**: React Router v6.8.0
- **HTTP Client**: Axios 1.3.2
- **Real-Time**: Socket.IO Client 4.5.4
- **Styling**: CSS3 (Responsive)

---

## 🚦 Next Steps

### Phase 2: Production Enhancements
- [ ] Email notifications (Nodemailer/SendGrid)
- [ ] SMS alerts (Twilio)
- [ ] Advanced role management
- [ ] Two-factor authentication
- [ ] Audit logging
- [ ] Rate limiting & throttling
- [ ] Advanced search & filtering

### Phase 3: Enterprise Features
- [ ] Course prerequisites
- [ ] Grade management
- [ ] Exam scheduling
- [ ] Student performance analytics
- [ ] Mobile apps (React Native)
- [ ] API documentation (Swagger)

---

## 📝 License

MIT License - Feel free to use for educational and commercial purposes.

---

## 🤝 Support

For issues or questions:
1. Check the Troubleshooting section above
2. Review API endpoint documentation
3. Check WebSocket event handlers
4. Enable debug logging in `.env`

---

**Happy Attendance Tracking! 🎓**
