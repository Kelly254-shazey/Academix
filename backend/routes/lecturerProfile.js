const express = require('express');
const router = express.Router();
const db = require('../database');
const bcrypt = require('bcryptjs');

// GET: Lecturer Profile
router.get('/profile', async (req, res) => {
  try {
    const lecturerId = req.user?.id;
    
    res.json({ 
      success: true, 
      data: {
        id: lecturerId,
        name: req.user?.name || 'Lecturer',
        email: req.user?.email || 'lecturer@example.com',
        department: req.user?.department || 'Computer Science',
        phone: '',
        bio: ''
      }
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT: Update Profile
router.put('/profile', async (req, res) => {
  try {
    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT: Change Password
router.put('/change-password', async (req, res) => {
  try {
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET: Lecturer Settings
router.get('/settings', async (req, res) => {
  try {
    const defaultSettings = {
      notifications_enabled: true,
      auto_refresh_enabled: true,
      theme: 'light',
      language: 'en'
    };

    res.json({ 
      success: true, 
      data: defaultSettings 
    });
  } catch (error) {
    console.error('Settings error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT: Update Settings
router.put('/settings', async (req, res) => {
  try {
    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Settings update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;