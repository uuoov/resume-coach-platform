import { calculateMatch } from '../src/services/matching-engine';
import type { JDAnalysis } from '../src/types/jd';
import type { Resume } from '../src/types/resume';

const AI_KEY_NAMES = ['DEEPSEEK_API_KEY', 'DASHSCOPE_API_KEY', 'OPENAI_API_KEY'] as const;
type AIKeyName = (typeof AI_KEY_NAMES)[number];

const originalAIEnv: Record<AIKeyName, string | undefined> = {
  DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
  DASHSCOPE_API_KEY: process.env.DASHSCOPE_API_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
};

const demoResume: Resume = {
  id: 'demo-resume-1',
  basicInfo: {
    name: 'Alex Chen',
    email: 'alex@example.com',
    phone: '13800000000',
    location: 'Shanghai',
  },
  summary: 'Full-stack engineer with SaaS product experience and cross-functional collaboration.',
  workExperience: [
    {
      id: 'work-1',
      company: 'Acme SaaS',
      position: 'Full-stack Engineer',
      startDate: '2021-06',
      isCurrent: true,
      description: [
        'Built a SaaS analytics dashboard with React, TypeScript, Node.js, and PostgreSQL.',
        'Collaborated with product, design, and data teams to improve onboarding conversion.',
      ],
    },
  ],
  projects: [
    {
      id: 'project-1',
      name: 'Resume Analytics Dashboard',
      role: 'Tech Lead',
      description: 'Designed REST APIs and reusable React components for a reporting workflow.',
      technologies: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
    },
  ],
  education: [
    {
      id: 'edu-1',
      school: 'Shanghai University',
      degree: 'bachelor',
      major: 'Computer Science',
      startDate: '2017-09',
      endDate: '2021-06',
    },
  ],
  skills: [
    { id: 'skill-1', name: 'React', category: 'framework', proficiency: 'advanced' },
    { id: 'skill-2', name: 'TypeScript', category: 'programming-language', proficiency: 'advanced' },
    { id: 'skill-3', name: 'Node.js', category: 'framework', proficiency: 'advanced' },
    { id: 'skill-4', name: 'PostgreSQL', category: 'database', proficiency: 'intermediate' },
  ],
};

const targetJD: JDAnalysis = {
  jobTitle: 'Senior Full-stack Engineer',
  company: 'Target SaaS Company',
  hardSkills: [
    { name: 'React', isRequired: true, importance: 'critical' },
    { name: 'TypeScript', isRequired: true, importance: 'high' },
    { name: 'Node.js', isRequired: true, importance: 'high' },
    { name: 'PostgreSQL', isRequired: false, importance: 'medium' },
  ],
  softSkills: ['cross-functional collaboration'],
  experience: {
    minYears: 2,
    industryPreference: ['SaaS'],
  },
  education: {
    minDegree: 'bachelor',
    majorPreference: ['Computer Science'],
  },
  keywords: ['dashboard', 'REST API', 'product analytics'],
  hiddenRequirements: [],
  rawText: 'Looking for a full-stack engineer with React, TypeScript, Node.js, PostgreSQL, and SaaS experience.',
};

describe('Demo matching test', () => {
  beforeEach(() => {
    for (const key of AI_KEY_NAMES) {
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of AI_KEY_NAMES) {
      const value = originalAIEnv[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it('scores a resume against a target JD without external AI services', async () => {
    const result = await calculateMatch(demoResume, targetJD);

    expect(result.aiPowered).toBe(false);
    expect(result.overallScore).toBeGreaterThanOrEqual(90);
    expect(result.dimensions.skill.score).toBe(100);
    expect(result.dimensions.industry.score).toBe(100);
    expect(result.strengths).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ item: 'React', matched: true }),
      ])
    );
    expect(result.gaps).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ item: 'React' }),
      ])
    );
  });
});
