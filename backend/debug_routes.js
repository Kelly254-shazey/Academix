const express = require('express');
const app = express();

// Add middleware
app.use(express.json());

// Test route
app.get('/test', (req, res) => {
  res.json({ message: 'Test route works' });
});

// Mount auth routes
app.use('/api/auth', require('./routes/auth-simple'));

// List all routes
app._router.stack.forEach(function(r){
  if (r.route && r.route.path){
    console.log('Route:', r.route.path, Object.keys(r.route.methods));
  } else if (r.name === 'router') {
    console.log('Router middleware:', r.regexp);
    if (r.handle.stack) {
      r.handle.stack.forEach(function(rr) {
        if (rr.route) {
          console.log('  - Route:', rr.route.path, Object.keys(rr.route.methods));
        }
      });
    }
  }
});

app.listen(5002, () => {
  console.log('Debug server on port 5002');
  console.log('Test: http://localhost:5002/test');
  console.log('Login: http://localhost:5002/api/auth/login');
});