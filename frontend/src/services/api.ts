/**
 * API 客户端
 * 与后端通信
 */

import axios from 'axios';

// 从环境变量读取 API 基础 URL，开发环境默认为后端实际端口
const configuredApiBaseURL = import.meta.env.VITE_API_BASE_URL?.trim();
const isBrowserLocalApi = (url: string) => /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?(?:\/|$)/i.test(url);
const API_BASE_URL = configuredApiBaseURL && !(import.meta.env.PROD && isBrowserLocalApi(configuredApiBaseURL))
  ? configuredApiBaseURL
  : (import.meta.env.DEV ? 'http://localhost:3001/api' : '/api');
export const AUTH_TOKEN_KEY = 'resume_coach_token';
export const AUTH_EXPIRED_EVENT = 'resume-coach:auth-expired';
const LEGACY_TOKEN_KEY = 'token';
const isDev = import.meta.env.DEV;

const getStoredToken = (): string | null => {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  return localStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY);
};

const clearStoredToken = () => {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
  }
};

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // 增加到 120 秒，因为 AI 分析和生成可能需要较长时间
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器：自动注入 JWT Token
apiClient.interceptors.request.use(
  (config) => {
    const token = getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (isDev) {
      console.log('🚀 API 请求:', config.method?.toUpperCase(), config.url);
    }
    return config;
  },
  (error) => {
    if (isDev) {
      console.error('❌ 请求错误:', error);
    }
    return Promise.reject(error);
  }
);

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    if (isDev) {
      console.log('✅ API 响应:', response.status, response.config.url);
    }
    return response;
  },
  (error) => {
    if (isDev) {
      console.error('❌ API 响应错误:', error.response?.status, error.response?.data || error.message);
    }

    // 统一错误处理
    const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message;

    // 常见错误类型处理
    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new Error('请求超时，请重试'));
    }

    if (error.code === 'ERR_NETWORK') {
      return Promise.reject(new Error('网络连接失败，请检查网络'));
    }

    if (error.response?.status === 401) {
      clearStoredToken();
      return Promise.reject(new Error('未授权访问，请重新登录'));
    }

    if (error.response?.status === 403) {
      return Promise.reject(new Error('权限不足，无法访问该资源'));
    }

    if (error.response?.status === 404) {
      return Promise.reject(new Error('接口不存在'));
    }

    if (error.response?.status === 500) {
      return Promise.reject(new Error('服务器内部错误，请稍后重试'));
    }

    return Promise.reject(new Error(errorMessage || '请求失败，请重试'));
  }
);

// 类型定义
export interface Resume {
  id: string;
  basicInfo: {
    name: string;
    email: string;
    phone: string;
    location: string;
    website: string;
    github: string;
    linkedin: string;
  };
  workExperience: Array<{
    id: string;
    company: string;
    position: string;
    startDate: string;
    endDate: string;
    isCurrent: boolean;
    description: string[];
  }>;
  projects: Array<{
    id: string;
    name: string;
    role: string;
    startDate: string;
    endDate: string;
    description: string;
    technologies: string[];
  }>;
  education: Array<{
    id: string;
    school: string;
    degree: string;
    major: string;
    startDate: string;
    endDate: string;
  }>;
  skills: Array<{
    id: string;
    name: string;
    category: string;
    proficiency: string;
  }>;
  summary?: string;
  certifications?: string[];
  languages?: string[];
}

export interface CompanyInfo {
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
}

export interface JDAnalysis {
  id?: string;
  jobTitle: string;
  company: string;
  companyInfo?: CompanyInfo;
  hardSkills: Array<{
    name: string;
    isRequired: boolean;
    importance: 'critical' | 'high' | 'medium' | 'low';
    yearsRequired?: number;
  }>;
  softSkills: string[];
  experience: {
    minYears: number;
    maxYears?: number;
    industryPreference?: string[];
  };
  education: {
    minDegree: string;
    majorPreference?: string[];
  };
  keywords: string[];
  hiddenRequirements: Array<{
    type: string;
    description: string;
    evidence: string;
  }>;
}

export interface MatchResult {
  overallScore: number;
  dimensions: {
    skill: { score: number; weight: number; details: string[] };
    experience: { score: number; weight: number; details: string[] };
    education: { score: number; weight: number; details: string[] };
    softSkill: { score: number; weight: number; details: string[] };
    industry: { score: number; weight: number; details: string[] };
  };
  strengths: Array<{ category: string; item: string; description: string }>;
  gaps: Array<{ category: string; item: string; description: string }>;
  risks: Array<{ type: string; description: string; severity?: string; suggestion?: string }>;
  overallAnalysis?: string;
  aiPowered?: boolean;
}

export interface OptimizationSuggestion {
  id: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  section: string;
  title: string;
  description: string;
  reason?: string;
  currentContent?: string;
  suggestedContent?: string;
  assumptionsMade?: string[];
}

// API 函数
export const api = {
  /**
   * 上传并解析简历
   */
  parseResume: async (file: File): Promise<Resume> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post('/resume/parse', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.data;
  },

  /**
   * 分析 JD
   */
  analyzeJD: async (
    jobTitle: string,
    company: string,
    jdText: string
  ): Promise<JDAnalysis> => {
    const response = await apiClient.post('/jd/analyze', {
      jobTitle,
      company,
      jdText,
    });

    return response.data.data;
  },

  /**
   * 计算匹配度
   */
  calculateMatch: async (
    resume: Resume,
    jdAnalysis: JDAnalysis
  ): Promise<MatchResult> => {
    const response = await apiClient.post('/match/calculate', {
      resume,
      jdAnalysis,
    });

    return response.data.data;
  },

  /**
   * 获取优化建议
   */
  getSuggestions: async (
    resume: Resume,
    jdAnalysis: JDAnalysis,
    matchResult: MatchResult
  ): Promise<OptimizationSuggestion[]> => {
    const response = await apiClient.post('/optimize/suggest', {
      resume,
      jdAnalysis,
      matchResult,
    });

    return response.data.data;
  },

  /**
   * 生成优化后的内容
   */
  generateOptimizedContent: async (
    resume: Resume,
    jdAnalysis: JDAnalysis,
    matchResult: MatchResult,
    suggestion: OptimizationSuggestion,
    originalContent: string
  ): Promise<string> => {
    const response = await apiClient.post('/optimize/suggest', {
      resume,
      jdAnalysis,
      matchResult,
      suggestionId: suggestion.id,
      suggestion,
      originalContent,
    });

    return response.data.data.optimizedContent;
  },

  /**
   * 用户登录
   */
  login: async (email: string, password: string) => {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data;
  },

  /**
   * 用户注册
   */
  register: async (email: string, password: string, name?: string) => {
    const response = await apiClient.post('/auth/register', { email, password, name });
    return response.data;
  },

  /**
   * 获取当前用户信息
   */
  getCurrentUser: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  /**
   * 查询公司信息
   */
  queryCompanyInfo: async (name: string): Promise<CompanyInfo> => {
    const response = await apiClient.get('/company/query', {
      params: { name },
    });
    return response.data.data;
  },

  /**
   * 自动查询公司信息（从 JD 文本中提取）
   */
  autoQueryCompanyInfo: async (jdText: string): Promise<CompanyInfo | null> => {
    const response = await apiClient.post('/company/auto-query', { jdText });
    return response.data.data;
  },

  /**
   * 导出简历为 PDF
   */
  exportResumePDF: async (resume: Resume): Promise<Blob> => {
    const response = await apiClient.post('/resume/export-pdf', { resume }, {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * 预览简历 PDF
   */
  previewResumePDF: async (resume: Resume): Promise<Blob> => {
    const response = await apiClient.post('/resume/preview-pdf', { resume }, {
      responseType: 'blob',
    });
    return response.data;
  },
};

/**
 * Admin API 命名空间
 */
export const adminApi = {
  getDashboard: async () => {
    const response = await apiClient.get('/admin/dashboard');
    return response.data.data;
  },

  getSystem: async () => {
    const response = await apiClient.get('/admin/system');
    return response.data.data;
  },

  listUsers: async (params: {
    q?: string;
    status?: 'ACTIVE' | 'DISABLED';
    role?: 'USER' | 'ADMIN';
    page?: number;
    pageSize?: number;
  } = {}) => {
    const response = await apiClient.get('/admin/users', { params });
    return response.data.data;
  },

  updateUser: async (id: string, data: {
    role?: 'USER' | 'ADMIN';
    status?: 'ACTIVE' | 'DISABLED';
  }) => {
    const response = await apiClient.patch(`/admin/users/${id}`, data);
    return response.data.data;
  },

  listCompanies: async (params: {
    source?: string;
    keyword?: string;
    page?: number;
    pageSize?: number;
  } = {}) => {
    const response = await apiClient.get('/admin/companies', { params });
    return response.data.data;
  },

  createCompany: async (data: any) => {
    const response = await apiClient.post('/admin/companies', data);
    return response.data.data;
  },

  updateCompany: async (id: string, data: any) => {
    const response = await apiClient.patch(`/admin/companies/${id}`, data);
    return response.data.data;
  },

  deleteCompany: async (id: string) => {
    const response = await apiClient.delete(`/admin/companies/${id}`);
    return response.data.data;
  },

  listAiLogs: async (params: {
    service?: string;
    userId?: string;
    success?: boolean;
    since?: string;
    page?: number;
    pageSize?: number;
  } = {}) => {
    const response = await apiClient.get('/admin/ai-logs', { params });
    return response.data.data;
  },

  getAiLogStats: async (days: number = 7) => {
    const response = await apiClient.get('/admin/ai-logs/stats', { params: { days } });
    return response.data.data;
  },
};

export default apiClient;
