# AI Prompt 模板系统

本文档包含简历辅导平台使用的所有 AI Prompt 模板。

---

## 1. JD 解析 Prompt 模板

### 基础版本

```
你是一位专业的招聘专家，请分析以下岗位描述：

岗位名称：{job_title}
公司名称：{company_name}

岗位描述：
{jd_text}

请输出以下结构化分析结果（JSON 格式）：

{
  "job_title": "岗位名称",
  "company": "公司名",
  "hard_skills": [
    {
      "name": "技能名",
      "isRequired": true,
      "importance": "high|medium|low|critical",
      "yearsRequired": 3,
      "context": "在什么场景下使用"
    }
  ],
  "soft_skills": ["沟通能力", "团队协作", "问题解决"],
  "experience": {
    "minYears": 3,
    "maxYears": 5,
    "industryPreference": ["互联网", "电商", "金融"],
    "companyTypePreference": ["startup|scaleup|enterprise|foreign|state-owned"]
  },
  "education": {
    "minDegree": "bachelor|master|phd|associate|high-school",
    "preferredDegree": "master",
    "majorPreference": ["计算机", "软件工程", "信息技术"],
    "schoolPreference": ["985", "211"]
  },
  "keywords": ["HR 筛选简历的关键词列表"],
  "hidden_requirements": [
    {
      "type": "work-pressure|fast-paced|leadership|independent|cross-functional|customer-facing|innovation|detail-oriented",
      "description": "暗示加班/快节奏等",
      "evidence": "原文依据"
    }
  ]
}

分析要求：
1. 硬技能按重要性排序，区分必需技能和加分技能
2. 识别隐性需求（如"能承受工作压力"暗示加班）
3. 提取 HR 筛选简历时的关键词
4. 注意中文语境下的特殊表达
```

### Few-Shot 示例

```
示例输入：
岗位名称：高级 Java 工程师
公司名称：某电商平台
岗位描述：
1. 负责电商平台核心模块的设计和开发
2. 精通 Java 编程，熟悉 Spring Boot、Spring Cloud 框架
3. 熟悉 MySQL、Redis 等数据库
4. 有分布式系统开发经验
5. 能承受工作压力，适应快节奏工作环境
6. 具备良好的沟通能力和团队协作精神

示例输出：
{
  "job_title": "高级 Java 工程师",
  "company": "某电商平台",
  "hard_skills": [
    {"name": "Java", "isRequired": true, "importance": "critical", "yearsRequired": 5},
    {"name": "Spring Boot", "isRequired": true, "importance": "high", "yearsRequired": 3},
    {"name": "Spring Cloud", "isRequired": true, "importance": "high"},
    {"name": "MySQL", "isRequired": true, "importance": "medium"},
    {"name": "Redis", "isRequired": true, "importance": "medium"},
    {"name": "分布式系统", "isRequired": true, "importance": "high"}
  ],
  "soft_skills": ["沟通能力", "团队协作", "抗压能力"],
  "experience": {
    "minYears": 5,
    "industryPreference": ["互联网", "电商"]
  },
  "education": {
    "minDegree": "bachelor",
    "majorPreference": ["计算机", "软件工程"]
  },
  "keywords": ["Java", "Spring Boot", "Spring Cloud", "分布式", "MySQL", "Redis"],
  "hidden_requirements": [
    {"type": "work-pressure", "description": "暗示加班", "evidence": "能承受工作压力"},
    {"type": "fast-paced", "description": "工作节奏快", "evidence": "适应快节奏工作环境"}
  ]
}
```

---

## 2. 匹配度分析 Prompt 模板

```
你是一位资深 HR 专家，请对比以下简历与岗位 JD 的匹配度：

【岗位要求】
{jd_analysis_json}

【候选人简历】
{resume_content}

请给出详细分析（JSON 格式）：

{
  "overall_score": 75,
  "dimensions": {
    "hard_skills": {
      "score": 80,
      "details": ["✓ Java - 5 年经验，匹配", "✗ Kubernetes - 未提及"]
    },
    "experience": {
      "score": 70,
      "details": ["工作年限 4 年，略低于要求的 5 年"]
    },
    "education": {
      "score": 90,
      "details": ["本科学历，计算机专业，匹配"]
    },
    "soft_skills": {
      "score": 60,
      "details": ["简历中体现了沟通能力，但未体现抗压能力"]
    },
    "industry": {
      "score": 80,
      "details": ["有电商行业经验"]
    }
  },
  "strengths": [
    {"category": "skill", "item": "Java", "confidence": 0.95},
    {"category": "experience", "item": "电商背景", "confidence": 0.9}
  ],
  "gaps": [
    {"category": "skill", "item": "Kubernetes", "confidence": 0.95},
    {"category": "skill", "item": "团队管理经验", "confidence": 0.8}
  ],
  "risks": [
    {
      "type": "skill-gap",
      "description": "缺少 K8s 经验",
      "severity": "medium",
      "suggestion": "在简历中突出容器化相关学习或项目经验"
    }
  ]
}

评分标准：
- 90-100: 非常匹配
- 75-89: 较为匹配
- 60-74: 基本匹配
- 40-59: 匹配度较低
- 0-39: 不匹配
```

---

## 3. 简历优化建议 Prompt 模板

```
基于以下信息，请给出具体的简历优化建议：

【公司背景】
{company_info}

【岗位分析】
{jd_analysis}

【匹配度分析】
{match_result}

【原始简历】
{resume_content}

请按优先级输出优化建议（JSON 格式）：

[
  {
    "id": "unique_id",
    "priority": "critical|high|medium|low",
    "category": "keyword-addition|content-rewrite|skill-reorder|quantification|culture-fit|format-fix|addition|removal",
    "section": "summary|work-experience|project|education|skills|overall",
    "title": "建议标题",
    "description": "详细描述",
    "current_content": "当前内容（可选）",
    "suggested_content": "建议修改为（可选）",
    "reason": "修改原因"
  }
]

优化原则：
1. 优先级定义：
   - critical: 必须修改，否则简历可能被直接过滤
   - high: 强烈建议修改，显著提升匹配度
   - medium: 建议修改，有一定提升
   - low: 可选优化，锦上添花

2. 建议要具体可操作，避免空泛
3. 保持真实，不建议虚构经历
4. 考虑公司文化匹配度
```

---

## 4. 简历改写 Prompt 模板

```
你是一位专业的简历优化顾问，请根据以下要求改写简历内容：

【原始内容】
{original_content}

【优化方向】
{optimization_goal}

【岗位要求】
{jd_requirements}

【公司类型】
company_type (startup|enterprise|foreign|etc.)

请生成优化后的内容，要求：
1. 自然融入 JD 关键词，但不生硬堆砌
2. 使用 STAR 法则（Situation, Task, Action, Result）描述经历
3. 量化成果，添加具体数据
4. 突出与岗位最相关的技能和经验
5. 保持真实，不夸大
6. 使用专业、简洁的语言
7. 符合中文简历的表达习惯

输出格式：
{
  "optimized_content": "优化后的内容",
  "changes_made": ["列出主要修改点"],
  "notes": "注意事项或说明"
}
```

### STAR 法则示例

```
原始描述：
- 负责电商平台开发

优化后：
- 主导电商平台核心模块开发，日均处理订单 10 万+，通过引入 Redis 缓存将响应时间从 500ms 降至 100ms，提升用户体验并支撑双 11 流量高峰
```

---

## 5. 公司信息查询 Prompt 模板

```
请分析以下公司的背景信息：

公司名称：{company_name}

请从以下维度分析（JSON 格式）：

{
  "name": "公司全称",
  "industry": "所属行业",
  "size": "公司规模（人数范围）",
  "stage": "发展阶段（天使轮 |A 轮 |...| 上市）",
  "culture": ["价值观关键词", "工作氛围特点"],
  "tech_stack": ["技术栈关键词"],
  "business": "主营业务描述",
  "competitors": ["主要竞争对手"],
  "recent_news": ["近期重要新闻"]
}

注意：如果信息不足，请说明需要从哪些渠道进一步查询
```

---

## 6. 求职信生成 Prompt 模板

```
请根据以下信息生成一封针对性的求职信：

【申请人信息】
{resume_summary}

【目标公司】
{company_info}

【目标岗位】
{job_title}

【岗位核心要求】
{jd_key_requirements}

【申请动机】
{motivation}

请生成一封专业的求职信，要求：
1. 开头：简洁说明申请的岗位
2. 主体：突出与岗位最匹配的 2-3 个核心优势
3. 结尾：表达面试意愿
4. 语气：专业、自信但不自大
5. 长度：300-500 字
6. 格式：正式商务信函格式
```

---

## 使用示例

### 完整流程调用

```typescript
// 1. JD 解析
const jdAnalysis = await callAI(JD_ANALYSIS_PROMPT, {
  job_title: '高级 Java 工程师',
  company: '某电商平台',
  jd_text: jdText
});

// 2. 匹配度分析
const matchResult = await callAI(MATCH_ANALYSIS_PROMPT, {
  jd_analysis_json: JSON.stringify(jdAnalysis),
  resume_content: resumeText
});

// 3. 优化建议
const suggestions = await callAI(OPTIMIZATION_PROMPT, {
  company_info: companyInfo,
  jd_analysis: JSON.stringify(jdAnalysis),
  match_result: JSON.stringify(matchResult),
  resume_content: resumeText
});

// 4. 简历改写
const optimizedResume = await callAI(RESUME_REWRITE_PROMPT, {
  original_content: resumeText,
  optimization_goal: suggestions,
  jd_requirements: jdAnalysis.hard_skills,
  company_type: 'enterprise'
});
```

---

## Prompt 优化技巧

1. **具体化**: 避免模糊描述，给出具体要求
2. **示例化**: 提供 few-shot 示例，让 AI 理解期望输出
3. **结构化**: 使用 JSON 等结构化格式，便于程序处理
4. **角色设定**: 给 AI 设定专业角色（如 HR 专家、简历顾问）
5. **边界限定**: 明确说明不做的事情，避免 AI 过度发挥
