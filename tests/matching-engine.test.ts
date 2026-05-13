import { calculateMatch } from '../src/services/matching-engine';
import type { JDAnalysis } from '../src/types/jd';
import type { Resume } from '../src/types/resume';

describe('Matching Engine', () => {
  const originalDashScopeKey = process.env.DASHSCOPE_API_KEY;
  const originalDeepSeekKey = process.env.DEEPSEEK_API_KEY;
  const originalOpenAIKey = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    process.env.DASHSCOPE_API_KEY = '';
    process.env.DEEPSEEK_API_KEY = '';
    process.env.OPENAI_API_KEY = '';
  });

  afterAll(() => {
    process.env.DASHSCOPE_API_KEY = originalDashScopeKey;
    process.env.DEEPSEEK_API_KEY = originalDeepSeekKey;
    process.env.OPENAI_API_KEY = originalOpenAIKey;
  });

  it('should match Chinese JD aliases against resume skills and project text', async () => {
    const resume: Resume = {
      id: 'resume-1',
      basicInfo: { name: '梁志聪', email: '', phone: '', location: '深圳' },
      summary: '具备医疗健康、智能硬件与数字化产品交叉背景，可承担需求分析、产品设计与研发协同工作。',
      education: [
        { id: 'edu-1', school: '深圳大学', degree: 'bachelor', major: '生物医学工程', startDate: '2023-09', endDate: '2027-07' },
      ],
      skills: [
        { id: 'skill-1', name: '用戶调研', category: 'soft-skill', proficiency: 'advanced' },
        { id: 'skill-2', name: 'PRD', category: 'tool', proficiency: 'advanced' },
        { id: 'skill-3', name: 'AIoT', category: 'domain-knowledge', proficiency: 'advanced' },
      ],
      workExperience: [],
      projects: [
        {
          id: 'project-1',
          name: '智能动静脉内瘘监测手环',
          role: '团队负责人',
          startDate: '2025-02',
          endDate: '2026-05',
          description: '完成临床调研、需求分析、PRD撰写，并推动可穿戴设备原型落地。',
          technologies: ['智能硬件', '医疗器械'],
        },
      ],
    };

    const jd: JDAnalysis = {
      jobTitle: '医疗健康 AIoT 产品实习生',
      company: '某医疗科技公司',
      hardSkills: [
        { name: '用户调研', isRequired: true, importance: 'high' },
        { name: 'PRD撰写', isRequired: true, importance: 'high' },
        { name: '可穿戴设备', isRequired: true, importance: 'medium' },
        { name: 'AIoT', isRequired: true, importance: 'high' },
      ],
      softSkills: ['跨团队协作'],
      experience: { minYears: 0, industryPreference: ['医疗健康', '智能硬件'] },
      education: { minDegree: 'bachelor', majorPreference: ['生物医学工程'] },
      keywords: [],
      hiddenRequirements: [],
      rawText: '',
    };

    const result = await calculateMatch(resume, jd);

    expect(result.dimensions.skill.score).toBe(100);
    expect(result.dimensions.education.details.join(' ')).toContain('本科');
    expect(result.dimensions.industry.score).toBe(100);
    expect(result.gaps.some((gap: any) => gap.item === '用户调研')).toBe(false);
  });
});
