const request = require('supertest');
const app = require('../server');

describe('API Health Check', () => {
  test('GET / should return system status', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
    expect(response.body.message).toContain('ClassTrack AI Backend is running');
  });
});

describe('Authentication', () => {
  test('POST /api/auth/login should authenticate user', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'password123' });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});