/**
 * Unit tests for SocraticAttemptTracker
 * Tests attempt tracking with Redis persistence
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SocraticAttemptTracker } from '../SocraticAttemptTracker';
import { redis } from '../../config/redis';

// Mock Redis
vi.mock('../../config/redis', () => ({
  redis: {
    get: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
    keys: vi.fn(),
    ttl: vi.fn()
  }
}));

describe('SocraticAttemptTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAttemptTracker', () => {
    it('should return null when no tracker exists', async () => {
      vi.mocked(redis.get).mockResolvedValue(null);

      const tracker = await SocraticAttemptTracker.getAttemptTracker(
        'student123',
        'question456'
      );

      expect(tracker).toBeNull();
      expect(redis.get).toHaveBeenCalledWith('socratic:attempt:student123:question456');
    });

    it('should return tracker when it exists', async () => {
      const mockData = {
        studentId: 'student123',
        questionId: 'question456',
        attemptCount: 2,
        lastAttempt: '2024-01-15T10:00:00.000Z',
        previousResponses: ['First answer', 'Second answer']
      };

      vi.mocked(redis.get).mockResolvedValue(JSON.stringify(mockData));

      const tracker = await SocraticAttemptTracker.getAttemptTracker(
        'student123',
        'question456'
      );

      expect(tracker).toBeDefined();
      expect(tracker?.studentId).toBe('student123');
      expect(tracker?.questionId).toBe('question456');
      expect(tracker?.attemptCount).toBe(2);
      expect(tracker?.previousResponses).toEqual(['First answer', 'Second answer']);
      expect(tracker?.lastAttempt).toBeInstanceOf(Date);
    });

    it('should handle Redis errors gracefully', async () => {
      vi.mocked(redis.get).mockRejectedValue(new Error('Redis error'));

      const tracker = await SocraticAttemptTracker.getAttemptTracker(
        'student123',
        'question456'
      );

      expect(tracker).toBeNull();
    });
  });

  describe('saveAttemptTracker', () => {
    it('should save tracker to Redis with TTL', async () => {
      const tracker = {
        studentId: 'student123',
        questionId: 'question456',
        attemptCount: 1,
        lastAttempt: new Date(),
        previousResponses: ['First answer']
      };

      await SocraticAttemptTracker.saveAttemptTracker(tracker);

      expect(redis.setex).toHaveBeenCalledWith(
        'socratic:attempt:student123:question456',
        3600,
        expect.any(String)
      );
    });

    it('should throw error on Redis failure', async () => {
      vi.mocked(redis.setex).mockRejectedValue(new Error('Redis error'));

      const tracker = {
        studentId: 'student123',
        questionId: 'question456',
        attemptCount: 1,
        lastAttempt: new Date(),
        previousResponses: ['First answer']
      };

      await expect(
        SocraticAttemptTracker.saveAttemptTracker(tracker)
      ).rejects.toThrow();
    });
  });

  describe('trackAttempt', () => {
    it('should create new tracker for first attempt', async () => {
      vi.mocked(redis.get).mockResolvedValue(null);
      vi.mocked(redis.setex).mockResolvedValue('OK');

      const tracker = await SocraticAttemptTracker.trackAttempt(
        'student123',
        'question456',
        'My first answer'
      );

      expect(tracker.studentId).toBe('student123');
      expect(tracker.questionId).toBe('question456');
      expect(tracker.attemptCount).toBe(1);
      expect(tracker.previousResponses).toEqual(['My first answer']);
      expect(tracker.lastAttempt).toBeInstanceOf(Date);
      expect(redis.setex).toHaveBeenCalled();
    });

    it('should increment attempt count for existing tracker', async () => {
      const existingData = {
        studentId: 'student123',
        questionId: 'question456',
        attemptCount: 2,
        lastAttempt: '2024-01-15T10:00:00.000Z',
        previousResponses: ['First answer', 'Second answer']
      };

      vi.mocked(redis.get).mockResolvedValue(JSON.stringify(existingData));
      vi.mocked(redis.setex).mockResolvedValue('OK');

      const tracker = await SocraticAttemptTracker.trackAttempt(
        'student123',
        'question456',
        'Third answer'
      );

      expect(tracker.attemptCount).toBe(3);
      expect(tracker.previousResponses).toEqual([
        'First answer',
        'Second answer',
        'Third answer'
      ]);
    });

    it('should update last attempt timestamp', async () => {
      vi.mocked(redis.get).mockResolvedValue(null);
      vi.mocked(redis.setex).mockResolvedValue('OK');

      const beforeTime = Date.now();
      const tracker = await SocraticAttemptTracker.trackAttempt(
        'student123',
        'question456',
        'Answer'
      );
      const afterTime = Date.now();

      expect(tracker.lastAttempt.getTime()).toBeGreaterThanOrEqual(beforeTime);
      expect(tracker.lastAttempt.getTime()).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('clearAttemptTracker', () => {
    it('should delete tracker from Redis', async () => {
      vi.mocked(redis.del).mockResolvedValue(1);

      await SocraticAttemptTracker.clearAttemptTracker('student123', 'question456');

      expect(redis.del).toHaveBeenCalledWith('socratic:attempt:student123:question456');
    });

    it('should handle Redis errors gracefully', async () => {
      vi.mocked(redis.del).mockRejectedValue(new Error('Redis error'));

      // Should not throw
      await expect(
        SocraticAttemptTracker.clearAttemptTracker('student123', 'question456')
      ).resolves.toBeUndefined();
    });
  });

  describe('getStudentAttempts', () => {
    it('should return empty array when no attempts exist', async () => {
      vi.mocked(redis.keys).mockResolvedValue([]);

      const attempts = await SocraticAttemptTracker.getStudentAttempts('student123');

      expect(attempts).toEqual([]);
      expect(redis.keys).toHaveBeenCalledWith('socratic:attempt:student123:*');
    });

    it('should return all attempts for a student', async () => {
      const mockKeys = [
        'socratic:attempt:student123:question1',
        'socratic:attempt:student123:question2'
      ];

      const mockData1 = {
        studentId: 'student123',
        questionId: 'question1',
        attemptCount: 2,
        lastAttempt: '2024-01-15T10:00:00.000Z',
        previousResponses: ['Answer 1', 'Answer 2']
      };

      const mockData2 = {
        studentId: 'student123',
        questionId: 'question2',
        attemptCount: 1,
        lastAttempt: '2024-01-15T11:00:00.000Z',
        previousResponses: ['Answer 1']
      };

      vi.mocked(redis.keys).mockResolvedValue(mockKeys);
      vi.mocked(redis.get)
        .mockResolvedValueOnce(JSON.stringify(mockData1))
        .mockResolvedValueOnce(JSON.stringify(mockData2));

      const attempts = await SocraticAttemptTracker.getStudentAttempts('student123');

      expect(attempts).toHaveLength(2);
      expect(attempts[0].questionId).toBe('question1');
      expect(attempts[1].questionId).toBe('question2');
    });

    it('should handle Redis errors gracefully', async () => {
      vi.mocked(redis.keys).mockRejectedValue(new Error('Redis error'));

      const attempts = await SocraticAttemptTracker.getStudentAttempts('student123');

      expect(attempts).toEqual([]);
    });
  });

  describe('shouldProvideHint', () => {
    it('should return false for 0 attempts', () => {
      expect(SocraticAttemptTracker.shouldProvideHint(0)).toBe(false);
    });

    it('should return false for 1 attempt', () => {
      expect(SocraticAttemptTracker.shouldProvideHint(1)).toBe(false);
    });

    it('should return false for 2 attempts', () => {
      expect(SocraticAttemptTracker.shouldProvideHint(2)).toBe(false);
    });

    it('should return true for 3 attempts', () => {
      expect(SocraticAttemptTracker.shouldProvideHint(3)).toBe(true);
    });

    it('should return true for 4 attempts', () => {
      expect(SocraticAttemptTracker.shouldProvideHint(4)).toBe(true);
    });

    it('should return true for many attempts', () => {
      expect(SocraticAttemptTracker.shouldProvideHint(10)).toBe(true);
    });
  });

  describe('cleanupOldAttempts', () => {
    it('should return 0 when no attempts exist', async () => {
      vi.mocked(redis.keys).mockResolvedValue([]);

      const count = await SocraticAttemptTracker.cleanupOldAttempts('student123');

      expect(count).toBe(0);
    });

    it('should delete attempts with low TTL', async () => {
      const mockKeys = [
        'socratic:attempt:student123:question1',
        'socratic:attempt:student123:question2'
      ];

      vi.mocked(redis.keys).mockResolvedValue(mockKeys);
      vi.mocked(redis.ttl)
        .mockResolvedValueOnce(30) // Low TTL - should delete
        .mockResolvedValueOnce(3600); // High TTL - should keep
      vi.mocked(redis.del).mockResolvedValue(1);

      const count = await SocraticAttemptTracker.cleanupOldAttempts('student123');

      expect(count).toBe(1);
      expect(redis.del).toHaveBeenCalledTimes(1);
      expect(redis.del).toHaveBeenCalledWith('socratic:attempt:student123:question1');
    });

    it('should handle Redis errors gracefully', async () => {
      vi.mocked(redis.keys).mockRejectedValue(new Error('Redis error'));

      const count = await SocraticAttemptTracker.cleanupOldAttempts('student123');

      expect(count).toBe(0);
    });
  });

  describe('integration scenarios', () => {
    it('should track multiple attempts and provide hint after 3', async () => {
      vi.mocked(redis.get).mockResolvedValue(null);
      vi.mocked(redis.setex).mockResolvedValue('OK');

      // First attempt
      let tracker = await SocraticAttemptTracker.trackAttempt(
        'student123',
        'question456',
        'First answer'
      );
      expect(SocraticAttemptTracker.shouldProvideHint(tracker.attemptCount)).toBe(false);

      // Mock existing tracker for subsequent attempts
      vi.mocked(redis.get).mockResolvedValue(JSON.stringify(tracker));

      // Second attempt
      tracker = await SocraticAttemptTracker.trackAttempt(
        'student123',
        'question456',
        'Second answer'
      );
      expect(SocraticAttemptTracker.shouldProvideHint(tracker.attemptCount)).toBe(false);

      vi.mocked(redis.get).mockResolvedValue(JSON.stringify(tracker));

      // Third attempt - should provide hint
      tracker = await SocraticAttemptTracker.trackAttempt(
        'student123',
        'question456',
        'Third answer'
      );
      expect(SocraticAttemptTracker.shouldProvideHint(tracker.attemptCount)).toBe(true);
    });

    it('should clear tracker after correct answer', async () => {
      const existingData = {
        studentId: 'student123',
        questionId: 'question456',
        attemptCount: 2,
        lastAttempt: '2024-01-15T10:00:00.000Z',
        previousResponses: ['First answer', 'Second answer']
      };

      vi.mocked(redis.get).mockResolvedValue(JSON.stringify(existingData));
      vi.mocked(redis.del).mockResolvedValue(1);

      // Student gets correct answer
      await SocraticAttemptTracker.clearAttemptTracker('student123', 'question456');

      expect(redis.del).toHaveBeenCalledWith('socratic:attempt:student123:question456');

      // Next attempt should start fresh
      vi.mocked(redis.get).mockResolvedValue(null);
      vi.mocked(redis.setex).mockResolvedValue('OK');

      const newTracker = await SocraticAttemptTracker.trackAttempt(
        'student123',
        'question456',
        'New question answer'
      );

      expect(newTracker.attemptCount).toBe(1);
    });
  });
});
