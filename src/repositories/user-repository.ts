/**
 * 用户仓库层
 * 为 Admin 后台提供用户列表 / 搜索 / 角色切换 / 状态管理
 */

import { requirePrisma } from '../services/database';

export interface ListUsersOptions {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: 'ACTIVE' | 'DISABLED';
  role?: 'USER' | 'ADMIN';
}

export interface UpdateUserInput {
  role?: 'USER' | 'ADMIN';
  status?: 'ACTIVE' | 'DISABLED';
}

/**
 * 列表 + 分页 + 搜索 + 状态/角色过滤
 */
export async function listUsers(options: ListUsersOptions = {}) {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 20));
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {};
  if (options.status) {
    where.status = options.status;
  }
  if (options.role) {
    where.role = options.role;
  }
  if (options.q) {
    where.OR = [
      { email: { contains: options.q, mode: 'insensitive' } },
      { name: { contains: options.q, mode: 'insensitive' } },
    ];
  }

  const [items, total] = await Promise.all([
    requirePrisma().user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: pageSize,
      skip,
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        status: true,
        disabledAt: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    requirePrisma().user.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * 根据 email 获取用户
 */
export async function getUserByEmail(email: string) {
  return requirePrisma().user.findUnique({
    where: { email },
  });
}

/**
 * 更新用户角色 / 状态
 */
export async function updateUser(id: string, input: UpdateUserInput) {
  const data: Record<string, unknown> = {};
  if (input.role) {
    data.role = input.role;
  }
  if (input.status) {
    data.status = input.status;
    data.disabledAt = input.status === 'DISABLED' ? new Date() : null;
  }

  return requirePrisma().user.update({
    where: { id },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      avatar: true,
      role: true,
      status: true,
      disabledAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/**
 * 按角色统计用户数
 */
export async function countUsersByRole() {
  const grouped = await requirePrisma().user.groupBy({
    by: ['role'],
    _count: { _all: true },
  });
  return grouped;
}

/**
 * 统计今日新增用户
 */
export async function countUsersRegisteredSince(since: Date) {
  return requirePrisma().user.count({
    where: { createdAt: { gte: since } },
  });
}

/**
 * 统计 DAU（按 updatedAt 近 24h 近似）
 * 注意：这是简化版，准确 DAU 需要单独的活动日志表
 */
export async function countActiveUsersSince(since: Date) {
  return requirePrisma().user.count({
    where: { updatedAt: { gte: since } },
  });
}
