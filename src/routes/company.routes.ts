/**
 * 公司信息路由
 */

import { Router, type Request, type Response } from 'express';

const router = Router();

// 公司信息查询
router.get('/query', async (req: Request, res: Response) => {
  try {
    const { name } = req.query;

    if (!name) {
      return res.status(400).json({ error: '缺少 name 参数' });
    }

    const { getCompanyInfo } = await import('../services/company-info-service');
    const companyInfo = await getCompanyInfo(name as string);

    res.json({ success: true, data: companyInfo });
  } catch (error) {
    console.error('查询公司信息失败:', error);
    res.status(500).json({ error: '查询公司信息失败', message: String(error) });
  }
});

// 自动查询公司信息（从 JD 文本中提取）
router.post('/auto-query', async (req: Request, res: Response) => {
  try {
    const { jdText } = req.body;

    if (!jdText) {
      return res.status(400).json({ error: '缺少 jdText 参数' });
    }

    const { autoQueryCompanyInfo } = await import('../services/company-info-service');
    const companyInfo = await autoQueryCompanyInfo(jdText);

    res.json({ success: true, data: companyInfo });
  } catch (error) {
    console.error('自动查询公司信息失败:', error);
    res.status(500).json({ error: '自动查询公司信息失败', message: String(error) });
  }
});

export default router;
