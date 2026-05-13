/**
 * 生产环境日志系统
 *
 * 提供结构化日志、日志级别控制、文件轮转
 */

import * as fs from 'fs';
import * as path from 'path';

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  data?: Record<string, unknown>;
  traceId?: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

class Logger {
  private level: LogLevel;
  private logFilePath: string | null;
  private writeStream: fs.WriteStream | null = null;

  constructor() {
    this.level = (process.env.LOG_LEVEL as LogLevel) || 'info';
    this.logFilePath = process.env.LOG_FILE_PATH || null;

    if (this.logFilePath) {
      this.ensureLogDirectory();
      this.openWriteStream();
    }
  }

  private ensureLogDirectory(): void {
    if (this.logFilePath && !fs.existsSync(this.logFilePath)) {
      fs.mkdirSync(this.logFilePath, { recursive: true });
    }
  }

  private openWriteStream(): void {
    if (!this.logFilePath) return;

    const logFile = path.join(this.logFilePath, `app-${this.getDateString()}.log`);
    this.writeStream = fs.createWriteStream(logFile, { flags: 'a' });
  }

  private getDateString(): string {
    return new Date().toISOString().split('T')[0];
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  private formatEntry(entry: LogEntry): string {
    return JSON.stringify(entry);
  }

  private write(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) return;

    const formatted = this.formatEntry(entry);

    // 控制台输出（带颜色）
    const colors: Record<LogLevel, string> = {
      debug: '\x1b[36m',  // 青色
      info: '\x1b[32m',   // 绿色
      warn: '\x1b[33m',   // 黄色
      error: '\x1b[31m',  // 红色
      fatal: '\x1b[35m',  // 紫色
    };
    const reset = '\x1b[0m';
    const color = colors[entry.level];

    if (process.env.NODE_ENV === 'production') {
      // 生产环境：结构化 JSON 输出
      console.log(formatted);
    } else {
      // 开发环境：带颜色的友好输出
      console.log(
        `${color}[${entry.level.toUpperCase()}]${reset} ${entry.timestamp} ${entry.context ? `[${entry.context}]` : ''} ${entry.message}`,
        entry.data ? entry.data : ''
      );
    }

    // 写入日志文件
    if (this.writeStream) {
      this.writeStream.write(formatted + '\n');
    }
  }

  debug(message: string, context?: string, data?: Record<string, unknown>): void {
    this.write({
      timestamp: new Date().toISOString(),
      level: 'debug',
      message,
      context,
      data,
    });
  }

  info(message: string, context?: string, data?: Record<string, unknown>): void {
    this.write({
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      context,
      data,
    });
  }

  warn(message: string, context?: string, data?: Record<string, unknown>): void {
    this.write({
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      context,
      data,
    });
  }

  error(message: string, error?: Error, context?: string, data?: Record<string, unknown>): void {
    this.write({
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      context,
      data,
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : undefined,
    });
  }

  fatal(message: string, error?: Error, context?: string, data?: Record<string, unknown>): void {
    this.write({
      timestamp: new Date().toISOString(),
      level: 'fatal',
      message,
      context,
      data,
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : undefined,
    });
  }

  /**
   * 创建带有 HTTP 请求上下文的子日志器
   */
  withRequest(traceId: string, context?: string): RequestLogger {
    return new RequestLogger(this, traceId, context);
  }

  /**
   * 关闭日志写入流
   */
  close(): void {
    if (this.writeStream) {
      this.writeStream.end();
      this.writeStream = null;
    }
  }
}

class RequestLogger {
  constructor(
    private logger: Logger,
    private traceId: string,
    private context?: string
  ) {}

  debug(message: string, data?: Record<string, unknown>): void {
    this.logger.debug(message, this.context, { ...data, traceId: this.traceId });
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.logger.info(message, this.context, { ...data, traceId: this.traceId });
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.logger.warn(message, this.context, { ...data, traceId: this.traceId });
  }

  error(message: string, error?: Error, data?: Record<string, unknown>): void {
    this.logger.error(message, error, this.context, { ...data, traceId: this.traceId });
  }
}

// 全局单例
export const logger = new Logger();
export default logger;
