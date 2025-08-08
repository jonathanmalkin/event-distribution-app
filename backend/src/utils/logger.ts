/**
 * Enhanced Logging System with Structured Logging and Error Classification
 * Provides correlation IDs, error recovery suggestions, and monitoring integration
 */

import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';
import { Request, Response, NextFunction } from 'express';

// Log levels and their numeric priorities
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn', 
  INFO = 'info',
  DEBUG = 'debug'
}

// Error classification system
export enum ErrorCategory {
  DATABASE = 'database',
  VALIDATION = 'validation',
  EXTERNAL_API = 'external_api',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  SYSTEM = 'system',
  BUSINESS_LOGIC = 'business_logic',
  NETWORK = 'network'
}

// Structured log entry interface
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  correlationId?: string;
  userId?: string;
  requestId?: string;
  category?: ErrorCategory;
  metadata?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
    cause?: any;
  };
  context?: {
    method?: string;
    url?: string;
    userAgent?: string;
    ip?: string;
  };
  performance?: {
    duration?: number;
    memory?: number;
    cpu?: number;
  };
  recovery?: {
    suggestion: string;
    action: string;
    documentation?: string;
  };
}

// Error recovery suggestions mapping
const ERROR_RECOVERY_MAP: Record<string, { suggestion: string; action: string; documentation?: string }> = {
  // Database errors
  'ECONNREFUSED': {
    suggestion: 'Database connection refused. Check if PostgreSQL is running.',
    action: 'Verify database service status and connection parameters.',
    documentation: '/docs/database-setup#connection-issues'
  },
  'relation does not exist': {
    suggestion: 'Database table missing. Run migrations to create required tables.',
    action: 'Execute: npm run migrate:up',
    documentation: '/docs/database-setup#migrations'
  },
  'violates foreign key constraint': {
    suggestion: 'Referenced record does not exist. Check foreign key relationships.',
    action: 'Verify referenced IDs exist or use safe cleanup procedures.',
    documentation: '/docs/database-operations#foreign-keys'
  },
  
  // Validation errors
  'ValidationError': {
    suggestion: 'Request data validation failed. Check required fields and data types.',
    action: 'Review API documentation for correct field names and formats.',
    documentation: '/docs/api-reference'
  },
  
  // External API errors  
  'WordPress API error: 401': {
    suggestion: 'WordPress authentication failed. Check credentials and permissions.',
    action: 'Verify WORDPRESS_USERNAME and WORDPRESS_PASSWORD in environment.',
    documentation: '/docs/wordpress-integration#authentication'
  },
  'WordPress API error: 404': {
    suggestion: 'WordPress endpoint not found. Check site URL and plugin installation.',
    action: 'Verify WORDPRESS_SITE_URL and ensure The Events Calendar plugin is active.',
    documentation: '/docs/wordpress-integration#setup'
  },
  'OpenAI API error': {
    suggestion: 'OpenAI API request failed. Check API key and usage limits.',
    action: 'Verify OPENAI_API_KEY and check account billing status.',
    documentation: '/docs/ai-integration#troubleshooting'
  },
  
  // System errors
  'EADDRINUSE': {
    suggestion: 'Port already in use. Another server instance may be running.',
    action: 'Kill existing process or use a different port.',
    documentation: '/docs/development#port-conflicts'
  },
  'ENOMEM': {
    suggestion: 'Out of memory. Increase available memory or optimize resource usage.',
    action: 'Restart application or increase server memory allocation.',
    documentation: '/docs/deployment#memory-requirements'
  }
};

// Create Winston logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, correlationId, category, ...meta }) => {
          const correlation = correlationId ? `[${correlationId.slice(0, 8)}]` : '';
          const cat = category ? `[${category}]` : '';
          return `${timestamp} ${level}${correlation}${cat}: ${message} ${
            Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
          }`;
        })
      )
    }),
    
    // File transport for production
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      tailable: true
    }),
    
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      tailable: true
    })
  ],
  
  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' })
  ],
  
  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' })
  ]
});

/**
 * Enhanced Logger class with structured logging and error classification
 */
export class AppLogger {
  private correlationId: string;

  constructor(correlationId?: string) {
    this.correlationId = correlationId || uuidv4();
  }

  /**
   * Create a child logger with additional context
   */
  child(context: Partial<LogEntry>): AppLogger {
    const childLogger = new AppLogger(this.correlationId);
    Object.assign(childLogger, context);
    return childLogger;
  }

  /**
   * Log an info message
   */
  info(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, { metadata });
  }

  /**
   * Log a warning message
   */
  warn(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, { metadata });
  }

  /**
   * Log a debug message
   */
  debug(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, { metadata });
  }

  /**
   * Log an error with classification and recovery suggestions
   */
  error(
    message: string, 
    error?: Error, 
    category?: ErrorCategory,
    metadata?: Record<string, any>
  ): void {
    const errorInfo = error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: (error as any).code,
      cause: (error as any).cause
    } : undefined;

    const recovery = this.getRecoveryFromError(error || new Error(message));

    this.log(LogLevel.ERROR, message, {
      error: errorInfo,
      category,
      recovery,
      metadata
    });
  }

  /**
   * Log database-related errors with specific recovery suggestions
   */
  databaseError(message: string, error: Error, metadata?: Record<string, any>): void {
    this.error(message, error, ErrorCategory.DATABASE, {
      ...metadata,
      dbOperation: metadata?.operation,
      table: metadata?.table,
      query: metadata?.query
    });
  }

  /**
   * Log API validation errors
   */
  validationError(
    message: string, 
    validationErrors: any[], 
    metadata?: Record<string, any>
  ): void {
    this.error(message, undefined, ErrorCategory.VALIDATION, {
      validationErrors,
      ...metadata
    });
  }

  /**
   * Log external API errors (WordPress, OpenAI, etc.)
   */
  externalApiError(
    service: string,
    message: string, 
    error: Error, 
    metadata?: Record<string, any>
  ): void {
    this.error(message, error, ErrorCategory.EXTERNAL_API, {
      service,
      ...metadata
    });
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, options: Partial<LogEntry> = {}): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      correlationId: this.correlationId,
      ...options
    };

    logger.log(level, message, entry);

    // Emit metrics for monitoring (if enabled)
    if (process.env.ENABLE_METRICS === 'true') {
      this.emitMetrics(entry);
    }
  }

  /**
   * Get recovery suggestions based on error
   */
  private getRecoveryFromError(error: Error): LogEntry['recovery'] | undefined {
    const errorString = error.message || error.name;
    
    for (const [pattern, recovery] of Object.entries(ERROR_RECOVERY_MAP)) {
      if (errorString.includes(pattern)) {
        return recovery;
      }
    }

    // Generic recovery for unknown errors
    if (error.name === 'Error') {
      return {
        suggestion: 'An unexpected error occurred. Check logs for details.',
        action: 'Review error stack trace and contact support if needed.',
        documentation: '/docs/troubleshooting'
      };
    }

    return undefined;
  }

  /**
   * Emit metrics for monitoring systems
   */
  private emitMetrics(entry: LogEntry): void {
    // Could integrate with monitoring systems like:
    // - Prometheus metrics
    // - DataDog
    // - New Relic
    // - Custom monitoring endpoints
    
    console.log('METRIC:', {
      type: 'log_entry',
      level: entry.level,
      category: entry.category,
      timestamp: entry.timestamp,
      correlationId: entry.correlationId
    });
  }
}

/**
 * Request logging middleware
 */
export function requestLoggingMiddleware(
  req: Request & { logger?: AppLogger; correlationId?: string },
  res: Response,
  next: NextFunction
): void {
  const correlationId = req.headers['x-correlation-id'] as string || uuidv4();
  const startTime = Date.now();

  // Attach correlation ID to request
  req.correlationId = correlationId;
  req.logger = new AppLogger(correlationId);

  // Set correlation ID header in response
  res.setHeader('X-Correlation-ID', correlationId);

  // Log request start
  req.logger.info('Request started', {
    context: {
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress
    }
  });

  // Override res.end to log response
  const originalEnd = res.end.bind(res);
  res.end = function(chunk?: any, encoding?: any) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    
    req.logger!.info('Request completed', {
      context: {
        method: req.method,
        url: req.url,
        statusCode,
        userAgent: req.get('User-Agent'),
        ip: req.ip || req.connection.remoteAddress
      },
      performance: {
        duration,
        memory: process.memoryUsage().heapUsed
      }
    });

    originalEnd(chunk, encoding);
  };

  next();
}

/**
 * Error handling middleware
 */
export function errorLoggingMiddleware(
  error: Error,
  req: Request & { logger?: AppLogger },
  res: Response,
  next: NextFunction
): void {
  const logger = req.logger || new AppLogger();
  
  // Classify error
  let category = ErrorCategory.SYSTEM;
  if (error.name === 'ValidationError') category = ErrorCategory.VALIDATION;
  if (error.message.includes('database') || error.message.includes('postgres')) category = ErrorCategory.DATABASE;
  if (error.message.includes('WordPress') || error.message.includes('OpenAI')) category = ErrorCategory.EXTERNAL_API;

  logger.error('Request error', error, category, {
    context: {
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress
    }
  });

  next(error);
}

/**
 * Global logger instance
 */
export const appLogger = new AppLogger();

/**
 * Convenience function to create a logger with correlation ID
 */
export function createLogger(correlationId?: string): AppLogger {
  return new AppLogger(correlationId);
}

export default appLogger;