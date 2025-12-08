# ClassTrack AI - Testing Guide

## System Status ✅

**Backend**: Running on `http://localhost:5000`
**Frontend**: Running on `http://localhost:3000`

---

## Test Accounts (Quick Login)

### Student Account
```
Email: student@university.edu
Password: password123
```

### Lecturer Account
```
Email: lecturer@university.edu
Password: password123
```

### Admin Account
```
Email: admin@university.edu
Password: password123
```

---

## Feature Testing

### 1. **Student - Report Missed Lecture** 📋

**Path**: Login as Student → Navigate to "Report Absence" → Submit Form

**Features to Test**:
- ✅ Fill in course name (required)
- ✅ Fill in reason for absence (required)
- ✅ Toggle anonymous submission checkbox
- ✅ Enter name if not submitting anonymously
- ✅ Submit button shows loading state
- ✅ Success message appears
- ✅ Form resets after submission

**Expected Result**: Green success message "✅ Your message has been submitted successfully!"

---

### 2. **Admin - View Attendance Analysis** 📊

**Path**: Login as Admin → Navigate to "Attendance Analysis"

**Tab 1: Overview**
- ✅ Display system statistics (total students, critical count, good standing)
- ✅ Show top 10 students performance grid
- ✅ Each student shows: ID, attendance %, status badge, present/total count
- ✅ Progress bars indicate attendance level

**Tab 2: Alerts** (⚠️ < 60% threshold)
- ✅ Display cards for students below threshold
- ✅ Show severity: Critical (< 40%) or Warning (40-60%)
- ✅ Display: percentage, present/total, absence count
- ✅ "View Details" button navigates to student details
- ✅ Empty state if no low-attendance students

**Tab 3: Students**
- ✅ Searchable list of all students
- ✅ Click any student to view detailed panel
- ✅ Detail panel shows:
  - Total/Present/Absent/Late/Excused stats
  - Attendance percentage with progress bar
  - Course breakdown grid (attendance by course)
  - Recent attendance records table (sorted newest first)
- ✅ "Back" button returns to list
- ✅ Each row is clickable and interactive

**Tab 4: Messages**
- ✅ Display cards with anonymous messages
- ✅ Show status badges (unread, reviewed)
- ✅ Display: course name, student name, date, reason
- ✅ "Mark as Reviewed" button updates status
- ✅ Admin notes appear for reviewed messages
- ✅ Empty state if no messages

---

### 3. **Backend API Endpoints**

Test these endpoints in browser or terminal:

#### Anonymous Messages API
```
GET http://localhost:5000/feedback/anonymous-messages
```
Expected: Array of 3 sample messages with statuses

#### Attendance Analysis API
```
GET http://localhost:5000/feedback/attendance/analysis
```
Expected: Analysis object with all 6 sample students

#### Attendance Analysis by Student
```
GET http://localhost:5000/feedback/attendance/analysis/STU001
```
Expected: Detailed student records, course breakdown, analysis

#### Attendance Alerts
```
GET http://localhost:5000/feedback/attendance/alerts
```
Expected: Array of alerts for students below 60% threshold

---

## Sample Data Loaded

### Students (6 total)
- `STU001`: High attendance (~93% - Good standing)
- `STU002`: Low attendance (~33% - Critical alert)
- `STU003-STU006`: Varied attendance (33-93%)

### Courses
1. Computer Science 101
2. Advanced Mathematics
3. Data Science
4. Physics I

### Attendance Records
- 15 records per student
- Mix of: present, absent, late, excused statuses
- Dates: Last 15 days

### Anonymous Messages
- 3 sample messages about missed lectures
- Topics: Family emergency, illness, transportation
- Status: 1 unread, 1 reviewed, 1 unread

---

## Workflow Test Scenario

### Complete User Journey

**Step 1: Student Submits Absence Report**
1. Open `http://localhost:3000`
2. Login as `student@university.edu / password123`
3. Click "Report Absence" in navbar
4. Fill form:
   - Course Name: "Computer Science 101"
   - Reason: "Had a health issue that day"
   - Check "Submit Anonymously"
5. Click "Submit"
6. ✅ See success message

**Step 2: Admin Reviews Submission**
1. Logout and login as `admin@university.edu / password123`
2. Click "Attendance Analysis" in navbar
3. Go to "Messages" tab
4. ✅ See your submission in the list
5. Click "Mark as Reviewed"
6. ✅ Status changes to "reviewed"

**Step 3: Admin Analyzes Attendance**
1. Go to "Overview" tab
2. ✅ See all students with attendance stats
3. Go to "Alerts" tab
4. ✅ See students below 60% with severity colors
5. Click on a student in alerts
6. ✅ See detailed breakdown (courses, records)
7. Go to "Students" tab
8. ✅ Search for a student
9. Click on student
10. ✅ View detailed attendance history

---

## Expected Sample Data Results

### Overview Statistics
- Total Students: 6
- Critical (< 40%): 1-2 students
- Good Standing (75%+): 1-2 students
- Average Attendance: ~55%

### Alerts Tab
- Should show 2-3 students with low attendance
- STU002 should be Critical (33%)

### Top 10 Students Performance
- STU001: ~93% ✅ (Good)
- STU002: ~33% ⚠️ (Critical)
- Others: Mixed 33-73%

### Anonymous Messages
- 3 messages visible
- 1 marked as reviewed
- 2 unread/available to review

---

## Troubleshooting

### Frontend Not Loading
```powershell
# Restart frontend
cd frontend
npm start
```

### Backend Not Running
```powershell
# Check if port 5000 is in use
netstat -ano | findstr :5000

# Restart backend
cd backend
npm start
```

### No Sample Data
- Restart backend with `npm start`
- Sample data initializes automatically
- Check browser console for errors

### API Not Responding
```
# Test API with curl/PowerShell
Invoke-WebRequest -Uri "http://localhost:5000/feedback/attendance/analysis"
```

---

## Next Steps

After testing:
1. ✅ Verify all tabs load correctly
2. ✅ Test form submission
3. ✅ Check alert system triggers
4. ✅ Verify responsive design on mobile
5. ✅ Test database persistence (future)
6. ✅ Add email notifications (future)
7. ✅ Implement scheduling for reports (future)

---

**Last Updated**: December 6, 2025
**Status**: 🟢 Ready for Testing
