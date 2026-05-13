const fs = require('fs');
let content = fs.readFileSync('src/services/resume-parser.ts', 'utf8');

// 更新 parseSkills 函数
const oldSkills = `function parseSkills(text: string): Resume['skills'] {
  const skills: Resume['skills'] = [];

  // 匹配技能关键词
  const skillKeywords = [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust',
    'React', 'Vue', 'Angular', 'Node.js', 'Express',
    'MySQL', 'PostgreSQL', 'MongoDB', 'Redis',
    'Docker', 'Kubernetes', 'AWS', '阿里云',
  ];

  for (const keyword of skillKeywords) {
    if (text.includes(keyword)) {
      skills.push({
        id: generateId(),
        name: keyword,
        category: categorizeSkill(keyword),
        proficiency: 'intermediate',
      });
    }
  }

  return skills;
}`;

const newSkills = `/**
 * 解析技能清单
 */
function parseSkills(text: string): Resume['skills'] {
  const skills: Resume['skills'] = [];
  const seenSkills = new Set<string>();

  // 更全面的技能关键词列表
  const skillMap: Record<string, Resume['skills'][0]['category']> = {
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
    'Electron': 'framework',
    'React Native': 'framework',
    'Flutter': 'framework',
    'Uni-app': 'framework',
    'Taro': 'framework',
    // 后端框架
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
  };

  for (const [skillName, category] of Object.entries(skillMap)) {
    // 使用正则表达式匹配，避免部分匹配
    const escapeRegex = (str) => str.replace(/[.+*?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp('\\b' + escapeRegex(skillName) + '\\b', 'i');
    if (pattern.test(text) && !seenSkills.has(skillName.toLowerCase())) {
      seenSkills.add(skillName.toLowerCase());
      skills.push({
        id: generateId(),
        name: skillName,
        category,
        proficiency: 'intermediate',
        yearsOfExperience: undefined,
      });
    }
  }

  return skills;
}`;

const replaced = content.replace(oldSkills, newSkills);

if (replaced !== content) {
  fs.writeFileSync('src/services/resume-parser.ts', replaced, 'utf8');
  console.log('Successfully updated parseSkills function');
} else {
  console.log('Pattern not found, trying alternative...');
  const startIdx = content.indexOf('function parseSkills(text: string)');
  if (startIdx !== -1) {
    const endIdx = content.indexOf('function parseSummary', startIdx);
    if (endIdx !== -1) {
      const before = content.substring(0, startIdx);
      const after = content.substring(endIdx);
      const newContent = before + newSkills + after;
      fs.writeFileSync('src/services/resume-parser.ts', newContent, 'utf8');
      console.log('Successfully updated parseSkills function (alternative method)');
    }
  }
}
