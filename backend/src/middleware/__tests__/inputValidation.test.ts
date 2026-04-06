/**
 * Input Validation Middleware Tests
 * 
 * Tests SQL injection prevention, XSS detection, and input sanitization
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  detectSQLInjection,
  detectXSS,
  sanitizeString,
  validateField,
  validateBody,
  validateParams,
  ValidationMiddleware,
} from '../inputValidation.js';

describe('Input Validation Middleware', () => {
  describe('detectSQLInjection', () => {
    it('should detect SQL injection with SELECT statement', () => {
      expect(detectSQLInjection("'; SELECT * FROM users; --")).toBe(true);
      expect(detectSQLInjection("admin' OR '1'='1")).toBe(true);
      expect(detectSQLInjection("1; DROP TABLE students;")).toBe(true);
    });

    it('should detect SQL injection with UNION attack', () => {
      expect(detectSQLInjection("' UNION SELECT password FROM users --")).toBe(true);
      expect(detectSQLInjection("1 UNION ALL SELECT NULL, username, password FROM users")).toBe(true);
    });

    it('should detect SQL injection with comment markers', () => {
      expect(detectSQLInjection("admin'--")).toBe(true);
      expect(detectSQLInjection("test/* comment */")).toBe(true);
    });

    it('should detect SQL injection with EXEC/EXECUTE', () => {
      expect(detectSQLInjection("'; EXEC xp_cmdshell('dir'); --")).toBe(true);
      expect(detectSQLInjection("EXECUTE sp_executesql")).toBe(true);
    });

    it('should detect SQL injection with INFORMATION_SCHEMA', () => {
      expect(detectSQLInjection("' UNION SELECT table_name FROM INFORMATION_SCHEMA.TABLES --")).toBe(true);
    });

    it('should allow safe strings', () => {
      expect(detectSQLInjection("What is photosynthesis?")).toBe(false);
      expect(detectSQLInjection("I don't understand this concept")).toBe(false);
      expect(detectSQLInjection("Can you explain the water cycle?")).toBe(false);
    });

    it('should handle non-string inputs', () => {
      expect(detectSQLInjection(123 as any)).toBe(false);
      expect(detectSQLInjection(null as any)).toBe(false);
      expect(detectSQLInjection(undefined as any)).toBe(false);
    });
  });

  describe('detectXSS', () => {
    it('should detect XSS with script tags', () => {
      expect(detectXSS("<script>alert('XSS')</script>")).toBe(true);
      expect(detectXSS("<SCRIPT>alert('XSS')</SCRIPT>")).toBe(true);
    });

    it('should detect XSS with iframe tags', () => {
      expect(detectXSS("<iframe src='evil.com'></iframe>")).toBe(true);
    });

    it('should detect XSS with javascript: protocol', () => {
      expect(detectXSS("javascript:alert('XSS')")).toBe(true);
    });

    it('should detect XSS with event handlers', () => {
      expect(detectXSS("<img onerror='alert(1)'>")).toBe(true);
      expect(detectXSS("<div onclick='malicious()'>")).toBe(true);
    });

    it('should detect XSS with embed/object tags', () => {
      expect(detectXSS("<embed src='evil.swf'>")).toBe(true);
      expect(detectXSS("<object data='evil.swf'>")).toBe(true);
    });

    it('should allow safe strings', () => {
      expect(detectXSS("What is photosynthesis?")).toBe(false);
      expect(detectXSS("I don't understand this concept")).toBe(false);
    });
  });

  describe('sanitizeString', () => {
    it('should escape HTML special characters', () => {
      expect(sanitizeString("<script>alert('XSS')</script>")).toBe(
        "&lt;script&gt;alert(&#x27;XSS&#x27;)&lt;&#x2F;script&gt;"
      );
    });

    it('should escape ampersands', () => {
      expect(sanitizeString("Tom & Jerry")).toBe("Tom &amp; Jerry");
    });

    it('should escape quotes', () => {
      expect(sanitizeString('He said "hello"')).toBe("He said &quot;hello&quot;");
      expect(sanitizeString("It's working")).toBe("It&#x27;s working");
    });

    it('should remove null bytes', () => {
      expect(sanitizeString("test\0null")).toBe("testnull");
    });

    it('should handle empty strings', () => {
      expect(sanitizeString("")).toBe("");
    });

    it('should handle non-string inputs', () => {
      expect(sanitizeString(123 as any)).toBe("");
    });
  });

  describe('validateField', () => {
    it('should validate required fields', () => {
      const result = validateField('studentId', '', { required: true });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should validate max length', () => {
      const result = validateField('name', 'a'.repeat(201), { maxLength: 200 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('maximum length');
    });

    it('should validate min length', () => {
      const result = validateField('password', 'ab', { minLength: 8 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('at least');
    });

    it('should validate pattern', () => {
      const result = validateField('studentId', 'invalid@id!', {
        pattern: /^[a-zA-Z0-9_-]+$/,
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('invalid characters');
    });

    it('should detect SQL injection in field', () => {
      const result = validateField('query', "'; DROP TABLE users; --", {});
      expect(result.valid).toBe(false);
      expect(result.error).toContain('malicious');
    });

    it('should detect XSS in field', () => {
      const result = validateField('message', "<script>alert('XSS')</script>", {});
      expect(result.valid).toBe(false);
      expect(result.error).toContain('malicious');
    });

    it('should sanitize when configured', () => {
      const result = validateField('message', "Tom & Jerry's <adventure>", {
        sanitize: true,
      });
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe("Tom &amp; Jerry&#x27;s &lt;adventure&gt;");
    });

    it('should allow valid fields', () => {
      const result = validateField('studentId', 'student-123', {
        pattern: /^[a-zA-Z0-9_-]+$/,
        maxLength: 100,
      });
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('student-123');
    });
  });

  describe('validateBody middleware', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
      mockReq = {
        body: {},
        path: '/test',
      };
      mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      };
      mockNext = vi.fn();
    });

    it('should validate and pass valid body', () => {
      mockReq.body = { studentId: 'student-123' };
      
      const middleware = validateBody({
        studentId: { required: true, pattern: /^[a-zA-Z0-9_-]+$/ },
      });
      
      middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject invalid body', () => {
      mockReq.body = { studentId: '' };
      
      const middleware = validateBody({
        studentId: { required: true },
      });
      
      middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation failed',
          details: expect.arrayContaining([expect.stringContaining('required')]),
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should sanitize body fields', () => {
      mockReq.body = { message: "Tom & Jerry's <adventure>" };
      
      const middleware = validateBody({
        message: { sanitize: true },
      });
      
      middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockReq.body.message).toBe("Tom &amp; Jerry&#x27;s &lt;adventure&gt;");
      expect(mockNext).toHaveBeenCalled();
    });

    it('should block SQL injection attempts', () => {
      mockReq.body = { query: "'; DROP TABLE users; --" };
      
      const middleware = validateBody({
        query: { required: true },
      });
      
      middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('validateParams middleware', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
      mockReq = {
        params: {},
        path: '/test',
      };
      mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      };
      mockNext = vi.fn();
    });

    it('should validate and pass valid params', () => {
      mockReq.params = { studentId: 'student-123' };
      
      const middleware = validateParams({
        studentId: { required: true, pattern: /^[a-zA-Z0-9_-]+$/ },
      });
      
      middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject invalid params', () => {
      mockReq.params = { studentId: 'invalid@id!' };
      
      const middleware = validateParams({
        studentId: { required: true, pattern: /^[a-zA-Z0-9_-]+$/ },
      });
      
      middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Pre-configured ValidationMiddleware', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
      mockReq = {
        body: {},
        params: {},
        path: '/test',
      };
      mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      };
      mockNext = vi.fn();
    });

    it('should validate session start request', () => {
      mockReq.body = { studentId: 'student-123' };
      
      ValidationMiddleware.sessionStart(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });

    it('should validate session end request', () => {
      mockReq.body = { sessionId: 'session-123', studentId: 'student-123' };
      
      ValidationMiddleware.sessionEnd(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });

    it('should validate anonymous question', () => {
      mockReq.body = {
        studentId: 'student-123',
        classroomId: 'class-123',
        question: 'What is photosynthesis?',
      };
      
      ValidationMiddleware.anonymousQuestion(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject anonymous question with SQL injection', () => {
      mockReq.body = {
        studentId: 'student-123',
        classroomId: 'class-123',
        question: "'; DROP TABLE students; --",
      };
      
      ValidationMiddleware.anonymousQuestion(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should validate chat message', () => {
      mockReq.body = { message: 'What is photosynthesis?' };
      
      ValidationMiddleware.chatMessage(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject chat message with XSS', () => {
      mockReq.body = { message: "<script>alert('XSS')</script>" };
      
      ValidationMiddleware.chatMessage(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });
    
    it('should validate image search request', () => {
      mockReq.body = { query: 'photosynthesis diagram', count: 3 };
      
      ValidationMiddleware.imageSearch(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });
    
    it('should validate image generation request', () => {
      mockReq.body = { prompt: 'A diagram showing the water cycle' };
      
      ValidationMiddleware.imageGenerate(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });
    
    it('should validate image prompts analysis request', () => {
      mockReq.body = { 
        text: 'Photosynthesis is the process by which plants make food',
        userMessage: 'Explain photosynthesis'
      };
      
      ValidationMiddleware.imagePromptsAnalyze(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });
    
    it('should validate synthesize request', () => {
      mockReq.body = { 
        text: 'Hello, how are you?',
        voiceId: 'Joanna',
        languageCode: 'en-US'
      };
      
      ValidationMiddleware.synthesize(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });
    
    it('should reject synthesize with invalid language code', () => {
      mockReq.body = { 
        text: 'Hello',
        languageCode: 'invalid'
      };
      
      ValidationMiddleware.synthesize(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });
    
    it('should validate parent param', () => {
      mockReq.params = { id: 'parent-123' };
      
      ValidationMiddleware.parentParam(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });
    
    it('should validate class param', () => {
      mockReq.params = { classId: 'class-123' };
      
      ValidationMiddleware.classParam(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });
    
    it('should validate lesson param', () => {
      mockReq.params = { lessonId: 'lesson-123' };
      
      ValidationMiddleware.lessonParam(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });
    
    it('should reject params with SQL injection', () => {
      mockReq.params = { studentId: "'; DROP TABLE students; --" };
      
      ValidationMiddleware.studentParam(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    it('should handle very long SQL injection attempts', () => {
      const longInjection = "' OR '1'='1' ".repeat(100) + "-- ";
      expect(detectSQLInjection(longInjection)).toBe(true);
    });

    it('should handle encoded SQL injection attempts', () => {
      // Note: This is a basic test. Real-world scenarios may need more sophisticated detection
      expect(detectSQLInjection("admin%27%20OR%20%271%27%3D%271")).toBe(false); // URL encoded
    });

    it('should handle case variations in SQL keywords', () => {
      expect(detectSQLInjection("SeLeCt * FrOm users")).toBe(true);
      expect(detectSQLInjection("UnIoN sElEcT password")).toBe(true);
    });

    it('should handle multiple validation errors', () => {
      const mockReq: Partial<Request> = {
        body: {
          studentId: '', // Required but empty
          message: 'a'.repeat(6000), // Exceeds max length
        },
        path: '/test',
      };
      const mockRes: Partial<Response> = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      };
      const mockNext: NextFunction = vi.fn();

      const middleware = validateBody({
        studentId: { required: true },
        message: { maxLength: 5000 },
      });

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining([
            expect.stringContaining('required'),
            expect.stringContaining('maximum length'),
          ]),
        })
      );
    });
  });
});
