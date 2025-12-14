const mysql = require('mysql2');
require('dotenv').config();

// Provide sensible defaults but prefer environment variables.
// IMPORTANT: Use environment variables for credentials, especially in production.
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306;
const DB_NAME = process.env.DB_NAME || 'class_ai_db';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || process.env.DB_PASS || 'kelly123'; // Support both DB_PASSWORD and DB_PASS

// Production readiness check
if (process.env.NODE_ENV === 'production' && !process.env.DB_PASSWORD) {
  throw new Error('FATAL: DB_PASSWORD environment variable is not set in production.');
}

/**
 * MySQL Connection Pool
 * Uses mysql2 and exports a promise-based pool for queries
 */
const pool = mysql.createPool({
  host: DB_HOST,
  port: DB_PORT,
  database: DB_NAME,
  user: DB_USER,
  password: DB_PASSWORD,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // MariaDB/MySQL compatibility options
  timezone: '+00:00',
  dateStrings: true,
  // Force native password authentication
  authSwitchHandler: (data, callback) => {
    if (data.pluginName === 'auth_gssapi_client') {
      // Skip GSSAPI and use native password
      return callback(null, Buffer.from(DB_PASSWORD + '\0'));
    }
    callback(null, data);
  },
  // SSL options (disable for local development)
  ssl: false
});

console.log('🔗 Database pool created with config:', {
  host: DB_HOST,
  port: DB_PORT,
  database: DB_NAME,
  user: DB_USER,
  connectionLimit: 10
});

const promisePool = pool.promise();

// Try a test query to confirm connection; retry is left to the process manager.
promisePool.getConnection()
  .then((conn) => {
    conn.release();
    console.log(`✅ Connected to database '${DB_NAME}' on ${DB_HOST}:${DB_PORT}`);
  })
  .catch((err) => {
    console.error(`❌ Failed to connect to database '${DB_NAME}':`, err.message || err);
    process.exit(1); // Exit if database connection fails in production
  });

// Handle connection errors gracefully
pool.on('connection', (connection) => {
  console.log('🔗 New database connection established');

  connection.on('error', (err) => {
    console.error('❌ Database connection error:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      console.log('🔄 Database connection lost, attempting to reconnect...');
    }
  });
});

pool.on('error', (err) => {
  console.error('❌ Database pool error:', err);
  if (err.code === 'ER_ACCESS_DENIED_ERROR') {
    console.error('❌ Database access denied. Check credentials.');
    process.exit(1);
  }
});

module.exports = promisePool;
