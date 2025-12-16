const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./database');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const [users] = await db.execute(
      'SELECT id, name, email, password_hash, role FROM users WHERE email = ?',
      [email.toLowerCase()]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = users[0];
    const isValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid password' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, 'secret', { expiresIn: '24h' });
    const { password_hash, ...userWithoutPassword } = user;
    
    res.json({ success: true, token, user: userWithoutPassword });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.execute(
      'INSERT INTO users (name, email, password_hash, role, department) VALUES (?, ?, ?, ?, ?)',
      [name, email.toLowerCase(), hashedPassword, 'student', 'General']
    );

    const token = jwt.sign({ id: result.insertId, email: email.toLowerCase(), role: 'student' }, 'secret', { expiresIn: '24h' });
    
    res.status(201).json({
      success: true,
      token,
      user: { id: result.insertId, name, email: email.toLowerCase(), role: 'student', department: 'General' }
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'User already exists' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.listen(5003, () => console.log('✅ Auth server on port 5003'));