import { Request, Response, NextFunction } from 'express';
import { AppError, isOperationalError, getErrorResponse, logError } from '../utils/errors';
import { logger } from '../utils/logger';
import { HTTP_STATUS } from '../utils/response';

export interface ErrorHandlerOptions {
  includeStack?: boolean;
  logErrors?: boolean;
  customErrorMap?: Map<string, (error: Error) => AppError>;
}

export const errorHandler = (options: ErrorHandlerOptions = {}) => {
  const { includeStack = process.env.NODE_ENV === 'development', logErrors = true, customErrorMap } = options;

  return (error: Error, req: Request, res: Response, next: NextFunction) => {
    // If response was already sent, delegate to default Express error handler
    if (res.headersSent) {
      return next(error);
    }

    let appError: AppError;

    // Convert error to AppError if it's not already one
    if (error instanceof AppError) {
      appError = error;
    } else {
      // Check custom error mappings first
      if (customErrorMap) {
        for (const [errorType, mapper] of customErrorMap) {
          if (error.constructor.name === errorType || error.name === errorType) {
            appError = mapper(error);
            break;
          }
        }
      }

      // If no custom mapping found, create generic AppError
      if (!appError!) {
        appError = new AppError(
          error.message || 'Internal server error',
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          isOperationalError(error),
          error.name
        );
      }
    }

    // Log error if enabled
    if (logErrors) {
      logError(appError, {
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        userId: (req as any).user?.id,
      });
    }

    // Prepare error response
    const errorResponse = getErrorResponse(appError);

    // Include stack trace in development
    if (includeStack && process.env.NODE_ENV === 'development') {
      errorResponse.stack = appError.stack;
    }

    // Send error response
    res.status(appError.statusCode).json(errorResponse);
  };
};

// Async error wrapper
export const asyncErrorHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 Not Found handler
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new AppError(
    `Route ${req.method} ${req.originalUrl} not found`,
    HTTP_STATUS.NOT_FOUND,
    true,
    'ROUTE_NOT_FOUND'
  );
  next(error);
};

// Validation error handler
export const validationErrorHandler = (error: any, req: Request, res: Response, next: NextFunction) => {
  if (error.name === 'ValidationError' || error.code === 'VALIDATION_ERROR') {
    const validationError = new AppError(
      'Validation failed',
      HTTP_STATUS.BAD_REQUEST,
      true,
      'VALIDATION_ERROR',
      error.details || error.errors
    );
    return next(validationError);
  }
  next(error);
};

// Database error handler
export const databaseErrorHandler = (error: any, req: Request, res: Response, next: NextFunction) => {
  // Prisma errors
  if (error.code && error.code.startsWith('P')) {
    let message = 'Database operation failed';
    let statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;

    switch (error.code) {
      case 'P2002':
        message = 'Resource already exists';
        statusCode = HTTP_STATUS.CONFLICT;
        break;
      case 'P2025':
        message = 'Resource not found';
        statusCode = HTTP_STATUS.NOT_FOUND;
        break;
      case 'P2003':
        message = 'Foreign key constraint failed';
        statusCode = HTTP_STATUS.BAD_REQUEST;
        break;
      case 'P2014':
        message = 'Invalid ID provided';
        statusCode = HTTP_STATUS.BAD_REQUEST;
        break;
    }

    const dbError = new AppError(message, statusCode, true, 'DATABASE_ERROR', {
      code: error.code,
      meta: error.meta,
    });
    return next(dbError);
  }

  next(error);
};

// JWT error handler
export const jwtErrorHandler = (error: any, req: Request, res: Response, next: NextFunction) => {
  if (error.name === 'JsonWebTokenError') {
    const jwtError = new AppError(
      'Invalid token',
      HTTP_STATUS.UNAUTHORIZED,
      true,
      'INVALID_TOKEN'
    );
    return next(jwtError);
  }

  if (error.name === 'TokenExpiredError') {
    const expiredError = new AppError(
      'Token expired',
      HTTP_STATUS.UNAUTHORIZED,
      true,
      'TOKEN_EXPIRED'
    );
    return next(expiredError);
  }

  next(error);
};

// Rate limit error handler
export const rateLimitErrorHandler = (error: any, req: Request, res: Response, next: NextFunction) => {
  if (error.type === 'rate-limit') {
    const rateLimitError = new AppError(
      'Too many requests, please try again later',
      HTTP_STATUS.TOO_MANY_REQUESTS,
      true,
      'RATE_LIMIT_EXCEEDED',
      {
        retryAfter: error.retryAfter,
      }
    );
    return next(rateLimitError);
  }

  next(error);
};

// CORS error handler
export const corsErrorHandler = (error: any, req: Request, res: Response, next: NextFunction) => {
  if (error.message && error.message.includes('CORS')) {
    const corsError = new AppError(
      'CORS policy violation',
      HTTP_STATUS.FORBIDDEN,
      true,
      'CORS_ERROR'
    );
    return next(corsError);
  }

  next(error);
};

// File upload error handler
export const fileUploadErrorHandler = (error: any, req: Request, res: Response, next: NextFunction) => {
  if (error.code === 'LIMIT_FILE_SIZE') {
    const fileSizeError = new AppError(
      'File size too large',
      HTTP_STATUS.BAD_REQUEST,
      true,
      'FILE_SIZE_EXCEEDED',
      { maxSize: error.limit }
    );
    return next(fileSizeError);
  }

  if (error.code === 'LIMIT_FILE_COUNT') {
    const fileCountError = new AppError(
      'Too many files uploaded',
      HTTP_STATUS.BAD_REQUEST,
      true,
      'FILE_COUNT_EXCEEDED',
      { maxCount: error.limit }
    );
    return next(fileCountError);
  }

  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    const unexpectedFileError = new AppError(
      'Unexpected file field',
      HTTP_STATUS.BAD_REQUEST,
      true,
      'UNEXPECTED_FILE_FIELD',
      { fieldName: error.field }
    );
    return next(unexpectedFileError);
  }

  next(error);
};

// Combine all error handlers
export const setupErrorHandlers = (app: any, options: ErrorHandlerOptions = {}) => {
  // Specific error handlers (order matters)
  app.use(validationErrorHandler);
  app.use(databaseErrorHandler);
  app.use(jwtErrorHandler);
  app.use(rateLimitErrorHandler);
  app.use(corsErrorHandler);
  app.use(fileUploadErrorHandler);

  // 404 handler (should be after all routes)
  app.use(notFoundHandler);

  // General error handler (should be last)
  app.use(errorHandler(options));
};

// Error reporting service integration
export const reportError = async (error: AppError, context?: Record<string, any>) => {
  try {
    // This would integrate with error reporting services like Sentry, Bugsnag, etc.
    // For now, we'll just log the error
    logger.error('Error reported', {
      error: {
        message: error.message,
        stack: error.stack,
        code: error.code,
        statusCode: error.statusCode,
      },
      context,
    });

    // Example Sentry integration:
    // Sentry.captureException(error, { extra: context });

    // Example custom error reporting API:
    // await fetch('/api/errors', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ error, context }),
    // });
  } catch (reportingError) {
    logger.error('Failed to report error', { reportingError });
  }
};

// Health check error handler
export const healthCheckErrorHandler = (error: any, req: Request, res: Response, next: NextFunction) => {
  if (req.path.includes('/health')) {
    const healthError = new AppError(
      'Health check failed',
      HTTP_STATUS.SERVICE_UNAVAILABLE,
      true,
      'HEALTH_CHECK_FAILED',
      { service: error.service, details: error.message }
    );
    return next(healthError);
  }

  next(error);
};

// Graceful shutdown error handler
export const gracefulShutdownHandler = (server: any) => {
  const shutdown = (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    
    server.close((err: any) => {
      if (err) {
        logger.error('Error during server shutdown', { error: err });
        process.exit(1);
      }
      
      logger.info('Server closed successfully');
      process.exit(0);
    });

    // Force close after 30 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGUSR2', () => shutdown('SIGUSR2')); // For nodemon
};
