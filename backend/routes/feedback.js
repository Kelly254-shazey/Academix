const express = require('express');
const router = express.Router();

// In-memory storage for anonymous messages
const anonymousMessages = [];
const attendanceRecords = {};
const lectureSchedule = {};

// Initialize sample data
function initializeSampleData() {
  // Sample anonymous messages
  anonymousMessages.push(
    {
      id: 'msg_1',
      lectureId: 'lec_001',
      studentName: 'Anonymous Student',
      courseName: 'Computer Science 101',
      reason: 'Had a family emergency that day, unable to attend. Plan to catch up with lecture notes.',
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      status: 'unread',
      createdAt: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: 'msg_2',
      lectureId: 'lec_002',
      studentName: 'Anonymous Student',
      courseName: 'Advanced Mathematics',
      reason: 'Was sick that morning, had fever and couldn\'t leave bed. Have medical excuse to provide.',
      timestamp: new Date(Date.now() - 172800000).toISOString(),
      status: 'reviewed',
      adminNotes: 'Contact student to provide medical certificate',
      createdAt: new Date(Date.now() - 172800000).toISOString(),
      reviewedAt: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: 'msg_3',
      lectureId: 'lec_003',
      studentName: 'Anonymous Student',
      courseName: 'Data Science',
      reason: 'Transportation issue - bus was late and I missed the class time.',
      timestamp: new Date(Date.now() - 259200000).toISOString(),
      status: 'unread',
      createdAt: new Date(Date.now() - 259200000).toISOString()
    }
  );

  // Sample attendance records for multiple students
  const sampleStudents = ['STU001', 'STU002', 'STU003', 'STU004', 'STU005', 'STU006'];
  const courses = ['Computer Science 101', 'Advanced Mathematics', 'Data Science', 'Physics I'];
  const statuses = ['present', 'absent', 'late', 'excused'];

  sampleStudents.forEach((studentId, idx) => {
    attendanceRecords[studentId] = [];
    
    // Generate 15 attendance records per student
    for (let i = 0; i < 15; i++) {
      const courseIdx = i % courses.length;
      const statusIdx = idx === 0 ? (i % 2 === 0 ? 0 : 3) : (idx === 1 ? (i < 5 ? 1 : 0) : Math.floor(Math.random() * statuses.length));
      
      attendanceRecords[studentId].push({
        id: `att_${studentId}_${i}`,
        studentId,
        lectureId: `lec_${String(i).padStart(3, '0')}`,
        courseName: courses[courseIdx],
        date: new Date(Date.now() - (15 - i) * 86400000).toISOString().split('T')[0],
        status: statuses[statusIdx],
        timestamp: new Date(Date.now() - (15 - i) * 86400000).toISOString()
      });
    }
  });
}

// Initialize data on module load
initializeSampleData();

// POST: Submit anonymous message about missed lecture
router.post('/anonymous-message', (req, res) => {
  try {
    const { lectureId, studentName, courseName, reason, timestamp } = req.body;

    if (!lectureId || !courseName || !reason) {
      return res.status(400).json({
        success: false,
        message: 'lectureId, courseName, and reason are required'
      });
    }

    const message = {
      id: `msg_${Date.now()}`,
      lectureId,
      studentName: studentName || 'Anonymous Student',
      courseName,
      reason,
      timestamp: timestamp || new Date().toISOString(),
      status: 'unread',
      createdAt: new Date().toISOString()
    };

    anonymousMessages.push(message);

    res.status(201).json({
      success: true,
      message: 'Anonymous message submitted successfully',
      data: message
    });
  } catch (error) {
    console.error('Error submitting anonymous message:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while submitting message'
    });
  }
});

// GET: Get all anonymous messages (admin only)
router.get('/anonymous-messages', (req, res) => {
  try {
    res.json({
      success: true,
      messages: anonymousMessages,
      count: anonymousMessages.length
    });
  } catch (error) {
    console.error('Error fetching anonymous messages:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching messages'
    });
  }
});

// GET: Get message by ID
router.get('/anonymous-messages/:id', (req, res) => {
  try {
    const message = anonymousMessages.find(m => m.id === req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Mark as read
    message.status = 'read';

    res.json({
      success: true,
      message: message
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// PUT: Mark message as reviewed
router.put('/anonymous-messages/:id/review', (req, res) => {
  try {
    const { notes, actionTaken } = req.body;
    const message = anonymousMessages.find(m => m.id === req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    message.status = 'reviewed';
    message.adminNotes = notes || '';
    message.actionTaken = actionTaken || 'noted';
    message.reviewedAt = new Date().toISOString();

    res.json({
      success: true,
      message: 'Message marked as reviewed',
      data: message
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// DELETE: Delete anonymous message
router.delete('/anonymous-messages/:id', (req, res) => {
  try {
    const index = anonymousMessages.findIndex(m => m.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    anonymousMessages.splice(index, 1);

    res.json({
      success: true,
      message: 'Anonymous message deleted'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// POST: Record attendance
router.post('/attendance/record', (req, res) => {
  try {
    const { studentId, lectureId, courseName, date, status, timestamp } = req.body;

    if (!studentId || !lectureId || !courseName || !status) {
      return res.status(400).json({
        success: false,
        message: 'studentId, lectureId, courseName, and status are required'
      });
    }

    const recordId = `att_${Date.now()}`;

    if (!attendanceRecords[studentId]) {
      attendanceRecords[studentId] = [];
    }

    const record = {
      id: recordId,
      studentId,
      lectureId,
      courseName,
      date: date || new Date().toISOString().split('T')[0],
      status, // 'present', 'absent', 'late', 'excused'
      timestamp: timestamp || new Date().toISOString()
    };

    attendanceRecords[studentId].push(record);

    res.status(201).json({
      success: true,
      message: 'Attendance recorded',
      data: record
    });
  } catch (error) {
    console.error('Error recording attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while recording attendance'
    });
  }
});

// GET: Get attendance analysis for all students
router.get('/attendance/analysis', (req, res) => {
  try {
    const analysis = {};

    Object.keys(attendanceRecords).forEach(studentId => {
      const records = attendanceRecords[studentId];
      const total = records.length;
      const present = records.filter(r => r.status === 'present').length;
      const absent = records.filter(r => r.status === 'absent').length;
      const late = records.filter(r => r.status === 'late').length;
      const excused = records.filter(r => r.status === 'excused').length;
      const attendancePercentage = total > 0 ? (present / total * 100).toFixed(2) : 0;

      analysis[studentId] = {
        total,
        present,
        absent,
        late,
        excused,
        attendancePercentage: parseFloat(attendancePercentage),
        status: attendancePercentage >= 75 ? 'Good' : attendancePercentage >= 60 ? 'Warning' : 'Critical'
      };
    });

    res.json({
      success: true,
      analysis: analysis,
      totalStudents: Object.keys(attendanceRecords).length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error analyzing attendance'
    });
  }
});

// GET: Get attendance analysis for specific student
router.get('/attendance/analysis/:studentId', (req, res) => {
  try {
    const { studentId } = req.params;
    const records = attendanceRecords[studentId] || [];

    if (records.length === 0) {
      return res.json({
        success: true,
        studentId,
        records: [],
        analysis: {
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
          excused: 0,
          attendancePercentage: 0,
          status: 'No records'
        }
      });
    }

    const total = records.length;
    const present = records.filter(r => r.status === 'present').length;
    const absent = records.filter(r => r.status === 'absent').length;
    const late = records.filter(r => r.status === 'late').length;
    const excused = records.filter(r => r.status === 'excused').length;
    const attendancePercentage = (present / total * 100).toFixed(2);

    // Group by course
    const byCourse = {};
    records.forEach(record => {
      if (!byCourse[record.courseName]) {
        byCourse[record.courseName] = [];
      }
      byCourse[record.courseName].push(record);
    });

    const courseAnalysis = {};
    Object.keys(byCourse).forEach(course => {
      const courseRecords = byCourse[course];
      const courseTotal = courseRecords.length;
      const coursePresent = courseRecords.filter(r => r.status === 'present').length;
      courseAnalysis[course] = {
        total: courseTotal,
        present: coursePresent,
        absent: courseRecords.filter(r => r.status === 'absent').length,
        percentage: (coursePresent / courseTotal * 100).toFixed(2)
      };
    });

    res.json({
      success: true,
      studentId,
      records: records.sort((a, b) => new Date(b.date) - new Date(a.date)),
      analysis: {
        total,
        present,
        absent,
        late,
        excused,
        attendancePercentage: parseFloat(attendancePercentage),
        status: attendancePercentage >= 75 ? 'Good' : attendancePercentage >= 60 ? 'Warning' : 'Critical'
      },
      courseAnalysis
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// GET: Get attendance statistics by course
router.get('/attendance/course/:courseName', (req, res) => {
  try {
    const { courseName } = req.params;
    const courseAttendance = [];

    Object.keys(attendanceRecords).forEach(studentId => {
      const records = attendanceRecords[studentId].filter(r => r.courseName === courseName);
      if (records.length > 0) {
        const total = records.length;
        const present = records.filter(r => r.status === 'present').length;
        const percentage = (present / total * 100).toFixed(2);

        courseAttendance.push({
          studentId,
          total,
          present,
          absent: records.filter(r => r.status === 'absent').length,
          late: records.filter(r => r.status === 'late').length,
          percentage: parseFloat(percentage),
          status: percentage >= 75 ? 'Good' : percentage >= 60 ? 'Warning' : 'Critical'
        });
      }
    });

    // Sort by attendance percentage
    courseAttendance.sort((a, b) => a.percentage - b.percentage);

    res.json({
      success: true,
      courseName,
      students: courseAttendance,
      averageAttendance: courseAttendance.length > 0
        ? (courseAttendance.reduce((sum, s) => sum + s.percentage, 0) / courseAttendance.length).toFixed(2)
        : 0
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// GET: Get attendance alerts (low attendance students)
router.get('/attendance/alerts', (req, res) => {
  try {
    const alerts = [];
    const threshold = 60; // 60% attendance

    Object.keys(attendanceRecords).forEach(studentId => {
      const records = attendanceRecords[studentId];
      if (records.length === 0) return;

      const total = records.length;
      const present = records.filter(r => r.status === 'present').length;
      const percentage = (present / total * 100).toFixed(2);

      if (percentage < threshold) {
        alerts.push({
          studentId,
          attendancePercentage: parseFloat(percentage),
          total,
          present,
          absent: records.filter(r => r.status === 'absent').length,
          severity: percentage < 40 ? 'Critical' : 'Warning',
          message: `Student ${studentId} has ${percentage}% attendance (below ${threshold}% threshold)`
        });
      }
    });

    alerts.sort((a, b) => a.attendancePercentage - b.attendancePercentage);

    res.json({
      success: true,
      alerts,
      count: alerts.length,
      criticalCount: alerts.filter(a => a.severity === 'Critical').length,
      warningCount: alerts.filter(a => a.severity === 'Warning').length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// POST: Generate attendance report
router.post('/attendance/report', (req, res) => {
  try {
    const { startDate, endDate, courseName } = req.body;

    let records = [];

    Object.keys(attendanceRecords).forEach(studentId => {
      records.push(...attendanceRecords[studentId]);
    });

    // Filter by course if provided
    if (courseName) {
      records = records.filter(r => r.courseName === courseName);
    }

    // Filter by date range if provided
    if (startDate) {
      records = records.filter(r => new Date(r.date) >= new Date(startDate));
    }
    if (endDate) {
      records = records.filter(r => new Date(r.date) <= new Date(endDate));
    }

    const report = {
      generatedAt: new Date().toISOString(),
      filters: { startDate, endDate, courseName },
      totalRecords: records.length,
      summary: {
        totalPresent: records.filter(r => r.status === 'present').length,
        totalAbsent: records.filter(r => r.status === 'absent').length,
        totalLate: records.filter(r => r.status === 'late').length,
        totalExcused: records.filter(r => r.status === 'excused').length
      },
      records: records.sort((a, b) => new Date(b.date) - new Date(a.date))
    };

    res.json({
      success: true,
      report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error generating report'
    });
  }
});

// GET: Get real-time analytics dashboard data
router.get('/analytics/realtime', (req, res) => {
  try {
    // Calculate attendance statistics in real-time
    const studentAnalytics = {};
    const courseAnalytics = {};
    let totalAttendanceRecords = 0;
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLate = 0;

    Object.keys(attendanceRecords).forEach(studentId => {
      const records = attendanceRecords[studentId];
      totalAttendanceRecords += records.length;

      const studentData = {
        studentId,
        totalClasses: records.length,
        present: records.filter(r => r.status === 'present').length,
        absent: records.filter(r => r.status === 'absent').length,
        late: records.filter(r => r.status === 'late').length,
        excused: records.filter(r => r.status === 'excused').length
      };

      studentData.attendancePercentage = studentData.totalClasses > 0 
        ? ((studentData.present / studentData.totalClasses) * 100).toFixed(2)
        : 0;

      // Determine status based on attendance percentage
      if (studentData.attendancePercentage >= 80) {
        studentData.status = 'Excellent';
        studentData.risk = 'low';
      } else if (studentData.attendancePercentage >= 70) {
        studentData.status = 'Good';
        studentData.risk = 'low';
      } else if (studentData.attendancePercentage >= 60) {
        studentData.status = 'Warning';
        studentData.risk = 'medium';
      } else {
        studentData.status = 'Critical';
        studentData.risk = 'high';
      }

      studentAnalytics[studentId] = studentData;

      // Aggregate course data
      records.forEach(record => {
        const courseName = record.courseName;
        if (!courseAnalytics[courseName]) {
          courseAnalytics[courseName] = {
            courseName,
            totalClasses: 0,
            totalStudents: new Set(),
            presentCount: 0,
            absentCount: 0,
            lateCount: 0
          };
        }
        courseAnalytics[courseName].totalClasses += 1;
        courseAnalytics[courseName].totalStudents.add(studentId);
        
        if (record.status === 'present') courseAnalytics[courseName].presentCount += 1;
        else if (record.status === 'absent') courseAnalytics[courseName].absentCount += 1;
        else if (record.status === 'late') courseAnalytics[courseName].lateCount += 1;
      });

      totalPresent += studentData.present;
      totalAbsent += studentData.absent;
      totalLate += studentData.late;
    });

    // Convert course analytics
    const courseData = Object.values(courseAnalytics).map(course => ({
      ...course,
      totalStudents: course.totalStudents.size,
      avgAttendance: course.totalClasses > 0 
        ? ((course.presentCount / course.totalClasses) * 100).toFixed(2)
        : 0
    }));

    // Calculate system-wide statistics
    const systemStats = {
      timestamp: new Date().toISOString(),
      totalStudents: Object.keys(attendanceRecords).length,
      totalCourses: Object.keys(courseAnalytics).length,
      totalAttendanceRecords,
      overallAttendancePercentage: totalAttendanceRecords > 0 
        ? ((totalPresent / totalAttendanceRecords) * 100).toFixed(2)
        : 0,
      presentCount: totalPresent,
      absentCount: totalAbsent,
      lateCount: totalLate,
      criticalStudents: Object.values(studentAnalytics).filter(s => s.risk === 'high').length,
      warningStudents: Object.values(studentAnalytics).filter(s => s.risk === 'medium').length,
      excellentStudents: Object.values(studentAnalytics).filter(s => s.status === 'Excellent').length
    };

    // Get attendance trends (last 7 days)
    const trends = {};
    Object.values(attendanceRecords).forEach(studentRecords => {
      studentRecords.forEach(record => {
        const date = record.date || new Date(record.timestamp).toISOString().split('T')[0];
        if (!trends[date]) {
          trends[date] = { date, present: 0, absent: 0, late: 0, total: 0 };
        }
        trends[date].total += 1;
        if (record.status === 'present') trends[date].present += 1;
        else if (record.status === 'absent') trends[date].absent += 1;
        else if (record.status === 'late') trends[date].late += 1;
      });
    });

    const attendanceTrends = Object.values(trends).sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    ).slice(-7); // Last 7 days

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      systemStats,
      students: studentAnalytics,
      courses: courseData,
      attendanceTrends,
      anonymousMessages: {
        total: anonymousMessages.length,
        unreviewed: anonymousMessages.filter(m => m.status === 'unread').length,
        reviewed: anonymousMessages.filter(m => m.status === 'reviewed').length
      }
    });
  } catch (error) {
    console.error('Error fetching real-time analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching analytics'
    });
  }
});

// GET: Get course-specific analytics
router.get('/analytics/course/:courseName', (req, res) => {
  try {
    const { courseName } = req.params;
    const decodedCourseName = decodeURIComponent(courseName);

    const courseRecords = [];
    Object.values(attendanceRecords).forEach(records => {
      courseRecords.push(...records.filter(r => r.courseName === decodedCourseName));
    });

    if (courseRecords.length === 0) {
      return res.json({
        success: true,
        courseName: decodedCourseName,
        analytics: {
          totalClasses: 0,
          totalStudents: 0,
          avgAttendance: 0,
          presentCount: 0,
          absentCount: 0
        },
        records: []
      });
    }

    const uniqueStudents = new Set(courseRecords.map(r => r.studentId));
    const presentCount = courseRecords.filter(r => r.status === 'present').length;
    const absentCount = courseRecords.filter(r => r.status === 'absent').length;
    const lateCount = courseRecords.filter(r => r.status === 'late').length;

    res.json({
      success: true,
      courseName: decodedCourseName,
      analytics: {
        totalClasses: courseRecords.length,
        totalStudents: uniqueStudents.size,
        avgAttendance: ((presentCount / courseRecords.length) * 100).toFixed(2),
        presentCount,
        absentCount,
        lateCount,
        lastUpdated: new Date().toISOString()
      },
      records: courseRecords.sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
      )
    });
  } catch (error) {
    console.error('Error fetching course analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching course analytics'
    });
  }
});

// GET: Get student-specific real-time analytics
router.get('/analytics/student/:studentId', (req, res) => {
  try {
    const { studentId } = req.params;
    const records = attendanceRecords[studentId] || [];

    if (records.length === 0) {
      return res.json({
        success: true,
        studentId,
        analytics: {
          totalClasses: 0,
          present: 0,
          absent: 0,
          late: 0,
          attendancePercentage: 0,
          status: 'No records'
        },
        courseBreakdown: {},
        records: []
      });
    }

    const total = records.length;
    const present = records.filter(r => r.status === 'present').length;
    const absent = records.filter(r => r.status === 'absent').length;
    const late = records.filter(r => r.status === 'late').length;
    const excused = records.filter(r => r.status === 'excused').length;
    const attendancePercentage = ((present / total) * 100).toFixed(2);

    // Determine status based on real-time percentage
    let status = 'Good';
    let risk = 'low';
    if (attendancePercentage >= 80) {
      status = 'Excellent';
      risk = 'low';
    } else if (attendancePercentage >= 70) {
      status = 'Good';
      risk = 'low';
    } else if (attendancePercentage >= 60) {
      status = 'Warning';
      risk = 'medium';
    } else {
      status = 'Critical';
      risk = 'high';
    }

    // Course breakdown
    const courseBreakdown = {};
    records.forEach(record => {
      if (!courseBreakdown[record.courseName]) {
        courseBreakdown[record.courseName] = {
          courseName: record.courseName,
          total: 0,
          present: 0,
          absent: 0,
          late: 0
        };
      }
      courseBreakdown[record.courseName].total += 1;
      if (record.status === 'present') courseBreakdown[record.courseName].present += 1;
      else if (record.status === 'absent') courseBreakdown[record.courseName].absent += 1;
      else if (record.status === 'late') courseBreakdown[record.courseName].late += 1;
    });

    // Calculate percentages for each course
    Object.values(courseBreakdown).forEach(course => {
      course.attendancePercentage = course.total > 0 
        ? ((course.present / course.total) * 100).toFixed(2)
        : 0;
    });

    // Get recent records
    const recentRecords = records.sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    ).slice(0, 10);

    res.json({
      success: true,
      studentId,
      analytics: {
        totalClasses: total,
        present,
        absent,
        late,
        excused,
        attendancePercentage: parseFloat(attendancePercentage),
        status,
        risk,
        lastUpdated: new Date().toISOString()
      },
      courseBreakdown,
      records: recentRecords
    });
  } catch (error) {
    console.error('Error fetching student analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching student analytics'
    });
  }
});

module.exports = router;
