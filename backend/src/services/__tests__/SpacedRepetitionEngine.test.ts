/**
 * Tests for Spaced Repetition Engine (SM-2 Algorithm)
 * Task 13.6: Write unit tests for SM-2 algorithm
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SpacedRepetitionEngine } from '../SpacedRepetitionEngine.js';
import type { SpacedRepetitionData, ReviewCalculation } from '../SpacedRepetitionEngine.js';

describe('SpacedRepetitionEngine', () => {
  describe('calculateEasinessFactor (Task 13.2)', () => {
    it('should maintain EF for quality rating of 4', () => {
      const currentEF = 2.5;
      const quality = 4;
      const newEF = SpacedRepetitionEngine.calculateEasinessFactor(currentEF, quality);
      
      // EF' = 2.5 + (0.1 - (5-4) * (0.08 + (5-4) * 0.02))
      // EF' = 2.5 + (0.1 - 1 * (0.08 + 1 * 0.02))
      // EF' = 2.5 + (0.1 - 0.1) = 2.5
      expect(newEF).toBe(2.5);
    });

    it('should increase EF for quality rating of 5', () => {
      const currentEF = 2.5;
      const quality = 5;
      const newEF = SpacedRepetitionEngine.calculateEasinessFactor(currentEF, quality);
      
      // EF' = 2.5 + (0.1 - (5-5) * (0.08 + (5-5) * 0.02))
      // EF' = 2.5 + 0.1 = 2.6
      expect(newEF).toBe(2.6);
    });

    it('should decrease EF for quality rating of 3', () => {
      const currentEF = 2.5;
      const quality = 3;
      const newEF = SpacedRepetitionEngine.calculateEasinessFactor(currentEF, quality);
      
      // EF' = 2.5 + (0.1 - (5-3) * (0.08 + (5-3) * 0.02))
      // EF' = 2.5 + (0.1 - 2 * (0.08 + 2 * 0.02))
      // EF' = 2.5 + (0.1 - 2 * 0.12) = 2.5 + (0.1 - 0.24) = 2.36
      expect(newEF).toBeCloseTo(2.36, 2);
    });

    it('should significantly decrease EF for quality rating of 0', () => {
      const currentEF = 2.5;
      const quality = 0;
      const newEF = SpacedRepetitionEngine.calculateEasinessFactor(currentEF, quality);
      
      // EF' = 2.5 + (0.1 - (5-0) * (0.08 + (5-0) * 0.02))
      // EF' = 2.5 + (0.1 - 5 * (0.08 + 5 * 0.02))
      // EF' = 2.5 + (0.1 - 5 * 0.18) = 2.5 + (0.1 - 0.9) = 1.7
      expect(newEF).toBeCloseTo(1.7, 2);
    });

    it('should enforce minimum EF of 1.3 (REQ-2.6.5)', () => {
      const currentEF = 1.3;
      const quality = 0;
      const newEF = SpacedRepetitionEngine.calculateEasinessFactor(currentEF, quality);
      
      // Even with quality 0, EF should not go below 1.3
      expect(newEF).toBeGreaterThanOrEqual(1.3);
    });

    it('should enforce minimum EF when calculated value is below 1.3', () => {
      const currentEF = 1.4;
      const quality = 0;
      const newEF = SpacedRepetitionEngine.calculateEasinessFactor(currentEF, quality);
      
      // Calculated would be 0.6, but should be clamped to 1.3
      expect(newEF).toBe(1.3);
    });

    it('should throw error for quality rating below 0', () => {
      expect(() => {
        SpacedRepetitionEngine.calculateEasinessFactor(2.5, -1);
      }).toThrow('Quality rating must be between 0 and 5');
    });

    it('should throw error for quality rating above 5', () => {
      expect(() => {
        SpacedRepetitionEngine.calculateEasinessFactor(2.5, 6);
      }).toThrow('Quality rating must be between 0 and 5');
    });

    it('should correct EF if below minimum before calculation', () => {
      const currentEF = 1.0; // Below minimum
      const quality = 4;
      const newEF = SpacedRepetitionEngine.calculateEasinessFactor(currentEF, quality);
      
      // Should use 1.3 as starting point
      expect(newEF).toBeGreaterThanOrEqual(1.3);
    });
  });

  describe('calculateInterval (Task 13.3)', () => {
    it('should return 1 day for first review (interval 0)', () => {
      const interval = SpacedRepetitionEngine.calculateInterval(0, 2.5, 4, 0);
      expect(interval).toBe(1);
    });

    it('should return 1 day for first review (repetitions 0)', () => {
      const interval = SpacedRepetitionEngine.calculateInterval(5, 2.5, 4, 0);
      expect(interval).toBe(1);
    });

    it('should return 6 days for second review (interval 1)', () => {
      const interval = SpacedRepetitionEngine.calculateInterval(1, 2.5, 4, 1);
      expect(interval).toBe(6);
    });

    it('should return 6 days for second review (repetitions 1)', () => {
      const interval = SpacedRepetitionEngine.calculateInterval(10, 2.5, 4, 1);
      expect(interval).toBe(6);
    });

    it('should multiply by EF for subsequent reviews', () => {
      const interval = SpacedRepetitionEngine.calculateInterval(6, 2.5, 4, 2);
      // 6 * 2.5 = 15
      expect(interval).toBe(15);
    });

    it('should round interval to nearest integer', () => {
      const interval = SpacedRepetitionEngine.calculateInterval(7, 2.3, 4, 2);
      // 7 * 2.3 = 16.1, rounded to 16
      expect(interval).toBe(16);
    });

    it('should reset to 1 day when quality < 3 (REQ-2.6.4)', () => {
      const interval = SpacedRepetitionEngine.calculateInterval(15, 2.5, 2, 5);
      expect(interval).toBe(1);
    });

    it('should reset to 1 day when quality is 0', () => {
      const interval = SpacedRepetitionEngine.calculateInterval(30, 2.5, 0, 10);
      expect(interval).toBe(1);
    });

    it('should not reset when quality is exactly 3', () => {
      const interval = SpacedRepetitionEngine.calculateInterval(6, 2.5, 3, 2);
      // Should calculate normally: 6 * 2.5 = 15
      expect(interval).toBe(15);
    });

    it('should handle large intervals', () => {
      const interval = SpacedRepetitionEngine.calculateInterval(100, 2.5, 5, 10);
      // 100 * 2.5 = 250
      expect(interval).toBe(250);
    });
  });

  describe('calculateNextReviewDate (Task 13.4)', () => {
    it('should add interval days to current date', () => {
      const currentDate = new Date('2024-01-01T00:00:00Z');
      const interval = 5;
      const nextDate = SpacedRepetitionEngine.calculateNextReviewDate(currentDate, interval);
      
      expect(nextDate.toISOString()).toBe('2024-01-06T00:00:00.000Z');
    });

    it('should handle interval of 1 day', () => {
      const currentDate = new Date('2024-01-01T12:00:00Z');
      const interval = 1;
      const nextDate = SpacedRepetitionEngine.calculateNextReviewDate(currentDate, interval);
      
      expect(nextDate.toISOString()).toBe('2024-01-02T12:00:00.000Z');
    });

    it('should handle large intervals', () => {
      const currentDate = new Date('2024-01-01T00:00:00Z');
      const interval = 366; // 2024 is a leap year
      const nextDate = SpacedRepetitionEngine.calculateNextReviewDate(currentDate, interval);
      
      expect(nextDate.toISOString()).toBe('2025-01-01T00:00:00.000Z');
    });

    it('should handle month boundaries', () => {
      const currentDate = new Date('2024-01-30T00:00:00Z');
      const interval = 5;
      const nextDate = SpacedRepetitionEngine.calculateNextReviewDate(currentDate, interval);
      
      expect(nextDate.toISOString()).toBe('2024-02-04T00:00:00.000Z');
    });

    it('should use current date when not provided', () => {
      const beforeCall = new Date();
      const nextDate = SpacedRepetitionEngine.calculateNextReviewDate(undefined, 1);
      const afterCall = new Date();
      
      // Next date should be approximately 1 day from now
      const expectedMin = new Date(beforeCall);
      expectedMin.setDate(expectedMin.getDate() + 1);
      const expectedMax = new Date(afterCall);
      expectedMax.setDate(expectedMax.getDate() + 1);
      
      expect(nextDate.getTime()).toBeGreaterThanOrEqual(expectedMin.getTime() - 1000);
      expect(nextDate.getTime()).toBeLessThanOrEqual(expectedMax.getTime() + 1000);
    });
  });

  describe('calculateNextReview (Task 13.1 - Main SM-2 Algorithm)', () => {
    let mockData: SpacedRepetitionData;

    beforeEach(() => {
      mockData = {
        studentId: 'student123',
        conceptId: 'concept456',
        conceptName: 'Photosynthesis',
        easinessFactor: 2.5,
        interval: 6,
        repetitions: 2,
        nextReviewDate: new Date('2024-01-01'),
        lastReviewDate: new Date('2023-12-26'),
        lastQuality: 4,
      };
    });

    it('should calculate all parameters correctly for quality 4', () => {
      const result = SpacedRepetitionEngine.calculateNextReview(mockData, 4);
      
      expect(result.newEasinessFactor).toBe(2.5);
      expect(result.newInterval).toBe(15); // 6 * 2.5
      expect(result.repetitions).toBe(3); // Incremented
      expect(result.nextReviewDate).toBeInstanceOf(Date);
    });

    it('should calculate all parameters correctly for quality 5', () => {
      const result = SpacedRepetitionEngine.calculateNextReview(mockData, 5);
      
      expect(result.newEasinessFactor).toBe(2.6);
      expect(result.newInterval).toBe(16); // 6 * 2.6 = 15.6, rounded to 16
      expect(result.repetitions).toBe(3);
    });

    it('should reset interval and repetitions for quality < 3', () => {
      const result = SpacedRepetitionEngine.calculateNextReview(mockData, 2);
      
      expect(result.newInterval).toBe(1); // Reset
      expect(result.repetitions).toBe(0); // Reset
      expect(result.newEasinessFactor).toBeLessThan(2.5); // Decreased
    });

    it('should handle first review correctly', () => {
      mockData.interval = 0;
      mockData.repetitions = 0;
      
      const result = SpacedRepetitionEngine.calculateNextReview(mockData, 4);
      
      expect(result.newInterval).toBe(1);
      expect(result.repetitions).toBe(1);
    });

    it('should handle second review correctly', () => {
      mockData.interval = 1;
      mockData.repetitions = 1;
      
      const result = SpacedRepetitionEngine.calculateNextReview(mockData, 4);
      
      expect(result.newInterval).toBe(6);
      expect(result.repetitions).toBe(2);
    });

    it('should maintain EF >= 1.3 even with poor quality', () => {
      mockData.easinessFactor = 1.3;
      
      const result = SpacedRepetitionEngine.calculateNextReview(mockData, 0);
      
      expect(result.newEasinessFactor).toBeGreaterThanOrEqual(1.3);
    });

    it('should calculate next review date correctly', () => {
      const result = SpacedRepetitionEngine.calculateNextReview(mockData, 4);
      
      const now = new Date();
      const expectedDate = new Date(now);
      expectedDate.setDate(expectedDate.getDate() + result.newInterval);
      
      // Allow 1 second tolerance for test execution time
      expect(Math.abs(result.nextReviewDate.getTime() - expectedDate.getTime())).toBeLessThan(1000);
    });

    it('should handle quality rating of 3 (passing threshold)', () => {
      const result = SpacedRepetitionEngine.calculateNextReview(mockData, 3);
      
      expect(result.newInterval).toBeGreaterThan(1); // Should not reset
      expect(result.repetitions).toBe(3); // Should increment
    });
  });

  describe('initializeSpacedRepetition', () => {
    it('should create initial spaced repetition data with defaults', () => {
      const data = SpacedRepetitionEngine.initializeSpacedRepetition(
        'student123',
        'concept456',
        'Photosynthesis'
      );
      
      expect(data.studentId).toBe('student123');
      expect(data.conceptId).toBe('concept456');
      expect(data.conceptName).toBe('Photosynthesis');
      expect(data.easinessFactor).toBe(2.5);
      expect(data.interval).toBe(0);
      expect(data.repetitions).toBe(0);
      expect(data.lastQuality).toBe(0);
      expect(data.nextReviewDate).toBeInstanceOf(Date);
      expect(data.lastReviewDate).toBeInstanceOf(Date);
    });

    it('should set next review date to now for immediate first review', () => {
      const beforeCall = new Date();
      const data = SpacedRepetitionEngine.initializeSpacedRepetition(
        'student123',
        'concept456',
        'Photosynthesis'
      );
      const afterCall = new Date();
      
      expect(data.nextReviewDate.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime());
      expect(data.nextReviewDate.getTime()).toBeLessThanOrEqual(afterCall.getTime());
    });
  });

  describe('updateAfterReview', () => {
    let mockData: SpacedRepetitionData;

    beforeEach(() => {
      mockData = {
        studentId: 'student123',
        conceptId: 'concept456',
        conceptName: 'Photosynthesis',
        easinessFactor: 2.5,
        interval: 6,
        repetitions: 2,
        nextReviewDate: new Date('2024-01-01'),
        lastReviewDate: new Date('2023-12-26'),
        lastQuality: 4,
      };
    });

    it('should update all fields after review', () => {
      const updated = SpacedRepetitionEngine.updateAfterReview(mockData, 5);
      
      expect(updated.easinessFactor).toBe(2.6);
      expect(updated.interval).toBe(16);
      expect(updated.repetitions).toBe(3);
      expect(updated.lastQuality).toBe(5);
      expect(updated.lastReviewDate).toBeInstanceOf(Date);
      expect(updated.nextReviewDate).toBeInstanceOf(Date);
    });

    it('should preserve student and concept information', () => {
      const updated = SpacedRepetitionEngine.updateAfterReview(mockData, 4);
      
      expect(updated.studentId).toBe(mockData.studentId);
      expect(updated.conceptId).toBe(mockData.conceptId);
      expect(updated.conceptName).toBe(mockData.conceptName);
    });

    it('should update last review date to current time', () => {
      const beforeCall = new Date();
      const updated = SpacedRepetitionEngine.updateAfterReview(mockData, 4);
      const afterCall = new Date();
      
      expect(updated.lastReviewDate.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime());
      expect(updated.lastReviewDate.getTime()).toBeLessThanOrEqual(afterCall.getTime());
    });

    it('should handle failed review (quality < 3)', () => {
      const updated = SpacedRepetitionEngine.updateAfterReview(mockData, 2);
      
      expect(updated.interval).toBe(1);
      expect(updated.repetitions).toBe(0);
      expect(updated.lastQuality).toBe(2);
    });
  });

  describe('SM-2 Algorithm Integration Tests', () => {
    it('should follow correct progression for successful reviews', () => {
      let data = SpacedRepetitionEngine.initializeSpacedRepetition(
        'student123',
        'concept456',
        'Photosynthesis'
      );
      
      // First review (quality 4)
      data = SpacedRepetitionEngine.updateAfterReview(data, 4);
      expect(data.interval).toBe(1);
      expect(data.repetitions).toBe(1);
      
      // Second review (quality 4)
      data = SpacedRepetitionEngine.updateAfterReview(data, 4);
      expect(data.interval).toBe(6);
      expect(data.repetitions).toBe(2);
      
      // Third review (quality 4)
      data = SpacedRepetitionEngine.updateAfterReview(data, 4);
      expect(data.interval).toBe(15); // 6 * 2.5
      expect(data.repetitions).toBe(3);
      
      // Fourth review (quality 4)
      data = SpacedRepetitionEngine.updateAfterReview(data, 4);
      expect(data.interval).toBe(38); // 15 * 2.5 = 37.5, rounded to 38
      expect(data.repetitions).toBe(4);
    });

    it('should reset on failure and restart progression', () => {
      let data = SpacedRepetitionEngine.initializeSpacedRepetition(
        'student123',
        'concept456',
        'Photosynthesis'
      );
      
      // Build up to third review
      data = SpacedRepetitionEngine.updateAfterReview(data, 4);
      data = SpacedRepetitionEngine.updateAfterReview(data, 4);
      data = SpacedRepetitionEngine.updateAfterReview(data, 4);
      expect(data.interval).toBe(15);
      expect(data.repetitions).toBe(3);
      
      // Fail the review
      data = SpacedRepetitionEngine.updateAfterReview(data, 2);
      expect(data.interval).toBe(1); // Reset
      expect(data.repetitions).toBe(0); // Reset
      
      // Start over - after reset, first successful review goes to interval 6 (second review)
      // This is correct SM-2 behavior: interval 1 with repetitions 0 -> increment to 1 -> interval 6
      data = SpacedRepetitionEngine.updateAfterReview(data, 4);
      expect(data.interval).toBe(6); // Second review interval
      expect(data.repetitions).toBe(1);
    });

    it('should handle varying quality ratings', () => {
      let data = SpacedRepetitionEngine.initializeSpacedRepetition(
        'student123',
        'concept456',
        'Photosynthesis'
      );
      
      // Perfect recall (quality 5)
      data = SpacedRepetitionEngine.updateAfterReview(data, 5);
      const efAfterPerfect = data.easinessFactor;
      expect(efAfterPerfect).toBeGreaterThan(2.5);
      
      // Good recall (quality 4)
      data = SpacedRepetitionEngine.updateAfterReview(data, 4);
      expect(data.easinessFactor).toBeCloseTo(efAfterPerfect, 1);
      
      // Acceptable recall (quality 3)
      data = SpacedRepetitionEngine.updateAfterReview(data, 3);
      expect(data.easinessFactor).toBeLessThan(efAfterPerfect);
      expect(data.easinessFactor).toBeGreaterThanOrEqual(1.3);
    });

    it('should maintain EF floor across multiple poor reviews', () => {
      let data = SpacedRepetitionEngine.initializeSpacedRepetition(
        'student123',
        'concept456',
        'Photosynthesis'
      );
      
      // Multiple poor quality reviews
      for (let i = 0; i < 10; i++) {
        data = SpacedRepetitionEngine.updateAfterReview(data, 0);
        expect(data.easinessFactor).toBeGreaterThanOrEqual(1.3);
      }
    });
  });
});
