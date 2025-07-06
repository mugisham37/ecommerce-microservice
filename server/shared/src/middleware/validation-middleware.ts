import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';

export interface ValidationOptions {
  body?: z.ZodSchema;
  query?: z.ZodSchema;
  params?: z.ZodSchema;
  headers?: z.ZodSchema;
  stripUnknown?: boolean;
  abortEarly?: boolean;
}

export const validate = (options: ValidationOptions) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { body, query, params, headers, stripUnknown = true, abortEarly = false } = options;
      const errors: Record<string, string[]> = {};

      // Validate request body
      if (body && req.body) {
        try {
          req.body = body.parse(req.body);
        } catch (error) {
          if (error instanceof z.ZodError) {
            errors.body = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
          }
        }
      }

      // Validate query parameters
      if (query && req.query) {
        try {
          req.query = query.parse(req.query);
        } catch (error) {
          if (error instanceof z.ZodError) {
            errors.query = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
          }
        }
      }

      // Validate route parameters
      if (params && req.params) {
        try {
          req.params = params.parse(req.params);
        } catch (error) {
          if (error instanceof z.ZodError) {
            errors.params = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
          }
        }
      }

      // Validate headers
      if (headers && req.headers) {
        try {
          req.headers = headers.parse(req.headers);
        } catch (error) {
          if (error instanceof z.ZodError) {
            errors.headers = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
          }
        }
      }

      // If there are validation errors, throw ValidationError
      if (Object.keys(errors).length > 0) {
        logger.debug('Validation failed', { errors, url: req.url, method: req.method });
        throw new ValidationError('Request validation failed', errors);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Convenience validation middleware for common patterns
export const validateBody = (schema: z.ZodSchema) => validate({ body: schema });
export const validateQuery = (schema: z.ZodSchema) => validate({ query: schema });
export const validateParams = (schema: z.ZodSchema) => validate({ params: schema });
export const validateHeaders = (schema: z.ZodSchema) => validate({ headers: schema });

// Common validation schemas
export const commonSchemas = {
  id: z.object({
    id: z.string().uuid('Invalid ID format'),
  }),
  
  pagination: z.object({
    page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
    limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 10),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  }),

  search: z.object({
    q: z.string().min(1, 'Search query is required'),
    category: z.string().uuid().optional(),
    minPrice: z.string().optional().transform(val => val ? parseFloat(val) : undefined),
    maxPrice: z.string().optional().transform(val => val ? parseFloat(val) : undefined),
    inStock: z.string().optional().transform(val => val === 'true'),
  }),

  dateRange: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),
};

// File upload validation
export const validateFileUpload = (options: {
  maxSize?: number;
  allowedTypes?: string[];
  maxFiles?: number;
  required?: boolean;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const { maxSize = 5 * 1024 * 1024, allowedTypes = [], maxFiles = 1, required = false } = options;
      const files = req.files as Express.Multer.File[] | undefined;
      const file = req.file as Express.Multer.File | undefined;

      // Check if file is required
      if (required && !file && (!files || files.length === 0)) {
        throw new ValidationError('File upload is required');
      }

      // Validate single file
      if (file) {
        validateSingleFile(file, { maxSize, allowedTypes });
      }

      // Validate multiple files
      if (files && files.length > 0) {
        if (files.length > maxFiles) {
          throw new ValidationError(`Too many files. Maximum allowed: ${maxFiles}`);
        }

        files.forEach(f => validateSingleFile(f, { maxSize, allowedTypes }));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Helper function to validate a single file
function validateSingleFile(file: Express.Multer.File, options: { maxSize: number; allowedTypes: string[] }) {
  const { maxSize, allowedTypes } = options;

  // Check file size
  if (file.size > maxSize) {
    throw new ValidationError(`File size too large. Maximum allowed: ${maxSize} bytes`);
  }

  // Check file type
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
    throw new ValidationError(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`);
  }
}

// Sanitization middleware
export const sanitizeInput = (fields: string[] = []) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Sanitize body
      if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body, fields);
      }

      // Sanitize query
      if (req.query && typeof req.query === 'object') {
        req.query = sanitizeObject(req.query, fields);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Helper function to sanitize object
function sanitizeObject(obj: any, fields: string[]): any {
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, fields));
  }

  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (fields.length === 0 || fields.includes(key)) {
        if (typeof value === 'string') {
          // Basic HTML sanitization
          sanitized[key] = value
            .replace(/[<>]/g, '') // Remove < and >
            .trim(); // Remove leading/trailing whitespace
        } else {
          sanitized[key] = sanitizeObject(value, fields);
        }
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  return obj;
}

// Request size validation
export const validateRequestSize = (maxSize: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const contentLength = req.get('content-length');
      
      if (contentLength && parseInt(contentLength, 10) > maxSize) {
        throw new ValidationError(`Request too large. Maximum allowed: ${maxSize} bytes`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Content type validation
export const validateContentType = (allowedTypes: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const contentType = req.get('content-type');
      
      if (!contentType) {
        throw new ValidationError('Content-Type header is required');
      }

      const isAllowed = allowedTypes.some(type => contentType.includes(type));
      
      if (!isAllowed) {
        throw new ValidationError(`Invalid Content-Type. Allowed types: ${allowedTypes.join(', ')}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Custom validation middleware factory
export const customValidation = (validator: (req: Request) => Promise<void> | void) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await validator(req);
      next();
    } catch (error) {
      if (error instanceof Error) {
        next(new ValidationError(error.message));
      } else {
        next(new ValidationError('Custom validation failed'));
      }
    }
  };
};

// Conditional validation
export const conditionalValidation = (
  condition: (req: Request) => boolean,
  validation: ValidationOptions
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (condition(req)) {
      return validate(validation)(req, res, next);
    }
    next();
  };
};

// Validation error formatter
export const formatValidationErrors = (errors: z.ZodError): Record<string, string[]> => {
  const formatted: Record<string, string[]> = {};
  
  errors.errors.forEach(error => {
    const path = error.path.join('.');
    if (!formatted[path]) {
      formatted[path] = [];
    }
    formatted[path].push(error.message);
  });
  
  return formatted;
};
