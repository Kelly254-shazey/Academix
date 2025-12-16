const fs = require('fs');
const path = require('path');
const db = require('../database');

async function initializeDatabase() {
  try {
    console.log('🔧 Initializing database...');
    
    // Read and execute migration files
    const migrationPaths = [
      path.join(__dirname, '../database/migrations/lecturer_features.sql'),
      path.join(__dirname, '../database/migrations/resources_grades.sql')
    ];
    
    for (const migrationPath of migrationPaths) {
      if (fs.existsSync(migrationPath)) {
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        // Split by semicolon and execute each statement
        const statements = migrationSQL.split(';').filter(stmt => stmt.trim());
        
        for (const statement of statements) {
          if (statement.trim()) {
            try {
              await db.execute(statement);
            } catch (error) {
              if (!error.message.includes('already exists')) {
                console.error('❌ Error executing statement:', error.message);
              }
            }
          }
        }
      }
    }

    
    console.log('✅ Database initialization completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

initializeDatabase();