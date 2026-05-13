# 生产环境 Dockerfile

# 阶段 1: 构建前端
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# 复制前端依赖文件
COPY frontend/package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制前端代码
COPY frontend/ ./

# 构建生产版本
RUN npm run build

# 阶段 2: 构建后端
FROM node:20-alpine AS backend-builder

WORKDIR /app

# 复制后端依赖文件
COPY package*.json ./

# 安装依赖（包括开发依赖用于构建）
RUN npm ci

# 复制后端代码
COPY src/ ./src/
COPY prisma/ ./prisma/
COPY tsconfig.json ./

# 构建 TypeScript 代码
RUN npm run build

# 阶段 3: 生产镜像
FROM node:20-alpine AS production

WORKDIR /app

# 设置时区
RUN apk add --no-cache tzdata
ENV TZ=Asia/Shanghai

# 创建非 root 用户
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# 复制构建好的后端代码
COPY --from=backend-builder /app/dist ./dist
COPY --from=backend-builder /app/prisma ./prisma

# 复制构建好的前端代码
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 仅安装生产依赖
RUN npm ci --only=production

# 创建必要的目录并设置权限
RUN mkdir -p /app/uploads && chown -R appuser:appgroup /app

# 切换到非 root 用户
USER appuser

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# 启动命令
CMD ["npm", "run", "start"]