/**
 * 请求日志中间件
 *
 * 为生产环境提供结构化的 HTTP 请求/响应日志
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { randomUUID } from 'crypto';

declare global {
  namespace Express {
    interface Request {
      traceId?: string;
      startTime?: number;
    }
  }
}

/**
 * HTTP 请求日志中间件
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  // 生成唯一的请求 ID
  const traceId = (req.headers['x-request-id'] as string) || randomUUID();
  req.traceId = traceId;
  req.startTime = Date.now();

  // 设置响应头
  res.setHeader('X-Request-ID', traceId);

  // 记录请求开始
  logger.info(`${req.method} ${req.originalUrl}`, 'HTTP', {
    traceId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.socket.remoteAddress || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
  });

  // 监听响应完成
  res.on('finish', () => {
    const duration = Date.now() - (req.startTime || Date.now());
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

    const logData = {
      traceId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.getHeader('content-length') || 0,
    };

    if (level === 'error') {
      logger.error(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`, undefined, 'HTTP', logData);
    } else if (level === 'warn') {
      logger.warn(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`, 'HTTP', logData);
    } else {
      logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`, 'HTTP', logData);
    }
  });

  next();
}

/**
 * 性能监控中间件 - 慢请求日志
 */
export function slowRequestLogger(thresholdMs: number = 5000) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      if (duration > thresholdMs) {
        logger.warn(`慢请求: ${req.method} ${req.originalUrl} - ${duration}ms`, 'PERFORMANCE', {
          traceId: req.traceId,
          method: req.method,
          url: req.originalUrl,
          duration: `${duration}ms`,
          threshold: `${thresholdMs}ms`,
        });
      }
    });

    next();
  };
}
