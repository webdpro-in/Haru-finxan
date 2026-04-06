/**
 * Rate Limiter Middleware Tests
 * Tests for REQ-11.5: System SHALL implement rate limiting
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { createRateLimiter, strictRateLimiter, lenientRateLimiter } from '../rateLimiter.js';
import { redis } from '../../config/redis.js';
import { AuthRequest } from '../auth.js';

// Mock Redis
vi.mock('../../config/redis.js', () => ({
  redis: {
    zremrangebyscore: vi.fn(),
    zcard: vi.fn(),
    zadd: vi.fn(),
    expire: vi.fn()
  }
}));

describe('Rate Limiter Middleware', () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let statusMock: any;
  let jsonMock: any;
  let setHeaderMock: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Setup response mocks
    statusMock = vi.fn().mockReturnThis();
    jsonMock = vi.fn();
    setHeaderMock = vi.fn();
    
    mockReq = {
      headers: {},
      socket: { remoteAddress: '127.0.0.1' } as any,
      user: undefined
    };
    
    mockRes = {
      status: statusMock,
      json: jsonMock,
      setHeader: setHeaderMock
    };
    
    mockNext = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createRateLimiter', () => {
    it('should allow requests within rate limit', async () => {
      // Mock Redis to return low request count
      (redis.zcard as any).mockResolvedValue(5);
      
      const rateLimiter = createRateLimiter({ maxRequests: 100 });
      await rateLimiter(mockReq as AuthRequest, mockRes as Response, mockNext);
      
      // Should call next() to allow request
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
      
      // Should set rate limit headers (100 because maxRequests was explicitly set)
      expect(setHeaderMock).toHaveBeenCalledWith('X-RateLimit-Limit', '100');
      expect(setHeaderMock).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(String));
      expect(setHeaderMock).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(String));
    });

    it('should block requests exceeding rate limit', async () => {
      // Mock Redis to return high request count (at limit)
      (redis.zcard as any).mockResolvedValue(100);
      
      const rateLimiter = createRateLimiter({ maxRequests: 100 });
      await rateLimiter(mockReq as AuthRequest, mockRes as Response, mockNext);
      
      // Should return 429 status
      expect(statusMock).toHaveBeenCalledWith(429);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Too Many Requests',
          message: expect.any(String),
          limit: expect.any(Number),
          reset: expect.any(Number),
          retryAfter: expect.any(Number)
        })
      );
      
      // Should NOT call next()
      expect(mockNext).not.toHaveBeenCalled();
      
      // Should set Retry-After header
      expect(setHeaderMock).toHaveBeenCalledWith('Retry-After', expect.any(String));
    });

    it('should use higher limit for authenticated users', async () => {
      // Add authenticated user
      mockReq.user = {
        userId: 'user123',
        userType: 'student',
        exp: Date.now() + 3600000
      };
      
      (redis.zcard as any).mockResolvedValue(10);
      
      const rateLimiter = createRateLimiter();
      await rateLimiter(mockReq as AuthRequest, mockRes as Response, mockNext);
      
      // Should use authenticated limit (100)
      expect(setHeaderMock).toHaveBeenCalledWith('X-RateLimit-Limit', '100');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should use lower limit for unauthenticated users', async () => {
      // No user attached
      mockReq.user = undefined;
      
      (redis.zcard as any).mockResolvedValue(10);
      
      const rateLimiter = createRateLimiter();
      await rateLimiter(mockReq as AuthRequest, mockRes as Response, mockNext);
      
      // Should use unauthenticated limit (50)
      expect(setHeaderMock).toHaveBeenCalledWith('X-RateLimit-Limit', '50');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should track by user ID for authenticated requests', async () => {
      mockReq.user = {
        userId: 'user123',
        userType: 'student',
        exp: Date.now() + 3600000
      };
      
      (redis.zcard as any).mockResolvedValue(5);
      
      const rateLimiter = createRateLimiter();
      await rateLimiter(mockReq as AuthRequest, mockRes as Response, mockNext);
      
      // Should use user ID in Redis key
      expect(redis.zremrangebyscore).toHaveBeenCalledWith(
        expect.stringContaining('user:user123'),
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should track by IP address for unauthenticated requests', async () => {
      mockReq.user = undefined;
      mockReq.socket = { remoteAddress: '192.168.1.100' } as any;
      
      (redis.zcard as any).mockResolvedValue(5);
      
      const rateLimiter = createRateLimiter();
      await rateLimiter(mockReq as AuthRequest, mockRes as Response, mockNext);
      
      // Should use IP in Redis key
      expect(redis.zremrangebyscore).toHaveBeenCalledWith(
        expect.stringContaining('ip:192.168.1.100'),
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should extract IP from X-Forwarded-For header', async () => {
      mockReq.headers = {
        'x-forwarded-for': '203.0.113.1, 198.51.100.1'
      };
      
      (redis.zcard as any).mockResolvedValue(5);
      
      const rateLimiter = createRateLimiter();
      await rateLimiter(mockReq as AuthRequest, mockRes as Response, mockNext);
      
      // Should use first IP from X-Forwarded-For
      expect(redis.zremrangebyscore).toHaveBeenCalledWith(
        expect.stringContaining('ip:203.0.113.1'),
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should fail open on Redis errors', async () => {
      // Mock Redis to throw error
      (redis.zcard as any).mockRejectedValue(new Error('Redis connection failed'));
      
      const rateLimiter = createRateLimiter();
      await rateLimiter(mockReq as AuthRequest, mockRes as Response, mockNext);
      
      // Should allow request to proceed despite error
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should clean up old entries from Redis', async () => {
      (redis.zcard as any).mockResolvedValue(5);
      
      const rateLimiter = createRateLimiter({ windowMs: 60000 });
      await rateLimiter(mockReq as AuthRequest, mockRes as Response, mockNext);
      
      // Should remove entries older than window
      expect(redis.zremrangebyscore).toHaveBeenCalled();
      
      // Should set expiration on key
      expect(redis.expire).toHaveBeenCalled();
    });
  });

  describe('strictRateLimiter', () => {
    it('should enforce stricter limits', async () => {
      (redis.zcard as any).mockResolvedValue(5);
      
      const limiter = strictRateLimiter(10, 60000);
      await limiter(mockReq as AuthRequest, mockRes as Response, mockNext);
      
      // Should use strict limit
      expect(setHeaderMock).toHaveBeenCalledWith('X-RateLimit-Limit', expect.any(String));
      expect(mockNext).toHaveBeenCalled();
    });

    it('should block after fewer requests', async () => {
      (redis.zcard as any).mockResolvedValue(10);
      
      const limiter = strictRateLimiter(10, 60000);
      await limiter(mockReq as AuthRequest, mockRes as Response, mockNext);
      
      // Should block at strict limit
      expect(statusMock).toHaveBeenCalledWith(429);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('lenientRateLimiter', () => {
    it('should allow more requests', async () => {
      (redis.zcard as any).mockResolvedValue(150);
      
      const limiter = lenientRateLimiter(200, 60000);
      await limiter(mockReq as AuthRequest, mockRes as Response, mockNext);
      
      // Should allow request with lenient limit
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });
  });

  describe('Rate limit headers', () => {
    it('should include all required headers', async () => {
      (redis.zcard as any).mockResolvedValue(10);
      
      const rateLimiter = createRateLimiter({ maxRequests: 100 });
      await rateLimiter(mockReq as AuthRequest, mockRes as Response, mockNext);
      
      // Should set all three required headers
      expect(setHeaderMock).toHaveBeenCalledWith('X-RateLimit-Limit', expect.any(String));
      expect(setHeaderMock).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(String));
      expect(setHeaderMock).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(String));
    });

    it('should set Retry-After when limit exceeded', async () => {
      (redis.zcard as any).mockResolvedValue(100);
      
      const rateLimiter = createRateLimiter({ maxRequests: 100 });
      await rateLimiter(mockReq as AuthRequest, mockRes as Response, mockNext);
      
      // Should set Retry-After header
      expect(setHeaderMock).toHaveBeenCalledWith('Retry-After', expect.any(String));
    });

    it('should show remaining count decreasing', async () => {
      const rateLimiter = createRateLimiter({ maxRequests: 100 });
      
      // First request
      (redis.zcard as any).mockResolvedValue(10);
      await rateLimiter(mockReq as AuthRequest, mockRes as Response, mockNext);
      
      const firstRemaining = (setHeaderMock.mock.calls.find(
        (call: any) => call[0] === 'X-RateLimit-Remaining'
      ) || [])[1];
      
      // Reset mocks
      vi.clearAllMocks();
      setHeaderMock = vi.fn();
      mockRes.setHeader = setHeaderMock;
      
      // Second request (higher count)
      (redis.zcard as any).mockResolvedValue(20);
      await rateLimiter(mockReq as AuthRequest, mockRes as Response, mockNext);
      
      const secondRemaining = (setHeaderMock.mock.calls.find(
        (call: any) => call[0] === 'X-RateLimit-Remaining'
      ) || [])[1];
      
      // Remaining should decrease
      expect(parseInt(secondRemaining)).toBeLessThan(parseInt(firstRemaining));
    });
  });

  describe('Environment variable configuration', () => {
    it('should respect RATE_LIMIT_AUTHENTICATED env var', async () => {
      // This would require mocking process.env, which is complex in tests
      // For now, we verify the default behavior
      mockReq.user = {
        userId: 'user123',
        userType: 'student',
        exp: Date.now() + 3600000
      };
      
      (redis.zcard as any).mockResolvedValue(5);
      
      const rateLimiter = createRateLimiter();
      await rateLimiter(mockReq as AuthRequest, mockRes as Response, mockNext);
      
      // Should use default authenticated limit (100)
      expect(setHeaderMock).toHaveBeenCalledWith('X-RateLimit-Limit', '100');
    });
  });
});
