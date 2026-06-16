/**
 * Jest 全局设置文件
 * Mock 数据库和外部服务依赖
 */

// 设置测试环境变量
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.PORT = '0'; // 使用随机端口避免冲突

// Mock Prisma Client
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
