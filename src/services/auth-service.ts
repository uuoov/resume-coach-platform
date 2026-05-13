import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma, prismaAvailable } from './database';

const JWT_EXPIRES_IN = '24h';

// 内存存储（用于没有数据库连接时的测试）
const memoryUsers = new Map<string, any>();
let nextUserId = 1;

// 初始化一个默认测试账号，方便在没有数据库时登录测试
memoryUsers.set('user-0', {
  id: 'user-0',
  email: 'admin@example.com',
  name: '测试管理员',
  password: bcrypt.hashSync('123456', 10),
  createdAt: new Date(),
  updatedAt: new Date(),
});

export interface UserRegisterData {
  email: string;
  password: string;
  name?: string;
  avatar?: string;
}

export interface UserLoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  data?: {
    user: {
      id: string;
      email: string;
      name?: string | null;
      avatar?: string | null;
    };
    token: string;
  };
  error?: string;
  message?: string;
  statusCode?: number;
}

export class AuthService {
  private static normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private static normalizeName(name?: string): string | undefined {
    const trimmed = name?.trim();
    return trimmed || undefined;
  }

  private static validateRegisterData(data: UserRegisterData): string | null {
    const email = this.normalizeEmail(data.email || '');
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
      return '邮箱格式不正确';
    }

    if (!data.password || data.password.length < 6) {
      return '密码长度至少为 6 位';
    }

    return null;
  }

  private static validateLoginData(data: UserLoginData): string | null {
    const email = this.normalizeEmail(data.email || '');
    if (!email || !data.password) {
      return '邮箱和密码不能为空';
    }
    return null;
  }

  private static canUseMemoryAuth(): boolean {
    if (process.env.NODE_ENV === 'test') return true;
    if (process.env.AUTH_MEMORY_FALLBACK === 'true') return true;
    return process.env.NODE_ENV !== 'production' && !process.env.DATABASE_URL;
  }

  private static shouldUseDatabase(): boolean {
    if (process.env.NODE_ENV === 'test') return false;
    return prismaAvailable && Boolean(process.env.DATABASE_URL);
  }

  private static isUnsafeJwtSecret(secret: string): boolean {
    const placeholders = new Set([
      'default_jwt_secret',
      'replace_with_a_long_random_secret',
      'your_secure_jwt_secret_here',
      'resume-coach-dev-secret-key',
    ]);

    return placeholders.has(secret) || secret.length < 32;
  }

  private static getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (process.env.NODE_ENV === 'production' && (!secret || this.isUnsafeJwtSecret(secret))) {
      throw new Error('JWT_SECRET is missing or unsafe');
    }
    return secret || 'resume-coach-dev-secret-key';
  }

  private static isUniqueConstraintError(error: unknown): boolean {
    return typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2002';
  }

  private static async findMemoryUserByEmail(email: string) {
    return Array.from(memoryUsers.values()).find(
      (user: any) => user.email === email
    );
  }

  private static async registerInMemory(data: UserRegisterData): Promise<AuthResponse> {
    const email = this.normalizeEmail(data.email);
    const existingMemoryUser = await this.findMemoryUserByEmail(email);

    if (existingMemoryUser) {
      return {
        success: false,
        error: '该邮箱已被注册',
      };
    }

    const hashedPassword = await this.hashPassword(data.password);
    const user = {
      id: `user-${nextUserId++}`,
      email,
      name: this.normalizeName(data.name),
      avatar: data.avatar,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    memoryUsers.set(user.id, user);

    const token = this.generateToken(user.id);
    const { password: _password, ...userWithoutPassword } = user;

    return {
      success: true,
      data: {
        user: userWithoutPassword,
        token,
      },
    };
  }

  /**
   * 哈希密码
   */
  static async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  /**
   * 验证密码
   */
  static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  /**
   * 生成 JWT 令牌
   */
  static generateToken(userId: string): string {
    return jwt.sign(
      { userId },
      this.getJwtSecret(),
      { expiresIn: JWT_EXPIRES_IN }
    );
  }

  /**
   * 验证 JWT 令牌
   */
  static verifyToken(token: string): { userId: string } | null {
    try {
      return jwt.verify(token, this.getJwtSecret()) as { userId: string };
    } catch (error) {
      return null;
    }
  }

  /**
   * 用户注册
   */
  static async register(data: UserRegisterData): Promise<AuthResponse> {
    try {
      const validationError = this.validateRegisterData(data);
      if (validationError) {
        return {
          success: false,
          error: validationError,
        };
      }

      const email = this.normalizeEmail(data.email);
      const name = this.normalizeName(data.name);

      if (!this.shouldUseDatabase()) {
        if (this.canUseMemoryAuth()) {
          return this.registerInMemory({ ...data, email, name });
        }

        return {
          success: false,
          error: '数据库未配置，注册服务不可用',
          message: '请先配置 DATABASE_URL 后再启用注册功能',
          statusCode: 503,
        };
      }

      const existingUser = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });

      if (existingUser) {
        return {
          success: false,
          error: '该邮箱已被注册',
        };
      }

      const hashedPassword = await this.hashPassword(data.password);

      const user = await prisma.user.create({
        data: {
          email,
          name,
          avatar: data.avatar,
          password: hashedPassword,
        },
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      const token = this.generateToken(user.id);

      return {
        success: true,
        data: {
          user,
          token,
        },
      };

    } catch (error: unknown) {
      console.error('注册失败:', error);
      if (this.isUniqueConstraintError(error)) {
        return {
          success: false,
          error: '该邮箱已被注册',
        };
      }
      return {
        success: false,
        error: '注册服务暂时不可用',
        message: '数据库写入失败，账号未创建，请稍后重试',
        statusCode: 503,
      };
    }
  }

  /**
   * 用户登录
   */
  static async login(data: UserLoginData): Promise<AuthResponse> {
    try {
      const validationError = this.validateLoginData(data);
      if (validationError) {
        return {
          success: false,
          error: validationError,
        };
      }

      const email = this.normalizeEmail(data.email);

      if (!this.shouldUseDatabase()) {
        if (!this.canUseMemoryAuth()) {
          return {
            success: false,
            error: '数据库未配置，登录服务不可用',
            statusCode: 503,
          };
        }

        const memoryUser = await this.findMemoryUserByEmail(email);
        if (!memoryUser) {
          return {
            success: false,
            error: '邮箱或密码错误',
          };
        }

        const isValidPassword = await this.verifyPassword(data.password, memoryUser.password);
        if (!isValidPassword) {
          return { success: false, error: '邮箱或密码错误' };
        }
        const token = this.generateToken(memoryUser.id);
        const { password: _password, ...userWithoutPassword } = memoryUser;
        return { success: true, data: { user: userWithoutPassword, token } };
      }

      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          password: true,
          name: true,
          avatar: true,
          createdAt: true,
        },
      });

      if (!user) {
        return {
          success: false,
          error: '邮箱或密码错误',
        };
      }

      // 验证密码
      const isValidPassword = await this.verifyPassword(data.password, user.password);

      if (!isValidPassword) {
        return {
          success: false,
          error: '邮箱或密码错误',
        };
      }

      // 生成令牌
      const token = this.generateToken(user.id);

      // 移除密码字段
      const { password: _password, ...userWithoutPassword } = user;

      return {
        success: true,
        data: {
          user: userWithoutPassword,
          token,
        },
      };
    } catch (error) {
      console.error('登录失败:', error);
      return {
        success: false,
        error: '登录服务暂时不可用',
        message: '数据库查询失败，请稍后重试',
        statusCode: 503,
      };
    }
  }

  /**
   * 获取用户信息（通过令牌）
   */
  static async getUserByToken(token: string) {
    const decoded = this.verifyToken(token);
    if (!decoded) {
      return null;
    }

    if (!this.shouldUseDatabase()) {
      if (!this.canUseMemoryAuth()) return null;

      const user = memoryUsers.get(decoded.userId);
      if (user) {
        const { password: _password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      }

      return null;
    }

    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
        },
      });
      return dbUser;
    } catch {
      return null;
    }
  }
}
