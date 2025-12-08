# Real-Time Analytics - Quick Start

## What Changed?

✅ **OLD**: Hardcoded sample data, no updates
❌ **NEW**: Real-time calculations from live attendance, auto-refresh

## 🚀 Quick Test (1 minute)

### Step 1: Login as Admin
```
Email: admin@example.com
Password: password123
```

### Step 2: Navigate to Analytics
- Click "Analytics" in navbar (📊 icon)

### Step 3: Observe Real-Time Data
- See live metrics updating
- Data auto-refreshes every 5 seconds
- Try these views:
  - **Overview**: System-wide stats
  - **Courses**: Per-course attendance
  - **Students**: Student list with risk levels
  - **Trends**: Last 7 days graph

### Step 4: Compare with Admin Dashboard
- Click "Admin Panel"
- See analytics cards at the top
- Shows real-time attendance data
- Updates every 10 seconds

## 📊 What You'll See

### Overview Tab
```
Overall Attendance: 68.33%
Total Students: 6
Present Today: 62
Absent: 18
At Risk: 1 student
Warning: 2 students
Excellent: 1 student
Total Courses: 4
```

### Students Tab
- Name/ID with attendance bar
- Status: Excellent/Good/Warning/Critical
- Color-coded bars (green/orange/red)
- Refreshes as attendance changes

### Courses Tab
- Course cards showing:
  - Average attendance %
  - Total classes held
  - Total students
  - Present/Absent counts

### Trends Tab
- 7-day attendance history
- Daily totals
- Attendance percentage per day

## 🔄 Auto-Refresh Rates

| Page | Refresh | Data Source |
|------|---------|-------------|
| Analytics | 5 sec | Live API |
| AdminDashboard | 10 sec | Live API |
| AttendanceAnalysis | 5 sec | Live API |

## 📈 Key Metrics

### System-Wide
- **Overall Attendance %**: Sum of all present / total records
- **Total Records**: All attendance entries in database
- **Critical**: Students with < 60% attendance
- **Warning**: Students with 60-69% attendance
- **Excellent**: Students with 80%+ attendance

### Per-Student
- **Attendance %**: (Present / Total Classes) × 100
- **Status**: Based on percentage (Excellent/Good/Warning/Critical)
- **Risk**: Low/Medium/High assessment
- **Course Breakdown**: Per-course attendance

### Per-Course
- **Average Attendance**: (Present / Total Classes) × 100
- **Unique Students**: Count of different students
- **Total Classes**: Total attendance records

## 🎨 Color Legend

```
🟢 Green  = Excellent (80%+)
🔵 Blue   = Good (70-79%)
🟠 Orange = Warning (60-69%)
🔴 Red    = Critical (<60%)
```

## 🔗 API Endpoints

```bash
# System analytics
GET http://localhost:5000/feedback/analytics/realtime

# Course-specific
GET http://localhost:5000/feedback/analytics/course/Data%20Structures

# Student-specific
GET http://localhost:5000/feedback/analytics/student/STU001
```

## ✅ Success Indicators

- [ ] Data loads instantly (< 1 second)
- [ ] Metrics display correctly
- [ ] Auto-refresh works (watch numbers update)
- [ ] Status colors appear (green/orange/red)
- [ ] No console errors (F12 → Console)
- [ ] Admin access only
- [ ] Multiple view modes work

## 🐛 Troubleshooting

| Issue | Fix |
|-------|-----|
| Analytics page blank | Reload with Ctrl+Shift+R |
| No data showing | Check if admin logged in |
| Numbers not updating | Check browser console for errors |
| Slow loading | Verify backend running on port 5000 |
| Can't access analytics | Must be logged in as admin |

## 📱 Mobile View

- Responsive on all devices
- Metrics stack on smaller screens
- Touch-friendly buttons
- Auto-adapts to viewport

## 🎯 Next Steps

1. **Test Different Roles**
   - Admin: Full access to analytics
   - Lecturer: Limited view (if enabled)
   - Student: No access

2. **Monitor Trends**
   - Watch attendance change
   - Track critical students
   - Monitor course performance

3. **Generate Reports**
   - Export data (future feature)
   - Share metrics with stakeholders
   - Archive historical data

## 📞 Support

For issues, check:
1. Browser console (F12)
2. Backend logs
3. Network tab (F12 → Network)
4. Verify all endpoints responding

---

**Last Updated**: December 6, 2025
**Version**: 1.0 (Live & Production Ready)
