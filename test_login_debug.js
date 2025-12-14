const http = require('http');

const postData = JSON.stringify({
  email: 'eva@charity',
  password: 'password123'
});

console.log('Testing /api/auth/login-debug endpoint...');
console.log('Body:', postData);

const options = {
  hostname: 'localhost',
  port: 5002,
  path: '/api/auth/login-debug',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  console.log(`\nSTATUS: ${res.statusCode}`);
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log('\nRESPONSE:', JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log('Response:', data);
    }
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
  process.exit(1);
});

req.write(postData);
req.end();
