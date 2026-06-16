/**
 * 简历路由
 *
 * 鉴权策略：
 * - /parse, /export-pdf, /preview-pdf 使用 optionalAuth（允许匿名试用，登录则保存归属）
 * - /:id/versions, /version/:versionId/* 使用 requireAuth（数据归属，含 IDOR 校验）
 */

import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { requireAuth, optionalAuth } from '../middleware/auth-middleware';
import { aiRateLimiter } from '../middleware/rate-limiter';
import { parseResume } from '../services/resume-parser';
import { generateResumePDF } from '../services/pdf-export';
import {
  createResume,
  createResumeVersion,
  getResumeById,
  getResumeVersions,
} from '../repositories/resume-repository';
import { logger } from '../utils/logger';

const router = Router();

// 配置文件上传
const storagePath = process.env.FILE_STORAGE_PATH || './uploads';
if (!fs.existsSync(storagePath)) {
  fs.mkdirSync(storagePath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, storagePath);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['.pdf', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('只支持 PDF 和 Word 文件格式'));
    }
  },
});

// 简历解析（支持文件上传）
router.post('/parse', optionalAuth, aiRateLimiter, upload.single('file'), async (req: Request, res: Response) => {
  try {
    let filePath: string;
    let fileType: 'pdf' | 'docx';

    if (req.file) {
      filePath = req.file.path;
      const ext = path.extname(req.file.originalname).toLowerCase();
      fileType = ext === '.pdf' ? 'pdf' : 'docx';
    } else if (req.body.filePath && req.body.fileType) {
      filePath = req.body.filePath;
      fileType = req.body.fileType;
    } else {
      return res.status(400).json({ success: false, error: '缺少文件参数' });
    }

    const resume = await parseResume(filePath, fileType);

    // 使用已认证用户 id（而非信任请求体），防止伪造归属
    if (req.userId) {
      try {
        const saved = await createResume({
          userId: req.userId,
          name: req.body.name || resume.basicInfo.name || '未命名简历',
          content: resume,
          rawText: '',
          filePath,
          fileType,
        });
        resume.id = saved.id;
      } catch (dbError) {
        logger.warn('简历解析后入库失败', 'resume-routes', {
          error: dbError instanceof Error ? dbError.message : String(dbError),
        });
      }
    }

    res.json({ success: true, data: resume });
  } catch (error) {
    logger.error('简历解析失败', error instanceof Error ? error : undefined, 'resume-routes');
    res.status(500).json({ success: false, error: '简历解析失败', message: String(error) });
  }
});

// 导出简历为 PDF
router.post('/export-pdf', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { resume, template, filename } = req.body;

    if (!resume) {
      return res.status(400).json({ success: false, error: '缺少 resume 参数' });
    }

    const pdfBuffer = await generateResumePDF({
      resume,
      template: template as 'modern' | 'classic' | 'minimal',
    });

    const safeFilename = filename || `resume-${resume.id || Date.now()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.send(pdfBuffer);
  } catch (error) {
    logger.error('PDF 导出失败', error instanceof Error ? error : undefined, 'resume-routes');
    res.status(500).json({
      success: false,
      error: 'PDF 导出失败',
      message: String(error),
    });
  }
});

// 预览简历 PDF
router.post('/preview-pdf', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { resume, template } = req.body;

    if (!resume) {
      return res.status(400).json({ success: false, error: '缺少 resume 参数' });
    }

    const pdfBuffer = await generateResumePDF({
      resume,
      template: template as 'modern' | 'classic' | 'minimal',
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=resume-${resume.id || Date.now()}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    logger.error('PDF 预览失败', error instanceof Error ? error : undefined, 'resume-routes');
    res.status(500).json({
      success: false,
      error: 'PDF 预览失败',
      message: String(error),
    });
  }
});

// 所有权校验：确保 resume 属于当前登录用户
async function ensureResumeOwner(resumeId: string, userId: string) {
  const resume = await getResumeById(resumeId);
  if (!resume) return { status: 404 as const, body: { success: false as const, error: '简历不存在' } };
  if (resume.userId && resume.userId !== userId) {
    return { status: 403 as const, body: { success: false as const, error: '无权访问此简历' } };
  }
  return { resume };
}

// 获取简历版本列表
router.get('/:id/versions', requireAuth, async (req: Request, res: Response) => {
  try {
    const ownership = await ensureResumeOwner(req.params.id, req.userId!);
    if ('body' in ownership) {
      return res.status(ownership.status ?? 500).json(ownership.body);
    }

    const versions = await getResumeVersions(req.params.id);
    res.json({ success: true, data: versions });
  } catch (error) {
    logger.error('获取版本列表失败', error instanceof Error ? error : undefined, 'resume-routes');
    res.status(500).json({ success: false, error: '获取版本列表失败', message: String(error) });
  }
});

// 创建简历版本
router.post('/:id/versions', requireAuth, async (req: Request, res: Response) => {
  try {
    const ownership = await ensureResumeOwner(req.params.id, req.userId!);
    if ('body' in ownership) {
      return res.status(ownership.status ?? 500).json(ownership.body);
    }

    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ success: false, error: '缺少 content 参数' });
    }

    const newVersion = await createResumeVersion(req.params.id, content);
    res.json({ success: true, data: newVersion });
  } catch (error) {
    logger.error('创建版本失败', error instanceof Error ? error : undefined, 'resume-routes');
    res.status(500).json({ success: false, error: '创建版本失败', message: String(error) });
  }
});

// 获取特定版本
router.get('/version/:versionId', requireAuth, async (req: Request, res: Response) => {
  try {
    const version = await getResumeById(req.params.versionId);
    if (!version) {
      return res.status(404).json({ success: false, error: '版本不存在' });
    }
    // 版本也是 Resume 记录，需校验归属
    if (version.userId && version.userId !== req.userId) {
      return res.status(403).json({ success: false, error: '无权访问此简历' });
    }
    res.json({ success: true, data: version });
  } catch (error) {
    logger.error('获取版本失败', error instanceof Error ? error : undefined, 'resume-routes');
    res.status(500).json({ success: false, error: '获取版本失败', message: String(error) });
  }
});

// 恢复到特定版本
router.post('/version/:versionId/revert', requireAuth, async (req: Request, res: Response) => {
  try {
    const version = await getResumeById(req.params.versionId);

    if (!version) {
      return res.status(404).json({ success: false, error: '版本不存在' });
    }
    if (version.userId && version.userId !== req.userId) {
      return res.status(403).json({ success: false, error: '无权访问此简历' });
    }

    const rootId = version.parentId || version.id;
    const newVersion = await createResumeVersion(rootId, version.content as any);

    res.json({ success: true, data: newVersion });
  } catch (error) {
    logger.error('恢复版本失败', error instanceof Error ? error : undefined, 'resume-routes');
    res.status(500).json({ success: false, error: '恢复版本失败', message: String(error) });
  }
});

export default router;
