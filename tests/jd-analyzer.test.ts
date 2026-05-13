import { analyzeJD, extractKeywords, calculateSkillWeights, resolveExperienceYears } from '../src/services/jd-analyzer';
import type { JDAnalysis } from '../src/types/jd';

describe('JD Analyzer Service', () => {
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

  describe('analyzeJD', () => {
    it('should return basic analysis without API key', async () => {
      const result = await analyzeJD(
        '前端开发工程师',
        '字节跳动',
        '要求熟练掌握 React、TypeScript、Node.js，有 3 年以上工作经验。'
      );

      expect(result).toEqual(
        expect.objectContaining({
          jobTitle: '前端开发工程师',
          company: '字节跳动',
          hardSkills: expect.arrayContaining([
            expect.objectContaining({ name: 'React' }),
            expect.objectContaining({ name: 'TypeScript' }),
            expect.objectContaining({ name: 'Node.js' }),
          ]),
          softSkills: expect.any(Array),
          experience: expect.objectContaining({ minYears: 3 }),
          education: expect.objectContaining({ minDegree: 'bachelor' }),
          keywords: expect.any(Array),
          hiddenRequirements: expect.any(Array),
          rawText: expect.any(String),
        })
      );
    });

    it('should extract product, medical and hardware requirements from Chinese JD fallback', async () => {
      const jdText = `职位名称：医疗健康 AIoT 产品实习生
岗位描述：参与智能硬件、医疗器械数字化平台及患者管理工具的产品规划与落地。你将与研发、硬件、临床和运营团队协作，完成需求调研、竞品分析、产品原型设计、PRD 撰写和项目推进工作。
岗位职责：
1. 参与医疗健康、智能硬件、AIoT 产品的用户调研和需求分析。
2. 协助完成产品功能拆解、流程设计、原型设计和 PRD 文档撰写。
3. 跟进研发、硬件、测试和临床试用进度，推动项目按计划落地。
任职要求：
1. 本科及以上学历，生物医学工程、医疗器械、计算机、电子信息、产品设计等相关专业优先。
2. 熟悉产品设计基本流程，具备用户调研、需求分析、竞品分析和 PRD 撰写能力。
3. 了解 Python、MATLAB、Excel 数据处理者优先。
4. 有 STM32、传感器、PCB、3D 打印或硬件原型制作经验者优先。
5. 具备良好的沟通能力、项目推进能力和跨团队协作意识。`;

      const result = await analyzeJD('医疗健康 AIoT 产品实习生', '某医疗科技公司', jdText);
      const hardSkillNames = result.hardSkills.map(skill => skill.name);

      expect(hardSkillNames).toEqual(expect.arrayContaining([
        '医疗健康',
        '智能硬件',
        'AIoT',
        '用户调研',
        '需求分析',
        '竞品分析',
        'PRD撰写',
        'Python',
        'MATLAB',
        'STM32',
        'PCB设计',
      ]));
      expect(result.softSkills).toEqual(expect.arrayContaining(['沟通能力', '跨团队协作', '项目推进能力']));
      expect(result.education).toMatchObject({
        minDegree: 'bachelor',
        majorPreference: expect.arrayContaining(['生物医学工程', '医疗器械', '计算机', '电子信息', '产品设计']),
      });
      expect(result.experience.industryPreference).toEqual(expect.arrayContaining(['医疗健康', '医疗器械', '智能硬件', 'AIoT']));
      expect(result.hiddenRequirements.some(req => req.type === 'cross-functional')).toBe(true);
    });
  });

  describe('extractKeywords', () => {
    it('should extract keywords from JD analysis', () => {
      const analysis: JDAnalysis = {
        jobTitle: '前端开发工程师',
        company: '字节跳动',
        hardSkills: [
          { name: 'React', isRequired: true, importance: 'high' },
          { name: 'TypeScript', isRequired: true, importance: 'high' },
          { name: 'Vue', isRequired: false, importance: 'medium' },
        ],
        softSkills: ['沟通能力', '团队协作'],
        experience: {
          minYears: 3,
          industryPreference: ['互联网', '电商'],
        },
        education: {
          minDegree: 'bachelor',
        },
        keywords: [],
        hiddenRequirements: [],
        rawText: '要求熟练掌握 React、TypeScript，有 3 年以上工作经验。',
      };

      const keywords = extractKeywords(analysis);

      expect(keywords).toEqual(
        expect.arrayContaining(['React', 'TypeScript', '沟通能力', '团队协作', '互联网', '电商'])
      );
      expect(keywords).not.toContain('Vue'); // 因为不是必需技能
    });
  });

  describe('calculateSkillWeights', () => {
    it('should calculate weights for skills based on importance and requirement', () => {
      const analysis: JDAnalysis = {
        jobTitle: '前端开发工程师',
        company: '字节跳动',
        hardSkills: [
          { name: 'React', isRequired: true, importance: 'high' },
          { name: 'TypeScript', isRequired: true, importance: 'high' },
          { name: 'Vue', isRequired: false, importance: 'medium' },
          { name: 'Angular', isRequired: false, importance: 'low' },
        ],
        softSkills: [],
        experience: { minYears: 0 },
        education: { minDegree: 'bachelor' },
        keywords: [],
        hiddenRequirements: [],
        rawText: '要求熟练掌握 React、TypeScript、Vue、Angular。',
      };

      const weights = calculateSkillWeights(analysis);

      expect(weights.get('React')).toBeCloseTo(1.5 * 0.8); // required * high importance
      expect(weights.get('TypeScript')).toBeCloseTo(1.5 * 0.8); // required * high importance
      expect(weights.get('Vue')).toBeCloseTo(1.0 * 0.5); // not required * medium importance
      expect(weights.get('Angular')).toBeCloseTo(1.0 * 0.3); // not required * low importance
    });
  });

  describe('resolveExperienceYears', () => {
    it('should ignore AI-inferred years when JD has no explicit numeric years requirement', () => {
      const jdText = '熟悉医疗健康和智能硬件领域，有医疗器械产品或项目经验优先。';

      expect(resolveExperienceYears(3, jdText, 0)).toBe(0);
    });

    it('should use explicit numeric years from JD text', () => {
      const jdText = '要求 3 年以上前端开发经验，熟悉 React 和 TypeScript。';

      expect(resolveExperienceYears(5, jdText, 3)).toBe(3);
    });
  });
});
