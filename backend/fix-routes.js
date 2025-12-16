const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'routes');
const files = fs.readdirSync(routesDir);

files.forEach(file => {
  if (file.endsWith('.js')) {
    const filePath = path.join(routesDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Skip if already fixed
    if (content.includes('authenticateToken')) return;
    
    // Fix imports
    content = content.replace(
      /const authMiddleware = require\('\.\.\/middleware\/auth'\);/g,
      "const { authenticateToken } = require('../middlewares/authMiddleware');"
    );
    
    content = content.replace(
      /const { validateRequest.*} = require\('\.\.\/middlewares\/validation'\);/g,
      ""
    );
    
    content = content.replace(
      /const schemas = require\('\.\.\/validators\/schemas'\);/g,
      ""
    );
    
    // Fix middleware usage
    content = content.replace(/router\.use\(authMiddleware\);/g, 'router.use(authenticateToken);');
    
    // Remove validation middleware calls
    content = content.replace(/validateRequest\([^)]+\),?\s*/g, '');
    content = content.replace(/req\.validatedData/g, 'req.body');
    content = content.replace(/req\.validatedQuery/g, 'req.query');
    
    fs.writeFileSync(filePath, content);
    console.log(`Fixed: ${file}`);
  }
});

console.log('All route files fixed!');