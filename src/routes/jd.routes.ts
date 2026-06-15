/**
 * JD 分析路由
 *
 * 鉴权策略：optionalAuth（允许匿名试用，登录则将 JD 记录归属到当前用户）
 */

import { Router, type Request, type Response } from 'express';
import { optionalAuth } from '../middleware/auth-middleware';
import { aiRateLimiter } from '../middleware/rate-limiter';
import { analyzeJD } from '../services/jd-analyzer';
import { createJD } from '../repositories/jd-repository';
import { logger } from '../utils/logger';

const router = Router();

// JD 分析
router.post('/analyze', optionalAuth, aiRateLimiter, async (req: Request, res: Response) => {
  try {
    const { jobTitle, company, jdText } = req.body;

    if (!jdText) {
      return res.status(400).json({ error: '缺少 jdText 参数' });
    }

    const analysis = await analyzeJD(jobTitle || '', company || '', jdText);

    // 使用已认证用户 id，而非信任请求体
    if (req.userId) {
      try {
        const saved = await createJD({
          userId: req.userId,
          jobTitle: jobTitle || '',
          company: company || '',
          content: analysis,
          rawText: jdText,
        });
        res.json({ success: true, data: { ...analysis, id: saved.id } });
        return;
      } catch (dbError) {
        logger.warn('JD 入库失败', 'jd-routes', {
          error: dbError instanceof Error ? dbError.message : String(dbError),
        });
      }
    }

    res.json({ success: true, data: analysis });
  } catch (error) {
    logger.error('JD 分析失败', error instanceof Error ? error : undefined, 'jd-routes');
    res.status(500).json({ error: 'JD 分析失败', message: String(error) });
  }
});

export default router;
