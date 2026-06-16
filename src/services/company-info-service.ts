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
  /**
   * 岗位洞察（公司 + 岗位组合的特定信息）
   *
   * 例如腾讯的前端工程师 vs 阿里的前端工程师，团队结构、技术栈、面试风格都不同。
   * 仅当调用方提供了 jobTitle 才会填充。
   */
  roleInsights?: {
    team?: string;
    techStack?: string[];
    typicalRequirements?: string[];
    workStyle?: string;
    interviewFocus?: string[];
    careerPath?: string;
    perks?: string[];
    confidence?: number;
  };
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
 *
 * @param companyName 公司名（必填）
 * @param jobTitle 岗位名（可选；提供时会附加 roleInsights 字段并影响 cache key）
 */
export async function getCompanyInfo(
  companyName: string,
  jobTitle?: string
): Promise<CompanyInfo> {
  // cache key 包含 jobTitle，因为同一家公司不同岗位的 roleInsights 是不同的
  const normalizedRole = jobTitle?.trim() ? `:${jobTitle.trim().toLowerCase()}` : '';
  const cacheKey = `${CACHE_PREFIX}${companyName.toLowerCase()}${normalizedRole}`;

  // 1. Redis 缓存
  const cached = await cacheGet<CompanyInfo>(cacheKey);
  if (cached) {
    return cached;
  }

  // 2. 数据库（只匹配公司名，不区分岗位；命中后用 ai 再补 roleInsights）
  let dbRow: any = null;
  try {
    dbRow = await getCompanyByName(companyName);
    if (dbRow) {
      const baseInfo = mapDbRowToCompanyInfo(dbRow);

      // 如果已有 DB 记录但需要岗位洞察，且 DB 行里没有，则用 AI 补 roleInsights
      if (jobTitle && !baseInfo.roleInsights) {
        const roleOnly = await fetchRoleInsightsFromAI(companyName, jobTitle);
        if (roleOnly) {
          baseInfo.roleInsights = roleOnly;
          baseInfo.source = baseInfo.source === 'db' ? 'ai-knowledge' : baseInfo.source;
        }
      }

      await cacheSet(cacheKey, baseInfo, CACHE_TTL_COMPANY);
      return baseInfo;
    }
  } catch (dbError) {
    logger.warn('公司信息数据库查询失败', 'company-info', {
      name: companyName,
      error: dbError instanceof Error ? dbError.message : String(dbError),
    });
  }

  // 3. LLM 知识库 + Jina Reader
  try {
    const aiInfo = await fetchCompanyInfoFromAI(companyName, jobTitle);
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
        roleInsights: aiInfo.roleInsights,
      };
      // 写入数据库（失败不阻塞；只在 dbRow 不存在时写，避免覆盖）
      if (!dbRow) {
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
      }
      await cacheSet(cacheKey, info, CACHE_TTL_COMPANY);
      return info;
    }
  } catch (aiError) {
    logger.warn('LLM 公司信息查询失败，退回 Mock', 'company-info', {
      name: companyName,
      jobTitle: jobTitle || undefined,
      error: aiError instanceof Error ? aiError.message : String(aiError),
    });
  }

  // 4. Mock 兜底
  const mock = getMockCompanyInfoLocal(companyName);
  // 即使是 mock，也尝试用 AI 补 roleInsights（如果 jobTitle 提供了）
  if (jobTitle && !mock.roleInsights) {
    const roleOnly = await fetchRoleInsightsFromAI(companyName, jobTitle);
    if (roleOnly) {
      mock.roleInsights = roleOnly;
      // 如果 AI 能给出 roleInsights，把 source 升级
      mock.source = 'ai-knowledge';
    }
  }
  await cacheSet(cacheKey, mock, CACHE_TTL_COMPANY);
  return mock;
}

/**
 * 仅查询岗位洞察（用于 DB 已有公司信息但缺 roleInsights 的场景）
 *
 * 这是一次轻量 LLM 调用，只问岗位相关字段。
 */
/**
 * 仅查询岗位洞察（用于 DB 已有公司信息但缺 roleInsights 的场景）
 *
 * 这是一次轻量 LLM 调用，只问岗位相关字段。
 */
async function fetchRoleInsightsFromAI(
  companyName: string,
  jobTitle: string
): Promise<NonNullable<CompanyInfo['roleInsights']>> {
  // 复用主 provider，但只关心 roleInsights 字段
  const aiInfo = await fetchCompanyInfoFromAI(companyName, jobTitle).catch(() => null);
  if (aiInfo?.roleInsights) {
    return aiInfo.roleInsights;
  }
  // 兜底：返回空对象（避免类型问题）
  return {};
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
 *
 * @param jdText JD 全文（用于提取公司名）
 * @param jobTitle 可选岗位名；提供时会附加 roleInsights
 */
export async function autoQueryCompanyInfo(
  jdText: string,
  jobTitle?: string
): Promise<CompanyInfo | null> {
  const companyName = extractCompanyNameFromJD(jdText);
  if (!companyName) {
    return null;
  }

  try {
    return await getCompanyInfo(companyName, jobTitle);
  } catch (error) {
    logger.error(
      '自动查询公司信息失败',
      error instanceof Error ? error : undefined,
      'company-info',
      { jdTextLength: jdText.length, jobTitle: jobTitle || undefined }
    );
    return null;
  }
}
