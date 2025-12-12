// Test script to verify API integration
const http = require('http');

const API_URL = 'http://localhost:5002';
let testToken = null;

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

async function testAPIs() {
  console.log('=== Testing API Integration ===\n');

  try {
    // Test 1: Register a test student
    console.log('1. Registering test student...');
    const registerRes = await makeRequest('POST', '/auth/register', {
      email: `teststudent-${Date.now()}@test.edu`,
      password: 'TestPassword123!',
      name: 'Test Student',
      role: 'student',
    });
    console.log('Response:', registerRes.status, registerRes.body.message);
    if (registerRes.body.token) {
      testToken = registerRes.body.token;
      console.log('Token obtained:', testToken.substring(0, 20) + '...\n');
    } else {
      throw new Error('No token in response');
    }

    // Test 2: Fetch schedule
    console.log('2. Testing /schedule/today endpoint...');
    const scheduleRes = await makeRequest('GET', '/schedule/today', null, {
      'Authorization': `Bearer ${testToken}`,
    });
    console.log('Response:', scheduleRes.status);
    console.log('Data:', JSON.stringify(scheduleRes.body, null, 2));
    console.log('');

    // Test 3: Fetch attendance analytics
    console.log('3. Testing /attendance-analytics/overall endpoint...');
    const attendanceRes = await makeRequest('GET', '/attendance-analytics/overall', null, {
      'Authorization': `Bearer ${testToken}`,
    });
    console.log('Response:', attendanceRes.status);
    console.log('Data:', JSON.stringify(attendanceRes.body, null, 2));
    console.log('');

    // Test 4: Fetch dashboard
    console.log('4. Testing /dashboard/student endpoint...');
    const dashboardRes = await makeRequest('GET', '/dashboard/student', null, {
      'Authorization': `Bearer ${testToken}`,
    });
    console.log('Response:', dashboardRes.status);
    console.log('Data:', JSON.stringify(dashboardRes.body, null, 2));
    console.log('');

    // Test 5: Fetch notifications for user
    console.log('5. Testing /notifications/user/{userId} endpoint...');
    const userId = registerRes.body.user?.id || 'current';
    const notificationsRes = await makeRequest('GET', `/notifications/user/${userId}`, null, {
      'Authorization': `Bearer ${testToken}`,
    });
    console.log('Response:', notificationsRes.status);
    console.log('Data:', JSON.stringify(notificationsRes.body, null, 2));
    console.log('');

    console.log('=== Test Complete ===');
  } catch (error) {
    console.error('Error during testing:', error.message);
  }
}

testAPIs();
