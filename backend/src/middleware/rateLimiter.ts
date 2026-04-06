/**
 * Rate Limiting Middleware
 * Implements distributed rate limiting using Redis
 * REQ-11.5: System SHALL implement rate limiting (100 requests/minute per user)
 */

import { Request, Response, NextFunction } from 'express';
import { redis } from '../config/redis.js';
import { AuthRequest } from './auth.js';

/**
 * Rate limit configuration
 */
interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyPrefix: string; // Redis key prefix
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
}

/**
 * Rate limit info attached to response headers
 */
interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
}

/**
 * Default rate limit configurations
 */
const DEFAULT_AUTHENTICATED_LIMIT = parseInt(process.env.RATE_LIMIT_AUTHENTICATED || '100', 10);
const DEFAULT_UNAUTHENTICATED_LIMIT = parseInt(process.env.RATE_LIMIT_UNAUTHENTICATED || '50', 10);
const DEFAULT_WINDOW_MS = 60 * 1000; // 1 minute

/**
 * Create rate limiter middleware
 */
export function createRateLimiter(config?: Partial<RateLimitConfig>) {
  const finalConfig: RateLimitConfig = {
    windowMs: config?.windowMs || DEFAULT_WINDOW_MS,
    maxRequests: config?.maxRequests || DEFAULT_AUTHENTICATED_LIMIT,
    keyPrefix: config?.keyPrefix || 'ratelimit',
    skipSuccessfulRequests: config?.skipSuccessfulRequests || false,
    skipFailedRequests: config?.skipFailedRequests || false
  };

  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Determine identifier (user ID or IP address)
      const identifier = getIdentifier(req);
      
      // Determine limit based on authentication status
      // If maxRequests was explicitly set in config, use that; otherwise use auth-based logic
      const limit = config?.maxRequests !== undefined
        ? config.maxRequests
        : ((req as AuthRequest).user ? DEFAULT_AUTHENTICATED_LIMIT : DEFAULT_UNAUTHENTICATED_LIMIT);
      
      // Check rate limit
      const rateLimitInfo = await checkRateLimit(
        identifier,
        limit,
        finalConfig.windowMs,
        finalConfig.keyPrefix
      );
      
      // Check if limit exceeded (before setting headers for cleaner response)
      if (rateLimitInfo.remaining < 0) {
        // Set rate limit headers
        setRateLimitHeaders(res, rateLimitInfo);
        
        res.status(429).json({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          limit: rateLimitInfo.limit,
          reset: rateLimitInfo.reset,
          retryAfter: Math.ceil((rateLimitInfo.reset - Date.now()) / 1000)
        });
        return;
      }
      
      // Set rate limit headers for successful requests
      setRateLimitHeaders(res, rateLimitInfo);
      
      next();
    } catch (error: any) {
      console.error('Rate limiter error:', error);
      // On Redis error, allow request to proceed (fail open)
      next();
    }
  };
}

/**
 * Check rate limit using Redis
 */
async function checkRateLimit(
  identifier: string,
  limit: number,
  windowMs: number,
  keyPrefix: string
): Promise<RateLimitInfo> {
  const key = `${keyPrefix}:${identifier}`;
  const now = Date.now();
  const windowStart = now - windowMs;
  
  try {
    // Use Redis sorted set to track requests with timestamps
    // Remove old entries outside the time window
    await redis.zremrangebyscore(key, 0, windowStart);
    
    // Count current requests in window
    const requestCount = await redis.zcard(key);
    
    // Calculate remaining requests (before adding current request)
    const remaining = limit - requestCount - 1;
    
    // Add current request
    await redis.zadd(key, now, `${now}-${Math.random()}`);
    
    // Set expiration on key (cleanup)
    await redis.expire(key, Math.ceil(windowMs / 1000) + 1);
    
    // Calculate reset time (end of current window)
    const reset = now + windowMs;
    
    return {
      limit,
      remaining,
      reset
    };
  } catch (error) {
    console.error('Redis rate limit check error:', error);
    // On error, return permissive values
    return {
      limit,
      remaining: limit,
      reset: now + windowMs
    };
  }
}

/**
 * Get identifier for rate limiting (user ID or IP address)
 */
function getIdentifier(req: AuthRequest): string {
  // Prefer user ID for authenticated requests
  if (req.user?.userId) {
    return `user:${req.user.userId}`;
  }
  
  // Fall back to IP address for unauthenticated requests
  const ip = getClientIp(req);
  return `ip:${ip}`;
}

/**
 * Extract client IP address from request
 */
function getClientIp(req: Request): string {
  // Check X-Forwarded-For header (proxy/load balancer)
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    return ips.split(',')[0].trim();
  }
  
  // Check X-Real-IP header
  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }
  
  // Fall back to socket address
  return req.socket.remoteAddress || 'unknown';
}

/**
 * Set rate limit headers on response
 */
function setRateLimitHeaders(res: Response, info: RateLimitInfo): void {
  res.setHeader('X-RateLimit-Limit', info.limit.toString());
  res.setHeader('X-RateLimit-Remaining', Math.max(0, info.remaining).toString());
  res.setHeader('X-RateLimit-Reset', info.reset.toString());
  
  // Add Retry-After header if limit exceeded
  if (info.remaining < 0) {
    const retryAfter = Math.ceil((info.reset - Date.now()) / 1000);
    res.setHeader('Retry-After', retryAfter.toString());
  }
}

/**
 * Strict rate limiter for sensitive endpoints (e.g., authentication)
 */
export function strictRateLimiter(maxRequests: number = 10, windowMs: number = 60000) {
  return createRateLimiter({
    maxRequests,
    windowMs,
    keyPrefix: 'ratelimit:strict'
  });
}

/**
 * Lenient rate limiter for public endpoints
 */
export function lenientRateLimiter(maxRequests: number = 200, windowMs: number = 60000) {
  return createRateLimiter({
    maxRequests,
    windowMs,
    keyPrefix: 'ratelimit:lenient'
  });
}

/**
 * Global rate limiter (default)
 * - 100 requests/minute for authenticated users
 * - 50 requests/minute for unauthenticated users
 */
export const rateLimiter = createRateLimiter();
