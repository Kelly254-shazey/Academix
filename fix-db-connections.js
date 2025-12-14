const fs = require('fs');

// Fix lecturerService
let content = fs.readFileSync('./backend/services/lecturerService.js', 'utf8');

// Replace mysql import with db import
content = content.replace(
  "const mysql = require('mysql2/promise');",
  "const db = require('../database');"
);

// Remove pool creation - matches multi-line pool creation
content = content.replace(/const conn = await mysql\.createPool\(\{\s*connectionLimit: 10,\s*host: process\.env\.DB_HOST,\s*user: process\.env\.DB_USER,\s*password: process\.env\.DB_PASSWORD,\s*database: process\.env\.DB_NAME,\s*\}\);/g, '');

// Change conn.query to db.execute
content = content.replace(/await conn\.query\(/g, 'await db.execute(');

// Remove conn.end() calls
content = content.replace(/\s*conn\.end\(\);/g, '');

fs.writeFileSync('./backend/services/lecturerService.js', content, 'utf8');
console.log('✅ Fixed lecturerService.js');

// Fix adminService  
let adminContent = fs.readFileSync('./backend/services/adminService.js', 'utf8');
adminContent = adminContent.replace(
  "const mysql = require('mysql2/promise');",
  "const db = require('../database');"
);
adminContent = adminContent.replace(/const conn = await mysql\.createPool\(\{\s*connectionLimit: 10,\s*host: process\.env\.DB_HOST,\s*user: process\.env\.DB_USER,\s*password: process\.env\.DB_PASSWORD,\s*database: process\.env\.DB_NAME,\s*\}\);/g, '');
adminContent = adminContent.replace(/await conn\.query\(/g, 'await db.execute(');
adminContent = adminContent.replace(/\s*conn\.end\(\);/g, '');
fs.writeFileSync('./backend/services/adminService.js', adminContent, 'utf8');
console.log('✅ Fixed adminService.js');

console.log('\n✨ Services fixed! Data should now load correctly.');
