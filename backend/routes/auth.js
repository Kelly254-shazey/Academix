const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// In-memory user database (replace with PostgreSQL in production)
const users = {
  'student@university.edu': {
    id: 'student_001',
    name: 'John Student',
    email: 'student@university.edu',
    password: bcrypt.hashSync('password123', 10),
    role: 'student',
    avatar: '👨‍🎓',
    studentId: 'CS2024001',
    department: 'Computer Science',
    enrolledCourses: ['CS101', 'MATH201', 'ENG102']
  },
  'lecturer@university.edu': {
    id: 'lecturer_001',
    name: 'Dr. Smith',
    email: 'lecturer@university.edu',
    password: bcrypt.hashSync('password123', 10),
    role: 'lecturer',
    avatar: '👨‍🏫',
    employeeId: 'PROF001',
    department: 'Computer Science',
    courses: ['CS101', 'CS201']
  },
  'admin@university.edu': {
    id: 'admin_001',
    name: 'Admin User',
    email: 'admin@university.edu',
    password: bcrypt.hashSync('password123', 10),
    role: 'admin',
    avatar: '👨‍💼',
    department: 'Administration',
    permissions: ['all']
  }
};

// Login endpoint
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user by email
    const user = users[email.toLowerCase()];

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Compare password
    const isPasswordValid = bcrypt.compareSync(password, user.password);

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

    // Send user data without password
    const { password: _, ...userWithoutPassword } = user;

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
router.post('/register', (req, res) => {
  try {
    const { email, password, name, role, department } = req.body;

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
    if (users[email.toLowerCase()]) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    // Hash password
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Create new user
    const userId = `${role}_${Date.now()}`;
    const newUser = {
      id: userId,
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      avatar: role === 'student' ? '👨‍🎓' : role === 'lecturer' ? '👨‍🏫' : '👨‍💼',
      department: department || 'General'
    };

    // Add role-specific fields
    if (role === 'student') {
      newUser.studentId = `${role.toUpperCase()}${Date.now().toString().slice(-6)}`;
      newUser.enrolledCourses = [];
    } else if (role === 'lecturer') {
      newUser.employeeId = `PROF${Date.now().toString().slice(-6)}`;
      newUser.courses = [];
    } else if (role === 'admin') {
      newUser.permissions = ['all'];
    }

    // Store user
    users[email.toLowerCase()] = newUser;

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

    // Send response without password
    const { password: _, ...userWithoutPassword } = newUser;

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
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
router.get('/verify', (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = users[decoded.email];

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      user: userWithoutPassword
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
});

// Get all demo users (for admin purposes)
router.get('/demo-users', (req, res) => {
  try {
    const demoUsers = Object.entries(users).map(([email, user]) => ({
      email,
      role: user.role,
      name: user.name
    }));

    res.json({
      success: true,
      users: demoUsers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
