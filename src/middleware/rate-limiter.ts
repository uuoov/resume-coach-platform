/**
 * 限流中间件
 *
 * 策略：
 * - aiRateLimiter：用于 AI 重型端点（parse/analyze/match/optimize/auto-query），15 分钟 30 次
 * - apiRateLimiter：全局 /api/*，15 分钟 100 次
 *
 * 测试环境（NODE_ENV=test）下禁用限流，避免阻塞 jest。
 */

import rateLimit, { type Options } from 'express-rate-limit';

const isTest = process.env.NODE_ENV === 'test';

const skip = (): boolean => isTest;

/**
 * AI 重型端点限流：每 IP 15 分钟 30 次
 */
export const aiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip,
  message: {
    success: false,
    error: '请求过于频繁，请稍后再试',
    code: 'RATE_LIMIT_EXCEEDED',
  },
} as Partial<Options>);

/**
 * 全局 API 限流：每 IP 15 分钟 100 次
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip,
  message: {
    success: false,
    error: '请求过于频繁，请稍后再试',
    code: 'RATE_LIMIT_EXCEEDED',
  },
} as Partial<Options>);
