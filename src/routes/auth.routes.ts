/**
 * 认证路由
 */

import { Router, type Request, type Response } from 'express';
import { AuthService } from '../services/auth-service';
import { requireAuth } from '../middleware/auth-middleware';
import { logger } from '../utils/logger';

const router = Router();

// 用户注册
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name, avatar } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数',
        message: '邮箱和密码不能为空',
      });
    }

    const result = await AuthService.register({ email, password, name, avatar });

    if (result.success && result.data) {
      res.status(201).json(result);
    } else {
      res.status(result.statusCode || 400).json(result);
    }
  } catch (error: any) {
    logger.error('注册失败', error instanceof Error ? error : undefined, 'auth-routes');
    res.status(500).json({
      success: false,
      error: '服务器内部错误',
      message: error.message,
    });
  }
});

// 用户登录
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数',
        message: '邮箱和密码不能为空',
      });
    }

    const result = await AuthService.login({ email, password });

    if (result.success && result.data) {
      res.json(result);
    } else {
      res.status(result.statusCode || 401).json(result);
    }
  } catch (error: any) {
    logger.error('登录失败', error instanceof Error ? error : undefined, 'auth-routes');
    res.status(500).json({
      success: false,
      error: '服务器内部错误',
      message: error.message,
    });
  }
});

// 获取当前用户信息（需要登录）
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: req.user,
    });
  } catch (error: any) {
    logger.error('获取用户信息失败', error instanceof Error ? error : undefined, 'auth-routes');
    res.status(500).json({
      success: false,
      error: '服务器内部错误',
      message: error.message,
    });
  }
});

export default router;
