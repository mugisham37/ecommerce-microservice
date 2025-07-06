import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface CorsOptions {
  origin?: string | string[] | boolean | ((origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => void);
  methods?: string | string[];
  allowedHeaders?: string | string[];
  exposedHeaders?: string | string[];
  credentials?: boolean;
  maxAge?: number;
  preflightContinue?: boolean;
  optionsSuccessStatus?: number;
}

export const corsMiddleware = (options: CorsOptions = {}) => {
  const {
    origin = '*',
    methods = ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders = ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders = [],
    credentials = true,
    maxAge = 86400, // 24 hours
    preflightContinue = false,
    optionsSuccessStatus = 204,
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestOrigin = req.get('Origin');

      // Handle origin
      if (typeof origin === 'function') {
        origin(requestOrigin, (err, allow) => {
          if (err) {
            return next(err);
          }
          if (allow) {
            res.setHeader('Access-Control-Allow-Origin', requestOrigin || '*');
          }
          setCorsHeaders();
        });
      } else if (typeof origin === 'boolean') {
        if (origin) {
          res.setHeader('Access-Control-Allow-Origin', requestOrigin || '*');
        }
        setCorsHeaders();
      } else if (typeof origin === 'string') {
        res.setHeader('Access-Control-Allow-Origin', origin);
        setCorsHeaders();
      } else if (Array.isArray(origin)) {
        if (requestOrigin && origin.includes(requestOrigin)) {
          res.setHeader('Access-Control-Allow-Origin', requestOrigin);
        }
        setCorsHeaders();
      } else {
        setCorsHeaders();
      }

      function setCorsHeaders() {
        // Set methods
        if (methods) {
          const methodsHeader = Array.isArray(methods) ? methods.join(',') : methods;
          res.setHeader('Access-Control-Allow-Methods', methodsHeader);
        }

        // Set allowed headers
        if (allowedHeaders) {
          const headersHeader = Array.isArray(allowedHeaders) ? allowedHeaders.join(',') : allowedHeaders;
          res.setHeader('Access-Control-Allow-Headers', headersHeader);
        }

        // Set exposed headers
        if (exposedHeaders && exposedHeaders.length > 0) {
          const exposedHeader = Array.isArray(exposedHeaders) ? exposedHeaders.join(',') : exposedHeaders;
          res.setHeader('Access-Control-Expose-Headers', exposedHeader);
        }

        // Set credentials
        if (credentials) {
          res.setHeader('Access-Control-Allow-Credentials', 'true');
        }

        // Set max age for preflight requests
        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Max-Age', maxAge.toString());
          
          if (!preflightContinue) {
            res.status(optionsSuccessStatus).end();
            return;
          }
        }

        next();
      }
    } catch (error) {
      logger.error('CORS middleware error', { error, origin: req.get('Origin') });
      next(error);
    }
  };
};

// Predefined CORS configurations
export const corsConfigs = {
  // Development configuration - allows all origins
  development: {
    origin: true,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  },

  // Production configuration - restrictive
  production: {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);
      
      // Allow requests with no origin (mobile apps, etc.)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'), false);
      }
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  },

  // API-only configuration
  api: {
    origin: false,
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  },

  // Public API configuration
  publicApi: {
    origin: '*',
    credentials: false,
    methods: ['GET'],
    allowedHeaders: ['Content-Type'],
  },
};

// Dynamic CORS based on environment
export const dynamicCors = () => {
  const env = process.env.NODE_ENV || 'development';
  
  switch (env) {
    case 'production':
      return corsMiddleware(corsConfigs.production);
    case 'staging':
      return corsMiddleware({
        ...corsConfigs.production,
        origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
          const allowedOrigins = [
            ...(process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean),
            'http://localhost:3000',
            'http://localhost:3001',
          ];
          
          if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            callback(new Error('Not allowed by CORS'), false);
          }
        },
      });
    default:
      return corsMiddleware(corsConfigs.development);
  }
};

// CORS for specific routes
export const routeSpecificCors = (routeConfigs: Record<string, CorsOptions>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const route = req.route?.path || req.path;
    const config = routeConfigs[route];
    
    if (config) {
      return corsMiddleware(config)(req, res, next);
    }
    
    // Use default CORS if no specific config found
    return corsMiddleware()(req, res, next);
  };
};

// CORS preflight handler
export const handlePreflight = (req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'OPTIONS') {
    logger.debug('Handling CORS preflight request', {
      origin: req.get('Origin'),
      method: req.get('Access-Control-Request-Method'),
      headers: req.get('Access-Control-Request-Headers'),
    });
  }
  next();
};

// CORS error handler
export const corsErrorHandler = (error: any, req: Request, res: Response, next: NextFunction) => {
  if (error.message && error.message.includes('CORS')) {
    logger.warn('CORS error', {
      origin: req.get('Origin'),
      method: req.method,
      path: req.path,
      error: error.message,
    });
    
    return res.status(403).json({
      success: false,
      error: 'CORS policy violation',
      message: 'Origin not allowed',
    });
  }
  
  next(error);
};

// Security headers middleware (often used with CORS)
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Strict transport security (HTTPS only)
  if (req.secure || req.get('X-Forwarded-Proto') === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content security policy (basic)
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  
  next();
};

// CORS logging middleware
export const corsLogger = (req: Request, res: Response, next: NextFunction) => {
  const origin = req.get('Origin');
  const method = req.method;
  const path = req.path;
  
  if (origin) {
    logger.debug('CORS request', { origin, method, path });
  }
  
  next();
};

// Validate origin against whitelist
export const validateOrigin = (allowedOrigins: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.get('Origin');
    
    if (origin && !allowedOrigins.includes(origin)) {
      logger.warn('Blocked request from unauthorized origin', { origin, path: req.path });
      return res.status(403).json({
        success: false,
        error: 'Origin not allowed',
      });
    }
    
    next();
  };
};

// CORS configuration validator
export const validateCorsConfig = (config: CorsOptions): boolean => {
  try {
    // Validate origin
    if (config.origin !== undefined) {
      const validOriginTypes = ['string', 'boolean', 'function'];
      const originType = typeof config.origin;
      
      if (!validOriginTypes.includes(originType) && !Array.isArray(config.origin)) {
        return false;
      }
    }
    
    // Validate methods
    if (config.methods !== undefined) {
      if (typeof config.methods !== 'string' && !Array.isArray(config.methods)) {
        return false;
      }
    }
    
    // Validate headers
    if (config.allowedHeaders !== undefined) {
      if (typeof config.allowedHeaders !== 'string' && !Array.isArray(config.allowedHeaders)) {
        return false;
      }
    }
    
    return true;
  } catch (error) {
    logger.error('CORS config validation error', { error });
    return false;
  }
};
