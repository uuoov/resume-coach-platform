/**
 * 匹配度计算路由
 *
 * 鉴权策略：optionalAuth
 */

import { Router, type Request, type Response } from 'express';
import { optionalAuth } from '../middleware/auth-middleware';
import { aiRateLimiter } from '../middleware/rate-limiter';
import { calculateMatch } from '../services/matching-engine';
import { createMatchRecord } from '../repositories/match-repository';
import { logger } from '../utils/logger';

const router = Router();

// 匹配度计算
router.post('/calculate', optionalAuth, aiRateLimiter, async (req: Request, res: Response) => {
  try {
    const { resume, jdAnalysis, resumeId, jdId } = req.body;

    if (!resume || !jdAnalysis) {
      return res.status(400).json({ success: false, error: '缺少 resume 或 jdAnalysis 参数' });
    }

    const matchResult = await calculateMatch(resume, jdAnalysis);

    // 仅在已登录且提供了 resumeId/jdId 的情况下记录历史
    if (req.userId && resumeId && jdId) {
      try {
        await createMatchRecord({
          resumeId,
          jdId,
          result: matchResult,
        });
      } catch (dbError) {
        logger.warn('匹配记录入库失败', 'match-routes', {
          error: dbError instanceof Error ? dbError.message : String(dbError),
        });
      }
    }

    res.json({ success: true, data: matchResult });
  } catch (error) {
    logger.error('匹配度计算失败', error instanceof Error ? error : undefined, 'match-routes');
    res.status(500).json({ success: false, error: '匹配度计算失败', message: String(error) });
  }
});

export default router;
