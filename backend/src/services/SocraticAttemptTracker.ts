/**
 * Socratic Attempt Tracker
 * 
 * Tracks student attempts for Socratic Mode questions with Redis persistence.
 * Implements hint system after 3 unsuccessful attempts.
 * 
 * Requirements:
 * - REQ-2.5.4: Provide hints after 3 unsuccessful attempts
 */

import { redis } from '../config/redis';
import { AttemptTracker } from './SocraticMode';

export class SocraticAttemptTracker {
  private static readonly ATTEMPT_TTL = 3600; // 1 hour
  private static readonly KEY_PREFIX = 'socratic:attempt:';

  /**
   * Get attempt tracker for a student and question
   */
  static async getAttemptTracker(
    studentId: string,
    questionId: string
  ): Promise<AttemptTracker | null> {
    try {
      const key = this.buildKey(studentId, questionId);
      const data = await redis.get(key);
      
      if (!data) {
        return null;
      }

      const parsed = JSON.parse(data);
      return {
        ...parsed,
        lastAttempt: new Date(parsed.lastAttempt)
      };
    } catch (error) {
      console.error('Error getting attempt tracker:', error);
      return null;
    }
  }

  /**
   * Save attempt tracker
   */
  static async saveAttemptTracker(tracker: AttemptTracker): Promise<void> {
    try {
      const key = this.buildKey(tracker.studentId, tracker.questionId);
      await redis.setex(
        key,
        this.ATTEMPT_TTL,
        JSON.stringify(tracker)
      );
    } catch (error) {
      console.error('Error saving attempt tracker:', error);
      throw error;
    }
  }

  /**
   * Track a new attempt
   */
  static async trackAttempt(
    studentId: string,
    questionId: string,
    response: string
  ): Promise<AttemptTracker> {
    const existingTracker = await this.getAttemptTracker(studentId, questionId);
    
    const tracker: AttemptTracker = existingTracker
      ? {
          ...existingTracker,
          attemptCount: existingTracker.attemptCount + 1,
          lastAttempt: new Date(),
          previousResponses: [...existingTracker.previousResponses, response]
        }
      : {
          studentId,
          questionId,
          attemptCount: 1,
          lastAttempt: new Date(),
          previousResponses: [response]
        };

    await this.saveAttemptTracker(tracker);
    return tracker;
  }

  /**
   * Clear attempt tracker (e.g., when student gets correct answer)
   */
  static async clearAttemptTracker(
    studentId: string,
    questionId: string
  ): Promise<void> {
    try {
      const key = this.buildKey(studentId, questionId);
      await redis.del(key);
    } catch (error) {
      console.error('Error clearing attempt tracker:', error);
    }
  }

  /**
   * Get all active attempt trackers for a student
   */
  static async getStudentAttempts(studentId: string): Promise<AttemptTracker[]> {
    try {
      const pattern = `${this.KEY_PREFIX}${studentId}:*`;
      const keys = await redis.keys(pattern);
      
      if (keys.length === 0) {
        return [];
      }

      const trackers: AttemptTracker[] = [];
      for (const key of keys) {
        const data = await redis.get(key);
        if (data) {
          const parsed = JSON.parse(data);
          trackers.push({
            ...parsed,
            lastAttempt: new Date(parsed.lastAttempt)
          });
        }
      }

      return trackers;
    } catch (error) {
      console.error('Error getting student attempts:', error);
      return [];
    }
  }

  /**
   * Check if hint should be provided based on attempt count
   */
  static shouldProvideHint(attemptCount: number): boolean {
    return attemptCount >= 3;
  }

  /**
   * Build Redis key for attempt tracker
   */
  private static buildKey(studentId: string, questionId: string): string {
    return `${this.KEY_PREFIX}${studentId}:${questionId}`;
  }

  /**
   * Clean up old attempt trackers (for maintenance)
   * This is automatically handled by Redis TTL, but can be called manually
   */
  static async cleanupOldAttempts(studentId: string): Promise<number> {
    try {
      const pattern = `${this.KEY_PREFIX}${studentId}:*`;
      const keys = await redis.keys(pattern);
      
      if (keys.length === 0) {
        return 0;
      }

      let deletedCount = 0;
      for (const key of keys) {
        const ttl = await redis.ttl(key);
        // Delete if TTL is expired or very close to expiring
        if (ttl < 60) {
          await redis.del(key);
          deletedCount++;
        }
      }

      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up old attempts:', error);
      return 0;
    }
  }
}
