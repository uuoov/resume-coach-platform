/**
 * 简历仓库层
 * 封装简历的 CRUD 操作
 *
 * 注意：此模块依赖 Prisma，如果 Prisma 未生成，请使用 try-catch 包裹导入
 */

import { prisma } from '../services/database';
import type { Resume } from '../types/resume';

export interface CreateResumeInput {
  userId?: string;
  name: string;
  content: Resume;
  rawText: string;
  filePath?: string;
  fileType: 'pdf' | 'docx';
  parentId?: string;
  changeDescription?: string; // 版本变更描述
}

export interface ResumeWithVersions extends Resume {
  versions: number;
}

/**
 * 创建简历记录
 */
export async function createResume(input: CreateResumeInput) {
  return prisma.resume.create({
    data: {
      userId: input.userId,
      name: input.name,
      content: input.content as any,
      rawText: input.rawText,
      filePath: input.filePath,
      fileType: input.fileType,
      parentId: input.parentId,
      version: 1,
    },
  });
}

/**
 * 根据 ID 获取简历
 */
export async function getResumeById(id: string) {
  return prisma.resume.findUnique({
    where: { id },
    include: {
      parent: true,
      children: {
        select: {
          id: true,
          version: true,
          createdAt: true,
        },
      },
    },
  });
}

/**
 * 获取用户的所有简历
 */
export async function getResumesByUserId(userId: string) {
  return prisma.resume.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      parent: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

/**
 * 更新简历
 */
export async function updateResume(
  id: string,
  data: Partial<CreateResumeInput>
) {
  const { content, ...rest } = data;
  return prisma.resume.update({
    where: { id },
    data: {
      ...rest,
      ...(content !== undefined ? { content: content as any } : {}),
    },
  });
}

/**
 * 删除简历
 */
export async function deleteResume(id: string) {
  return prisma.resume.delete({
    where: { id },
  });
}

/**
 * 创建简历版本
 */
export async function createResumeVersion(
  parentId: string,
  content: Resume
): Promise<any> {
  const parent = await getResumeById(parentId);
  if (!parent) {
    throw new Error('Parent resume not found');
  }

  return prisma.resume.create({
    data: {
      userId: parent.userId,
      name: `${parent.name} v${(parent.version || 1) + 1}`,
      content: content as any,
      rawText: parent.rawText,
      fileType: parent.fileType,
      parentId: parent.id,
      version: (parent.version || 1) + 1,
    },
  });
}

/**
 * 获取简历的所有版本
 */
export async function getResumeVersions(resumeId: string) {
  const root = await prisma.resume.findUnique({
    where: { id: resumeId },
  });

  if (!root) return [];

  if (!root.parentId) {
    return prisma.resume.findMany({
      where: { parentId: resumeId },
      orderBy: { version: 'asc' },
    });
  }

  return prisma.resume.findMany({
    where: { parentId: root.parentId },
    orderBy: { version: 'asc' },
  });
}
