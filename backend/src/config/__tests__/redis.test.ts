/**
 * Unit Tests for Redis Configuration
 * Tests connection, session cache, profile cache, rate limiting, and error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  redis, 
  testConnection, 
  SessionCache, 
  ProfileCache, 
  RateLimit,
  closeConnection,
  handleRedisError 
} from '../redis';

// Mock ioredis
vi.mock('ioredis', () => {
  const mockRedis = {
    connect: vi.fn(),
    ping: vi.fn(),
    setex: vi.fn(),
    get: vi.fn(),
    del: vi.fn(),
    expire: vi.fn(),
    incr: vi.fn(),
    quit: vi.fn(),
    on: vi.fn()
  };

  return {
    default: class Redis {
      connect = mockRedis.connect;
      ping = mockRedis.ping;
      setex = mockRedis.setex;
      get = mockRedis.get;
      del = mockRedis.del;
      expire = mockRedis.expire;
      incr = mockRedis.incr;
      quit = mockRedis.quit;
      on = mockRedis.on;
    }
  };
});

describe('Redis Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Client Initialization', () => {
    it('should create Redis client', () => {
      expect(redis).toBeDefined();
    });
  });

  describe('testConnection', () => {
    it('should return true when connection is successful', async () => {
      (redis.connect as any).mockResolvedValue(undefined);
      (redis.ping as any).mockResolvedValue('PONG');

      const result = await testConnection();

      expect(result).toBe(true);
      expect(redis.connect).toHaveBeenCalled();
      expect(redis.ping).toHaveBeenCalled();
    });

    it('should return false when connection fails', async () => {
      (redis.connect as any).mockRejectedValue(new Error('Connection refused'));

      const result = await testConnection();

      expect(result).toBe(false);
    });

    it('should return false when ping fails', async () => {
      (redis.connect as any).mockResolvedValue(undefined);
      (redis.ping as any).mockRejectedValue(new Error('Timeout'));

      const result = await testConnection();

      expect(result).toBe(false);
    });
  });

  describe('SessionCache', () => {
    describe('set', () => {
      it('should store session data with default TTL', async () => {
        (redis.setex as any).mockResolvedValue('OK');

        await SessionCache.set('session123', { userId: 'user1', data: 'test' });

        expect(redis.setex).toHaveBeenCalledWith(
          'session:session123',
          3600,
          JSON.stringify({ userId: 'user1', data: 'test' })
        );
      });

      it('should store session data with custom TTL', async () => {
        (redis.setex as any).mockResolvedValue('OK');

        await SessionCache.set('session456', { userId: 'user2' }, 7200);

        expect(redis.setex).toHaveBeenCalledWith(
          'session:session456',
          7200,
          JSON.stringify({ userId: 'user2' })
        );
      });
    });

    describe('get', () => {
      it('should retrieve and parse session data', async () => {
        const sessionData = { userId: 'user1', data: 'test' };
        (redis.get as any).mockResolvedValue(JSON.stringify(sessionData));

        const result = await SessionCache.get('session123');

        expect(result).toEqual(sessionData);
        expect(redis.get).toHaveBeenCalledWith('session:session123');
      });

      it('should return null when session does not exist', async () => {
        (redis.get as any).mockResolvedValue(null);

        const result = await SessionCache.get('nonexistent');

        expect(result).toBeNull();
      });
    });

    describe('delete', () => {
      it('should delete session data', async () => {
        (redis.del as any).mockResolvedValue(1);

        await SessionCache.delete('session123');

        expect(redis.del).toHaveBeenCalledWith('session:session123');
      });
    });

    describe('extend', () => {
      it('should extend session TTL with default value', async () => {
        (redis.expire as any).mockResolvedValue(1);

        await SessionCache.extend('session123');

        expect(redis.expire).toHaveBeenCalledWith('session:session123', 3600);
      });

      it('should extend session TTL with custom value', async () => {
        (redis.expire as any).mockResolvedValue(1);

        await SessionCache.extend('session123', 7200);

        expect(redis.expire).toHaveBeenCalledWith('session:session123', 7200);
      });
    });
  });

  describe('ProfileCache', () => {
    describe('set', () => {
      it('should cache student profile with default TTL', async () => {
        (redis.setex as any).mockResolvedValue('OK');
        const profile = { name: 'John', grade: 10 };

        await ProfileCache.set('student123', profile);

        expect(redis.setex).toHaveBeenCalledWith(
          'student:student123:profile',
          1800,
          JSON.stringify(profile)
        );
      });

      it('should cache student profile with custom TTL', async () => {
        (redis.setex as any).mockResolvedValue('OK');
        const profile = { name: 'Jane', grade: 11 };

        await ProfileCache.set('student456', profile, 3600);

        expect(redis.setex).toHaveBeenCalledWith(
          'student:student456:profile',
          3600,
          JSON.stringify(profile)
        );
      });
    });

    describe('get', () => {
      it('should retrieve and parse cached profile', async () => {
        const profile = { name: 'John', grade: 10 };
        (redis.get as any).mockResolvedValue(JSON.stringify(profile));

        const result = await ProfileCache.get('student123');

        expect(result).toEqual(profile);
        expect(redis.get).toHaveBeenCalledWith('student:student123:profile');
      });

      it('should return null when profile is not cached', async () => {
        (redis.get as any).mockResolvedValue(null);

        const result = await ProfileCache.get('student999');

        expect(result).toBeNull();
      });
    });

    describe('invalidate', () => {
      it('should delete cached profile', async () => {
        (redis.del as any).mockResolvedValue(1);

        await ProfileCache.invalidate('student123');

        expect(redis.del).toHaveBeenCalledWith('student:student123:profile');
      });
    });
  });

  describe('RateLimit', () => {
    describe('check', () => {
      it('should return true when within rate limit', async () => {
        (redis.incr as any).mockResolvedValue(5);

        const result = await RateLimit.check('user123', '/api/chat', 100);

        expect(result).toBe(true);
        expect(redis.incr).toHaveBeenCalledWith('ratelimit:user123:/api/chat');
      });

      it('should return false when exceeding rate limit', async () => {
        (redis.incr as any).mockResolvedValue(101);

        const result = await RateLimit.check('user123', '/api/chat', 100);

        expect(result).toBe(false);
      });

      it('should set expiry on first request', async () => {
        (redis.incr as any).mockResolvedValue(1);
        (redis.expire as any).mockResolvedValue(1);

        await RateLimit.check('user123', '/api/chat', 100);

        expect(redis.expire).toHaveBeenCalledWith('ratelimit:user123:/api/chat', 60);
      });

      it('should not set expiry on subsequent requests', async () => {
        (redis.incr as any).mockResolvedValue(5);

        await RateLimit.check('user123', '/api/chat', 100);

        expect(redis.expire).not.toHaveBeenCalled();
      });
    });

    describe('getCount', () => {
      it('should return current request count', async () => {
        (redis.get as any).mockResolvedValue('42');

        const result = await RateLimit.getCount('user123', '/api/chat');

        expect(result).toBe(42);
        expect(redis.get).toHaveBeenCalledWith('ratelimit:user123:/api/chat');
      });

      it('should return 0 when no requests recorded', async () => {
        (redis.get as any).mockResolvedValue(null);

        const result = await RateLimit.getCount('user123', '/api/chat');

        expect(result).toBe(0);
      });
    });
  });

  describe('closeConnection', () => {
    it('should close Redis connection', async () => {
      (redis.quit as any).mockResolvedValue('OK');

      await closeConnection();

      expect(redis.quit).toHaveBeenCalled();
    });
  });

  describe('handleRedisError', () => {
    it('should throw error with message from Redis error', () => {
      const error = { message: 'Connection timeout' };

      expect(() => handleRedisError(error)).toThrow('Cache error: Connection timeout');
    });

    it('should throw error with unknown error message when no message provided', () => {
      const error = {};

      expect(() => handleRedisError(error)).toThrow('Cache error: Unknown error');
    });

    it('should handle null error', () => {
      expect(() => handleRedisError(null)).toThrow('Cache error: Unknown error');
    });
  });
});
