/**
 * CSRF (Cross-Site Request Forgery) Protection Middleware
 * 
 * Implements CSRF token generation and validation to prevent
 * unauthorized cross-site requests.
 * 
 * REQ-11.4: System SHALL validate all inputs (max length, SQL injection, XSS)
 * (Extended to include CSRF protection as part of comprehensive security)
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { redis } from '../config/redis.js';
import { logger } from '../utils/logger.js';
import { AuthRequest } from './auth.js';

/**
 * CSRF token configuration
 */
interface CSRFConfig {
  tokenLength: number; // Length of CSRF token in bytes
  tokenTTL: number; // Token time-to-live in seconds
  cookieName: string; // Name of CSRF cookie
  headerName: string; // Name of CSRF header
  excludeMethods: string[]; // HTTP methods to exclude from CSRF check
}

/**
 * Default CSRF configuration
 */
const DEFAULT_CONFIG: CSRFConfig = {
  tokenLength: 32,
  tokenTTL: 3600, // 1 hour
  cookieName: 'XSRF-TOKEN',
  headerName: 'X-XSRF-TOKEN',
  excludeMethods: ['GET', 'HEAD', 'OPTIONS'],
};

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCSRFToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Store CSRF token in Redis with TTL
 */
async function storeCSRFToken(
  identifier: string,
  token: string,
  ttl: number
): Promise<void> {
  const key = `csrf:${identifier}`;
  await redis.setex(key, ttl, token);
}

/**
 * Verify CSRF token from Redis
 */
async function verifyCSRFToken(
  identifier: string,
  token: string
): Promise<boolean> {
  const key = `csrf:${identifier}`;
  const storedToken = await redis.get(key);
  
  if (!storedToken) {
    return false;
  }
  
  // Use constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(storedToken),
    Buffer.from(token)
  );
}

/**
 * Get identifier for CSRF token (user ID or session ID)
 */
function getCSRFIdentifier(req: AuthRequest): string {
  // Prefer user ID for authenticated requests
  if (req.user?.userId) {
    return `user:${req.user.userId}`;
  }
  
  // Fall back to session ID if available
  if (req.session?.id) {
    return `session:${req.session.id}`;
  }
  
  // Fall back to IP address (less secure, but better than nothing)
  const ip = getClientIp(req);
  return `ip:${ip}`;
}

/**
 * Extract client IP address from request
 */
function getClientIp(req: Request): string {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    return ips.split(',')[0].trim();
  }
  
  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }
  
  return req.socket.remoteAddress || 'unknown';
}

/**
 * Middleware: Generate and set CSRF token
 * Should be applied to routes that render forms or return HTML
 */
export function generateCSRF(config?: Partial<CSRFConfig>) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const identifier = getCSRFIdentifier(req);
      const token = generateCSRFToken(finalConfig.tokenLength);
      
      // Store token in Redis
      await storeCSRFToken(identifier, token, finalConfig.tokenTTL);
      
      // Set token in cookie (for frontend to read)
      res.cookie(finalConfig.cookieName, token, {
        httpOnly: false, // Allow JavaScript to read for AJAX requests
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        sameSite: 'strict',
        maxAge: finalConfig.tokenTTL * 1000,
      });
      
      // Also attach to response locals for template rendering
      res.locals.csrfToken = token;
      
      next();
    } catch (error) {
      logger.error('CSRF token generation failed', { error });
      // Don't block request on CSRF generation failure
      next();
    }
  };
}

/**
 * Middleware: Verify CSRF token
 * Should be applied to state-changing routes (POST, PUT, DELETE, PATCH)
 */
export function verifyCSRF(config?: Partial<CSRFConfig>) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    // Skip CSRF check for excluded methods
    if (finalConfig.excludeMethods.includes(req.method)) {
      return next();
    }
    
    try {
      const identifier = getCSRFIdentifier(req);
      
      // Get token from header or body
      const token = 
        req.headers[finalConfig.headerName.toLowerCase()] as string ||
        req.body?._csrf ||
        req.query?._csrf as string;
      
      if (!token) {
        logger.warn('CSRF token missing', {
          ip: req.ip,
          path: req.path,
          method: req.method,
          userAgent: req.headers['user-agent']
        });
        
        return res.status(403).json({
          error: 'Forbidden',
          message: 'CSRF token missing'
        });
      }
      
      // Verify token
      const valid = await verifyCSRFToken(identifier, token);
      
      if (!valid) {
        logger.warn('CSRF token invalid', {
          ip: req.ip,
          path: req.path,
          method: req.method,
          userAgent: req.headers['user-agent']
        });
        
        return res.status(403).json({
          error: 'Forbidden',
          message: 'CSRF token invalid or expired'
        });
      }
      
      next();
    } catch (error) {
      logger.error('CSRF verification failed', { error });
      
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'CSRF verification failed'
      });
    }
  };
}

/**
 * Middleware: Combined CSRF protection
 * Generates token for GET requests, verifies for state-changing requests
 */
export function csrfProtection(config?: Partial<CSRFConfig>) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    // Generate token for safe methods
    if (finalConfig.excludeMethods.includes(req.method)) {
      return generateCSRF(finalConfig)(req, res, next);
    }
    
    // Verify token for state-changing methods
    return verifyCSRF(finalConfig)(req, res, next);
  };
}

/**
 * Double Submit Cookie pattern (alternative to stateful tokens)
 * Simpler but slightly less secure than Redis-backed tokens
 */
export function doubleSubmitCookie(config?: Partial<CSRFConfig>) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip for excluded methods
    if (finalConfig.excludeMethods.includes(req.method)) {
      // Generate and set cookie for safe methods
      const token = generateCSRFToken(finalConfig.tokenLength);
      res.cookie(finalConfig.cookieName, token, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: finalConfig.tokenTTL * 1000,
      });
      res.locals.csrfToken = token;
      return next();
    }
    
    // Verify for state-changing methods
    const cookieToken = req.cookies?.[finalConfig.cookieName];
    const headerToken = req.headers[finalConfig.headerName.toLowerCase()] as string;
    
    if (!cookieToken || !headerToken) {
      logger.warn('CSRF double submit cookie missing', {
        ip: req.ip,
        path: req.path,
        method: req.method
      });
      
      return res.status(403).json({
        error: 'Forbidden',
        message: 'CSRF token missing'
      });
    }
    
    // Compare tokens (constant-time)
    try {
      const valid = crypto.timingSafeEqual(
        Buffer.from(cookieToken),
        Buffer.from(headerToken)
      );
      
      if (!valid) {
        logger.warn('CSRF double submit cookie mismatch', {
          ip: req.ip,
          path: req.path,
          method: req.method
        });
        
        return res.status(403).json({
          error: 'Forbidden',
          message: 'CSRF token mismatch'
        });
      }
      
      next();
    } catch (error) {
      logger.error('CSRF double submit verification failed', { error });
      
      return res.status(403).json({
        error: 'Forbidden',
        message: 'CSRF token invalid'
      });
    }
  };
}

/**
 * Middleware: Set CSRF-related security headers
 */
export function setCSRFHeaders() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Strict origin policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    next();
  };
}

export default csrfProtection;
