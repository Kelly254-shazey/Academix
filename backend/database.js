const mysql = require('mysql2');
require('dotenv').config();

// Provide sensible defaults but prefer environment variables.
// IMPORTANT: Do NOT commit real credentials. Use `.env` locally.
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306;
const DB_NAME = process.env.DB_NAME || 'class';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || 'kelly123';

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
  queueLimit: 0
});

const promisePool = pool.promise();

// Try a test query to confirm connection; retry is left to the process manager.
promisePool.getConnection()
  .then((conn) => {
    conn.release();
    console.log(`✅ Connected to MySQL database '${DB_NAME}' on ${DB_HOST}:${DB_PORT}`);
  })
  .catch((err) => {
    console.error(`❌ Failed to connect to MySQL database '${DB_NAME}':`, err.message || err);
  });

module.exports = promisePool;
