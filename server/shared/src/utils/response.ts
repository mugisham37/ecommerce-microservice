import { ApiResponse, PaginatedResponse } from '../types';

export class ResponseBuilder {
  static success<T>(data?: T, message?: string): ApiResponse<T> {
    return {
      success: true,
      data,
      message,
    };
  }

  static error(error: string, code?: string, details?: any): ApiResponse {
    return {
      success: false,
      error,
      ...(code && { code }),
      ...(details && { details }),
    };
  }

  static validationError(errors: Record<string, string[]>): ApiResponse {
    return {
      success: false,
      error: 'Validation failed',
      errors,
    };
  }

  static paginated<T>(
    data: T[],
    page: number,
    limit: number,
    total: number
  ): PaginatedResponse<T> {
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext,
        hasPrev,
      },
    };
  }

  static created<T>(data: T, message: string = 'Resource created successfully'): ApiResponse<T> {
    return {
      success: true,
      data,
      message,
    };
  }

  static updated<T>(data: T, message: string = 'Resource updated successfully'): ApiResponse<T> {
    return {
      success: true,
      data,
      message,
    };
  }

  static deleted(message: string = 'Resource deleted successfully'): ApiResponse {
    return {
      success: true,
      message,
    };
  }

  static notFound(message: string = 'Resource not found'): ApiResponse {
    return {
      success: false,
      error: message,
    };
  }

  static unauthorized(message: string = 'Unauthorized access'): ApiResponse {
    return {
      success: false,
      error: message,
    };
  }

  static forbidden(message: string = 'Access forbidden'): ApiResponse {
    return {
      success: false,
      error: message,
    };
  }

  static conflict(message: string = 'Resource conflict'): ApiResponse {
    return {
      success: false,
      error: message,
    };
  }

  static rateLimited(message: string = 'Rate limit exceeded'): ApiResponse {
    return {
      success: false,
      error: message,
    };
  }

  static serverError(message: string = 'Internal server error'): ApiResponse {
    return {
      success: false,
      error: message,
    };
  }
}

// HTTP Status Code Constants
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Response helper functions
export const sendSuccess = (res: any, data?: any, message?: string, statusCode: number = HTTP_STATUS.OK) => {
  return res.status(statusCode).json(ResponseBuilder.success(data, message));
};

export const sendError = (res: any, error: string, statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR, details?: any) => {
  return res.status(statusCode).json(ResponseBuilder.error(error, undefined, details));
};

export const sendValidationError = (res: any, errors: Record<string, string[]>) => {
  return res.status(HTTP_STATUS.UNPROCESSABLE_ENTITY).json(ResponseBuilder.validationError(errors));
};

export const sendPaginated = (res: any, data: any[], page: number, limit: number, total: number) => {
  return res.status(HTTP_STATUS.OK).json(ResponseBuilder.paginated(data, page, limit, total));
};

export const sendCreated = (res: any, data: any, message?: string) => {
  return res.status(HTTP_STATUS.CREATED).json(ResponseBuilder.created(data, message));
};

export const sendUpdated = (res: any, data: any, message?: string) => {
  return res.status(HTTP_STATUS.OK).json(ResponseBuilder.updated(data, message));
};

export const sendDeleted = (res: any, message?: string) => {
  return res.status(HTTP_STATUS.NO_CONTENT).json(ResponseBuilder.deleted(message));
};

export const sendNotFound = (res: any, message?: string) => {
  return res.status(HTTP_STATUS.NOT_FOUND).json(ResponseBuilder.notFound(message));
};

export const sendUnauthorized = (res: any, message?: string) => {
  return res.status(HTTP_STATUS.UNAUTHORIZED).json(ResponseBuilder.unauthorized(message));
};

export const sendForbidden = (res: any, message?: string) => {
  return res.status(HTTP_STATUS.FORBIDDEN).json(ResponseBuilder.forbidden(message));
};

export const sendConflict = (res: any, message?: string) => {
  return res.status(HTTP_STATUS.CONFLICT).json(ResponseBuilder.conflict(message));
};

export const sendRateLimited = (res: any, message?: string) => {
  return res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json(ResponseBuilder.rateLimited(message));
};

export const sendServerError = (res: any, message?: string) => {
  return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(ResponseBuilder.serverError(message));
};

// Content-Type helpers
export const setJsonContentType = (res: any) => {
  res.setHeader('Content-Type', 'application/json');
};

export const setCorsHeaders = (res: any, origin?: string) => {
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
};

// Cache control helpers
export const setNoCache = (res: any) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
};

export const setCacheControl = (res: any, maxAge: number) => {
  res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
};

// Security headers
export const setSecurityHeaders = (res: any) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
};
