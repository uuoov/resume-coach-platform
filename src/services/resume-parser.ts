/**
 * 简历解析服务
 * 负责解析 PDF/Word 简历，提取结构化信息
 */

import * as fs from 'fs';
import type { Resume, Proficiency } from '../types/resume';
import { createConfiguredAIClient } from '../utils/ai-client';
import { SKILL_CATALOG, categorizeSkill } from '../utils/skill-catalog';

// 延迟导入 PDF 和 Word 解析库
type PdfParseModule = (dataBuffer: Buffer, options?: any) => Promise<{ text: string }>;
let pdfParseFn: PdfParseModule | null = null;
let mammothModule: typeof import('mammoth') | null = null;

/**
 * 解析简历文件
 * @param filePath - 简历文件路径
 * @param fileType - 文件类型 ('pdf' | 'docx')
 */
export async function parseResume(filePath: string, fileType: 'pdf' | 'docx'): Promise<Resume> {
  // 1. 提取文本
  const text = await extractText(filePath, fileType);

  // 2. 结构化解析
  return parseResumeText(text);
}

export async function parseResumeText(text: string): Promise<Resume> {
  return parseToStructure(normalizeText(text));
}

/**
 * 从文件中提取文本
 */
async function extractText(filePath: string, fileType: 'pdf' | 'docx'): Promise<string> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  if (fileType === 'pdf') {
    if (!pdfParseFn) {
      const module = await import('pdf-parse');
      pdfParseFn = module.default as PdfParseModule;
    }
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParseFn(dataBuffer);
    return data.text;
  } else if (fileType === 'docx') {
    if (!mammothModule) {
      mammothModule = await import('mammoth');
    }
    const result = await mammothModule.extractRawText({ path: filePath });
    return result.value;
  }

  throw new Error(`Unsupported file type: ${fileType}`);
}

/**
 * 将文本解析为结构化简历
 * 使用规则 + AI 结合的方式解析
 */
async function parseToStructure(text: string): Promise<Resume> {
  // 首先尝试使用 AI 进行结构化解析
  const aiParsed = await parseWithAI(text);
  if (aiParsed) {
    return aiParsed;
  }

  // AI 解析失败时，使用规则解析
  const resume: Resume = {
    id: generateId(),
    basicInfo: parseBasicInfo(text),
    workExperience: parseWorkExperience(text),
    projects: parseProjects(text),
    education: parseEducation(text),
    skills: parseSkills(text),
    summary: parseSummary(text),
    certifications: parseCertifications(text),
    languages: parseLanguages(text),
  };

  return resume;
}

/**
 * 使用 AI 辅助解析简历
 */
async function parseWithAI(text: string): Promise<Resume | null> {
  const client = createConfiguredAIClient();
  if (!client) {
    console.warn('未配置 AI API Key，使用规则解析');
    return null;
  }

  const prompt = `你是一位专业的简历解析专家。请仔细分析以下简历文本，提取所有结构化信息。

简历文本：
---
${text.substring(0, 8000)}
---

请严格按照以下 JSON Schema 输出解析结果（不要任何额外说明，只输出 JSON）：

{
  "basicInfo": {
    "name": "姓名（中文或英文）",
    "email": "邮箱地址",
    "phone": "手机号码（格式：13800138000 或 +86-138-0013-8000）",
    "location": "所在城市",
    "website": "个人网站（可选）",
    "github": "GitHub 用户名（可选）",
    "linkedin": "LinkedIn 主页（可选）"
  },
  "education": [
    {
      "school": "学校全称",
      "degree": "学历（高中/大专/本科/硕士/博士/MBA）",
      "major": "专业",
      "startDate": "入学日期 YYYY-MM 或 YYYY",
      "endDate": "毕业日期 YYYY-MM 或 YYYY 或 至今"
    }
  ],
  "workExperience": [
    {
      "company": "公司全称",
      "position": "职位/Title",
      "startDate": "开始日期 YYYY-MM 或 YYYY",
      "endDate": "结束日期 YYYY-MM 或 YYYY 或 至今",
      "isCurrent": "是否在职（true/false）",
      "location": "工作地点（可选）",
      "description": ["工作内容描述，使用条列式"]
    }
  ],
  "projects": [
    {
      "name": "项目名称",
      "role": "担任角色",
      "startDate": "开始日期（可选）",
      "endDate": "结束日期（可选）",
      "description": "项目详细描述",
      "technologies": ["使用的技术栈"]
    }
  ],
  "skills": [
    {
      "name": "技能名称",
      "proficiency": "熟练程度（beginner/intermediate/advanced/expert）"
    }
  ],
  "summary": "自我评价/个人总结（完整文本）",
  "certifications": ["证书名称列表"],
  "languages": ["语言能力列表"]
}

解析要求：
1. 准确识别姓名、联系方式等基本信息
2. 工作经历按时间倒序排列
3. 技能分类要准确（编程语言、框架、数据库、工具等）
4. 如果某些字段不存在，留空字符串或空数组
5. 日期格式统一为 YYYY-MM 或 YYYY
6. 确保输出有效的 JSON 格式`;

  try {
    const aiResponse = await client.generateWithRetry(prompt);

    // 提取 JSON 内容（处理可能的 markdown 格式）
    let jsonStr = aiResponse.text.trim();

    // 移除可能的 markdown 代码块标记
    jsonStr = jsonStr.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/g, '');

    // 使用正则表达式提取 JSON 内容
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    const parsed = JSON.parse(jsonStr);

    // 转换为 Resume 类型
    return {
      id: generateId(),
      basicInfo: {
        name: parsed.basicInfo?.name || '',
        email: parsed.basicInfo?.email || '',
        phone: parsed.basicInfo?.phone || '',
        location: parsed.basicInfo?.location || '',
        website: parsed.basicInfo?.website || '',
        github: parsed.basicInfo?.github || '',
        linkedin: parsed.basicInfo?.linkedin || '',
      },
      workExperience: parsed.workExperience?.map((exp: any) => ({
        id: generateId(),
        company: exp.company || '',
        position: exp.position || '',
        startDate: exp.startDate || '',
        endDate: exp.endDate || '',
        isCurrent: exp.isCurrent || (exp.endDate === '至今' || exp.endDate === 'present' || !exp.endDate),
        location: exp.location || '',
        description: Array.isArray(exp.description) ? exp.description : [exp.description || ''].filter(Boolean),
      })) || [],
      projects: parsed.projects?.map((proj: any) => ({
        id: generateId(),
        name: proj.name || '',
        role: proj.role || '',
        startDate: proj.startDate || '',
        endDate: proj.endDate || '',
        description: proj.description || '',
        technologies: proj.technologies || [],
      })) || [],
      education: parsed.education?.map((edu: any) => ({
        id: generateId(),
        school: edu.school || '',
        degree: edu.degree || '',
        major: edu.major || '',
        startDate: edu.startDate || '',
        endDate: edu.endDate || '',
        gpa: edu.gpa || '',
      })) || [],
      skills: parsed.skills?.map((skill: any) => {
        const skillName = typeof skill === 'string' ? skill : skill.name;
        const proficiency = typeof skill === 'string' ? 'intermediate' as const : (skill.proficiency || 'intermediate' as const);
        return {
          id: generateId(),
          name: skillName,
          category: categorizeSkill(skillName),
          proficiency,
          yearsOfExperience: undefined,
        };
      }) || [],
      summary: parsed.summary || undefined,
      certifications: parsed.certifications || undefined,
      languages: parsed.languages || undefined,
    };
  } catch (error) {
    console.warn('AI 简历解析失败，使用规则解析:', (error as Error).message);
    return null;
  }
}

/**
 * 解析基本信息
 */
function parseBasicInfo(text: string): Resume['basicInfo'] {
  const basicInfo: Resume['basicInfo'] = {
    name: '',
    phone: '',
    email: '',
    location: '',
    website: '',
    github: '',
    linkedin: '',
  };

  const lines = getMeaningfulLines(text);
  const labelledName = lines
    .map(line => line.match(/^(?:姓名|Name|CN)[:：\s]+(.+)$/i)?.[1]?.trim())
    .find((name): name is string => Boolean(name && isNameCandidate(name)));

  if (labelledName) {
    basicInfo.name = labelledName;
  } else {
    const contactIndex = lines.findIndex(line => /邮箱|邮件|Email|电话|手机|Phone|Tel/i.test(line));
    const contactWindow = contactIndex >= 0
      ? lines.slice(Math.max(0, contactIndex - 6), Math.min(lines.length, contactIndex + 4))
      : [];
    const nearbyName = contactWindow.find(isNameCandidate);
    const headerName = lines.slice(0, 12).find(isNameCandidate);
    basicInfo.name = nearbyName || headerName || '';
  }

  // 邮箱匹配（支持多种格式）
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emailMatch = text.match(emailPattern);
  if (emailMatch) {
    basicInfo.email = emailMatch[0];
  }

  // 手机号匹配（支持中国大陆格式和国际格式）
  const labelledPhoneMatch = text.match(/(?:手机|电话|联系方式|Phone|Tel)[:：\s]*([+()\-.\s\d]{7,24})/i);
  const generalPhoneMatch = text.match(/(?:\+?86[-\s]?)?1[3-9]\d(?:[-\s]?\d{4}){2}/);
  const phoneRaw = labelledPhoneMatch?.[1] || generalPhoneMatch?.[0];
  if (phoneRaw) {
    basicInfo.phone = phoneRaw.replace(/[^\d+]/g, '').replace(/^\+?86/, '');
  }

  // GitHub
  const githubMatch = text.match(/github\.com\/([a-zA-Z0-9_-]+)/i);
  if (githubMatch) {
    basicInfo.github = githubMatch[1];
  }

  // LinkedIn
  const linkedinMatch = text.match(/linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i);
  if (linkedinMatch) {
    basicInfo.linkedin = linkedinMatch[1];
  }

  // 个人网站
  const websiteMatch = text.match(/https?:\/\/(?!github|linkedin|linkedin\.com\/in)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/[^\s]*)?/i);
  if (websiteMatch && !websiteMatch[0].includes('github.com') && !websiteMatch[0].includes('linkedin.com')) {
    basicInfo.website = websiteMatch[0];
  }

  // 所在地匹配
  const locationPattern1 = /(?:现居|所在地?|位于|地址|城市|Location)[:：]\s*([^\n,，|]+)/i;
  const locationMatch1 = text.match(locationPattern1);
  if (locationMatch1) {
    basicInfo.location = locationMatch1[1].trim();
  } else {
    // 匹配城市名
    const cityPattern = /((?:北京|上海|广州|深圳|杭州|南京|成都|武汉|西安|天津|重庆|苏州|厦门|长沙|郑州|青岛|大连|宁波|东莞|佛山|合肥|昆明|福州|济南|珠海|无锡|常州|惠州|汕尾)(?:市)?(?:[\u4e00-\u9fa5]{1,4}[区县镇])?)/;
    const cityMatch = text.match(cityPattern);
    if (cityMatch) {
      basicInfo.location = cityMatch[1].trim();
    }
  }

  return basicInfo;
}

/**
 * 解析工作经历
 */
function parseWorkExperience(text: string): Resume['workExperience'] {
  const experiences: Resume['workExperience'] = [];
  const blocks = getSectionBlocks(text, ['工作经历', '工作经验', '实习经历', '实习经验', '校内实践', '校园经历', '社会实践', '实践经历', 'Work Experience', 'Internship']);

  for (const block of blocks) {
    let currentExp: Resume['workExperience'][0] | null = null;
    let descriptionParts: string[] = [];

    const flush = () => {
      if (!currentExp) return;
      currentExp.description = compactDescription(descriptionParts);
      if (currentExp.company || currentExp.position || currentExp.description.length > 0) {
        experiences.push(currentExp);
      }
      currentExp = null;
      descriptionParts = [];
    };

    for (const line of block.lines) {
      const dateRange = extractDateRange(line);
      if (dateRange && dateRange.title.length > 1) {
        flush();
        const isCurrent = isCurrentDate(dateRange.endDate);
        currentExp = {
          id: generateId(),
          company: dateRange.title,
          position: stripLocation(dateRange.trailing),
          startDate: normalizeDate(dateRange.startDate),
          endDate: isCurrent ? '' : normalizeDate(dateRange.endDate),
          isCurrent,
          location: extractInlineLocation(dateRange.trailing),
          description: [],
        };
        continue;
      }

      if (!currentExp) {
        continue;
      }

      const cleanedLine = cleanBullet(line);
      if (!currentExp.position && isLikelyRoleLine(cleanedLine)) {
        currentExp.position = stripLocation(cleanedLine);
      } else if (cleanedLine) {
        descriptionParts.push(cleanedLine);
      }
    }

    flush();
  }

  return experiences;
}

/**
 * 解析项目经历
 */
function parseProjects(text: string): Resume['projects'] {
  const projects: Resume['projects'] = [];
  const blocks = getSectionBlocks(text, ['项目经历', '项目经验', '项目实践', 'Project Experience', 'Projects']);

  for (const block of blocks) {
    let currentProject: Resume['projects'][0] | null = null;
    let descriptionParts: string[] = [];

    const flush = () => {
      if (!currentProject) return;
      currentProject.description = compactDescription(descriptionParts).join('\n');
      currentProject.technologies = uniqueStrings([
        ...currentProject.technologies,
        ...extractTechnologies(`${currentProject.name}\n${descriptionParts.join('\n')}`),
      ]);

      if (currentProject.name.length > 1) {
        projects.push(currentProject);
      }

      currentProject = null;
      descriptionParts = [];
    };

    for (const line of block.lines) {
      const dateRange = extractDateRange(line);
      if (dateRange && isLikelyProjectName(dateRange.title)) {
        flush();
        const isCurrent = isCurrentDate(dateRange.endDate);
        currentProject = {
          id: generateId(),
          name: dateRange.title,
          role: stripLocation(dateRange.trailing),
          startDate: normalizeDate(dateRange.startDate),
          endDate: isCurrent ? '' : normalizeDate(dateRange.endDate),
          description: '',
          technologies: extractTechnologies(line),
        };
        continue;
      }

      if (!currentProject) {
        continue;
      }

      const cleanedLine = cleanBullet(line);
      if (!currentProject.role && isLikelyRoleLine(cleanedLine)) {
        currentProject.role = stripLocation(cleanedLine);
      } else if (/技术栈|技术|工具|语言|平台/i.test(cleanedLine)) {
        currentProject.technologies = uniqueStrings([
          ...currentProject.technologies,
          ...splitLabelValues(cleanedLine),
          ...extractTechnologies(cleanedLine),
        ]);
        descriptionParts.push(cleanedLine);
      } else if (cleanedLine) {
        descriptionParts.push(cleanedLine);
      }
    }

    flush();
  }

  return projects;
}

/**
 * 解析教育背景
 */
function parseEducation(text: string): Resume['education'] {
  const education: Resume['education'] = [];
  const seenSchools = new Set<string>();
  const blocks = getSectionBlocks(text, ['教育背景', '教育经历', '学历', 'Education']);

  for (const block of blocks) {
    for (let index = 0; index < block.lines.length; index++) {
      const line = block.lines[index];
      const dateRange = extractDateRange(line);
      const lineDegree = extractDegreeMajor(line);

      if (dateRange && isLikelySchoolName(dateRange.title)) {
        const nearbyLines = block.lines.slice(index + 1, index + 5);
        const degreeMajor = lineDegree || nearbyLines.map(extractDegreeMajor).find(Boolean);
        const gpa = extractGpa(line) || nearbyLines.map(extractGpa).find(Boolean);
        const schoolKey = dateRange.title.toLowerCase();

        if (!seenSchools.has(schoolKey)) {
          seenSchools.add(schoolKey);
          education.push({
            id: generateId(),
            school: dateRange.title,
            degree: degreeMajor?.degree || '',
            major: degreeMajor?.major || '',
            startDate: normalizeDate(dateRange.startDate),
            endDate: normalizeDate(dateRange.endDate),
            gpa,
          });
        }
        continue;
      }

      if (dateRange && lineDegree) {
        const school = dateRange.title.replace(lineDegree.raw, '').trim();
        const schoolKey = school.toLowerCase();
        if (school && !seenSchools.has(schoolKey)) {
          seenSchools.add(schoolKey);
          education.push({
            id: generateId(),
            school,
            degree: lineDegree.degree,
            major: lineDegree.major,
            startDate: normalizeDate(dateRange.startDate),
            endDate: normalizeDate(dateRange.endDate),
            gpa: extractGpa(line),
          });
        }
        continue;
      }

      const compactMatch = line.match(/^(.+?(?:大学|学院|学校|University|College))\s+(.+?)$/i);
      const compactDegree = compactMatch ? extractDegreeMajor(compactMatch[2]) : null;
      if (compactMatch && compactDegree) {
        const school = cleanLine(compactMatch[1]);
        const schoolKey = school.toLowerCase();
        if (!seenSchools.has(schoolKey)) {
          const nearbyLines = block.lines.slice(index, index + 4);
          const range = nearbyLines.map(extractDateRange).find(Boolean);
          const gpa = nearbyLines.map(extractGpa).find(Boolean);
          seenSchools.add(schoolKey);
          education.push({
            id: generateId(),
            school,
            degree: compactDegree.degree,
            major: compactDegree.major,
            startDate: range ? normalizeDate(range.startDate) : '',
            endDate: range ? normalizeDate(range.endDate) : '',
            gpa,
          });
        }
      }
    }
  }

  if (education.length === 0) {
    const lines = getMeaningfulLines(text);
    for (let index = 0; index < lines.length; index++) {
      const dateRange = extractDateRange(lines[index]);
      if (!dateRange || !isLikelySchoolName(dateRange.title)) {
        continue;
      }

      const nearbyLines = lines.slice(index + 1, index + 5);
      const degreeMajor = nearbyLines.map(extractDegreeMajor).find(Boolean);
      const gpa = extractGpa(lines[index]) || nearbyLines.map(extractGpa).find(Boolean);
      const schoolKey = dateRange.title.toLowerCase();
      if (!seenSchools.has(schoolKey)) {
        seenSchools.add(schoolKey);
        education.push({
          id: generateId(),
          school: dateRange.title,
          degree: degreeMajor?.degree || '',
          major: degreeMajor?.major || '',
          startDate: normalizeDate(dateRange.startDate),
          endDate: normalizeDate(dateRange.endDate),
          gpa,
        });
      }
    }
  }

  return education;
}

/**
 * 解析技能清单
 */
function parseSkills(text: string): Resume['skills'] {
  const skills: Resume['skills'] = [];
  const seenSkills = new Set<string>();

  // 统一使用 skill-catalog 的技能词典，避免与 categorizeSkill 重复
  const skillMap = SKILL_CATALOG;

  // 检测是否包含中文字符
  const hasCJK = (str: string) => /[\u4e00-\u9fa5]/.test(str);

  // 从文本中提取技能熟练度
  const getProficiency = (text: string, skillName: string): Proficiency => {
    // 在技能名称前后查找熟练度关键词
    const proficiencyPatterns: [RegExp, Proficiency][] = [
      [new RegExp(`精通\\s*${skillName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i'), 'expert'],
      [new RegExp(`${skillName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\(精通\\)`, 'i'), 'expert'],
      [new RegExp(`熟练\\s*(?:使用|掌握)?\\s*${skillName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i'), 'advanced'],
      [new RegExp(`熟悉\\s*${skillName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i'), 'advanced'],
      [new RegExp(`了解\\s*${skillName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i'), 'beginner'],
    ];

    for (const [pattern, level] of proficiencyPatterns) {
      if (pattern.test(text)) {
        return level;
      }
    }
    return 'intermediate';
  };

  const escapeRegex = (str: string) => str.replace(/[.+*?^${}()|[\]\\]/g, '\\$&');
  const buildSkillPattern = (skillName: string) => {
    const escaped = escapeRegex(skillName);
    // 对中文技能名不使用 \b；对 C++、C/C++、Node.js 这类带符号名称使用更宽松的边界。
    return hasCJK(skillName)
      ? new RegExp(escaped, 'i')
      : new RegExp(`(^|[^A-Za-z0-9])${escaped}([^A-Za-z0-9]|$)`, 'i');
  };

  for (const [skillName, category] of Object.entries(skillMap)) {
    const pattern = buildSkillPattern(skillName);

    if (pattern.test(text) && !seenSkills.has(skillName.toLowerCase())) {
      seenSkills.add(skillName.toLowerCase());
      skills.push({
        id: generateId(),
        name: skillName,
        category,
        proficiency: getProficiency(text, skillName),
        yearsOfExperience: undefined,
      });
    }
  }

  return skills;
}

/**
 * 解析自我评价
 */
function parseSummary(text: string): string | undefined {
  const summaryKeywords = ['个人优势', '自我评价', '个人总结', '职业总结', 'Summary', 'About Me'];

  for (const keyword of summaryKeywords) {
    const index = text.indexOf(keyword);
    if (index !== -1) {
      // 提取关键词后的内容
      const colonMatch = text.slice(index + keyword.length).match(/^\s*[:：]/);
      const start = index + keyword.length + (colonMatch ? colonMatch[0].length : 0);
      const end = findNextSection(text, start);
      const summary = compactDescription(text.substring(start, end).split('\n')).join('\n');
      return summary || undefined;
    }
  }

  return undefined;
}

/**
 * 解析证书
 */
function parseCertifications(text: string): string[] | undefined {
  const certs: string[] = [];
  const certKeywords = ['证书', '资格', 'Certification', 'Credential', '获奖', '荣誉'];

  // 找到证书/获奖部分
  let certSectionStart = -1;
  for (const keyword of certKeywords) {
    const index = text.indexOf(keyword);
    if (index !== -1 && (certSectionStart === -1 || index < certSectionStart)) {
      certSectionStart = index;
    }
  }

  if (certSectionStart !== -1) {
    const certSection = text.substring(certSectionStart, certSectionStart + 2000);
    const lines = getMeaningfulLines(certSection);

    for (const line of lines) {
      // 跳过章节标题本身
      if (certKeywords.some(k => line === k)) continue;
      // 匹配证书行（以 - 或 • 开头，或包含证书关键词的行）
      if ((line.startsWith('-') || line.startsWith('•')) && line.length > 3) {
        certs.push(cleanBullet(line));
      }
    }
  }

  for (const line of getMeaningfulLines(text)) {
    const labelledHonor = line.match(/^(?:荣誉成果|荣誉|获奖|奖项|证书)[:：]\s*(.+)$/);
    if (labelledHonor) {
      certs.push(...normalizeHonorItems(splitHonorItems(labelledHonor[1])));
      continue;
    }

    if (/(?:一等奖|二等奖|三等奖|金奖|银奖|铜奖|发明专利|实用新型专利|软件著作权|挑战杯|大创|创新创业)/.test(line)) {
      certs.push(...normalizeHonorItems(extractKnownHonorKeywords(line)));
    }
  }

  // 搜索常见证书关键词
  const commonCerts = [
    'PMP', 'CPA', 'CFA', 'AWS认证', 'CCNA', 'CCNP',
    '软件设计师', '系统架构师', '信息系统项目管理师',
    '高级程序员', '中级程序员', '初级程序员',
    '挑战杯', '大创项目', '发明专利', '实用新型专利', '软件著作权',
    '一等奖', '二等奖', '三等奖', '金奖', '银奖', '铜奖', '优秀助教',
  ];

  for (const cert of commonCerts) {
    if (text.includes(cert)) {
      certs.push(cert);
    }
  }

  const uniqueCerts = uniqueStrings(certs).filter(cert => cert.length > 1);
  return uniqueCerts.length > 0 ? uniqueCerts : undefined;
}

/**
 * 解析语言能力
 */
function parseLanguages(text: string): string[] | undefined {
  const langs: string[] = [];
  const langKeywords = ['英语', '日语', '法语', 'CET-4', 'CET-6', 'IELTS', 'TOEFL'];

  for (const keyword of langKeywords) {
    if (text.includes(keyword)) {
      langs.push(keyword);
    }
  }

  return langs.length > 0 ? langs : undefined;
}

// ==================== 辅助函数 ====================

const ALL_SECTION_HEADINGS = [
  '教育经历', '教育背景', '学历',
  '项目经历', '项目经验', '项目实践',
  '工作经历', '工作经验', '实习经历', '实习经验',
  '校内实践', '校园经历', '社会实践', '实践经历',
  '核心技能', '专业技能', '技能清单', '技能',
  '个人优势', '自我评价', '个人总结', '职业总结',
  '证书', '资格', '资质', '获奖', '奖项', '荣誉',
  '语言能力',
  'Education', 'Projects', 'Project Experience', 'Work Experience',
  'Internship', 'Skills', 'Summary', 'About Me', 'Certifications',
];

const DATE_TOKEN = String.raw`(?:\d{4}年(?:\d{1,2}月?)?|\d{4}(?:[./-]\d{1,2})?)`;
const DATE_RANGE_PATTERN = new RegExp(`(${DATE_TOKEN})\\s*(?:-|–|—|~|至|到)\\s*(${DATE_TOKEN}|至今|现在|Present|present)`, 'i');

function normalizeText(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/\u3000/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
}

function cleanLine(line: string): string {
  return line
    .replace(/[\uE000-\uF8FF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanBullet(line: string): string {
  return cleanLine(line)
    .replace(/^[\-•·●*◦]+\s*/, '')
    .replace(/^(?:\d+[\).、]|[（(]\d+[）)])\s*/, '')
    .trim();
}

function getMeaningfulLines(text: string): string[] {
  return normalizeText(text)
    .split('\n')
    .map(cleanLine)
    .filter(line => line.length > 0 && !isIconOnlyLine(line));
}

function isIconOnlyLine(line: string): boolean {
  return /^[\uE000-\uF8FF\s]+$/.test(line);
}

function isSectionHeading(line: string, headings = ALL_SECTION_HEADINGS): boolean {
  const cleaned = cleanLine(line).replace(/[:：]$/, '');
  return headings.some(heading => {
    const normalizedHeading = heading.replace(/[:：]$/, '');
    return cleaned === normalizedHeading
      || (cleaned.includes(normalizedHeading) && cleaned.length <= normalizedHeading.length + 4);
  });
}

function getSectionBlocks(text: string, startHeadings: string[]): Array<{ heading: string; lines: string[] }> {
  const lines = getMeaningfulLines(text);
  const blocks: Array<{ heading: string; lines: string[] }> = [];

  for (let index = 0; index < lines.length; index++) {
    if (!isSectionHeading(lines[index], startHeadings)) {
      continue;
    }

    let endIndex = index + 1;
    while (endIndex < lines.length && !isSectionHeading(lines[endIndex])) {
      endIndex++;
    }

    blocks.push({
      heading: lines[index],
      lines: lines.slice(index + 1, endIndex),
    });
    index = endIndex - 1;
  }

  return blocks;
}

function extractDateRange(line: string): { title: string; startDate: string; endDate: string; trailing: string } | null {
  const cleaned = cleanLine(line);
  const match = cleaned.match(DATE_RANGE_PATTERN);
  if (!match || match.index === undefined) {
    return null;
  }

  const title = cleaned
    .slice(0, match.index)
    .replace(/^[\-•·●*◦]+\s*/, '')
    .replace(/[|｜,，:：\-–—\s]+$/, '')
    .trim();
  const trailing = cleaned
    .slice(match.index + match[0].length)
    .replace(/^[|｜,，:：\-–—\s]+/, '')
    .trim();

  return {
    title,
    startDate: match[1],
    endDate: match[2],
    trailing,
  };
}

function normalizeDate(date: string): string {
  const trimmed = date.trim();
  if (!trimmed || isCurrentDate(trimmed)) {
    return '';
  }

  const chineseDate = trimmed.match(/^(\d{4})年(?:\s*(\d{1,2})月?)?$/);
  if (chineseDate) {
    return chineseDate[2]
      ? `${chineseDate[1]}-${chineseDate[2].padStart(2, '0')}`
      : chineseDate[1];
  }

  const numericDate = trimmed.match(/^(\d{4})[./-](\d{1,2})$/);
  if (numericDate) {
    return `${numericDate[1]}-${numericDate[2].padStart(2, '0')}`;
  }

  const year = trimmed.match(/^\d{4}$/);
  return year ? year[0] : trimmed;
}

function isCurrentDate(date: string): boolean {
  return /^(?:至今|现在|Present|present)$/i.test(date.trim());
}

function isNameCandidate(line: string): boolean {
  const cleaned = cleanLine(line);
  if (!cleaned || isSectionHeading(cleaned)) {
    return false;
  }
  if (/[@\d:：|｜,，/\\]/.test(cleaned)) {
    return false;
  }
  if (/(?:大学|学院|学校|公司|中心|项目|经历|技能|电话|手机|邮箱|教育|荣誉|实践|实习|工作|个人优势|团队负责人)/.test(cleaned)) {
    return false;
  }

  return /^[\u4e00-\u9fa5·]{2,6}$/.test(cleaned)
    || /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}$/.test(cleaned);
}

function isLikelySchoolName(line: string): boolean {
  const cleaned = cleanLine(line);
  return cleaned.length > 1
    && cleaned.length < 80
    && /(?:大学|学院|学校|University|College|Institute)/i.test(cleaned);
}

function isLikelyProjectName(line: string): boolean {
  const cleaned = cleanLine(line);
  return cleaned.length > 1
    && cleaned.length < 140
    && !/^(?:项目内容|项目职责|职责|成果|荣誉成果|技术栈|技术|工具)[:：]/.test(cleaned)
    && /(?:项目|系统|平台|产品|应用|小程序|网站|设备|模型|算法|工具|Project|System|Platform)/i.test(cleaned);
}

function isLikelyRoleLine(line: string): boolean {
  const cleaned = cleanBullet(line);
  if (!cleaned || cleaned.length > 45 || extractDateRange(cleaned) || /[:：]/.test(cleaned)) {
    return false;
  }

  return /(?:负责人|助理|助教|工程师|经理|总监|主管|专员|运营|产品|设计|研发|创始人|组长|组⻓|摄影师|志愿者|成员|Leader|Manager|Engineer|Developer|Assistant|Intern)/i.test(cleaned);
}

function extractInlineLocation(line: string): string {
  const locationMatch = cleanLine(line).match(/(?:^|[|｜,，\s])((?:北京|上海|广州|深圳|杭州|南京|成都|武汉|西安|天津|重庆|苏州|厦门|长沙|郑州|青岛|大连|宁波|东莞|佛山|合肥|昆明|福州|济南|珠海|无锡|常州|惠州|汕尾)(?:市)?)(?:$|[|｜,，\s])/);
  return locationMatch?.[1] || '';
}

function stripLocation(line: string): string {
  return cleanLine(line)
    .replace(/[|｜,，]\s*(?:北京|上海|广州|深圳|杭州|南京|成都|武汉|西安|天津|重庆|苏州|厦门|长沙|郑州|青岛|大连|宁波|东莞|佛山|合肥|昆明|福州|济南|珠海|无锡|常州|惠州|汕尾)(?:市)?\s*$/, '')
    .replace(/(?:北京|上海|广州|深圳|杭州|南京|成都|武汉|西安|天津|重庆|苏州|厦门|长沙|郑州|青岛|大连|宁波|东莞|佛山|合肥|昆明|福州|济南|珠海|无锡|常州|惠州|汕尾)(?:市)?$/, '')
    .trim();
}

function compactDescription(lines: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const line of lines) {
    const cleaned = cleanBullet(line);
    if (!cleaned || isSectionHeading(cleaned) || isResumeChromeLine(cleaned) || seen.has(cleaned)) {
      continue;
    }
    seen.add(cleaned);

    const lastIndex = result.length - 1;
    if (lastIndex >= 0 && !shouldStartNewDescriptionItem(cleaned, result[lastIndex])) {
      result[lastIndex] = `${result[lastIndex]}${cleaned}`;
    } else {
      result.push(cleaned);
    }
  }

  return result;
}

function isResumeChromeLine(line: string): boolean {
  const cleaned = cleanLine(line);
  return isNameCandidate(cleaned)
    || /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(cleaned)
    || /^(?:电话|手机|邮箱|邮件|Email|Phone|Tel)[:：]/i.test(cleaned)
    || /(?:\+?86[-\s]?)?1[3-9]\d(?:[-\s]?\d{4}){2}/.test(cleaned);
}

function shouldStartNewDescriptionItem(current: string, previous: string): boolean {
  if (/[。！？.!?；;]$/.test(previous)) {
    return true;
  }

  return /^(?:项目内容|项目指导|临床转化|成果转化|荣誉成果|构建|基于|产学研|搭建|全国性|工程师文化|新媒体运营|深入|负责|参与|主导|带领|组织|协助|入选|担任|完成|针对|使用|实现|优化)/.test(current);
}

function extractDegreeMajor(line: string): { raw: string; degree: string; major: string } | null {
  const cleaned = cleanLine(line);
  const degreeMatch = cleaned.match(/(博士|硕士|研究生|本科|学士|大专|专科|MBA|PhD|Master|Bachelor|Associate)/i);
  if (!degreeMatch || degreeMatch.index === undefined) {
    return null;
  }

  const raw = degreeMatch[1];
  const degreeMap: Record<string, string> = {
    '博士': 'phd',
    'PhD': 'phd',
    'phd': 'phd',
    '硕士': 'master',
    '研究生': 'master',
    'Master': 'master',
    'master': 'master',
    'MBA': 'master',
    'mba': 'master',
    '本科': 'bachelor',
    '学士': 'bachelor',
    'Bachelor': 'bachelor',
    'bachelor': 'bachelor',
    '大专': 'associate',
    '专科': 'associate',
    'Associate': 'associate',
    'associate': 'associate',
  };
  const before = cleaned.slice(0, degreeMatch.index).replace(/[|｜,，:：\-–—]+/g, ' ').trim();
  const after = cleaned.slice(degreeMatch.index + raw.length).replace(/[|｜,，:：\-–—]+/g, ' ').trim();
  const major = before || after.replace(/(?:院系|学院|系|方向|专业).*$/, '').trim();

  return {
    raw,
    degree: degreeMap[raw] || degreeMap[raw.toLowerCase()] || raw,
    major,
  };
}

function extractGpa(line: string): string | undefined {
  return cleanLine(line).match(/GPA[:：]?\s*([0-9.]+(?:\s*\/\s*[0-9.]+)?(?:[（(][^)）]+[）)])?)/i)?.[1]?.trim();
}

function includesTerm(text: string, term: string): boolean {
  const escaped = term.replace(/[.+*?^${}()|[\]\\]/g, '\\$&');
  return /[\u4e00-\u9fa5]/.test(term)
    ? new RegExp(escaped, 'i').test(text)
    : new RegExp(`(^|[^A-Za-z0-9])${escaped}([^A-Za-z0-9]|$)`, 'i').test(text);
}

function extractTechnologies(text: string): string[] {
  const techKeywords = [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust', 'C++', 'C#', 'C/C++',
    'SQL', 'MATLAB', 'React', 'Vue', 'Node.js', 'Express', 'Django', 'Flask',
    'FastAPI', 'Spring Boot', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Docker',
    'Kubernetes', 'Git', 'Linux', 'AWS', '阿里云', 'TensorFlow', 'PyTorch', 'OpenCV',
    'SVM', 'AIoT', 'MEMS', 'STM32', 'GD32', 'PCB设计', '3D打印', 'Excel',
    '医学信号处理', '医疗器械', '生物医学工程', '智能硬件', 'MVP', 'PRD',
  ];

  return uniqueStrings(techKeywords.filter(keyword => includesTerm(text, keyword)));
}

function splitLabelValues(line: string): string[] {
  const value = cleanLine(line).match(/[:：]\s*(.+)$/)?.[1];
  if (!value) {
    return [];
  }

  return value
    .split(/[、,，;；/]/)
    .map(item => item.trim())
    .filter(item => item.length > 1 && item.length <= 30);
}

function splitHonorItems(line: string): string[] {
  return line
    .split(/[；;]/)
    .flatMap(part => part.split(/(?<=奖|权|项)[、，]/))
    .map(item => cleanBullet(item))
    .filter(Boolean);
}

function extractKnownHonorKeywords(line: string): string[] {
  const knownHonors = [
    '国家级大学生创新创业训练计划',
    '挑战杯',
    '大创项目',
    '发明专利',
    '实用新型专利',
    '软件著作权',
    '一等奖',
    '二等奖',
    '三等奖',
    '金奖',
    '银奖',
    '铜奖',
    '优秀助教',
  ];

  return knownHonors.filter(honor => line.includes(honor));
}

function normalizeHonorItems(items: string[]): string[] {
  return items.flatMap(item => item.length > 80 ? extractKnownHonorKeywords(item) : [item]);
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

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function findNextSection(text: string, startIndex: number): number {
  const sectionMarkers = ALL_SECTION_HEADINGS.map(heading => `\n${heading}`);

  let minIndex = text.length;
  for (const marker of sectionMarkers) {
    const index = text.indexOf(marker, startIndex);
    if (index !== -1 && index < minIndex) {
      minIndex = index;
    }
  }

  return minIndex;
}
