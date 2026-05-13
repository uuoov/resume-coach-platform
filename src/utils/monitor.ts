/**
 * 生产环境监控系统
 *
 * 提供应用指标收集、健康检查、性能监控
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: {
      status: 'ok' | 'error';
      message?: string;
    };
    memory: {
      status: 'ok' | 'warning' | 'error';
      used: number;
      total: number;
      usage: number;
    };
    disk: {
      status: 'ok' | 'warning' | 'error';
      free: number;
      total: number;
      usage: number;
    };
  };
}

interface Metrics {
  requests: {
    total: number;
    perMinute: number;
    perSecond: number;
  };
  errors: {
    total: number;
    ['4xx']: number;
    ['5xx']: number;
  };
  performance: {
    avgResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
  };
  resources: {
    cpu: number;
    memory: number;
    disk: number;
  };
}

class MetricsCollector {
  private requestCount: number = 0;
  private errorCount: number = 0;
  private errors4xx: number = 0;
  private errors5xx: number = 0;
  private responseTimes: number[] = [];

  recordRequest(statusCode: number, durationMs: number): void {
    this.requestCount++;

    if (statusCode >= 400) {
      this.errorCount++;
      if (statusCode >= 500) {
        this.errors5xx++;
      } else {
        this.errors4xx++;
      }
    }

    this.responseTimes.push(durationMs);

    // 限制响应时间数组大小
    if (this.responseTimes.length > 10000) {
      this.responseTimes = this.responseTimes.slice(this.responseTimes.length - 10000);
    }
  }

  getMetrics(): Metrics {
    const uptime = process.uptime();

    const avgResponseTime = this.responseTimes.length > 0
      ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
      : 0;

    // 计算分位数
    const sorted = [...this.responseTimes].sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
    const p99 = sorted[Math.floor(sorted.length * 0.99)] || 0;

    return {
      requests: {
        total: this.requestCount,
        perMinute: Math.round(this.requestCount / (uptime / 60)),
        perSecond: Math.round(this.requestCount / uptime),
      },
      errors: {
        total: this.errorCount,
        ['4xx']: this.errors4xx,
        ['5xx']: this.errors5xx,
      },
      performance: {
        avgResponseTime,
        p95ResponseTime: p95,
        p99ResponseTime: p99,
      },
      resources: this.getResourceUsage(),
    };
  }

  private getResourceUsage(): Metrics['resources'] {
    const memUsage = process.memoryUsage();

    return {
      cpu: 0, // 需要系统资源监控库支持
      memory: memUsage.heapUsed / memUsage.heapTotal,
      disk: 0, // 需要系统资源监控库支持
    };
  }
}

class Monitor {
  private metrics: MetricsCollector;

  constructor() {
    this.metrics = new MetricsCollector();
  }

  recordRequest(statusCode: number, durationMs: number): void {
    this.metrics.recordRequest(statusCode, durationMs);
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const result: HealthCheckResult = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '0.0.0',
      checks: {
        database: {
          status: 'ok',
        },
        memory: this.getMemoryCheck(),
        disk: this.getDiskCheck(),
      },
    };

    // 数据库健康检查
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      result.status = 'unhealthy';
      result.checks.database.status = 'error';
      result.checks.database.message = error instanceof Error ? error.message : 'Unknown error';
    }

    return result;
  }

  getMetrics(): Metrics {
    return this.metrics.getMetrics();
  }

  private getMemoryCheck(): HealthCheckResult['checks']['memory'] {
    const memUsage = process.memoryUsage();
    const usage = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    let status: 'ok' | 'warning' | 'error';
    if (usage > 90) {
      status = 'error';
    } else if (usage > 80) {
      status = 'warning';
    } else {
      status = 'ok';
    }

    return {
      status,
      used: memUsage.heapUsed,
      total: memUsage.heapTotal,
      usage,
    };
  }

  private getDiskCheck(): HealthCheckResult['checks']['disk'] {
    // 简单的磁盘检查（需要系统权限）
    return {
      status: 'ok',
      free: 0,
      total: 0,
      usage: 0,
    };
  }
}

// 全局单例
export const monitor = new Monitor();
export default monitor;
