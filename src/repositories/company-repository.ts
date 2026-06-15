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
