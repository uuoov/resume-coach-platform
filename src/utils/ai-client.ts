/**
 * AI API 客户端
 * 支持多种 AI 提供商，共享重试逻辑
 */

export interface GenerateOptions {
  /**
   * 0 = 完全确定性（用于结构化抽取、打分等需要稳定输出的场景）
   * 默认未指定时由具体客户端决定（通常 0.7）
   */
  temperature?: number;
}

export interface AIClientConfig {
  apiKey: string;
  model?: string;
  baseURL?: string;
  provider?: 'dashscope' | 'openai' | 'deepseek';
}

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export class AIClientError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly status?: number,
    public readonly retriable = true
  ) {
    super(message);
    this.name = 'AIClientError';
  }
}

function isRetriableStatus(status: number): boolean {
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}

function shouldRetry(error: unknown): boolean {
  if (error instanceof AIClientError) {
    return error.retriable;
  }

  return true;
}

function readConfiguredApiKey(name: string): string | undefined {
  const value = process.env[name]?.trim();
  if (!value || value.startsWith('your_') || value.includes('api_key_here')) {
    return undefined;
  }

  return value;
}

/**
 * AI 客户端基类 – 共享重试逻辑
 */
abstract class BaseAIClient {
  protected apiKey: string;
  protected model: string;

  constructor(config: AIClientConfig, defaultModel: string) {
    this.apiKey = config.apiKey;
    this.model = config.model || defaultModel;
  }

  abstract generate(prompt: string, opts?: GenerateOptions): Promise<AIResponse>;

  async generateWithRetry(
    prompt: string,
    maxRetries = 3,
    opts?: GenerateOptions
  ): Promise<AIResponse> {
    let lastError: Error | null = null;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await this.generate(prompt, opts);
      } catch (error) {
        lastError = error as Error;
        if (!shouldRetry(error) || i === maxRetries - 1) {
          break;
        }

        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }

    throw lastError || new Error('AI API 调用失败');
  }
}

/**
 * 通义千问 API 客户端
 */
export class DashScopeClient extends BaseAIClient {
  constructor(config: AIClientConfig) {
    super(config, 'qwen-plus');
  }

  async generate(prompt: string, opts?: GenerateOptions): Promise<AIResponse> {
    const parameters: Record<string, any> = {
      result_format: 'message',
    };
    if (opts?.temperature !== undefined) {
      parameters.temperature = opts.temperature;
    }

    const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        input: {
          messages: [
            { role: 'user', content: prompt },
          ],
        },
        parameters,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new AIClientError(
        `DashScope API error: ${response.status} - ${error}`,
        'dashscope',
        response.status,
        isRetriableStatus(response.status)
      );
    }

    const data = await response.json() as any;

    return {
      text: data.output?.choices?.[0]?.message?.content || '',
      usage: data.usage ? {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
      } : undefined,
    };
  }
}

/**
 * OpenAI 兼容 API 客户端
 */
export class OpenAIClient extends BaseAIClient {
  private baseURL: string;
  private provider: string;

  constructor(config: AIClientConfig) {
    super(config, 'gpt-3.5-turbo');
    this.baseURL = config.baseURL || 'https://api.openai.com/v1';
    this.provider = config.provider || 'openai';
  }

  async generate(prompt: string, opts?: GenerateOptions): Promise<AIResponse> {
    const body: Record<string, any> = {
      model: this.model,
      messages: [
        { role: 'user', content: prompt },
      ],
    };
    if (opts?.temperature !== undefined) {
      body.temperature = opts.temperature;
    }

    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new AIClientError(
        `${this.provider} API error: ${response.status} - ${error}`,
        this.provider,
        response.status,
        isRetriableStatus(response.status)
      );
    }

    const data = await response.json() as any;

    return {
      text: data.choices?.[0]?.message?.content || '',
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      } : undefined,
    };
  }
}

/**
 * 创建 AI 客户端
 */
export function createAIClient(config: AIClientConfig) {
  if (config.baseURL || config.provider === 'openai' || config.provider === 'deepseek') {
    return new OpenAIClient(config);
  }
  return new DashScopeClient(config);
}

export function getConfiguredAIClientConfig(): AIClientConfig | null {
  const deepSeekApiKey = readConfiguredApiKey('DEEPSEEK_API_KEY');
  const openAIApiKey = readConfiguredApiKey('OPENAI_API_KEY');
  const dashScopeApiKey = readConfiguredApiKey('DASHSCOPE_API_KEY');

  if (deepSeekApiKey) {
    return {
      provider: 'deepseek',
      apiKey: deepSeekApiKey,
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
      baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    };
  }

  if (openAIApiKey) {
    return {
      provider: 'openai',
      apiKey: openAIApiKey,
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      baseURL: process.env.OPENAI_BASE_URL,
    };
  }

  if (dashScopeApiKey) {
    return {
      provider: 'dashscope',
      apiKey: dashScopeApiKey,
      model: process.env.DASHSCOPE_MODEL || 'qwen-plus',
    };
  }

  return null;
}

export function hasConfiguredAIClient(): boolean {
  return getConfiguredAIClientConfig() !== null;
}

export function createConfiguredAIClient() {
  const config = getConfiguredAIClientConfig();
  return config ? createAIClient(config) : null;
}
