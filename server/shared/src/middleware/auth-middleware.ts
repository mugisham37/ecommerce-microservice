import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/auth';
import { AuthenticationError, AuthorizationError } from '../utils/errors';
import { logger } from '../utils/logger';
import { UserRole } from '../types';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: UserRole;
        iat?: number;
        exp?: number;
      };
    }
  }
}

export interface AuthMiddlewareOptions {
  required?: boolean;
  roles?: UserRole[];
  permissions?: string[];
}

export const authMiddleware = (options: AuthMiddlewareOptions = {}) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { required = true, roles = [], permissions = [] } = options;

      // Extract token from Authorization header
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

      // If token is not provided
      if (!token) {
        if (required) {
          throw new AuthenticationError('Access token is required');
        }
        return next();
      }

      // Verify token
      try {
        const decoded = verifyToken(token);
        req.user = decoded;

        logger.debug('User authenticated', {
          userId: decoded.id,
          email: decoded.email,
          role: decoded.role,
        });
      } catch (error) {
        throw new AuthenticationError('Invalid or expired token');
      }

      // Check role-based access
      if (roles.length > 0 && req.user) {
        if (!roles.includes(req.user.role)) {
          throw new AuthorizationError(`Access denied. Required roles: ${roles.join(', ')}`);
        }
      }

      // Check permission-based access (if implemented)
      if (permissions.length > 0 && req.user) {
        // This would typically check against a user permissions table
        // For now, we'll implement basic role-based permissions
        const hasPermission = await checkUserPermissions(req.user.id, permissions);
        if (!hasPermission) {
          throw new AuthorizationError(`Access denied. Required permissions: ${permissions.join(', ')}`);
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Helper function to check user permissions
async function checkUserPermissions(userId: string, permissions: string[]): Promise<boolean> {
  // This would typically query a database for user permissions
  // For now, return true as a placeholder
  // TODO: Implement actual permission checking logic
  return true;
}

// Convenience middleware for different access levels
export const requireAuth = authMiddleware({ required: true });

export const optionalAuth = authMiddleware({ required: false });

export const requireAdmin = authMiddleware({
  required: true,
  roles: [UserRole.ADMIN],
});

export const requireVendor = authMiddleware({
  required: true,
  roles: [UserRole.VENDOR, UserRole.ADMIN],
});

export const requireCustomer = authMiddleware({
  required: true,
  roles: [UserRole.CUSTOMER, UserRole.VENDOR, UserRole.ADMIN],
});

// API Key authentication middleware
export const apiKeyMiddleware = (validApiKeys: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const apiKey = req.headers['x-api-key'] as string;

      if (!apiKey) {
        throw new AuthenticationError('API key is required');
      }

      if (!validApiKeys.includes(apiKey)) {
        throw new AuthenticationError('Invalid API key');
      }

      logger.debug('API key authenticated', { apiKey: apiKey.slice(0, 8) + '...' });
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Service-to-service authentication middleware
export const serviceAuthMiddleware = (serviceName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const serviceToken = req.headers['x-service-token'] as string;
      const requestingService = req.headers['x-service-name'] as string;

      if (!serviceToken || !requestingService) {
        throw new AuthenticationError('Service authentication headers are required');
      }

      // Verify service token (this would typically be a JWT or shared secret)
      const expectedToken = process.env[`${requestingService.toUpperCase()}_SERVICE_TOKEN`];
      
      if (!expectedToken || serviceToken !== expectedToken) {
        throw new AuthenticationError('Invalid service token');
      }

      logger.debug('Service authenticated', {
        requestingService,
        targetService: serviceName,
      });

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Rate limiting by user
export const userRateLimitMiddleware = (maxRequests: number, windowMs: number) => {
  const userRequestCounts = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return next();
      }

      const userId = req.user.id;
      const now = Date.now();
      const userLimit = userRequestCounts.get(userId);

      if (!userLimit || now > userLimit.resetTime) {
        // Reset or initialize user limit
        userRequestCounts.set(userId, {
          count: 1,
          resetTime: now + windowMs,
        });
        return next();
      }

      if (userLimit.count >= maxRequests) {
        throw new AuthorizationError('Rate limit exceeded for user');
      }

      userLimit.count++;
      next();
    } catch (error) {
      next(error);
    }
  };
};

// IP-based rate limiting
export const ipRateLimitMiddleware = (maxRequests: number, windowMs: number) => {
  const ipRequestCounts = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
      const now = Date.now();
      const ipLimit = ipRequestCounts.get(clientIp);

      if (!ipLimit || now > ipLimit.resetTime) {
        // Reset or initialize IP limit
        ipRequestCounts.set(clientIp, {
          count: 1,
          resetTime: now + windowMs,
        });
        return next();
      }

      if (ipLimit.count >= maxRequests) {
        throw new AuthorizationError('Rate limit exceeded for IP address');
      }

      ipLimit.count++;
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Middleware to extract user context from various sources
export const userContextMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Try to get user from JWT token first
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (token) {
      try {
        const decoded = verifyToken(token);
        req.user = decoded;
      } catch (error) {
        // Token is invalid, but don't throw error - just continue without user context
        logger.debug('Invalid token in user context middleware', { error });
      }
    }

    // Try to get user from session (if using sessions)
    if (!req.user && req.session && (req.session as any).userId) {
      // This would typically fetch user from database
      // For now, we'll skip this implementation
    }

    // Try to get user from API key (if it's associated with a user)
    if (!req.user && req.headers['x-api-key']) {
      // This would typically look up the user associated with the API key
      // For now, we'll skip this implementation
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Middleware to ensure user owns the resource
export const resourceOwnershipMiddleware = (resourceIdParam: string = 'id') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }

      const resourceId = req.params[resourceIdParam];
      const userId = req.user.id;

      // For admin users, skip ownership check
      if (req.user.role === UserRole.ADMIN) {
        return next();
      }

      // This would typically check if the user owns the resource
      // The implementation would depend on the specific resource type
      // For now, we'll implement a basic check
      const ownsResource = await checkResourceOwnership(userId, resourceId, req.route?.path);

      if (!ownsResource) {
        throw new AuthorizationError('Access denied. You do not own this resource.');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Helper function to check resource ownership
async function checkResourceOwnership(userId: string, resourceId: string, resourceType?: string): Promise<boolean> {
  // This would typically query the database to check ownership
  // The implementation would depend on the specific resource type and database schema
  // For now, return true as a placeholder
  // TODO: Implement actual ownership checking logic
  return true;
}
