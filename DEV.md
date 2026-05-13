# Resume Coach Platform - 开发和测试指南

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 到 `.env` 并配置：

```bash
# DeepSeek API 配置（默认推荐）
DEEPSEEK_API_KEY=your_deepseek_api_key_here
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat

# 可选：通义千问 API 配置
# DASHSCOPE_API_KEY=your_dashscope_api_key_here
# DASHSCOPE_MODEL=qwen-plus

# 数据库配置
DATABASE_URL="postgresql://user:password@localhost:5432/resume_coach?schema=public"

# 服务器配置
PORT=3000
NODE_ENV=development

# 文件存储
FILE_STORAGE_PATH=./uploads
```

**获取 API Key:**
- DeepSeek: 访问 https://platform.deepseek.com/ 创建 API Key
- DashScope: 访问 https://dashscope.console.aliyun.com/ 创建 API Key

### 3. 初始化数据库

```bash
# 生成 Prisma Client
npx prisma generate

# 创建数据库表
npx prisma db push
```

### 4. 启动开发服务器

```bash
npm run dev
```

服务器将在 `http://localhost:3000` 启动

---

## API 测试

### 健康检查

```bash
curl http://localhost:3000/health
```

### 1. 上传并解析简历

```bash
curl -X POST http://localhost:3000/api/resume/parse \
  -F "file=@/path/to/your/resume.pdf" \
  -F "userId=user123" \
  -F "name=我的简历"
```

### 2. 分析 JD

```bash
curl -X POST http://localhost:3000/api/jd/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "jobTitle": "高级 Java 工程师",
    "company": "阿里巴巴",
    "jdText": "岗位要求：...\n工作内容：...",
    "userId": "user123"
  }'
```

### 3. 计算匹配度

```bash
curl -X POST http://localhost:3000/api/match/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "resume": { ... },
    "jdAnalysis": { ... },
    "resumeId": "resume123",
    "jdId": "jd123"
  }'
```

### 4. 获取优化建议

```bash
curl -X POST http://localhost:3000/api/optimize/suggest \
  -H "Content-Type: application/json" \
  -d '{
    "resume": { ... },
    "jdAnalysis": { ... },
    "matchResult": { ... }
  }'
```

### 5. 生成优化后的内容

```bash
curl -X POST http://localhost:3000/api/optimize/suggest \
  -H "Content-Type: application/json" \
  -d '{
    "resume": { ... },
    "jdAnalysis": { ... },
    "matchResult": { ... },
    "suggestionId": "xxx",
    "originalContent": "原始工作内容"
  }'
```

---

## 运行测试

```bash
# 运行所有测试
npm test

# 运行单个测试文件
npx jest path/to/test.test.ts

# 带覆盖率测试
npm test -- --coverage
```

---

## 代码规范

```bash
# lint 检查
npm run lint

# lint 自动修复
npm run lint -- --fix
```

---

## 构建生产版本

```bash
# 编译 TypeScript
npm run build

# 启动生产服务器
npm start
```

---

## 常见问题

### Q: AI 调用失败，提示 API Key 未配置
A: 默认使用 DeepSeek，确保 `.env` 文件存在且 `DEEPSEEK_API_KEY` 已正确配置。也可以改用 `DASHSCOPE_API_KEY` 或 `OPENAI_API_KEY`。

### Q: 数据库连接失败
A: 确保 PostgreSQL 服务已启动，且 `DATABASE_URL` 配置正确

### Q: 简历解析失败
A: 检查文件路径是否正确，文件格式是否支持（.pdf 或 .docx）

---

## 项目结构

```
resume-coach-platform/
├── src/                            # 后端源码
│   ├── index.ts                    # 主入口 + API 路由
│   ├── config/                     # 配置
│   ├── middleware/                  # Express 中间件
│   ├── services/                   # 业务服务
│   ├── repositories/               # 数据访问层
│   ├── utils/                      # 工具函数
│   └── types/                      # TypeScript 类型
├── frontend/                       # React 前端 (Vite + MUI)
├── scripts/                        # 测试与维护脚本
│   ├── test-api.js                 # API 集成测试
│   ├── test-auth.js                # 认证功能测试
│   ├── test-parse.js               # 解析 Bug 验证
│   └── ...                         # 其他维护脚本
├── tests/                          # 单元/集成测试 (Jest)
├── prisma/                         # 数据库模型
├── docs/                           # 项目文档
├── uploads/                        # 上传文件（临时）
├── .env.example                    # 环境变量示例
├── package.json
└── tsconfig.json
```

---

## 下一步

1. **前端开发**: 使用 React + Vite + MUI 构建用户界面
2. **用户系统**: 实现注册/登录功能
3. **PDF 导出**: 将优化后的简历导出为 PDF
4. **部署上线**: 配置 CI/CD，部署到云服务
