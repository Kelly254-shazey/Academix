const http = require('http');
const mysql = require('mysql2/promise');

async function healthCheck() {
  const results = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    services: {}
  };

  // Check API server
  try {
    await new Promise((resolve, reject) => {
      const req = http.get('http://localhost:5003/', (res) => {
        results.services.api = { status: 'healthy', responseTime: Date.now() - start };
        resolve();
      });
      const start = Date.now();
      req.on('error', reject);
      req.setTimeout(5000, () => reject(new Error('Timeout')));
    });
  } catch (err) {
    results.services.api = { status: 'unhealthy', error: err.message };
    results.status = 'unhealthy';
  }

  // Check database
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_NAME || 'academix'
    });
    await connection.execute('SELECT 1');
    await connection.end();
    results.services.database = { status: 'healthy' };
  } catch (err) {
    results.services.database = { status: 'unhealthy', error: err.message };
    results.status = 'unhealthy';
  }

  return results;
}

if (require.main === module) {
  healthCheck().then(console.log).catch(console.error);
}

module.exports = { healthCheck };