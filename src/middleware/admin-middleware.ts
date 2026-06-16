/**
 * Admin 中间件
 *
 * requireAdmin 复用 requireAuth 进行 JWT 校验，然后叠加角色判断。
 * 必须挂在 requireAuth 之后（或组合为数组）。
 */

import { Request, Response, NextFunction } from 'express';
import { requireAuth } from './auth-middleware';

/**
 * 角色判断
 */
const roleGuard = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: '未登录或令牌无效',
    });
    return;
  }

  if (req.user.role !== 'ADMIN') {
    res.status(403).json({
      success: false,
      error: '需要管理员权限',
    });
    return;
  }

  next();
};

/**
 * requireAdmin 中间件数组：先鉴权 → 再判角色
 */
export const requireAdmin = [requireAuth, roleGuard];

export default requireAdmin;
