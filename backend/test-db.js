const mysql = require('mysql2/promise');
require('dotenv').config();

async function testConnection() {
  console.log('Testing database connection...');
  console.log('Host:', process.env.DB_HOST);
  console.log('Port:', process.env.DB_PORT);
  console.log('User:', process.env.DB_USER);
  console.log('Database:', process.env.DB_NAME);

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'class_ai_db',
      connectTimeout: 10000,
      acquireTimeout: 10000,
      timeout: 10000
    });

    console.log('✅ Connected to database successfully!');
    
    // Test query
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('✅ Test query successful:', rows[0]);
    
    await connection.end();
    console.log('✅ Connection closed');
    
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error errno:', error.errno);
    
    if (error.code === 'ETIMEDOUT') {
      console.log('\n🔍 Troubleshooting ETIMEDOUT:');
      console.log('1. Check if MySQL is running: net start mysql');
      console.log('2. Check firewall settings');
      console.log('3. Try connecting with localhost instead of 127.0.0.1');
    }
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n🔍 Troubleshooting ACCESS DENIED:');
      console.log('1. Check username and password');
      console.log('2. Check user permissions in MySQL');
    }
  }
}

testConnection();