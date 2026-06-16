/**
 * AI 调用审计仓库层
 */

import { requirePrisma } from '../services/database';

export interface CreateAiLogInput {
  userId?: string | null;
  service: string;
  provider: string;
  model: string;
  temperature?: number | null;
  promptChars: number;
  responseChars: number;
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
  latencyMs: number;
  success: boolean;
  errorMessage?: string | null;
}

export interface ListAiLogsOptions {
  page?: number;
  pageSize?: number;
  service?: string;
  userId?: string;
  success?: boolean;
  since?: Date;
}

/**
 * 写入一条 AI 调用日志
 */
export async function createLog(input: CreateAiLogInput) {
  return requirePrisma().aiCallLog.create({
    data: {
      userId: input.userId ?? null,
      service: input.service,
      provider: input.provider,
      model: input.model,
      temperature: input.temperature ?? null,
      promptChars: input.promptChars,
      responseChars: input.responseChars,
      promptTokens: input.promptTokens ?? null,
      completionTokens: input.completionTokens ?? null,
      totalTokens: input.totalTokens ?? null,
      latencyMs: input.latencyMs,
      success: input.success,
      errorMessage: input.errorMessage ?? null,
    },
  });
}

/**
 * 列表 + 分页 + 过滤
 */
export async function listLogs(options: ListAiLogsOptions = {}) {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 20));
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {};
  if (options.service) {
    where.service = options.service;
  }
  if (options.userId) {
    where.userId = options.userId;
  }
  if (typeof options.success === 'boolean') {
    where.success = options.success;
  }
  if (options.since) {
    where.createdAt = { gte: options.since };
  }

  const [items, total] = await Promise.all([
    requirePrisma().aiCallLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: pageSize,
      skip,
    }),
    requirePrisma().aiCallLog.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export interface AiLogStatsOptions {
  since: Date;
}

/**
 * 按 service 聚合 token 数、调用次数、成功失败数
 */
export async function getStats(options: AiLogStatsOptions) {
  const grouped = await requirePrisma().aiCallLog.groupBy({
    by: ['service'],
    where: { createdAt: { gte: options.since } },
    _count: { _all: true, success: true },
    _sum: {
      promptTokens: true,
      completionTokens: true,
      totalTokens: true,
      latencyMs: true,
    },
  });

  return grouped.map((row: any) => ({
    service: row.service,
    totalCalls: row._count._all,
    successCalls: row._count.success,
    failureCalls: row._count._all - row._count.success,
    promptTokens: row._sum.promptTokens ?? 0,
    completionTokens: row._sum.completionTokens ?? 0,
    totalTokens: row._sum.totalTokens ?? 0,
    latencyMs: row._sum.latencyMs ?? 0,
  }));
}
