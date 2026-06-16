/**
 * Admin 路由测试
 *
 * 不启动完整 express；直接构造 mock req/res 调用 router 内的 handler。
 * 为简化，这里通过 supertest 挂载 admin router。
 */

import request from 'supertest';
import express from 'express';

// Mock repositories
jest.mock('../src/repositories/user-repository', () => ({
  listUsers: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 }),
  updateUser: jest.fn().mockResolvedValue({ id: 'u-1', role: 'ADMIN' }),
  countUsersRegisteredSince: jest.fn().mockResolvedValue(3),
  countActiveUsersSince: jest.fn().mockResolvedValue(7),
  countUsersByRole: jest.fn().mockResolvedValue([{ role: 'USER', _count: { _all: 10 } }]),
}));

jest.mock('../src/repositories/company-repository', () => ({
  listCompanies: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 }),
  createCompany: jest.fn().mockResolvedValue({ id: 'c-1' }),
  updateCompany: jest.fn().mockResolvedValue({ id: 'c-1', name: '更新后' }),
  deleteCompany: jest.fn().mockResolvedValue({ id: 'c-1' }),
  getCompanyById: jest.fn().mockResolvedValue(null),
}));

jest.mock('../src/repositories/ai-log-repository', () => ({
  listLogs: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 }),
  getStats: jest.fn().mockResolvedValue([
    {
      service: 'jd-analyzer',
      totalCalls: 10,
      successCalls: 9,
      failureCalls: 1,
      promptTokens: 1000,
      completionTokens: 500,
      totalTokens: 1500,
      latencyMs: 5000,
    },
  ]),
}));

jest.mock('../src/services/company-info-service', () => ({
  invalidateCompanyCache: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/middleware/admin-middleware', () => ({
  requireAdmin: (req: any, res: any, next: any) => {
    // 测试桩：把 user 注入 + 直接放行
    req.user = { id: 'admin-1', email: 'admin@example.com', role: 'ADMIN' };
    next();
  },
}));

import adminRoutes from '../src/routes/admin.routes';

const app = express();
app.use(express.json());
app.use('/api/admin', adminRoutes);

describe('Admin routes', () => {
  it('GET /dashboard 返回聚合数据', async () => {
    const response = await request(app).get('/api/admin/dashboard');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('todayRegistrations');
    expect(response.body.data).toHaveProperty('dau');
    expect(response.body.data).toHaveProperty('aiCalls7d');
    expect(response.body.data).toHaveProperty('aiServiceBreakdown');
  });

  it('GET /users 支持分页 + 过滤参数', async () => {
    const response = await request(app).get('/api/admin/users?q=alice&role=USER&page=2&pageSize=10');

    expect(response.status).toBe(200);
    const { listUsers } = require('../src/repositories/user-repository');
    expect(listUsers).toHaveBeenCalledWith({
      q: 'alice',
      status: undefined,
      role: 'USER',
      page: 2,
      pageSize: 10,
    });
  });

  it('PATCH /users/:id 校验非法 role → 400', async () => {
    const response = await request(app)
      .patch('/api/admin/users/u-1')
      .send({ role: 'SUPER' });

    expect(response.status).toBe(400);
  });

  it('PATCH /users/:id 拒绝修改自己 → 400', async () => {
    const response = await request(app)
      .patch('/api/admin/users/admin-1')
      .send({ role: 'USER' });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('自己');
  });

  it('POST /companies 缺 name → 400', async () => {
    const response = await request(app).post('/api/admin/companies').send({ industry: 'tech' });

    expect(response.status).toBe(400);
  });

  it('DELETE /companies/:id 对 source=search 拒绝删除 → 400', async () => {
    const { getCompanyById } = require('../src/repositories/company-repository');
    getCompanyById.mockResolvedValueOnce({ id: 'c-1', name: 'X', source: 'search' });

    const response = await request(app).delete('/api/admin/companies/c-1');

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('搜索抓取');
  });

  it('GET /ai-logs 解析 success=true', async () => {
    const response = await request(app).get('/api/admin/ai-logs?success=true&service=jd-analyzer');

    expect(response.status).toBe(200);
    const { listLogs } = require('../src/repositories/ai-log-repository');
    expect(listLogs).toHaveBeenCalledWith(
      expect.objectContaining({
        service: 'jd-analyzer',
        success: true,
      })
    );
  });

  it('GET /ai-logs/stats 解析 days', async () => {
    const response = await request(app).get('/api/admin/ai-logs/stats?days=30');

    expect(response.status).toBe(200);
    const { getStats } = require('../src/repositories/ai-log-repository');
    expect(getStats).toHaveBeenCalledWith({ since: expect.any(Date) });
  });
});
