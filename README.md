# Resume Coach Platform

> 语言 / Languages: [中文](#resume-coach-platform) | [English](#english-version)

AI 驱动的简历辅导平台，用于根据目标公司和岗位 JD 生成定向匹配分析与简历优化建议。

它不是一个简历模板工具，而是一个“投递前诊断 + 一岗一版优化”工具：上传简历、输入 JD，系统会解析双方结构化信息，计算匹配度，指出差距，并给出可执行的优化建议。

## 功能特性

- 简历上传解析：支持 PDF 和 Word，提取基本信息、教育经历、工作经历、项目经历、技能等结构化数据。
- JD 智能分析：提取岗位硬技能、软技能、经验要求、学历要求和关键词。
- 匹配度计算：从硬技能、项目经验、教育背景、软技能、行业背景等维度评估适配度。
- 优化建议生成：按优先级输出可执行建议，支持 AI 重新润色内容。
- PDF 预览与导出：支持中文简历渲染、联系方式、日期、列表项和版式优化。
- 用户认证：注册、登录、JWT 鉴权，生产环境要求数据库持久化。
- 版本管理：支持为不同岗位创建简历版本。
- 公司信息查询：支持内置信息和可选企业信息 API 扩展。
- 监控接口：提供健康检查和基础运行指标。

## 技术栈

| 模块 | 技术 |
| --- | --- |
| 后端 | Node.js, Express, TypeScript |
| 前端 | React, Vite, MUI |
| 数据库 | PostgreSQL, Prisma ORM |
| AI 接入 | DeepSeek / DashScope / OpenAI-compatible API |
| 文件解析 | pdf-parse, mammoth |
| PDF 生成 | PDFKit |
| 测试 | Jest, Supertest |
| 部署 | Docker, Docker Compose, Nginx |

## 系统架构

```mermaid
flowchart LR
  Browser["Browser / React App"] --> API["Express API"]
  API --> Auth["JWT Auth"]
  API --> Parser["Resume Parser"]
  API --> Analyzer["JD Analyzer"]
  API --> Matcher["Matching Engine"]
  API --> Optimizer["Optimization Advisor"]
  API --> PDF["PDF Export"]
  API --> DB[("PostgreSQL")]
  API --> Files["Uploads / Object Storage"]
  Analyzer --> AI["AI Provider"]
  Optimizer --> AI
  Parser --> AI
```

## 演示效果 / Demo Preview

下面是内置 demo 测试的预期效果。示例会把一份 Full-stack 简历和目标 JD 进行匹配，输出整体匹配分、维度得分、优势项和差距项。

![Resume Coach Platform demo preview](./docs/assets/demo-preview.svg)

| 输入 | 预期效果 |
| --- | --- |
| 简历：Full-stack Engineer，具备 React、TypeScript、Node.js、PostgreSQL 和 SaaS 项目经历 | `overallScore >= 90`，技能匹配 `100`，行业匹配 `100` |
| JD：Senior Full-stack Engineer，要求 React、TypeScript、Node.js，偏好 PostgreSQL 和 SaaS 背景 | React 会被识别为优势项，不会被误判为技能差距 |

完整演示说明见 [docs/DEMO.md](./docs/DEMO.md)，可运行测试见 [tests/demo.matching.test.ts](./tests/demo.matching.test.ts)。

## 快速开始

### 环境要求

- Node.js 20+
- npm 10+
- PostgreSQL 14+，推荐 PostgreSQL 15
- 可选：Docker 与 Docker Compose

### 安装依赖

```bash
npm install
cd frontend
npm install
cd ..
```

### 配置环境变量

```bash
cp .env.example .env
```

最少需要配置：

```env
DATABASE_URL="postgresql://user:password@localhost:5432/resume_coach?schema=public"
JWT_SECRET=replace_with_a_long_random_secret

# 三选一：DeepSeek / DashScope / OpenAI-compatible
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
```

生产环境不要开启内存认证降级，不要提交 `.env`、`.env.local`、`.env.production`。

### 初始化数据库

```bash
npm run prisma:generate
npx prisma db push
```

生产环境建议使用迁移：

```bash
npm run prisma:migrate
```

### 启动开发环境

后端：

```bash
npm run dev
```

默认地址：

```txt
http://localhost:3001
```

前端：

```bash
cd frontend
npm run dev
```

默认地址：

```txt
http://localhost:5173
```

前端 API 地址可通过 `VITE_API_BASE_URL` 配置，例如：

```env
VITE_API_BASE_URL=http://localhost:3001/api
```

生产环境建议不设置 `VITE_API_BASE_URL`，前端会默认请求同源 `/api`，再由 Nginx/反向代理转发到后端，避免手机或微信浏览器误连 `localhost`。

## 常用命令

```bash
# 后端检查
npm run lint
npm run build
npm test

# 数据库
npm run prisma:generate
npm run prisma:migrate

# 前端
cd frontend
npm run lint
npm run build
```

## Demo 测试 / Demo Test

项目已新增一个可运行的 demo 测试：[tests/demo.matching.test.ts](./tests/demo.matching.test.ts)。它适合作为新贡献者的第一条验证路径：不依赖真实数据库，不调用外部 AI 服务，只用规则引擎验证“简历 + JD -> 匹配结果”的核心链路。

This repository includes a runnable demo test in [tests/demo.matching.test.ts](./tests/demo.matching.test.ts). It is a good first verification path for contributors: no real database, no external AI provider, and a focused check of the core `resume + JD -> match result` workflow.

运行单个 demo 测试 / Run only the demo test:

```bash
npx jest --runInBand --runTestsByPath tests/demo.matching.test.ts
```

运行全部测试 / Run the full test suite:

```bash
npm test
```

测试会验证 / The test verifies:

- 关闭 DeepSeek、DashScope、OpenAI 等外部 AI Key 后，会使用本地规则引擎。
- Full-stack 示例简历能匹配 React、TypeScript、Node.js、PostgreSQL 和 SaaS 背景要求。
- 输出包含高匹配分、技能优势项，并且不会把已具备的 React 标记为差距。

核心断言如下，完整示例见 [tests/demo.matching.test.ts](./tests/demo.matching.test.ts)：

Core assertions are shown below. See [tests/demo.matching.test.ts](./tests/demo.matching.test.ts) for the full sample data:

```ts
const result = await calculateMatch(demoResume, targetJD);

expect(result.aiPowered).toBe(false);
expect(result.overallScore).toBeGreaterThanOrEqual(90);
expect(result.dimensions.skill.score).toBe(100);
expect(result.dimensions.industry.score).toBe(100);
expect(result.strengths).toEqual(
  expect.arrayContaining([
    expect.objectContaining({ item: 'React', matched: true }),
  ])
);
expect(result.gaps).not.toEqual(
  expect.arrayContaining([
    expect.objectContaining({ item: 'React' }),
  ])
);
```

## API 概览

| Method | Endpoint | 说明 |
| --- | --- | --- |
| GET | `/health` | 健康检查 |
| GET | `/metrics` | 基础运行指标 |
| POST | `/api/auth/register` | 用户注册 |
| POST | `/api/auth/login` | 用户登录 |
| GET | `/api/auth/me` | 当前用户信息 |
| POST | `/api/resume/parse` | 上传并解析简历 |
| POST | `/api/resume/export-pdf` | 导出 PDF |
| POST | `/api/resume/preview-pdf` | 预览 PDF |
| GET | `/api/resume/:id/versions` | 简历版本列表 |
| POST | `/api/resume/:id/versions` | 创建简历版本 |
| GET | `/api/resume/version/:versionId` | 获取指定版本 |
| POST | `/api/resume/version/:versionId/revert` | 恢复指定版本 |
| POST | `/api/jd/analyze` | 分析 JD |
| POST | `/api/match/calculate` | 计算匹配度 |
| POST | `/api/optimize/suggest` | 生成优化建议 |
| GET | `/api/company/query` | 查询公司信息 |
| POST | `/api/company/auto-query` | 自动查询公司信息 |

## Docker 部署

项目内置 `Dockerfile` 和 `docker-compose.yml`，包含：

- PostgreSQL 15
- Redis 7
- Express 应用
- Nginx 反向代理
- Prisma 迁移服务

基础流程：

```bash
cp .env.example .env.production
# 编辑 .env.production，填写数据库密码、JWT_SECRET、AI API Key、CORS_ORIGIN 等

docker compose build --no-cache
docker compose run --rm prisma-migrate
docker compose up -d
docker compose logs -f app
```

健康检查：

```bash
curl http://localhost:8080/health
curl http://localhost:8080/api
```

默认 Web 入口是 `WEB_HTTP_PORT=8080`，前端和 API 使用同一个来源：页面走 `/`，接口走 `/api`。如果改成 80 端口，设置 `WEB_HTTP_PORT=80` 后重新 `docker compose up -d`。

### PDF 中文预览

PDF 预览和导出依赖容器内的中文字体。生产镜像会安装 `font-noto-cjk`，后端生成 PDF 时会显式注册 Noto CJK、微软雅黑、黑体等中文字体，避免浏览器预览中出现中文乱码、问号或方块。

如果服务器上仍看到 PDF 中文乱码，请优先确认没有复用旧镜像：

```bash
docker compose down
docker compose build --no-cache
docker compose up -d
```

然后检查 app 容器里是否存在 Noto CJK 字体：

```bash
docker compose exec app sh -lc "fc-list | grep -i 'Noto Sans CJK' | head"
```

如果应用日志出现 `Chinese PDF font not found, using Helvetica fallback`，说明容器内中文字体没有被找到，需要重新构建镜像，或根据容器里的实际字体路径补充 `src/services/pdf-export.ts` 中的 Linux 字体候选路径。

部署到公网时建议：

- 使用强密码和长随机 `JWT_SECRET`。
- 将 `CORS_ORIGIN` 设置为真实域名。
- 使用 HTTPS。
- 将 `uploads` 挂载到持久化磁盘，或迁移到 OSS/S3 等对象存储。
- 定期备份 PostgreSQL。

更多说明见 [DEPLOYMENT.md](./DEPLOYMENT.md)。

## 数据库要求

当前项目使用 PostgreSQL，Prisma schema 中使用了 `Json`、`Text` 和字符串数组字段，因此不建议直接切换到 MySQL。

推荐：

- PostgreSQL 15
- Prisma Client
- 生产环境执行 `prisma migrate deploy`
- 数据库账号具备迁移建表权限

## 项目结构

```txt
resume-coach-platform/
├── src/                    # Express 后端源码
│   ├── config/             # 环境配置
│   ├── middleware/         # 请求日志、认证等中间件
│   ├── repositories/       # 数据访问层
│   ├── routes/             # API 路由
│   ├── services/           # 简历解析、JD 分析、匹配、优化、PDF、认证
│   ├── types/              # TypeScript 类型
│   └── utils/              # AI Client、日志、监控等工具
├── frontend/               # React + Vite 前端
├── prisma/                 # Prisma schema
├── tests/                  # Jest 测试
├── docs/                   # 产品与 Prompt 文档
├── nginx/                  # Nginx 配置
├── uploads/                # 本地上传目录，实际文件不入库
├── Dockerfile
├── docker-compose.yml
└── DEPLOYMENT.md
```

## 安全说明

- 不要提交真实 `.env` 文件。
- 不要把 GitHub token、AI API Key、数据库密码写入 Git 配置或代码。
- 生产环境注册必须依赖 PostgreSQL 持久化，数据库不可用时注册会失败。
- 测试账号和内存认证仅用于本地测试，不应作为生产登录方案。
- 上传目录默认被 `.gitignore` 排除，只保留 `uploads/.gitkeep`。

## 测试状态

当前测试覆盖：

- API 基础路由
- 认证注册/登录/鉴权
- 简历解析
- JD 分析
- 匹配度计算
- Demo 匹配测试
- 优化建议
- AI Client 配置
- 公司信息接口

运行：

```bash
npm run lint
npm run build
npm test
```

## English Version

Resume Coach Platform is an AI-powered resume coaching platform for targeted job applications. It compares a candidate resume with a company-specific job description, calculates match scores, identifies gaps, and produces actionable optimization suggestions.

It is not a resume template generator. It is a pre-application diagnosis and one-resume-per-role optimization tool: upload a resume, enter a JD, and the system extracts structured data, evaluates fit, and recommends improvements.

### Features

- Resume parsing: supports PDF and Word files and extracts profile, education, work experience, projects, and skills.
- JD analysis: extracts hard skills, soft skills, experience requirements, education requirements, and keywords.
- Match scoring: evaluates fit across hard skills, project/work experience, education, soft skills, and industry background.
- Optimization advice: generates prioritized, actionable suggestions and can rewrite content through an AI provider.
- PDF preview and export: supports Chinese resume rendering, contact info, dates, lists, and layout tuning.
- Authentication: register, login, JWT auth, and PostgreSQL persistence for production.
- Resume versioning: create different resume versions for different job applications.
- Company information lookup: supports built-in data and optional company API integrations.
- Monitoring: provides health checks and basic runtime metrics.

### Tech Stack

| Module | Technology |
| --- | --- |
| Backend | Node.js, Express, TypeScript |
| Frontend | React, Vite, MUI |
| Database | PostgreSQL, Prisma ORM |
| AI Provider | DeepSeek / DashScope / OpenAI-compatible API |
| File Parsing | pdf-parse, mammoth |
| PDF Generation | PDFKit |
| Testing | Jest, Supertest |
| Deployment | Docker, Docker Compose, Nginx |

### Demo Preview

The bundled demo matches a sample full-stack resume against a target Senior Full-stack Engineer JD, then shows the expected match score, dimension scores, strengths, and gaps.

![Resume Coach Platform demo preview](./docs/assets/demo-preview.svg)

| Input | Expected result |
| --- | --- |
| Resume: Full-stack Engineer with React, TypeScript, Node.js, PostgreSQL, and SaaS project experience | `overallScore >= 90`, skill score `100`, industry score `100` |
| JD: Senior Full-stack Engineer requiring React, TypeScript, Node.js, with PostgreSQL and SaaS preferred | React is reported as a strength and is not reported as a skill gap |

See [docs/DEMO.md](./docs/DEMO.md) for the complete demo and [tests/demo.matching.test.ts](./tests/demo.matching.test.ts) for the runnable test.

### Quick Start

Requirements:

- Node.js 20+
- npm 10+
- PostgreSQL 14+, PostgreSQL 15 recommended
- Optional: Docker and Docker Compose

Install dependencies:

```bash
npm install
cd frontend
npm install
cd ..
```

Create an environment file:

```bash
cp .env.example .env
```

Minimum required variables:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/resume_coach?schema=public"
JWT_SECRET=replace_with_a_long_random_secret

# Choose one provider: DeepSeek / DashScope / OpenAI-compatible
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
```

Initialize the database:

```bash
npm run prisma:generate
npx prisma db push
```

Start the backend:

```bash
npm run dev
```

Default backend URL:

```txt
http://localhost:3001
```

Start the frontend:

```bash
cd frontend
npm run dev
```

Default frontend URL:

```txt
http://localhost:5173
```

### Demo Test

A runnable demo test is included at [tests/demo.matching.test.ts](./tests/demo.matching.test.ts). It verifies the matching engine with a sample full-stack resume and target JD, without requiring a real database or external AI provider.

Run the demo test:

```bash
npx jest --runInBand --runTestsByPath tests/demo.matching.test.ts
```

Run the full test suite:

```bash
npm test
```

### Common Commands

```bash
# Backend checks
npm run lint
npm run build
npm test

# Database
npm run prisma:generate
npm run prisma:migrate

# Frontend
cd frontend
npm run lint
npm run build
```

### API Overview

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/health` | Health check |
| GET | `/metrics` | Basic runtime metrics |
| POST | `/api/auth/register` | Register a user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/resume/parse` | Upload and parse a resume |
| POST | `/api/resume/export-pdf` | Export resume PDF |
| POST | `/api/resume/preview-pdf` | Preview resume PDF |
| GET | `/api/resume/:id/versions` | List resume versions |
| POST | `/api/resume/:id/versions` | Create a resume version |
| GET | `/api/resume/version/:versionId` | Get a specific version |
| POST | `/api/resume/version/:versionId/revert` | Revert to a version |
| POST | `/api/jd/analyze` | Analyze a JD |
| POST | `/api/match/calculate` | Calculate match score |
| POST | `/api/optimize/suggest` | Generate optimization suggestions |
| GET | `/api/company/query` | Query company information |
| POST | `/api/company/auto-query` | Auto-query company information |

### Docker Deployment

The repository includes `Dockerfile` and `docker-compose.yml` with PostgreSQL 15, Redis 7, the Express app, Nginx reverse proxy, and a Prisma migration service.

```bash
cp .env.example .env.production
# Edit .env.production and configure database password, JWT_SECRET, AI API key, CORS_ORIGIN, and other values.

docker compose build --no-cache
docker compose run --rm prisma-migrate
docker compose up -d
docker compose logs -f app
```

Health checks:

```bash
curl http://localhost:8080/health
curl http://localhost:8080/api
```

### Project Structure

```txt
resume-coach-platform/
├── src/                    # Express backend source
├── frontend/               # React + Vite frontend
├── prisma/                 # Prisma schema
├── tests/                  # Jest tests
├── docs/                   # Product and prompt docs
├── nginx/                  # Nginx config
├── uploads/                # Local upload directory
├── Dockerfile
├── docker-compose.yml
└── DEPLOYMENT.md
```

### Security

- Do not commit real `.env` files.
- Do not store GitHub tokens, AI API keys, or database passwords in code or Git config.
- Production registration must use PostgreSQL persistence.
- Test accounts and in-memory auth fallbacks are for local testing only.
- `uploads` is ignored by Git except for `uploads/.gitkeep`.

### Test Status

Current tests cover base API routes, authentication, resume parsing, JD analysis, matching, optimization suggestions, AI client configuration, company routes, and the demo matching test.

## License

MIT
