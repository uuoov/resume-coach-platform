/**
 * 匹配历史记录工具模块
 *
 * 职责：
 *  - 统一管理 localStorage 中的历史记录
 *  - 提供保存 / 读取 / 删除 / 清空 API
 *  - 存储完整快照（resume / jdAnalysis / matchResult），支持点击恢复
 *
 * 存储格式（localStorage key: HISTORY_KEY）：
 *   HistoryRecord[]，最新在前
 */

import type { Resume, JDAnalysis, MatchResult } from './api';

export const HISTORY_KEY = 'resume_coach_history';
const MAX_RECORDS = 50;

export interface HistoryRecord {
  id: string;
  jobTitle: string;
  company: string;
  overallScore: number;
  date: string;
  resumeName: string;
  aiPowered?: boolean;
  /** 完整快照，用于点击卡片恢复数据 */
  snapshot?: {
    resume: Resume;
    jdAnalysis: JDAnalysis;
    matchResult: MatchResult;
  };
}

/**
 * 读取所有历史记录（最新在前）
 */
export function readHistory(): HistoryRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('[history] read 解析失败，清空重建', err);
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch {
      /* ignore */
    }
    return [];
  }
}

/**
 * 写入完整历史数组
 */
function writeHistory(records: HistoryRecord[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(records));
  } catch (err) {
    console.warn('[history] write 失败，尝试裁剪后重写', err);
    // 配额超限 → 删掉最旧的一半再试
    try {
      const trimmed = records.slice(0, Math.ceil(records.length / 2));
      localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
    } catch (err2) {
      console.warn('[history] 重试仍失败，localStorage 可能不可用', err2);
    }
  }
}

/**
 * 追加一条历史记录（在匹配成功的瞬间调用）
 *
 * 去重策略：
 *  - 同 jobTitle + company + resumeName 视为重复
 *  - 命中重复时把旧记录提到最前，并更新快照和分数（避免历史堆积但保留最新结果）
 */
export function appendHistory(params: {
  resume: Resume;
  jdAnalysis: JDAnalysis;
  matchResult: MatchResult;
}): HistoryRecord | null {
  try {
    const { resume, jdAnalysis, matchResult } = params;
    const newRecord: HistoryRecord = {
      id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      jobTitle: jdAnalysis.jobTitle || '未知岗位',
      company: jdAnalysis.company || '未知公司',
      overallScore: matchResult.overallScore || 0,
      date: new Date().toISOString(),
      resumeName: resume.basicInfo?.name || '未命名简历',
      aiPowered: matchResult.aiPowered,
      snapshot: { resume, jdAnalysis, matchResult },
    };

    const records = readHistory();
    const dupIndex = records.findIndex(
      (r) =>
        r.jobTitle === newRecord.jobTitle &&
        r.company === newRecord.company &&
        r.resumeName === newRecord.resumeName
    );

    let updated: HistoryRecord[];
    if (dupIndex >= 0) {
      // 替换旧记录并提到最前，保留 id 以便 UI 稳定
      newRecord.id = records[dupIndex].id;
      updated = [newRecord, ...records.filter((_, i) => i !== dupIndex)];
    } else {
      updated = [newRecord, ...records].slice(0, MAX_RECORDS);
    }

    writeHistory(updated);
    return newRecord;
  } catch {
    return null;
  }
}

/**
 * 删除单条记录
 */
export function deleteHistory(id: string): HistoryRecord[] {
  const updated = readHistory().filter((r) => r.id !== id);
  writeHistory(updated);
  return updated;
}

/**
 * 清空全部
 */
export function clearHistory(): void {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {
    // ignore
  }
}

/**
 * 将快照恢复到 sessionStorage（供 MatchResultPage 重新渲染）
 */
export function restoreSnapshotToSession(record: HistoryRecord): boolean {
  if (!record.snapshot) return false;
  try {
    sessionStorage.setItem('resume', JSON.stringify(record.snapshot.resume));
    sessionStorage.setItem('jdAnalysis', JSON.stringify(record.snapshot.jdAnalysis));
    sessionStorage.setItem('matchResult', JSON.stringify(record.snapshot.matchResult));
    return true;
  } catch {
    return false;
  }
}
