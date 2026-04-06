/**
 * CSRF Protection Middleware Unit Tests
 * 
 * Tests comprehensive CSRF token generation, validation, and protection
 * REQ-11.4: System SHALL validate all inputs (extended to include CSRF protection)
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import {
  generateCSRFToken,
  generateCSRF,
  verifyCSRF,
  csrfProtection,
  doubleSubmitCookie,
  setCSRFHeaders
} from '../csrfProtection.js';
import { AuthRequest } from '../auth.js';

// Mock Redis
vi.mock('../../config/redis.js', () => ({
  redis: {
    setex: vi.fn().mockResolvedValue('OK'),
    get: vi.fn().mockResolvedValue(null),
  }
}));

// Mock logger
vi.mock('../../utils/logger.js', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn()
  }
}));

describe('CSRF Protection', () => {
  describe('generateCSRFToken()', () => {
    it('should generate a token of default length (32 bytes = 64 hex chars)', () => {
      const token = generateCSRFToken();
      expect(token).toHaveLength(64); // 32 bytes * 2 (hex encoding)
      expect(token).toMatch(/^[0-9a-f]+$/);
    });

    it('should generate a token of custom length', () => {
      const token = generateCSRFToken(16);
      expect(token).toHaveLength(32); // 16 bytes * 2 (hex encoding)
      expect(token).toMatch(/^[0-9a-f]+$/);
    });

    it('should generate unique tokens', () => {
      const token1 = generateCSRFToken();
      const token2 = generateCSRFToken();
      expect(token1).not.toBe(token2);
    });

    it('should generate cryptographically secure tokens', () => {
      const tokens = new Set();
      for (let i = 0; i < 100; i++) {
        tokens.add(generateCSRFToken());
      }
      // All tokens should be unique
      expect(tokens.size).toBe(100);
    });
  });

  describe('Middleware Functions', () => {
    let mockRequest: Partial<AuthRequest>;
    let mockResponse: Partial<Response>;
    let nextFunction: NextFunction;
    let jsonMock: ReturnType<typeof vi.fn>;
    let statusMock: ReturnType<typeof vi.fn>;
    let cookieMock: ReturnType<typeof vi.fn>;
    let setHeaderMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      jsonMock = vi.fn();
      statusMock = vi.fn().mockReturnValue({ json: jsonMock });
      cookieMock = vi.fn();
      setHeaderMock = vi.fn();
      
      mockRequest = {
        method: 'GET',
        body: {},
        params: {},
        query: {},
        headers: {},
        ip: '127.0.0.1',
        path: '/api/test',
        socket: {
          remoteAddress: '127.0.0.1'
        } as any,
        user: undefined,
        session: undefined,
        cookies: {}
      };
      
      mockResponse = {
        status: statusMock,
        json: jsonMock,
        cookie: cookieMock,
        setHeader: setHeaderMock,
        locals: {}
      };
      
      nextFunction = vi.fn();
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    describe('generateCSRF()', () => {
      it('should generate and set CSRF token for authenticated user', async () => {
        mockRequest.user = {
          userId: 'user_123',
          userType: 'student',
          exp: Date.now() + 3600000
        };

        const middleware = generateCSRF();
        await middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(cookieMock).toHaveBeenCalledWith(
          'XSRF-TOKEN',
          expect.any(String),
          expect.objectContaining({
            httpOnly: false,
            sameSite: 'strict'
          })
        );
        expect(mockResponse.locals?.csrfToken).toBeDefined();
        expect(nextFunction).toHaveBeenCalled();
      });

      it('should generate token for unauthenticated user using IP', async () => {
        const middleware = generateCSRF();
        await middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(cookieMock).toHaveBeenCalled();
        expect(mockResponse.locals?.csrfToken).toBeDefined();
        expect(nextFunction).toHaveBeenCalled();
      });

      it('should set secure cookie in production', async () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';

        const middleware = generateCSRF();
        await middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(cookieMock).toHaveBeenCalledWith(
          'XSRF-TOKEN',
          expect.any(String),
          expect.objectContaining({
            secure: true
          })
        );

        process.env.NODE_ENV = originalEnv;
      });

      it('should not set secure cookie in development', async () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';

        const middleware = generateCSRF();
        await middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(cookieMock).toHaveBeenCalledWith(
          'XSRF-TOKEN',
          expect.any(String),
          expect.objectContaining({
            secure: false
          })
        );

        process.env.NODE_ENV = originalEnv;
      });

      it('should use custom cookie name if provided', async () => {
        const middleware = generateCSRF({ cookieName: 'CUSTOM-CSRF' });
        await middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(cookieMock).toHaveBeenCalledWith(
          'CUSTOM-CSRF',
          expect.any(String),
          expect.any(Object)
        );
      });

      it('should use custom token TTL if provided', async () => {
        const customTTL = 7200; // 2 hours
        const middleware = generateCSRF({ tokenTTL: customTTL });
        await middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(cookieMock).toHaveBeenCalledWith(
          'XSRF-TOKEN',
          expect.any(String),
          expect.objectContaining({
            maxAge: customTTL * 1000
          })
        );
      });

      it('should continue on Redis error', async () => {
        const { redis } = await import('../../config/redis.js');
        vi.mocked(redis.setex).mockRejectedValueOnce(new Error('Redis error'));

        const middleware = generateCSRF();
        await middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
      });

      it('should extract IP from X-Forwarded-For header', async () => {
        mockRequest.headers = {
          'x-forwarded-for': '203.0.113.1, 198.51.100.1'
        };

        const middleware = generateCSRF();
        await middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
      });

      it('should extract IP from X-Real-IP header', async () => {
        mockRequest.headers = {
          'x-real-ip': '203.0.113.1'
        };

        const middleware = generateCSRF();
        await middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
      });
    });

    describe('verifyCSRF()', () => {
      beforeEach(() => {
        mockRequest.method = 'POST'; // State-changing method
      });

      it('should skip verification for GET requests', async () => {
        mockRequest.method = 'GET';

        const middleware = verifyCSRF();
        await middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
        expect(statusMock).not.toHaveBeenCalled();
      });

      it('should skip verification for HEAD requests', async () => {
        mockRequest.method = 'HEAD';

        const middleware = verifyCSRF();
        await middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
        expect(statusMock).not.toHaveBeenCalled();
      });

      it('should skip verification for OPTIONS requests', async () => {
        mockRequest.method = 'OPTIONS';

        const middleware = verifyCSRF();
        await middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
        expect(statusMock).not.toHaveBeenCalled();
      });

      it('should reject POST request without CSRF token', async () => {
        const middleware = verifyCSRF();
        await middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).not.toHaveBeenCalled();
        expect(statusMock).toHaveBeenCalledWith(403);
        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Forbidden',
            message: 'CSRF token missing'
          })
        );
      });

      it('should reject PUT request without CSRF token', async () => {
        mockRequest.method = 'PUT';

        const middleware = verifyCSRF();
        await middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(statusMock).toHaveBeenCalledWith(403);
      });

      it('should reject DELETE request without CSRF token', async () => {
        mockRequest.method = 'DELETE';

        const middleware = verifyCSRF();
        await middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(statusMock).toHaveBeenCalledWith(403);
      });

      it('should reject PATCH request without CSRF token', async () => {
        mockRequest.method = 'PATCH';

        const middleware = verifyCSRF();
        await middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(statusMock).toHaveBeenCalledWith(403);
      });

      it('should accept token from X-XSRF-TOKEN header', async () => {
        const token = 'valid_token_123';
        mockRequest.headers = {
          'x-xsrf-token': token
        };
        mockRequest.user = {
          userId: 'user_123',
          userType: 'student',
          exp: Date.now() + 3600000
        };

        const { redis } = await import('../../config/redis.js');
        vi.mocked(redis.get).mockResolvedValueOnce(token);

        const middleware = verifyCSRF();
        await middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
        expect(statusMock).not.toHaveBeenCalled();
      });

      it('should accept token from request body', async () => {
        const token = 'valid_token_123';
        mockRequest.body = {
          _csrf: token
        };
        mockRequest.user = {
          userId: 'user_123',
          userType: 'student',
          exp: Date.now() + 3600000
        };

        const { redis } = await import('../../config/redis.js');
        vi.mocked(redis.get).mockResolvedValueOnce(token);

        const middleware = verifyCSRF();
        await middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
      });

      it('should accept token from query string', async () => {
        const token = 'valid_token_123';
        mockRequest.query = {
          _csrf: token
        };
        mockRequest.user = {
          userId: 'user_123',
          userType: 'student',
          exp: Date.now() + 3600000
        };

        const { redis } = await import('../../config/redis.js');
        vi.mocked(redis.get).mockResolvedValueOnce(token);

        const middleware = verifyCSRF();
        await middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
      });

      it('should reject invalid token', async () => {
        mockRequest.headers = {
          'x-xsrf-token': 'invalid_token'
        };
        mockRequest.user = {
          userId: 'user_123',
          userType: 'student',
          exp: Date.now() + 3600000
        };

        const { redis } = await import('../../config/redis.js');
        // Return a token of different length to trigger timingSafeEqual error
        vi.mocked(redis.get).mockResolvedValueOnce('different_token_with_different_length');

        const middleware = verifyCSRF();
        await middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).not.toHaveBeenCalled();
        // When timingSafeEqual throws due to length mismatch, it's caught and returns 500
        expect(statusMock).toHaveBeenCalledWith(500);
        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Internal Server Error',
            message: 'CSRF verification failed'
          })
        );
      });

      it('should reject expired token (not in Redis)', async () => {
        mockRequest.headers = {
          'x-xsrf-token': 'expired_token'
        };
        mockRequest.user = {
          userId: 'user_123',
          userType: 'student',
          exp: Date.now() + 3600000
        };

        const { redis } = await import('../../config/redis.js');
        vi.mocked(redis.get).mockResolvedValueOnce(null);

        const middleware = verifyCSRF();
        await middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(statusMock).toHaveBeenCalledWith(403);
      });

      it('should use custom header name if provided', async () => {
        const token = 'valid_token_123';
        mockRequest.headers = {
          'x-custom-csrf': token
        };
        mockRequest.user = {
          userId: 'user_123',
          userType: 'student',
          exp: Date.now() + 3600000
        };

        const { redis } = await import('../../config/redis.js');
        vi.mocked(redis.get).mockResolvedValueOnce(token);

        const middleware = verifyCSRF({ headerName: 'X-Custom-CSRF' });
        await middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
      });

      it('should handle Redis errors gracefully', async () => {
        mockRequest.headers = {
          'x-xsrf-token': 'some_token'
        };

        const { redis } = await import('../../config/redis.js');
        vi.mocked(redis.get).mockRejectedValueOnce(new Error('Redis error'));

        const middleware = verifyCSRF();
        await middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(statusMock).toHaveBeenCalledWith(500);
        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Internal Server Error',
            message: 'CSRF verification failed'
          })
        );
      });
    });

    describe('csrfProtection() - Combined', () => {
      it('should generate token for GET request', async () => {
        mockRequest.method = 'GET';

        const middleware = csrfProtection();
        await middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(cookieMock).toHaveBeenCalled();
        expect(mockResponse.locals?.csrfToken).toBeDefined();
        expect(nextFunction).toHaveBeenCalled();
      });

      it('should verify token for POST request', async () => {
        mockRequest.method = 'POST';

        const middleware = csrfProtection();
        await middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(statusMock).toHaveBeenCalledWith(403);
      });

      it('should verify token for PUT request', async () => {
        mockRequest.method = 'PUT';

        const middleware = csrfProtection();
        await middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(statusMock).toHaveBeenCalledWith(403);
      });

      it('should verify token for DELETE request', async () => {
        mockRequest.method = 'DELETE';

        const middleware = csrfProtection();
        await middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(statusMock).toHaveBeenCalledWith(403);
      });

      it('should allow valid POST request with token', async () => {
        const token = 'valid_token_123';
        mockRequest.method = 'POST';
        mockRequest.headers = {
          'x-xsrf-token': token
        };
        mockRequest.user = {
          userId: 'user_123',
          userType: 'student',
          exp: Date.now() + 3600000
        };

        const { redis } = await import('../../config/redis.js');
        vi.mocked(redis.get).mockResolvedValueOnce(token);

        const middleware = csrfProtection();
        await middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
        expect(statusMock).not.toHaveBeenCalled();
      });
    });

    describe('doubleSubmitCookie()', () => {
      it('should generate cookie for GET request', () => {
        mockRequest.method = 'GET';

        const middleware = doubleSubmitCookie();
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(cookieMock).toHaveBeenCalledWith(
          'XSRF-TOKEN',
          expect.any(String),
          expect.objectContaining({
            httpOnly: false,
            sameSite: 'strict'
          })
        );
        expect(mockResponse.locals?.csrfToken).toBeDefined();
        expect(nextFunction).toHaveBeenCalled();
      });

      it('should reject POST without cookie', () => {
        mockRequest.method = 'POST';
        mockRequest.cookies = {};

        const middleware = doubleSubmitCookie();
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(statusMock).toHaveBeenCalledWith(403);
        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Forbidden',
            message: 'CSRF token missing'
          })
        );
      });

      it('should reject POST without header', () => {
        mockRequest.method = 'POST';
        mockRequest.cookies = { 'XSRF-TOKEN': 'token123' };
        mockRequest.headers = {};

        const middleware = doubleSubmitCookie();
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(statusMock).toHaveBeenCalledWith(403);
      });

      it('should reject POST with mismatched tokens', () => {
        mockRequest.method = 'POST';
        mockRequest.cookies = { 'XSRF-TOKEN': 'token123' };
        mockRequest.headers = { 'x-xsrf-token': 'different_token' };

        const middleware = doubleSubmitCookie();
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(statusMock).toHaveBeenCalledWith(403);
        // When tokens have different lengths, timingSafeEqual throws and is caught
        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Forbidden',
            message: 'CSRF token invalid'
          })
        );
      });

      it('should allow POST with matching tokens', () => {
        const token = 'matching_token_123';
        mockRequest.method = 'POST';
        mockRequest.cookies = { 'XSRF-TOKEN': token };
        mockRequest.headers = { 'x-xsrf-token': token };

        const middleware = doubleSubmitCookie();
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
        expect(statusMock).not.toHaveBeenCalled();
      });

      it('should use custom cookie name', () => {
        const token = 'matching_token_123';
        mockRequest.method = 'POST';
        mockRequest.cookies = { 'CUSTOM-CSRF': token };
        mockRequest.headers = { 'x-custom-csrf': token };

        const middleware = doubleSubmitCookie({ 
          cookieName: 'CUSTOM-CSRF',
          headerName: 'X-Custom-CSRF'
        });
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
      });

      it('should handle timing attack attempts', () => {
        // Tokens of different lengths should still be compared safely
        mockRequest.method = 'POST';
        mockRequest.cookies = { 'XSRF-TOKEN': 'short' };
        mockRequest.headers = { 'x-xsrf-token': 'much_longer_token_value' };

        const middleware = doubleSubmitCookie();
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(statusMock).toHaveBeenCalledWith(403);
      });
    });

    describe('setCSRFHeaders()', () => {
      it('should set X-Frame-Options header', () => {
        const middleware = setCSRFHeaders();
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(setHeaderMock).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
        expect(nextFunction).toHaveBeenCalled();
      });

      it('should set Referrer-Policy header', () => {
        const middleware = setCSRFHeaders();
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(setHeaderMock).toHaveBeenCalledWith('Referrer-Policy', 'strict-origin-when-cross-origin');
      });

      it('should set both headers', () => {
        const middleware = setCSRFHeaders();
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(setHeaderMock).toHaveBeenCalledTimes(2);
      });
    });

    describe('Integration Scenarios', () => {
      it('should handle full request lifecycle for authenticated user', async () => {
        // Step 1: Generate token on GET
        mockRequest.method = 'GET';
        mockRequest.user = {
          userId: 'user_123',
          userType: 'student',
          exp: Date.now() + 3600000
        };

        const generateMiddleware = generateCSRF();
        await generateMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        const generatedToken = mockResponse.locals?.csrfToken;
        expect(generatedToken).toBeDefined();

        // Step 2: Verify token on POST
        vi.clearAllMocks();
        mockRequest.method = 'POST';
        mockRequest.headers = {
          'x-xsrf-token': generatedToken
        };

        const { redis } = await import('../../config/redis.js');
        vi.mocked(redis.get).mockResolvedValueOnce(generatedToken);

        const verifyMiddleware = verifyCSRF();
        await verifyMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
      });

      it('should handle session-based CSRF for unauthenticated users', async () => {
        mockRequest.session = { id: 'session_abc123' } as any;

        const middleware = generateCSRF();
        await middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(cookieMock).toHaveBeenCalled();
        expect(nextFunction).toHaveBeenCalled();
      });

      it('should protect against CSRF attack scenario', async () => {
        // Attacker tries to submit form without valid token
        mockRequest.method = 'POST';
        mockRequest.body = {
          action: 'transfer_money',
          amount: 1000
        };
        // No CSRF token provided

        const middleware = verifyCSRF();
        await middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).not.toHaveBeenCalled();
        expect(statusMock).toHaveBeenCalledWith(403);
      });

      it('should protect against token replay attack', async () => {
        const oldToken = 'old_expired_token';
        mockRequest.method = 'POST';
        mockRequest.headers = {
          'x-xsrf-token': oldToken
        };
        mockRequest.user = {
          userId: 'user_123',
          userType: 'student',
          exp: Date.now() + 3600000
        };

        // Token not in Redis (expired)
        const { redis } = await import('../../config/redis.js');
        vi.mocked(redis.get).mockResolvedValueOnce(null);

        const middleware = verifyCSRF();
        await middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(statusMock).toHaveBeenCalledWith(403);
      });

      it('should allow multiple safe methods without token', async () => {
        const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
        
        for (const method of safeMethods) {
          vi.clearAllMocks();
          mockRequest.method = method;

          const middleware = verifyCSRF();
          await middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

          expect(nextFunction).toHaveBeenCalled();
          expect(statusMock).not.toHaveBeenCalled();
        }
      });

      it('should require token for all state-changing methods', async () => {
        const stateMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
        
        for (const method of stateMethods) {
          vi.clearAllMocks();
          mockRequest.method = method;

          const middleware = verifyCSRF();
          await middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

          expect(nextFunction).not.toHaveBeenCalled();
          expect(statusMock).toHaveBeenCalledWith(403);
        }
      });
    });

    describe('Edge Cases', () => {
      it('should handle missing socket.remoteAddress', async () => {
        mockRequest.socket = {} as any;

        const middleware = generateCSRF();
        await middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
      });

      it('should handle array in X-Forwarded-For', async () => {
        mockRequest.headers = {
          'x-forwarded-for': ['203.0.113.1', '198.51.100.1']
        };

        const middleware = generateCSRF();
        await middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
      });

      it('should handle array in X-Real-IP', async () => {
        mockRequest.headers = {
          'x-real-ip': ['203.0.113.1']
        };

        const middleware = generateCSRF();
        await middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
      });

      it('should handle empty headers object', async () => {
        mockRequest.headers = {};

        const middleware = generateCSRF();
        await middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
      });

      it('should handle undefined user and session', async () => {
        mockRequest.user = undefined;
        mockRequest.session = undefined;

        const middleware = generateCSRF();
        await middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
      });
    });
  });
});
