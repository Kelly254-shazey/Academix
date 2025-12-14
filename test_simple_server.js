const express = require('express');
const cors = require('cors');

const app = express();

// Test the CORS setup
app.use(cors({
  origin: (origin, callback) => {
    console.log('CORS origin check for:', origin);
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001'
    ].filter(Boolean);
    if (!origin || allowedOrigins.includes(origin)) {
      console.log('CORS origin accepted');
      callback(null, true);
    } else {
      console.log('CORS origin rejected');
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());

app.post('/api/auth/login-debug', (req, res) => {
  res.json({
    received: true,
    body: req.body
  });
});

app.listen(5002, () => {
  console.log('Test server running on port 5002');
});
