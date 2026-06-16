/**
 * AI 调用审计封装
 *
 * 提供 generateWithAudit 包装函数：
 *   - 调用底层 client.generateWithRetry
 *   - 异步写入 AiCallLog（成功 / 失败都写）
 *   - 不阻塞主流程，写入失败只 warn
 *
 * 5 处 caller（resume-parser / jd-analyzer / matching-engine / optimization-advisor / company-info-service）
 * 全部替换为调用此包装。
 */

import { getConfiguredAIClientConfig } from '../utils/ai-client';
import { estimateCost } from '../utils/ai-cost';
import { createLog } from '../repositories/ai-log-repository';
import { prismaAvailable } from './database';
import { logger } from '../utils/logger';

export interface AuditContext {
  service: string;
  userId?: string | null;
  /** 可选：覆盖默认 provider/model（当 caller 自定义时） */
  providerOverride?: string;
  modelOverride?: string;
}

/**
 * 写入审计日志（异步、best-effort）
 * 不抛错；prisma 不可用时静默跳过。
 */
function writeAudit(params: {
  service: string;
  userId?: string | null;
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
}): void {
  if (!prismaAvailable) {
    return;
  }

  // 异步执行，不阻塞主流程
  setImmediate(async () => {
    try {
      const cost = estimateCost(
        params.provider,
        params.model,
        params.promptTokens,
        params.completionTokens
      );
      logger.debug('AI 审计写入', 'audit', {
        service: params.service,
        model: params.model,
        tokens: params.totalTokens,
        costUSD: cost,
      });

      await createLog({
        userId: params.userId ?? null,
        service: params.service,
        provider: params.provider,
        model: params.model,
        temperature: params.temperature ?? null,
        promptChars: params.promptChars,
        responseChars: params.responseChars,
        promptTokens: params.promptTokens ?? null,
        completionTokens: params.completionTokens ?? null,
        totalTokens: params.totalTokens ?? null,
        latencyMs: params.latencyMs,
        success: params.success,
        errorMessage: params.errorMessage ?? null,
      });
    } catch (err) {
      logger.warn('AI 审计写入失败', 'audit', {
        service: params.service,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });
}

/**
 * 包装函数：接受一个 client（已实现 generateWithRetry），并写入审计日志。
 *
 * 用法：
 *   const client = createConfiguredAIClient();
 *   if (!client) { return fallback; }
 *   const response = await generateWithAudit(
 *     client,
 *     { service: 'jd-analyzer', userId: req.userId },
 *     prompt,
 *     3,
 *     { temperature: 0 }
 *   );
 */
export async function generateWithAudit<TClient extends { generateWithRetry: (prompt: string, maxRetries?: number, opts?: any) => Promise<{ text: string; usage?: any }> }>(
  client: TClient,
  ctx: AuditContext,
  prompt: string,
  maxRetries: number = 3,
  opts?: { temperature?: number }
): Promise<{ text: string; usage?: any }> {
  const cfg = getConfiguredAIClientConfig();
  const provider = ctx.providerOverride || cfg?.provider || 'unknown';
  const model = ctx.modelOverride || cfg?.model || 'unknown';
  const temperature = opts?.temperature ?? null;
  const startedAt = Date.now();

  try {
    const response = await client.generateWithRetry(prompt, maxRetries, opts);
    const latencyMs = Date.now() - startedAt;

    writeAudit({
      service: ctx.service,
      userId: ctx.userId,
      provider,
      model,
      temperature,
      promptChars: prompt.length,
      responseChars: response.text?.length ?? 0,
      promptTokens: response.usage?.promptTokens ?? null,
      completionTokens: response.usage?.completionTokens ?? null,
      totalTokens: response.usage?.totalTokens ?? null,
      latencyMs,
      success: true,
    });

    return response;
  } catch (error) {
    const latencyMs = Date.now() - startedAt;
    const errorMessage = error instanceof Error ? error.message : String(error);

    writeAudit({
      service: ctx.service,
      userId: ctx.userId,
      provider,
      model,
      temperature,
      promptChars: prompt.length,
      responseChars: 0,
      latencyMs,
      success: false,
      errorMessage,
    });

    throw error;
  }
}
