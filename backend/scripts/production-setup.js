#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('🚀 Setting up production environment...\n');

const generateSecret = (length = 64) => {
  return crypto.randomBytes(length).toString('hex');
};

const envPath = path.join(__dirname, '../.env');
const envProductionPath = path.join(__dirname, '../.env.production');

if (!fs.existsSync(envPath)) {
  console.log('📝 Creating .env file from template...');
  
  let envContent = fs.readFileSync(envProductionPath, 'utf8');
  
  envContent = envContent
    .replace(/^JWT_SECRET=$/m, `JWT_SECRET=${generateSecret()}`)
    .replace(/^SESSION_SECRET=$/m, `SESSION_SECRET=${generateSecret()}`)
    .replace(/^CSRF_SECRET=$/m, `CSRF_SECRET=${generateSecret(32)}`)
    .replace(/^ENCRYPTION_KEY=$/m, `ENCRYPTION_KEY=${generateSecret(32)}`);
  
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Environment file created with secure secrets');
}

require('dotenv').config();

const requiredVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET', 'FRONTEND_URL'];
const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars);
  process.exit(1);
}

if (process.env.JWT_SECRET.length < 32) {
  console.error('❌ JWT_SECRET must be at least 32 characters');
  process.exit(1);
}

console.log('✅ All required environment variables are set');

const dirs = ['../logs', '../uploads', '../backups'];
dirs.forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`✅ Created directory: ${path.basename(fullPath)}`);
  }
});

console.log('\n🎉 Production setup complete!');