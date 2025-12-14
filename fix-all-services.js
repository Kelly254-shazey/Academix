const fs = require('fs');
const path = require('path');

const servicesDir = './backend/services';
const files = fs.readdirSync(servicesDir).filter(f => f.endsWith('Service.js'));

console.log(`\n🔧 Fixing ${files.length} service files...\n`);

let fixed = 0;

files.forEach(file => {
  const filePath = path.join(servicesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;

  // Skip if already using db
  if (content.includes("const db = require('../database')") && !content.includes('mysql.createPool')) {
    console.log(`✅ ${file} - Already fixed`);
    return;
  }

  // Replace mysql import with db import
  if (content.includes("const mysql = require('mysql2/promise')")) {
    content = content.replace(
      "const mysql = require('mysql2/promise');",
      "const db = require('../database');"
    );
  }

  // Remove all pool creation lines
  content = content.replace(/\s*const conn = await mysql\.createPool\(\{[^}]*\}\);/g, '');
  content = content.replace(/\s*let conn;\s*conn = await mysql\.createPool\(\{[^}]*\}\);/g, '');

  // Replace conn.query and conn.execute with db.execute
  content = content.replace(/await conn\.query\(/g, 'await db.execute(');
  content = content.replace(/await conn\.execute\(/g, 'await db.execute(');

  // Remove conn.end() calls
  content = content.replace(/\s*conn\.end\(\);/g, '');

  // Only write if changed
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${file} - Fixed`);
    fixed++;
  } else {
    console.log(`⏭️  ${file} - No changes needed`);
  }
});

console.log(`\n✨ Complete! Fixed ${fixed} service files.\n`);
console.log('All services now use the global database connection pool.');
