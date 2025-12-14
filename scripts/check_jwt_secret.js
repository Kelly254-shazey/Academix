const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Load backend .env (does not override process.env which may be set by the runtime)
const envPath = path.join(__dirname, '..', 'backend', '.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
}

const envVal = process.env.JWT_SECRET;
const trimmed = envVal ? envVal.trim() : undefined;

function hash(v) {
  if (v === undefined) return '(none)';
  return crypto.createHash('sha256').update(v).digest('hex');
}

function looksLikeBase64(s) {
  if (!s) return false;
  // valid base64 should round-trip
  try {
    const b = Buffer.from(s, 'base64');
    return b.toString('base64') === s.replace(/\r?\n/g, '');
  } catch (e) {
    return false;
  }
}

// Get literal value from backend/.env (if present) for comparison
let fileSecretLiteral;
if (fs.existsSync(envPath)) {
  const raw = fs.readFileSync(envPath, 'utf8');
  const line = raw.split(/\r?\n/).find(l => l.startsWith('JWT_SECRET='));
  if (line) fileSecretLiteral = line.split('=')[1] || '';
}

console.log('\nJWT secret consistency check');
console.log('-----------------------------------');
console.log('process.env.JWT_SECRET present:', !!envVal);
console.log('process.env.JWT_SECRET length:', envVal ? envVal.length : '(none)');
console.log('trimmed length:', trimmed ? trimmed.length : '(none)');
console.log('leading/trailing whitespace present:', envVal ? envVal.length !== trimmed.length : false);
console.log('looks like Base64:', looksLikeBase64(envVal));
console.log('SHA256(process.env.JWT_SECRET):', hash(envVal));
console.log('SHA256(trimmed):', hash(trimmed));
if (looksLikeBase64(envVal)) {
  const decoded = Buffer.from(envVal, 'base64');
  console.log('SHA256(Base64-decoded bytes):', crypto.createHash('sha256').update(decoded).digest('hex'));
}

if (fileSecretLiteral !== undefined) {
  console.log('\nbackend/.env literal value length:', fileSecretLiteral.length);
  console.log('SHA256(backend/.env value):', hash(fileSecretLiteral));
  console.log('Matches process.env (trimmed):', hash(trimmed) === hash(fileSecretLiteral.trim()));
} else {
  console.log('\nNo backend/.env file found to compare.');
}

console.log('\nRecommendations:');
console.log('- Ensure you set JWT_SECRET in the environment used to start the backend (system env, docker-compose, or backend/.env).');
console.log('- Avoid leading/trailing spaces when exporting the variable.');
console.log("- Don't expose the secret value in logs; this script prints only hashes and lengths for safety.");
console.log("- If you use docker-compose, check the host environment variable used when composing (see docker-compose.yml).");
console.log('\nRun this with: node scripts/check_jwt_secret.js\n');
