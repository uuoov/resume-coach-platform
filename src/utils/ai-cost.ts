/**
 * AI 调用成本估算表
 *
 * 单价单位：USD / 1K tokens（按官方定价表近似）
 * 未列出的 provider/model 走默认估算
 *
 * 维护说明：价格变动后请更新这里；admin 后台的成本估算仅供预算监控，
 * 不作为财务结算依据。
 */

interface PricePair {
  prompt: number; // USD / 1K tokens
  completion: number; // USD / 1K tokens
  currency: 'USD' | 'CNY';
}

const DEFAULT_PRICE: PricePair = {
  prompt: 0.001,
  completion: 0.002,
  currency: 'USD',
};

const PRICE_TABLE: Record<string, PricePair> = {
  // DeepSeek 官方定价（USD）
  'deepseek-chat': { prompt: 0.00014, completion: 0.00028, currency: 'USD' },
  'deepseek-coder': { prompt: 0.00014, completion: 0.00028, currency: 'USD' },
  'deepseek-reasoner': { prompt: 0.00055, completion: 0.0022, currency: 'USD' },

  // OpenAI 经典定价（USD）
  'gpt-3.5-turbo': { prompt: 0.0005, completion: 0.0015, currency: 'USD' },
  'gpt-4': { prompt: 0.03, completion: 0.06, currency: 'USD' },
  'gpt-4-turbo': { prompt: 0.01, completion: 0.03, currency: 'USD' },
  'gpt-4o': { prompt: 0.005, completion: 0.015, currency: 'USD' },
  'gpt-4o-mini': { prompt: 0.00015, completion: 0.0006, currency: 'USD' },

  // 通义千问 / 阿里云百炼（CNY，按 7.2 折算 USD 仅用于跨 provider 比较）
  'qwen-plus': { prompt: 0.004, completion: 0.012, currency: 'CNY' },
  'qwen-turbo': { prompt: 0.002, completion: 0.006, currency: 'CNY' },
  'qwen-max': { prompt: 0.02, completion: 0.06, currency: 'CNY' },
};

/**
 * 根据 provider + model 获取单价
 */
export function getPrice(provider: string, model: string): PricePair {
  const key = model.toLowerCase();
  if (PRICE_TABLE[key]) {
    return PRICE_TABLE[key];
  }
  // 按 provider 兜底
  if (provider === 'deepseek') {
    return PRICE_TABLE['deepseek-chat'];
  }
  if (provider === 'openai') {
    return PRICE_TABLE['gpt-3.5-turbo'];
  }
  if (provider === 'dashscope') {
    return PRICE_TABLE['qwen-plus'];
  }
  return DEFAULT_PRICE;
}

/**
 * 估算成本（USD）
 * 输入：prompt tokens + completion tokens + provider + model
 */
export function estimateCost(
  provider: string,
  model: string,
  promptTokens: number | null | undefined,
  completionTokens: number | null | undefined
): number {
  const price = getPrice(provider, model);
  const p = promptTokens ?? 0;
  const c = completionTokens ?? 0;
  let usd = (p / 1000) * price.prompt + (c / 1000) * price.completion;
  if (price.currency === 'CNY') {
    usd = usd / 7.2;
  }
  return Math.round(usd * 10000) / 10000;
}

/**
 * 批量估算成本
 */
export function estimateCostFromStats(
  provider: string,
  model: string,
  totalPromptTokens: number,
  totalCompletionTokens: number
): number {
  return estimateCost(provider, model, totalPromptTokens, totalCompletionTokens);
}
