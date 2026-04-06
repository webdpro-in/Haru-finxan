/**
 * Rate Limiter Integration Tests
 * Tests rate limiting with actual Express routes using mocked Redis
 * REQ-11.5: System SHALL implement rate limiting (100 requests/minute per user)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import express, { Request, Response } from 'express';
import request from 'supertest';
import { rateLimiter, strictRateLimiter } from '../rateLimiter.js';
import { generateToken } from '../auth.js';

// Mock Redis
vi.mock('../../config/redis.js', () => {
  const mockRedisData = new Map<string, any>();
  
  return {
    redis: {
      connect: vi.fn().mockResolvedValue(undefined),
      zremrangebyscore: vi.fn((key: string, min: number, max: number) => {
        const data = mockRedisData.get(key) || [];
        const filtered = data.filter((item: any) => item.score > max);
        mockRedisData.set(key, filtered);
        return Promise.resolve(data.length - filtered.length);
      }),
      zcard: vi.fn((key: string) => {
        const data = mockRedisData.get(key) || [];
        return Promise.resolve(data.length);
      }),
      zadd: vi.fn((key: string, score: number, member: string) => {
        const data = mockRedisData.get(key) || [];
        data.push({ score, member });
        mockRedisData.set(key, data);
        return Promise.resolve(1);
      }),
      expire: vi.fn().mockResolvedValue(1),
      keys: vi.fn((pattern: string) => {
        const keys = Array.from(mockRedisData.keys()).filter(k => k.startsWith(pattern.replace('*', '')));
        return Promise.resolve(keys);
      }),
      del: vi.fn((...keys: string[]) => {
        keys.forEach(k => mockRedisData.delete(k));
        return Promise.resolve(keys.length);
      }),
      // Helper to clear mock data between tests
      _clearMockData: () => mockRedisData.clear()
    }
  };
});

describe('Rate Limiter Integration Tests', () => {
  let app: express.Application;
  
  beforeEach(async () => {
    // Clear mock Redis data
    const { redis } = await import('../../config/redis.js');
    (redis as any)._clearMockData();
    
    // Create fresh Express app for each test
    app = express();
    app.use(express.json());
  });

  describe('Global rate limiter', () => {
    it('should allow requests within limit', async () => {
      app.use('/api', rateLimiter);
      app.get('/api/test', (_req: Request, res: Response) => {
        res.json({ message: 'success' });
      });
      
      const response = await request(app)
        .get('/api/test')
        .expect(200);
      
      expect(response.body).toEqual({ message: 'success' });
      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      expect(response.headers['x-ratelimit-reset']).toBeDefined();
    });

    it('should block requests exceeding limit', async () => {
      // Use strict limiter with very low limit for testing
      app.use('/api', strictRateLimiter(2, 60000));
      app.get('/api/test', (_req: Request, res: Response) => {
        res.json({ message: 'success' });
      });
      
      // First request should succeed
      await request(app)
        .get('/api/test')
        .expect(200);
      
      // Second request should succeed
      await request(app)
        .get('/api/test')
        .expect(200);
      
      // Third request should be rate limited
      const response = await request(app)
        .get('/api/test')
        .expect(429);
      
      expect(response.body).toMatchObject({
        error: 'Too Many Requests',
        message: expect.any(String),
        limit: 2,
        retryAfter: expect.any(Number)
      });
      
      expect(response.headers['retry-after']).toBeDefined();
    });

    it('should track authenticated users separately', async () => {
      // Import auth middleware
      const { authenticate } = await import('../auth.js');
      
      app.use('/api', authenticate);
      app.use('/api', rateLimiter);
      app.get('/api/test', (_req: Request, res: Response) => {
        res.json({ message: 'success' });
      });
      
      // Generate JWT token
      const token = generateToken({
        userId: 'test-user-123',
        userType: 'student'
      });
      
      const response = await request(app)
        .get('/api/test')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      // Should use authenticated limit (100)
      expect(response.headers['x-ratelimit-limit']).toBe('100');
    });

    it('should track unauthenticated users by IP', async () => {
      app.use('/api', rateLimiter);
      app.get('/api/test', (_req: Request, res: Response) => {
        res.json({ message: 'success' });
      });
      
      const response = await request(app)
        .get('/api/test')
        .expect(200);
      
      // Should use unauthenticated limit (50)
      expect(response.headers['x-ratelimit-limit']).toBe('50');
    });

    it('should respect X-Forwarded-For header', async () => {
      app.use('/api', strictRateLimiter(2, 60000));
      app.get('/api/test', (_req: Request, res: Response) => {
        res.json({ message: 'success' });
      });
      
      const customIp = '203.0.113.100';
      
      // First request from custom IP
      await request(app)
        .get('/api/test')
        .set('X-Forwarded-For', customIp)
        .expect(200);
      
      // Second request from custom IP
      await request(app)
        .get('/api/test')
        .set('X-Forwarded-For', customIp)
        .expect(200);
      
      // Third request should be blocked
      await request(app)
        .get('/api/test')
        .set('X-Forwarded-For', customIp)
        .expect(429);
      
      // Request from different IP should succeed
      await request(app)
        .get('/api/test')
        .set('X-Forwarded-For', '203.0.113.200')
        .expect(200);
    });

    it('should decrement remaining count with each request', async () => {
      app.use('/api', rateLimiter);
      app.get('/api/test', (_req: Request, res: Response) => {
        res.json({ message: 'success' });
      });
      
      // First request
      const response1 = await request(app)
        .get('/api/test')
        .expect(200);
      
      const remaining1 = parseInt(response1.headers['x-ratelimit-remaining']);
      
      // Second request
      const response2 = await request(app)
        .get('/api/test')
        .expect(200);
      
      const remaining2 = parseInt(response2.headers['x-ratelimit-remaining']);
      
      // Remaining should decrease
      expect(remaining2).toBeLessThan(remaining1);
    });

    it('should include reset timestamp in headers', async () => {
      app.use('/api', rateLimiter);
      app.get('/api/test', (_req: Request, res: Response) => {
        res.json({ message: 'success' });
      });
      
      const response = await request(app)
        .get('/api/test')
        .expect(200);
      
      const reset = parseInt(response.headers['x-ratelimit-reset']);
      const now = Date.now();
      
      // Reset should be in the future (within 1 minute)
      expect(reset).toBeGreaterThan(now);
      expect(reset).toBeLessThan(now + 61000); // 61 seconds to account for timing
    });
  });

  describe('Strict rate limiter', () => {
    it('should enforce lower limits', async () => {
      app.use('/api/auth', strictRateLimiter(5, 60000));
      app.post('/api/auth/login', (_req: Request, res: Response) => {
        res.json({ token: 'fake-token' });
      });
      
      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({ username: 'test', password: 'test' })
          .expect(200);
      }
      
      // 6th request should be blocked
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'test', password: 'test' })
        .expect(429);
      
      expect(response.body.error).toBe('Too Many Requests');
    });
  });

  describe('Multiple endpoints', () => {
    it('should track limits per user across all endpoints', async () => {
      app.use('/api', strictRateLimiter(3, 60000));
      app.get('/api/endpoint1', (_req: Request, res: Response) => {
        res.json({ endpoint: 1 });
      });
      app.get('/api/endpoint2', (_req: Request, res: Response) => {
        res.json({ endpoint: 2 });
      });
      
      // Request to endpoint 1
      await request(app).get('/api/endpoint1').expect(200);
      
      // Request to endpoint 2
      await request(app).get('/api/endpoint2').expect(200);
      
      // Another request to endpoint 1
      await request(app).get('/api/endpoint1').expect(200);
      
      // Fourth request should be blocked (regardless of endpoint)
      await request(app).get('/api/endpoint2').expect(429);
    });
  });

  describe('Error handling', () => {
    it('should fail open if Redis is unavailable', async () => {
      // Mock Redis to throw error
      const { redis } = await import('../../config/redis.js');
      vi.spyOn(redis, 'zremrangebyscore').mockRejectedValueOnce(new Error('Redis connection failed'));
      
      app.use('/api', rateLimiter);
      app.get('/api/test', (_req: Request, res: Response) => {
        res.json({ message: 'success' });
      });
      
      const response = await request(app)
        .get('/api/test')
        .expect(200);
      
      expect(response.body).toEqual({ message: 'success' });
    });
  });
});
