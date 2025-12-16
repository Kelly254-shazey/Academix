const express = require('express');
const router = express.Router();

// In-memory storage for anonymous messages
const anonymousMessages = [];
const attendanceRecords = {};
const activeConnections = new Map();

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

    if (!attendanceRecords[studentId]) {
      attendanceRecords[studentId] = [];
    }

    const record = {
      id: `att_${Date.now()}`,
      studentId,
      lectureId,
      courseName,
      date: date || new Date().toISOString().split('T')[0],
      status,
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

// WebSocket connection tracking
router.post('/connection/track', (req, res) => {
  const { clientId, userId, type } = req.body;
  activeConnections.set(clientId, {
    userId,
    type,
    connectedAt: new Date().toISOString()
  });
  console.log(`📡 ${type}: Client connected ${clientId}`);
  res.json({ success: true });
});

router.delete('/connection/:clientId', (req, res) => {
  const { clientId } = req.params;
  const connection = activeConnections.get(clientId);
  if (connection) {
    console.log(`📡 ${connection.type}: Client disconnected ${clientId}`);
    activeConnections.delete(clientId);
  }
  res.json({ success: true });
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
        const absent = records.filter(r => r.status === 'absent').length;
        const percentage = (present / total * 100).toFixed(2);
        
        courseAttendance.push({
          studentId,
          total,
          present,
          absent,
          percentage: parseFloat(percentage),
          status: percentage >= 75 ? 'Good' : percentage >= 60 ? 'Warning' : 'Critical'
        });
      }
    });

    res.json({
      success: true,
      courseName,
      students: courseAttendance,
      totalStudents: courseAttendance.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;