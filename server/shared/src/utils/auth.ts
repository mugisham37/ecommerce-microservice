import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { AuthenticationError, AuthorizationError } from './errors';
import { UserRole } from '../types';

export interface JwtPayload {
  id: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// Password hashing
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
};

export const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

// JWT token generation
export const generateAccessToken = (payload: Omit<JwtPayload, 'iat' | 'exp'>): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'ecommerce-api',
    audience: 'ecommerce-client',
  });
};

export const generateRefreshToken = (payload: Omit<JwtPayload, 'iat' | 'exp'>): string => {
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
    issuer: 'ecommerce-api',
    audience: 'ecommerce-client',
  });
};

export const generateTokenPair = (payload: Omit<JwtPayload, 'iat' | 'exp'>): TokenPair => {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
};

// JWT token verification
export const verifyToken = (token: string): JwtPayload => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'ecommerce-api',
      audience: 'ecommerce-client',
    }) as JwtPayload;
    
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AuthenticationError('Token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AuthenticationError('Invalid token');
    }
    throw new AuthenticationError('Token verification failed');
  }
};

export const verifyRefreshToken = (token: string): JwtPayload => {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: 'ecommerce-api',
      audience: 'ecommerce-client',
    }) as JwtPayload;
    
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AuthenticationError('Refresh token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AuthenticationError('Invalid refresh token');
    }
    throw new AuthenticationError('Refresh token verification failed');
  }
};

// Token extraction from headers
export const extractTokenFromHeader = (authHeader?: string): string | null => {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
};

// Role-based access control
export const hasRole = (userRole: UserRole, requiredRoles: UserRole[]): boolean => {
  return requiredRoles.includes(userRole);
};

export const hasPermission = (userRole: UserRole, permission: string): boolean => {
  // Define role-based permissions
  const rolePermissions: Record<UserRole, string[]> = {
    [UserRole.ADMIN]: ['*'], // Admin has all permissions
    [UserRole.VENDOR]: [
      'products:read',
      'products:write',
      'products:delete',
      'orders:read',
      'inventory:read',
      'inventory:write',
    ],
    [UserRole.CUSTOMER]: [
      'products:read',
      'orders:read',
      'orders:write',
      'profile:read',
      'profile:write',
    ],
  };

  const userPermissions = rolePermissions[userRole] || [];
  
  // Admin has all permissions
  if (userPermissions.includes('*')) {
    return true;
  }
  
  return userPermissions.includes(permission);
};

// Password validation
export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Generate secure random tokens
export const generateSecureToken = (length: number = 32): string => {
  const crypto = require('crypto');
  return crypto.randomBytes(length).toString('hex');
};

// API Key generation and validation
export const generateApiKey = (): string => {
  const prefix = 'ek_'; // ecommerce key
  const randomPart = generateSecureToken(24);
  return `${prefix}${randomPart}`;
};

export const validateApiKey = (apiKey: string): boolean => {
  // Basic validation - starts with prefix and has correct length
  return apiKey.startsWith('ek_') && apiKey.length === 51;
};

// Session management
export interface SessionData {
  userId: string;
  email: string;
  role: UserRole;
  loginTime: Date;
  lastActivity: Date;
  ipAddress?: string;
  userAgent?: string;
}

export const createSessionToken = (sessionData: SessionData): string => {
  return jwt.sign(sessionData, JWT_SECRET, {
    expiresIn: '24h',
    issuer: 'ecommerce-api',
    audience: 'ecommerce-session',
  });
};

export const verifySessionToken = (token: string): SessionData => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'ecommerce-api',
      audience: 'ecommerce-session',
    }) as SessionData;
    
    return decoded;
  } catch (error) {
    throw new AuthenticationError('Invalid session token');
  }
};

// Two-factor authentication helpers
export const generateTOTPSecret = (): string => {
  const crypto = require('crypto');
  return crypto.randomBytes(20).toString('base32');
};

export const generateBackupCodes = (count: number = 10): string[] => {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    codes.push(generateSecureToken(4).toUpperCase());
  }
  return codes;
};

// Rate limiting helpers
export const createRateLimitKey = (identifier: string, action: string): string => {
  return `rate_limit:${action}:${identifier}`;
};

export const isRateLimited = async (
  redisClient: any,
  key: string,
  limit: number,
  windowMs: number
): Promise<{ limited: boolean; remaining: number; resetTime: number }> => {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  // Remove old entries
  await redisClient.zremrangebyscore(key, 0, windowStart);
  
  // Count current requests
  const currentCount = await redisClient.zcard(key);
  
  if (currentCount >= limit) {
    const oldestEntry = await redisClient.zrange(key, 0, 0, 'WITHSCORES');
    const resetTime = oldestEntry.length > 0 ? parseInt(oldestEntry[1]) + windowMs : now + windowMs;
    
    return {
      limited: true,
      remaining: 0,
      resetTime,
    };
  }
  
  // Add current request
  await redisClient.zadd(key, now, `${now}-${Math.random()}`);
  await redisClient.expire(key, Math.ceil(windowMs / 1000));
  
  return {
    limited: false,
    remaining: limit - currentCount - 1,
    resetTime: now + windowMs,
  };
};

// OAuth helpers
export interface OAuthProvider {
  name: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string[];
}

export const generateOAuthState = (): string => {
  return generateSecureToken(16);
};

export const validateOAuthState = (state: string, expectedState: string): boolean => {
  return state === expectedState;
};

// Audit logging
export interface AuditLog {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  success: boolean;
  details?: Record<string, any>;
}

export const createAuditLog = (data: Omit<AuditLog, 'timestamp'>): AuditLog => {
  return {
    ...data,
    timestamp: new Date(),
  };
};
