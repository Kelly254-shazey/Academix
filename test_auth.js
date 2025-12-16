const axios = require('axios');

const API_URL = 'http://localhost:5001/api';

async function testAuth() {
  try {
    console.log('Testing authentication endpoints...');
    
    // Test login
    console.log('\n1. Testing login...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'eva@charity',
      password: 'password123'
    });
    
    console.log('✅ Login successful!');
    console.log('User:', loginResponse.data.user.name);
    console.log('Role:', loginResponse.data.user.role);
    console.log('Token received:', !!loginResponse.data.token);
    
    // Test token verification
    console.log('\n2. Testing token verification...');
    const token = loginResponse.data.token;
    const verifyResponse = await axios.get(`${API_URL}/auth/verify`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Token verification successful!');
    console.log('Verified user:', verifyResponse.data.user.name);
    
    console.log('\n🎉 All authentication tests passed!');
    
  } catch (error) {
    console.error('❌ Authentication test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Message:', error.response.data.message);
    } else if (error.code === 'ECONNREFUSED') {
      console.error('Connection refused - make sure backend is running on port 5000');
    } else {
      console.error('Error:', error.message);
    }
  }
}

testAuth();