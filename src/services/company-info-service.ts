/**
 * 公司信息查询服务
 *
 * 数据获取优先级（Plan B，去除 Tavily）：
 * 1. Redis 缓存命中（TTL 24h）→ 直接返回
 * 2. PostgreSQL 命中 → 回写缓存 → 返回
 * 3. LLM 知识库 + Jina Reader 兜底 → 写 DB + 缓存
 *    - Step A: 直接问 LLM（知名公司命中）
 *    - Step B: LLM 给官网 URL → r.jina.ai 抓取官网 markdown → 再问 LLM
 * 4. 内置 Mock（5 家头部公司）+ 通用模板兜底
 *
 * 关键设计：
 * - 所有返回的 CompanyInfo 都带 `source` 字段，UI 可据此显示来源徽章
 * - 通用模板兜底明确标记 source='fallback'，UI 应隐藏/弱化这些字段
 * - 只把公司名发给已在用的 LLM provider（DeepSeek/OpenAI/DashScope），
 *   不再泄露给第三方搜索 API
 */

import {
  getCompanyByName,
  createCompany,
  updateCompany,
} from '../repositories/company-repository';
import { cacheGet, cacheSet, cacheInvalidate } from './cache';
import { fetchCompanyInfoFromAI } from './company-info-provider';
import { logger } from '../utils/logger';
import { getMockCompanyInfo, isMockCompany } from './mock-companies';

/**
 * 公司信息类型定义
 */
export interface CompanyInfo {
  name: string;
  industry?: string;
  size?: string;
  location?: string;
  website?: string;
  description?: string;
  culture?: any;
  techStack?: string[];
  /**
   * 数据来源（前端用于显示来源徽章）
   * - db: 数据库已有记录（可能是 mock seed 或之前 AI 抓取的）
   * - ai-knowledge: LLM 直接返回（知名公司）
   * - ai-web: LLM + Jina Reader 抓官网后返回
   * - fallback: 通用模板兜底（字段多为占位）
   */
  source?: 'db' | 'ai-knowledge' | 'ai-web' | 'fallback';
}

const CACHE_TTL_COMPANY = 24 * 60 * 60; // 24 小时
const CACHE_PREFIX = 'company:';

/**
 * 从岗位描述中提取公司名称
 * @param jdText - 岗位描述文本
 */
export function extractCompanyNameFromJD(jdText: string): string | null {
  // 常见的公司名称提取模式
  const patterns = [
    /公司名称[:：]\s*([^\n，。；;,]+)/,
    /公司[:：]\s*([^\n，。；;,]+)/,
    /关于\s*([^\n，。；;,()（）]+)/,
    /【([^】]+)】/,
    /〖([^〗]+)〗/,
    /任职公司[:：]\s*([^\n，。；;,]+)/,
    /用人单位[:：]\s*([^\n，。；;,]+)/,
    /^([^\n]*?)(?:招聘|诚招)/,
    /^([^\n]*?)(?:集团|科技|有限|公司|企业)/,
  ];

  for (const pattern of patterns) {
    const match = jdText.match(pattern);
    if (match && match[1]) {
      let companyName = match[1].trim();
      companyName = companyName.replace(
        /^[\s]*招聘|诚招|关于|公司|企业|集团|科技|有限|责任|任职|用人单位[:：\s]*|公司名称[:：\s]*/,
        ''
      );
      companyName = companyName.replace(
        /(公司|集团|有限公司|股份有限公司|科技有限公司)$/,
        ''
      );

      if (
        companyName.length > 1 &&
        !['我们', '我司', '本公司', '该公司', '一家', '创新型', '互联网'].includes(
          companyName
        )
      ) {
        return companyName;
      }
    }
  }

  const commonCompanies = [
    '阿里巴巴', '腾讯', '字节跳动', '华为', '百度',
    '美团', '京东', '拼多多', '小米', '网易', '快手', '滴滴',
  ];
  for (const company of commonCompanies) {
    if (jdText.includes(company)) {
      return company;
    }
  }

  return null;
}

/**
 * Mock 公司信息库（仅做最终兜底使用）
 *
 * 内置 5 家头部公司的数据已迁移到 src/services/mock-companies.ts，
 * 并在启动时 seed 到 DB。这里保留函数签名作为兼容入口。
 */
function getMockCompanyInfoLocal(companyName: string): CompanyInfo {
  const isKnown = isMockCompany(companyName);
  const data = getMockCompanyInfo(companyName);
  return {
    ...data,
    source: isKnown ? 'fallback' : 'fallback',
  };
}

function mapDbRowToCompanyInfo(row: any): CompanyInfo {
  return {
    name: row.name,
    industry: row.industry ?? undefined,
    size: row.size ?? undefined,
    location: row.location ?? undefined,
    website: row.website ?? undefined,
    description: row.description ?? undefined,
    culture: row.culture ?? undefined,
    techStack: row.techStack,
    source: 'db',
  };
}

/**
 * 获取公司信息
 * 数据源优先级：Redis 缓存 → DB → LLM 知识库 + Jina Reader → Mock 兜底
 */
export async function getCompanyInfo(companyName: string): Promise<CompanyInfo> {
  const cacheKey = `${CACHE_PREFIX}${companyName}`;

  // 1. Redis 缓存
  const cached = await cacheGet<CompanyInfo>(cacheKey);
  if (cached) {
    return cached;
  }

  // 2. 数据库
  try {
    const existing = await getCompanyByName(companyName);
    if (existing) {
      const info = mapDbRowToCompanyInfo(existing);
      await cacheSet(cacheKey, info, CACHE_TTL_COMPANY);
      return info;
    }
  } catch (dbError) {
    logger.warn('公司信息数据库查询失败', 'company-info', {
      name: companyName,
      error: dbError instanceof Error ? dbError.message : String(dbError),
    });
  }

  // 3. LLM 知识库 + Jina Reader
  try {
    const aiInfo = await fetchCompanyInfoFromAI(companyName);
    if (aiInfo) {
      const info: CompanyInfo = {
        name: aiInfo.name,
        industry: aiInfo.industry,
        size: aiInfo.size,
        location: aiInfo.location,
        website: aiInfo.website,
        description: aiInfo.description,
        culture: aiInfo.culture,
        techStack: aiInfo.techStack,
        source: aiInfo.source,
      };
      // 写入数据库（失败不阻塞）
      try {
        await createCompany({
          name: info.name,
          industry: info.industry,
          size: info.size,
          location: info.location,
          website: info.website,
          description: info.description,
          culture: info.culture,
          techStack: info.techStack,
          source: aiInfo.source === 'ai-web' ? 'search' : 'manual',
        });
      } catch (dbError) {
        // 可能是 P2002 unique 冲突（并发写入），或 DB 不可用
        logger.warn('公司信息入库失败', 'company-info', {
          name: companyName,
          error: dbError instanceof Error ? dbError.message : String(dbError),
        });
      }
      await cacheSet(cacheKey, info, CACHE_TTL_COMPANY);
      return info;
    }
  } catch (aiError) {
    logger.warn('LLM 公司信息查询失败，退回 Mock', 'company-info', {
      name: companyName,
      error: aiError instanceof Error ? aiError.message : String(aiError),
    });
  }

  // 4. Mock 兜底
  const mock = getMockCompanyInfoLocal(companyName);
  await cacheSet(cacheKey, mock, CACHE_TTL_COMPANY);
  return mock;
}

/**
 * 更新公司信息
 */
export async function updateCompanyInfo(
  companyName: string,
  companyInfo: Partial<CompanyInfo>
) {
  const existing = await getCompanyByName(companyName);
  if (existing) {
    return updateCompany(existing.id, companyInfo);
  }

  return createCompany({ ...companyInfo, name: companyName } as CompanyInfo);
}

/**
 * 失效某个公司名的缓存（admin 编辑后调用）
 */
export async function invalidateCompanyCache(companyName: string): Promise<void> {
  const cacheKey = `${CACHE_PREFIX}${companyName}`;
  try {
    await cacheInvalidate(cacheKey);
  } catch (err) {
    logger.warn('缓存失效失败', 'company-info', {
      name: companyName,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * 自动查询公司信息
 *
 * 隐私改进：只在能从 JD 中识别出明确公司名时才查询，
 * 不再把整个 JD 文本发给 LLM。
 */
export async function autoQueryCompanyInfo(
  jdText: string
): Promise<CompanyInfo | null> {
  const companyName = extractCompanyNameFromJD(jdText);
  if (!companyName) {
    return null;
  }

  try {
    return await getCompanyInfo(companyName);
  } catch (error) {
    logger.error(
      '自动查询公司信息失败',
      error instanceof Error ? error : undefined,
      'company-info',
      { jdTextLength: jdText.length }
    );
    return null;
  }
}
