// 优化建议相关类型定义

export interface OptimizationSuggestion {
  id: string;
  // 优先级
  priority: Priority;
  // 建议类型
  category: SuggestionCategory;
  // 影响的部分
  section: ResumeSection;
  // 建议标题
  title: string;
  // 详细描述
  description: string;
  // 当前内容
  currentContent?: string;
  // 建议修改为
  suggestedContent?: string;
  // 修改原因
  reason: string;
  // AI根据JD做出的推断假设（需用户核实的事实）
  assumptionsMade?: string[];
}

export type Priority = 'critical' | 'high' | 'medium' | 'low';

export type SuggestionCategory =
  | 'keyword-addition'      // 关键词添加
  | 'content-rewrite'       // 内容重写
  | 'skill-reorder'         // 技能重排
  | 'quantification'        // 量化补充
  | 'culture-fit'          // 文化对齐
  | 'format-fix'           // 格式修复
  | 'addition'             // 内容补充
  | 'removal';             // 内容删除

export type ResumeSection =
  | 'summary'
  | 'work-experience'
  | 'project'
  | 'education'
  | 'skills'
  | 'certifications'
  | 'overall';

export interface OptimizationContext {
  companyInfo?: CompanyInfo;
  jdAnalysis: JDAnalysis;
  matchResult: MatchResult;
  originalResume: Resume;
}

// 导入其他类型
import type { JDAnalysis, CompanyInfo } from './jd';
import type { MatchResult } from './match';
import type { Resume } from './resume';
