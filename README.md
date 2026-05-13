# Resume Coach Platform

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

docker compose build
docker compose run --rm prisma-migrate
docker compose up -d
docker compose logs -f app
```

健康检查：

```bash
curl http://localhost:3000/health
```

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
- 优化建议
- AI Client 配置
- 公司信息接口

运行：

```bash
npm run lint
npm run build
npm test
```

## License

MIT
