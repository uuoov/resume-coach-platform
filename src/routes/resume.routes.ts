/**
 * 简历路由
 */

import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';

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
router.post('/parse', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const { parseResume } = await import('../services/resume-parser');

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
      return res.status(400).json({ error: '缺少文件参数' });
    }

    const resume = await parseResume(filePath, fileType);

    if (req.body.userId) {
      try {
        const { createResume } = await import('../repositories/resume-repository');
        const saved = await createResume({
          userId: req.body.userId,
          name: req.body.name || resume.basicInfo.name || '未命名简历',
          content: resume,
          rawText: '',
          filePath,
          fileType,
        });
        resume.id = saved.id;
      } catch (dbError) {
        console.error('保存数据库失败:', dbError);
      }
    }

    res.json({ success: true, data: resume });
  } catch (error) {
    console.error('简历解析失败:', error);
    res.status(500).json({ error: '简历解析失败', message: String(error) });
  }
});

// 导出简历为 PDF
router.post('/export-pdf', async (req: Request, res: Response) => {
  try {
    const { generateResumePDF } = await import('../services/pdf-export');
    const { resume, template, filename } = req.body;

    if (!resume) {
      return res.status(400).json({ error: '缺少 resume 参数' });
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
    console.error('PDF 导出失败:', error);
    res.status(500).json({
      error: 'PDF 导出失败',
      message: String(error),
      stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
    });
  }
});

// 预览简历 PDF
router.post('/preview-pdf', async (req: Request, res: Response) => {
  try {
    const { generateResumePDF } = await import('../services/pdf-export');
    const { resume, template } = req.body;

    if (!resume) {
      return res.status(400).json({ error: '缺少 resume 参数' });
    }

    const pdfBuffer = await generateResumePDF({
      resume,
      template: template as 'modern' | 'classic' | 'minimal',
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=resume-${resume.id || Date.now()}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF 预览失败:', error);
    res.status(500).json({
      error: 'PDF 预览失败',
      message: String(error),
      stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
    });
  }
});

// 获取简历版本列表
router.get('/:id/versions', async (req: Request, res: Response) => {
  try {
    const { getResumeVersions } = await import('../repositories/resume-repository');
    const versions = await getResumeVersions(req.params.id);
    res.json({ success: true, data: versions });
  } catch (error) {
    console.error('获取版本列表失败:', error);
    res.status(500).json({ error: '获取版本列表失败', message: String(error) });
  }
});

// 创建简历版本
router.post('/:id/versions', async (req: Request, res: Response) => {
  try {
    const { createResumeVersion } = await import('../repositories/resume-repository');
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: '缺少 content 参数' });
    }

    const newVersion = await createResumeVersion(req.params.id, content);
    res.json({ success: true, data: newVersion });
  } catch (error) {
    console.error('创建版本失败:', error);
    res.status(500).json({ error: '创建版本失败', message: String(error) });
  }
});

// 获取特定版本
router.get('/version/:versionId', async (req: Request, res: Response) => {
  try {
    const { getResumeById } = await import('../repositories/resume-repository');
    const version = await getResumeById(req.params.versionId);
    if (!version) {
      return res.status(404).json({ error: '版本不存在' });
    }
    res.json({ success: true, data: version });
  } catch (error) {
    console.error('获取版本失败:', error);
    res.status(500).json({ error: '获取版本失败', message: String(error) });
  }
});

// 恢复到特定版本
router.post('/version/:versionId/revert', async (req: Request, res: Response) => {
  try {
    const { getResumeById, createResumeVersion } = await import('../repositories/resume-repository');
    const version = await getResumeById(req.params.versionId);

    if (!version) {
      return res.status(404).json({ error: '版本不存在' });
    }

    const rootId = version.parentId || version.id;
    const newVersion = await createResumeVersion(rootId, version.content as any);

    res.json({ success: true, data: newVersion });
  } catch (error) {
    console.error('恢复版本失败:', error);
    res.status(500).json({ error: '恢复版本失败', message: String(error) });
  }
});

export default router;
