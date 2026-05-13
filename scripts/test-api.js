/**
 * API 测试脚本
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';

function request(method, path, data) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const body = data ? JSON.stringify(data) : '';

    const options = {
      hostname: url.hostname,
      port: url.port || 3000,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: JSON.parse(responseData),
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: responseData,
          });
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (body) {
      req.write(body);
    }
    req.end();
  });
}

async function runTests() {
  console.log('=====================================');
  console.log('Resume Coach Platform API 测试');
  console.log('=====================================\n');

  // 1. 健康检查
  console.log('1. 健康检查...');
  try {
    const result = await request('GET', '/health');
    console.log('   状态:', result.status);
    console.log('   响应:', JSON.stringify(result.data));
  } catch (e) {
    console.log('   失败:', e.message);
  }

  // 2. API 根路径
  console.log('\n2. API 信息...');
  try {
    const result = await request('GET', '/api');
    console.log('   状态:', result.status);
    console.log('   响应:', JSON.stringify(result.data, null, 2));
  } catch (e) {
    console.log('   失败:', e.message);
  }

  // 3. 测试 JD 分析
  console.log('\n3. 测试 JD 分析...');
  try {
    const result = await request('POST', '/api/jd/analyze', {
      jobTitle: '高级 Java 工程师',
      company: '阿里巴巴',
      jdText: `岗位职责：
1. 负责电商平台核心模块的设计和开发
2. 精通 Java 编程，熟悉 Spring Boot、Spring Cloud 框架
3. 熟悉 MySQL、Redis 等数据库
4. 有分布式系统开发经验
5. 能承受工作压力，适应快节奏工作环境

任职要求：
1. 计算机相关专业本科及以上学历
2. 5 年以上 Java 开发经验
3. 具备良好的沟通能力和团队协作精神`,
      userId: 'test123',
    });
    console.log('   状态:', result.status);
    console.log('   响应:', JSON.stringify(result.data, null, 2).substring(0, 500));
  } catch (e) {
    console.log('   失败:', e.message);
  }

  // 4. 测试简历解析（文件不存在，测试错误处理）
  console.log('\n4. 测试简历解析（错误处理）...');
  try {
    const result = await request('POST', '/api/resume/parse', {
      filePath: '/nonexistent/file.pdf',
      fileType: 'pdf',
      userId: 'test123',
      name: '测试简历',
    });
    console.log('   状态:', result.status);
    console.log('   响应:', JSON.stringify(result.data, null, 2));
  } catch (e) {
    console.log('   失败:', e.message);
  }

  // 5. 测试匹配度计算
  console.log('\n5. 测试匹配度计算...');
  try {
    const mockResume = {
      id: 'test-resume',
      basicInfo: { name: '张三' },
      workExperience: [],
      projects: [],
      education: [{ id: '1', school: '北京大学', degree: 'bachelor', major: '计算机', startDate: '2015', endDate: '2019' }],
      skills: [
        { id: '1', name: 'Java', category: 'programming-language', proficiency: 'advanced' },
        { id: '2', name: 'Spring Boot', category: 'framework', proficiency: 'intermediate' },
        { id: '3', name: 'MySQL', category: 'database', proficiency: 'intermediate' },
      ],
      summary: '热爱技术，有良好的学习能力',
    };

    const mockJDAnalysis = {
      jobTitle: '高级 Java 工程师',
      company: '阿里巴巴',
      hardSkills: [
        { name: 'Java', isRequired: true, importance: 'critical' },
        { name: 'Spring Boot', isRequired: true, importance: 'high' },
        { name: 'MySQL', isRequired: true, importance: 'medium' },
        { name: 'Redis', isRequired: false, importance: 'medium' },
      ],
      softSkills: ['沟通能力', '团队协作'],
      experience: { minYears: 3, industryPreference: ['互联网'] },
      education: { minDegree: 'bachelor', majorPreference: ['计算机'] },
      keywords: ['Java', 'Spring Boot', 'MySQL'],
      hiddenRequirements: [],
      rawText: '',
    };

    const result = await request('POST', '/api/match/calculate', {
      resume: mockResume,
      jdAnalysis: mockJDAnalysis,
      resumeId: 'resume-1',
      jdId: 'jd-1',
    });
    console.log('   状态:', result.status);
    console.log('   响应:', JSON.stringify(result.data, null, 2));
  } catch (e) {
    console.log('   失败:', e.message);
  }

  // 6. 测试优化建议生成
  console.log('\n6. 测试优化建议生成...');
  try {
    const mockResume = {
      id: 'test-resume',
      basicInfo: { name: '张三' },
      workExperience: [{
        id: '1',
        company: '某某公司',
        position: 'Java 工程师',
        startDate: '2020-01',
        endDate: '',
        isCurrent: true,
        description: ['负责电商平台开发'],
      }],
      projects: [],
      education: [{ id: '1', school: '北京大学', degree: 'bachelor', major: '计算机', startDate: '2015', endDate: '2019' }],
      skills: [
        { id: '1', name: 'Java', category: 'programming-language', proficiency: 'advanced' },
      ],
      summary: '热爱技术',
    };

    const mockJDAnalysis = {
      jobTitle: '高级 Java 工程师',
      company: '阿里巴巴',
      hardSkills: [
        { name: 'Java', isRequired: true, importance: 'critical' },
        { name: 'Redis', isRequired: true, importance: 'high' },
      ],
      softSkills: ['沟通能力', '团队协作'],
      experience: { minYears: 3, industryPreference: ['互联网'] },
      education: { minDegree: 'bachelor', majorPreference: ['计算机'] },
      keywords: ['Java', 'Redis'],
      hiddenRequirements: [{ type: 'work-pressure', description: '暗示加班', evidence: '能承受工作压力' }],
      rawText: '',
    };

    const mockMatchResult = {
      overallScore: 65,
      dimensions: {},
      strengths: [],
      gaps: [{ category: 'skill', item: 'Redis', matched: false, confidence: 0.95 }],
      risks: [],
    };

    const result = await request('POST', '/api/optimize/suggest', {
      resume: mockResume,
      jdAnalysis: mockJDAnalysis,
      matchResult: mockMatchResult,
    });
    console.log('   状态:', result.status);
    console.log('   建议数量:', result.data?.data?.length || 0);
    console.log('   响应:', JSON.stringify(result.data, null, 2).substring(0, 500));
  } catch (e) {
    console.log('   失败:', e.message);
  }

  console.log('\n=====================================');
  console.log('测试完成');
  console.log('=====================================');
}

runTests().catch(console.error);
