#!/usr/bin/env node
/**
 * 测试 PDF 导出功能
 */

const fs = require('fs');
const path = require('path');
const { generateResumePDF } = require('./dist/services/pdf-export');

// 测试用的简历数据
const testResume = {
  id: 'test-123',
  basicInfo: {
    name: '张三',
    phone: '13800138000',
    email: 'zhangsan@example.com',
    location: '北京市海淀区',
    website: 'www.zhangsan.com',
    github: 'github.com/zhangsan',
    linkedin: 'linkedin.com/in/zhangsan'
  },
  summary: '拥有5年软件开发经验，精通JavaScript、TypeScript等前端技术，熟悉React、Vue等框架，有丰富的项目经验。',
  workExperience: [
    {
      id: 'we-1',
      company: 'ABC科技有限公司',
      position: '高级前端工程师',
      startDate: '2020-03',
      endDate: '2023-06',
      isCurrent: false,
      location: '北京市朝阳区',
      description: [
        '负责公司产品的前端架构设计',
        '带领团队开发并维护多个项目',
        '优化前端性能，提升用户体验'
      ],
      achievements: [
        '提升网站加载速度50%',
        '减少代码维护成本30%'
      ]
    },
    {
      id: 'we-2',
      company: 'XYZ互联网公司',
      position: '前端开发工程师',
      startDate: '2018-07',
      endDate: '2020-02',
      isCurrent: false,
      location: '上海市浦东新区',
      description: [
        '参与产品需求分析和技术方案设计',
        '负责页面开发和功能实现',
        '与后端团队协作，完成接口对接'
      ],
      achievements: [
        '完成30+页面开发',
        '修复100+个bug'
      ]
    }
  ],
  projects: [
    {
      id: 'proj-1',
      name: '企业管理系统',
      role: '项目负责人',
      startDate: '2021-01',
      endDate: '2022-12',
      description: '一个基于React的企业管理系统，包含用户管理、权限管理、数据统计等功能',
      technologies: ['React', 'TypeScript', 'Ant Design', 'Node.js', 'MongoDB'],
      achievements: [
        '项目用户量达到1000+',
        '系统稳定性达到99.9%'
      ]
    },
    {
      id: 'proj-2',
      name: '电商平台',
      role: '前端开发',
      startDate: '2019-05',
      endDate: '2020-01',
      description: '一个电商平台的前端部分，包含商品展示、购物车、订单管理等功能',
      technologies: ['Vue.js', 'Element UI', 'Express', 'MySQL'],
      achievements: [
        '实现商品搜索功能',
        '优化购物车性能'
      ]
    }
  ],
  education: [
    {
      id: 'edu-1',
      school: '清华大学',
      degree: 'bachelor',
      major: '计算机科学与技术',
      startDate: '2014-09',
      endDate: '2018-06',
      gpa: '3.8'
    }
  ],
  skills: [
    {
      id: 'skill-1',
      name: 'JavaScript',
      category: 'programming-language',
      proficiency: 'expert',
      yearsOfExperience: 5
    },
    {
      id: 'skill-2',
      name: 'TypeScript',
      category: 'programming-language',
      proficiency: 'advanced',
      yearsOfExperience: 4
    },
    {
      id: 'skill-3',
      name: 'React',
      category: 'framework',
      proficiency: 'expert',
      yearsOfExperience: 3
    },
    {
      id: 'skill-4',
      name: 'Vue.js',
      category: 'framework',
      proficiency: 'intermediate',
      yearsOfExperience: 2
    },
    {
      id: 'skill-5',
      name: 'Node.js',
      category: 'programming-language',
      proficiency: 'advanced',
      yearsOfExperience: 3
    },
    {
      id: 'skill-6',
      name: 'MongoDB',
      category: 'database',
      proficiency: 'intermediate',
      yearsOfExperience: 2
    },
    {
      id: 'skill-7',
      name: '沟通能力',
      category: 'soft-skill',
      proficiency: 'advanced',
      yearsOfExperience: 5
    },
    {
      id: 'skill-8',
      name: '团队协作',
      category: 'soft-skill',
      proficiency: 'expert',
      yearsOfExperience: 5
    }
  ],
  certifications: [
    'AWS Certified Developer',
    'PMP项目管理师'
  ],
  languages: [
    '中文（母语）',
    '英语（CET-6）'
  ]
};

async function testPDFExport() {
  console.log('开始测试 PDF 导出功能...');

  try {
    // 创建输出目录
    const outputDir = path.join(__dirname, 'test-output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 测试现代模板
    console.log('测试现代模板...');
    const pdfBuffer1 = await generateResumePDF({
      resume: testResume,
      template: 'modern',
      filename: 'resume-modern.pdf'
    });
    fs.writeFileSync(path.join(outputDir, 'resume-modern.pdf'), pdfBuffer1);
    console.log('✅ 现代模板导出成功');

    // 测试经典模板
    console.log('测试经典模板...');
    const pdfBuffer2 = await generateResumePDF({
      resume: testResume,
      template: 'classic',
      filename: 'resume-classic.pdf'
    });
    fs.writeFileSync(path.join(outputDir, 'resume-classic.pdf'), pdfBuffer2);
    console.log('✅ 经典模板导出成功');

    // 测试简约模板
    console.log('测试简约模板...');
    const pdfBuffer3 = await generateResumePDF({
      resume: testResume,
      template: 'minimal',
      filename: 'resume-minimal.pdf'
    });
    fs.writeFileSync(path.join(outputDir, 'resume-minimal.pdf'), pdfBuffer3);
    console.log('✅ 简约模板导出成功');

    console.log('\n📄 PDF 文件已生成在:', outputDir);
    console.log('✅ 所有模板测试成功!');

  } catch (error) {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  }
}

testPDFExport();