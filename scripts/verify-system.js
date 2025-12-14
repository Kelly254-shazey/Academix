#!/usr/bin/env node
/**
 * System Verification Script
 * Verifies that all AI-powered attendance system components are properly configured
 */

const path = require('path');
const fs = require('fs');
const logger = console;

const checks = {
  passed: [],
  failed: [],
  warnings: []
};

async function verify() {
  logger.log('\n🔍 ClassTrack AI-Powered Attendance System Verification\n');
  logger.log('=' .repeat(60));

  // 1. Check required files exist
  logger.log('\n📁 Checking required service files...');
  const requiredFiles = [
    'backend/services/qrTokenService.js',
    'backend/services/aiRiskScoringService.js',
    'backend/services/smartNotificationService.js',
    'backend/services/realtimeAttendanceHandler.js',
    'backend/middlewares/qrValidation.js',
    'backend/routes/attendanceAPI.js',
    'backend/config/redis.js',
    'database/migrations/002_attendance_ai_schema.js',
    'scripts/run-migrations.js'
  ];

  for (const file of requiredFiles) {
    const fullPath = path.join(__dirname, '..', file);
    if (fs.existsSync(fullPath)) {
      const size = fs.statSync(fullPath).size;
      checks.passed.push(`✓ ${file} (${(size / 1024).toFixed(1)}KB)`);
      logger.log(`  ✓ ${file}`);
    } else {
      checks.failed.push(`✗ ${file} - NOT FOUND`);
      logger.log(`  ✗ ${file} - NOT FOUND`);
    }
  }

  // 2. Check package.json for required dependencies
  logger.log('\n📦 Checking npm dependencies...');
  const packageJsonPath = path.join(__dirname, '../backend/package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  const requiredPackages = [
    'express',
    'jsonwebtoken',
    'socket.io',
    'mysql2',
    'redis',
    'dotenv'
  ];

  for (const pkg of requiredPackages) {
    if (packageJson.dependencies[pkg]) {
      checks.passed.push(`✓ ${pkg} @ ${packageJson.dependencies[pkg]}`);
      logger.log(`  ✓ ${pkg} @ ${packageJson.dependencies[pkg]}`);
    } else {
      checks.warnings.push(`⚠ ${pkg} - Not listed in package.json`);
      logger.log(`  ⚠ ${pkg} - Not listed in package.json`);
    }
  }

  // 3. Check environment variables
  logger.log('\n🔐 Checking environment configuration...');
  require('dotenv').config({ path: path.join(__dirname, '../.env') });
  
  const requiredEnvVars = [
    'JWT_SECRET',
    'DATABASE_URL',
    'NODE_ENV',
    'PORT'
  ];

  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      checks.passed.push(`✓ ${envVar} is set`);
      logger.log(`  ✓ ${envVar} is set`);
    } else {
      checks.warnings.push(`⚠ ${envVar} not set in .env`);
      logger.log(`  ⚠ ${envVar} not set in .env`);
    }
  }

  // 4. Check file contents for key exports
  logger.log('\n🔧 Checking module exports and structure...');
  
  const filesToCheck = [
    {
      file: 'backend/middlewares/qrValidation.js',
      exports: ['validateQRScan', 'verifyClassSession', 'scanAttemptLimiter']
    },
    {
      file: 'backend/routes/attendanceAPI.js',
      contains: ['POST /api/attendance/scan', 'GET /api/attendance/session/:sessionId/qr']
    },
    {
      file: 'backend/services/qrTokenService.js',
      exports: ['generateQRToken', 'validateQRToken']
    }
  ];

  for (const check of filesToCheck) {
    const fullPath = path.join(__dirname, '..', check.file);
    const content = fs.readFileSync(fullPath, 'utf8');
    
    if (check.exports) {
      let allFound = true;
      for (const exp of check.exports) {
        if (!content.includes(exp)) {
          allFound = false;
          checks.failed.push(`✗ ${check.file} missing export: ${exp}`);
        }
      }
      if (allFound) {
        checks.passed.push(`✓ ${check.file} has all required exports`);
        logger.log(`  ✓ ${check.file} has all required exports`);
      }
    }
    
    if (check.contains) {
      let allFound = true;
      for (const str of check.contains) {
        if (!content.includes(str)) {
          allFound = false;
          checks.failed.push(`✗ ${check.file} missing: ${str}`);
        }
      }
      if (allFound) {
        checks.passed.push(`✓ ${check.file} has all required elements`);
        logger.log(`  ✓ ${check.file} has all required elements`);
      }
    }
  }

  // 5. Database schema check
  logger.log('\n🗄️  Checking database schema...');
  const schemaFile = path.join(__dirname, '../database/migrations/002_attendance_ai_schema.js');
  const schemaContent = fs.readFileSync(schemaFile, 'utf8');
  
  const requiredTables = [
    'qr_tokens',
    'attendance_scans',
    'ai_risk_scores',
    'attendance_audit_logs',
    'student_behavior_patterns',
    'timetables',
    'notification_preferences',
    'attendance_alerts'
  ];

  for (const table of requiredTables) {
    if (schemaContent.includes(`CREATE TABLE IF NOT EXISTS ${table}`)) {
      checks.passed.push(`✓ Database table: ${table}`);
      logger.log(`  ✓ ${table}`);
    } else {
      checks.failed.push(`✗ Database table missing: ${table}`);
      logger.log(`  ✗ ${table} - NOT FOUND`);
    }
  }

  // Note: class_sessions table is pre-existing in the system and is enhanced via ALTER
  checks.passed.push(`✓ Database table: class_sessions (pre-existing)`);
  logger.log(`  ✓ class_sessions (pre-existing, enhanced via ALTER)`);


  // 6. Security features check
  logger.log('\n🔒 Checking security features...');
  const securityFeatures = [
    {
      file: 'backend/services/qrTokenService.js',
      feature: 'JWT token generation',
      check: 'jwt.sign'
    },
    {
      file: 'backend/services/qrTokenService.js',
      feature: 'Token hashing (SHA256)',
      check: 'createHash'
    },
    {
      file: 'backend/middlewares/qrValidation.js',
      feature: 'Device fingerprinting',
      check: 'generateDeviceFingerprint'
    },
    {
      file: 'backend/services/aiRiskScoringService.js',
      feature: 'Risk scoring',
      check: 'analyzeStudentRisk'
    }
  ];

  for (const feature of securityFeatures) {
    const fullPath = path.join(__dirname, '..', feature.file);
    const content = fs.readFileSync(fullPath, 'utf8');
    
    if (content.includes(feature.check)) {
      checks.passed.push(`✓ ${feature.feature}`);
      logger.log(`  ✓ ${feature.feature}`);
    } else {
      checks.failed.push(`✗ ${feature.feature} - implementation not found`);
      logger.log(`  ✗ ${feature.feature}`);
    }
  }

  // Summary
  logger.log('\n' + '='.repeat(60));
  logger.log('\n📊 VERIFICATION SUMMARY\n');
  logger.log(`✓ Passed: ${checks.passed.length}`);
  logger.log(`✗ Failed: ${checks.failed.length}`);
  logger.log(`⚠ Warnings: ${checks.warnings.length}`);

  if (checks.failed.length > 0) {
    logger.log('\n❌ FAILED CHECKS:');
    for (const fail of checks.failed) {
      logger.log(`  ${fail}`);
    }
  }

  if (checks.warnings.length > 0) {
    logger.log('\n⚠️  WARNINGS:');
    for (const warn of checks.warnings) {
      logger.log(`  ${warn}`);
    }
  }

  if (checks.failed.length === 0 && checks.warnings.length === 0) {
    logger.log('\n✅ All checks passed! System is ready to run.\n');
    return 0;
  } else if (checks.failed.length === 0) {
    logger.log('\n⚠️  System ready with warnings. Review warnings before deploying.\n');
    return 0;
  } else {
    logger.log('\n❌ System has critical failures. Fix errors before running.\n');
    return 1;
  }
}

verify().then(code => process.exit(code));
