const fs = require('fs');
let content = fs.readFileSync('src/services/resume-parser.ts', 'utf8');

// 使用索引替换
const startMarker = 'function parseEducation(text: string): Resume[\'education\'] {';
const startIndex = content.indexOf(startMarker);

if (startIndex === -1) {
  console.log('Could not find parseEducation function');
  process.exit(1);
}

// 找到函数结束位置
const endMarker = 'function parseSkills(text: string): Resume[\'skills\'] {';
const endIndex = content.indexOf(endMarker, startIndex);

if (endIndex === -1) {
  console.log('Could not find end of parseEducation function');
  process.exit(1);
}

const newFunction = `function parseEducation(text: string): Resume['education'] {
  const education: Resume['education'] = [];

  // 查找教育背景部分
  const eduSectionKeywords = ['教育背景', '教育经历', '学历', 'Education', 'Academic Background'];
  let eduSectionStart = -1;

  for (const keyword of eduSectionKeywords) {
    const index = text.indexOf(keyword);
    if (index !== -1) {
      eduSectionStart = index;
      break;
    }
  }

  const searchText = eduSectionStart !== -1
    ? text.substring(eduSectionStart, eduSectionStart + 3000)
    : text;

  // 匹配教育经历的正则表达式
  const eduPatterns = [
    /(.+?)\\s*(硕士 | 博士 | 本科 | 大专 | 学士|MBA)[,\\s]+(.+?)\\s+(\\d{4})\\s*[-.]?\\s*(\\d{4}|至今)/g,
    /(.+?)\\s*(硕士 | 博士 | 本科 | 大专 | 学士|MBA)[,\\s]+(\\d{4})\\s*[-.]?\\s*(\\d{4}|至今)/g,
    /(.+?)\\s*大学.*?(\\d{4})\\s*[-.]?\\s*(\\d{4})/g,
  ];

  const seenSchools = new Set<string>();

  for (const pattern of eduPatterns) {
    let match;
    while ((match = pattern.exec(searchText)) !== null) {
      let school = '', degree = '', major = '', startDate = '', endDate = '';

      if (match.length >= 5) {
        if (match[0].includes('大学')) {
          school = match[1]; startDate = match[2]; endDate = match[3];
        } else if (match[1].includes('硕士') || match[1].includes('博士') || match[1].includes('本科')) {
          school = match[1]; degree = match[2]; startDate = match[3]; endDate = match[4];
        } else {
          school = match[1]; degree = match[2]; major = match[3]; startDate = match[4]; endDate = match[5];
        }
      }

      const schoolKey = school.toLowerCase();
      if (school && !seenSchools.has(schoolKey)) {
        seenSchools.add(schoolKey);
        education.push({ id: generateId(), school: school.trim(), degree: degree.trim(), major: major.trim(), startDate, endDate, gpa: undefined });
      }
    }
  }

  return education;
}

`;

const newContent = content.substring(0, startIndex) + newFunction + content.substring(endIndex);

fs.writeFileSync('src/services/resume-parser.ts', newContent, 'utf8');
console.log('Successfully updated parseEducation function');
