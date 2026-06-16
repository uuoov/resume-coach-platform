/**
 * AI 审计埋点测试
 *
 * 验证：
 *   - generateWithAudit 在成功时调用 client.generateWithRetry 并写入 AiCallLog
 *   - 失败时仍写入 AiCallLog（success=false）
 *   - 异常向上抛出
 *   - 成本估算正确
 */

jest.mock('@prisma/client', () => {
  const makeDelegate = () => ({
    findUnique: jest.fn().mockResolvedValue(null),
    findFirst: jest.fn().mockResolvedValue(null),
    findMany: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockResolvedValue({ id: 'log-1' }),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
    aggregate: jest.fn().mockResolvedValue({}),
    groupBy: jest.fn().mockResolvedValue([]),
    upsert: jest.fn(),
  });

  const mockPrismaClient = {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
    company: makeDelegate(),
    resume: makeDelegate(),
    jD: makeDelegate(),
    matchRecord: makeDelegate(),
    user: makeDelegate(),
    aiCallLog: makeDelegate(),
  };

  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

import { PrismaClient } from '@prisma/client';
import { generateWithAudit } from '../src/services/ai-audit';
import { estimateCost } from '../src/utils/ai-cost';

const prisma = new PrismaClient();

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ai-audit - generateWithAudit', () => {
  it('成功路径：调用底层 client + 写入 success=true 日志', async () => {
    const fakeClient = {
      generateWithRetry: jest.fn().mockResolvedValue({
        text: 'AI 返回内容',
        usage: {
          promptTokens: 100,
          completionTokens: 200,
          totalTokens: 300,
        },
      }),
    };

    const response = await generateWithAudit(
      fakeClient,
      { service: 'jd-analyzer' },
      'hello prompt',
      3,
      { temperature: 0 }
    );

    expect(response.text).toBe('AI 返回内容');
    expect(response.usage.totalTokens).toBe(300);
    expect(fakeClient.generateWithRetry).toHaveBeenCalledWith('hello prompt', 3, { temperature: 0 });

    // 等待 setImmediate + microtask 完成
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(prisma.aiCallLog.create).toHaveBeenCalled();
    const args = (prisma.aiCallLog.create as jest.Mock).mock.calls[0][0];
    expect(args.data.service).toBe('jd-analyzer');
    expect(args.data.success).toBe(true);
    expect(args.data.promptChars).toBe('hello prompt'.length);
    expect(args.data.responseChars).toBe('AI 返回内容'.length);
    expect(args.data.totalTokens).toBe(300);
  });

  it('失败路径：仍写入 success=false + 异常向上抛', async () => {
    const fakeClient = {
      generateWithRetry: jest.fn().mockRejectedValue(new Error('upstream 500')),
    };

    await expect(
      generateWithAudit(fakeClient, { service: 'matching-engine' }, 'p', 3)
    ).rejects.toThrow(/upstream 500/);

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(prisma.aiCallLog.create).toHaveBeenCalled();
    const args = (prisma.aiCallLog.create as jest.Mock).mock.calls[0][0];
    expect(args.data.success).toBe(false);
    expect(args.data.errorMessage).toContain('upstream 500');
    expect(args.data.responseChars).toBe(0);
  });

  it('不传 usage 时 token 字段写 null', async () => {
    const fakeClient = {
      generateWithRetry: jest.fn().mockResolvedValue({
        text: 'no usage',
      }),
    };

    await generateWithAudit(fakeClient, { service: 'resume-parser' }, 'p', 3);

    await new Promise((resolve) => setTimeout(resolve, 50));

    const args = (prisma.aiCallLog.create as jest.Mock).mock.calls[0][0];
    expect(args.data.promptTokens).toBeNull();
    expect(args.data.completionTokens).toBeNull();
    expect(args.data.totalTokens).toBeNull();
  });
});

describe('ai-cost - estimateCost', () => {
  it('DeepSeek deepseek-chat 单价估算正确', () => {
    const cost = estimateCost('deepseek', 'deepseek-chat', 1000, 1000);
    // 0.00014 + 0.00028 = 0.00042 USD
    expect(cost).toBeCloseTo(0.0004, 3);
  });

  it('未知 model 走默认单价', () => {
    const cost = estimateCost('unknown', 'unknown-model', 1000, 1000);
    expect(cost).toBeGreaterThan(0);
  });

  it('CNY 价格按 7.2 折算为 USD', () => {
    const cost = estimateCost('dashscope', 'qwen-plus', 1000, 1000);
    // (0.004 + 0.012) / 7.2 ≈ 0.00222
    expect(cost).toBeGreaterThan(0.001);
    expect(cost).toBeLessThan(0.004);
  });

  it('null tokens 时返回 0', () => {
    const cost = estimateCost('deepseek', 'deepseek-chat', null, null);
    expect(cost).toBe(0);
  });
});
