/**
 * JD 分析路由
 */

import { Router, type Request, type Response } from 'express';

const router = Router();

// JD 分析
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { analyzeJD } = await import('../services/jd-analyzer');
    const { jobTitle, company, jdText, userId } = req.body;

    if (!jdText) {
      return res.status(400).json({ error: '缺少 jdText 参数' });
    }

    const analysis = await analyzeJD(jobTitle || '', company || '', jdText);

    if (userId) {
      try {
        const { createJD } = await import('../repositories/jd-repository');
        const saved = await createJD({
          userId,
          jobTitle: jobTitle || '',
          company: company || '',
          content: analysis,
          rawText: jdText,
        });
        res.json({ success: true, data: { ...analysis, id: saved.id } });
        return;
      } catch (dbError) {
        console.error('保存数据库失败:', dbError);
      }
    }

    res.json({ success: true, data: analysis });
  } catch (error) {
    console.error('JD 分析失败:', error);
    res.status(500).json({ error: 'JD 分析失败', message: String(error) });
  }
});

export default router;
