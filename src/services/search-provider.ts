/**
 * 搜索 Provider 抽象
 *
 * - 运行时：使用 Tavily REST API（生产 Docker 容器无 MCP 支持）
 * - 开发期：在 Claude Code 环境内也可使用 Tavily MCP 工具做一次性验证
 *
 * Provider 接口可扩展：未来可加 BraveSearchProvider、BingSearchProvider 等
 */

import { config } from '../config';
import { logger } from '../utils/logger';

export interface SearchResult {
  title: string;
  url: string;
  content: string;
  score?: number;
}

export interface SearchQueryOptions {
  maxResults?: number;
  timeoutMs?: number;
}

export interface SearchProvider {
  search(query: string, opts?: SearchQueryOptions): Promise<SearchResult[]>;
  extract(url: string, opts?: { timeoutMs?: number }): Promise<string>;
}

/**
 * Tavily REST API 实现（基于 https://api.tavily.com 文档）
 */
export class TavilySearchProvider implements SearchProvider {
  constructor(
    private apiKey: string,
    private baseUrl: string = 'https://api.tavily.com'
  ) {}

  async search(query: string, opts: SearchQueryOptions = {}): Promise<SearchResult[]> {
    const maxResults = opts.maxResults ?? 5;
    const timeoutMs = opts.timeoutMs ?? config.search.requestTimeoutMs;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          query,
          max_results: maxResults,
          include_answer: true,
          search_depth: 'advanced',
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Tavily search failed: HTTP ${response.status}`);
      }

      const data = (await response.json()) as any;
      const results: SearchResult[] = (data.results || []).map((r: any) => ({
        title: r.title ?? '',
        url: r.url ?? '',
        content: r.content ?? '',
        score: typeof r.score === 'number' ? r.score : undefined,
      }));

      // 如果有 include_answer 字段，合成一条置顶结果
      if (data.answer && results.length > 0) {
        results.unshift({
          title: 'Tavily Summary',
          url: '',
          content: String(data.answer),
          score: 1.0,
        });
      }

      return results;
    } finally {
      clearTimeout(timer);
    }
  }

  async extract(url: string, opts: { timeoutMs?: number } = {}): Promise<string> {
    const timeoutMs = opts.timeoutMs ?? config.search.requestTimeoutMs;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ urls: [url] }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Tavily extract failed: HTTP ${response.status}`);
      }

      const data = (await response.json()) as any;
      return data.results?.[0]?.raw_content ?? '';
    } finally {
      clearTimeout(timer);
    }
  }
}

/**
 * 工厂：根据环境变量创建可用的 SearchProvider
 * 没配置 key 时返回 null，让上游走 mock fallback
 */
export function createSearchProvider(): SearchProvider | null {
  const tavilyKey = config.search.tavilyApiKey;
  if (tavilyKey) {
    return new TavilySearchProvider(tavilyKey, config.search.tavilyBaseUrl);
  }

  // 预留：Brave Search REST API 接入位
  // const braveKey = config.search.braveSearchApiKey;
  // if (braveKey) { return new BraveSearchProvider(braveKey); }

  logger.debug('未配置搜索 API key，将退回 Mock 公司信息', 'search-provider');
  return null;
}
