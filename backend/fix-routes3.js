const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'routes');
const files = fs.readdirSync(routesDir);

files.forEach(file => {
  if (file.endsWith('.js')) {
    const filePath = path.join(routesDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix import paths
    content = content.replace(
      /require\('\.\.\/middlewares\/authenticateToken'\)/g,
      "require('../middlewares/authMiddleware')"
    );
    
    fs.writeFileSync(filePath, content);
    console.log(`Fixed: ${file}`);
  }
});

console.log('All import paths fixed!');