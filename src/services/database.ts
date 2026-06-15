/**
 * 数据库服务
 * 使用 Prisma Client 访问 PostgreSQL
 *
 * 安全设计：
 * - prisma 以 PrismaClient | null 形式导出，调用方必须显式判空或使用 requirePrisma()
 * - prismaAvailable 标记运行时是否成功初始化
 * - 初始化失败不会让整个进程崩溃，允许服务降级（如仅依赖内存鉴权、仅运行 AI 路径）
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

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
  // 不再使用 console.warn；结构化日志统一收集
  logger.warn('Prisma 初始化失败，数据库功能将不可用', 'database', {
    error: error instanceof Error ? error.message : String(error),
  });
}

/**
 * 可空的 Prisma 客户端实例。
 * 调用方应优先使用 requirePrisma()，或在分支中先用 prismaAvailable 判定。
 */
export const prisma: PrismaClient | null = prismaInstance;

/**
 * 运行时 Prisma 是否可用
 */
export { prismaAvailable };

/**
 * 断言 Prisma 已初始化，未初始化则抛出带清晰提示的错误。
 * 适合在仓储层函数入口调用，保证调用栈是明确的运行时错误而非 TypeError。
 */
export function requirePrisma(): PrismaClient {
  if (!prismaInstance) {
    throw new Error(
      '数据库未初始化，请检查 DATABASE_URL 配置与 prisma generate 执行状态'
    );
  }
  return prismaInstance;
}

// 开发模式下复用单例，避免 HMR 重复创建连接
if (process.env.NODE_ENV !== 'production' && prismaInstance) {
  globalForPrisma.prisma = prismaInstance;
}

export type { PrismaClient } from '@prisma/client';
