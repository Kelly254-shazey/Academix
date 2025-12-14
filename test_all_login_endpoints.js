const http = require('http');

function makeRequest(path, postData) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5002,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
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
            data: JSON.parse(data)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data
          });
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

const postData = JSON.stringify({
  email: 'eva@charity',
  password: 'password123'
});

(async () => {
  try {
    console.log('Testing /api/auth/login-debug endpoint...');
    let result = await makeRequest('/api/auth/login-debug', postData);
    console.log(`Status: ${result.status}`);
    console.log(`Response:`, JSON.stringify(result.data, null, 2));

    console.log('\n\nTesting /api/auth/login-no-validation endpoint...');
    result = await makeRequest('/api/auth/login-no-validation', postData);
    console.log(`Status: ${result.status}`);
    console.log(`Response:`, JSON.stringify(result.data, null, 2));

    console.log('\n\nTesting /api/auth/login endpoint (with validation)...');
    result = await makeRequest('/api/auth/login', postData);
    console.log(`Status: ${result.status}`);
    console.log(`Response:`, JSON.stringify(result.data, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
