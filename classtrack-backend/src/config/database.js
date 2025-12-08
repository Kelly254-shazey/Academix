/**
 * Database Configuration
 * Manages PostgreSQL connection pool
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'classtrack_ai',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

/**
 * Execute database query
 * @param {string} query - SQL query string
 * @param {array} values - Query parameters
 * @returns {Promise} Query result
 */
const query = async (sql, values) => {
  try {
    const result = await pool.query(sql, values);
    return result;
  } catch (err) {
    console.error('Database query error:', err);
    throw err;
  }
};

/**
 * Get database connection
 * @returns {Promise} Client connection
 */
const getClient = async () => {
  return pool.connect();
};

module.exports = {
  query,
  getClient,
  pool,
};
