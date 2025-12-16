const mysql = require('mysql2');
require('dotenv').config();

// Database configuration with environment variables
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
  database: process.env.DB_NAME || 'class_ai_db',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'strong123', // Use default from .env
  waitForConnections: true,
  connectionLimit: process.env.DB_CONNECTION_LIMIT ? parseInt(process.env.DB_CONNECTION_LIMIT) : 10,
  queueLimit: 0,

  timezone: '+00:00',
  dateStrings: true,
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: process.env.NODE_ENV === 'production'
  } : false
};

// Production security checks (only in actual production)
if (process.env.NODE_ENV === 'production' && process.env.PRODUCTION_MODE === 'true') {
  if (!process.env.DB_PASSWORD) {
    throw new Error('FATAL: DB_PASSWORD environment variable is required in production');
  }
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('FATAL: JWT_SECRET must be at least 32 characters in production');
  }
}

// Create connection pool
const pool = mysql.createPool(dbConfig);
const promisePool = pool.promise();

// Connection monitoring
pool.on('connection', (connection) => {
  console.log(`🔗 New database connection established (ID: ${connection.threadId})`);
});

pool.on('error', (err) => {
  console.error('❌ Database pool error:', err.code, err.message);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.log('🔄 Database connection lost, pool will reconnect...');
  }
});

// Test connection
const testConnection = async () => {
  try {
    const connection = await promisePool.getConnection();
    await connection.ping();
    connection.release();
    console.log(`✅ Database connected: ${dbConfig.database}@${dbConfig.host}:${dbConfig.port}`);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
    return false;
  }
};

// Initialize connection test (optional - only run if explicitly called)
if (process.env.TEST_DB_ON_STARTUP === 'true') {
  testConnection();
}

// Health check function
const healthCheck = async () => {
  try {
    const [result] = await promisePool.execute('SELECT 1 as health');
    return { status: 'healthy', result: result[0] };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
};

// Transaction helper
const transaction = async (callback) => {
  const connection = await promisePool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  pool: promisePool,
  healthCheck,
  transaction,
  testConnection
};