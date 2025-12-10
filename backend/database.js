const { Pool } = require('pg');
require('dotenv').config();

/**
 * PostgreSQL Connection Pool
 * Establishes connection to PostgreSQL database with configuration from .env
 */
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Log successful connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

// Handle connection errors
pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
});

module.exports = pool;
