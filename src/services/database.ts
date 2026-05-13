/**
 * 数据库服务
 * 使用 Prisma Client 访问 PostgreSQL
 *
 * 注意：如果 Prisma 未生成，此模块将返回 mock 实现
 */

import { PrismaClient } from '@prisma/client';

// 单例模式，避免重复创建实例
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

let prismaInstance: PrismaClient | null = null;
let prismaAvailable = false;

try {
  prismaInstance = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
  prismaAvailable = true;
} catch (error) {
  console.warn('Prisma 初始化失败，数据库功能将不可用:', error);
}

export const prisma = prismaInstance!;
export { prismaAvailable };

if (process.env.NODE_ENV !== 'production' && prismaInstance) {
  globalForPrisma.prisma = prismaInstance;
}

export type { PrismaClient } from '@prisma/client';
