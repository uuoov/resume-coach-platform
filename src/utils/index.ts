/**
 * 通用工具函数
 */

import { logger } from './logger';

/**
 * 生成唯一 ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 格式化日期
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

/**
 * 计算两个日期之间的月份差
 */
export function monthsBetween(start: string, end: string): number {
  const startDate = new Date(start);
  const endDate = end === 'present' || end === '至今' ? new Date() : new Date(end);

  return (endDate.getFullYear() - startDate.getFullYear()) * 12 +
    (endDate.getMonth() - startDate.getMonth());
}

/**
 * 计算两个日期之间的年份差
 */
export function yearsBetween(start: string, end: string): number {
  return Math.round(monthsBetween(start, end) / 12);
}

/**
 * 文本相似度计算（简单的 Jaccard 相似度）
 */
export function jaccardSimilarity(a: string, b: string): number {
  const setA = new Set(a.toLowerCase().split(/\s+/));
  const setB = new Set(b.toLowerCase().split(/\s+/));

  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);

  return intersection.size / union.size;
}

/**
 * 字符串模糊匹配
 */
export function fuzzyMatch(target: string, pattern: string): boolean {
  const targetLower = target.toLowerCase();
  const patternLower = pattern.toLowerCase();

  // 完全匹配
  if (targetLower === patternLower) return true;

  // 包含匹配
  if (targetLower.includes(patternLower)) return true;

  // 首字母匹配
  const targetWords = targetLower.split(/\s+/);
  const patternWords = patternLower.split(/\s+/);

  if (patternWords.length === 1) {
    return targetWords.some(word => word.startsWith(patternWords[0]));
  }

  return jaccardSimilarity(target, pattern) > 0.5;
}

/**
 * 文本清理
 */
export function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[\\t\\n\\r]+/g, ' ')
    .trim();
}

/**
 * 提取数字
 */
export function extractNumbers(text: string): number[] {
  const matches = text.match(/\d+(\.\d+)?/g);
  return matches ? matches.map(Number) : [];
}

/**
 * 百分比解析
 */
export function parsePercentage(text: string): number | null {
  const match = text.match(/(\d+(\.\d+)?)\s*%/);
  return match ? parseFloat(match[1]) : null;
}

/**
 * 数组分块
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * 延迟执行
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 重试执行
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      logger.warn(`重试 ${i + 1}/${maxRetries}`, 'retry', {
        error: error instanceof Error ? error.message : String(error),
      });
      await sleep(delayMs * (i + 1));
    }
  }

  throw lastError || new Error('操作失败');
}

/**
 * 深度合并对象
 */
export function deepMerge<T extends Record<string, any>>(
  target: T,
  source: Partial<T>
): T {
  const result = { ...target };

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key];
      const targetValue = target[key];

      if (
        sourceValue &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue) &&
        targetValue &&
        typeof targetValue === 'object' &&
        !Array.isArray(targetValue)
      ) {
        result[key as keyof T] = deepMerge(
          targetValue as Record<string, any>,
          sourceValue as Record<string, any>
        ) as any;
      } else {
        result[key as keyof T] = sourceValue as T[keyof T];
      }
    }
  }

  return result;
}
