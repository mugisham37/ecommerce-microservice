export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;
  public readonly details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    code?: string,
    details?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', details?: any) {
    super(message, 400, true, 'VALIDATION_ERROR', details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, true, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403, true, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, true, 'NOT_FOUND_ERROR');
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409, true, 'CONFLICT_ERROR');
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, true, 'RATE_LIMIT_ERROR');
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error') {
    super(message, 500, true, 'INTERNAL_SERVER_ERROR');
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service unavailable') {
    super(message, 503, true, 'SERVICE_UNAVAILABLE_ERROR');
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed') {
    super(message, 500, true, 'DATABASE_ERROR');
  }
}

export class ExternalServiceError extends AppError {
  constructor(message: string = 'External service error', service?: string) {
    super(message, 502, true, 'EXTERNAL_SERVICE_ERROR', { service });
  }
}

export class PaymentError extends AppError {
  constructor(message: string = 'Payment processing failed', provider?: string) {
    super(message, 402, true, 'PAYMENT_ERROR', { provider });
  }
}

export class InventoryError extends AppError {
  constructor(message: string = 'Insufficient inventory') {
    super(message, 409, true, 'INVENTORY_ERROR');
  }
}

export class FileUploadError extends AppError {
  constructor(message: string = 'File upload failed') {
    super(message, 400, true, 'FILE_UPLOAD_ERROR');
  }
}

export class EmailError extends AppError {
  constructor(message: string = 'Email sending failed') {
    super(message, 500, true, 'EMAIL_ERROR');
  }
}

export class SMSError extends AppError {
  constructor(message: string = 'SMS sending failed') {
    super(message, 500, true, 'SMS_ERROR');
  }
}

export class PushNotificationError extends AppError {
  constructor(message: string = 'Push notification failed') {
    super(message, 500, true, 'PUSH_NOTIFICATION_ERROR');
  }
}

// Error handling utilities
export const isOperationalError = (error: Error): boolean => {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
};

export const getErrorResponse = (error: AppError) => {
  return {
    success: false,
    error: error.message,
    code: error.code,
    statusCode: error.statusCode,
    ...(error.details && { details: error.details }),
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  };
};

export const handleAsyncError = (fn: Function) => {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Database error mapping
export const mapDatabaseError = (error: any): AppError => {
  // Prisma specific errors
  if (error.code === 'P2002') {
    return new ConflictError('Resource already exists');
  }
  if (error.code === 'P2025') {
    return new NotFoundError('Resource not found');
  }
  if (error.code === 'P2003') {
    return new ValidationError('Foreign key constraint failed');
  }
  if (error.code === 'P2014') {
    return new ValidationError('Invalid ID provided');
  }

  // Generic database errors
  if (error.name === 'SequelizeUniqueConstraintError') {
    return new ConflictError('Resource already exists');
  }
  if (error.name === 'SequelizeForeignKeyConstraintError') {
    return new ValidationError('Invalid reference provided');
  }
  if (error.name === 'SequelizeValidationError') {
    return new ValidationError('Validation failed', error.errors);
  }

  return new DatabaseError(error.message || 'Database operation failed');
};

// HTTP error mapping
export const mapHttpError = (statusCode: number, message?: string): AppError => {
  switch (statusCode) {
    case 400:
      return new ValidationError(message);
    case 401:
      return new AuthenticationError(message);
    case 403:
      return new AuthorizationError(message);
    case 404:
      return new NotFoundError(message);
    case 409:
      return new ConflictError(message);
    case 429:
      return new RateLimitError(message);
    case 502:
      return new ExternalServiceError(message);
    case 503:
      return new ServiceUnavailableError(message);
    default:
      return new InternalServerError(message);
  }
};

// Error logging helper
export const logError = (error: Error, context?: Record<string, any>) => {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    name: error.name,
    ...(error instanceof AppError && {
      statusCode: error.statusCode,
      code: error.code,
      isOperational: error.isOperational,
      details: error.details,
    }),
    ...context,
  };

  console.error('Application Error:', errorInfo);
};
