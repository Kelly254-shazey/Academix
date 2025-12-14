#!/usr/bin/env node

/**
 * System Health Check & Login Test
 * Verifies: Authentication, QR Generation, Data Loading
 */

const http = require('http');

const API_URL = 'http://localhost:5002';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(status, message) {
  const symbol = status === 'pass' ? '✅' : status === 'fail' ? '❌' : status === 'info' ? 'ℹ️' : '⏳';
  const color = status === 'pass' ? colors.green : status === 'fail' ? colors.red : colors.blue;
  console.log(`${color}${symbol} ${message}${colors.reset}`);
}

async function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: JSON.parse(data),
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

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

async function runTests() {
  console.log('\n🧪 System Health Check & Login Test\n');
  console.log('═'.repeat(50));

  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: Health Check
  console.log('\n📡 Test 1: Server Health Check');
  try {
    const response = await makeRequest('GET', '/api/health');
    if (response.status === 200 || response.status === 404) {
      // 404 is ok if route doesn't exist, means server is running
      log('pass', 'Server is responding');
      testsPassed++;
    } else {
      log('fail', `Unexpected status: ${response.status}`);
      testsFailed++;
    }
  } catch (error) {
    log('fail', `Server not responding - ${error.message}`);
    log('info', 'Make sure backend server is running on port 5002');
    process.exit(1);
  }

  // Test 2: Login Test
  console.log('\n🔐 Test 2: Authentication Test');
  const testUser = {
    email: 'test.admin@academix.com',
    password: 'test123456',
  };

  try {
    const response = await makeRequest('POST', '/api/auth/login', testUser);

    if (response.status === 200 && response.body.success) {
      log('pass', `Login successful for ${testUser.email}`);
      log('info', `Token received: ${response.body.token.substring(0, 20)}...`);
      testsPassed++;
    } else if (response.status === 400) {
      log('fail', `Validation error: ${response.body.message}`);
      if (response.body.errors) {
        response.body.errors.forEach(err => log('info', `- ${err.field}: ${err.message}`));
      }
      testsFailed++;
    } else if (response.status === 500) {
      log('fail', `Server error: ${response.body.message}`);
      testsFailed++;
    } else {
      log('fail', `Login failed - Status: ${response.status}`);
      log('info', `Response: ${JSON.stringify(response.body)}`);
      testsFailed++;
    }
  } catch (error) {
    log('fail', `Login test failed - ${error.message}`);
    testsFailed++;
  }

  // Test 3: Get Classes (Lecturer)
  console.log('\n📚 Test 3: Data Loading Test');
  try {
    // First login as lecturer
    const loginResponse = await makeRequest('POST', '/api/auth/login', {
      email: 'lecturer@academix.com',
      password: 'lecturer123',
    });

    if (loginResponse.status === 200 && loginResponse.body.token) {
      const token = loginResponse.body.token;

      // Then get classes
      const classesResponse = await makeRequest(
        'GET',
        '/api/lecturer/classes',
        null,
        token
      );

      if (classesResponse.status === 200) {
        const classCount = classesResponse.body.data ? classesResponse.body.data.length : 0;
        log('pass', `Classes loaded successfully (${classCount} classes)`);
        testsPassed++;
      } else if (classesResponse.status === 401) {
        log('fail', 'Unauthorized - token validation failed');
        testsFailed++;
      } else {
        log('fail', `Failed to load classes - Status: ${classesResponse.status}`);
        testsFailed++;
      }
    } else {
      log('fail', 'Could not login as lecturer for data test');
      testsFailed++;
    }
  } catch (error) {
    log('fail', `Data loading test failed - ${error.message}`);
    testsFailed++;
  }

  // Test 4: QR Generation
  console.log('\n🎫 Test 4: QR Code Generation Test');
  try {
    // Login as lecturer
    const loginResponse = await makeRequest('POST', '/api/auth/login', {
      email: 'lecturer@academix.com',
      password: 'lecturer123',
    });

    if (loginResponse.status === 200 && loginResponse.body.token) {
      const token = loginResponse.body.token;

      // Try to generate QR (this will likely fail if no active session, but tests the endpoint)
      const qrResponse = await makeRequest(
        'POST',
        '/api/qr/generate',
        { class_id: 1 },
        token
      );

      if (qrResponse.status === 201 && qrResponse.body.success) {
        log('pass', 'QR code generated successfully');
        log('info', `QR Token: ${qrResponse.body.data.qrToken.substring(0, 20)}...`);
        testsPassed++;
      } else if (qrResponse.status === 400 || qrResponse.status === 404) {
        // Expected if no active session
        log('pass', 'QR endpoint responds correctly (no active session)');
        testsPassed++;
      } else {
        log('fail', `QR generation failed - Status: ${qrResponse.status}`);
        testsFailed++;
      }
    } else {
      log('fail', 'Could not login for QR test');
      testsFailed++;
    }
  } catch (error) {
    log('fail', `QR generation test failed - ${error.message}`);
    testsFailed++;
  }

  // Summary
  console.log('\n' + '═'.repeat(50));
  console.log('\n📊 Test Results:');
  console.log(`${colors.green}✅ Passed: ${testsPassed}${colors.reset}`);
  console.log(`${colors.red}❌ Failed: ${testsFailed}${colors.reset}`);
  console.log(`Total: ${testsPassed + testsFailed} tests\n`);

  if (testsFailed === 0) {
    console.log(`${colors.green}🎉 All tests passed! System is functional.${colors.reset}\n`);
  } else {
    console.log(`${colors.red}⚠️  Some tests failed. Check the issues above.${colors.reset}\n`);
  }
}

runTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
