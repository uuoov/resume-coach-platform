/**
 * 优化建议生成服务
 * 基于匹配度分析结果生成具体的简历优化建议
 */

import type { Resume } from '../types/resume';
import type { JDAnalysis, CompanyInfo } from '../types/jd';
import type { MatchResult, MatchItem } from '../types/match';
import type { OptimizationSuggestion } from '../types/optimization';
import { createConfiguredAIClient, hasConfiguredAIClient } from '../utils/ai-client';
import { generateWithAudit } from './ai-audit';
import { logger } from '../utils/logger';
import { z } from 'zod';

/**
 * AI 返回的优化建议 Zod schema —— 用于校验 LLM 输出，拒绝畸形结构。
 * 校验失败时 generateSuggestionsWithAI 返回 null，外层降级到规则引擎。
 */
const aiSuggestionSchema = z.object({
  id: z.string().optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
  category: z.enum(['keyword-addition', 'content-rewrite', 'quantification', 'culture-fit', 'addition']),
  section: z.enum(['summary', 'work-experience', 'skills', 'project']),
  title: z.string(),
  description: z.string(),
  currentContent: z.string().nullable().optional(),
  suggestedContent: z.string().nullable().optional(),
  reason: z.string().optional(),
  assumptionsMade: z.array(z.string()).default([]),
});

const aiSuggestionsEnvelopeSchema = z.array(aiSuggestionSchema);

type AISuggestion = z.infer<typeof aiSuggestionSchema>;

function parseAISuggestionsWithZod(rawText: string): AISuggestion[] | null {
  const jsonStr = extractJsonArray(rawText);
  try {
    const parsed = JSON.parse(jsonStr);
    const result = aiSuggestionsEnvelopeSchema.parse(parsed);
    return result;
  } catch (err) {
    const detail = err instanceof z.ZodError
      ? err.errors.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`).join('; ')
      : (err as Error).message;
    logger.warn('AI 优化建议未通过 Zod 校验，降级到规则引擎', 'optimization-advisor', {
      detail,
    });
    return null;
  }
}

/**
 * 生成优化建议
 */
export async function generateSuggestions(
  resume: Resume,
  jdAnalysis: JDAnalysis,
  matchResult: MatchResult
): Promise<OptimizationSuggestion[]> {
  // 检查是否有 API Key，优先使用 AI
  if (hasConfiguredAIClient()) {
    try {
      const aiSuggestions = await generateSuggestionsWithAI(resume, jdAnalysis, matchResult);
      if (aiSuggestions && aiSuggestions.length > 0) {
        return aiSuggestions;
      }
    } catch (error) {
      logger.warn('AI 生成建议失败，降级到规则引擎', 'optimization-advisor', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const suggestions: OptimizationSuggestion[] = [];

  // 1. 基于差距项生成建议
  suggestions.push(...generateGapSuggestions(matchResult.gaps));

  // 2. 基于 JD 关键词和简历现有内容生成建议
  suggestions.push(...generateKeywordAlignmentSuggestions(resume, jdAnalysis));

  // 3. 基于技能缺失生成建议
  suggestions.push(...generateSkillSuggestions(resume, jdAnalysis));

  // 4. 基于隐性需求生成建议
  suggestions.push(...generateHiddenRequirementSuggestions(jdAnalysis));

  // 5. 基于量化补充生成建议
  suggestions.push(...generateQuantificationSuggestions(resume, jdAnalysis));

  // 6. 基于公司文化对齐生成建议
  suggestions.push(...generateCultureFitSuggestions(jdAnalysis.companyInfo, resume));

  // 按优先级排序
  return sortSuggestions(dedupeSuggestions(suggestions)).slice(0, 12);
}

/**
 * AI 驱动生成优化建议
 */
async function generateSuggestionsWithAI(
  resume: Resume,
  jdAnalysis: JDAnalysis,
  matchResult: MatchResult
): Promise<OptimizationSuggestion[] | null> {
  const client = createConfiguredAIClient();
  if (!client) return null;

  // 注入公司信息上下文，让 AI 给出 section-specific 的建议
  const companyInfo: CompanyInfo | undefined = (jdAnalysis as any).companyInfo;
  const companyContext = companyInfo
    ? `\n【公司信息】\n名称：${companyInfo.name}\n行业：${companyInfo.industry || '-'}\n` +
      `文化价值观：${companyInfo.culture?.values?.join('、') || '-'}\n` +
      `技术栈偏好：${companyInfo.techStack?.join('、') || '-'}\n`
    : '\n【公司信息】未提供，请基于 JD 通用视角给出建议。\n';

  const prompt = `你是一位具有极高职业操守的首席资深简历辅导专家。请仔细阅读以下 JD 分析结果和当前的匹配度报告，为候选人提供极度专业、一针见血的简历优化建议。

【绝对红线 / 核心原则】（如果违反将被视为严重失误！）：
1. 恪守真实：绝对不能无中生有！不能跨越事实边界替用户捏造从未做过的项目、工具、技术栈或虚假的数据指标！
2. 允许进阶润色与推测引导：为了提供体现高业务价值的优选文案，你可以基于 JD 推断并生成包含量化指标或进阶动作的极佳句式，**但你必须将所有此类超越了原简历的事实推断项，如实列入 'assumptionsMade' 数组中**，以警示用户核实修改，不可直接当作既定事实通过。如果不涉及推断，填空行。
3. 事实定界：建议中若包含编造的数据（如'性能提升50%'），请用挂号 (xx) 占位提醒用户。

${companyContext}

候选人简历:
${JSON.stringify(resume, null, 2)}

岗位要求:
${JSON.stringify(jdAnalysis, null, 2)}

匹配分析:
${JSON.stringify(matchResult, null, 2)}

你的建议需要非常具体，提供 "currentContent"(如果适用) 和 "suggestedContent" 来说明如何修改。
每个 section 的建议应与该 section 的内容形态对齐：
- summary：聚焦关键词前置与个人定位
- work-experience：聚焦 STAR 法则和量化成果
- skills：聚焦关键词补齐
- project：聚焦产品/技术闭环与业务价值

返回结果必须是一个合法的 JSON 数组，包含以下字段：
[
  {
    "id": "随机字符串",
    "priority": "critical" | "high" | "medium" | "low",
    "category": "keyword-addition" | "content-rewrite" | "quantification" | "culture-fit" | "addition",
    "section": "summary" | "work-experience" | "skills" | "project",
    "title": "简短的建议标题",
    "description": "详细说明为什么建议这么修改",
    "currentContent": "原简历中需要修改的具体原句内容（必须从原文中原样摘录，如果原文完全缺失则填 null）",
    "suggestedContent": "按照 STAR 法则润色后的高阶文案（可包含用于示范的推断指标）。",
    "reason": "修改原因，说明这样修改如何直接提升 HR 筛选通过率",
    "assumptionsMade": ["列出该建议中虚构的指标、技术、角色等需要用户真实核实的假设点。如果没有，则为空数组 []"]
  }
]

请确保结果是严格的 JSON 数组格式，不要包含任何多余文字或 \`\`\`json 标记。`;

  try {
    // temperature=0 保证 AI 建议的稳定性（同样的输入产生近似输出）
    const response = await generateWithAudit(
      client,
      { service: 'optimization-advisor' },
      prompt,
      3,
      { temperature: 0 }
    );
    const parsed = parseAISuggestionsWithZod(response.text);

    if (!parsed) {
      return null;
    }

    // Zod 校验通过，组装对外返回结构（reason 为 required，但 AI 可能省略，兜底为空串）
    return sortSuggestions(parsed.map(s => ({
      ...s,
      currentContent: s.currentContent ?? undefined,
      suggestedContent: s.suggestedContent ?? undefined,
      reason: s.reason ?? '',
      id: s.id || generateId(),
    })));
  } catch (error) {
    logger.error('AI 优化建议解析失败', error instanceof Error ? error : undefined, 'optimization-advisor');
    return null;
  }
}

/**
 * 基于差距项生成建议
 */
function generateGapSuggestions(
  gaps: MatchItem[]
): OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = [];

  for (const gap of gaps) {
    if (gap.category === 'skill') {
      suggestions.push({
        id: generateId(),
        priority: 'critical',
        category: 'keyword-addition',
        section: 'skills',
        title: `添加关键词：${gap.item}`,
        description: `JD 明确要求 ${gap.item} 技能，但简历中未体现`,
        reason: '这是 HR 筛选简历的关键词，缺失可能导致简历被过滤',
      });
    } else if (gap.category === 'experience') {
      suggestions.push({
        id: generateId(),
        priority: 'high',
        category: 'content-rewrite',
        section: 'work-experience',
        title: '突出相关工作经验',
        description: '工作年限与岗位要求有差距，建议在简历中强调相关项目经验',
        reason: '通过突出相关经验可以部分弥补年限不足',
      });
    }
  }

  return suggestions;
}

/**
 * 基于技能缺失生成建议
 */
function generateSkillSuggestions(
  resume: Resume,
  jdAnalysis: JDAnalysis
): OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = [];

  const resumeSkillNames = new Set(resume.skills.map(s => s.name.toLowerCase()));

  // 检查必需技能
  for (const skill of jdAnalysis.hardSkills) {
    if (skill.isRequired && !resumeSkillNames.has(skill.name.toLowerCase())) {
      // 检查是否有相关技能可以替代
      const relatedSkill = findRelatedSkill(resume.skills, skill.name);

      if (relatedSkill) {
        suggestions.push({
          id: generateId(),
          priority: 'high',
          category: 'keyword-addition',
          section: 'skills',
          title: `补充技能描述`,
          description: `虽然没有直接写${skill.name}，但有相关经验${relatedSkill.name}，建议明确说明`,
          reason: 'JD 中的关键词需要明确出现，即使你有相关经验',
        });
      } else {
        suggestions.push({
          id: generateId(),
          priority: 'medium',
          category: 'addition',
          section: 'skills',
          title: `考虑补充${skill.name}相关经验`,
          description: `如果有自学或项目中接触过${skill.name}，建议写入简历`,
          reason: '增加关键词匹配度',
        });
      }
    }
  }

  return suggestions;
}

/**
 * 基于 JD 关键词做简历前置和表达对齐
 */
function generateKeywordAlignmentSuggestions(
  resume: Resume,
  jdAnalysis: JDAnalysis
): OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = [];
  const resumeText = collectResumeText(resume);
  const summary = resume.summary || '';
  const requiredMatchedSkills = jdAnalysis.hardSkills
    .filter(skill => skill.isRequired && textHasTerm(resumeText, skill.name))
    .slice(0, 8);

  const missingFromSummary = requiredMatchedSkills
    .map(skill => skill.name)
    .filter(skill => !textHasTerm(summary, skill));

  if (missingFromSummary.length > 0) {
    const keywords = missingFromSummary.slice(0, 5);
    suggestions.push({
      id: generateId(),
      priority: 'high',
      category: 'keyword-addition',
      section: 'summary',
      title: '在个人优势中前置岗位关键词',
      description: `JD 重点关注 ${keywords.join('、')}，简历中已有相关经历，但个人优势没有集中呈现。`,
      currentContent: summary || undefined,
      suggestedContent: summary
        ? `${summary}\n建议补充：突出 ${keywords.join('、')} 等与岗位直接相关的能力，并关联医疗健康/智能硬件项目落地经验。`
        : `建议新增个人优势：具备 ${keywords.join('、')} 等能力，并有医疗健康/智能硬件项目从需求调研到落地验证的实践经验。`,
      reason: 'HR 首屏通常先看摘要，前置关键词可以提高岗位相关性和筛选命中率。',
    });
  }

  const productSkills = ['用户调研', '需求分析', '竞品分析', 'PRD撰写', '项目推进', '跨团队协作'];
  const matchedProductSkills = productSkills.filter(skill => textHasTerm(resumeText, skill) || textHasTerm(jdAnalysis.rawText, skill));
  if (matchedProductSkills.length >= 3) {
    suggestions.push({
      id: generateId(),
      priority: 'medium',
      category: 'content-rewrite',
      section: 'project',
      title: '突出产品角色和项目推进闭环',
      description: 'JD 是产品/医疗健康方向，建议把项目中的调研、需求、PRD、跨团队推进集中写在项目开头。',
      reason: '相比只写项目成果，产品岗位更关注你如何定义问题、协调资源并推动落地。',
    });
  }

  return suggestions;
}

/**
 * 基于隐性需求生成建议
 */
function generateHiddenRequirementSuggestions(
  jdAnalysis: JDAnalysis
): OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = [];

  for (const hidden of jdAnalysis.hiddenRequirements) {
    if (hidden.type === 'work-pressure') {
      suggestions.push({
        id: generateId(),
        priority: 'medium',
        category: 'culture-fit',
        section: 'summary',
        title: '体现抗压能力',
        description: 'JD 暗示工作压力较大，建议在自我评价或经历中体现抗压能力',
        suggestedContent: '能够在高压环境下保持高效工作，曾同时负责多个项目并按时交付',
        reason: '展示与公司文化的匹配度',
      });
    } else if (hidden.type === 'fast-paced') {
      suggestions.push({
        id: generateId(),
        priority: 'medium',
        category: 'culture-fit',
        section: 'work-experience',
        title: '体现快速学习能力',
        description: 'JD 暗示工作节奏快，建议突出快速学习和适应能力',
        suggestedContent: '在 X 周内快速掌握新技术并应用于项目',
        reason: '展示适应快节奏工作的能力',
      });
    } else if (hidden.type === 'leadership') {
      suggestions.push({
        id: generateId(),
        priority: 'high',
        category: 'content-rewrite',
        section: 'work-experience',
        title: '突出领导经验',
        description: 'JD 提到团队管理能力，建议突出带团队或指导新人的经验',
        reason: '这是岗位的核心要求之一',
      });
    }
  }

  return suggestions;
}

/**
 * 基于量化补充生成建议
 */
function generateQuantificationSuggestions(
  resume: Resume,
  jdAnalysis: JDAnalysis
): OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = [];
  const jdKeywords = [
    ...jdAnalysis.hardSkills.map(skill => skill.name),
    ...jdAnalysis.softSkills,
    ...(jdAnalysis.experience.industryPreference || []),
  ];

  for (const exp of resume.workExperience) {
    for (const desc of exp.description) {
      // 检查是否有可以量化的描述
      if (!hasNumbers(desc) && desc.length > 20 && isRelevantToJD(desc, jdKeywords)) {
        suggestions.push({
          id: generateId(),
          priority: 'low',
          category: 'quantification',
          section: 'work-experience',
          title: `量化${exp.position || exp.company}成果`,
          description: `这段经历与 JD 相关，但成果表达偏描述性，建议补充范围、数量、效率或结果指标。`,
          currentContent: desc,
          suggestedContent: `${desc}（建议补充真实指标，例如：覆盖 X 个用户/科室、输出 X 份材料、推动 X 个节点按期完成、效率提升 X%）`,
          reason: '量化数据能让产品推进、临床调研和协作成果更可信。',
        });
      }

      if (suggestions.length >= 3) {
        return suggestions;
      }
    }
  }

  return suggestions;
}

/**
 * 基于公司文化对齐生成建议
 *
 * 实现：
 * - 从 companyInfo.culture.values 中取前 3 个价值观
 * - 若简历全文未体现该价值观关键词，生成 medium 优先级建议
 * - 建议在个人优势 / 项目经历中补充对应该价值观的具体表述
 */
function generateCultureFitSuggestions(
  companyInfo: CompanyInfo | undefined | null,
  resume: Resume
): OptimizationSuggestion[] {
  if (!companyInfo?.culture?.values || companyInfo.culture.values.length === 0) {
    return [];
  }

  const suggestions: OptimizationSuggestion[] = [];
  const resumeText = collectResumeText(resume).toLowerCase();
  const summary = resume.summary || '';

  for (const value of companyInfo.culture.values.slice(0, 3)) {
    const valueLower = value.toLowerCase();
    if (resumeText.includes(valueLower)) {
      continue;
    }

    const title = `体现「${value}」的特质`;
    const description = `${companyInfo.name} 的核心价值观之一是「${value}」。` +
      `建议在个人优势或项目经历中加入能够体现该特质的具体案例或表述，提升 HR 的认同感。`;

    const suggestedContent = summary
      ? `${summary}\n\n建议补充：与「${value}」相关的经历或成果（如团队协作、客户案例、迭代改进等）。`
      : `建议在个人优势中新增一段：我是如何践行「${value}」的（1-2 句话 + 1 个具体案例）。`;

    suggestions.push({
      id: generateId(),
      priority: 'medium',
      category: 'culture-fit',
      section: 'summary',
      title,
      description,
      suggestedContent,
      reason: `匹配 ${companyInfo.name} 企业文化，提升 HR 好感度。`,
    });
  }

  return suggestions;
}

// ==================== 辅助函数 ====================

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function extractJsonArray(text: string): string {
  let jsonStr = text.trim();
  jsonStr = jsonStr.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/g, '').trim();
  const jsonMatch = jsonStr.match(/\[[\s\S]*\]/);
  return jsonMatch ? jsonMatch[0] : jsonStr;
}

function findRelatedSkill(
  skills: Resume['skills'],
  targetSkill: string
): Resume['skills'][0] | null {
  // 简化的相关技能匹配
  const relatedMap: Record<string, string[]> = {
    'Kubernetes': ['Docker', '容器化'],
    'React': ['Vue', 'Angular', '前端框架'],
    'Python': ['Java', 'Go', '编程语言'],
    'MySQL': ['PostgreSQL', 'MongoDB', '数据库'],
    'PRD撰写': ['PRD', '需求文档', '产品'],
    '用户调研': ['需求调研', '临床调研', '用户'],
    '需求分析': ['需求挖掘', '产品定义'],
    '项目推进': ['项目管理', '统筹协调'],
    'AIoT': ['智能硬件', '可穿戴'],
    '医疗器械': ['医疗设备', '医疗健康'],
  };

  const related = relatedMap[targetSkill] || [];
  return skills.find(s => related.some(r => s.name.toLowerCase().includes(r.toLowerCase()))) || null;
}

function hasNumbers(text: string): boolean {
  return /\d+%|\d+\s*万|\d+\s*亿|\d+\.\d+|\d+\s*个|\d+\s*人|\d+\s*台|\d+\s*次/.test(text);
}

function collectResumeText(resume: Resume): string {
  const parts: string[] = [
    resume.summary || '',
    ...(resume.certifications || []),
    ...resume.skills.map(skill => skill.name),
  ];

  for (const exp of resume.workExperience) {
    parts.push(exp.company, exp.position, ...(exp.description || []));
  }
  for (const project of resume.projects || []) {
    parts.push(project.name, project.role, project.description, ...(project.technologies || []));
  }
  for (const edu of resume.education || []) {
    parts.push(edu.school, edu.degree, edu.major);
  }

  return parts.filter(Boolean).join(' ');
}

function normalizeSearchText(text: string): string {
  return text
    .toLowerCase()
    .replace(/用戶/g, '用户')
    .replace(/⻓/g, '长')
    .replace(/\s+/g, '')
    .replace(/[，,。；;：:、|｜/()（）【】\[\]{}+\-.]/g, '');
}

function getTermAliases(term: string): string[] {
  const aliasMap: Record<string, string[]> = {
    'PRD撰写': ['PRD', '产品需求文档', '需求文档'],
    'MVP定义': ['MVP', 'MVP定义'],
    '用户调研': ['用户调研', '用戶调研', '需求调研', '临床调研'],
    '需求分析': ['需求分析', '需求挖掘'],
    '项目推进': ['项目推进', '项目管理', '推动', '落地'],
    '跨团队协作': ['跨团队协作', '跨模块协同', '产学研对接', '协作'],
    '医疗健康': ['医疗健康', '医疗', '临床', '医院'],
    '医疗器械': ['医疗器械', '医疗设备'],
    '智能硬件': ['智能硬件', '硬件', '可穿戴'],
    '可穿戴设备': ['可穿戴', '手环', '手套'],
    'AIoT': ['AIoT', '智能硬件'],
    'C/C++': ['C/C++', 'C++', 'C语言'],
    'PCB设计': ['PCB', 'PCB设计'],
    'STM32': ['STM32', 'S TM32'],
  };

  return [term, ...(aliasMap[term] || [])];
}

function textHasTerm(text: string, term: string): boolean {
  const normalizedText = normalizeSearchText(text);
  return getTermAliases(term).some(alias => normalizedText.includes(normalizeSearchText(alias)));
}

function isRelevantToJD(text: string, jdKeywords: string[]): boolean {
  if (jdKeywords.length === 0) {
    return true;
  }

  return jdKeywords.some(keyword => textHasTerm(text, keyword));
}

function dedupeSuggestions(suggestions: OptimizationSuggestion[]): OptimizationSuggestion[] {
  const seen = new Set<string>();
  const result: OptimizationSuggestion[] = [];

  for (const suggestion of suggestions) {
    const key = [
      suggestion.priority,
      suggestion.category,
      suggestion.section,
      suggestion.title,
      suggestion.currentContent || suggestion.description,
    ].join('|').toLowerCase();

    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(suggestion);
  }

  return result;
}

function sortSuggestions(
  suggestions: OptimizationSuggestion[]
): OptimizationSuggestion[] {
  const priorityOrder: Record<string, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  return suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}

/**
 * 使用 AI 生成优化后的简历内容
 */
export async function generateOptimizedContent(
  originalContent: string,
  suggestion: OptimizationSuggestion,
  jdAnalysis: JDAnalysis
): Promise<string> {
  const prompt = `请根据以下建议优化简历内容：

原始内容：
${originalContent}

优化建议：
${suggestion.description}

岗位要求：
${JSON.stringify(jdAnalysis, null, 2)}

请生成优化后的内容，要求：
1. 自然融入 JD 关键词
2. 保持真实，不夸大
3. 使用专业、简洁的语言
4. 突出与岗位相关的技能和经验`;

  const client = createConfiguredAIClient();
  if (!client) {
    logger.warn('未配置 AI API Key，返回规则生成建议内容', 'optimization-advisor');
    return suggestion.suggestedContent || originalContent;
  }

  try {
    // 内容改写也走低 temperature，避免发散改写偏离原意
    const aiResponse = await generateWithAudit(
      client,
      { service: 'optimization-advisor' },
      prompt,
      3,
      { temperature: 0.3 }
    );
    return aiResponse.text;
  } catch (error) {
    logger.error('AI 调用失败', error instanceof Error ? error : undefined, 'optimization-advisor');
    return originalContent;
  }
}
