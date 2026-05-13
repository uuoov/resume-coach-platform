import { DashScopeClient, getConfiguredAIClientConfig } from '../src/utils/ai-client';

describe('AI client retry behavior', () => {
  const originalFetch = global.fetch;
  const originalDeepSeekKey = process.env.DEEPSEEK_API_KEY;
  const originalDeepSeekModel = process.env.DEEPSEEK_MODEL;
  const originalDashScopeKey = process.env.DASHSCOPE_API_KEY;
  const originalOpenAIKey = process.env.OPENAI_API_KEY;

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.DEEPSEEK_API_KEY = originalDeepSeekKey;
    process.env.DEEPSEEK_MODEL = originalDeepSeekModel;
    process.env.DASHSCOPE_API_KEY = originalDashScopeKey;
    process.env.OPENAI_API_KEY = originalOpenAIKey;
    jest.restoreAllMocks();
  });

  it('does not retry non-retriable authentication failures', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: jest.fn().mockResolvedValue('Invalid API key'),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const client = new DashScopeClient({ apiKey: 'invalid-key' });

    await expect(client.generateWithRetry('Analyze this JD')).rejects.toThrow('DashScope API error: 401');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('prefers DeepSeek OpenAI-compatible config when DEEPSEEK_API_KEY is set', () => {
    process.env.DEEPSEEK_API_KEY = 'test-deepseek-key';
    process.env.DEEPSEEK_MODEL = 'deepseek-v4-flash';
    process.env.DASHSCOPE_API_KEY = 'test-dashscope-key';
    process.env.OPENAI_API_KEY = '';

    expect(getConfiguredAIClientConfig()).toEqual(expect.objectContaining({
      provider: 'deepseek',
      apiKey: 'test-deepseek-key',
      model: 'deepseek-v4-flash',
      baseURL: 'https://api.deepseek.com',
    }));
  });
});
