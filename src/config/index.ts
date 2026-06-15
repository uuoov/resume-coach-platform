/**
 * 生产环境配置
 */

function readApiKey(name: string): string | undefined {
  const value = process.env[name]?.trim();
  if (!value || value.startsWith('your_') || value.includes('api_key_here')) {
    return undefined;
  }

  return value;
}

const deepSeekApiKey = readApiKey('DEEPSEEK_API_KEY');
const openAIApiKey = readApiKey('OPENAI_API_KEY');
const dashScopeApiKey = readApiKey('DASHSCOPE_API_KEY');

const aiProvider = deepSeekApiKey
  ? 'deepseek'
  : openAIApiKey
    ? 'openai'
    : dashScopeApiKey
      ? 'dashscope'
      : 'none';

const aiModel =
  aiProvider === 'deepseek'
    ? (process.env.DEEPSEEK_MODEL || 'deepseek-chat')
    : aiProvider === 'openai'
      ? (process.env.OPENAI_MODEL || 'gpt-3.5-turbo')
      : aiProvider === 'dashscope'
        ? (process.env.DASHSCOPE_MODEL || 'qwen-plus')
        : '';

const aiApiKey =
  aiProvider === 'deepseek'
    ? deepSeekApiKey
    : aiProvider === 'openai'
      ? openAIApiKey
      : aiProvider === 'dashscope'
        ? dashScopeApiKey
        : '';

const aiBaseURL =
  aiProvider === 'deepseek'
    ? (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com')
    : aiProvider === 'openai'
      ? process.env.OPENAI_BASE_URL
      : undefined;

export const config = {
  // AI 配置
  ai: {
    provider: aiProvider,
    model: aiModel,
    apiKey: aiApiKey || '',
    baseURL: aiBaseURL,
  },

  // 服务器配置
  server: {
    port: parseInt(process.env.PORT || '3001', 10),
    env: process.env.NODE_ENV || 'development',
    corsOrigin: process.env.CORS_ORIGIN || '*',
    requestLimit: process.env.REQUEST_LIMIT || '100kb',
    uploadLimit: process.env.UPLOAD_LIMIT || '10mb',
  },

  // 数据库配置
  database: {
    url: process.env.DATABASE_URL || '',
  },

  // 文件存储配置
  storage: {
    path: process.env.FILE_STORAGE_PATH || './uploads',
    oss: {
      accessKeyId: process.env.OSS_ACCESS_KEY_ID || '',
      accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET || '',
      bucket: process.env.OSS_BUCKET || '',
      region: process.env.OSS_REGION || 'oss-cn-shanghai',
    },
  },

  // 企业信息 API 配置
  companyInfo: {
    qichachaApiKey: process.env.QICHACHA_API_KEY || '',
  },

  // 搜索服务配置（用于公司信息抓取）
  search: {
    tavilyApiKey: readApiKey('TAVILY_API_KEY') || '',
    tavilyBaseUrl: process.env.TAVILY_BASE_URL || 'https://api.tavily.com',
    braveSearchApiKey: readApiKey('BRAVE_SEARCH_API_KEY') || '',
    requestTimeoutMs: parseInt(process.env.SEARCH_TIMEOUT_MS || '5000', 10),
  },

  // 安全配置
  security: {
    jwtSecret: process.env.JWT_SECRET || 'default_jwt_secret',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
  },

  // 缓存配置
  cache: {
    url: process.env.REDIS_URL || null,
    ttl: parseInt(process.env.CACHE_TTL || '3600', 10),
  },

  // 日志配置
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    filePath: process.env.LOG_FILE_PATH || null,
    maxSize: process.env.LOG_MAX_SIZE || '10m',
    maxFiles: process.env.LOG_MAX_FILES || '7d',
  },
};

export default config;
