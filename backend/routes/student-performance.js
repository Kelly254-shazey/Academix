const express = require('express');
const router = express.Router();

// GET: Student performance data
router.get('/performance', (req, res) => {
  try {
    const mockData = {
      success: true,
      data: {
        averageScore: 85.5,
        improvement: 12,
        completedAssignments: 8,
        targetAchievement: 78,
        coursePerformance: [
          { courseName: 'Mathematics', score: 88 },
          { courseName: 'Physics', score: 82 },
          { courseName: 'Chemistry', score: 90 }
        ],
        recommendations: [
          'Focus more on Physics assignments',
          'Maintain excellent Chemistry performance',
          'Consider additional Math practice'
        ]
      }
    };
    res.json(mockData);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET: Student grades
router.get('/grades', (req, res) => {
  try {
    const mockData = {
      success: true,
      data: [
        { course_name: 'Mathematics', assessment_type: 'Midterm', score: 88, grade_letter: 'B+' },
        { course_name: 'Physics', assessment_type: 'Quiz', score: 82, grade_letter: 'B' },
        { course_name: 'Chemistry', assessment_type: 'Final', score: 90, grade_letter: 'A-' }
      ]
    };
    res.json(mockData);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET: Student resources
router.get('/resources', (req, res) => {
  try {
    const mockData = {
      success: true,
      data: [
        { name: 'Calculus Notes', category: 'lecture_notes', course_name: 'Mathematics', uploaded_date: '2024-01-15', file_url: '#' },
        { name: 'Physics Lab Manual', category: 'textbooks', course_name: 'Physics', uploaded_date: '2024-01-10', file_url: '#' },
        { name: 'Assignment 1', category: 'assignments', course_name: 'Chemistry', uploaded_date: '2024-01-20', file_url: '#' }
      ]
    };
    res.json(mockData);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT: Update student settings
router.put('/settings', (req, res) => {
  try {
    res.json({ success: true, message: 'Settings updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST: Reset password
router.post('/reset-password', (req, res) => {
  try {
    res.json({ success: true, message: 'Password reset email sent' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST: Submit support request
router.post('/support', (req, res) => {
  try {
    res.json({ success: true, message: 'Support request submitted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET: Device history
router.get('/device-history', (req, res) => {
  try {
    const mockData = [
      { id: 1, device_name: 'Chrome Browser', device_id: 'chrome_123', last_login: new Date().toISOString() },
      { id: 2, device_name: 'Mobile App', device_id: 'mobile_456', last_login: new Date(Date.now() - 86400000).toISOString() }
    ];
    res.json({ success: true, data: mockData });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;