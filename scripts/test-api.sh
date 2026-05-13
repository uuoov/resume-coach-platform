#!/bin/bash
# API 测试脚本

BASE_URL="http://localhost:3000"

echo "====================================="
echo "Resume Coach Platform API 测试"
echo "====================================="

# 1. 健康检查
echo -e "\n1. 健康检查..."
curl -s "$BASE_URL/health" | head -1

# 2. API 根路径
echo -e "\n\n2. API 信息..."
curl -s "$BASE_URL/api" | head -1

# 3. 测试简历解析（使用文本内容模拟）
echo -e "\n\n3. 测试简历解析..."
curl -s -X POST "$BASE_URL/api/resume/parse" \
  -H "Content-Type: application/json" \
  -d '{
    "filePath": "",
    "fileType": "pdf",
    "userId": "test123",
    "name": "测试简历"
  }' 2>&1 | head -20

# 4. 测试 JD 分析
echo -e "\n\n4. 测试 JD 分析..."
curl -s -X POST "$BASE_URL/api/jd/analyze" \
  -H "Content-Type: application/json" \
  -d '{
    "jobTitle": "高级 Java 工程师",
    "company": "阿里巴巴",
    "jdText": "岗位职责：\n1. 负责电商平台核心模块的设计和开发\n2. 精通 Java 编程，熟悉 Spring Boot、Spring Cloud 框架\n3. 熟悉 MySQL、Redis 等数据库\n4. 有分布式系统开发经验\n5. 能承受工作压力，适应快节奏工作环境\n\n任职要求：\n1. 计算机相关专业本科及以上学历\n2. 5 年以上 Java 开发经验\n3. 具备良好的沟通能力和团队协作精神",
    "userId": "test123"
  }' 2>&1 | head -30

echo -e "\n\n====================================="
echo "测试完成"
echo "====================================="
