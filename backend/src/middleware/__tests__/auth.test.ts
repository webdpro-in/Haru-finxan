import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate, requireRole, verifyToken, generateToken } from '../auth';

describe('Authentication Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
      body: {},
    };
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    nextFunction = vi.fn();
  });

  describe('authenticate', () => {
    it('should reject request without authorization header', () => {
      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'No authorization header provided',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject request with invalid token format', () => {
      mockRequest.headers = { authorization: 'InvalidToken' };

      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid authorization header format. Use: Bearer <token>',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject request with expired token', () => {
      const expiredToken = jwt.sign(
        { userId: 'test-user', userType: 'student' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '-1h' }
      );

      mockRequest.headers = { authorization: `Bearer ${expiredToken}` };

      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should accept valid token and attach user to request', () => {
      const validToken = jwt.sign(
        { userId: 'test-user', userType: 'student' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      mockRequest.headers = { authorization: `Bearer ${validToken}` };

      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect((mockRequest as any).user).toBeDefined();
      expect((mockRequest as any).user.userId).toBe('test-user');
      expect((mockRequest as any).user.userType).toBe('student');
    });

    it('should reject token with invalid signature', () => {
      const invalidToken = jwt.sign(
        { userId: 'test-user', userType: 'student' },
        'wrong-secret',
        { expiresIn: '1h' }
      );

      mockRequest.headers = { authorization: `Bearer ${invalidToken}` };

      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject malformed JWT token', () => {
      mockRequest.headers = { authorization: 'Bearer malformed.token.here' };

      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    it('should allow access for authorized role', () => {
      (mockRequest as any).user = { userId: 'test-user', userType: 'teacher' };

      const middleware = requireRole('teacher', 'parent');
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should deny access for unauthorized role', () => {
      (mockRequest as any).user = { userId: 'test-user', userType: 'student' };

      const middleware = requireRole('teacher', 'parent');
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Forbidden',
        })
      );
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should deny access when user is not attached to request', () => {
      const middleware = requireRole('teacher');
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should allow multiple roles', () => {
      (mockRequest as any).user = { userId: 'test-user', userType: 'parent' };

      const middleware = requireRole('student', 'teacher', 'parent');
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('Token Generation and Verification', () => {
    it('should generate valid JWT token', () => {
      const token = generateToken({
        userId: 'test-user',
        userType: 'student'
      });

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should verify valid token', () => {
      const token = generateToken({
        userId: 'test-user',
        userType: 'student'
      });

      const payload = verifyToken(token);

      expect(payload.userId).toBe('test-user');
      expect(payload.userType).toBe('student');
    });

    it('should reject invalid token', () => {
      expect(() => {
        verifyToken('invalid.token.here');
      }).toThrow();
    });
  });
});
