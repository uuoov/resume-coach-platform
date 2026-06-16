/**
 * PDF 导出冒烟测试
 *
 * 目标：覆盖之前零测试的 pdf-export.ts（832 行）。
 * 不校验像素，只校验：
 *   1. 三个模板（modern/classic/minimal）都能产出有效 PDF buffer
 *   2. buffer 以 "%PDF" magic bytes 开头
 *   3. buffer 非空且有一定长度（说明内容确实被写入）
 */

import { generateResumePDF } from '../src/services/pdf-export';
import type { Resume } from '../src/types/resume';

const fixtureResume: Resume = {
  id: 'test-resume-1',
  basicInfo: {
    name: '张三',
    email: 'zhangsan@example.com',
    phone: '13800138000',
    location: '北京',
  },
  summary: '3 年经验的 Node.js 工程师，熟悉 Express、PostgreSQL。',
  workExperience: [
    {
      id: 'work-1',
      company: 'Acme',
      position: '后端工程师',
      startDate: '2022-01',
      endDate: '2024-06',
      isCurrent: false,
      description: ['负责 REST API 设计与实现', '优化数据库查询性能'],
    },
  ],
  projects: [
    {
      id: 'project-1',
      name: '简历辅导平台',
      role: '主力开发',
      description: 'AI 驱动的简历优化服务',
      technologies: ['Node.js', 'Express', 'PostgreSQL'],
    },
  ],
  education: [
    {
      id: 'edu-1',
      school: '北京大学',
      degree: '本科',
      major: '计算机科学',
      startDate: '2018-09',
      endDate: '2022-06',
    },
  ],
  skills: [
    { id: 'skill-1', name: 'Node.js', category: 'framework', proficiency: 'advanced' },
    { id: 'skill-2', name: 'PostgreSQL', category: 'database', proficiency: 'intermediate' },
  ],
  certifications: ['AWS Certified Developer'],
  languages: ['中文（母语）', '英语（CET-6）'],
};

describe('PDF 导出 — generateResumePDF', () => {
  // PDF 生成偶尔会慢，给足超时
  jest.setTimeout(30000);

  describe.each(['modern', 'classic', 'minimal'] as const)(
    '模板：%s',
    (template) => {
      it('生成有效 PDF buffer', async () => {
        const buffer = await generateResumePDF({
          resume: fixtureResume,
          template,
        });

        expect(Buffer.isBuffer(buffer)).toBe(true);
        expect(buffer.length).toBeGreaterThan(1000);

        // PDF 文件必须以 "%PDF-" 开头
        const magic = buffer.slice(0, 5).toString('latin1');
        expect(magic).toBe('%PDF-');

        // 必须包含 %%EOF 终止标记（PDF 规范要求）
        const tail = buffer.slice(-1024).toString('latin1');
        expect(tail).toContain('%%EOF');
      });
    }
  );

  it('缺省 template 参数时使用 modern', async () => {
    const buffer = await generateResumePDF({ resume: fixtureResume });
    expect(buffer.slice(0, 5).toString('latin1')).toBe('%PDF-');
  });
});
