/**
 * JD 分析服务
 * 使用 AI 解析岗位描述，提取关键信息
 */

import type { JDAnalysis, SkillRequirement, HiddenRequirement } from '../types/jd';
import { createConfiguredAIClient } from '../utils/ai-client';
import { autoQueryCompanyInfo } from './company-info-service';

/**
 * 分析岗位描述
 * @param jobTitle - 岗位名称
 * @param company - 公司名称
 * @param jdText - 岗位描述文本
 */
export async function analyzeJD(
  jobTitle: string,
  company: string,
  jdText: string
): Promise<JDAnalysis> {
  // 自动查询公司信息
  let companyInfo = null;
  if (company) {
    companyInfo = await autoQueryCompanyInfo(company);
  } else {
    companyInfo = await autoQueryCompanyInfo(jdText);
  }

  // 调用 AI 进行分析
  const analysis = await analyzeWithAI(jobTitle, company, jdText, companyInfo);

  // 添加公司信息到分析结果
  analysis.companyInfo = companyInfo || undefined;

  return analysis;
}

/**
 * 使用 AI 分析 JD
 */
async function analyzeWithAI(
  jobTitle: string,
  company: string,
  jdText: string,
  companyInfo: any
): Promise<JDAnalysis> {
  // 构建 Prompt
  const prompt = buildJDPrompt(jobTitle, company, jdText, companyInfo);

  const client = createConfiguredAIClient();
  if (!client) {
    console.warn('未配置 AI API Key，使用降级方案');
    return createBasicAnalysis(jobTitle, company, jdText, companyInfo);
  }

  try {
    const aiResponse = await client.generateWithRetry(prompt);
    // 解析 AI 响应
    return parseAIResponse(aiResponse.text, jdText, companyInfo, jobTitle, company);
  } catch (error) {
    console.error('AI 调用失败:', error);
    // 降级方案
    return createBasicAnalysis(jobTitle, company, jdText, companyInfo);
  }
}

/**
 * 构建 JD 分析 Prompt
 */
function buildJDPrompt(jobTitle: string, company: string, jdText: string, companyInfo: any): string {
  let companyInfoText = '';
  if (companyInfo) {
    companyInfoText = `\n公司信息：
- 行业：${companyInfo.industry || '未知'}
- 规模：${companyInfo.size || '未知'}
- 地点：${companyInfo.location || '未知'}
- 官网：${companyInfo.website || '未知'}
- 技术栈：${companyInfo.techStack?.join(', ') || '未知'}
`;
  }

  return `你是一位专业的招聘专家，请分析以下岗位描述：

岗位名称：${jobTitle}
公司名称：${company}${companyInfoText}

岗位描述：
${jdText}

请输出以下结构化分析结果（JSON 格式）：
{
  "job_title": "岗位名称",
  "company": "公司名",
  "hard_skills": [
    {"name": "技能名", "isRequired": true, "importance": "high", "yearsRequired": 3}
  ],
  "soft_skills": ["沟通能力", "团队协作"],
  "experience": {
    "minYears": 3,
    "industryPreference": ["互联网", "电商"]
  },
  "education": {
    "minDegree": "bachelor",
    "majorPreference": ["计算机", "软件工程"]
  },
  "keywords": ["关键词 1", "关键词 2"],
  "hidden_requirements": [
    {"type": "work-pressure", "description": "暗示加班", "evidence": "能承受工作压力"}
  ]
}

请确保：
1. 硬技能按重要性排序
2. 区分必需技能和加分技能
3. 识别隐性需求（如加班、创业心态等）
4. 提取 HR 筛选简历时的关键词
5. 如果原文没有明确写出数字年限要求，experience.minYears 必须为 0，禁止根据“高级”“经验优先”等词推测年限`;
}

/**
 * 解析 AI 响应
 */
function parseAIResponse(
  aiResponse: string,
  rawText: string,
  companyInfo: any,
  fallbackJobTitle = '',
  fallbackCompany = ''
): JDAnalysis {
  try {
    let jsonStr = aiResponse.trim();
    jsonStr = jsonStr.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/g, '');
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }
    const parsed = JSON.parse(jsonStr);
    const basicAnalysis = createBasicAnalysis(fallbackJobTitle, fallbackCompany, rawText, companyInfo);

    return {
      jobTitle: parsed.job_title || parsed.jobTitle || fallbackJobTitle || basicAnalysis.jobTitle,
      company: parsed.company || fallbackCompany || basicAnalysis.company,
      companyInfo,
      hardSkills: (parsed.hard_skills || parsed.hardSkills)?.map((s: any) => ({
        name: s.name,
        isRequired: s.isRequired ?? true,
        importance: s.importance || 'medium',
        yearsRequired: s.yearsRequired,
        context: s.context,
      })) || basicAnalysis.hardSkills,
      softSkills: parsed.soft_skills || parsed.softSkills || basicAnalysis.softSkills,
      experience: {
        minYears: resolveExperienceYears(parsed.experience?.minYears, rawText, basicAnalysis.experience.minYears),
        maxYears: hasExplicitExperienceYears(rawText) ? parsed.experience?.maxYears : undefined,
        industryPreference: parsed.experience?.industryPreference || basicAnalysis.experience.industryPreference || [],
        companyTypePreference: parsed.experience?.companyTypePreference || [],
      },
      education: {
        minDegree: normalizeDegree(parsed.education?.minDegree) || basicAnalysis.education.minDegree,
        preferredDegree: parsed.education?.preferredDegree,
        majorPreference: parsed.education?.majorPreference || basicAnalysis.education.majorPreference || [],
        schoolPreference: parsed.education?.schoolPreference || [],
      },
      keywords: uniqueStrings([...(parsed.keywords || []), ...basicAnalysis.keywords]),
      hiddenRequirements: parsed.hidden_requirements?.map((r: any) => ({
        type: r.type,
        description: r.description,
        evidence: r.evidence,
      })) || basicAnalysis.hiddenRequirements,
      rawText,
    };
  } catch (error) {
    console.error('解析 AI 响应响应失败:', error);
    // 返回基础分析
    return createBasicAnalysis(fallbackJobTitle, fallbackCompany, rawText, companyInfo);
  }
}

/**
 * 创建基础分析（AI 解析失败时的降级方案）
 */
function createBasicAnalysis(
  jobTitle: string,
  company: string,
  rawText: string,
  companyInfo?: any
): JDAnalysis {
  const hardSkills = extractSkillsFromText(rawText);
  const softSkills = extractSoftSkillsFromText(rawText);
  const industryPreference = extractIndustryPreference(rawText, companyInfo);
  const education = extractEducationRequirement(rawText);
  const hiddenRequirements = extractHiddenRequirements(rawText);

  return {
    jobTitle: jobTitle || extractJobTitle(rawText),
    company: company || companyInfo?.name || '',
    companyInfo: companyInfo || undefined,
    hardSkills,
    softSkills,
    experience: {
      minYears: extractExperienceYears(rawText),
      industryPreference,
    },
    education,
    keywords: uniqueStrings([
      ...hardSkills.map(skill => skill.name),
      ...softSkills,
      ...(education.majorPreference || []),
      ...industryPreference,
    ]),
    hiddenRequirements,
    rawText,
  };
}

/**
 * 从文本中提取技能关键词（降级方案）
 */
function extractSkillsFromText(text: string): SkillRequirement[] {
  const skillCatalog: Array<{ name: string; aliases?: string[]; importance?: SkillRequirement['importance'] }> = [
    { name: 'JavaScript' },
    { name: 'TypeScript' },
    { name: 'Python', importance: 'high' },
    { name: 'Java' },
    { name: 'Go' },
    { name: 'React' },
    { name: 'Vue' },
    { name: 'Angular' },
    { name: 'Node.js' },
    { name: 'MySQL' },
    { name: 'PostgreSQL' },
    { name: 'MongoDB' },
    { name: 'Redis' },
    { name: 'Docker' },
    { name: 'Kubernetes' },
    { name: 'AWS' },
    { name: '阿里云' },
    { name: 'MATLAB' },
    { name: 'Excel' },
    { name: 'STM32', aliases: ['STM32', 'S TM32'] },
    { name: 'GD32' },
    { name: 'C/C++', aliases: ['C/C++', 'C++', 'C语言'] },
    { name: 'PCB设计', aliases: ['PCB', 'PCB设计'] },
    { name: '3D打印' },
    { name: '传感器' },
    { name: '医学信号处理' },
    { name: '医疗器械', importance: 'high' },
    { name: '医疗健康', importance: 'high' },
    { name: '智能硬件', importance: 'high' },
    { name: '可穿戴设备', aliases: ['可穿戴', '可穿戴设备'] },
    { name: 'AIoT', importance: 'high' },
    { name: '患者管理' },
    { name: '医疗器械数字化平台', aliases: ['数字化平台', '医疗器械数字化平台'] },
    { name: '用户调研', aliases: ['用户调研', '用戶调研'] },
    { name: '需求分析' },
    { name: '竞品分析' },
    { name: '原型设计' },
    { name: 'PRD撰写', aliases: ['PRD', 'PRD撰写', '产品需求文档'] },
    { name: '产品规划' },
    { name: '产品设计' },
    { name: '功能拆解' },
    { name: 'MVP定义', aliases: ['MVP', 'MVP定义'] },
    { name: '项目管理' },
    { name: '项目推进' },
    { name: '数据处理' },
    { name: '专利材料' },
    { name: '项目申报' },
    { name: '临床调研' },
  ];

  const skills: SkillRequirement[] = [];

  for (const skill of skillCatalog) {
    const context = findBestContext(text, [skill.name, ...(skill.aliases || [])]);
    if (context) {
      const isRequired = !isPreferredContext(context);
      skills.push({
        name: skill.name,
        isRequired,
        importance: skill.importance || inferImportance(context, isRequired),
        context,
      });
    }
  }

  return uniqueByName(skills);
}

function extractSoftSkillsFromText(text: string): string[] {
  const softSkillCatalog: Array<{ name: string; aliases: string[] }> = [
    { name: '沟通能力', aliases: ['沟通能力', '需求沟通', '候选人沟通', '对外沟通'] },
    { name: '团队协作', aliases: ['团队协作', '协作意识', '协同'] },
    { name: '跨团队协作', aliases: ['跨团队协作', '跨部门协作', '与研发、硬件、临床', '研发、硬件、临床'] },
    { name: '项目推进能力', aliases: ['项目推进', '推动项目', '按计划落地', '项目落地'] },
    { name: '学习能力', aliases: ['学习能力', '快速学习'] },
    { name: '责任心', aliases: ['责任心', '认真负责'] },
    { name: '抗压能力', aliases: ['抗压能力', '承压', '高压'] },
    { name: '创新能力', aliases: ['创新能力', '创新创业'] },
    { name: '组织协调能力', aliases: ['组织协调', '活动组织', '协调能力'] },
  ];

  return uniqueStrings(
    softSkillCatalog
      .filter(skill => findBestContext(text, skill.aliases))
      .map(skill => skill.name)
  );
}

function extractExperienceYears(text: string): number {
  const explicitMatch = text.match(/(\d+)\s*(?:年|年以上|年及以上|\+)\s*(?:相关)?(?:工作|项目|产品|研发|实习)?经验/);
  if (explicitMatch) {
    return Number(explicitMatch[1]);
  }

  const genericMatch = text.match(/(?:经验|工作年限|年限)[^\d]{0,8}(\d+)\s*年/);
  if (genericMatch) {
    return Number(genericMatch[1]);
  }

  if (/实习|应届|校园招聘|校招|可转正/.test(text)) {
    return 0;
  }

  return 0;
}

export function hasExplicitExperienceYears(text: string): boolean {
  return /(\d+)\s*(?:[-~至到]\s*\d+\s*)?(?:年|年以上|年及以上|\+)\s*(?:相关)?(?:工作|项目|产品|研发|实习)?经验/.test(text)
    || /(?:经验|工作年限|年限)[^\d]{0,8}(\d+)\s*年/.test(text);
}

export function resolveExperienceYears(
  parsedMinYears: unknown,
  rawText: string,
  fallbackMinYears: number
): number {
  if (!hasExplicitExperienceYears(rawText)) {
    return fallbackMinYears;
  }

  if (fallbackMinYears > 0) {
    return fallbackMinYears;
  }

  const parsed = Number(parsedMinYears);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallbackMinYears;
}

function extractEducationRequirement(text: string): JDAnalysis['education'] {
  const degreeOrder: Array<{ degree: JDAnalysis['education']['minDegree']; aliases: string[] }> = [
    { degree: 'phd', aliases: ['博士'] },
    { degree: 'master', aliases: ['硕士', '研究生'] },
    { degree: 'bachelor', aliases: ['本科', '学士'] },
    { degree: 'associate', aliases: ['大专', '专科'] },
    { degree: 'high-school', aliases: ['高中'] },
  ];

  const matchedDegree = degreeOrder.find(item => item.aliases.some(alias => text.includes(alias)))?.degree || 'bachelor';
  return {
    minDegree: matchedDegree,
    majorPreference: extractMajorPreference(text),
  };
}

function extractMajorPreference(text: string): string[] {
  const majors = [
    '生物医学工程',
    '医疗器械',
    '计算机',
    '软件工程',
    '电子信息',
    '电子工程',
    '自动化',
    '产品设计',
    '工业设计',
    '临床医学',
    '机械',
    '通信',
  ];

  return uniqueStrings(majors.filter(major => text.includes(major)));
}

function extractIndustryPreference(text: string, companyInfo?: any): string[] {
  const industries = [
    '医疗健康',
    '医疗器械',
    '智能硬件',
    'AIoT',
    '可穿戴设备',
    '康复设备',
    '互联网',
    'SaaS',
    '电商',
    '金融',
    '教育',
  ];

  return uniqueStrings([
    ...industries.filter(industry => text.includes(industry)),
    ...(companyInfo?.industry ? [companyInfo.industry] : []),
  ]);
}

function extractHiddenRequirements(text: string): HiddenRequirement[] {
  const hiddenRequirements: HiddenRequirement[] = [];
  const pushRequirement = (type: HiddenRequirement['type'], description: string, evidencePattern: RegExp) => {
    const evidence = text.match(evidencePattern)?.[0];
    if (evidence) {
      hiddenRequirements.push({ type, description, evidence });
    }
  };

  pushRequirement(
    'cross-functional',
    '需要在产品、研发、硬件、临床或运营之间做跨团队协作',
    /(?:跨团队协作|与研发、硬件、临床和运营团队协作|研发、硬件、临床和运营团队协作)/
  );
  pushRequirement(
    'independent',
    '需要较强的项目推进和独立跟进能力',
    /(?:推动项目按计划落地|项目推进|跟进研发|独立完成)/
  );
  pushRequirement(
    'customer-facing',
    '需要面向用户或临床场景进行调研和反馈整理',
    /(?:用户调研|收集用户反馈|临床场景|临床科室|需求沟通)/
  );
  pushRequirement(
    'innovation',
    '偏好有创新创业、竞赛或成果转化经历的候选人',
    /(?:创新创业|挑战杯|大创项目|成果转化|专利|软著)/
  );
  pushRequirement(
    'fast-paced',
    '岗位需要同时推进多方事项，节奏较快',
    /(?:按计划落地|项目推进|跟进研发|协助处理.*项目申报)/
  );

  return uniqueHiddenRequirements(hiddenRequirements);
}

function extractJobTitle(text: string): string {
  const titleMatch = text.match(/(?:职位名称|岗位名称|招聘岗位)[:：]\s*([^\n]+)/);
  return titleMatch?.[1]?.trim() || '';
}

function normalizeDegree(degree?: string): JDAnalysis['education']['minDegree'] | undefined {
  if (!degree) return undefined;
  const degreeMap: Record<string, JDAnalysis['education']['minDegree']> = {
    '博士': 'phd',
    phd: 'phd',
    PhD: 'phd',
    '硕士': 'master',
    '研究生': 'master',
    master: 'master',
    Master: 'master',
    '本科': 'bachelor',
    '学士': 'bachelor',
    bachelor: 'bachelor',
    Bachelor: 'bachelor',
    '大专': 'associate',
    '专科': 'associate',
    associate: 'associate',
    Associate: 'associate',
    '高中': 'high-school',
    'high-school': 'high-school',
  };
  return degreeMap[degree] || undefined;
}

function splitSentences(text: string): string[] {
  const lines = text
    .replace(/\r\n?/g, '\n')
    .split(/\n|。|；|;|！|!|？|\?/)
    .map(line => line.trim())
    .filter(Boolean);

  const result: string[] = [];
  let inPreferredSection = false;

  for (const line of lines) {
    if (/^(?:加分项|优先条件|Nice to have|Bonus)/i.test(line)) {
      inPreferredSection = true;
      result.push(line);
      continue;
    }
    if (/^(?:岗位职责|任职要求|职位要求|岗位要求|工作职责|岗位描述)/.test(line)) {
      inPreferredSection = false;
    }
    result.push(inPreferredSection ? `加分项：${line}` : line);
  }

  return result;
}

function findBestContext(text: string, terms: string[]): string | undefined {
  const normalizedTerms = terms.filter(Boolean);
  return splitSentences(text).find(sentence =>
    normalizedTerms.some(term => sentence.toLowerCase().includes(term.toLowerCase()))
  );
}

function isPreferredContext(context: string): boolean {
  return /(?:加分项|优先|者优先|优先考虑|nice to have|bonus|plus)/i.test(context);
}

function inferImportance(context: string, isRequired: boolean): SkillRequirement['importance'] {
  if (/必须|精通|核心|强制|必备|关键/.test(context)) {
    return 'critical';
  }
  if (/熟悉|掌握|具备|负责|完成|撰写|设计|推动/.test(context)) {
    return isRequired ? 'high' : 'medium';
  }
  return isRequired ? 'medium' : 'low';
}

function uniqueByName(skills: SkillRequirement[]): SkillRequirement[] {
  const seen = new Set<string>();
  const result: SkillRequirement[] = [];

  for (const skill of skills) {
    const key = skill.name.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(skill);
  }

  return result;
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = value.trim();
    const key = normalized.toLowerCase();
    if (!normalized || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(normalized);
  }

  return result;
}

function uniqueHiddenRequirements(values: HiddenRequirement[]): HiddenRequirement[] {
  const seen = new Set<string>();
  return values.filter(value => {
    const key = `${value.type}:${value.evidence}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/**
 * 提取关键词（用于简历筛选）
 */
export function extractKeywords(analysis: JDAnalysis): string[] {
  const keywords: string[] = [];

  // 添加硬技能关键词
  for (const skill of analysis.hardSkills) {
    if (skill.isRequired) {
      keywords.push(skill.name);
    }
  }

  // 添加软技能关键词
  keywords.push(...analysis.softSkills);

  // 添加行业关键词
  keywords.push(...analysis.experience.industryPreference || []);

  return keywords;
}

/**
 * 计算技能权重
 */
export function calculateSkillWeights(analysis: JDAnalysis): Map<string, number> {
  const weights = new Map<string, number>();

  const importanceWeight: Record<string, number> = {
    critical: 1.0,
    high: 0.8,
    medium: 0.5,
    low: 0.3,
  };

  for (const skill of analysis.hardSkills) {
    const baseWeight = skill.isRequired ? 1.5 : 1.0;
    const importanceMultiplier = importanceWeight[skill.importance] || 0.5;
    weights.set(skill.name, baseWeight * importanceMultiplier);
  }

  return weights;
}
