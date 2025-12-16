const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth-simple');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);

const PORT = 5001;

app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
  console.log('Test login: POST http://localhost:5001/api/auth/login');
  console.log('Body: {"email": "eva@charity", "password": "password123"}');
});

// Test the route
setTimeout(async () => {
  try {
    const axios = require('axios');
    const response = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'eva@charity',
      password: 'password123'
    });
    console.log('✅ Login test successful:', response.data.user.name);
  } catch (error) {
    console.error('❌ Login test failed:', error.response?.data || error.message);
  }
}, 2000);