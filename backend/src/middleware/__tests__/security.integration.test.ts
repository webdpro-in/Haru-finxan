import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate, requireRole } from '../auth';

describe('Security Integration Tests', () => {
  let app: Express;
  let validToken: string;

  beforeAll(() => {
    app = express();
    app.use(express.json());

    // Generate valid token for tests
    validToken = jwt.sign(
      { userId: 'test-student', userType: 'student' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Protected endpoint with authentication and authorization
    app.post(
      '/api/test/secure',
      authenticate,
      requireRole('student', 'teacher'),
      (req, res) => {
        res.json({ success: true, message: 'Secure endpoint accessed' });
      }
    );

    // Teacher-only endpoint
    app.get(
      '/api/test/teacher-only',
      authenticate,
      requireRole('teacher'),
      (req, res) => {
        res.json({ success: true, role: 'teacher' });
      }
    );
  });

  describe('Full Security Stack', () => {
    it('should reject unauthenticated requests', async () => {
      const response = await request(app)
        .post('/api/test/secure')
        .send({ message: 'Hello' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });

    it('should reject requests with invalid token', async () => {
      const response = await request(app)
        .post('/api/test/secure')
        .set('Authorization', 'Bearer invalid-token')
        .send({ message: 'Hello' });

      expect(response.status).toBe(401);
    });

    it('should accept valid authenticated request', async () => {
      const response = await request(app)
        .post('/api/test/secure')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ message: 'Hello, this is a valid message' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should enforce role-based access control', async () => {
      const studentToken = jwt.sign(
        { userId: 'test-student', userType: 'student' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/test/teacher-only')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Forbidden');
    });

    it('should allow teacher access to teacher-only endpoint', async () => {
      const teacherToken = jwt.sign(
        { userId: 'test-teacher', userType: 'teacher' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/test/teacher-only')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
      expect(response.body.role).toBe('teacher');
    });
  });

  describe('Attack Vector Tests', () => {
    it('should prevent JWT token tampering', async () => {
      const tamperedToken = validToken.slice(0, -5) + 'XXXXX';

      const response = await request(app)
        .post('/api/test/secure')
        .set('Authorization', `Bearer ${tamperedToken}`)
        .send({ message: 'Test' });

      expect(response.status).toBe(401);
    });

    it('should prevent privilege escalation via token manipulation', async () => {
      // Try to create a token with wrong secret
      const maliciousToken = jwt.sign(
        { userId: 'test-student', userType: 'parent' },
        'wrong-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/test/teacher-only')
        .set('Authorization', `Bearer ${maliciousToken}`);

      expect(response.status).toBe(401);
    });
  });

  describe('Token Security', () => {
    it('should reject tokens without required claims', async () => {
      const incompleteToken = jwt.sign(
        { userId: 'test-user' }, // Missing userType
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .post('/api/test/secure')
        .set('Authorization', `Bearer ${incompleteToken}`)
        .send({ message: 'Test' });

      expect(response.status).toBe(403);
    });

    it('should reject tokens with invalid claims', async () => {
      const invalidToken = jwt.sign(
        { userId: '', userType: 'invalid-role' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .post('/api/test/secure')
        .set('Authorization', `Bearer ${invalidToken}`)
        .send({ message: 'Test' });

      expect(response.status).toBe(403);
    });
  });
});
