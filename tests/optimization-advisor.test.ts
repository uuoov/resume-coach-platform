import { generateSuggestions } from '../src/services/optimization-advisor';
import type { JDAnalysis } from '../src/types/jd';
import type { MatchResult } from '../src/types/match';
import type { Resume } from '../src/types/resume';

describe('Optimization Advisor', () => {
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

  it('should generate prioritized, deduplicated suggestions for product JD', async () => {
    const resume: Resume = {
      id: 'resume-1',
      basicInfo: { name: '梁志聪', email: '', phone: '', location: '深圳' },
      summary: '具备医疗健康与智能硬件项目背景。',
      education: [
        { id: 'edu-1', school: '深圳大学', degree: 'bachelor', major: '生物医学工程', startDate: '2023-09', endDate: '2027-07' },
      ],
      skills: [
        { id: 'skill-1', name: '用户调研', category: 'soft-skill', proficiency: 'advanced' },
        { id: 'skill-2', name: '需求分析', category: 'soft-skill', proficiency: 'advanced' },
        { id: 'skill-3', name: 'PRD', category: 'tool', proficiency: 'advanced' },
      ],
      workExperience: [
        {
          id: 'exp-1',
          company: '深圳大学医学创新成果转化中心',
          position: '项目助理',
          startDate: '2025-09',
          endDate: '',
          isCurrent: true,
          description: [
            '参与医疗器械成果转化材料整理和需求沟通',
            '协助项目洽谈、需求沟通和招投标材料撰写',
            '参与医疗设备配置分析和报告输出',
            '组织医工融合项目路演与跨学院活动',
          ],
        },
      ],
      projects: [],
    };

    const jdAnalysis: JDAnalysis = {
      jobTitle: '医疗健康 AIoT 产品实习生',
      company: '某医疗科技公司',
      hardSkills: [
        { name: '用户调研', isRequired: true, importance: 'high' },
        { name: '需求分析', isRequired: true, importance: 'high' },
        { name: 'PRD撰写', isRequired: true, importance: 'high' },
        { name: 'AIoT', isRequired: true, importance: 'high' },
      ],
      softSkills: ['跨团队协作', '项目推进能力'],
      experience: { minYears: 0, industryPreference: ['医疗健康', '医疗器械'] },
      education: { minDegree: 'bachelor', majorPreference: ['生物医学工程'] },
      keywords: [],
      hiddenRequirements: [
        {
          type: 'cross-functional',
          description: '需要跨团队协作',
          evidence: '与研发、硬件、临床和运营团队协作',
        },
      ],
      rawText: '医疗健康 AIoT 产品实习生，要求用户调研、需求分析、PRD 撰写、跨团队协作。',
    };

    const matchResult: MatchResult = {
      overallScore: 82,
      dimensions: {
        hardSkills: { score: 75, weight: 0.35, details: [] },
        experience: { score: 100, weight: 0.25, details: [] },
        education: { score: 100, weight: 0.15, details: [] },
        softSkills: { score: 50, weight: 0.15, details: [] },
        industry: { score: 100, weight: 0.1, details: [] },
      },
      strengths: [],
      gaps: [
        { category: 'skill', item: 'AIoT', matched: false, confidence: 0.9 },
        { category: 'soft-skill', item: '跨团队协作', matched: false, confidence: 0.8 },
      ],
      risks: [],
    };

    const suggestions = await generateSuggestions(resume, jdAnalysis, matchResult);
    const titles = suggestions.map(suggestion => suggestion.title);
    const quantificationSuggestions = suggestions.filter(suggestion => suggestion.category === 'quantification');

    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.length).toBeLessThanOrEqual(12);
    expect(new Set(titles).size).toBe(titles.length);
    expect(suggestions.some(suggestion => suggestion.priority === 'critical' && suggestion.title.includes('AIoT'))).toBe(true);
    expect(suggestions.some(suggestion => suggestion.priority === 'high' && suggestion.section === 'summary')).toBe(true);
    expect(quantificationSuggestions.length).toBeLessThanOrEqual(3);
    expect(quantificationSuggestions.every(suggestion => suggestion.currentContent && suggestion.suggestedContent)).toBe(true);
  });
});
