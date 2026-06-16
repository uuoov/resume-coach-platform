/**
 * 基于 LLM 知识 + Jina Reader 的公司信息检索
 *
 * 流程（Plan B）：
 *   1. Step 1: 直接问 LLM「你知道这家公司吗？请返回 JSON + confidence」
 *      - confidence >= 0.6 → 直接采用（source: 'ai-knowledge'）
 *   2. Step 2: confidence < 0.6 时，让 LLM 给一个可能的官网 URL，
 *      用 https://r.jina.ai/{url} 把官网转成 markdown，
 *      再问一次 LLM 提取结构化信息（source: 'ai-web'）
 *   3. Step 3: 都失败 → 返回 null（让上游走 mock 兜底，标记 source: 'fallback'）
 *
 * 成本：
 *   - 知名公司：1 次 LLM 调用
 *   - 长尾公司：1 ~ 2 次 LLM 调用 + 1 次 Jina 抓取（免费）
 *   - 完全失败：上游走 mock，不浪费调用
 *
 * 隐私：只把公司名发给 LLM provider（DeepSeek/OpenAI/DashScope），
 *      不再发给 Tavily 等第三方搜索 API。
 */

import { createConfiguredAIClient } from '../utils/ai-client';
import { generateWithAudit } from './ai-audit';
import { logger } from '../utils/logger';

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

/**
 * 规范化 LLM 返回的字段：null/空字符串/空数组 → undefined
 */
function normalizeLLMResponse(raw: LLMCompanyResponse, companyName: string): CompanyInfoFromAI {
  const pick = (v: string | null | undefined): string | undefined => {
    const s = (v ?? '').toString().trim();
    return s ? s : undefined;
  };

  const values = Array.isArray(raw.culture?.values) ? raw.culture!.values!.filter(Boolean) : null;
  const workStyle = raw.culture?.workStyle ?? null;

  return {
    name: companyName,
    industry: pick(raw.industry),
    size: pick(raw.size),
    location: pick(raw.location),
    website: pick(raw.website),
    description: pick(raw.description),
    culture: values || workStyle
      ? {
          values: values ?? undefined,
          workStyle: pick(workStyle) ?? undefined,
        }
      : undefined,
    techStack: Array.isArray(raw.techStack) ? raw.techStack.filter(Boolean) : undefined,
    source: 'ai-knowledge',
  };
}

/**
 * Step 1: 直接问 LLM 公司信息 + confidence
 */
async function queryLLMForCompany(
  companyName: string,
  websiteContext?: string
): Promise<{ raw: LLMCompanyResponse | null; source: 'ai-knowledge' | 'ai-web' }> {
  const client = createConfiguredAIClient();
  if (!client) {
    return { raw: null, source: 'ai-knowledge' };
  }

  const contextBlock = websiteContext
    ? `\n\n以下是「${companyName}」官网的 markdown 内容片段（可能包含关于我们 / 公司简介）：\n${websiteContext.slice(0, 8000)}\n`
    : '';

  const prompt = `你是企业信息分析师。${websiteContext ? '基于以下官网内容' : '基于你的训练知识'}，请提取「${companyName}」的结构化信息。

${contextBlock}

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
  "techStack": ["技术1", "技术2"],
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
4. techStack 和 culture.values 不确定时返回 null 或空数组`;

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
 * 主入口：获取公司信息
 *
 * 返回 null 表示未拿到有效信息，调用方走 mock 兜底
 */
export async function fetchCompanyInfoFromAI(
  companyName: string
): Promise<CompanyInfoFromAI | null> {
  // Step 1: 先问 LLM
  const step1 = await queryLLMForCompany(companyName);

  if (step1.raw && step1.raw.confidence >= 0.6) {
    // 知名公司，直接采用
    return normalizeLLMResponse(step1.raw, companyName);
  }

  // Step 2: confidence 较低或缺失，尝试用官网补全
  // 优先用 Step 1 给的 website；没给就尝试常见 TLD
  const candidateUrl = step1.raw?.website?.trim() || `${companyName}.com`;

  const markdown = await fetchWebsiteMarkdown(candidateUrl);
  if (!markdown) {
    // 官网也抓不到 → 返回 Step 1 的部分结果（如果有的话）
    if (step1.raw && step1.raw.confidence >= 0.3) {
      return normalizeLLMResponse(step1.raw, companyName);
    }
    return null;
  }

  // Step 3: 用官网内容再问一次
  const step2 = await queryLLMForCompany(companyName, markdown);
  if (step2.raw && step2.raw.confidence >= 0.5) {
    const result = normalizeLLMResponse(step2.raw, companyName);
    result.source = 'ai-web';
    return result;
  }

  // 官网有了但 LLM 还是低 confidence → 至少返回 name + website
  if (step2.raw) {
    const partial = normalizeLLMResponse(step2.raw, companyName);
    partial.source = 'ai-web';
    partial.website = partial.website || candidateUrl;
    return partial;
  }

  return null;
}
