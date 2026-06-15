/**
 * 统一的技能词典与分类工具
 *
 * 这是 resume-parser / matching-engine / optimization-advisor 共享的唯一来源，
 * 避免之前 resume-parser.ts 内部 skillMap（135 条）与 categorizeSkill（18 条）重复且不一致的问题。
 */

import type { Resume } from '../types/resume';

export type SkillCategory = Resume['skills'][0]['category'];

/**
 * 技能名 → 分类 的词典。
 * 该词典合并了原 resume-parser.ts 的 skillMap 与 categorizeSkill 两个表，
 * 保留更全的版本（skillMap），并补充 categorizeSkill 中独有的条目。
 */
export const SKILL_CATALOG: Record<string, SkillCategory> = {
  // 编程语言
  'JavaScript': 'programming-language',
  'TypeScript': 'programming-language',
  'Python': 'programming-language',
  'Java': 'programming-language',
  'Go': 'programming-language',
  'Golang': 'programming-language',
  'Rust': 'programming-language',
  'C++': 'programming-language',
  'C#': 'programming-language',
  'PHP': 'programming-language',
  'Ruby': 'programming-language',
  'Swift': 'programming-language',
  'Kotlin': 'programming-language',
  'Scala': 'programming-language',
  'Lua': 'programming-language',
  'Shell': 'programming-language',
  'SQL': 'programming-language',
  'MATLAB': 'programming-language',
  'C语言': 'programming-language',
  'C/C++': 'programming-language',
  // 前端框架
  'React': 'framework',
  'Vue': 'framework',
  'Vue.js': 'framework',
  'Vue3': 'framework',
  'Angular': 'framework',
  'Svelte': 'framework',
  'Next.js': 'framework',
  'Nuxt.js': 'framework',
  'Node.js': 'framework',
  'Express': 'framework',
  'Koa': 'framework',
  'Nest.js': 'framework',
  'NestJS': 'framework',
  'Electron': 'framework',
  'React Native': 'framework',
  'Flutter': 'framework',
  'Uni-app': 'framework',
  'Taro': 'framework',
  // 后端框架
  'Spring': 'framework',
  'Spring Boot': 'framework',
  'Spring Cloud': 'framework',
  'Django': 'framework',
  'Flask': 'framework',
  'FastAPI': 'framework',
  'Gin': 'framework',
  'Echo': 'framework',
  'Laravel': 'framework',
  // 数据库
  'MySQL': 'database',
  'PostgreSQL': 'database',
  'MongoDB': 'database',
  'Redis': 'database',
  'Elasticsearch': 'database',
  'SQLite': 'database',
  'Oracle': 'database',
  'SQL Server': 'database',
  'ClickHouse': 'database',
  'InfluxDB': 'database',
  'Neo4j': 'database',
  // 工具
  'Git': 'tool',
  'Docker': 'tool',
  'Kubernetes': 'tool',
  'K8s': 'tool',
  'Jenkins': 'tool',
  'Linux': 'tool',
  'Nginx': 'tool',
  'Webpack': 'tool',
  'Vite': 'tool',
  'Babel': 'tool',
  'ESLint': 'tool',
  'Prettier': 'tool',
  'Jest': 'tool',
  'Mocha': 'tool',
  'Cypress': 'tool',
  'Prometheus': 'tool',
  'Grafana': 'tool',
  'Terraform': 'tool',
  'Ansible': 'tool',
  // 云服务
  'AWS': 'cloud',
  '阿里云': 'cloud',
  'Azure': 'cloud',
  'Google Cloud': 'cloud',
  'GCP': 'cloud',
  '腾讯云': 'cloud',
  '华为云': 'cloud',
  // 消息队列
  'Kafka': 'tool',
  'RabbitMQ': 'tool',
  // AI/ML
  'TensorFlow': 'framework',
  'PyTorch': 'framework',
  'OpenCV': 'framework',
  'SVM': 'framework',
  'AIoT': 'domain-knowledge',
  'MEMS': 'domain-knowledge',
  // 前端基础
  'HTML': 'programming-language',
  'CSS': 'programming-language',
  'SASS': 'tool',
  // API & 协议
  'GraphQL': 'tool',
  'gRPC': 'tool',
  'REST': 'tool',
  // 设计工具
  'Figma': 'tool',
  'Sketch': 'tool',
  'Excel': 'tool',
  'STM32': 'tool',
  'GD32': 'tool',
  'PCB设计': 'tool',
  '3D打印': 'tool',
  // 行业领域知识
  '医学信号处理': 'domain-knowledge',
  '医疗器械': 'domain-knowledge',
  '医疗健康': 'domain-knowledge',
  '生物医学工程': 'domain-knowledge',
  '智能硬件': 'domain-knowledge',
  // 软技能 / 产品
  '设计思维方法论': 'soft-skill',
  '用户调研': 'soft-skill',
  '用戶调研': 'soft-skill',
  '需求分析': 'soft-skill',
  '功能拆解': 'soft-skill',
  '竞品分析': 'soft-skill',
  '项目管理': 'soft-skill',
  '跨团队协作': 'soft-skill',
  'MVP': 'tool',
  'PRD': 'tool',
  // CI/CD
  'CI/CD': 'tool',
};

/**
 * 查询某个技能名对应的分类，未匹配时返回 'tool'（兜底）
 */
export function categorizeSkill(skill: string): SkillCategory {
  // 先精确匹配
  if (SKILL_CATALOG[skill]) {
    return SKILL_CATALOG[skill];
  }
  // 再做大小写不敏感匹配（常见于简历写法不统一）
  const lower = skill.toLowerCase();
  for (const [key, value] of Object.entries(SKILL_CATALOG)) {
    if (key.toLowerCase() === lower) {
      return value;
    }
  }
  return 'tool';
}

/**
 * 获取所有已知技能名，供正则构建使用
 */
export function getSkillNames(): string[] {
  return Object.keys(SKILL_CATALOG);
}
