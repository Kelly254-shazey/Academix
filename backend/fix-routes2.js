const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'routes');
const files = fs.readdirSync(routesDir);

files.forEach(file => {
  if (file.endsWith('.js')) {
    const filePath = path.join(routesDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix remaining authMiddleware references
    content = content.replace(/authMiddleware/g, 'authenticateToken');
    content = content.replace(/requireRole\([^)]+\)/g, '');
    
    // Clean up extra commas
    content = content.replace(/,\s*,/g, ',');
    content = content.replace(/,\s*async/g, ', async');
    
    fs.writeFileSync(filePath, content);
    console.log(`Fixed: ${file}`);
  }
});

console.log('All route files fixed again!');