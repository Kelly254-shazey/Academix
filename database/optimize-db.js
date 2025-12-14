const mysql = require('mysql2/promise');
require('dotenv').config();

async function runOptimizations() {
  let connection;

  try {
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      user: process.env.DB_USER || 'classtrack',
      password: process.env.DB_PASSWORD || 'strong123',
      database: process.env.DB_NAME || 'class_ai_db',
      multipleStatements: true
    });

    console.log('🔗 Connected to database for optimization...');

    // Read and execute optimization queries
    const fs = require('fs');
    const path = require('path');
    const optimizeSQL = fs.readFileSync(path.join(__dirname, 'optimize.sql'), 'utf8');

    // Split into individual statements and execute
    const statements = optimizeSQL.split(';').filter(stmt => stmt.trim().length > 0);

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await connection.execute(statement);
          console.log('✅ Executed:', statement.substring(0, 50) + '...');
        } catch (error) {
          // Ignore errors for already existing indexes/constraints
          if (!error.message.includes('Duplicate key name') &&
              !error.message.includes('Duplicate entry') &&
              !error.message.includes('already exists')) {
            console.warn('⚠️  Skipped:', statement.substring(0, 50) + '...', error.message);
          }
        }
      }
    }

    console.log('🎉 Database optimization completed!');

  } catch (error) {
    console.error('❌ Database optimization failed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runOptimizations();