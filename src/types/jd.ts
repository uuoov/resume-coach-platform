// JD 分析相关类型定义

export interface JDAnalysis {
  jobTitle: string;
  company: string;
  // 公司信息
  companyInfo?: CompanyInfo;
  // 硬技能要求
  hardSkills: SkillRequirement[];
  // 软技能要求
  softSkills: string[];
  // 经验要求
  experience: ExperienceRequirement;
  // 教育要求
  education: EducationRequirement;
  // 关键词列表
  keywords: string[];
  // 隐性需求
  hiddenRequirements: HiddenRequirement[];
  // 原始 JD 文本
  rawText: string;
}

export interface CompanyInfo {
  name: string;
  industry?: string;
  size?: string;
  location?: string;
  website?: string;
  description?: string;
  culture?: any;
  techStack?: string[];
}

export interface SkillRequirement {
  name: string;
  isRequired: boolean;
  importance: 'low' | 'medium' | 'high' | 'critical';
  yearsRequired?: number;
  context?: string;
}

export interface ExperienceRequirement {
  minYears: number;
  maxYears?: number;
  industryPreference?: string[];
  companyTypePreference?: CompanyType[];
}

export type CompanyType = 'startup' | 'scaleup' | 'enterprise' | 'foreign' | 'state-owned';

export interface EducationRequirement {
  minDegree: Degree;
  preferredDegree?: Degree;
  majorPreference?: string[];
  schoolPreference?: string[];
}

export type Degree = 'high-school' | 'associate' | 'bachelor' | 'master' | 'phd';

export interface HiddenRequirement {
  type: HiddenRequirementType;
  description: string;
  evidence: string;
}

export type HiddenRequirementType =
  | 'work-pressure'      // 工作压力（暗示加班）
  | 'fast-paced'         // 快节奏
  | 'leadership'         // 领导能力
  | 'independent'        // 独立工作
  | 'cross-functional'   // 跨部门协作
  | 'customer-facing'    // 对外沟通
  | 'innovation'         // 创新能力
  | 'detail-oriented';   // 注重细节
