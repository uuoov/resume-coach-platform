/**
 * 优化建议路由
 */

import { Router, type Request, type Response } from 'express';

const router = Router();

// 获取优化建议
router.post('/suggest', async (req: Request, res: Response) => {
  try {
    const { generateSuggestions, generateOptimizedContent } = await import('../services/optimization-advisor');
    const { resume, jdAnalysis, matchResult, suggestionId, suggestion } = req.body;

    if (!resume || !jdAnalysis || !matchResult) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    // 如果请求生成优化后的内容
    if (suggestionId && req.body.originalContent) {
      const suggestions = await generateSuggestions(resume, jdAnalysis, matchResult);
      const targetSuggestion = suggestion || suggestions.find(s => s.id === suggestionId);

      if (!targetSuggestion) {
        return res.status(404).json({ error: '未找到该建议' });
      }

      const optimizedContent = await generateOptimizedContent(
        req.body.originalContent,
        targetSuggestion,
        jdAnalysis
      );

      res.json({ success: true, data: { optimizedContent } });
      return;
    }

    // 否则只返回建议列表
    const suggestions = await generateSuggestions(resume, jdAnalysis, matchResult);
    res.json({ success: true, data: suggestions });
  } catch (error) {
    console.error('生成优化建议失败:', error);
    res.status(500).json({ error: '生成优化建议失败', message: String(error) });
  }
});

export default router;
