/**
 * Integration Tests for Input Validation Across All Routes
 * 
 * Verifies that all endpoints properly validate and sanitize inputs
 * REQ-11.4: System SHALL validate all inputs (max length, SQL injection, XSS)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { ValidationMiddleware } from '../../middleware/inputValidation.js';

describe('Input Validation Integration Tests', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      body: {},
      params: {},
      query: {},
      path: '/test',
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
  });

  describe('SQL Injection Prevention', () => {
    it('should block SQL injection in chat message', () => {
      mockReq.body = { message: "'; DROP TABLE users; --" };
      
      ValidationMiddleware.chatMessage(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Validation failed' })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should block SQL injection in image search query', () => {
      mockReq.body = { query: "' UNION SELECT password FROM users --" };
      
      ValidationMiddleware.imageSearch(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should block SQL injection in image generation prompt', () => {
      mockReq.body = { prompt: "1; DROP TABLE students; --" };
      
      ValidationMiddleware.imageGenerate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should block SQL injection in synthesize text', () => {
      mockReq.body = { text: "'; EXEC xp_cmdshell('dir'); --" };
      
      ValidationMiddleware.synthesize(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should block SQL injection in anonymous question', () => {
      mockReq.body = {
        studentId: 'student-123',
        classroomId: 'class-123',
        question: "' OR '1'='1' --"
      };
      
      ValidationMiddleware.anonymousQuestion(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should block SQL injection in URL params', () => {
      mockReq.params = { studentId: "'; DROP TABLE students; --" };
      
      ValidationMiddleware.studentParam(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('XSS Prevention', () => {
    it('should block XSS in chat message', () => {
      mockReq.body = { message: "<script>alert('XSS')</script>" };
      
      ValidationMiddleware.chatMessage(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should block XSS with event handlers', () => {
      mockReq.body = { message: "<img onerror='alert(1)'>" };
      
      ValidationMiddleware.chatMessage(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should block XSS with javascript: protocol', () => {
      mockReq.body = { query: "javascript:alert('XSS')" };
      
      ValidationMiddleware.imageSearch(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should block XSS in image prompts', () => {
      mockReq.body = { text: "<iframe src='evil.com'></iframe>" };
      
      ValidationMiddleware.imagePromptsAnalyze(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Length Validation', () => {
    it('should reject message exceeding max length', () => {
      mockReq.body = { message: 'a'.repeat(5001) };
      
      ValidationMiddleware.chatMessage(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining([
            expect.stringContaining('maximum length')
          ])
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject image query exceeding max length', () => {
      mockReq.body = { query: 'a'.repeat(501) };
      
      ValidationMiddleware.imageSearch(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject synthesize text exceeding max length', () => {
      mockReq.body = { text: 'a'.repeat(5001) };
      
      ValidationMiddleware.synthesize(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Pattern Validation', () => {
    it('should reject invalid student ID pattern', () => {
      mockReq.body = { studentId: 'invalid@id!' };
      
      ValidationMiddleware.sessionStart(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject invalid language code pattern', () => {
      mockReq.body = { 
        text: 'Hello world',
        languageCode: 'invalid'
      };
      
      ValidationMiddleware.synthesize(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should accept valid language code pattern', () => {
      mockReq.body = { 
        text: 'Hello world',
        languageCode: 'en-US'
      };
      
      ValidationMiddleware.synthesize(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('Required Field Validation', () => {
    it('should reject missing required field in chat', () => {
      mockReq.body = {}; // message is required
      
      ValidationMiddleware.chatMessage(mockReq as Request, mockRes as Response, mockNext);

      // chatMessage has message as required, but studentId is optional
      // Empty body should fail because message is missing
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject missing required field in image search', () => {
      mockReq.body = {};
      
      ValidationMiddleware.imageSearch(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject missing required field in session start', () => {
      mockReq.body = {};
      
      ValidationMiddleware.sessionStart(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Valid Input Acceptance', () => {
    it('should accept valid chat message', () => {
      mockReq.body = { message: 'What is photosynthesis?' };
      
      ValidationMiddleware.chatMessage(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should accept valid image search query', () => {
      mockReq.body = { query: 'photosynthesis diagram', count: 3 };
      
      ValidationMiddleware.imageSearch(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should accept valid student ID', () => {
      mockReq.body = { studentId: 'student-123' };
      
      ValidationMiddleware.sessionStart(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should accept valid synthesize request', () => {
      mockReq.body = { 
        text: 'Hello, how are you?',
        voiceId: 'Joanna',
        languageCode: 'en-US'
      };
      
      ValidationMiddleware.synthesize(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should accept valid parent param', () => {
      mockReq.params = { id: 'parent-123' };
      
      ValidationMiddleware.parentParam(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should accept valid class param', () => {
      mockReq.params = { classId: 'class-123' };
      
      ValidationMiddleware.classParam(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should accept valid lesson param', () => {
      mockReq.params = { lessonId: 'lesson-123' };
      
      ValidationMiddleware.lessonParam(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('All Endpoints Coverage', () => {
    it('should validate sessionStart endpoint', () => {
      mockReq.body = { studentId: 'student-123' };
      ValidationMiddleware.sessionStart(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should validate sessionEnd endpoint', () => {
      mockReq.body = { sessionId: 'session-123', studentId: 'student-123' };
      ValidationMiddleware.sessionEnd(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should validate anonymousQuestion endpoint', () => {
      mockReq.body = {
        studentId: 'student-123',
        classroomId: 'class-123',
        question: 'What is photosynthesis?'
      };
      ValidationMiddleware.anonymousQuestion(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should validate answerQuestion endpoint', () => {
      mockReq.params = { questionId: 'question-123' };
      mockReq.body = { answer: 'Photosynthesis is...' };
      
      const middleware = ValidationMiddleware.answerQuestion;
      if (Array.isArray(middleware)) {
        middleware.forEach(m => m(mockReq as Request, mockRes as Response, mockNext));
      }
      expect(mockNext).toHaveBeenCalled();
    });

    it('should validate acknowledgeAlert endpoint', () => {
      mockReq.params = { predictionId: 'pred-123' };
      mockReq.body = { notes: 'Acknowledged' };
      
      const middleware = ValidationMiddleware.acknowledgeAlert;
      if (Array.isArray(middleware)) {
        middleware.forEach(m => m(mockReq as Request, mockRes as Response, mockNext));
      }
      expect(mockNext).toHaveBeenCalled();
    });

    it('should validate classroomParam endpoint', () => {
      mockReq.params = { classroomId: 'classroom-123' };
      ValidationMiddleware.classroomParam(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should validate studentParam endpoint', () => {
      mockReq.params = { studentId: 'student-123' };
      ValidationMiddleware.studentParam(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should validate generateLessonPlan endpoint', () => {
      mockReq.body = {
        classroomId: 'class-123',
        subject: 'Science',
        topic: 'Photosynthesis',
        duration: '60',
        grade: '8'
      };
      ValidationMiddleware.generateLessonPlan(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should validate imageSearch endpoint', () => {
      mockReq.body = { query: 'photosynthesis', count: 3 };
      ValidationMiddleware.imageSearch(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should validate imageGenerate endpoint', () => {
      mockReq.body = { prompt: 'A diagram of photosynthesis' };
      ValidationMiddleware.imageGenerate(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should validate imagePromptsAnalyze endpoint', () => {
      mockReq.body = { text: 'Explain photosynthesis', userMessage: 'Tell me about plants' };
      ValidationMiddleware.imagePromptsAnalyze(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should validate synthesize endpoint', () => {
      mockReq.body = { text: 'Hello world', voiceId: 'Joanna', languageCode: 'en-US' };
      ValidationMiddleware.synthesize(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should validate parentParam endpoint', () => {
      mockReq.params = { id: 'parent-123' };
      ValidationMiddleware.parentParam(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should validate parentChildReport endpoint', () => {
      mockReq.params = { id: 'parent-123', studentId: 'student-123' };
      mockReq.query = { date: '2024-01-01' };
      
      const middleware = ValidationMiddleware.parentChildReport;
      if (Array.isArray(middleware)) {
        middleware.forEach(m => m(mockReq as Request, mockRes as Response, mockNext));
      }
      expect(mockNext).toHaveBeenCalled();
    });

    it('should validate classParam endpoint', () => {
      mockReq.params = { classId: 'class-123' };
      ValidationMiddleware.classParam(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should validate lessonParam endpoint', () => {
      mockReq.params = { lessonId: 'lesson-123' };
      ValidationMiddleware.lessonParam(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });
  });
});

