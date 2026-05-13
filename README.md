# Resume Coach Platform - 简历辅导平台

AI 驱动的简历优化平台，专注于**针对公司 + 岗位的定向简历优化**。

## 项目背景

市面上的简历工具大多只提供模板和简单优化，缺乏针对特定公司和岗位的深度定制。本平台通过 AI 技术，实现：

- **公司维度定制** - 分析公司背景、文化、技术栈
- **岗位维度定制** - 深度解析 JD，提取关键词和能力要求
- **一岗一版** - 为每个投递岗位生成定制化简历

## 核心功能

### 已完成功能 (MVP - 第一阶段)

- [x] 简历上传与解析 (PDF/Word) - 支持 AI 辅助结构化提取
- [x] JD 输入与解析 - DashScope API 集成
- [x] 匹配度分析 (5 维度) - 硬技能/经验/教育/软技能/行业
- [x] 优化建议生成 - 基于差距分析
- [x] 文件上传处理 - Multer 中间件
- [x] 数据库集成 - Prisma + PostgreSQL
- [x] 简历版本管理 - 支持一岗一版
- [x] 前端界面 - React + Vite + MUI (5 个核心页面)

### V1.0 功能 (第二阶段)

- [ ] 用户系统 - 注册/登录
- [ ] 公司信息自动查询
- [ ] PDF 导出
- [ ] 简历版本管理 UI

### V2.0 功能 (第三阶段)

- [ ] 模拟面试
- [ ] 投递追踪
- [ ] 智能提醒

## 技术栈

- **运行时**: Node.js 18+
- **语言**: TypeScript 5+
- **Web 框架**: Express
- **数据库**: PostgreSQL + Prisma ORM
- **AI**: 通义千问 (qwen-plus) - DashScope API
- **文档解析**: pdf-parse, mammoth
- **文件上传**: multer

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，填入 API Key
```

获取 API Key: https://dashscope.console.aliyun.com/

### 3. 初始化数据库

```bash
npx prisma generate
npx prisma db push
```

### 4. 运行开发服务器

**后端服务器:**
```bash
cd resume-coach-platform
npm run dev
```
服务器将在 `http://localhost:3000` 启动

**前端开发服务器:**
```bash
cd resume-coach-platform/frontend
npm run dev
```
前端将在 `http://localhost:5173` 启动

### 5. 构建生产版本

```bash
npm run build
npm start
```

## 项目结构

```
resume-coach-platform/
├── src/                            # 后端源码
│   ├── index.ts                    # 入口文件 + API 路由
│   ├── config/                     # 配置文件
│   ├── middleware/                  # Express 中间件
│   ├── services/                   # 业务服务
│   │   ├── resume-parser.ts        # 简历解析 (AI 辅助)
│   │   ├── jd-analyzer.ts          # JD 分析 (AI)
│   │   ├── matching-engine.ts      # 匹配度计算
│   │   ├── optimization-advisor.ts # 优化建议生成
│   │   ├── pdf-export.ts           # PDF 导出
│   │   ├── auth-service.ts         # 认证服务
│   │   ├── company-info-service.ts # 公司信息查询
│   │   └── database.ts             # 数据库服务
│   ├── repositories/               # 数据访问层
│   ├── utils/                      # 工具函数
│   └── types/                      # TypeScript 类型定义
├── frontend/                       # React 前端 (Vite + MUI)
│   ├── src/
│   │   ├── App.tsx                 # 主应用
│   │   ├── services/api.ts         # API 客户端
│   │   ├── components/             # 通用组件
│   │   └── pages/                  # 页面组件
│   └── package.json
├── scripts/                        # 测试与维护脚本
│   ├── test-api.js                 # API 集成测试
│   ├── test-auth.js                # 认证功能测试
│   ├── test-parse.js               # 解析 Bug 验证
│   ├── test-pdf-export.js          # PDF 导出测试
│   ├── update-parser.js            # 解析器更新脚本
│   ├── update-projects.js          # 项目数据更新
│   └── update-skills.js            # 技能数据更新
├── tests/                          # 单元/集成测试 (Jest)
├── prisma/                         # 数据库模型
├── docs/                           # 项目文档
├── nginx/                          # Nginx 配置
├── uploads/                        # 上传文件存储
├── DEPLOYMENT.md                   # 部署指南
├── DEV.md                          # 开发指南
├── Dockerfile                      # Docker 构建
├── docker-compose.yml              # Docker Compose
├── package.json
├── tsconfig.json
└── .env.example
```

## API 设计

### 核心接口

```bash
# 上传并解析简历
POST /api/resume/parse
Request: multipart/form-data (file: ResumeFile, userId?: string)
Response: { success: true, data: ParsedResume }

# JD 解析
POST /api/jd/analyze
Request: { jobTitle: string, company: string, jdText: string, userId?: string }
Response: { success: true, data: JDAnalysis }

# 匹配度分析
POST /api/match/calculate
Request: { resume: Resume, jdAnalysis: JDAnalysis, resumeId?: string, jdId?: string }
Response: { success: true, data: MatchResult }

# 获取优化建议
POST /api/optimize/suggest
Request: { resume: Resume, jdAnalysis: JDAnalysis, matchResult: MatchResult }
Response: { success: true, data: OptimizationSuggestion[] }

# 生成优化内容
POST /api/optimize/suggest (带 suggestionId 和 originalContent)
Response: { success: true, data: { optimizedContent: string } }
```

## 开发团队

根据任务类型分配的专业角色：

| 角色 | 职责 | 任务 |
|------|------|------|
| **Tech Lead** | 架构设计、代码审查 | 统筹 |
| **Backend Dev** | API、数据库 | 任务 3 |
| **AI Engineer** | DashScope 集成、Prompt | 任务 4 |
| **Frontend Dev A** | 核心页面 | 任务 5 |
| **Frontend Dev B** | 功能模块 | 任务 6 |
| **Full Stack/QA** | 文件处理、测试 | 任务 7 |

## 开发指南

详细开发和测试说明请参考 [DEV.md](./DEV.md)

## License

MIT
