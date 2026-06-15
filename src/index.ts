/**
 * Resume Coach Platform - 主入口文件
 *
 * AI 驱动的简历辅导平台
 * 针对公司 + 岗位的定向简历优化
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import * as path from 'path';
import helmet from 'helmet';
import compression from 'compression';

// 加载环境变量
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

import { config } from './config';
import { logger } from './utils/logger';
import { monitor } from './utils/monitor';
import { requestLogger, slowRequestLogger } from './middleware/request-logger';
import { apiRateLimiter } from './middleware/rate-limiter';

// 路由模块
import authRoutes from './routes/auth.routes';
import resumeRoutes from './routes/resume.routes';
import jdRoutes from './routes/jd.routes';
import matchRoutes from './routes/match.routes';
import optimizeRoutes from './routes/optimize.routes';
import companyRoutes from './routes/company.routes';

const app = express();
const PORT = config.server.port;
const frontendDistPath = path.resolve(process.cwd(), 'frontend', 'dist');
const frontendIndexPath = path.join(frontendDistPath, 'index.html');

// 生产环境安全和性能中间件
app.use(helmet({
  contentSecurityPolicy: config.server.env === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  } : false,
}));

app.use(compression());

// 请求日志中间件
app.use(requestLogger);
app.use(slowRequestLogger(5000));

// 中间件
app.use(express.json({ limit: config.server.requestLimit }));
app.use(express.urlencoded({ extended: true, limit: config.server.requestLimit }));
app.use('/uploads', express.static(process.env.FILE_STORAGE_PATH || './uploads'));
app.use(cors({
  origin: config.server.corsOrigin,
  credentials: true,
}));

// 健康检查（带详细监控信息）
app.get('/health', async (_req, res) => {
  try {
    const health = await monitor.healthCheck();
    res.json(health);
  } catch (error) {
    logger.error('健康检查失败', error instanceof Error ? error : undefined);
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    });
  }
});

// 监控指标端点
app.get('/metrics', (_req, res) => {
  const metrics = monitor.getMetrics();
  res.json({
    success: true,
    data: metrics,
  });
});

// API 路由入口
app.get('/api', (_req, res) => {
  res.json({
    name: 'Resume Coach Platform API',
    version: process.env.npm_package_version || '0.2.0',
    endpoints: {
      'POST /api/resume/parse': '解析简历',
      'POST /api/jd/analyze': '分析 JD',
      'POST /api/match/calculate': '计算匹配度',
      'POST /api/optimize/suggest': '获取优化建议',
      'POST /api/resume/export-pdf': '导出简历 PDF',
      'POST /api/resume/preview-pdf': '预览简历 PDF',
      'POST /api/resume/:id/versions': '创建简历版本',
      'GET /api/resume/:id/versions': '获取简历版本列表',
      'GET /api/resume/version/:versionId': '获取特定版本',
      'POST /api/resume/version/:versionId/revert': '恢复到特定版本',
      'GET /api/company/query': '查询公司信息',
      'POST /api/company/auto-query': '自动查询公司信息',
    },
  });
});

// 全局 API 限流：所有 /api/* 端点
app.use('/api', apiRateLimiter);

// 路由挂载
app.use('/api/auth', authRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/jd', jdRoutes);
app.use('/api/match', matchRoutes);
app.use('/api/optimize', optimizeRoutes);
app.use('/api/company', companyRoutes);

if (config.server.env === 'production') {
  app.use(express.static(frontendDistPath, {
    index: false,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  }));

  app.get('*', (req, res, next) => {
    if (
      req.path.startsWith('/api')
      || req.path.startsWith('/uploads')
      || req.path === '/health'
      || req.path === '/metrics'
    ) {
      return next();
    }

    return res.sendFile(frontendIndexPath, (error) => {
      if (error) {
        next(error);
      }
    });
  });
}

// 全局错误处理中间件（必须在所有路由之后定义）
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('全局错误', err instanceof Error ? err : undefined, 'express');

  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: '文件大小超过限制',
        message: '请上传小于 10MB 的文件',
        code: 'FILE_TOO_LARGE'
      });
    }
    return res.status(400).json({
      success: false,
      error: '文件上传错误',
      message: err.message,
      code: err.code
    });
  }

  if (err.message && err.message.includes('只支持 PDF 和 Word 文件格式')) {
    return res.status(400).json({
      success: false,
      error: '文件格式不支持',
      message: '只支持 PDF 和 Word 文件格式',
      code: 'INVALID_FILE_TYPE'
    });
  }

  res.status(err.status || 500).json({
    success: false,
    error: err.error || '服务器内部错误',
    message: err.message || '服务器遇到了意外错误',
    code: err.code || 'INTERNAL_ERROR'
  });
});

// 启动服务器
if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   Resume Coach Platform - 简历辅导平台                     ║
║                                                           ║
║   服务器已启动：http://localhost:${PORT}                     ║
║   健康检查：http://localhost:${PORT}/health                  ║
║   监控指标：http://localhost:${PORT}/metrics                 ║
║                                                           ║
║   核心功能：                                               ║
║   - 简历解析 (PDF/Word)                                   ║
║   - JD 分析                                               ║
║   - 匹配度计算                                            ║
║   - 优化建议生成                                          ║
║   - PDF 导出/预览                                         ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    `);
  });
}

export default app;
