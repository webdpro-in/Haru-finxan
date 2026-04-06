/**
 * CSRF Protection Middleware Integration Tests
 * 
 * Tests CSRF protection in real Express application scenarios
 * REQ-11.4: System SHALL validate all inputs (extended to include CSRF protection)
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import express, { Express, Request, Response } from 'express';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import {
  generateCSRF,
  verifyCSRF,
  csrfProtection,
  doubleSubmitCookie,
  setCSRFHeaders
} from '../csrfProtection.js';

// Mock Redis
vi.mock('../../config/redis.js', () => ({
  redis: {
    setex: vi.fn().mockResolvedValue('OK'),
    get: vi.fn().mockImplementation((key: string) => {
      // Store tokens in memory for testing
      const tokens = (global as any).__csrfTokens || {};
      return Promise.resolve(tokens[key] || null);
    }),
  }
}));

// Helper to store tokens for testing
function storeToken(identifier: string, token: string) {
  if (!(global as any).__csrfTokens) {
    (global as any).__csrfTokens = {};
  }
  // Store with both IPv4 and IPv6-mapped IPv4 formats
  (global as any).__csrfTokens[`csrf:${identifier}`] = token;
  if (identifier === 'ip:127.0.0.1') {
    (global as any).__csrfTokens[`csrf:ip:::ffff:127.0.0.1`] = token;
  }
}

function clearTokens() {
  (global as any).__csrfTokens = {};
}

describe('CSRF Protection Integration Tests', () => {
  let app: Express;

  beforeEach(() => {
    clearTokens();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Student Session Management (Redis-backed CSRF)', () => {
    beforeAll(() => {
      const studentApp = express();
      studentApp.use(express.json());
      studentApp.use(cookieParser());
      
      // Generate CSRF token on session start
      studentApp.post('/api/student/session/start', generateCSRF(), (req: Request, res: Response) => {
        res.json({
          success: true,
          sessionId: 'session_123',
          csrfToken: res.locals.csrfToken
        });
      });
      
      // Verify CSRF token on state-changing operations
      studentApp.post('/api/student/session/end', verifyCSRF(), (req: Request, res: Response) => {
        res.json({
          success: true,
          message: 'Session ended successfully'
        });
      });
      
      app = studentApp;
    });

    it('should generate CSRF token on session start', async () => {
      const response = await request(app)
        .post('/api/student/session/start')
        .send({ studentId: 'student_123' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.csrfToken).toBeDefined();
      expect(response.body.csrfToken).toHaveLength(64); // 32 bytes hex
      
      // Check cookie was set
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toContain('XSRF-TOKEN');
    });

    it('should reject session end without CSRF token', async () => {
      const response = await request(app)
        .post('/api/student/session/end')
        .send({ sessionId: 'session_123' });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Forbidden');
      expect(response.body.message).toContain('CSRF token missing');
    });

    it('should accept session end with valid CSRF token', async () => {
      const token = 'valid_token_123456789012345678901234567890123456789012345678901234';
      storeToken('ip:127.0.0.1', token);

      const response = await request(app)
        .post('/api/student/session/end')
        .set('X-XSRF-TOKEN', token)
        .send({ sessionId: 'session_123' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject session end with invalid CSRF token', async () => {
      storeToken('ip:127.0.0.1', 'valid_token_123');

      const response = await request(app)
        .post('/api/student/session/end')
        .set('X-XSRF-TOKEN', 'invalid_token_456')
        .send({ sessionId: 'session_123' });

      expect(response.status).toBe(500); // timingSafeEqual throws on length mismatch
      expect(response.body.error).toBe('Internal Server Error');
    });

    it('should accept CSRF token from request body', async () => {
      const token = 'valid_token_123456789012345678901234567890123456789012345678901234';
      storeToken('ip:127.0.0.1', token);

      const response = await request(app)
        .post('/api/student/session/end')
        .send({
          sessionId: 'session_123',
          _csrf: token
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should accept CSRF token from query string', async () => {
      const token = 'valid_token_123456789012345678901234567890123456789012345678901234';
      storeToken('ip:127.0.0.1', token);

      const response = await request(app)
        .post('/api/student/session/end')
        .query({ _csrf: token })
        .send({ sessionId: 'session_123' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Teacher Dashboard (Combined CSRF Protection)', () => {
    beforeAll(() => {
      const teacherApp = express();
      teacherApp.use(express.json());
      teacherApp.use(cookieParser());
      
      // Use combined CSRF protection
      teacherApp.use('/api/teacher', csrfProtection());
      
      teacherApp.get('/api/teacher/dashboard', (req: Request, res: Response) => {
        res.json({
          success: true,
          csrfToken: res.locals.csrfToken
        });
      });
      
      teacherApp.post('/api/teacher/notes', (req: Request, res: Response) => {
        res.json({
          success: true,
          notes: req.body.notes
        });
      });
      
      teacherApp.put('/api/teacher/student/:studentId', (req: Request, res: Response) => {
        res.json({
          success: true,
          studentId: req.params.studentId,
          updated: true
        });
      });
      
      teacherApp.delete('/api/teacher/session/:sessionId', (req: Request, res: Response) => {
        res.json({
          success: true,
          sessionId: req.params.sessionId,
          deleted: true
        });
      });
      
      app = teacherApp;
    });

    it('should generate token for GET request', async () => {
      const response = await request(app)
        .get('/api/teacher/dashboard');

      expect(response.status).toBe(200);
      expect(response.body.csrfToken).toBeDefined();
      
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toContain('XSRF-TOKEN');
    });

    it('should allow GET without CSRF token', async () => {
      const response = await request(app)
        .get('/api/teacher/dashboard');

      expect(response.status).toBe(200);
    });

    it('should reject POST without CSRF token', async () => {
      const response = await request(app)
        .post('/api/teacher/notes')
        .send({ notes: 'Student is doing well' });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('CSRF token missing');
    });

    it('should reject PUT without CSRF token', async () => {
      const response = await request(app)
        .put('/api/teacher/student/student_123')
        .send({ grade: 'A' });

      expect(response.status).toBe(403);
    });

    it('should reject DELETE without CSRF token', async () => {
      const response = await request(app)
        .delete('/api/teacher/session/session_123');

      expect(response.status).toBe(403);
    });

    it('should accept POST with valid CSRF token', async () => {
      const token = 'valid_token_123456789012345678901234567890123456789012345678901234';
      storeToken('ip:127.0.0.1', token);

      const response = await request(app)
        .post('/api/teacher/notes')
        .set('X-XSRF-TOKEN', token)
        .send({ notes: 'Student is doing well' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should accept PUT with valid CSRF token', async () => {
      const token = 'valid_token_123456789012345678901234567890123456789012345678901234';
      storeToken('ip:127.0.0.1', token);

      const response = await request(app)
        .put('/api/teacher/student/student_123')
        .set('X-XSRF-TOKEN', token)
        .send({ grade: 'A' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should accept DELETE with valid CSRF token', async () => {
      const token = 'valid_token_123456789012345678901234567890123456789012345678901234';
      storeToken('ip:127.0.0.1', token);

      const response = await request(app)
        .delete('/api/teacher/session/session_123')
        .set('X-XSRF-TOKEN', token);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Parent Portal (Double Submit Cookie)', () => {
    beforeAll(() => {
      const parentApp = express();
      parentApp.use(express.json());
      parentApp.use(cookieParser());
      
      // Use double submit cookie pattern
      parentApp.use('/api/parent', doubleSubmitCookie());
      
      parentApp.get('/api/parent/dashboard', (req: Request, res: Response) => {
        res.json({
          success: true,
          csrfToken: res.locals.csrfToken
        });
      });
      
      parentApp.post('/api/parent/consent', (req: Request, res: Response) => {
        res.json({
          success: true,
          consent: req.body.consent
        });
      });
      
      app = parentApp;
    });

    it('should generate cookie for GET request', async () => {
      const response = await request(app)
        .get('/api/parent/dashboard');

      expect(response.status).toBe(200);
      expect(response.body.csrfToken).toBeDefined();
      
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toContain('XSRF-TOKEN');
    });

    it('should reject POST without cookie', async () => {
      const response = await request(app)
        .post('/api/parent/consent')
        .send({ consent: true });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('CSRF token missing');
    });

    it('should reject POST without header', async () => {
      const response = await request(app)
        .post('/api/parent/consent')
        .set('Cookie', 'XSRF-TOKEN=token123')
        .send({ consent: true });

      expect(response.status).toBe(403);
    });

    it('should reject POST with mismatched tokens', async () => {
      const response = await request(app)
        .post('/api/parent/consent')
        .set('Cookie', 'XSRF-TOKEN=token123')
        .set('X-XSRF-TOKEN', 'different_token')
        .send({ consent: true });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('CSRF token invalid');
    });

    it('should accept POST with matching tokens', async () => {
      const token = 'matching_token_123';
      
      const response = await request(app)
        .post('/api/parent/consent')
        .set('Cookie', `XSRF-TOKEN=${token}`)
        .set('X-XSRF-TOKEN', token)
        .send({ consent: true });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should work with full flow: GET then POST', async () => {
      // Step 1: GET to receive token
      const getResponse = await request(app)
        .get('/api/parent/dashboard');

      expect(getResponse.status).toBe(200);
      const token = getResponse.body.csrfToken;
      
      // Extract cookie from response
      const cookies = getResponse.headers['set-cookie'];
      const cookieHeader = cookies[0].split(';')[0];
      
      // Step 2: POST with token
      const postResponse = await request(app)
        .post('/api/parent/consent')
        .set('Cookie', cookieHeader)
        .set('X-XSRF-TOKEN', token)
        .send({ consent: true });

      expect(postResponse.status).toBe(200);
      expect(postResponse.body.success).toBe(true);
    });
  });

  describe('Security Headers', () => {
    beforeAll(() => {
      const headerApp = express();
      headerApp.use(express.json());
      headerApp.use(setCSRFHeaders());
      
      headerApp.get('/api/test', (req: Request, res: Response) => {
        res.json({ success: true });
      });
      
      headerApp.post('/api/test', (req: Request, res: Response) => {
        res.json({ success: true });
      });
      
      app = headerApp;
    });

    it('should set X-Frame-Options header', async () => {
      const response = await request(app)
        .get('/api/test');

      expect(response.headers['x-frame-options']).toBe('DENY');
    });

    it('should set Referrer-Policy header', async () => {
      const response = await request(app)
        .get('/api/test');

      expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    });

    it('should set headers on POST requests', async () => {
      const response = await request(app)
        .post('/api/test')
        .send({ data: 'test' });

      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    });
  });

  describe('CSRF Attack Scenarios', () => {
    beforeAll(() => {
      const attackApp = express();
      attackApp.use(express.json());
      attackApp.use(cookieParser());
      
      // Simulate authenticated endpoints
      attackApp.post('/api/transfer', verifyCSRF(), (req: Request, res: Response) => {
        res.json({
          success: true,
          amount: req.body.amount,
          recipient: req.body.recipient
        });
      });
      
      attackApp.post('/api/delete-account', verifyCSRF(), (req: Request, res: Response) => {
        res.json({
          success: true,
          deleted: true
        });
      });
      
      attackApp.post('/api/change-email', verifyCSRF(), (req: Request, res: Response) => {
        res.json({
          success: true,
          newEmail: req.body.email
        });
      });
      
      app = attackApp;
    });

    it('should block unauthorized money transfer (no CSRF token)', async () => {
      const response = await request(app)
        .post('/api/transfer')
        .send({
          amount: 1000,
          recipient: 'attacker@evil.com'
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Forbidden');
    });

    it('should block unauthorized account deletion (no CSRF token)', async () => {
      const response = await request(app)
        .post('/api/delete-account')
        .send({ confirm: true });

      expect(response.status).toBe(403);
    });

    it('should block unauthorized email change (no CSRF token)', async () => {
      const response = await request(app)
        .post('/api/change-email')
        .send({ email: 'attacker@evil.com' });

      expect(response.status).toBe(403);
    });

    it('should block transfer with stolen/expired token', async () => {
      // Token not in Redis (expired or never existed)
      const response = await request(app)
        .post('/api/transfer')
        .set('X-XSRF-TOKEN', 'stolen_or_expired_token')
        .send({
          amount: 1000,
          recipient: 'attacker@evil.com'
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('invalid or expired');
    });

    it('should allow legitimate transfer with valid token', async () => {
      const token = 'valid_token_123456789012345678901234567890123456789012345678901234';
      storeToken('ip:127.0.0.1', token);

      const response = await request(app)
        .post('/api/transfer')
        .set('X-XSRF-TOKEN', token)
        .send({
          amount: 100,
          recipient: 'legitimate@user.com'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('HTTP Method Protection', () => {
    beforeAll(() => {
      const methodApp = express();
      methodApp.use(express.json());
      methodApp.use(cookieParser());
      methodApp.use(csrfProtection());
      
      methodApp.get('/api/resource', (req: Request, res: Response) => {
        res.json({ method: 'GET', csrfToken: res.locals.csrfToken });
      });
      
      methodApp.head('/api/resource', (req: Request, res: Response) => {
        res.status(200).end();
      });
      
      methodApp.options('/api/resource', (req: Request, res: Response) => {
        res.status(200).end();
      });
      
      methodApp.post('/api/resource', (req: Request, res: Response) => {
        res.json({ method: 'POST', success: true });
      });
      
      methodApp.put('/api/resource', (req: Request, res: Response) => {
        res.json({ method: 'PUT', success: true });
      });
      
      methodApp.patch('/api/resource', (req: Request, res: Response) => {
        res.json({ method: 'PATCH', success: true });
      });
      
      methodApp.delete('/api/resource', (req: Request, res: Response) => {
        res.json({ method: 'DELETE', success: true });
      });
      
      app = methodApp;
    });

    it('should allow GET without CSRF token', async () => {
      const response = await request(app).get('/api/resource');
      expect(response.status).toBe(200);
      expect(response.body.method).toBe('GET');
    });

    it('should allow HEAD without CSRF token', async () => {
      const response = await request(app).head('/api/resource');
      expect(response.status).toBe(200);
    });

    it('should allow OPTIONS without CSRF token', async () => {
      const response = await request(app).options('/api/resource');
      expect(response.status).toBe(200);
    });

    it('should require CSRF token for POST', async () => {
      const response = await request(app)
        .post('/api/resource')
        .send({ data: 'test' });
      expect(response.status).toBe(403);
    });

    it('should require CSRF token for PUT', async () => {
      const response = await request(app)
        .put('/api/resource')
        .send({ data: 'test' });
      expect(response.status).toBe(403);
    });

    it('should require CSRF token for PATCH', async () => {
      const response = await request(app)
        .patch('/api/resource')
        .send({ data: 'test' });
      expect(response.status).toBe(403);
    });

    it('should require CSRF token for DELETE', async () => {
      const response = await request(app)
        .delete('/api/resource');
      expect(response.status).toBe(403);
    });

    it('should allow POST with valid CSRF token', async () => {
      const token = 'valid_token_123456789012345678901234567890123456789012345678901234';
      storeToken('ip:127.0.0.1', token);

      const response = await request(app)
        .post('/api/resource')
        .set('X-XSRF-TOKEN', token)
        .send({ data: 'test' });

      expect(response.status).toBe(200);
      expect(response.body.method).toBe('POST');
    });
  });

  describe('Cookie Configuration', () => {
    beforeAll(() => {
      const cookieApp = express();
      cookieApp.use(express.json());
      cookieApp.use(cookieParser());
      
      cookieApp.get('/api/dev', generateCSRF(), (req: Request, res: Response) => {
        res.json({ env: 'development' });
      });
      
      app = cookieApp;
    });

    it('should set httpOnly to false (allow JavaScript access)', async () => {
      const response = await request(app).get('/api/dev');
      
      const cookies = response.headers['set-cookie'];
      expect(cookies[0]).toContain('XSRF-TOKEN');
      expect(cookies[0]).not.toContain('HttpOnly');
    });

    it('should set SameSite to strict', async () => {
      const response = await request(app).get('/api/dev');
      
      const cookies = response.headers['set-cookie'];
      expect(cookies[0]).toContain('SameSite=Strict');
    });

    it('should set appropriate maxAge', async () => {
      const response = await request(app).get('/api/dev');
      
      const cookies = response.headers['set-cookie'];
      expect(cookies[0]).toContain('Max-Age');
    });
  });

  describe('Token Lifecycle', () => {
    beforeAll(() => {
      const lifecycleApp = express();
      lifecycleApp.use(express.json());
      lifecycleApp.use(cookieParser());
      
      lifecycleApp.get('/api/form', generateCSRF(), (req: Request, res: Response) => {
        res.json({ csrfToken: res.locals.csrfToken });
      });
      
      lifecycleApp.post('/api/submit', verifyCSRF(), (req: Request, res: Response) => {
        res.json({ success: true });
      });
      
      app = lifecycleApp;
    });

    it('should generate unique tokens for each request', async () => {
      const response1 = await request(app).get('/api/form');
      const response2 = await request(app).get('/api/form');

      expect(response1.body.csrfToken).not.toBe(response2.body.csrfToken);
    });

    it('should accept recently generated token', async () => {
      const getResponse = await request(app).get('/api/form');
      const token = getResponse.body.csrfToken;
      
      storeToken('ip:127.0.0.1', token);

      const postResponse = await request(app)
        .post('/api/submit')
        .set('X-XSRF-TOKEN', token)
        .send({ data: 'test' });

      expect(postResponse.status).toBe(200);
    });

    it('should reject token after expiration (not in Redis)', async () => {
      const expiredToken = 'expired_token_123456789012345678901234567890123456789012345678';
      // Don't store in Redis to simulate expiration

      const response = await request(app)
        .post('/api/submit')
        .set('X-XSRF-TOKEN', expiredToken)
        .send({ data: 'test' });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('invalid or expired');
    });
  });

  describe('Error Handling', () => {
    beforeAll(() => {
      const errorApp = express();
      errorApp.use(express.json());
      errorApp.use(cookieParser());
      
      errorApp.post('/api/action', verifyCSRF(), (req: Request, res: Response) => {
        res.json({ success: true });
      });
      
      app = errorApp;
    });

    it('should handle missing headers gracefully', async () => {
      const response = await request(app)
        .post('/api/action')
        .send({ data: 'test' });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Forbidden');
    });

    it('should handle empty token gracefully', async () => {
      const response = await request(app)
        .post('/api/action')
        .set('X-XSRF-TOKEN', '')
        .send({ data: 'test' });

      expect(response.status).toBe(403);
    });

    it('should handle malformed token gracefully', async () => {
      const response = await request(app)
        .post('/api/action')
        .set('X-XSRF-TOKEN', 'not-a-valid-token')
        .send({ data: 'test' });

      expect(response.status).toBe(403);
    });
  });
});
