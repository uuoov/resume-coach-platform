const AI_ENV_KEYS = [
  'DEEPSEEK_API_KEY',
  'DEEPSEEK_MODEL',
  'DEEPSEEK_BASE_URL',
  'OPENAI_API_KEY',
  'OPENAI_MODEL',
  'OPENAI_BASE_URL',
  'DASHSCOPE_API_KEY',
  'DASHSCOPE_MODEL',
] as const;

type AIEnvKey = typeof AI_ENV_KEYS[number];

const originalEnv: Partial<Record<AIEnvKey, string>> = {};

beforeAll(() => {
  for (const key of AI_ENV_KEYS) {
    originalEnv[key] = process.env[key];
  }
});

afterEach(() => {
  jest.resetModules();
  for (const key of AI_ENV_KEYS) {
    const value = originalEnv[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

function loadConfigWithAIEnv(env: Partial<Record<AIEnvKey, string>>) {
  jest.resetModules();
  for (const key of AI_ENV_KEYS) {
    delete process.env[key];
  }
  Object.assign(process.env, env);
  return require('../src/config').config as typeof import('../src/config').config;
}

describe('AI runtime config', () => {
  it('prefers DeepSeek when multiple providers are configured', () => {
    const config = loadConfigWithAIEnv({
      DEEPSEEK_API_KEY: 'deepseek-key',
      DASHSCOPE_API_KEY: 'dashscope-key',
      DASHSCOPE_MODEL: 'qwen-plus',
    });

    expect(config.ai).toEqual(expect.objectContaining({
      provider: 'deepseek',
      model: 'deepseek-chat',
      apiKey: 'deepseek-key',
      baseURL: 'https://api.deepseek.com',
    }));
  });

  it('does not report qwen-plus when only stale model variables exist', () => {
    const config = loadConfigWithAIEnv({
      DEEPSEEK_MODEL: 'deepseek-chat',
      DASHSCOPE_MODEL: 'qwen-plus',
    });

    expect(config.ai).toEqual(expect.objectContaining({
      provider: 'none',
      model: '',
      apiKey: '',
    }));
  });

  it('ignores example placeholder API keys', () => {
    const config = loadConfigWithAIEnv({
      DEEPSEEK_API_KEY: 'your_deepseek_api_key_here',
      DEEPSEEK_MODEL: 'deepseek-chat',
    });

    expect(config.ai).toEqual(expect.objectContaining({
      provider: 'none',
      model: '',
      apiKey: '',
    }));
  });
});
