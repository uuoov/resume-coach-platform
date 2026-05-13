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
  getCompanyInfo: jest.fn().mockResolvedValue({
    name: '字节跳动',
    industry: '互联网',
    size: '10000+',
    description: '全球化科技公司',
  }),
  autoQueryCompanyInfo: jest.fn().mockResolvedValue({
    name: '腾讯',
    industry: '互联网',
  }),
}));

describe('Company Routes', () => {
  describe('GET /api/company/query', () => {
    it('should return 400 without name parameter', async () => {
      const response = await request(app).get('/api/company/query');
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('缺少 name 参数');
    });

    it('should return company info for valid query', async () => {
      const response = await request(app)
        .get('/api/company/query')
        .query({ name: '字节跳动' });
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('name', '字节跳动');
    });
  });

  describe('POST /api/company/auto-query', () => {
    it('should return 400 without jdText', async () => {
      const response = await request(app)
        .post('/api/company/auto-query')
        .send({});
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('缺少 jdText 参数');
    });

    it('should return company info from JD text', async () => {
      const response = await request(app)
        .post('/api/company/auto-query')
        .send({ jdText: '腾讯招聘前端工程师，要求3年以上经验' });
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('name', '腾讯');
    });
  });
});
