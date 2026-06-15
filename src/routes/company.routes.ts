/**
 * 公司信息路由
 *
 * 鉴权策略：optionalAuth（查询/自动查询均允许匿名试用）
 * 保留 await import 形式以避免与 Phase 3 重写冲突；Phase 3 会改为顶层 import
 */

import { Router, type Request, type Response } from 'express';
import { optionalAuth } from '../middleware/auth-middleware';
import { aiRateLimiter } from '../middleware/rate-limiter';
import { logger } from '../utils/logger';

const router = Router();

// 公司信息查询
router.get('/query', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { name } = req.query;

    if (!name) {
      return res.status(400).json({ error: '缺少 name 参数' });
    }

    const { getCompanyInfo } = await import('../services/company-info-service');
    const companyInfo = await getCompanyInfo(name as string);

    res.json({ success: true, data: companyInfo });
  } catch (error) {
    logger.error('查询公司信息失败', error instanceof Error ? error : undefined, 'company-routes');
    res.status(500).json({ error: '查询公司信息失败', message: String(error) });
  }
});

// 自动查询公司信息（从 JD 文本中提取）
router.post('/auto-query', optionalAuth, aiRateLimiter, async (req: Request, res: Response) => {
  try {
    const { jdText } = req.body;

    if (!jdText) {
      return res.status(400).json({ error: '缺少 jdText 参数' });
    }

    const { autoQueryCompanyInfo } = await import('../services/company-info-service');
    const companyInfo = await autoQueryCompanyInfo(jdText);

    res.json({ success: true, data: companyInfo });
  } catch (error) {
    logger.error('自动查询公司信息失败', error instanceof Error ? error : undefined, 'company-routes');
    res.status(500).json({ error: '自动查询公司信息失败', message: String(error) });
  }
});

export default router;
