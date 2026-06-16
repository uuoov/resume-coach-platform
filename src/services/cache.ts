/**
 * Redis 缓存服务
 *
 * 设计原则：
 * - 缓存为 best-effort：Redis 不可用时不影响业务，所有操作 try/catch 静默降级
 * - 懒加载：首次调用 getRedisClient 时才建立连接
 * - 复用单例：整个进程共享一个连接
 *
 * 典型用法：
 *   const cached = await cacheGet<CompanyInfo>(`company:字节跳动`);
 *   if (cached) return cached;
 *   await cacheSet(`company:字节跳动`, info, 86400);
 */

import Redis from 'ioredis';
import { config } from '../config';
import { logger } from '../utils/logger';

let redisClient: Redis | null = null;
let redisInitAttempted = false;

/**
 * 获取 Redis 客户端单例。
 * - 未配置 REDIS_URL 时返回 null
 * - 初始化失败后不重试（避免每次请求都尝试连接拖慢响应）
 */
export function getRedisClient(): Redis | null {
  if (!config.cache.url) return null;
  if (redisInitAttempted) return redisClient;
  redisInitAttempted = true;

  try {
    redisClient = new Redis(config.cache.url, {
      retryStrategy: (times) => Math.min(times * 200, 2000),
      maxRetriesPerRequest: 2,
      enableOfflineQueue: true,
      lazyConnect: false,
    });

    redisClient.on('error', (err) => {
      logger.warn('Redis 连接异常', 'cache', {
        error: err instanceof Error ? err.message : String(err),
      });
    });

    redisClient.on('connect', () => {
      logger.info('Redis 已连接', 'cache');
    });
  } catch (error) {
    logger.warn('Redis 初始化失败，缓存功能将不可用', 'cache', {
      error: error instanceof Error ? error.message : String(error),
    });
    redisClient = null;
  }

  return redisClient;
}

/**
 * 当前 Redis 是否已连接并可写
 */
export function isRedisAvailable(): boolean {
  const client = getRedisClient();
  return client !== null && client.status === 'ready';
}

/**
 * 读取缓存
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = getRedisClient();
  if (!client) return null;
  try {
    const data = await client.get(key);
    return data ? (JSON.parse(data) as T) : null;
  } catch (err) {
    logger.warn('缓存读取失败', 'cache', {
      key,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * 写入缓存
 */
export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds?: number
): Promise<void> {
  const client = getRedisClient();
  if (!client) return;
  try {
    const serialized = JSON.stringify(value);
    const ttl = ttlSeconds ?? config.cache.ttl;
    await client.set(key, serialized, 'EX', ttl);
  } catch (err) {
    logger.warn('缓存写入失败', 'cache', {
      key,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * 按前缀批量失效缓存
 */
export async function cacheInvalidate(prefix: string): Promise<void> {
  const client = getRedisClient();
  if (!client) return;
  try {
    // 使用 scan 避免在大库下 keys 命令阻塞
    let cursor = '0';
    do {
      const [next, keys] = await client.scan(
        cursor,
        'MATCH',
        `${prefix}*`,
        'COUNT',
        100
      );
      cursor = next;
      if (keys.length > 0) {
        await client.del(...keys);
      }
    } while (cursor !== '0');
  } catch (err) {
    logger.warn('缓存失效失败', 'cache', {
      prefix,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * 优雅关闭 Redis 连接
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
