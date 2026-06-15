/**
 * 公司信息查询服务
 *
 * 数据获取优先级：
 * 1. Redis 缓存命中（TTL 24h）→ 直接返回
 * 2. PostgreSQL 命中 → 回写缓存 → 返回
 * 3. Tavily Web 搜索 → AI 结构化提取 → 写 DB + 缓存
 * 4. 内置 Mock（5 家头部公司）→ 兜底
 *
 * 关键设计：
 * - 全链路 try/catch，任何环节失败都退到下一层，避免阻塞 JD 分析主流程
 * - Mock 仅做兜底，不主动暴露给真实公司名
 */

import {
  getCompanyByName,
  createCompany,
  updateCompany,
} from '../repositories/company-repository';
import { cacheGet, cacheSet } from './cache';
import {
  createSearchProvider,
  type SearchProvider,
  type SearchResult,
} from './search-provider';
import { createConfiguredAIClient } from '../utils/ai-client';
import { logger } from '../utils/logger';

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
 */
function getMockCompanyInfo(companyName: string): CompanyInfo {
  const mockCompanies: Record<string, CompanyInfo> = {
    '阿里巴巴': {
      name: '阿里巴巴',
      industry: '互联网/电商',
      size: '20000人以上',
      location: '杭州',
      website: 'https://www.alibaba.com',
      description:
        '阿里巴巴集团控股有限公司是以曾担任英语教师的马云为首的18人于1999年在浙江省杭州市创立的公司。',
      culture: {
        values: ['客户第一', '团队合作', '拥抱变化', '诚信', '激情', '敬业'],
        workStyle: '快节奏',
      },
      techStack: ['Java', 'Scala', 'Go', 'React', 'Node.js', 'Docker', 'Kubernetes'],
    },
    '腾讯': {
      name: '腾讯',
      industry: '互联网/科技',
      size: '20000人以上',
      location: '深圳',
      website: 'https://www.tencent.com',
      description:
        '深圳市腾讯计算机系统有限公司成立于1998年11月，由马化腾、张志东、许晨晔、陈一丹、曾李青五位创始人共同创立。',
      culture: {
        values: ['正直', '进取', '合作', '创新'],
        workStyle: '创新驱动',
      },
      techStack: ['C++', 'Java', 'Go', 'Python', 'Vue.js', 'Node.js', 'Docker'],
    },
    '字节跳动': {
      name: '字节跳动',
      industry: '互联网/科技',
      size: '20000人以上',
      location: '北京',
      website: 'https://www.bytedance.com',
      description: '字节跳动成立于2012年3月，公司使命为 Inspire Creativity, Enrich Life。',
      culture: {
        values: ['追求极致', '务实敢为', '开放谦逊', '坦诚清晰', '始终创业', '多元兼容'],
        workStyle: '快速迭代',
      },
      techStack: ['Java', 'Go', 'Python', 'React', 'Node.js', 'Flutter', 'Kubernetes'],
    },
    '华为': {
      name: '华为',
      industry: '通信/科技',
      size: '100000人以上',
      location: '深圳',
      website: 'https://www.huawei.com',
      description: '华为技术有限公司是一家生产销售通信设备的民营通信科技公司。',
      culture: {
        values: ['以客户为中心', '以奋斗者为本', '长期艰苦奋斗', '坚持自我批判'],
        workStyle: '狼性文化',
      },
      techStack: ['Java', 'C++', 'Python', 'Go', 'Android', 'iOS', 'Docker'],
    },
    '百度': {
      name: '百度',
      industry: '互联网/科技',
      size: '20000人以上',
      location: '北京',
      website: 'https://www.baidu.com',
      description: '百度是拥有强大互联网基础的领先AI公司。',
      culture: {
        values: ['简单可依赖'],
        workStyle: '技术驱动',
      },
      techStack: ['Java', 'Python', 'Go', 'C++', 'React', 'Node.js', 'TensorFlow'],
    },
  };

  if (mockCompanies[companyName]) {
    return mockCompanies[companyName];
  }

  return {
    name: companyName,
    industry: '互联网',
    size: '500-2000人',
    location: '北京',
    website: '',
    description: `这是一家名为${companyName}的公司，主要从事互联网相关业务。`,
    culture: {
      values: ['创新', '协作', '共赢'],
      workStyle: '高效',
    },
    techStack: ['Java', 'Python', 'JavaScript'],
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
  };
}

/**
 * 从搜索结果中提取 JSON 对象（容错处理 ``` 代码块包裹）
 */
function extractJsonFromText(text: string): string {
  const trimmed = text.trim();
  // 去除 ```json ... ``` 包裹
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }
  // 直接截取第一段 { ... }
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }
  return trimmed;
}

/**
 * 通过 Web 搜索 + AI 提取结构化公司信息
 */
async function fetchCompanyInfoViaSearch(
  companyName: string,
  provider: SearchProvider
): Promise<CompanyInfo | null> {
  let results: SearchResult[];
  try {
    results = await provider.search(
      `${companyName} 公司简介 行业 业务范围 技术栈 企业文化 地址 官网`,
      { maxResults: 5 }
    );
  } catch (err) {
    logger.warn('公司信息搜索失败', 'company-info', {
      name: companyName,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }

  if (results.length === 0) {
    return null;
  }

  const context = results
    .map((r) => `## ${r.title}\nURL: ${r.url}\n${r.content}`)
    .join('\n\n');

  const aiClient = createConfiguredAIClient();
  if (!aiClient) {
    // 没有 AI 时退化为：用首条搜索结果作为 description
    return {
      name: companyName,
      description: results[0]?.content || '',
      website: results[0]?.url || undefined,
    };
  }

  const prompt = `你是一位企业信息分析师。请根据以下搜索结果，提取"${companyName}"的结构化信息。

搜索结果：
${context}

请严格按照以下 JSON 格式返回（不要包含 markdown 代码块）：
{
  "name": "${companyName}",
  "industry": "行业分类（如：互联网/电商、通信/科技、金融等）",
  "size": "公司规模（如：20000人以上、500-2000人）",
  "location": "总部所在地",
  "website": "官网URL，没有则为空字符串",
  "description": "不超过200字的公司简介",
  "culture": {
    "values": ["价值观1", "价值观2"],
    "workStyle": "工作风格描述"
  },
  "techStack": ["技术1", "技术2"]
}

如果某项信息无法从搜索结果中获取，填 null 或空字符串。不要编造数据。`;

  try {
    const response = await aiClient.generateWithRetry(prompt);
    const jsonStr = extractJsonFromText(response.text);
    const parsed = JSON.parse(jsonStr) as Partial<CompanyInfo>;

    return {
      name: companyName,
      industry: parsed.industry || undefined,
      size: parsed.size || undefined,
      location: parsed.location || undefined,
      website: parsed.website || undefined,
      description: parsed.description || undefined,
      culture: parsed.culture || undefined,
      techStack: Array.isArray(parsed.techStack) ? parsed.techStack : undefined,
    };
  } catch (err) {
    logger.warn('AI 提取公司信息失败，退回原始搜索内容', 'company-info', {
      name: companyName,
      error: err instanceof Error ? err.message : String(err),
    });
    return {
      name: companyName,
      description: results[0]?.content || '',
      website: results[0]?.url || undefined,
    };
  }
}

/**
 * 获取公司信息
 * 数据源优先级：Redis 缓存 → DB → Web 搜索 + AI 提取 → Mock 兜底
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

  // 3. Web 搜索 + AI 提取
  const provider = createSearchProvider();
  if (provider) {
    const searched = await fetchCompanyInfoViaSearch(companyName, provider);
    if (searched) {
      // 写入数据库（失败不阻塞）
      try {
        await createCompany(searched as any);
      } catch (dbError) {
        logger.warn('公司信息入库失败', 'company-info', {
          name: companyName,
          error: dbError instanceof Error ? dbError.message : String(dbError),
        });
      }
      await cacheSet(cacheKey, searched, CACHE_TTL_COMPANY);
      return searched;
    }
  }

  // 4. Mock 兜底
  const mock = getMockCompanyInfo(companyName);
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
 * 自动查询公司信息（从 JD 文本中提取公司名）
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
