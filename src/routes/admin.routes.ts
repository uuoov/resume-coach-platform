/**
 * Admin 后台路由
 *
 * 端点：
 *   GET    /api/admin/dashboard        今日注册/DAU/AI 调用/PDF 导出/错误率 聚合
 *   GET    /api/admin/system           聚合 /metrics + /health
 *   GET    /api/admin/users            用户列表 + 分页 + 搜索
 *   PATCH  /api/admin/users/:id        更新用户 role / status
 *   GET    /api/admin/companies        公司列表 + 分页
 *   POST   /api/admin/companies        新建 Mock 公司
 *   PATCH  /api/admin/companies/:id    编辑
 *   DELETE /api/admin/companies/:id    删除（仅 source='mock' | 'manual'）
 *   GET    /api/admin/ai-logs          AI 调用日志列表 + 过滤
 *   GET    /api/admin/ai-logs/stats    按 service 聚合 token/成本
 */

import { Router, type Request, type Response } from 'express';
import { requireAdmin } from '../middleware/admin-middleware';
import { monitor } from '../utils/monitor';
import { logger } from '../utils/logger';
import {
  listUsers,
  updateUser,
  countUsersRegisteredSince,
  countActiveUsersSince,
  countUsersByRole,
} from '../repositories/user-repository';
import {
  listCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
  getCompanyById,
} from '../repositories/company-repository';
import { listLogs, getStats } from '../repositories/ai-log-repository';
import { invalidateCompanyCache } from '../services/company-info-service';
import { prismaAvailable, requirePrisma } from '../services/database';

const router = Router();

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

/**
 * Dashboard：今日注册 / DAU / AI 调用量 / PDF 导出 / 错误率 聚合
 */
router.get('/dashboard', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const today = startOfToday();
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const last7d = daysAgo(7);

    const [
      todayRegistrations,
      dau,
      userRoleStats,
      recentAiLogs,
    ] = await Promise.all([
      countUsersRegisteredSince(today).catch(() => 0),
      countActiveUsersSince(last24h).catch(() => 0),
      countUsersByRole().catch(() => []),
      getStats({ since: last7d }).catch(() => []),
    ]);

    const aiCalls7d = recentAiLogs.reduce((sum: number, r: any) => sum + (r.totalCalls || 0), 0);
    const aiErrors7d = recentAiLogs.reduce((sum: number, r: any) => sum + (r.failureCalls || 0), 0);
    const aiTokens7d = recentAiLogs.reduce((sum: number, r: any) => sum + (r.totalTokens || 0), 0);

    // PDF 导出量（暂无独立埋点；用 MatchRecord 近 7 天数量近似为业务调用量）
    let pdfExports7d = 0;
    if (prismaAvailable) {
      try {
        pdfExports7d = await requirePrisma().matchRecord.count({
          where: { createdAt: { gte: last7d } },
        });
      } catch {
        pdfExports7d = 0;
      }
    }

    const errorRate = aiCalls7d > 0 ? Math.round((aiErrors7d / aiCalls7d) * 1000) / 10 : 0;

    res.json({
      success: true,
      data: {
        todayRegistrations,
        dau,
        aiCalls7d,
        aiErrors7d,
        aiTokens7d,
        aiErrorRate: errorRate,
        pdfExports7d,
        userRoleStats,
        aiServiceBreakdown: recentAiLogs,
      },
    });
  } catch (error) {
    logger.error('admin dashboard 失败', error instanceof Error ? error : undefined, 'admin-routes');
    res.status(500).json({
      success: false,
      error: '获取仪表盘数据失败',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * 系统健康聚合：monitor + 限流触发数（暂无埋点，留扩展位）
 */
router.get('/system', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const [health, metrics] = await Promise.all([
      monitor.healthCheck(),
      Promise.resolve(monitor.getMetrics()),
    ]);

    res.json({
      success: true,
      data: {
        health,
        metrics,
        rateLimit: {
          note: '限流触发数暂未埋点，后续扩展',
        },
      },
    });
  } catch (error) {
    logger.error('admin system 失败', error instanceof Error ? error : undefined, 'admin-routes');
    res.status(500).json({
      success: false,
      error: '获取系统状态失败',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * 用户列表
 * ?q=&status=&role=&page=&pageSize=
 */
router.get('/users', requireAdmin, async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string | undefined)?.trim() || undefined;
    const status = req.query.status as 'ACTIVE' | 'DISABLED' | undefined;
    const role = req.query.role as 'USER' | 'ADMIN' | undefined;
    const page = parseInt((req.query.page as string) || '1', 10);
    const pageSize = parseInt((req.query.pageSize as string) || '20', 10);

    const result = await listUsers({
      q,
      status,
      role,
      page: Number.isFinite(page) ? page : 1,
      pageSize: Number.isFinite(pageSize) ? pageSize : 20,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('admin users 失败', error instanceof Error ? error : undefined, 'admin-routes');
    res.status(500).json({
      success: false,
      error: '获取用户列表失败',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * 更新用户角色 / 状态
 */
router.patch('/users/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role, status } = req.body as {
      role?: 'USER' | 'ADMIN';
      status?: 'ACTIVE' | 'DISABLED';
    };

    if (!role && !status) {
      return res.status(400).json({
        success: false,
        error: '未提供 role 或 status',
      });
    }

    if (role && role !== 'USER' && role !== 'ADMIN') {
      return res.status(400).json({
        success: false,
        error: '非法的 role 值',
      });
    }

    if (status && status !== 'ACTIVE' && status !== 'DISABLED') {
      return res.status(400).json({
        success: false,
        error: '非法的 status 值',
      });
    }

    // 禁止自我降级 / 自我封禁，避免锁死
    if (req.user?.id === id) {
      return res.status(400).json({
        success: false,
        error: '不能修改自己的角色或状态',
      });
    }

    const updated = await updateUser(id, { role, status });
    res.json({ success: true, data: updated });
  } catch (error) {
    logger.error('admin 更新用户失败', error instanceof Error ? error : undefined, 'admin-routes');
    res.status(500).json({
      success: false,
      error: '更新用户失败',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * 公司列表
 */
router.get('/companies', requireAdmin, async (req: Request, res: Response) => {
  try {
    const source = req.query.source as string | undefined;
    const keyword = (req.query.keyword as string | undefined)?.trim() || undefined;
    const page = parseInt((req.query.page as string) || '1', 10);
    const pageSize = parseInt((req.query.pageSize as string) || '20', 10);

    const result = await listCompanies({
      source,
      keyword,
      page: Number.isFinite(page) ? page : 1,
      pageSize: Number.isFinite(pageSize) ? pageSize : 20,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('admin companies 失败', error instanceof Error ? error : undefined, 'admin-routes');
    res.status(500).json({
      success: false,
      error: '获取公司列表失败',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * 新建公司（source 默认 'manual'）
 */
router.post('/companies', requireAdmin, async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const { name, industry, size, location, website, description, culture, techStack, source } = body as any;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({
        success: false,
        error: '缺少 name',
      });
    }

    const created = await createCompany({
      name,
      industry,
      size,
      location,
      website,
      description,
      culture,
      techStack: Array.isArray(techStack) ? techStack : undefined,
      source: source || 'manual',
    });

    await invalidateCompanyCache(name);

    res.status(201).json({ success: true, data: created });
  } catch (error) {
    logger.error('admin 新建公司失败', error instanceof Error ? error : undefined, 'admin-routes');
    res.status(500).json({
      success: false,
      error: '新建公司失败',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * 编辑公司
 */
router.patch('/companies/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = { ...req.body };
    delete body.id;
    delete body.createdAt;
    delete body.updatedAt;

    const existing = await getCompanyById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: '公司不存在',
      });
    }

    const updated = await updateCompany(id, body);
    await invalidateCompanyCache(existing.name);
    if (typeof body.name === 'string' && body.name !== existing.name) {
      await invalidateCompanyCache(body.name);
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    logger.error('admin 编辑公司失败', error instanceof Error ? error : undefined, 'admin-routes');
    res.status(500).json({
      success: false,
      error: '编辑公司失败',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * 删除公司（仅 source='mock' | 'manual'，禁止删除 'search' 抓取的真实数据）
 */
router.delete('/companies/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await getCompanyById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: '公司不存在',
      });
    }

    if (existing.source === 'search') {
      return res.status(400).json({
        success: false,
        error: '禁止删除搜索抓取的公司数据；请使用 PATCH 将其置为空或调整字段',
      });
    }

    await deleteCompany(id);
    await invalidateCompanyCache(existing.name);

    res.json({ success: true, data: { id } });
  } catch (error) {
    logger.error('admin 删除公司失败', error instanceof Error ? error : undefined, 'admin-routes');
    res.status(500).json({
      success: false,
      error: '删除公司失败',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * AI 调用日志列表
 * ?service=&userId=&success=&since=&page=&pageSize=
 */
router.get('/ai-logs', requireAdmin, async (req: Request, res: Response) => {
  try {
    const service = req.query.service as string | undefined;
    const userId = req.query.userId as string | undefined;
    const successRaw = req.query.success as string | undefined;
    const sinceRaw = req.query.since as string | undefined;
    const page = parseInt((req.query.page as string) || '1', 10);
    const pageSize = parseInt((req.query.pageSize as string) || '20', 10);

    let success: boolean | undefined;
    if (successRaw === 'true') success = true;
    if (successRaw === 'false') success = false;

    let since: Date | undefined;
    if (sinceRaw) {
      const parsed = new Date(sinceRaw);
      if (!isNaN(parsed.getTime())) {
        since = parsed;
      }
    }

    const result = await listLogs({
      service,
      userId,
      success,
      since,
      page: Number.isFinite(page) ? page : 1,
      pageSize: Number.isFinite(pageSize) ? pageSize : 20,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('admin ai-logs 失败', error instanceof Error ? error : undefined, 'admin-routes');
    res.status(500).json({
      success: false,
      error: '获取 AI 调用日志失败',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * AI 调用统计：按 service 聚合 token / 成本（近 7/30 天）
 * ?days=7
 */
router.get('/ai-logs/stats', requireAdmin, async (req: Request, res: Response) => {
  try {
    const days = Math.min(90, Math.max(1, parseInt((req.query.days as string) || '7', 10) || 7));
    const since = daysAgo(days);

    const stats = await getStats({ since });

    res.json({ success: true, data: { days, since, stats } });
  } catch (error) {
    logger.error('admin ai-logs stats 失败', error instanceof Error ? error : undefined, 'admin-routes');
    res.status(500).json({
      success: false,
      error: '获取 AI 统计失败',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
