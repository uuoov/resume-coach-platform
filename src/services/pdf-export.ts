/**
 * PDF 导出服务
 * 将简历导出为 PDF 格式
 */

import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';
import type { Resume } from '../types/resume';

interface ExportOptions {
  resume: Resume;
  filename?: string;
  template?: 'modern' | 'classic' | 'minimal';
}

const COLORS = {
  primary: '#2563eb',
  heading: '#0f172a',
  text: '#334155',
  muted: '#64748b',
  line: '#e2e8f0',
};

/**
 * 生成简历 PDF
 */
export async function generateResumePDF(options: ExportOptions): Promise<Buffer> {
  const { resume, template = 'modern' } = options;

  return new Promise((resolve, reject) => {
    try {
      // 创建 PDF 文档
      const doc: InstanceType<typeof PDFDocument> = new PDFDocument({
        size: 'A4',
        margins: {
          top: 50,
          bottom: 50,
          left: 50,
          right: 50,
        },
      });

      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => {
        chunks.push(chunk);
      });

      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });

      doc.on('error', (err) => {
        reject(err);
      });

      // 设置字体（使用中文字体）
      const fontPath = getChineseFontPath();
      if (fontPath && fs.existsSync(fontPath)) {
        try {
          doc.font(fontPath);
        } catch (error) {
          console.warn('Failed to load Chinese font, using default font:', error);
          doc.font('Helvetica');
        }
      } else {
        console.warn('Chinese font not found, using default font');
        doc.font('Helvetica');
      }

      // 根据模板生成内容
      if (template === 'modern') {
        generateModernTemplate(doc, resume);
      } else if (template === 'classic') {
        generateClassicTemplate(doc, resume);
      } else {
        generateMinimalTemplate(doc, resume);
      }

      // 结束文档
      doc.end();

    } catch (error) {
      reject(error);
    }
  });
}

/**
 * 获取中文字体路径
 */
function getChineseFontPath(): string | null {
  // 项目内置开源中文字体（最高优先级）
  const builtinFont = path.resolve(__dirname, '../assets/fonts/SimHei.ttf');
  if (fs.existsSync(builtinFont)) {
    return builtinFont;
  }

  // Windows 系统字体路径 - 强制使用 .ttf 避免 pdfkit 的 ttc subset 报错
  const windowsFonts = [
    'C:\\Windows\\Fonts\\simhei.ttf', // 黑体 (TrueType, safe for pdfkit)
    'C:\\Windows\\Fonts\\simsunb.ttf', 
    'C:\\Windows\\Fonts\\msyh.ttf', // 如果刚好有 ttf 版本的微軟雅黑
  ];

  // macOS 系统字体路径
  const macFonts = [
    '/System/Library/Fonts/PingFang.ttc',
    '/System/Library/Fonts/STHeiti Light.ttc',
  ];

  // Linux 系统字体路径
  const linuxFonts = [
    '/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc',
    '/usr/share/fonts/truetype/droid/DroidSansFallbackFull.ttf',
  ];

  const platform = process.platform;

  const fonts = platform === 'win32' ? windowsFonts :
                platform === 'darwin' ? macFonts : linuxFonts;

  // 检查字体文件是否存在
  for (const fontPath of fonts) {
    if (fs.existsSync(fontPath)) {
      return fontPath;
    }
  }

  return null;
}

/**
 * 现代模板
 */
function generateModernTemplate(doc: InstanceType<typeof PDFDocument>, resume: Resume) {
  const basicInfo = resume.basicInfo as any;

  // 标题部分 - 大标题
  if (basicInfo?.name) {
    doc.fillColor(COLORS.primary).fontSize(32).font(getFont(doc, 'bold')).text(sanitizePdfText(basicInfo.name), { align: 'center' });
    doc.moveDown(0.3);
  }

  // 联系方式 - 居中显示
  const contactLines: string[] = [];
  if (basicInfo?.phone) contactLines.push(basicInfo.phone);
  if (basicInfo?.email) contactLines.push(basicInfo.email);
  if (basicInfo?.location) contactLines.push(basicInfo.location);
  if (basicInfo?.website) contactLines.push(basicInfo.website);
  if (basicInfo?.github) contactLines.push(`GitHub: ${basicInfo.github}`);
  if (basicInfo?.linkedin) contactLines.push(`LinkedIn: ${basicInfo.linkedin}`);

  if (contactLines.length > 0) {
    drawContactLine(doc, contactLines);
    doc.moveDown(1);
  }

  // 重置回主文本颜色
  doc.fillColor(COLORS.text);

  // 添加分隔线
  drawHorizontalLine(doc);
  doc.moveDown(1);

  // 个人总结
  generateSummary(doc, resume);

  // 工作经历
  generateWorkExperience(doc, resume);

  // 项目经历
  generateProjects(doc, resume);

  // 教育背景
  generateEducation(doc, resume);

  // 技能
  generateSkills(doc, resume);

  // 证书
  generateCertifications(doc, resume);

  // 语言
  generateLanguages(doc, resume);
}

/**
 * 经典模板
 */
function generateClassicTemplate(doc: InstanceType<typeof PDFDocument>, resume: Resume) {
  const basicInfo = resume.basicInfo as any;

  // 标题部分
  if (basicInfo?.name) {
    doc.fontSize(28).font(getFont(doc, 'bold')).text(sanitizePdfText(basicInfo.name), { align: 'left' });
    doc.moveDown(0.5);
  }

  // 联系方式
  const contactLines: string[] = [];
  if (basicInfo?.phone) contactLines.push(basicInfo.phone);
  if (basicInfo?.email) contactLines.push(basicInfo.email);
  if (basicInfo?.location) contactLines.push(basicInfo.location);
  if (basicInfo?.website) contactLines.push(basicInfo.website);

  if (contactLines.length > 0) {
    doc
      .fontSize(10)
      .font(getFont(doc))
      .text(toTextList(contactLines).join(' | '), doc.page.margins.left, doc.y, { width: getContentWidth(doc) });
    resetTextCursor(doc);
    doc.moveDown(0.5);
  }

  drawHorizontalLine(doc);
  doc.moveDown(0.8);

  // 个人总结
  generateSummary(doc, resume);

  // 工作经历
  generateWorkExperience(doc, resume);

  // 教育背景
  generateEducation(doc, resume);

  // 项目经历
  generateProjects(doc, resume);

  // 技能
  generateSkills(doc, resume);

  // 证书
  generateCertifications(doc, resume);

  // 语言
  generateLanguages(doc, resume);
}

/**
 * 简约模板
 */
function generateMinimalTemplate(doc: InstanceType<typeof PDFDocument>, resume: Resume) {
  const basicInfo = resume.basicInfo as any;

  // 标题部分
  if (basicInfo?.name) {
    doc.fontSize(24).font(getFont(doc, 'bold')).text(sanitizePdfText(basicInfo.name), { align: 'center' });
    doc.moveDown(0.3);
  }

  // 联系方式
  const contactLines: string[] = [];
  if (basicInfo?.email) contactLines.push(basicInfo.email);
  if (basicInfo?.phone) contactLines.push(basicInfo.phone);
  if (basicInfo?.location) contactLines.push(basicInfo.location);

  if (contactLines.length > 0) {
    drawContactLine(doc, contactLines, '  |  ');
    doc.moveDown(1.5);
  }

  // 个人总结
  generateSummary(doc, resume);

  // 工作经历
  generateWorkExperience(doc, resume);

  // 项目经历
  generateProjects(doc, resume);

  // 教育背景
  generateEducation(doc, resume);

  // 技能
  generateSkills(doc, resume);
}

/**
 * 获取字体
 */
function getFont(doc: any, type: 'regular' | 'bold' | 'italic' = 'regular'): string {
  const chineseFontPath = getChineseFontPath();

  if (chineseFontPath && fs.existsSync(chineseFontPath)) {
    return chineseFontPath;
  }

  return type === 'bold' ? 'Helvetica-Bold' :
         type === 'italic' ? 'Helvetica-Oblique' : 'Helvetica';
}

function getContentWidth(doc: InstanceType<typeof PDFDocument>): number {
  return doc.page.width - doc.page.margins.left - doc.page.margins.right;
}

function resetTextCursor(doc: InstanceType<typeof PDFDocument>) {
  doc.x = doc.page.margins.left;
}

function sanitizePdfText(value: unknown): string {
  return String(value ?? '')
    .normalize('NFC')
    .replace(/\u00a0/g, ' ')
    .replace(/\s*@\s*/g, '@')
    .replace(/([A-Za-z0-9_%+-])\.\s+([A-Za-z]{2,})/g, '$1.$2')
    .replace(/\bA\s+IoT\b/gi, 'AIoT')
    .replace(/\bI\s+o\s+T\b/gi, 'IoT')
    .replace(/\bM\s+E\s+M\s+S\b/gi, 'MEMS')
    .replace(/\bS\s+V\s+M\b/gi, 'SVM')
    .replace(/\bP\s+R\s+D\b/gi, 'PRD')
    .replace(/\bM\s+V\s+P\b/gi, 'MVP')
    .replace(/\bP\s+C\s+B\b/gi, 'PCB')
    .replace(/\bS\s+T\s+M\s*32\b/gi, 'STM32')
    .trim();
}

function toTextList(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map(sanitizePdfText).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(/\r?\n/)
      .map(sanitizePdfText)
      .filter(Boolean);
  }
  return [sanitizePdfText(value)].filter(Boolean);
}

function drawContactLine(doc: InstanceType<typeof PDFDocument>, contactLines: string[], separator = '  |  ') {
  const contactText = toTextList(contactLines).join(separator);
  if (!contactText) return;
  const contactFont = [...contactText].every((char) => char.charCodeAt(0) < 128) ? 'Helvetica' : getFont(doc);

  doc
    .fillColor(COLORS.muted)
    .fontSize(10)
    .font(contactFont)
    .text(contactText, doc.page.margins.left, doc.y, {
      align: 'center',
      width: getContentWidth(doc),
      lineGap: 2,
    });
  resetTextCursor(doc);
}

function drawHeaderRow(
  doc: InstanceType<typeof PDFDocument>,
  leftText: string,
  rightText = '',
  options: { leftSize?: number; rightWidth?: number; gap?: number } = {},
) {
  const safeLeftText = sanitizePdfText(leftText);
  const safeRightText = sanitizePdfText(rightText);
  const x = doc.page.margins.left;
  const y = doc.y;
  const contentWidth = getContentWidth(doc);
  const rightWidth = safeRightText ? (options.rightWidth ?? 108) : 0;
  const gap = safeRightText ? (options.gap ?? 14) : 0;
  const leftWidth = contentWidth - rightWidth - gap;
  const leftSize = options.leftSize ?? 11;

  doc.font(getFont(doc, 'bold')).fontSize(leftSize);
  const leftHeight = safeLeftText ? doc.heightOfString(safeLeftText, { width: leftWidth, lineGap: 1 }) : 0;

  doc.font(getFont(doc)).fontSize(10);
  const rightHeight = safeRightText
    ? doc.heightOfString(safeRightText, { width: rightWidth, align: 'right', lineGap: 1 })
    : 0;

  doc
    .fillColor(COLORS.heading)
    .fontSize(leftSize)
    .font(getFont(doc, 'bold'))
    .text(safeLeftText, x, y, { width: leftWidth, lineGap: 1 });

  if (safeRightText) {
    doc
      .fillColor(COLORS.muted)
      .fontSize(10)
      .font(getFont(doc))
      .text(safeRightText, x + leftWidth + gap, y, {
        align: 'right',
        width: rightWidth,
        lineGap: 1,
      });
  }

  doc.y = y + Math.max(leftHeight, rightHeight, leftSize + 2) + 2;
  resetTextCursor(doc);
  doc.fillColor(COLORS.text);
}

function writeBullet(doc: InstanceType<typeof PDFDocument>, text: string, indent = 10, lineGap = 3) {
  const safeText = sanitizePdfText(text);
  if (!safeText) return;

  doc
    .fillColor(COLORS.text)
    .fontSize(10)
    .font(getFont(doc))
    .text(`- ${safeText}`, doc.page.margins.left, doc.y, {
      indent,
      lineGap,
      width: getContentWidth(doc) - indent,
    });
  resetTextCursor(doc);
}

/**
 * 绘制区块标题
 */
function drawSectionTitle(doc: InstanceType<typeof PDFDocument>, title: string) {
  doc.moveDown(0.3);
  doc
    .fillColor(COLORS.primary)
    .fontSize(14)
    .font(getFont(doc, 'bold'))
    .text(sanitizePdfText(title), doc.page.margins.left, doc.y, { width: getContentWidth(doc) });
  
  // 底部柔和线条
  doc.moveTo(doc.page.margins.left, doc.y + 2)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y + 2)
    .strokeColor(COLORS.line)
    .lineWidth(1)
    .stroke();
  
  doc.moveDown(0.5);
  resetTextCursor(doc);
  doc.fillColor(COLORS.text); // 重置为默认文字颜色
}

/**
 * 生成个人总结
 */
function generateSummary(doc: InstanceType<typeof PDFDocument>, resume: Resume) {
  const summary = resume.summary;
  if (!summary) return;

  drawSectionTitle(doc, '个人总结');
  doc
    .fontSize(10)
    .font(getFont(doc))
    .text(sanitizePdfText(summary), doc.page.margins.left, doc.y, { width: getContentWidth(doc), lineGap: 4 });
  resetTextCursor(doc);
  doc.moveDown(0.5);
}

/**
 * 生成工作经历
 */
function generateWorkExperience(doc: InstanceType<typeof PDFDocument>, resume: Resume) {
  const workExperience = resume.workExperience as any[];
  if (!workExperience || workExperience.length === 0) return;

  drawSectionTitle(doc, '工作经历');

  workExperience.forEach((work, index) => {
    const company = sanitizePdfText(work.company);
    const position = sanitizePdfText(work.position);
    const startDate = sanitizePdfText(work.startDate);
    const endDate = work.isCurrent ? '至今' : (work.endDate || '');
    const timeRange = startDate && endDate ? `${startDate} - ${endDate}` : '';
    const description = toTextList(work.description);
    const achievements = toTextList(work.achievements);

    // 公司名称和职位 (左对齐)，时间 (右对齐)
    drawHeaderRow(doc, [company, position].filter(Boolean).join(' | '), timeRange);

    // 工作描述
    if (description.length > 0) {
      doc.moveDown(0.2);
      description.forEach((desc: string) => writeBullet(doc, desc));
    }

    // 工作成就
    if (achievements.length > 0) {
      doc.moveDown(0.2);
      doc
        .fillColor(COLORS.heading)
        .fontSize(10)
        .font(getFont(doc, 'bold'))
        .text('核心成就:', doc.page.margins.left, doc.y, { indent: 10, width: getContentWidth(doc) - 10 });
      resetTextCursor(doc);
      doc.fillColor(COLORS.text);
      achievements.forEach((achievement: string) => writeBullet(doc, achievement, 20));
    }

    if (index < workExperience.length - 1) doc.moveDown(0.8);
  });
  doc.moveDown(0.5);
}

/**
 * 生成项目经验
 */
function generateProjects(doc: InstanceType<typeof PDFDocument>, resume: Resume) {
  const projects = resume.projects as any[];
  if (!projects || projects.length === 0) return;

  drawSectionTitle(doc, '项目经验');

  projects.forEach((project, index) => {
    const name = sanitizePdfText(project.name);
    const role = sanitizePdfText(project.role);
    const startDate = sanitizePdfText(project.startDate);
    const endDate = project.isCurrent ? '至今' : (project.endDate || '');
    const timeRange = startDate && endDate ? `${startDate} - ${endDate}` : '';
    const technologies = toTextList(project.technologies);
    const description = toTextList(project.description);
    const achievements = toTextList(project.achievements);

    // 项目名称、角色和时间
    drawHeaderRow(doc, role ? `${name} - ${role}` : name, timeRange);

    // 技术栈
    if (technologies.length > 0) {
      doc.moveDown(0.2);
      doc
        .fillColor(COLORS.heading)
        .fontSize(10)
        .font(getFont(doc, 'bold'))
        .text('技术栈：', doc.page.margins.left, doc.y, { continued: true, width: getContentWidth(doc) });
      doc.fillColor(COLORS.text).fontSize(10).font(getFont(doc)).text(technologies.join(', '));
      resetTextCursor(doc);
    }

    // 项目描述
    if (description.length > 0) {
      doc.moveDown(0.2);
      description.forEach((desc: string) => writeBullet(doc, desc));
    }

    // 项目成就
    if (achievements.length > 0) {
      doc.moveDown(0.2);
      doc
        .fillColor(COLORS.heading)
        .fontSize(10)
        .font(getFont(doc, 'bold'))
        .text('核心成就:', doc.page.margins.left, doc.y, { indent: 10, width: getContentWidth(doc) - 10 });
      resetTextCursor(doc);
      doc.fillColor(COLORS.text);
      achievements.forEach((achievement: string) => writeBullet(doc, achievement, 20));
    }

    if (index < projects.length - 1) doc.moveDown(0.8);
  });
  doc.moveDown(0.5);
}

/**
 * 生成教育背景
 */
function generateEducation(doc: InstanceType<typeof PDFDocument>, resume: Resume) {
  const education = resume.education as any[];
  if (!education || education.length === 0) return;

  drawSectionTitle(doc, '教育背景');

  education.forEach((edu, index) => {
    const school = sanitizePdfText(edu.school);
    const degree = getDegreeText(edu.degree);
    const major = sanitizePdfText(edu.major);
    const startDate = sanitizePdfText(edu.startDate);
    const endDate = edu.isCurrent ? '至今' : sanitizePdfText(edu.endDate);
    const timeRange = startDate && endDate ? `${startDate} - ${endDate}` : '';
    const gpa = edu.gpa ? `GPA: ${edu.gpa}` : '';

    // 学校名称加粗，时间右对齐
    drawHeaderRow(doc, school, timeRange);

    // 学历和专业
    let subText = `${degree}    ${major}`;
    if (gpa) {
      subText += `    |    ${gpa}`;
    }
    
    doc.moveDown(0.1);
    doc
      .fillColor(COLORS.text)
      .fontSize(10)
      .font(getFont(doc))
      .text(sanitizePdfText(subText), doc.page.margins.left, doc.y, { width: getContentWidth(doc), lineGap: 3 });
    resetTextCursor(doc);

    if (index < education.length - 1) doc.moveDown(0.6);
  });
  doc.moveDown(0.5);
}

/**
 * 生成技能列表
 */
function generateSkills(doc: InstanceType<typeof PDFDocument>, resume: Resume) {
  const skills = resume.skills as any[];
  if (!skills || skills.length === 0) return;

  drawSectionTitle(doc, '专业技能');

  // 按类别分组
  const skillsByCategory = new Map<string, string[]>();

  skills.forEach(skill => {
    const category = skill.category || 'other';
    const categoryName = getCategoryName(category);
    const skillList = skillsByCategory.get(categoryName) || [];
    const skillText = sanitizePdfText(skill.name + (skill.proficiency ? ` (${getProficiencyText(skill.proficiency)})` : ''));
    skillList.push(skillText);
    skillsByCategory.set(categoryName, skillList);
  });

  // 输出每个类别的技能
  skillsByCategory.forEach((skillList, category) => {
    doc
      .fillColor(COLORS.heading)
      .fontSize(10)
      .font(getFont(doc, 'bold'))
      .text(`${category}: `, doc.page.margins.left, doc.y, { continued: true, width: getContentWidth(doc) });
    doc.fillColor(COLORS.text).fontSize(10).font(getFont(doc)).text(skillList.join(', '), { lineGap: 3 });
    resetTextCursor(doc);
  });

  doc.moveDown(0.5);
}

/**
 * 生成证书
 */
function generateCertifications(doc: InstanceType<typeof PDFDocument>, resume: Resume) {
  const certifications = resume.certifications as any[];
  if (!certifications || certifications.length === 0) return;

  drawSectionTitle(doc, '资格证书');

  toTextList(certifications).forEach((cert) => writeBullet(doc, cert, 10, 2));

  doc.moveDown(0.5);
}

/**
 * 生成语言技能
 */
function generateLanguages(doc: InstanceType<typeof PDFDocument>, resume: Resume) {
  const languages = resume.languages as any[];
  if (!languages || languages.length === 0) return;

  drawSectionTitle(doc, '语言能力');

  toTextList(languages).forEach((lang) => writeBullet(doc, lang, 10, 2));

  doc.moveDown(0.5);
}

/**
 * 绘制水平分隔线
 */
function drawHorizontalLine(doc: InstanceType<typeof PDFDocument>, y?: number) {
  const pageWidth = doc.page.width;
  const marginLeft = doc.page.margins.left;
  const marginRight = doc.page.margins.right;

  const lineY = y !== undefined ? y : doc.y;

  doc.moveTo(marginLeft, lineY)
    .lineTo(pageWidth - marginRight, lineY)
    .strokeColor('#cccccc')
    .stroke();
}

/**
 * 获取学历文本
 */
function getDegreeText(degree?: string): string {
  const degreeMap: Record<string, string> = {
    'high-school': '高中',
    'associate': '大专',
    'bachelor': '本科',
    'master': '硕士',
    'doctorate': '博士',
    'postdoc': '博士后',
  };
  return degreeMap[degree || ''] || degree || '';
}

/**
 * 获取技能类别名称
 */
function getCategoryName(category: string): string {
  const categoryMap: Record<string, string> = {
    'programming-language': '编程语言',
    'framework': '框架',
    'database': '数据库',
    'tool': '工具',
    'cloud': '云服务',
    'soft-skill': '软技能',
    'language': '语言',
    'certification': '证书',
    'domain-knowledge': '领域知识',
    'other': '其他',
  };
  return categoryMap[category] || category;
}

/**
 * 获取技能水平文本
 */
function getProficiencyText(proficiency: string): string {
  const proficiencyMap: Record<string, string> = {
    'beginner': '基础',
    'intermediate': '熟悉',
    'advanced': '精通',
    'expert': '专家',
  };
  return proficiencyMap[proficiency] || proficiency;
}
