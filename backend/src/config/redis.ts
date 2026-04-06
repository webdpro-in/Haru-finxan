/**
 * Redis Client Configuration
 * Handles session caching and real-time data with Upstash Redis
 */

import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redisToken = process.env.REDIS_TOKEN || '';

if (!process.env.REDIS_URL) {
  console.warn('⚠️  Redis credentials not configured. Caching features will be unavailable.');
}

// Create Redis client with connection pooling
export const redis = new Redis(redisUrl, {
  password: redisToken || undefined,
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  reconnectOnError: (err) => {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true;
    }
    return false;
  },
  lazyConnect: true,
  enableReadyCheck: true,
  maxLoadingRetryTime: 10000
});

// Connection event handlers
redis.on('connect', () => {
  console.log('✅ Redis connection established');
});

redis.on('ready', () => {
  console.log('✅ Redis client ready');
});

redis.on('error', (err) => {
  console.error('❌ Redis error:', err);
});

redis.on('close', () => {
  console.log('Redis connection closed');
});

/**
 * Test Redis connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    await redis.connect();
    await redis.ping();
    console.log('✅ Redis connection successful');
    return true;
  } catch (err) {
    console.error('❌ Redis connection error:', err);
    return false;
  }
}

/**
 * Session cache helpers
 */
export const SessionCache = {
  /**
   * Store session state
   */
  async set(sessionId: string, data: any, ttl: number = 3600): Promise<void> {
    await redis.setex(`session:${sessionId}`, ttl, JSON.stringify(data));
  },
  
  /**
   * Get session state
   */
  async get(sessionId: string): Promise<any | null> {
    const data = await redis.get(`session:${sessionId}`);
    return data ? JSON.parse(data) : null;
  },
  
  /**
   * Delete session
   */
  async delete(sessionId: string): Promise<void> {
    await redis.del(`session:${sessionId}`);
  },
  
  /**
   * Extend session TTL
   */
  async extend(sessionId: string, ttl: number = 3600): Promise<void> {
    await redis.expire(`session:${sessionId}`, ttl);
  }
};

/**
 * Student profile cache helpers
 */
export const ProfileCache = {
  /**
   * Cache student profile
   */
  async set(studentId: string, profile: any, ttl: number = 1800): Promise<void> {
    await redis.setex(`student:${studentId}:profile`, ttl, JSON.stringify(profile));
  },
  
  /**
   * Get cached profile
   */
  async get(studentId: string): Promise<any | null> {
    const data = await redis.get(`student:${studentId}:profile`);
    return data ? JSON.parse(data) : null;
  },
  
  /**
   * Invalidate profile cache
   */
  async invalidate(studentId: string): Promise<void> {
    await redis.del(`student:${studentId}:profile`);
  }
};

/**
 * Rate limiting helper
 */
export const RateLimit = {
  /**
   * Check if request is within rate limit
   */
  async check(userId: string, endpoint: string, limit: number = 100): Promise<boolean> {
    const key = `ratelimit:${userId}:${endpoint}`;
    const count = await redis.incr(key);
    
    if (count === 1) {
      await redis.expire(key, 60); // 1-minute window
    }
    
    return count <= limit;
  },
  
  /**
   * Get current request count
   */
  async getCount(userId: string, endpoint: string): Promise<number> {
    const key = `ratelimit:${userId}:${endpoint}`;
    const count = await redis.get(key);
    return count ? parseInt(count, 10) : 0;
  }
};

/**
 * Close Redis connection (call on app shutdown)
 */
export async function closeConnection(): Promise<void> {
  await redis.quit();
  console.log('Redis connection closed');
}

/**
 * Helper function to handle Redis errors
 */
export function handleRedisError(error: any): never {
  console.error('Redis error:', error);
  const message = error?.message || 'Unknown error';
  throw new Error(`Cache error: ${message}`);
}
