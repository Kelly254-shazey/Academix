const db = require('../database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

exports.login = async (data) => {
  const { email, password } = data;
  if (!email || !password) throw new Error('Email and password are required');
  
  const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
  if (rows.length === 0) throw new Error('Invalid email or password');
  
  const user = rows[0];
  const isPasswordValid = bcrypt.compareSync(password, user.password_hash);
  if (!isPasswordValid) throw new Error('Invalid email or password');
  
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
  const { password_hash: _, ...userWithoutPassword } = user;
  
  return { token, user: userWithoutPassword };
};

exports.register = async (data) => {
  const { email, password, name, role } = data;
  if (!email || !password || !name || !role) throw new Error('Email, password, name, and role are required');
  if (!['student', 'lecturer', 'admin'].includes(role)) throw new Error('Invalid role');
  
  const [existingUser] = await db.execute('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
  if (existingUser.length > 0) throw new Error('User already exists');
  
  const hashedPassword = bcrypt.hashSync(password, 10);
  await db.execute('INSERT INTO users (name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, NOW())', 
    [name, email.toLowerCase(), hashedPassword, role]);
  
  const [newUserRows] = await db.execute('SELECT id, name, email, role, created_at FROM users WHERE email = ?', [email.toLowerCase()]);
  const newUser = newUserRows[0];
  
  const token = jwt.sign({ id: newUser.id, email: newUser.email, role: newUser.role }, JWT_SECRET, { expiresIn: '24h' });
  return { token, user: newUser };
};

exports.verifyToken = async (token) => {
  if (!token) throw new Error('No token provided');
  const decoded = jwt.verify(token, JWT_SECRET);
  const [rows] = await db.execute('SELECT id, name, email, role, avatar, department FROM users WHERE id = ?', [decoded.id]);
  if (rows.length === 0) throw new Error('User not found');
  return rows[0];
};

exports.getAllUsers = async () => {
  const [rows] = await db.execute('SELECT id, name, email, role, avatar, department FROM users');
  return rows;
};
