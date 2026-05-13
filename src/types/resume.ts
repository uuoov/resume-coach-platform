// 简历数据类型定义

export interface Resume {
  id: string;
  // 基本信息
  basicInfo: {
    name: string;
    phone?: string;
    email?: string;
    location?: string;
    website?: string;
    github?: string;
    linkedin?: string;
  };
  // 工作经历
  workExperience: WorkExperience[];
  // 项目经历
  projects: Project[];
  // 教育背景
  education: Education[];
  // 技能清单
  skills: Skill[];
  // 自我评价
  summary?: string;
  // 其他信息
  certifications?: string[];
  languages?: string[];
}

export interface WorkExperience {
  id: string;
  company: string;
  position: string;
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
  location?: string;
  description: string[];
  achievements?: string[];
}

export interface Project {
  id: string;
  name: string;
  role: string;
  startDate?: string;
  endDate?: string;
  description: string;
  technologies: string[];
  achievements?: string[];
}

export interface Education {
  id: string;
  school: string;
  degree: string;
  major: string;
  startDate: string;
  endDate: string;
  gpa?: string;
}

export interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
  proficiency: Proficiency;
  yearsOfExperience?: number;
}

export type SkillCategory =
  | 'programming-language'
  | 'framework'
  | 'database'
  | 'tool'
  | 'cloud'
  | 'soft-skill'
  | 'domain-knowledge';

export type Proficiency = 'beginner' | 'intermediate' | 'advanced' | 'expert';
