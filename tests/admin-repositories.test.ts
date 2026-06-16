/**
 * Admin Repositories 测试
 *
 * 覆盖：
 *   - user-repository.listUsers/updateUser/countBy*
 *   - ai-log-repository.createLog/listLogs/getStats
 *   - company-repository.listCompanies/countCompanies/deleteCompany
 */

jest.mock('@prisma/client', () => {
  const makeDelegate = () => ({
    findUnique: jest.fn().mockResolvedValue(null),
    findFirst: jest.fn().mockResolvedValue(null),
    findMany: jest.fn().mockResolvedValue([]),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
    aggregate: jest.fn().mockResolvedValue({}),
    groupBy: jest.fn().mockResolvedValue([]),
    upsert: jest.fn(),
  });

  const mockPrismaClient = {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
    company: makeDelegate(),
    resume: makeDelegate(),
    jD: makeDelegate(),
    matchRecord: makeDelegate(),
    user: makeDelegate(),
    aiCallLog: makeDelegate(),
  };

  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

beforeEach(() => {
  jest.clearAllMocks();
});

describe('user-repository', () => {
  const userRepo = require('../src/repositories/user-repository');

  it('listUsers 默认分页 + where 空对象', async () => {
    (prisma.user.findMany as jest.Mock).mockResolvedValueOnce([{ id: 'u-1' }]);
    (prisma.user.count as jest.Mock).mockResolvedValueOnce(1);

    const result = await userRepo.listUsers({});

    expect(result.items).toEqual([{ id: 'u-1' }]);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);

    const findManyArgs = (prisma.user.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyArgs.take).toBe(20);
    expect(findManyArgs.skip).toBe(0);
    expect(findManyArgs.orderBy).toEqual({ createdAt: 'desc' });
    expect(findManyArgs.where).toEqual({});
  });

  it('listUsers 带 q + status + role 构造 OR/状态过滤', async () => {
    await userRepo.listUsers({ q: '张三', status: 'ACTIVE', role: 'ADMIN', page: 2, pageSize: 10 });

    const args = (prisma.user.findMany as jest.Mock).mock.calls[0][0];
    expect(args.skip).toBe(10); // (2-1) * 10
    expect(args.where.status).toBe('ACTIVE');
    expect(args.where.role).toBe('ADMIN');
    expect(args.where.OR).toHaveLength(2);
  });

  it('updateUser 合并 role + status，DISABLED 时设置 disabledAt', async () => {
    (prisma.user.update as jest.Mock).mockResolvedValueOnce({ id: 'u-1', status: 'DISABLED' });

    await userRepo.updateUser('u-1', { status: 'DISABLED' });

    const args = (prisma.user.update as jest.Mock).mock.calls[0][0];
    expect(args.where).toEqual({ id: 'u-1' });
    expect(args.data.status).toBe('DISABLED');
    expect(args.data.disabledAt).toBeInstanceOf(Date);
  });

  it('updateUser 只传 role 时不动 status', async () => {
    await userRepo.updateUser('u-1', { role: 'ADMIN' });

    const args = (prisma.user.update as jest.Mock).mock.calls[0][0];
    expect(args.data.role).toBe('ADMIN');
    expect(args.data.status).toBeUndefined();
    expect(args.data.disabledAt).toBeUndefined();
  });
});

describe('ai-log-repository', () => {
  const aiLogRepo = require('../src/repositories/ai-log-repository');

  it('createLog 透传字段', async () => {
    (prisma.aiCallLog.create as jest.Mock).mockResolvedValueOnce({ id: 'log-1' });

    await aiLogRepo.createLog({
      service: 'jd-analyzer',
      provider: 'deepseek',
      model: 'deepseek-chat',
      promptChars: 100,
      responseChars: 200,
      latencyMs: 500,
      success: true,
    });

    const args = (prisma.aiCallLog.create as jest.Mock).mock.calls[0][0];
    expect(args.data.service).toBe('jd-analyzer');
    expect(args.data.promptChars).toBe(100);
    expect(args.data.success).toBe(true);
    expect(args.data.userId).toBeNull();
  });

  it('listLogs 默认按 createdAt desc，过滤 service/success', async () => {
    (prisma.aiCallLog.findMany as jest.Mock).mockResolvedValueOnce([]);
    (prisma.aiCallLog.count as jest.Mock).mockResolvedValueOnce(0);

    await aiLogRepo.listLogs({ service: 'jd-analyzer', success: true });

    const args = (prisma.aiCallLog.findMany as jest.Mock).mock.calls[0][0];
    expect(args.where.service).toBe('jd-analyzer');
    expect(args.where.success).toBe(true);
    expect(args.orderBy).toEqual({ createdAt: 'desc' });
  });

  it('getStats 按 service groupBy + 聚合 tokens', async () => {
    (prisma.aiCallLog.groupBy as jest.Mock).mockResolvedValueOnce([
      {
        service: 'jd-analyzer',
        _count: { _all: 10, success: 9 },
        _sum: { promptTokens: 1000, completionTokens: 500, totalTokens: 1500, latencyMs: 5000 },
      },
    ]);

    const result = await aiLogRepo.getStats({ since: new Date() });
    expect(result).toHaveLength(1);
    expect(result[0].service).toBe('jd-analyzer');
    expect(result[0].totalCalls).toBe(10);
    expect(result[0].successCalls).toBe(9);
    expect(result[0].failureCalls).toBe(1);
    expect(result[0].totalTokens).toBe(1500);
  });
});

describe('company-repository 扩展', () => {
  const companyRepo = require('../src/repositories/company-repository');

  it('listCompanies 默认分页 + source 过滤', async () => {
    (prisma.company.findMany as jest.Mock).mockResolvedValueOnce([{ id: 'c-1' }]);
    (prisma.company.count as jest.Mock).mockResolvedValueOnce(1);

    const result = await companyRepo.listCompanies({ source: 'mock' });

    expect(result.total).toBe(1);
    const args = (prisma.company.findMany as jest.Mock).mock.calls[0][0];
    expect(args.where.source).toBe('mock');
    expect(args.orderBy).toEqual({ updatedAt: 'desc' });
  });

  it('countCompanies 支持自定义 where', async () => {
    (prisma.company.count as jest.Mock).mockResolvedValueOnce(5);
    const total = await companyRepo.countCompanies({ source: 'mock' });
    expect(total).toBe(5);
    expect(prisma.company.count).toHaveBeenCalledWith({ where: { source: 'mock' } });
  });

  it('deleteCompany 透传 id', async () => {
    await companyRepo.deleteCompany('c-1');
    expect(prisma.company.delete).toHaveBeenCalledWith({ where: { id: 'c-1' } });
  });
});
