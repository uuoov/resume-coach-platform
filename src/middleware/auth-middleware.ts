/**
 * 认证中间件
 * 用于保护需要登录才能访问的路由
 */

import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth-service';
import { logger } from '../utils/logger';

// 扩展 Express Request 类型
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      user?: {
        id: string;
        email: string;
        name?: string | null;
        avatar?: string | null;
        role?: 'USER' | 'ADMIN';
        status?: 'ACTIVE' | 'DISABLED';
      };
    }
  }
}

/**
 * 必须登录的中间件
 * 如果没有有效的令牌，返回 401
 */
export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: '未登录，请先登录',
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = AuthService.verifyToken(token);

    if (!decoded) {
      res.status(401).json({
        success: false,
        error: '令牌已过期或无效，请重新登录',
      });
      return;
    }

    req.userId = decoded.userId;

    // 可选：加载用户信息到请求中
    const user = await AuthService.getUserByToken(token);
    if (user) {
      // 已被封禁的账号拒绝访问
      if (user.status === 'DISABLED') {
        res.status(403).json({
          success: false,
          error: '账号已被禁用，请联系管理员',
        });
        return;
      }
      req.user = user;
    }

    next();
  } catch (error) {
    logger.error('认证中间件错误', error instanceof Error ? error : undefined, 'auth-middleware');
    res.status(500).json({
      success: false,
      error: '认证服务异常',
    });
  }
};

/**
 * 可选登录的中间件
 * 如果有令牌则解析用户信息，没有也不阻止访问
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = AuthService.verifyToken(token);

      if (decoded) {
        req.userId = decoded.userId;
        const user = await AuthService.getUserByToken(token);
        if (user) {
          req.user = user;
        }
      }
    }

    next();
  } catch (error) {
    // 可选认证失败不阻止访问
    next();
  }
};
