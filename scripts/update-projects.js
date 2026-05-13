const fs = require('fs');
let content = fs.readFileSync('src/services/resume-parser.ts', 'utf8');

// 更新 parseProjects 函数
const oldProjects = `function parseProjects(text: string): Resume['projects'] {
  const projects: Resume['projects'] = [];

  // 简化实现
  const projectKeywords = ['项目经历', '项目经验', 'Project Experience', 'Key Projects'];

  return projects;
}`;

const newProjects = `/**
 * 解析项目经历
 */
function parseProjects(text: string): Resume['projects'] {
  const projects: Resume['projects'] = [];

  // 查找项目经历部分
  const projectSectionKeywords = ['项目经历', '项目经验', 'Project Experience', 'Key Projects', '代表性项目'];
  let projectSectionStart = -1;

  for (const keyword of projectSectionKeywords) {
    const index = text.indexOf(keyword);
    if (index !== -1) {
      projectSectionStart = index;
      break;
    }
  }

  if (projectSectionStart === -1) {
    return projects;
  }

  const projectSection = text.substring(projectSectionStart, projectSectionStart + 5000);
  const lines = projectSection.split('\\n').map(l => l.trim()).filter(l => l);

  let currentProject: Resume['projects'][0] | null = null;

  for (const line of lines) {
    // 跳过章节标题
    if (projectSectionKeywords.some(k => line.includes(k))) {
      continue;
    }

    // 检测项目名行
    const isProjectStart = (
      (line.includes('项目') || line.includes('系统') || line.includes('平台') || line.includes('App') || line.includes('网站')) &&
      line.length < 50 &&
      !line.startsWith('•') && !line.startsWith('-') && !line.startsWith('·')
    );

    if (isProjectStart) {
      if (currentProject) {
        projects.push(currentProject);
      }
      currentProject = {
        id: generateId(),
        name: line.split(/[（(]/)[0].trim(),
        role: '',
        startDate: '',
        endDate: '',
        description: '',
        technologies: [],
      };
    } else if (currentProject) {
      if (!currentProject.role && (line.includes('负责') || line.includes('担任'))) {
        currentProject.role = line.replace(/.*[:：]\\s*/, '');
      } else if (line.includes('技术栈') || line.includes('技术:')) {
        const techMatch = line.match(/[::：]\\s*(.+)/);
        if (techMatch) {
          currentProject.technologies = techMatch[1].split(/[,，、]/).map(t => t.trim()).filter(Boolean);
        }
      } else if (line.length > 2 && currentProject.description.length < 500) {
        currentProject.description += line + '\\n';
      }
    }
  }

  if (currentProject) {
    projects.push(currentProject);
  }

  return projects;
}`;

const replaced = content.replace(oldProjects, newProjects);

if (replaced !== content) {
  fs.writeFileSync('src/services/resume-parser.ts', replaced, 'utf8');
  console.log('Successfully updated parseProjects function');
} else {
  console.log('Pattern not found, trying alternative...');
  // 尝试找到并替换
  const startIdx = content.indexOf('function parseProjects(text: string)');
  if (startIdx !== -1) {
    const endIdx = content.indexOf('function parseSkills', startIdx);
    if (endIdx !== -1) {
      const before = content.substring(0, startIdx);
      const after = content.substring(endIdx);
      const newContent = before + newProjects + after;
      fs.writeFileSync('src/services/resume-parser.ts', newContent, 'utf8');
      console.log('Successfully updated parseProjects function (alternative method)');
    }
  }
}
