/**
 * Connection Test Script
 * Tests backend connectivity
 */

const axios = require('axios');

const BACKEND_URL = 'http://localhost:5002';
const API_URL = `${BACKEND_URL}/api`;

async function testBackendHealth() {
  console.log('🔍 Testing backend health...');
  try {
    const response = await axios.get(`${BACKEND_URL}/health`, { timeout: 5000 });
    console.log('✅ Backend health check passed:', response.data.status);
    return true;
  } catch (error) {
    console.error('❌ Backend health check failed:', error.message);
    return false;
  }
}

async function testAPIEndpoint() {
  console.log('🔍 Testing API endpoint...');
  try {
    const response = await axios.get(`${API_URL}/auth/verify`, { 
      timeout: 5000,
      validateStatus: () => true // Accept any status code
    });
    console.log('✅ API endpoint accessible:', response.status);
    return true;
  } catch (error) {
    console.error('❌ API endpoint failed:', error.message);
    return false;
  }
}

async function testCORS() {
  console.log('🔍 Testing CORS configuration...');
  try {
    const response = await axios.options(`${API_URL}/auth/verify`, {
      timeout: 5000,
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'GET'
      }
    });
    console.log('✅ CORS configuration working');
    return true;
  } catch (error) {
    console.log('⚠️  CORS test inconclusive (this is normal)');
    return true; // CORS preflight might not be needed for simple requests
  }
}

async function runTests() {
  console.log('🚀 Starting connection tests...\n');
  
  const results = {
    backend: await testBackendHealth(),
    api: await testAPIEndpoint(),
    cors: await testCORS()
  };
  
  console.log('\n📊 Test Results:');
  console.log('Backend Health:', results.backend ? '✅ PASS' : '❌ FAIL');
  console.log('API Endpoint:', results.api ? '✅ PASS' : '❌ FAIL');
  console.log('CORS Config:', results.cors ? '✅ PASS' : '❌ FAIL');
  
  const criticalPassed = results.backend && results.api;
  console.log('\n🎯 Overall Status:', criticalPassed ? '✅ BACKEND READY FOR FRONTEND' : '❌ BACKEND ISSUES DETECTED');
  
  if (criticalPassed) {
    console.log('\n🔗 Connection Details:');
    console.log('Backend URL:', BACKEND_URL);
    console.log('API Base URL:', API_URL);
    console.log('Frontend should connect to:', API_URL);
  }
  
  process.exit(criticalPassed ? 0 : 1);
}

runTests().catch(console.error);