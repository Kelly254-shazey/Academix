// Debug admin role issue
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
            headers: res.headers,
            body: data ? JSON.parse(data) : null,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
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

async function debugAdminRole() {
  try {
    // Register admin
    console.log('Registering admin user...');
    const registerRes = await makeRequest('POST', '/auth/register', {
      email: `debugadmin-${Date.now()}@test.edu`,
      password: 'TestPassword123!',
      name: 'Debug Admin',
      role: 'admin',
    });
    
    const token = registerRes.body.token;
    console.log('Admin registered');
    console.log('Token:', token.substring(0, 30) + '...');
    console.log('User data:', JSON.stringify(registerRes.body.user, null, 2));
    console.log('');

    // Test admin overview endpoint
    console.log('Testing /api/admin/overview...');
    const overviewRes = await makeRequest('GET', '/api/admin/overview', null, {
      'Authorization': `Bearer ${token}`,
    });
    
    console.log('Status:', overviewRes.status);
    console.log('Headers:', overviewRes.headers);
    console.log('Response:', JSON.stringify(overviewRes.body, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugAdminRole();
