# Resume Coach Platform - 生产部署指南

## 项目概述

Resume Coach Platform 是一个 AI 驱动的简历辅导平台，提供简历解析、JD 分析、匹配度计算和优化建议功能。

---

## 系统架构

```
                  ┌──────────────────────────┐
                  │    Nginx 反向代理          │
                  │    (SSL终止/静态资源/Gzip)  │
                  └──────────┬───────────────┘
                             │
                  ┌──────────▼───────────────┐
                  │   Express 应用 (Node.js)   │
                  │   - API 路由              │
                  │   - 文件上传              │
                  │   - Helmet/CORS/Compression│
                  │   - 结构化日志            │
                  └──────────┬───────────────┘
                             │
               ┌─────────────┼─────────────┐
               │                           │
    ┌──────────▼──────────┐     ┌──────────▼──────────┐
    │   PostgreSQL 15      │     │   Redis 7            │
    │   (Prisma ORM)       │     │   (缓存 / 会话)      │
    └─────────────────────┘     └─────────────────────┘
```

---

## 环境要求

| 资源       | 最低要求      | 推荐配置      |
|-----------|-------------|-------------|
| Docker    | 20.10+      | 24.0+       |
| Docker Compose | 2.0+ | 2.20+       |
| 内存       | 4 GB        | 8 GB        |
| CPU       | 2 核心       | 4 核心       |
| 磁盘       | 10 GB       | 50 GB       |
| Node.js   | 20 LTS      | 20 LTS      |

---

## 快速部署

### 1. 克隆项目

```bash
git clone <repository-url>
cd resume-coach-platform
```

### 2. 配置环境变量

```bash
cp .env.production .env
```

编辑 `.env`，设置以下**必填**变量：

```env
# AI 配置（默认推荐 DeepSeek）
DEEPSEEK_API_KEY=your_deepseek_api_key_here
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat

# 数据库配置
DB_USER=resume_user
DB_PASSWORD=your_secure_password_here
DB_NAME=resume_coach

# 安全配置
JWT_SECRET=your_secure_jwt_secret_here

# 域名配置
CORS_ORIGIN=https://yourdomain.com
```

### 3. 构建和启动

```bash
# 构建并启动所有服务（后台运行）
npm run docker:up

# 查看日志
npm run docker:logs

# 检查健康状态
curl http://localhost:3000/health
```

### 4. 数据库迁移

```bash
# 执行 Prisma 迁移
docker exec resume-coach-app npx prisma migrate deploy
```

---

## Docker 命令参考

| 命令                      | 说明           |
|--------------------------|---------------|
| `npm run docker:build`   | 构建镜像       |
| `npm run docker:up`      | 启动服务       |
| `npm run docker:down`    | 停止服务       |
| `npm run docker:logs`    | 查看日志       |
| `npm run docker:prune`   | 清理资源       |

---

## 项目结构

```
resume-coach-platform/
├── src/                          # 后端源代码
│   ├── index.ts                  # 主入口 + API 路由
│   ├── config/                   # 配置模块
│   │   └── index.ts              # 集中配置导出
│   ├── services/                 # 业务服务层
│   │   ├── resume-parser.ts      # 简历解析
│   │   ├── jd-analyzer.ts        # JD 分析
│   │   ├── matching-engine.ts    # 匹配度计算
│   │   ├── optimization-advisor.ts # 优化建议
│   │   ├── auth-service.ts       # 认证服务
│   │   ├── company-info-service.ts # 公司信息服务
│   │   ├── pdf-export.ts         # PDF 导出
│   │   └── database.ts           # 数据库服务
│   ├── repositories/             # 数据访问层
│   ├── middleware/                # 中间件
│   │   ├── auth-middleware.ts     # 认证中间件
│   │   └── request-logger.ts     # 请求日志中间件
│   ├── utils/                    # 工具函数
│   │   ├── ai-client.ts          # AI 客户端
│   │   ├── logger.ts             # 结构化日志
│   │   └── monitor.ts            # 监控系统
│   └── types/                    # TypeScript 类型
├── frontend/                     # React 前端项目
├── prisma/                       # 数据库 Schema
├── nginx/                        # Nginx 配置
│   └── nginx.conf                # 反向代理配置
├── Dockerfile                    # 多阶段构建镜像
├── docker-compose.yml            # 容器编排
├── .env.production               # 生产环境变量
├── .env.example                  # 环境变量示例
└── package.json                  # 依赖配置
```

---

## 技术栈

| 类别         | 技术                              |
|-------------|----------------------------------|
| **后端**     | Node.js 20, Express, TypeScript   |
| **前端**     | React 19, Vite 8, MUI v7         |
| **数据库**   | PostgreSQL 15 + Prisma ORM       |
| **缓存**     | Redis 7                          |
| **AI**       | DeepSeek，兼容 DashScope / OpenAI API |
| **安全**     | Helmet, CORS, JWT, bcrypt        |
| **性能**     | Gzip compression, Nginx          |
| **监控**     | 自定义日志 + 指标收集              |
| **容器化**   | Docker, Docker Compose            |

---

## API 端点

| 端点                            | 方法   | 功能         | 认证  |
|--------------------------------|--------|------------|-------|
| `/health`                       | GET    | 健康检查     | 否    |
| `/metrics`                      | GET    | 监控指标     | 否    |
| `/api`                          | GET    | API 信息     | 否    |
| `/api/auth/register`            | POST   | 用户注册     | 否    |
| `/api/auth/login`               | POST   | 用户登录     | 否    |
| `/api/auth/me`                  | GET    | 当前用户     | 是    |
| `/api/resume/parse`             | POST   | 解析简历     | 否    |
| `/api/jd/analyze`               | POST   | 分析 JD      | 否    |
| `/api/match/calculate`          | POST   | 匹配度计算   | 否    |
| `/api/optimize/suggest`         | POST   | 优化建议     | 否    |
| `/api/resume/export-pdf`        | POST   | PDF 导出     | 否    |
| `/api/resume/preview-pdf`       | POST   | PDF 预览     | 否    |
| `/api/resume/:id/versions`      | GET    | 版本列表     | 否    |
| `/api/resume/:id/versions`      | POST   | 创建版本     | 否    |
| `/api/company/query`            | GET    | 公司查询     | 否    |
| `/api/company/auto-query`       | POST   | 自动查询     | 否    |

---

## 监控

### 健康检查

```bash
curl http://localhost:3000/health
```

返回示例：
```json
{
  "status": "healthy",
  "timestamp": "2026-03-20T10:00:00.000Z",
  "uptime": 3600,
  "version": "0.1.0",
  "checks": {
    "database": { "status": "ok" },
    "memory": { "status": "ok", "usage": 45.2 }
  }
}
```

### 应用指标

```bash
curl http://localhost:3000/metrics
```

返回示例：
```json
{
  "success": true,
  "data": {
    "requests": { "total": 1234, "perMinute": 20 },
    "errors": { "total": 5, "4xx": 3, "5xx": 2 },
    "performance": { "avgResponseTime": 120, "p95ResponseTime": 350 }
  }
}
```

---

## 日志系统

### 日志级别

| 级别    | 用途               |
|--------|-------------------|
| `debug` | 调试信息           |
| `info`  | 正常操作 (默认)    |
| `warn`  | 警告信息           |
| `error` | 错误信息           |
| `fatal` | 致命错误           |

### 日志格式

**生产环境**：JSON 结构化日志
```json
{
  "timestamp": "2026-03-20T10:00:00.000Z",
  "level": "info",
  "message": "GET /api 200 - 12ms",
  "context": "HTTP",
  "data": { "traceId": "abc-123", "statusCode": 200 }
}
```

### 配置

```env
LOG_LEVEL=info          # 日志级别
LOG_FILE_PATH=/app/logs # 日志文件路径
LOG_MAX_SIZE=10m        # 单文件大小限制
LOG_MAX_FILES=7d        # 保留天数
```

---

## 安全配置

### 已集成的安全措施

- **Helmet.js**: HTTP 安全头
- **CORS**: 跨域控制
- **Content Security Policy**: CSP 头
- **Rate Limiting**: 请求限制
- **JWT Authentication**: 身份认证
- **bcrypt**: 密码哈希
- **Non-root Docker user**: 容器安全

### SSL/HTTPS 配置

```bash
# 创建证书目录
mkdir -p nginx/ssl

# 使用 Let's Encrypt (推荐)
certbot certonly --standalone -d yourdomain.com

# 或生成自签名证书 (测试用)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem
```

---

## 备份策略

### 数据库备份

```bash
# 手动备份
docker exec resume-coach-postgres \
  pg_dump -U resume_user resume_coach | gzip > backup-$(date +%Y%m%d).sql.gz

# 恢复备份
gunzip -c backup-20260320.sql.gz | \
  docker exec -i resume-coach-postgres psql -U resume_user resume_coach
```

### 自动备份 (Cron)

```bash
# 添加到 crontab
0 2 * * * /path/to/backup.sh >> /var/log/backup.log 2>&1
```

---

## 故障排查

### 服务无法启动

```bash
docker-compose logs app        # 查看应用日志
docker-compose logs postgres   # 查看数据库日志
docker-compose ps              # 查看容器状态
```

### 数据库连接失败

```bash
docker exec resume-coach-postgres pg_isready -U resume_user
```

### 内存不足

```bash
docker stats                   # 查看资源使用
```

### 服务重启

```bash
npm run docker:down && npm run docker:up
```

---

## 版本升级

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 重新构建
npm run docker:build

# 3. 执行数据库迁移
docker exec resume-coach-app npx prisma migrate deploy

# 4. 重启服务
npm run docker:down && npm run docker:up

# 5. 验证
curl http://localhost:3000/health
```

---

**最后更新**: 2026-03-20
**状态**: 生产环境配置完成
