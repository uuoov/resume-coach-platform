import { parseResumeText } from '../src/services/resume-parser';

describe('中文简历结构化解析', () => {
  const originalDashScopeKey = process.env.DASHSCOPE_API_KEY;
  const originalDeepSeekKey = process.env.DEEPSEEK_API_KEY;
  const originalOpenAIKey = process.env.OPENAI_API_KEY;

  beforeAll(() => {
    process.env.DASHSCOPE_API_KEY = '';
    process.env.DEEPSEEK_API_KEY = '';
    process.env.OPENAI_API_KEY = '';
  });

  afterAll(() => {
    process.env.DASHSCOPE_API_KEY = originalDashScopeKey;
    process.env.DEEPSEEK_API_KEY = originalDeepSeekKey;
    process.env.OPENAI_API_KEY = originalOpenAIKey;
  });

  it('应解析中文 PDF 常见的分栏/分行简历结构', async () => {
    const resumeText = `

教育经历
深圳大学2023年09月 - 2027年07月
生物医学工程 本科 医疗电子系
GPA：3.4/4.5（Top 20%）

个人优势：具备医疗健康、智能硬件与数字化产品交叉背景，熟悉需求分析、MVP定义和项目管理。

项目经历
基于声纹特征的智能动静脉内瘘监测手环与游戏化康复设备（国家级大创项目）2025年02月 - 2026年05月
团队负责人
项目内容：完成声纹采集、SVM 分类模型验证、MEMS 麦克风硬件选型与游戏化康复流程设计。
荣誉成果：国家级大学生创新创业训练计划项目、发明专利、软件著作权。

面向基层医疗的一站式全自动生化检测平台（广东省“挑战杯”一等奖）2024年02月 - 2025年05月
产品负责人
项目内容：负责用户调研、竞品分析、PRD撰写和临床转化材料整理。

实习经历
深圳大学医学创新成果转化中心2025年09月 - 至今
项目助理
参与医疗器械项目转化、专利材料整理和跨团队协作。

深圳科创学院2025年01月 - 2025年02月
助教
协助创新创业课程运营和项目辅导。

校内实践
深圳大学医工融合卓越工程师协会2024年05月 - 至今
联合创始人&第二届副会长
组织医工融合项目路演与跨学院活动。

社会实践
百万英才汇南粤2025年03月 - 2026年03月
惠州市校园引才大使
负责校园招聘活动宣传与候选人沟通。

梁志聪
电话： 13428020927 | 邮箱： m13428020927@163.com
深圳

核心技能
产品能力：设计思维方法论、用户调研、需求分析、MVP定义、功能拆解、竞品分析、项目管理、跨团队协作、PRD撰写
数据处理能力：Python、MATLAB、Excel、医学信号处理
硬件开发能力：STM32/GD32、C/C++、PCB设计、3D打印、硬件原型制作
`;

    const resume = await parseResumeText(resumeText);
    const skillNames = resume.skills.map(skill => skill.name);

    expect(resume.basicInfo).toMatchObject({
      name: '梁志聪',
      phone: '13428020927',
      email: 'm13428020927@163.com',
      location: '深圳',
    });
    expect(resume.education[0]).toMatchObject({
      school: '深圳大学',
      degree: 'bachelor',
      major: '生物医学工程',
      startDate: '2023-09',
      endDate: '2027-07',
      gpa: '3.4/4.5（Top 20%）',
    });
    expect(resume.projects).toHaveLength(2);
    expect(resume.projects[0]).toMatchObject({
      role: '团队负责人',
      startDate: '2025-02',
      endDate: '2026-05',
    });
    expect(resume.projects[0].name).toContain('内瘘监测手环');
    expect(resume.projects[0].technologies).toEqual(expect.arrayContaining(['SVM', 'MEMS']));
    expect(resume.workExperience.length).toBeGreaterThanOrEqual(4);
    expect(resume.workExperience[0]).toMatchObject({
      company: '深圳大学医学创新成果转化中心',
      position: '项目助理',
      startDate: '2025-09',
      isCurrent: true,
    });
    expect(skillNames).toEqual(expect.arrayContaining([
      'Python',
      'MATLAB',
      'STM32',
      'C/C++',
      'PCB设计',
      'PRD',
      '需求分析',
    ]));
    expect(resume.summary).toContain('医疗健康');
    expect(resume.certifications).toEqual(expect.arrayContaining(['发明专利', '软件著作权']));
  });
});
