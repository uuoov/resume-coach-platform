/**
 * Admin 中间件测试
 *   - requireAdmin: 无 token → 401；普通用户 → 403；admin → 通过
 *   - DISABLED 用户 → 403
 */

import type { Request, Response, NextFunction } from 'express';
import { AuthService } from '../src/services/auth-service';

jest.mock('../src/services/auth-service', () => ({
  AuthService: {
    verifyToken: jest.fn(),
    getUserByToken: jest.fn(),
  },
}));

import { requireAdmin } from '../src/middleware/admin-middleware';

const mockRequest = (headers: Record<string, string> = {}): Partial<Request> => ({
  headers,
});

const mockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

async function runMiddlewareChain(
  middlewares: Array<(req: Request, res: Response, next: NextFunction) => unknown>,
  req: Partial<Request>,
  res: Partial<Response>
): Promise<void> {
  for (let i = 0; i < middlewares.length; i++) {
    const mw = middlewares[i];
    let calledNext = false;
    const next: NextFunction = (() => {
      calledNext = true;
    }) as unknown as NextFunction;

    await mw(req as Request, res as Response, next);

    if (!calledNext) {
      // 中间件没有调 next，说明已经 res.status/json 了，终止链
      return;
    }
  }
}

describe('requireAdmin middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('无 Authorization header → 401', async () => {
    const req = mockRequest();
    const res = mockResponse();
    const middlewares = requireAdmin as Array<(req: Request, res: Response, next: NextFunction) => unknown>;

    await runMiddlewareChain(middlewares, req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('有效 token + 普通用户 → 403', async () => {
    const req = mockRequest({ authorization: 'Bearer valid-token' });
    const res = mockResponse();

    (AuthService.verifyToken as jest.Mock).mockReturnValue({ userId: 'u-1' });
    (AuthService.getUserByToken as jest.Mock).mockResolvedValue({
      id: 'u-1',
      email: 'normal@example.com',
      role: 'USER',
      status: 'ACTIVE',
    });

    const middlewares = requireAdmin as Array<(req: Request, res: Response, next: NextFunction) => unknown>;
    await runMiddlewareChain(middlewares, req, res);

    expect((req as any).user).toBeDefined();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('有效 token + ADMIN → 通过', async () => {
    const req = mockRequest({ authorization: 'Bearer valid-token' });
    const res = mockResponse();

    (AuthService.verifyToken as jest.Mock).mockReturnValue({ userId: 'u-1' });
    (AuthService.getUserByToken as jest.Mock).mockResolvedValue({
      id: 'u-1',
      email: 'admin@example.com',
      role: 'ADMIN',
      status: 'ACTIVE',
    });

    const middlewares = requireAdmin as Array<(req: Request, res: Response, next: NextFunction) => unknown>;
    await runMiddlewareChain(middlewares, req, res);

    expect(res.status).not.toHaveBeenCalledWith(403);
    expect((req as any).user.role).toBe('ADMIN');
  });

  it('已封禁账号（DISABLED）→ 403', async () => {
    const req = mockRequest({ authorization: 'Bearer valid-token' });
    const res = mockResponse();

    (AuthService.verifyToken as jest.Mock).mockReturnValue({ userId: 'u-1' });
    (AuthService.getUserByToken as jest.Mock).mockResolvedValue({
      id: 'u-1',
      email: 'banned@example.com',
      role: 'USER',
      status: 'DISABLED',
    });

    const middlewares = requireAdmin as Array<(req: Request, res: Response, next: NextFunction) => unknown>;
    await runMiddlewareChain(middlewares, req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });
});
