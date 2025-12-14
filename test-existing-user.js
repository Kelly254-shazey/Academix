// Quick test to verify frontend can get data
const http = require('http');

const API_URL = 'http://localhost:5002';

function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            body: data ? JSON.parse(data) : null,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            body: data,
          });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function testWithExistingUser() {
  console.log('=== Testing with existing user ===\n');

  try {
    // Login as existing student
    console.log('1. Logging in as Alice Johnson...');
    const loginRes = await makeRequest('POST', '/auth/login', {
      email: 'alice.johnson@student.university.edu',
      password: 'password123'
    });
    console.log('Response:', loginRes.status);
    if (loginRes.status === 200 && loginRes.body.token) {
      const token = loginRes.body.token;
      console.log('Login successful\n');

      // Test schedule
      console.log('2. Testing /schedule/today...');
      const scheduleRes = await makeRequest('GET', '/schedule/today', null, {
        'Authorization': `Bearer ${token}`,
      });
      console.log('Response:', scheduleRes.status);
      console.log('Data:', JSON.stringify(scheduleRes.body, null, 2));
      console.log('');

      // Test attendance analytics
      console.log('3. Testing /attendance-analytics/overall...');
      const attendanceRes = await makeRequest('GET', '/attendance-analytics/overall', null, {
        'Authorization': `Bearer ${token}`,
      });
      console.log('Response:', attendanceRes.status);
      console.log('Data:', JSON.stringify(attendanceRes.body, null, 2));
      console.log('');

      // Test dashboard
      console.log('4. Testing /dashboard/student...');
      const dashboardRes = await makeRequest('GET', '/dashboard/student', null, {
        'Authorization': `Bearer ${token}`,
      });
      console.log('Response:', dashboardRes.status);
      console.log('Data:', JSON.stringify(dashboardRes.body, null, 2));
      console.log('');

      // Test notifications
      console.log('5. Testing /notifications...');
      const notificationsRes = await makeRequest('GET', '/notifications?limit=10', null, {
        'Authorization': `Bearer ${token}`,
      });
      console.log('Response:', notificationsRes.status);
      console.log('Data:', JSON.stringify(notificationsRes.body, null, 2));

    } else {
      console.log('Login failed:', loginRes.body);
    }

  } catch (error) {
    console.error('Test error:', error);
  }
}

testWithExistingUser();