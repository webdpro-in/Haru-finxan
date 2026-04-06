/**
 * Error Logging and Monitoring Utility
 * Centralized logging for errors, warnings, and info messages
 */

export enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG'
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  stack?: string;
}

/**
 * Logger class for structured logging
 */
class Logger {
  private isDevelopment: boolean;
  
  constructor() {
    this.isDevelopment = process.env.NODE_ENV !== 'production';
  }
  
  /**
   * Format log entry
   */
  private formatLog(entry: LogEntry): string {
    const { level, message, timestamp, context, stack } = entry;
    
    let log = `[${timestamp}] ${level}: ${message}`;
    
    if (context && Object.keys(context).length > 0) {
      log += `\n  Context: ${JSON.stringify(context, null, 2)}`;
    }
    
    if (stack && this.isDevelopment) {
      log += `\n  Stack: ${stack}`;
    }
    
    return log;
  }
  
  /**
   * Log error
   */
  error(message: string, error?: Error, context?: Record<string, any>): void {
    const entry: LogEntry = {
      level: LogLevel.ERROR,
      message,
      timestamp: new Date().toISOString(),
      context,
      stack: error?.stack
    };
    
    console.error(this.formatLog(entry));
    
    // In production, send to monitoring service (e.g., Sentry, DataDog)
    if (!this.isDevelopment) {
      this.sendToMonitoring(entry);
    }
  }
  
  /**
   * Log warning
   */
  warn(message: string, context?: Record<string, any>): void {
    const entry: LogEntry = {
      level: LogLevel.WARN,
      message,
      timestamp: new Date().toISOString(),
      context
    };
    
    console.warn(this.formatLog(entry));
  }
  
  /**
   * Log info
   */
  info(message: string, context?: Record<string, any>): void {
    const entry: LogEntry = {
      level: LogLevel.INFO,
      message,
      timestamp: new Date().toISOString(),
      context
    };
    
    console.log(this.formatLog(entry));
  }
  
  /**
   * Log debug (only in development)
   */
  debug(message: string, context?: Record<string, any>): void {
    if (!this.isDevelopment) return;
    
    const entry: LogEntry = {
      level: LogLevel.DEBUG,
      message,
      timestamp: new Date().toISOString(),
      context
    };
    
    console.debug(this.formatLog(entry));
  }
  
  /**
   * Send logs to monitoring service
   * Placeholder for integration with services like Sentry, DataDog, etc.
   */
  private sendToMonitoring(entry: LogEntry): void {
    // TODO: Integrate with monitoring service
    // Example: Sentry.captureException(entry)
    // Example: DataDog.log(entry)
  }
}

// Export singleton instance
export const logger = new Logger();

/**
 * Error tracking metrics
 */
class ErrorMetrics {
  private errorCounts: Map<string, number> = new Map();
  private lastReset: Date = new Date();
  
  /**
   * Track error occurrence
   */
  track(errorType: string): void {
    const count = this.errorCounts.get(errorType) || 0;
    this.errorCounts.set(errorType, count + 1);
  }
  
  /**
   * Get error counts
   */
  getCounts(): Record<string, number> {
    return Object.fromEntries(this.errorCounts);
  }
  
  /**
   * Get error rate (errors per minute)
   */
  getErrorRate(): number {
    const totalErrors = Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0);
    const minutesSinceReset = (Date.now() - this.lastReset.getTime()) / 60000;
    return minutesSinceReset > 0 ? totalErrors / minutesSinceReset : 0;
  }
  
  /**
   * Reset metrics
   */
  reset(): void {
    this.errorCounts.clear();
    this.lastReset = new Date();
  }
  
  /**
   * Check if error rate is high (>5 errors/minute)
   */
  isHighErrorRate(): boolean {
    return this.getErrorRate() > 5;
  }
}

export const errorMetrics = new ErrorMetrics();

/**
 * Express error handler middleware
 */
export function errorHandler(err: any, req: any, res: any, next: any): void {
  // Track error
  errorMetrics.track(err.name || 'UnknownError');
  
  // Log error
  logger.error('Request error', err, {
    method: req.method,
    path: req.path,
    query: req.query,
    body: req.body,
    userId: req.user?.userId
  });
  
  // Send response
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;
  
  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
}

/**
 * Request logger middleware
 */
export function requestLogger(req: any, res: any, next: any): void {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    logger.info('Request completed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.userId
    });
  });
  
  next();
}

/**
 * Health check for monitoring
 */
export function getHealthStatus(): {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  errorRate: number;
  uptime: number;
} {
  const errorRate = errorMetrics.getErrorRate();
  
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  if (errorRate > 10) {
    status = 'unhealthy';
  } else if (errorRate > 5) {
    status = 'degraded';
  }
  
  return {
    status,
    timestamp: new Date().toISOString(),
    errorRate,
    uptime: process.uptime()
  };
}
