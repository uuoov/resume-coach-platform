/**
 * JD 仓库层
 * 封装 JD 的 CRUD 操作
 */

import { requirePrisma } from '../services/database';
import type { JDAnalysis } from '../types/jd';

export interface CreateJDInput {
  userId?: string;
  jobTitle: string;
  company?: string;
  content: JDAnalysis;
  rawText: string;
}

/**
 * 创建 JD 记录
 */
export async function createJD(input: CreateJDInput) {
  return requirePrisma().jD.create({
    data: {
      userId: input.userId,
      jobTitle: input.jobTitle,
      company: input.company,
      content: input.content as any,
      rawText: input.rawText,
    },
  });
}

/**
 * 根据 ID 获取 JD
 */
export async function getJDById(id: string) {
  return requirePrisma().jD.findUnique({
    where: { id },
  });
}

/**
 * 获取用户的所有 JD
 */
export async function getJDsByUserId(userId: string) {
  return requirePrisma().jD.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * 更新 JD
 */
export async function updateJD(id: string, data: Partial<CreateJDInput>) {
  const { content, ...rest } = data;
  return requirePrisma().jD.update({
    where: { id },
    data: {
      ...rest,
      ...(content !== undefined ? { content: content as any } : {}),
    },
  });
}

/**
 * 删除 JD
 */
export async function deleteJD(id: string) {
  return requirePrisma().jD.delete({
    where: { id },
  });
}
