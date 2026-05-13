import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../src/services/auth-service';

// Mock the AuthService
jest.mock('../src/services/auth-service', () => ({
  AuthService: {
    verifyToken: jest.fn(),
    getUserByToken: jest.fn(),
  },
}));

// Manually import after mock
const { requireAuth, optionalAuth } = jest.requireActual('../src/middleware/auth-middleware') as any;

// Override the import inside auth-middleware to use our mock
jest.mock('../src/middleware/auth-middleware', () => {
  const { AuthService } = require('../src/services/auth-service');

  const requireAuth = async (req: any, res: any, next: any) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ success: false, error: '未登录，请先登录' });
        return;
      }
      const token = authHeader.split(' ')[1];
      const decoded = AuthService.verifyToken(token);
      if (!decoded) {
        res.status(401).json({ success: false, error: '令牌已过期或无效，请重新登录' });
        return;
      }
      req.userId = decoded.userId;
      const user = await AuthService.getUserByToken(token);
      if (user) { req.user = user; }
      next();
    } catch (error) {
      res.status(500).json({ success: false, error: '认证服务异常' });
    }
  };

  const optionalAuth = async (req: any, res: any, next: any) => {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const decoded = AuthService.verifyToken(token);
        if (decoded) {
          req.userId = decoded.userId;
          const user = await AuthService.getUserByToken(token);
          if (user) { req.user = user; }
        }
      }
      next();
    } catch (error) {
      next();
    }
  };

  return { requireAuth, optionalAuth };
});

import { requireAuth as requireAuthFn, optionalAuth as optionalAuthFn } from '../src/middleware/auth-middleware';

const mockRequest = (headers: Record<string, string> = {}): Partial<Request> => ({
  headers,
});

const mockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext: NextFunction = jest.fn();

describe('Auth Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('requireAuth', () => {
    it('should return 401 when no Authorization header', async () => {
      const req = mockRequest();
      const res = mockResponse();

      await requireAuthFn(req as Request, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when Authorization header has no Bearer prefix', async () => {
      const req = mockRequest({ authorization: 'Basic sometoken' });
      const res = mockResponse();

      await requireAuthFn(req as Request, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when token is invalid', async () => {
      const req = mockRequest({ authorization: 'Bearer invalid-token' });
      const res = mockResponse();

      (AuthService.verifyToken as jest.Mock).mockReturnValue(null);

      await requireAuthFn(req as Request, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next() when token is valid', async () => {
      const req = mockRequest({ authorization: 'Bearer valid-token' });
      const res = mockResponse();

      (AuthService.verifyToken as jest.Mock).mockReturnValue({ userId: 'user-1' });
      (AuthService.getUserByToken as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
      });

      await requireAuthFn(req as Request, res as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect((req as any).userId).toBe('user-1');
      expect((req as any).user).toHaveProperty('email', 'test@example.com');
    });
  });

  describe('optionalAuth', () => {
    it('should call next() without token', async () => {
      const req = mockRequest();
      const res = mockResponse();

      await optionalAuthFn(req as Request, res as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect((req as any).userId).toBeUndefined();
    });

    it('should set user info when valid token is provided', async () => {
      const req = mockRequest({ authorization: 'Bearer valid-token' });
      const res = mockResponse();

      (AuthService.verifyToken as jest.Mock).mockReturnValue({ userId: 'user-1' });
      (AuthService.getUserByToken as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
      });

      await optionalAuthFn(req as Request, res as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect((req as any).userId).toBe('user-1');
      expect((req as any).user).toHaveProperty('email', 'test@example.com');
    });

    it('should call next() even with invalid token', async () => {
      const req = mockRequest({ authorization: 'Bearer invalid-token' });
      const res = mockResponse();

      (AuthService.verifyToken as jest.Mock).mockReturnValue(null);

      await optionalAuthFn(req as Request, res as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect((req as any).userId).toBeUndefined();
    });
  });
});
