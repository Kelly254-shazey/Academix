const fs = require('fs');
const db = require('../backend/database');

async function createSchema() {
  try {
    console.log('Creating database schema...');

    // Read the schema file
    const schemaSQL = fs.readFileSync('./database/schema.sql', 'utf8');

    // Split the SQL into individual statements (basic approach)
    const statements = schemaSQL.split(';').filter(stmt => stmt.trim().length > 0);

    for (const statement of statements) {
      if (statement.trim()) {
        await db.execute(statement);
      }
    }

    console.log('Database schema created successfully!');
  } catch (error) {
    console.error('Error creating schema:', error);
  } finally {
    process.exit();
  }
}

createSchema();