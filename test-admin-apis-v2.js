// Test Admin APIs with token inspection
const http = require('http');
const jwt = require('jsonwebtoken');

const API_URL = 'http://localhost:5002';
const JWT_SECRET = 'your-secret-key-change-in-production';
let adminToken = null;

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

async function testAdminAPIs() {
  console.log('=== Testing Admin APIs ===\n');

  try {
    // Test 1: Register an admin
    console.log('1. Registering test admin...');
    const registerRes = await makeRequest('POST', '/auth/register', {
      email: `testadmin-${Date.now()}@test.edu`,
      password: 'AdminPassword123!',
      name: 'Test Admin',
      role: 'admin',
    });
    console.log('Response:', registerRes.status, registerRes.body.message);
    if (registerRes.body.token) {
      adminToken = registerRes.body.token;
      const decoded = jwt.decode(adminToken);
      console.log('Token decoded:', JSON.stringify(decoded, null, 2));
      console.log('');
    } else {
      throw new Error('No token in response');
    }

    // Test 2: Fetch overview
    console.log('2. Testing /api/admin/overview endpoint...');
    const overviewRes = await makeRequest('GET', '/api/admin/overview', null, {
      'Authorization': `Bearer ${adminToken}`,
    });
    console.log('Response:', overviewRes.status);
    console.log('Data:', JSON.stringify(overviewRes.body, null, 2));
    console.log('');

    console.log('=== Admin Test Complete ===');
  } catch (error) {
    console.error('Error during testing:', error.message);
  }
}

testAdminAPIs();
