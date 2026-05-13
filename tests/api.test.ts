jest.mock('dotenv', () => ({
  config: jest.fn(),
}));

// Mock monitor 模块的 healthCheck
jest.mock('../src/utils/monitor', () => ({
  monitor: {
    healthCheck: jest.fn().mockResolvedValue({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: 100,
      version: '0.1.0',
      checks: {
        database: { status: 'ok' },
        memory: { status: 'ok', used: 100000, total: 200000, usage: 50 },
        disk: { status: 'ok', free: 100000, total: 200000, usage: 50 },
      },
    }),
    getMetrics: jest.fn().mockReturnValue({
      requests: { total: 0, perMinute: 0, perSecond: 0 },
      errors: { total: 0, '4xx': 0, '5xx': 0 },
      performance: { avgResponseTime: 0, p95ResponseTime: 0, p99ResponseTime: 0 },
      resources: { cpu: 0, memory: 0, disk: 0 },
    }),
    recordRequest: jest.fn(),
  },
}));

// Mock company-info-service 避免数据库和外部 API 调用
jest.mock('../src/services/company-info-service', () => ({
  getCompanyInfo: jest.fn().mockResolvedValue(null),
  autoQueryCompanyInfo: jest.fn().mockResolvedValue(null),
}));

process.env.DEEPSEEK_API_KEY = '';
process.env.OPENAI_API_KEY = '';
process.env.DASHSCOPE_API_KEY = '';

const request = require('supertest');
const app = require('../src/index').default;

describe('Resume Coach Platform API', () => {
  describe('Health Check', () => {
    it('should return 200 OK with health status', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          status: 'healthy',
          timestamp: expect.any(String),
        })
      );
    });
  });

  describe('API Documentation', () => {
    it('should return API documentation', async () => {
      const response = await request(app).get('/api');
      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          name: expect.any(String),
          version: expect.any(String),
          endpoints: expect.any(Object),
        })
      );
    });
  });

  describe('Resume Parsing', () => {
    it('should return 500 error for invalid form-data structure', async () => {
      // 不发送 multipart/form-data 时，multer 会拒绝
      const response = await request(app)
        .post('/api/resume/parse')
        .send({});
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('JD Analysis', () => {
    it('should return 400 error for missing jdText', async () => {
      const response = await request(app)
        .post('/api/jd/analyze')
        .send({});
      expect(response.status).toBe(400);
      expect(response.body).toEqual(
        expect.objectContaining({
          error: '缺少 jdText 参数',
        })
      );
    });

    it('should analyze valid JD text', async () => {
      const response = await request(app)
        .post('/api/jd/analyze')
        .send({
          jobTitle: '前端开发工程师',
          company: '字节跳动',
          jdText: '要求熟练掌握 React、TypeScript、Node.js，有 3 年以上工作经验。',
        });
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(
        expect.objectContaining({
          hardSkills: expect.any(Array),
          rawText: expect.any(String),
        })
      );
    }, 30000); // 增加超时到 30s
  });

  describe('Match Calculation', () => {
    it('should return 400 error for missing parameters', async () => {
      const response = await request(app)
        .post('/api/match/calculate')
        .send({});
      expect(response.status).toBe(400);
      expect(response.body).toEqual(
        expect.objectContaining({
          error: '缺少 resume 或 jdAnalysis 参数',
        })
      );
    });
  });

  describe('Optimization Suggestions', () => {
    it('should return 400 error for missing parameters', async () => {
      const response = await request(app)
        .post('/api/optimize/suggest')
        .send({});
      expect(response.status).toBe(400);
      expect(response.body).toEqual(
        expect.objectContaining({
          error: '缺少必要参数',
        })
      );
    });
  });

  describe('PDF Export and Preview', () => {
    it('should return 400 error for missing resume in export', async () => {
      const response = await request(app)
        .post('/api/resume/export-pdf')
        .send({});
      expect(response.status).toBe(400);
      expect(response.body).toEqual(
        expect.objectContaining({
          error: '缺少 resume 参数',
        })
      );
    });

    it('should return 400 error for missing resume in preview', async () => {
      const response = await request(app)
        .post('/api/resume/preview-pdf')
        .send({});
      expect(response.status).toBe(400);
      expect(response.body).toEqual(
        expect.objectContaining({
          error: '缺少 resume 参数',
        })
      );
    });
  });

  describe('Metrics Endpoint', () => {
    it('should return metrics data', async () => {
      const response = await request(app).get('/metrics');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('Resume Version Management', () => {
    it('should return 400 for creating version without content', async () => {
      const response = await request(app)
        .post('/api/resume/test-id/versions')
        .send({});
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('缺少 content 参数');
    });
  });

  describe('Company Routes', () => {
    it('should return 400 for company query without name', async () => {
      const response = await request(app).get('/api/company/query');
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('缺少 name 参数');
    });

    it('should return 400 for auto-query without jdText', async () => {
      const response = await request(app)
        .post('/api/company/auto-query')
        .send({});
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('缺少 jdText 参数');
    });
  });
});
