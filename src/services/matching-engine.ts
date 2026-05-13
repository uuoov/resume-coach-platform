/**
 * 匹配度计算引擎
 * 计算简历与 JD 的匹配度
 */

import type { Resume } from '../types/resume';
import type { JDAnalysis } from '../types/jd';
import type { DimensionScores, MatchItem, RiskItem } from '../types/match';
import { createConfiguredAIClient, hasConfiguredAIClient } from '../utils/ai-client';

/**
 * 匹配度权重配置
 */
const MATCH_WEIGHTS = {
  hardSkills: 0.35,
  experience: 0.25,
  education: 0.15,
  softSkills: 0.15,
  industry: 0.10,
};

/**
 * 计算简历与 JD 的匹配度
 */
export async function calculateMatch(resume: Resume, jdAnalysis: JDAnalysis): Promise<any> {
  // 检查是否配置了 AI API Key，优先使用 AI 匹配
  if (hasConfiguredAIClient()) {
    try {
      const aiResult = await calculateMatchWithAI(resume, jdAnalysis);
      if (aiResult) {
        return aiResult;
      }
    } catch (error) {
      console.warn('AI 匹配失败，降级到规则引擎:', error);
    }
  }

  // 降级使用规则引擎
  const dimensions: DimensionScores = {
    hardSkills: calculateHardSkillMatch(resume, jdAnalysis),
    experience: calculateExperienceMatch(resume, jdAnalysis),
    education: calculateEducationMatch(resume, jdAnalysis),
    softSkills: calculateSoftSkillMatch(resume, jdAnalysis),
    industry: calculateIndustryMatch(resume, jdAnalysis),
  };

  // 计算整体匹配分
  const overallScore = calculateOverallScore(dimensions);

  // 识别优势项和差距项
  const strengths = identifyStrengths(resume, jdAnalysis, dimensions);
  const gaps = identifyGaps(resume, jdAnalysis, dimensions);
  const risks = identifyRisks(resume, jdAnalysis);

  // 转换维度 key 以匹配前端期望的格式
  const frontendDimensions = {
    skill: dimensions.hardSkills,
    experience: dimensions.experience,
    education: dimensions.education,
    softSkill: dimensions.softSkills,
    industry: dimensions.industry,
  };

  const frontendStrengths = strengths.map(s => ({
    ...s,
    description: s.matched ? `${s.item} - 已具备` : `${s.item} - 待提升`,
  }));

  const frontendGaps = gaps.map(g => ({
    ...g,
    description: g.matched ? `${g.item} - 部分匹配` : `${g.item} - 缺失`,
  }));

  return {
    overallScore: Math.round(overallScore),
    dimensions: frontendDimensions,
    strengths: frontendStrengths,
    gaps: frontendGaps,
    risks,
    aiPowered: false,
  };
}

/**
 * AI 驱动的匹配计算
 */
async function calculateMatchWithAI(resume: Resume, jdAnalysis: JDAnalysis): Promise<any> {
  const client = createConfiguredAIClient();
  if (!client) return null;

  const prompt = `你是一位拥有10年经验的资深招聘总监（精通互联网、金融、制造业等各大行业的选人考察标准）。请你综合行业内顶级HR的通用筛选视角（例如：互联网行业极度注重技术栈深度、底层原理与高并发/大流量项目实战；金融行业严格看重合规、数据敏感度与业务稳定性；传统行业重视全生命周期管理与落地效益等），深度剖析以下候选人简历与职位描述（JD）的契合度。

不要仅停留在表面关键词的比对！请深入挖掘候选人经历中的业务价值、技术难点解决能力以及转移能力（Transferable Skills），对匹配度进行客观、犀利、极具建设性的专业解析。

简历内容：岗位要求(JD分析结果):
${JSON.stringify(jdAnalysis, null, 2)}

候选人简历:
${JSON.stringify(resume, null, 2)}

请从 5 个维度 (skill, experience, education, softSkill, industry) 给候选人打分(0-【重要指标解析要求】：
请按照总分100分的标准，在五个核心维度上进行严格打分，并为每个维度提供具体的得分理由（details）：
1. 技能匹配度 (skill)：核心技术栈是否对齐，是否具备所需的深度和广度。
2. 经验匹配度 (experience)：工作年限、所在行业背景是否符合，是否有类似规模的项目经验。
3. 学历匹配度 (education)：学历背景与专业要求。
4. 软技能匹配度 (softSkill)：沟通力、领导力、抗压能力等（从自我评价和项目角色中提取）。
5. 行业/业务匹配度 (industry)：对特定业务场景（如电商、SaaS、金融等）的理解和经验。

请严格按照以下 JSON Schema 输出解析结果（不要带有任何 Markdown \`\`\`json\`\`\` 代码块包装，只输出 JSON 本身）：
{
  "overallScore": 85,
  "overallAnalysis": "候选人整体非常匹配该岗位，技术栈高度契合...",
  "dimensions": {
    "skill": { "score": 90, "weight": 0.35, "details": ["熟练 React", "缺 Node.js"] },
    "experience": { "score": 80, "weight": 0.25, "details": ["3年经验"] },
    "education": { "score": 100, "weight": 0.15, "details": ["本科计算机专业"] },
    "softSkill": { "score": 85, "weight": 0.15, "details": ["沟通良好"] },
    "industry": { "score": 90, "weight": 0.10, "details": ["有互联网行业经验"] }
  },
  "strengths": [
    { "category": "skill", "item": "React", "matched": true, "confidence": 0.9, "description": "熟练掌握 React 框架及生态" }
  ],
  "gaps": [
    { "category": "skill", "item": "Node.js", "matched": false, "confidence": 0.9, "description": "缺乏后端开发经验" }
  ],
    "risks": [
      {
        "type": "风险类型（如：技术栈缺失 / 经验不足 / 频繁跳槽 / 业务不匹配等）",
        "description": "详细风险说明",
        "severity": "high / medium / low",
        "suggestion": "为了通过筛选，针对此风险的具体缓解建议"
      }
    ],
    "overallAnalysis": "作为资深 HR 总监，给出一段不超过 300 字的犀利、专业的整体评价，说明此人是否值得面试以及核心考量因素。"
}

注意：只返回合并的 JSON 对象，不带有任何 markdown(\`\`\`json 等)包装。`;

  try {
    const response = await client.generateWithRetry(prompt);
    const jsonStr = extractJsonObject(response.text);
    const result = JSON.parse(jsonStr);
    
    return {
      ...result,
      aiPowered: true
    };
  } catch (error) {
    console.error('AI 匹配解析失败:', error);
    return null;
  }
}

/**
 * 硬技能匹配度计算
 */
function calculateHardSkillMatch(resume: Resume, jd: JDAnalysis): DimensionScores['hardSkills'] {
  const requiredSkills = jd.hardSkills.filter(s => s.isRequired);
  const preferredSkills = jd.hardSkills.filter(s => !s.isRequired);

  if (requiredSkills.length === 0 && preferredSkills.length === 0) {
    return {
      score: 100,
      weight: MATCH_WEIGHTS.hardSkills,
      details: ['✓ JD 未提出明确硬技能要求'],
    };
  }

  // 计算必需技能匹配
  let requiredMatchCount = 0;
  const details: string[] = [];

  for (const skill of requiredSkills) {
    if (resumeHasTerm(resume, skill.name)) {
      requiredMatchCount++;
      details.push(`✓ ${skill.name} - 已具备`);
    } else {
      details.push(`✗ ${skill.name} - 缺失`);
    }
  }

  // 计算加分技能匹配
  let preferredMatchCount = 0;
  for (const skill of preferredSkills) {
    if (resumeHasTerm(resume, skill.name)) {
      preferredMatchCount++;
      details.push(`✓ 加分项 ${skill.name} - 已体现`);
    }
  }

  // 计算分数
  const requiredScore = requiredSkills.length > 0
    ? (requiredMatchCount / requiredSkills.length) * 100
    : 100;

  const preferredScore = preferredSkills.length > 0
    ? (preferredMatchCount / preferredSkills.length) * 100
    : 100;

  // 必需技能权重 70%，加分技能 30%
  const score = requiredScore * 0.7 + preferredScore * 0.3;

  return {
    score: Math.round(score),
    weight: MATCH_WEIGHTS.hardSkills,
    details,
  };
}

/**
 * 经验匹配度计算
 */
function calculateExperienceMatch(resume: Resume, jd: JDAnalysis): DimensionScores['experience'] {
  const minYears = jd.experience.minYears;
  const maxYears = jd.experience.maxYears;

  // 计算候选人的总工作年限
  const totalYears = calculateTotalYears(resume);

  let score = 100;
  const details: string[] = [];

  if (minYears === 0 && !maxYears) {
    return {
      score,
      weight: MATCH_WEIGHTS.experience,
      details: ['✓ JD 未设置明确年限要求'],
    };
  }

  if (totalYears < minYears) {
    const gap = minYears - totalYears;
    score = Math.max(0, 100 - (gap / minYears) * 50);
    details.push(`✗ 工作年限不足：要求${minYears}年，实际${totalYears}年`);
  } else if (maxYears && totalYears > maxYears) {
    // 超过最大年限可能被认为是 overqualified
    score = 80;
    details.push(`⚠ 工作年限超出：要求${maxYears}年以下，实际${totalYears}年`);
  } else {
    details.push(`✓ 工作年限符合：${totalYears}年`);
  }

  return {
    score: Math.round(score),
    weight: MATCH_WEIGHTS.experience,
    details,
  };
}

/**
 * 教育匹配度计算
 */
function calculateEducationMatch(resume: Resume, jd: JDAnalysis): DimensionScores['education'] {
  if (resume.education.length === 0) {
    return {
      score: 0,
      weight: MATCH_WEIGHTS.education,
      details: ['✗ 未提供教育背景'],
    };
  }

  const highestDegree = getHighestDegree(resume);
  const requiredDegree = normalizeDegree(jd.education.minDegree);

  const degreeRank: Record<string, number> = {
    'high-school': 1,
    'associate': 2,
    'bachelor': 3,
    'master': 4,
    'phd': 5,
  };

  let score = 100;
  const details: string[] = [];

  if (degreeRank[highestDegree] < degreeRank[requiredDegree]) {
    score = 50;
    details.push(`✗ 学历不足：要求${formatDegree(requiredDegree)}，实际${formatDegree(highestDegree)}`);
  } else {
    details.push(`✓ 学历符合：${formatDegree(highestDegree)}`);
  }

  // 检查专业匹配
  if (jd.education.majorPreference && jd.education.majorPreference.length > 0) {
    const majorMatch = resume.education.some(edu =>
      jd.education.majorPreference!.some(pref => normalizedContains(edu.major, pref))
    );
    if (majorMatch) {
      details.push('✓ 专业符合偏好');
      score = Math.min(100, score + 10);
    } else {
      details.push('⚠ 专业不完全匹配');
      score = Math.max(0, score - 10);
    }
  }

  return {
    score: Math.round(score),
    weight: MATCH_WEIGHTS.education,
    details,
  };
}

/**
 * 软技能匹配度计算
 */
function calculateSoftSkillMatch(resume: Resume, jd: JDAnalysis): DimensionScores['softSkills'] {
  const requiredSoftSkills = jd.softSkills;

  if (requiredSoftSkills.length === 0) {
    return {
      score: 100,
      weight: MATCH_WEIGHTS.softSkills,
      details: ['✓ 无特定软技能要求'],
    };
  }

  // 从简历中提取软技能（简化实现）
  const resumeText = collectResumeText(resume);

  let matchCount = 0;
  const details: string[] = [];

  for (const skill of requiredSoftSkills) {
    if (textHasTerm(resumeText, skill)) {
      matchCount++;
      details.push(`✓ ${skill} - 已体现`);
    } else {
      details.push(`⚠ ${skill} - 未明确体现`);
    }
  }

  const score = (matchCount / requiredSoftSkills.length) * 100;

  return {
    score: Math.round(score),
    weight: MATCH_WEIGHTS.softSkills,
    details,
  };
}

/**
 * 行业匹配度计算
 */
function calculateIndustryMatch(resume: Resume, jd: JDAnalysis): DimensionScores['industry'] {
  const preferredIndustries = jd.experience.industryPreference;

  if (!preferredIndustries || preferredIndustries.length === 0) {
    return {
      score: 100,
      weight: MATCH_WEIGHTS.industry,
      details: ['✓ 无特定行业要求'],
    };
  }

  // 检查候选人是否有相关行业经验
  const resumeText = collectResumeText(resume);
  const hasIndustryExperience = preferredIndustries.some(industry => textHasTerm(resumeText, industry));

  if (hasIndustryExperience) {
    return {
      score: 100,
      weight: MATCH_WEIGHTS.industry,
      details: ['✓ 具备相关行业经验'],
    };
  }

  return {
    score: 60,
    weight: MATCH_WEIGHTS.industry,
    details: ['⚠ 无直接相关行业经验'],
  };
}

/**
 * 计算整体分数
 */
function calculateOverallScore(dimensions: DimensionScores): number {
  let totalScore = 0;

  totalScore += dimensions.hardSkills.score * dimensions.hardSkills.weight;
  totalScore += dimensions.experience.score * dimensions.experience.weight;
  totalScore += dimensions.education.score * dimensions.education.weight;
  totalScore += dimensions.softSkills.score * dimensions.softSkills.weight;
  totalScore += dimensions.industry.score * dimensions.industry.weight;

  return totalScore;
}

/**
 * 识别优势项
 */
function identifyStrengths(
  resume: Resume,
  jd: JDAnalysis,
  dimensions: DimensionScores
): MatchItem[] {
  const strengths: MatchItem[] = [];

  // 硬技能优势
  for (const skill of jd.hardSkills) {
    if (skill.isRequired && resumeHasTerm(resume, skill.name)) {
      strengths.push({
        category: 'skill',
        item: skill.name,
        matched: true,
        confidence: 0.9,
      });
    }
  }

  // 经验优势
  if (dimensions.experience.score >= 80 && jd.experience.minYears > 0) {
    strengths.push({
      category: 'experience',
      item: '工作年限',
      matched: true,
      confidence: 0.85,
    });
  }

  // 教育优势
  if (dimensions.education.score >= 90) {
    strengths.push({
      category: 'education',
      item: '学历背景',
      matched: true,
      confidence: 0.9,
    });
  }

  if (dimensions.softSkills.score >= 80 && jd.softSkills.length > 0) {
    strengths.push({
      category: 'soft-skill',
      item: '软技能',
      matched: true,
      confidence: 0.8,
    });
  }

  return strengths;
}

/**
 * 识别差距项
 */
function identifyGaps(
  resume: Resume,
  jd: JDAnalysis,
  dimensions: DimensionScores
): MatchItem[] {
  const gaps: MatchItem[] = [];

  // 硬技能差距
  for (const skill of jd.hardSkills) {
    if (skill.isRequired && !resumeHasTerm(resume, skill.name)) {
      gaps.push({
        category: 'skill',
        item: skill.name,
        matched: false,
        confidence: 0.95,
      });
    }
  }

  // 经验差距
  if (dimensions.experience.score < 60) {
    gaps.push({
      category: 'experience',
      item: '工作年限不足',
      matched: false,
      confidence: 0.8,
    });
  }

  if (dimensions.softSkills.score < 60 && jd.softSkills.length > 0) {
    gaps.push({
      category: 'soft-skill',
      item: '软技能表达不足',
      matched: false,
      confidence: 0.75,
    });
  }

  return gaps;
}

/**
 * 识别风险点
 */
function identifyRisks(resume: Resume, jd: JDAnalysis): RiskItem[] {
  const risks: RiskItem[] = [];

  // 检查频繁跳槽
  const jobChanges = resume.workExperience.length;
  const totalYears = calculateTotalYears(resume);
  if (jobChanges > 3 && totalYears < 5) {
    risks.push({
      type: 'job-hopping',
      description: `${totalYears}年内跳槽${jobChanges}次，可能存在频繁跳槽风险`,
      severity: 'medium',
      suggestion: '在简历中说明跳槽原因，强调每次跳槽的成长',
    });
  }

  // 检查技能差距风险
  const missingCriticalSkills = jd.hardSkills.filter(
    s => s.importance === 'critical' && s.isRequired
  ).filter(s => !resumeHasTerm(resume, s.name));

  if (missingCriticalSkills.length > 0) {
    risks.push({
      type: 'skill-gap',
      description: `缺少关键技能：${missingCriticalSkills.map(s => s.name).join(', ')}`,
      severity: 'high',
      suggestion: '在简历中突出相关学习经历或项目经验',
    });
  }

  return risks;
}

// ==================== 辅助函数 ====================

function normalizeDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  // Handle formats: 2020.06, 2020/06, 2020-06, 2020
  const normalized = dateStr.trim().replace(/[.\/]/g, '-');
  const d = new Date(normalized);
  if (!isNaN(d.getTime())) return d;
  // Try year-only: "2020" -> "2020-01-01"
  const yearMatch = normalized.match(/^(\d{4})$/);
  if (yearMatch) return new Date(`${yearMatch[1]}-01-01`);
  return new Date();
}

function calculateTotalYears(resume: Resume): number {
  if (resume.workExperience.length === 0) {
    return 0;
  }

  let totalMonths = 0;
  for (const exp of resume.workExperience) {
    const start = normalizeDate(exp.startDate);
    const end = exp.isCurrent ? new Date() : normalizeDate(exp.endDate || '');
    const months = (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth());
    totalMonths += Math.max(0, months);
  }

  return Math.round(totalMonths / 12);
}

function normalizeDegree(degree: string): string {
  const degreeMap: Record<string, string> = {
    '博士': 'phd', 'PhD': 'phd', 'phd': 'phd',
    '硕士': 'master', '研究生': 'master', 'MBA': 'master', 'master': 'master',
    '本科': 'bachelor', '学士': 'bachelor', 'bachelor': 'bachelor',
    '大专': 'associate', '专科': 'associate', 'associate': 'associate',
    '高中': 'high-school', 'high-school': 'high-school',
  };
  return degreeMap[degree] || degree;
}

function extractJsonObject(text: string): string {
  let jsonStr = text.trim();
  jsonStr = jsonStr.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/g, '').trim();
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  return jsonMatch ? jsonMatch[0] : jsonStr;
}

function formatDegree(degree: string): string {
  const labels: Record<string, string> = {
    'high-school': '高中',
    associate: '大专',
    bachelor: '本科',
    master: '硕士',
    phd: '博士',
  };
  return labels[degree] || degree;
}

function getHighestDegree(resume: Resume): string {
  const degreeRank: Record<string, number> = {
    'high-school': 1,
    'associate': 2,
    'bachelor': 3,
    'master': 4,
    'phd': 5,
  };

  let highestDegree = 'high-school';
  let highestRank = 0;

  for (const edu of resume.education) {
    const normalized = normalizeDegree(edu.degree);
    const rank = degreeRank[normalized] || 0;
    if (rank > highestRank) {
      highestRank = rank;
      highestDegree = normalized;
    }
  }

  return highestDegree;
}

function collectResumeText(resume: Resume): string {
  const parts: string[] = [
    resume.basicInfo.name,
    resume.basicInfo.location || '',
    resume.summary || '',
    ...(resume.certifications || []),
    ...(resume.languages || []),
    ...resume.skills.map(skill => skill.name),
  ];

  for (const edu of resume.education) {
    parts.push(edu.school, edu.degree, edu.major, edu.gpa || '');
  }
  for (const exp of resume.workExperience) {
    parts.push(exp.company, exp.position, ...(exp.description || []));
  }
  for (const project of resume.projects || []) {
    parts.push(project.name, project.role, project.description, ...(project.technologies || []));
  }

  return parts.filter(Boolean).join(' ');
}

function normalizeSearchText(text: string): string {
  return text
    .toLowerCase()
    .replace(/用戶/g, '用户')
    .replace(/⻓/g, '长')
    .replace(/麥/g, '麦')
    .replace(/\s+/g, '')
    .replace(/[，,。；;：:、|｜/()（）【】\[\]{}+\-.]/g, '');
}

function normalizedContains(source: string, term: string): boolean {
  return normalizeSearchText(source).includes(normalizeSearchText(term));
}

function getTermAliases(term: string): string[] {
  const aliasMap: Record<string, string[]> = {
    'PRD撰写': ['PRD', '产品需求文档', 'PRD撰写'],
    'MVP定义': ['MVP', 'MVP定义'],
    '用户调研': ['用户调研', '用戶调研', '临床调研', '需求调研'],
    '需求分析': ['需求分析', '需求挖掘'],
    '竞品分析': ['竞品分析'],
    '原型设计': ['原型设计', '原型样机', '硬件原型'],
    '项目推进': ['项目推进', '推动', '落地', '项目节奏管理'],
    '项目管理': ['项目管理', '项目节奏管理', '统筹协调'],
    '跨团队协作': ['跨团队协作', '跨部门协作', '跨模块协同', '产学研对接'],
    '团队协作': ['团队协作', '协作', '跨团队协作', '跨模块协同'],
    '沟通能力': ['沟通', '需求沟通', '洽谈', '对接'],
    '医疗健康': ['医疗健康', '医疗', '临床', '医院'],
    '医疗器械': ['医疗器械', '医疗设备', '器械'],
    '智能硬件': ['智能硬件', '硬件', '可穿戴'],
    '可穿戴设备': ['可穿戴', '手环', '手套'],
    'AIoT': ['AIoT', '智能硬件'],
    'PCB设计': ['PCB', 'PCB设计'],
    '3D打印': ['3D打印', '3D 打印'],
    'C/C++': ['C/C++', 'C++', 'C语言'],
    'STM32': ['STM32', 'S TM32'],
    '医学信号处理': ['医学信号处理', '声纹信号', '信号处理'],
    '数据处理': ['数据处理', '数据整理', '数据分析'],
    '专利材料': ['专利材料', '专利'],
    '项目申报': ['项目申报', '申报'],
  };

  return [term, ...(aliasMap[term] || [])];
}

function textHasTerm(text: string, term: string): boolean {
  return getTermAliases(term).some(alias => normalizedContains(text, alias));
}

function resumeHasTerm(resume: Resume, term: string): boolean {
  return textHasTerm(collectResumeText(resume), term);
}

