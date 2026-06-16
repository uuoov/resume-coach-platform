/**
 * Mock 公司信息库（与 DB 解耦）
 *
 * 设计：
 * - 内置 5 家头部公司作为兜底数据
 * - 启动时 seedMockCompaniesToDb() 将其幂等写入 DB（若不存在）
 * - getMockCompany(name) 优先返回内置，找不到时退回通用模板
 * - DB 不可用时（如本地调试）仍可正常工作
 */

import type { CompanyInfo } from './company-info-service';
import { prismaAvailable } from './database';
import { createCompany, getCompanyByName } from '../repositories/company-repository';
import { logger } from '../utils/logger';

/**
 * 内置 Mock 公司
 */
export const MOCK_COMPANIES: CompanyInfo[] = [
  {
    name: '阿里巴巴',
    industry: '互联网/电商',
    size: '20000人以上',
    location: '杭州',
    website: 'https://www.alibaba.com',
    description:
      '阿里巴巴集团控股有限公司是以曾担任英语教师的马云为首的18人于1999年在浙江省杭州市创立的公司。',
    culture: {
      values: ['客户第一', '团队合作', '拥抱变化', '诚信', '激情', '敬业'],
      workStyle: '快节奏',
    },
    techStack: ['Java', 'Scala', 'Go', 'React', 'Node.js', 'Docker', 'Kubernetes'],
  },
  {
    name: '腾讯',
    industry: '互联网/科技',
    size: '20000人以上',
    location: '深圳',
    website: 'https://www.tencent.com',
    description:
      '深圳市腾讯计算机系统有限公司成立于1998年11月，由马化腾、张志东、许晨晔、陈一丹、曾李青五位创始人共同创立。',
    culture: {
      values: ['正直', '进取', '合作', '创新'],
      workStyle: '创新驱动',
    },
    techStack: ['C++', 'Java', 'Go', 'Python', 'Vue.js', 'Node.js', 'Docker'],
  },
  {
    name: '字节跳动',
    industry: '互联网/科技',
    size: '20000人以上',
    location: '北京',
    website: 'https://www.bytedance.com',
    description: '字节跳动成立于2012年3月，公司使命为 Inspire Creativity, Enrich Life。',
    culture: {
      values: ['追求极致', '务实敢为', '开放谦逊', '坦诚清晰', '始终创业', '多元兼容'],
      workStyle: '快速迭代',
    },
    techStack: ['Java', 'Go', 'Python', 'React', 'Node.js', 'Flutter', 'Kubernetes'],
  },
  {
    name: '华为',
    industry: '通信/科技',
    size: '100000人以上',
    location: '深圳',
    website: 'https://www.huawei.com',
    description: '华为技术有限公司是一家生产销售通信设备的民营通信科技公司。',
    culture: {
      values: ['以客户为中心', '以奋斗者为本', '长期艰苦奋斗', '坚持自我批判'],
      workStyle: '狼性文化',
    },
    techStack: ['Java', 'C++', 'Python', 'Go', 'Android', 'iOS', 'Docker'],
  },
  {
    name: '百度',
    industry: '互联网/科技',
    size: '20000人以上',
    location: '北京',
    website: 'https://www.baidu.com',
    description: '百度是拥有强大互联网基础的领先AI公司。',
    culture: {
      values: ['简单可依赖'],
      workStyle: '技术驱动',
    },
    techStack: ['Java', 'Python', 'Go', 'C++', 'React', 'Node.js', 'TensorFlow'],
  },
];

/**
 * 兜底返回：未命中的公司名生成一个通用模板
 */
export function getFallbackCompany(companyName: string): CompanyInfo {
  return {
    name: companyName,
    industry: '互联网',
    size: '500-2000人',
    location: '北京',
    website: '',
    description: `这是一家名为${companyName}的公司，主要从事互联网相关业务。`,
    culture: {
      values: ['创新', '协作', '共赢'],
      workStyle: '高效',
    },
    techStack: ['Java', 'Python', 'JavaScript'],
  };
}

/**
 * 内置 Mock 公司索引（按 name）
 */
const MOCK_INDEX = new Map<string, CompanyInfo>(
  MOCK_COMPANIES.map((c) => [c.name, c])
);

/**
 * 从内存获取 Mock 公司（命中返回真实 mock 数据，未命中返回兜底模板）
 */
export function getMockCompanyInfo(companyName: string): CompanyInfo {
  return MOCK_INDEX.get(companyName) || getFallbackCompany(companyName);
}

/**
 * 启动时将内置 Mock 公司 seed 到 DB（幂等）
 * - 若 DB 中已存在同名公司（任意 source），则跳过
 * - 否则以 source='mock' 写入
 */
export async function seedMockCompaniesToDb(): Promise<void> {
  if (!prismaAvailable) {
    return;
  }

  for (const company of MOCK_COMPANIES) {
    try {
      const existing = await getCompanyByName(company.name);
      if (existing) {
        continue;
      }

      await createCompany({
        ...company,
        source: 'mock',
      });
      logger.info('Mock 公司已 seed 到 DB', 'mock-companies', { name: company.name });
    } catch (err) {
      logger.warn('Mock 公司 seed 失败', 'mock-companies', {
        name: company.name,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

/**
 * 判断公司名是否为内置 Mock 公司
 */
export function isMockCompany(companyName: string): boolean {
  return MOCK_INDEX.has(companyName);
}
