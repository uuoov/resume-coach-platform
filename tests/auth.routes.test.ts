import request from 'supertest';
import app from '../src/index';

// Mock monitor
jest.mock('../src/utils/monitor', () => ({
  monitor: {
    healthCheck: jest.fn().mockResolvedValue({ status: 'healthy' }),
    getMetrics: jest.fn().mockReturnValue({}),
    recordRequest: jest.fn(),
  },
}));

jest.mock('../src/services/company-info-service', () => ({
  getCompanyInfo: jest.fn().mockResolvedValue(null),
  autoQueryCompanyInfo: jest.fn().mockResolvedValue(null),
}));

describe('Auth Routes', () => {
  describe('POST /api/auth/register', () => {
    it('should return 400 when email is missing', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ password: 'test123' });
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('缺少必要参数');
    });

    it('should return 400 when password is missing', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com' });
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should register a new user successfully', async () => {
      const uniqueEmail = `test-${Date.now()}@example.com`;
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: uniqueEmail,
          password: 'password123',
          name: '测试用户',
        });
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user).toHaveProperty('email', uniqueEmail);
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('should return 400 for duplicate email registration', async () => {
      // admin@example.com is pre-seeded in memory
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'admin@example.com',
          password: 'password123',
        });
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('已被注册');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should return 400 when email is missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ password: 'test123' });
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 when password is missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@example.com' });
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should login successfully with correct credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@example.com',
          password: '123456',
        });
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user).toHaveProperty('email', 'admin@example.com');
      expect(response.body.data.user).toHaveProperty('name', '测试管理员');
    });

    it('should return 401 for wrong password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'wrongpassword',
        });
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('密码错误');
    });

    it('should return 401 for non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        });
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return 401 without token', async () => {
      const response = await request(app).get('/api/auth/me');
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token-12345');
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return user info with valid token', async () => {
      // First login to get a valid token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@example.com',
          password: '123456',
        });

      const token = loginResponse.body.data.token;

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('email', 'admin@example.com');
    });
  });
});
