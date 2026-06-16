/**
 * 公司信息仓库层
 * 封装公司信息的 CRUD 操作
 */

import { requirePrisma } from '../services/database';

export interface CreateCompanyInput {
  name: string;
  industry?: string;
  size?: string;
  location?: string;
  website?: string;
  description?: string;
  culture?: any;
  techStack?: string[];
  source?: string;
}

export interface ListCompaniesOptions {
  page?: number;
  pageSize?: number;
  source?: string;
  keyword?: string;
}

/**
 * 创建公司记录
 */
export async function createCompany(input: CreateCompanyInput) {
  return requirePrisma().company.create({
    data: input,
  });
}

/**
 * 根据名称获取公司信息
 */
export async function getCompanyByName(name: string) {
  return requirePrisma().company.findUnique({
    where: { name },
  });
}

/**
 * 根据 ID 获取公司信息
 */
export async function getCompanyById(id: string) {
  return requirePrisma().company.findUnique({
    where: { id },
  });
}

/**
 * 更新公司信息
 */
export async function updateCompany(id: string, data: Partial<CreateCompanyInput>) {
  return requirePrisma().company.update({
    where: { id },
    data,
  });
}

/**
 * 搜索公司信息
 */
export async function searchCompanies(keyword: string) {
  return requirePrisma().company.findMany({
    where: {
      OR: [
        { name: { contains: keyword, mode: 'insensitive' } },
        { industry: { contains: keyword, mode: 'insensitive' } },
        { location: { contains: keyword, mode: 'insensitive' } },
      ],
    },
    take: 10,
  });
}

/**
 * 列表 + 分页 + source/keyword 过滤
 */
export async function listCompanies(options: ListCompaniesOptions = {}) {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 20));
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {};
  if (options.source) {
    where.source = options.source;
  }
  if (options.keyword) {
    where.OR = [
      { name: { contains: options.keyword, mode: 'insensitive' } },
      { industry: { contains: options.keyword, mode: 'insensitive' } },
      { location: { contains: options.keyword, mode: 'insensitive' } },
    ];
  }

  const [items, total] = await Promise.all([
    requirePrisma().company.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: pageSize,
      skip,
    }),
    countCompanies(where),
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
 * 统计公司总数
 */
export async function countCompanies(where?: Record<string, unknown>): Promise<number> {
  return requirePrisma().company.count({ where });
}

/**
 * 删除公司记录
 */
export async function deleteCompany(id: string) {
  return requirePrisma().company.delete({
    where: { id },
  });
}
