/**
 * 限流中间件测试
 *
 * 用真实的 Express app + supertest 验证 express-rate-limit 行为。
 * 这比直接 mock req/res 更可靠（express-rate-limit 依赖 app 与请求生命周期）。
 *
 * 校验：
 *   1. NODE_ENV=test 时跳过限流（保证其他测试套件不被阻塞）
 *   2. 非 test 环境下，AI 端点超过 30 次后返回 429
 *   3. 不同 IP 独立计数
 */

import type { Request, Response } from 'express';
import request from 'supertest';

const originalNodeEnv = process.env.NODE_ENV;

function buildAppWithLimiter() {
  const express = require('express');
  // 重新 require，确保每个测试拿到新鲜的 limiter 实例（避免计数器跨用例污染）
  const { aiRateLimiter, apiRateLimiter } = require('../src/middleware/rate-limiter');
  const app = express();
  app.use(express.json());

  // 让 req.ip 从 X-Forwarded-For 读，方便用 supertest 模拟多 IP
  app.set('trust proxy', true);

  app.post('/ai-heavy', aiRateLimiter, (_req: Request, res: Response) => {
    res.json({ ok: true });
  });
  app.post('/general', apiRateLimiter, (_req: Request, res: Response) => {
    res.json({ ok: true });
  });
  return app;
}

describe('限流中间件', () => {
  afterEach(() => {
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
    jest.resetModules();
  });

  it('NODE_ENV=test 时跳过限流，任意调用次数都放行', async () => {
    process.env.NODE_ENV = 'test';
    const app = buildAppWithLimiter();

    // 连续 35 次（超过阈值 30），都应 200
    for (let i = 0; i < 35; i++) {
      const res = await request(app)
        .post('/ai-heavy')
        .set('X-Forwarded-For', '1.2.3.4');
      expect(res.status).toBe(200);
    }
  });

  it('非 test 环境下，AI 端点超过 30 次后返回 429', async () => {
    process.env.NODE_ENV = 'production';
    const app = buildAppWithLimiter();

    // 30 次放行
    for (let i = 0; i < 30; i++) {
      const res = await request(app)
        .post('/ai-heavy')
        .set('X-Forwarded-For', '10.0.0.1');
      expect(res.status).toBe(200);
    }

    // 第 31 次：429
    const blocked = await request(app)
      .post('/ai-heavy')
      .set('X-Forwarded-For', '10.0.0.1');
    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual(
      expect.objectContaining({ code: 'RATE_LIMIT_EXCEEDED' })
    );
  });

  it('不同 IP 独立计数', async () => {
    process.env.NODE_ENV = 'production';
    const app = buildAppWithLimiter();

    // IP-A 打 50 次，IP-B 打 50 次（均 < apiRateLimiter 阈值 100）
    for (let i = 0; i < 50; i++) {
      const a = await request(app)
        .post('/general')
        .set('X-Forwarded-For', '10.0.0.1');
      expect(a.status).toBe(200);
      const b = await request(app)
        .post('/general')
        .set('X-Forwarded-For', '10.0.0.2');
      expect(b.status).toBe(200);
    }
  });
});
