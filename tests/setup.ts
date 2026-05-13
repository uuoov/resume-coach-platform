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
  const mockPrismaClient = {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
    company: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'mock-company-id', name: 'Test Company' }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    resume: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'mock-resume-id' }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    jD: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'mock-jd-id' }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'mock-user-id' }),
    },
  };

  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});
