/**
 * 基于 LLM 知识 + Jina Reader 的公司信息检索（含岗位洞察）
 *
 * 流程（Plan B + Role Insights）：
 *   1. Step 1: 直接问 LLM「你知道这家公司吗？请返回 JSON + confidence」
 *      - 如果 jobTitle 也提供了，会同时返回 roleInsights（岗位所属团队、技术栈、面试重点等）
 *      - confidence >= 0.6 → 直接采用（source: 'ai-knowledge'）
 *   2. Step 2: confidence < 0.6 时，让 LLM 给一个可能的官网 URL，
 *      用 https://r.jina.ai/{url} 把官网转成 markdown，
 *      再问一次 LLM 提取结构化信息（source: 'ai-web'）
 *   3. Step 3: 都失败 → 返回 null（让上游走 mock 兜底，标记 source: 'fallback'）
 *
 * 缓存策略：cache key 同时包含 companyName 和 jobTitle（若有），
 * 因为同一家公司不同岗位的 roleInsights 是不同的。
 */

import { createConfiguredAIClient } from '../utils/ai-client';
import { generateWithAudit } from './ai-audit';
import { logger } from '../utils/logger';

/**
 * Whether we have any LLM provider configured.
 * If not, skip the entire AI + Jina chain (saves 8s+ per call).
 */
function hasAIProvider(): boolean {
  return createConfiguredAIClient() !== null;
}

/**
 * 岗位洞察（公司 + 岗位组合的特定信息）
 *
 * 例如腾讯的前端工程师 vs 阿里的前端工程师，团队结构、技术栈、面试风格都不同。
 */
export interface RoleInsights {
  /** 该岗位在该公司所属的部门/业务线（例如「微信事业群-视频号」、「淘天-用户增长」） */
  team?: string;
  /** 该岗位在该公司的实际技术栈（区别于公司整体 techStack，例如公司用 Java 但前端岗偏 React+TS） */
  techStack?: string[];
  /** 该公司该岗位的典型任职要求（区别于通用 JD，例如「必须有大流量经验」「3 年以上 React」） */
  typicalRequirements?: string[];
  /** 工作风格（团队节奏、协作方式） */
  workStyle?: string;
  /** 面试考察重点（例如「重算法」、「重系统设计」、「重业务理解」） */
  interviewFocus?: string[];
  /** 职业发展路径（例如「技术 → 架构师 → 技术专家」，或「P6 → P7 → P8」） */
  careerPath?: string;
  /** 该岗位在该公司的特殊吸引力 / 注意事项 */
  perks?: string[];
  /** LLM 对该岗位了解的 confidence（0-1） */
  confidence?: number;
}

export interface CompanyInfoFromAI {
  name: string;
  industry?: string;
  size?: string;
  location?: string;
  website?: string;
  description?: string;
  culture?: {
    values?: string[];
    workStyle?: string;
  };
  techStack?: string[];
  /** 来源标记，调用方写入最终 CompanyInfo.source */
  source: 'ai-knowledge' | 'ai-web';
  /** 岗位洞察（仅当调用时提供了 jobTitle 才会填充） */
  roleInsights?: RoleInsights;
}

interface LLMCompanyResponse {
  name: string;
  industry: string | null;
  size: string | null;
  location: string | null;
  website: string | null;
  description: string | null;
  culture: { values: string[] | null; workStyle: string | null } | null;
  techStack: string[] | null;
  confidence: number;
  /** 仅当请求时带了 jobTitle 才返回 */
  roleInsights?: {
    team: string | null;
    techStack: string[] | null;
    typicalRequirements: string[] | null;
    workStyle: string | null;
    interviewFocus: string[] | null;
    careerPath: string | null;
    perks: string[] | null;
    confidence: number | null;
  } | null;
}

/**
 * 从 LLM 响应文本中提取 JSON（容忍 markdown fence）
 */
function extractJsonFromText(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }
  return trimmed;
}

function normalizeStringArray(arr: unknown): string[] | undefined {
  if (!Array.isArray(arr)) return undefined;
  const filtered = arr
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .filter(Boolean);
  return filtered.length > 0 ? filtered : undefined;
}

/**
 * 规范化 LLM 返回的字段：null/空字符串/空数组 → undefined
 */
function normalizeLLMResponse(
  raw: LLMCompanyResponse,
  companyName: string,
  jobTitle?: string
): CompanyInfoFromAI {
  const pick = (v: string | null | undefined): string | undefined => {
    const s = (v ?? '').toString().trim();
    return s ? s : undefined;
  };

  const values = normalizeStringArray(raw.culture?.values);
  const workStyle = pick(raw.culture?.workStyle);

  const result: CompanyInfoFromAI = {
    name: companyName,
    industry: pick(raw.industry),
    size: pick(raw.size),
    location: pick(raw.location),
    website: pick(raw.website),
    description: pick(raw.description),
    culture: values || workStyle
      ? {
          values: values,
          workStyle: workStyle,
        }
      : undefined,
    techStack: normalizeStringArray(raw.techStack),
    source: 'ai-knowledge',
  };

  // 只有当请求时带了 jobTitle 且 raw 里返回了 roleInsights 时才填充
  if (jobTitle && raw.roleInsights) {
    const ri = raw.roleInsights;
    const team = pick(ri.team);
    const roleTech = normalizeStringArray(ri.techStack);
    const typicalReq = normalizeStringArray(ri.typicalRequirements);
    const riWorkStyle = pick(ri.workStyle);
    const interviewFocus = normalizeStringArray(ri.interviewFocus);
    const careerPath = pick(ri.careerPath);
    const perks = normalizeStringArray(ri.perks);
    const riConfidence =
      typeof ri.confidence === 'number' && ri.confidence >= 0 && ri.confidence <= 1
        ? ri.confidence
        : undefined;

    if (
      team ||
      roleTech ||
      typicalReq ||
      riWorkStyle ||
      interviewFocus ||
      careerPath ||
      perks
    ) {
      result.roleInsights = {
        team,
        techStack: roleTech,
        typicalRequirements: typicalReq,
        workStyle: riWorkStyle,
        interviewFocus,
        careerPath,
        perks,
        confidence: riConfidence,
      };
    }
  }

  return result;
}

/**
 * Step 1: 直接问 LLM 公司信息 + confidence
 *
 * 如果提供了 jobTitle，会同时询问岗位洞察
 */
async function queryLLMForCompany(
  companyName: string,
  jobTitle: string | undefined,
  websiteContext?: string
): Promise<{ raw: LLMCompanyResponse | null; source: 'ai-knowledge' | 'ai-web' }> {
  const client = createConfiguredAIClient();
  if (!client) {
    return { raw: null, source: 'ai-knowledge' };
  }

  const contextBlock = websiteContext
    ? `\n\n以下是「${companyName}」官网的 markdown 内容片段（可能包含关于我们 / 公司简介）：\n${websiteContext.slice(0, 8000)}\n`
    : '';

  const roleInsightsBlock = jobTitle
    ? `
此外，请同时返回「${companyName} - ${jobTitle}」这个岗位的洞察信息：
- team：该岗位在该公司通常所属的部门 / 业务线（例如「微信事业群-视频号」、「淘天-用户增长」、「云智能-数据库」）。不确定填 null。
- roleInsights.techStack：该岗位在该公司的实际技术栈（区别于公司整体 techStack；例如公司整体用 Java，但前端岗偏 React + TypeScript）。不确定填 null。
- roleInsights.typicalRequirements：该公司该岗位的典型任职要求（例如「必须有大流量经验」、「3 年以上 React」）。不确定填 null。
- roleInsights.workStyle：该岗位在该公司的工作风格（节奏、协作方式）。不确定填 null。
- roleInsights.interviewFocus：该岗位在该公司的面试考察重点（例如「重算法」、「重系统设计」、「重业务理解」）。不确定填 null。
- roleInsights.careerPath：该岗位在该公司的职业发展路径（例如「P6 → P7 → P8」或「高级 → 资深 → 专家」）。不确定填 null。
- roleInsights.perks：该岗位在该公司的特殊吸引力或注意事项。不确定填 null。
- roleInsights.confidence：你对这个岗位在该公司的具体了解程度（0-1）。不确定填 0。`
    : '';

  const roleInsightsSchemaBlock = jobTitle
    ? `,
  "roleInsights": {
    "team": "string | null",
    "techStack": ["string"] | null,
    "typicalRequirements": ["string"] | null,
    "workStyle": "string | null",
    "interviewFocus": ["string"] | null,
    "careerPath": "string | null",
    "perks": ["string"] | null,
    "confidence": 0.0
  } | null`
    : '';

  const roleInsightsRule = jobTitle
    ? `\n5. roleInsights 只在你对该公司该岗位有具体了解时才返回；不确定的字段填 null，不要编造
6. roleInsights.techStack 必须区别于顶层 techStack，聚焦于该岗位实际使用的技术`
    : '';

  const prompt = `你是企业信息分析师${jobTitle ? ' + 资深招聘顾问' : ''}。${websiteContext ? '基于以下官网内容' : '基于你的训练知识'}，请提取${jobTitle ? `「${companyName} - ${jobTitle}」` : `「${companyName}」`}的结构化信息。

${contextBlock}
${roleInsightsBlock}

请严格按以下 JSON 格式输出（不要 markdown 代码块，只输出 JSON 本身）：
{
  "name": "${companyName}",
  "industry": "行业分类（互联网/电商、通信/科技、金融等）；不知道填 null",
  "size": "公司规模（如 20000人以上、500-2000人）；不知道填 null",
  "location": "总部所在地；不知道填 null",
  "website": "官网 URL；不知道填 null",
  "description": "不超过 200 字的公司简介；不知道填 null",
  "culture": {
    "values": ["价值观1", "价值观2"],
    "workStyle": "工作风格"
  },
  "techStack": ["技术1", "技术2"]${roleInsightsSchemaBlock},
  "confidence": 0.0
}

重要规则：
1. confidence ∈ [0, 1]：表示你对该公司的了解程度
   - 0.9+：非常了解（上市公司、知名大厂）
   - 0.6-0.9：比较了解（中型公司、行业头部）
   - 0.3-0.6：略有耳闻（听说过但细节不确定）
   - < 0.3：基本不了解
2. 对不了解的字段，必须填 null，不要编造或凭印象猜测
3. 不要返回「500-2000人」这种通用模板值，必须基于事实
4. techStack 和 culture.values 不确定时返回 null 或空数组${roleInsightsRule}`;

  try {
    const response = await generateWithAudit(
      client,
      { service: 'company-info' },
      prompt,
      2,
      { temperature: 0 }
    );
    const json = extractJsonFromText(response.text);
    const parsed = JSON.parse(json) as LLMCompanyResponse;
    return {
      raw: parsed,
      source: websiteContext ? 'ai-web' : 'ai-knowledge',
    };
  } catch (err) {
    logger.warn('LLM 公司信息查询失败', 'company-info', {
      name: companyName,
      jobTitle: jobTitle || undefined,
      hasContext: Boolean(websiteContext),
      error: err instanceof Error ? err.message : String(err),
    });
    return { raw: null, source: websiteContext ? 'ai-web' : 'ai-knowledge' };
  }
}

/**
 * Step 2: 通过 Jina Reader 抓取官网 markdown
 *   - r.jina.ai 完全免费、无 API key、无配额限制
 *   - 返回空字符串视为失败
 */
async function fetchWebsiteMarkdown(url: string): Promise<string | null> {
  const target = url.startsWith('http') ? url : `https://${url}`;
  const jinaUrl = `https://r.jina.ai/${target}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(jinaUrl, {
      signal: controller.signal,
      headers: {
        Accept: 'text/plain, application/json',
      },
    });

    if (!response.ok) {
      logger.debug('Jina Reader 非 200', 'company-info', {
        url: target,
        status: response.status,
      });
      return null;
    }

    const text = await response.text();
    // Jina 有时返回 JSON（含 code），只取 content 字段
    if (text.startsWith('{')) {
      try {
        const data = JSON.parse(text) as { data?: { content?: string }; content?: string };
        const content = data?.data?.content || data?.content || '';
        return content || null;
      } catch {
        // fallthrough
      }
    }

    return text.trim() ? text.trim() : null;
  } catch (err) {
    logger.debug('Jina Reader 抓取失败', 'company-info', {
      url: target,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 主入口：获取公司信息（可选附加岗位洞察）
 *
 * @param companyName 公司名（必填）
 * @param jobTitle 岗位名（可选，提供时会附加 roleInsights 字段）
 *
 * 返回 null 表示未拿到有效信息，调用方走 mock 兜底
 */
export async function fetchCompanyInfoFromAI(
  companyName: string,
  jobTitle?: string
): Promise<CompanyInfoFromAI | null> {
  // No AI provider configured → skip the whole LLM/Jina chain
  if (!hasAIProvider()) {
    return null;
  }

  // Step 1: 先问 LLM
  const step1 = await queryLLMForCompany(companyName, jobTitle);

  // 综合置信度：公司 confidence + （若有）岗位 roleInsights.confidence
  const companyConfidence = step1.raw?.confidence ?? 0;
  const roleConfidence = step1.raw?.roleInsights?.confidence ?? 0;
  const overallConfidence = jobTitle
    ? Math.min(companyConfidence, roleConfidence || companyConfidence)
    : companyConfidence;

  if (step1.raw && overallConfidence >= 0.6) {
    return normalizeLLMResponse(step1.raw, companyName, jobTitle);
  }

  // Step 2: confidence 较低或缺失，尝试用官网补全
  const candidateUrl = step1.raw?.website?.trim() || `${companyName}.com`;

  const markdown = await fetchWebsiteMarkdown(candidateUrl);
  if (!markdown) {
    // 官网也抓不到 → 返回 Step 1 的部分结果（如果有的话）
    if (step1.raw && companyConfidence >= 0.3) {
      return normalizeLLMResponse(step1.raw, companyName, jobTitle);
    }
    return null;
  }

  // Step 3: 用官网内容再问一次
  const step2 = await queryLLMForCompany(companyName, jobTitle, markdown);
  const step2CompanyConf = step2.raw?.confidence ?? 0;
  const step2RoleConf = step2.raw?.roleInsights?.confidence ?? 0;
  const step2Overall = jobTitle
    ? Math.min(step2CompanyConf, step2RoleConf || step2CompanyConf)
    : step2CompanyConf;

  if (step2.raw && step2Overall >= 0.5) {
    const result = normalizeLLMResponse(step2.raw, companyName, jobTitle);
    result.source = 'ai-web';
    return result;
  }

  // 官网有了但 LLM 还是低 confidence → 至少返回 name + website + 已有部分
  if (step2.raw) {
    const partial = normalizeLLMResponse(step2.raw, companyName, jobTitle);
    partial.source = 'ai-web';
    partial.website = partial.website || candidateUrl;
    return partial;
  }

  return null;
}
