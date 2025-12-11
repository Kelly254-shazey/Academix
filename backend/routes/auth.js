const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('../database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user in database
    const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    
    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const user = rows[0];

    // Compare password (stored as password_hash)
    const isPasswordValid = bcrypt.compareSync(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Send user data without password_hash
    const { password_hash: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    // Validation
    if (!email || !password || !name || !role) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, name, and role are required'
      });
    }

    if (!['student', 'lecturer', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be student, lecturer, or admin'
      });
    }

    // Check if user already exists
    const [existingUser] = await db.execute('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existingUser.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    // Hash password
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Insert user using columns present in current schema
    try {
      await db.execute(
        'INSERT INTO users (name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, NOW())',
        [name, email.toLowerCase(), hashedPassword, role]
      );
    } catch (dbError) {
      console.error('Database insert error:', dbError.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to create user: ' + dbError.message
      });
    }

    // Fetch the created user
    const [newUserRows] = await db.execute('SELECT id, name, email, role, created_at FROM users WHERE email = ?', [email.toLowerCase()]);
    
    if (newUserRows.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'User created but could not be retrieved'
      });
    }

    const newUser = newUserRows[0];

    // Generate JWT token
    const token = jwt.sign(
      {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: newUser
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration: ' + error.message
    });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error during logout'
    });
  }
});

// Verify token endpoint
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const [rows] = await db.execute('SELECT id, name, email, role, avatar, department FROM users WHERE id = ?', [decoded.id]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: rows[0]
    });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
});

// Get all users (for admin purposes)
router.get('/users', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT id, name, email, role, avatar, department FROM users');

    res.json({
      success: true,
      users: rows
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
