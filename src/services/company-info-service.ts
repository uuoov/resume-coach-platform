/**
 * 公司信息查询服务
 * 提供公司信息的自动查询和获取功能
 */

import { getCompanyByName, createCompany, updateCompany } from '../repositories/company-repository';

/**
 * 公司信息类型定义
 */
export interface CompanyInfo {
  name: string;
  industry?: string;
  size?: string;
  location?: string;
  website?: string;
  description?: string;
  culture?: any;
  techStack?: string[];
}

/**
 * 从岗位描述中提取公司名称
 * @param jdText - 岗位描述文本
 */
export function extractCompanyNameFromJD(jdText: string): string | null {
  // 常见的公司名称提取模式
  const patterns = [
    // 模式1: "公司名称：" 或 "公司：" 后面的内容
    /公司名称[:：]\s*([^\n，。；;,]+)/,
    /公司[:：]\s*([^\n，。；;,]+)/,
    // 模式2: "关于[公司名称]"
    /关于\s*([^\n，。；;,()（）]+)/,
    // 模式3: "【公司名称】" 或 "〖公司名称〗"
    /【([^】]+)】/,
    /〖([^〗]+)〗/,
    // 模式4: "任职公司：" 或 "用人单位："
    /任职公司[:：]\s*([^\n，。；;,]+)/,
    /用人单位[:：]\s*([^\n，。；;,]+)/,
    // 模式5: "招聘"或"诚招"之前的公司名
    /^([^\n]*?)(?:招聘|诚招)/,
    // 模式6: "招聘"或"诚招"之前的公司名（带集团/科技/有限公司）
    /^([^\n]*?)(?:集团|科技|有限|公司|企业)/,
  ];

  for (const pattern of patterns) {
    const match = jdText.match(pattern);
    if (match && match[1]) {
      let companyName = match[1].trim();
      // 去除可能的前缀/后缀
      companyName = companyName.replace(/^[\s]*招聘|诚招|关于|公司|企业|集团|科技|有限|责任|任职|用人单位[:：\s]*|公司名称[:：\s]*/, '');
      companyName = companyName.replace(/(公司|集团|有限公司|股份有限公司|科技有限公司)$/, '');

      // 过滤掉太短的名称和通用词
      if (companyName.length > 1 && !['我们', '我司', '本公司', '该公司', '一家', '创新型', '互联网'].includes(companyName)) {
        return companyName;
      }
    }
  }

  // 如果没有匹配到，尝试从常见公司列表中查找
  const commonCompanies = ['阿里巴巴', '腾讯', '字节跳动', '华为', '百度', '美团', '京东', '拼多多', '小米'];
  for (const company of commonCompanies) {
    if (jdText.includes(company)) {
      return company;
    }
  }

  return null;
}

/**
 * 模拟公司信息查询 API
 * 在实际应用中，这里会调用真实的公司信息 API（如企查查、天眼查等）
 * @param companyName - 公司名称
 */
async function queryCompanyInfoFromAPI(companyName: string): Promise<CompanyInfo> {
  // 模拟 API 响应延迟
  await new Promise(resolve => setTimeout(resolve, 500));

  // 模拟公司信息数据
  const mockCompanies: Record<string, CompanyInfo> = {
    '阿里巴巴': {
      name: '阿里巴巴',
      industry: '互联网/电商',
      size: '20000人以上',
      location: '杭州',
      website: 'https://www.alibaba.com',
      description: '阿里巴巴集团控股有限公司是以曾担任英语教师的马云为首的18人于1999年在浙江省杭州市创立的公司。',
      culture: {
        values: ['客户第一', '团队合作', '拥抱变化', '诚信', '激情', '敬业'],
        workStyle: '快节奏'
      },
      techStack: ['Java', 'Scala', 'Go', 'React', 'Node.js', 'Docker', 'Kubernetes']
    },
    '腾讯': {
      name: '腾讯',
      industry: '互联网/科技',
      size: '20000人以上',
      location: '深圳',
      website: 'https://www.tencent.com',
      description: '深圳市腾讯计算机系统有限公司成立于1998年11月，由马化腾、张志东、许晨晔、陈一丹、曾李青五位创始人共同创立。',
      culture: {
        values: ['正直', '进取', '合作', '创新'],
        workStyle: '创新驱动'
      },
      techStack: ['C++', 'Java', 'Go', 'Python', 'Vue.js', 'Node.js', 'Docker']
    },
    '字节跳动': {
      name: '字节跳动',
      industry: '互联网/科技',
      size: '20000人以上',
      location: '北京',
      website: 'https://www.bytedance.com',
      description: '字节跳动成立于2012年3月，公司使命为Inspire Creativity, Enrich Life。',
      culture: {
        values: ['追求极致', '务实敢为', '开放谦逊', '坦诚清晰', '始终创业', '多元兼容'],
        workStyle: '快速迭代'
      },
      techStack: ['Java', 'Go', 'Python', 'React', 'Node.js', 'Flutter', 'Kubernetes']
    },
    '华为': {
      name: '华为',
      industry: '通信/科技',
      size: '100000人以上',
      location: '深圳',
      website: 'https://www.huawei.com',
      description: '华为技术有限公司是一家生产销售通信设备的民营通信科技公司。',
      culture: {
        values: ['以客户为中心', '以奋斗者为本', '长期艰苦奋斗', '坚持自我批判'],
        workStyle: '狼性文化'
      },
      techStack: ['Java', 'C++', 'Python', 'Go', 'Android', 'iOS', 'Docker']
    },
    '百度': {
      name: '百度',
      industry: '互联网/科技',
      size: '20000人以上',
      location: '北京',
      website: 'https://www.baidu.com',
      description: '百度是拥有强大互联网基础的领先AI公司。',
      culture: {
        values: ['简单可依赖'],
        workStyle: '技术驱动'
      },
      techStack: ['Java', 'Python', 'Go', 'C++', 'React', 'Node.js', 'TensorFlow']
    }
  };

  // 返回匹配的公司信息或默认信息
  if (mockCompanies[companyName]) {
    return mockCompanies[companyName];
  }

  return {
    name: companyName,
    industry: '互联网',
    size: '500-2000人',
    location: '北京',
    website: '',
    description: `这是一家名为${companyName}的公司，主要从事互联网相关业务。`,
    culture: {
      values: ['创新', '协作', '共赢'],
      workStyle: '高效'
    },
    techStack: ['Java', 'Python', 'JavaScript']
  };
}

/**
 * 获取公司信息（优先从数据库获取，不存在则查询API）
 * @param companyName - 公司名称
 */
export async function getCompanyInfo(companyName: string): Promise<CompanyInfo> {
  // 尝试从数据库获取
  try {
    const existingCompany = await getCompanyByName(companyName);
    if (existingCompany) {
      return {
        name: existingCompany.name,
        industry: existingCompany.industry ?? undefined,
        size: existingCompany.size ?? undefined,
        location: existingCompany.location ?? undefined,
        website: existingCompany.website ?? undefined,
        description: existingCompany.description ?? undefined,
        culture: existingCompany.culture ?? undefined,
        techStack: existingCompany.techStack,
      };
    }
  } catch (dbError) {
    console.warn('数据库查询失败，将尝试API查询:', dbError);
  }

  // 从API查询
  const companyInfo = await queryCompanyInfoFromAPI(companyName);

  // 尝试保存到数据库
  try {
    await createCompany(companyInfo);
  } catch (dbError) {
    console.warn('保存公司信息到数据库失败:', dbError);
  }

  return companyInfo;
}

/**
 * 更新公司信息
 * @param companyName - 公司名称
 * @param companyInfo - 公司信息
 */
export async function updateCompanyInfo(companyName: string, companyInfo: Partial<CompanyInfo>) {
  const existingCompany = await getCompanyByName(companyName);
  if (existingCompany) {
    return updateCompany(existingCompany.id, companyInfo);
  }

  return createCompany({ ...companyInfo, name: companyName } as CompanyInfo);
}

/**
 * 自动查询公司信息
 * @param jdText - 岗位描述文本
 */
export async function autoQueryCompanyInfo(jdText: string): Promise<CompanyInfo | null> {
  const companyName = extractCompanyNameFromJD(jdText);
  if (!companyName) {
    return null;
  }

  try {
    const companyInfo = await getCompanyInfo(companyName);
    return companyInfo;
  } catch (error) {
    console.error('自动查询公司信息失败:', error);
    return null;
  }
}
