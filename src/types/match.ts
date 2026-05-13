// 匹配度分析相关类型定义

export interface MatchResult {
  // 整体匹配分 (0-100)
  overallScore: number;
  // 各维度匹配度
  dimensions: DimensionScores;
  // 优势项
  strengths: MatchItem[];
  // 差距项
  gaps: MatchItem[];
  // 风险点
  risks: RiskItem[];
  // AI 生成的整体分析报告
  overallAnalysis?: string;
  // 是否使用了 AI 匹配
  aiPowered?: boolean;
}

export interface DimensionScores {
  hardSkills: DimensionScore;
  experience: DimensionScore;
  education: DimensionScore;
  softSkills: DimensionScore;
  industry: DimensionScore;
}

export interface DimensionScore {
  score: number;
  weight: number;
  details: string[];
}

export interface MatchItem {
  category: MatchCategory;
  item: string;
  matched: boolean;
  confidence: number;
  evidence?: string;
}

export type MatchCategory =
  | 'skill'
  | 'experience'
  | 'education'
  | 'soft-skill'
  | 'industry'
  | 'certification';

export interface RiskItem {
  type: RiskType;
  description: string;
  severity: 'low' | 'medium' | 'high';
  suggestion?: string;
}

export type RiskType =
  | 'skill-gap'           // 技能差距
  | 'experience-gap'      // 经验差距
  | 'job-hopping'         // 频繁跳槽
  | 'career-gap'          // 职业空窗期
  | 'overqualified'       // 资历过高
  | 'underqualified'      // 资历不足
  | 'industry-mismatch';  // 行业不匹配
