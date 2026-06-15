/**
 * 匹配记录仓库层
 * 封装匹配记录的 CRUD 操作
 */

import { requirePrisma } from '../services/database';
import type { MatchResult } from '../types/match';
import type { OptimizationSuggestion } from '../types/optimization';

export interface CreateMatchRecordInput {
  resumeId: string;
  jdId: string;
  result: MatchResult;
  suggestions?: OptimizationSuggestion[];
}

/**
 * 创建匹配记录
 */
export async function createMatchRecord(input: CreateMatchRecordInput) {
  return requirePrisma().matchRecord.create({
    data: {
      resumeId: input.resumeId,
      jdId: input.jdId,
      result: input.result as any,
      suggestions: input.suggestions as any,
    },
  });
}

/**
 * 根据 ID 获取匹配记录
 */
export async function getMatchRecordById(id: string) {
  return requirePrisma().matchRecord.findUnique({
    where: { id },
    include: {
      resume: {
        select: {
          id: true,
          name: true,
          fileType: true,
        },
      },
      jd: {
        select: {
          id: true,
          jobTitle: true,
          company: true,
        },
      },
    },
  });
}

/**
 * 根据简历和 JD 获取匹配记录
 */
export async function getMatchRecordByResumeAndJD(
  resumeId: string,
  jdId: string
) {
  return requirePrisma().matchRecord.findFirst({
    where: {
      resumeId,
      jdId,
    },
    include: {
      resume: true,
      jd: true,
    },
  });
}

/**
 * 获取简历的所有匹配记录
 */
export async function getMatchRecordsByResumeId(resumeId: string) {
  return requirePrisma().matchRecord.findMany({
    where: { resumeId },
    orderBy: { createdAt: 'desc' },
    include: {
      jd: {
        select: {
          id: true,
          jobTitle: true,
          company: true,
        },
      },
    },
  });
}

/**
 * 获取 JD 的所有匹配记录
 */
export async function getMatchRecordsByJDId(jdId: string) {
  return requirePrisma().matchRecord.findMany({
    where: { jdId },
    orderBy: { createdAt: 'desc' },
    include: {
      resume: {
        select: {
          id: true,
          name: true,
          fileType: true,
        },
      },
    },
  });
}
