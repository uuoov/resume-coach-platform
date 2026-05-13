/**
 * 匹配度计算路由
 */

import { Router, type Request, type Response } from 'express';

const router = Router();

// 匹配度计算
router.post('/calculate', async (req: Request, res: Response) => {
  try {
    const { calculateMatch } = await import('../services/matching-engine');
    const { resume, jdAnalysis } = req.body;

    if (!resume || !jdAnalysis) {
      return res.status(400).json({ error: '缺少 resume 或 jdAnalysis 参数' });
    }

    const matchResult = await calculateMatch(resume, jdAnalysis);

    if (req.body.resumeId && req.body.jdId) {
      try {
        const { createMatchRecord } = await import('../repositories/match-repository');
        await createMatchRecord({
          resumeId: req.body.resumeId,
          jdId: req.body.jdId,
          result: matchResult,
        });
      } catch (dbError) {
        console.error('保存数据库失败:', dbError);
      }
    }

    res.json({ success: true, data: matchResult });
  } catch (error) {
    console.error('匹配度计算失败:', error);
    res.status(500).json({ error: '匹配度计算失败', message: String(error) });
  }
});

export default router;
