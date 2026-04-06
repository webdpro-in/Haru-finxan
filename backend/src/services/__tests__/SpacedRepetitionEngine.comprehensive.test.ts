/**
 * Comprehensive unit tests for SpacedRepetitionEngine (SM-2 Algorithm)
 * Targeting 90%+ coverage for core algorithm
 */

import { describe, it, expect } from 'vitest';
import { SpacedRepetitionEngine, type SpacedRepetitionData } from '../SpacedRepetitionEngine.js';

describe('SpacedRepetitionEngine - Comprehensive Coverage', () => {
  describe('calculateEasinessFactor', () => {
    it('should calculate EF correctly for quality 5 (perfect)', () => {
      const currentEF = 2.5;
      const quality = 5;
      const newEF = SpacedRepetitionEngine.calculateEasinessFactor(currentEF, quality);

      expect(newEF).toBeGreaterThan(currentEF);
      expect(newEF).toBeGreaterThanOrEqual(1.3);
    });

    it('should calculate EF correctly for quality 4 (good)', () => {
      const currentEF = 2.5;
      const quality = 4;
      const newEF = SpacedRepetitionEngine.calculateEasinessFactor(currentEF, quality);

      expect(newEF).toBeGreaterThanOrEqual(1.3);
    });

    it('should calculate EF correctly for quality 3 (passing)', () => {
      const currentEF = 2.5;
      const quality = 3;
      const newEF = SpacedRepetitionEngine.calculateEasinessFactor(currentEF, quality);

      expect(newEF).toBeGreaterThanOrEqual(1.3);
    });

    it('should calculate EF correctly for quality 2 (difficult)', () => {
      const currentEF = 2.5;
      const quality = 2;
      const newEF = SpacedRepetitionEngine.calculateEasinessFactor(currentEF, quality);

      expect(newEF).toBeLessThan(currentEF);
      expect(newEF).toBeGreaterThanOrEqual(1.3);
    });

    it('should calculate EF correctly for quality 1 (hard)', () => {
      const currentEF = 2.5;
      const quality = 1;
      const newEF = SpacedRepetitionEngine.calculateEasinessFactor(currentEF, quality);

      expect(newEF).toBeLessThan(currentEF);
      expect(newEF).toBeGreaterThanOrEqual(1.3);
    });

    it('should calculate EF correctly for quality 0 (complete blackout)', () => {
      const currentEF = 2.5;
      const quality = 0;
      const newEF = SpacedRepetitionEngine.calculateEasinessFactor(currentEF, quality);

      expect(newEF).toBeLessThan(currentEF);
      expect(newEF).toBeGreaterThanOrEqual(1.3);
    });

    it('should enforce minimum EF of 1.3', () => {
      const currentEF = 1.3;
      const quality = 0;
      const newEF = SpacedRepetitionEngine.calculateEasinessFactor(currentEF, quality);

      expect(newEF).toBeGreaterThanOrEqual(1.3);
    });

    it('should handle EF below minimum (should correct to 1.3)', () => {
      const currentEF = 1.0;
      const quality = 3;
      const newEF = SpacedRepetitionEngine.calculateEasinessFactor(currentEF, quality);

      expect(newEF).toBeGreaterThanOrEqual(1.3);
    });

    it('should throw error for quality < 0', () => {
      expect(() => {
        SpacedRepetitionEngine.calculateEasinessFactor(2.5, -1);
      }).toThrow('Quality rating must be between 0 and 5');
    });

    it('should throw error for quality > 5', () => {
      expect(() => {
        SpacedRepetitionEngine.calculateEasinessFactor(2.5, 6);
      }).toThrow('Quality rating must be between 0 and 5');
    });

    it('should handle very high EF', () => {
      const currentEF = 3.5;
      const quality = 5;
      const newEF = SpacedRepetitionEngine.calculateEasinessFactor(currentEF, quality);

      expect(newEF).toBeGreaterThanOrEqual(1.3);
    });

    it('should handle EF at minimum with perfect quality', () => {
      const currentEF = 1.3;
      const quality = 5;
      const newEF = SpacedRepetitionEngine.calculateEasinessFactor(currentEF, quality);

      expect(newEF).toBeGreaterThan(1.3);
    });
  });

  describe('calculateInterval', () => {
    it('should return 1 day for quality < 3 (REQ-2.6.4)', () => {
      const interval = SpacedRepetitionEngine.calculateInterval(6, 2.5, 2, 3);

      expect(interval).toBe(1);
    });

    it('should return 1 day for quality 0', () => {
      const interval = SpacedRepetitionEngine.calculateInterval(10, 2.5, 0, 5);

      expect(interval).toBe(1);
    });

    it('should return 1 day for quality 1', () => {
      const interval = SpacedRepetitionEngine.calculateInterval(10, 2.5, 1, 5);

      expect(interval).toBe(1);
    });

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
      const interval = SpacedRepetitionEngine.calculateInterval(5, 2.5, 4, 1);

      expect(interval).toBe(6);
    });

    it('should multiply by EF for subsequent reviews', () => {
      const currentInterval = 6;
      const easinessFactor = 2.5;
      const interval = SpacedRepetitionEngine.calculateInterval(currentInterval, easinessFactor, 4, 2);

      expect(interval).toBe(Math.round(6 * 2.5)); // 15
    });

    it('should round interval to nearest integer', () => {
      const currentInterval = 7;
      const easinessFactor = 2.3;
      const interval = SpacedRepetitionEngine.calculateInterval(currentInterval, easinessFactor, 4, 3);

      expect(Number.isInteger(interval)).toBe(true);
      expect(interval).toBe(Math.round(7 * 2.3)); // 16
    });

    it('should handle very large intervals', () => {
      const currentInterval = 100;
      const easinessFactor = 2.5;
      const interval = SpacedRepetitionEngine.calculateInterval(currentInterval, easinessFactor, 5, 10);

      expect(interval).toBe(250);
    });

    it('should handle minimum EF', () => {
      const currentInterval = 6;
      const easinessFactor = 1.3;
      const interval = SpacedRepetitionEngine.calculateInterval(currentInterval, easinessFactor, 4, 2);

      expect(interval).toBe(Math.round(6 * 1.3)); // 8
    });

    it('should handle quality exactly 3 (passing threshold)', () => {
      const interval = SpacedRepetitionEngine.calculateInterval(6, 2.5, 3, 2);

      expect(interval).toBeGreaterThan(1);
    });
  });

  describe('calculateNextReviewDate', () => {
    it('should calculate next review date correctly', () => {
      const currentDate = new Date('2024-01-01');
      const interval = 7;
      const nextDate = SpacedRepetitionEngine.calculateNextReviewDate(currentDate, interval);

      expect(nextDate.getDate()).toBe(8);
      expect(nextDate.getMonth()).toBe(0);
      expect(nextDate.getFullYear()).toBe(2024);
    });

    it('should handle interval of 0 days', () => {
      const currentDate = new Date('2024-01-01');
      const interval = 0;
      const nextDate = SpacedRepetitionEngine.calculateNextReviewDate(currentDate, interval);

      expect(nextDate.getDate()).toBe(1);
    });

    it('should handle interval of 1 day', () => {
      const currentDate = new Date('2024-01-01');
      const interval = 1;
      const nextDate = SpacedRepetitionEngine.calculateNextReviewDate(currentDate, interval);

      expect(nextDate.getDate()).toBe(2);
    });

    it('should handle month boundary', () => {
      const currentDate = new Date('2024-01-30');
      const interval = 5;
      const nextDate = SpacedRepetitionEngine.calculateNextReviewDate(currentDate, interval);

      expect(nextDate.getMonth()).toBe(1); // February
      expect(nextDate.getDate()).toBe(4);
    });

    it('should handle year boundary', () => {
      const currentDate = new Date('2024-12-30');
      const interval = 5;
      const nextDate = SpacedRepetitionEngine.calculateNextReviewDate(currentDate, interval);

      expect(nextDate.getFullYear()).toBe(2025);
      expect(nextDate.getMonth()).toBe(0); // January
    });

    it('should handle large intervals', () => {
      const currentDate = new Date('2024-01-01');
      const interval = 365;
      const nextDate = SpacedRepetitionEngine.calculateNextReviewDate(currentDate, interval);

      expect(nextDate.getFullYear()).toBe(2025);
    });

    it('should use current date when not provided', () => {
      const interval = 1;
      const nextDate = SpacedRepetitionEngine.calculateNextReviewDate(undefined, interval);

      expect(nextDate).toBeInstanceOf(Date);
      expect(nextDate.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('calculateNextReview', () => {
    it('should calculate all parameters correctly for passing quality', () => {
      const currentData: SpacedRepetitionData = {
        studentId: 'student_123',
        conceptId: 'concept_algebra',
        conceptName: 'Algebra',
        easinessFactor: 2.5,
        interval: 6,
        repetitions: 2,
        nextReviewDate: new Date(),
        lastReviewDate: new Date(),
        lastQuality: 4,
      };

      const result = SpacedRepetitionEngine.calculateNextReview(currentData, 4);

      expect(result.newEasinessFactor).toBeGreaterThanOrEqual(1.3);
      expect(result.newInterval).toBeGreaterThan(6);
      expect(result.repetitions).toBe(3);
      expect(result.nextReviewDate).toBeInstanceOf(Date);
    });

    it('should reset repetitions for failing quality', () => {
      const currentData: SpacedRepetitionData = {
        studentId: 'student_123',
        conceptId: 'concept_algebra',
        conceptName: 'Algebra',
        easinessFactor: 2.5,
        interval: 15,
        repetitions: 5,
        nextReviewDate: new Date(),
        lastReviewDate: new Date(),
        lastQuality: 4,
      };

      const result = SpacedRepetitionEngine.calculateNextReview(currentData, 2);

      expect(result.repetitions).toBe(0);
      expect(result.newInterval).toBe(1);
    });

    it('should increment repetitions for passing quality', () => {
      const currentData: SpacedRepetitionData = {
        studentId: 'student_123',
        conceptId: 'concept_algebra',
        conceptName: 'Algebra',
        easinessFactor: 2.5,
        interval: 6,
        repetitions: 3,
        nextReviewDate: new Date(),
        lastReviewDate: new Date(),
        lastQuality: 4,
      };

      const result = SpacedRepetitionEngine.calculateNextReview(currentData, 4);

      expect(result.repetitions).toBe(4);
    });

    it('should handle quality exactly 3 (boundary)', () => {
      const currentData: SpacedRepetitionData = {
        studentId: 'student_123',
        conceptId: 'concept_algebra',
        conceptName: 'Algebra',
        easinessFactor: 2.5,
        interval: 6,
        repetitions: 2,
        nextReviewDate: new Date(),
        lastReviewDate: new Date(),
        lastQuality: 3,
      };

      const result = SpacedRepetitionEngine.calculateNextReview(currentData, 3);

      expect(result.repetitions).toBe(3);
      expect(result.newInterval).toBeGreaterThan(1);
    });

    it('should handle first review', () => {
      const currentData: SpacedRepetitionData = {
        studentId: 'student_123',
        conceptId: 'concept_algebra',
        conceptName: 'Algebra',
        easinessFactor: 2.5,
        interval: 0,
        repetitions: 0,
        nextReviewDate: new Date(),
        lastReviewDate: new Date(),
        lastQuality: 0,
      };

      const result = SpacedRepetitionEngine.calculateNextReview(currentData, 4);

      expect(result.newInterval).toBe(1);
      expect(result.repetitions).toBe(1);
    });

    it('should handle perfect quality (5)', () => {
      const currentData: SpacedRepetitionData = {
        studentId: 'student_123',
        conceptId: 'concept_algebra',
        conceptName: 'Algebra',
        easinessFactor: 2.5,
        interval: 15,
        repetitions: 3,
        nextReviewDate: new Date(),
        lastReviewDate: new Date(),
        lastQuality: 4,
      };

      const result = SpacedRepetitionEngine.calculateNextReview(currentData, 5);

      expect(result.newEasinessFactor).toBeGreaterThan(2.5);
      expect(result.repetitions).toBe(4);
    });

    it('should handle complete failure (quality 0)', () => {
      const currentData: SpacedRepetitionData = {
        studentId: 'student_123',
        conceptId: 'concept_algebra',
        conceptName: 'Algebra',
        easinessFactor: 2.5,
        interval: 30,
        repetitions: 5,
        nextReviewDate: new Date(),
        lastReviewDate: new Date(),
        lastQuality: 4,
      };

      const result = SpacedRepetitionEngine.calculateNextReview(currentData, 0);

      expect(result.newInterval).toBe(1);
      expect(result.repetitions).toBe(0);
      expect(result.newEasinessFactor).toBeLessThan(2.5);
    });
  });

  describe('initializeSpacedRepetition', () => {
    it('should initialize with default values', () => {
      const data = SpacedRepetitionEngine.initializeSpacedRepetition(
        'student_123',
        'concept_algebra',
        'Algebra'
      );

      expect(data.studentId).toBe('student_123');
      expect(data.conceptId).toBe('concept_algebra');
      expect(data.conceptName).toBe('Algebra');
      expect(data.easinessFactor).toBe(2.5);
      expect(data.interval).toBe(0);
      expect(data.repetitions).toBe(0);
      expect(data.lastQuality).toBe(0);
      expect(data.nextReviewDate).toBeInstanceOf(Date);
      expect(data.lastReviewDate).toBeInstanceOf(Date);
    });

    it('should set nextReviewDate to now for immediate first review', () => {
      const before = Date.now();
      const data = SpacedRepetitionEngine.initializeSpacedRepetition(
        'student_123',
        'concept_algebra',
        'Algebra'
      );
      const after = Date.now();

      expect(data.nextReviewDate.getTime()).toBeGreaterThanOrEqual(before);
      expect(data.nextReviewDate.getTime()).toBeLessThanOrEqual(after);
    });
  });

  describe('updateAfterReview', () => {
    it('should update all fields correctly', () => {
      const currentData: SpacedRepetitionData = {
        studentId: 'student_123',
        conceptId: 'concept_algebra',
        conceptName: 'Algebra',
        easinessFactor: 2.5,
        interval: 6,
        repetitions: 2,
        nextReviewDate: new Date('2024-01-01'),
        lastReviewDate: new Date('2023-12-25'),
        lastQuality: 4,
      };

      const updated = SpacedRepetitionEngine.updateAfterReview(currentData, 5);

      expect(updated.studentId).toBe('student_123');
      expect(updated.conceptId).toBe('concept_algebra');
      expect(updated.conceptName).toBe('Algebra');
      expect(updated.easinessFactor).not.toBe(2.5);
      expect(updated.interval).not.toBe(6);
      expect(updated.repetitions).toBe(3);
      expect(updated.lastQuality).toBe(5);
      expect(updated.lastReviewDate.getTime()).toBeGreaterThan(currentData.lastReviewDate.getTime());
    });

    it('should preserve student and concept IDs', () => {
      const currentData: SpacedRepetitionData = {
        studentId: 'student_456',
        conceptId: 'concept_geometry',
        conceptName: 'Geometry',
        easinessFactor: 2.0,
        interval: 3,
        repetitions: 1,
        nextReviewDate: new Date(),
        lastReviewDate: new Date(),
        lastQuality: 3,
      };

      const updated = SpacedRepetitionEngine.updateAfterReview(currentData, 4);

      expect(updated.studentId).toBe('student_456');
      expect(updated.conceptId).toBe('concept_geometry');
      expect(updated.conceptName).toBe('Geometry');
    });

    it('should update lastReviewDate to current time', () => {
      const currentData: SpacedRepetitionData = {
        studentId: 'student_123',
        conceptId: 'concept_algebra',
        conceptName: 'Algebra',
        easinessFactor: 2.5,
        interval: 6,
        repetitions: 2,
        nextReviewDate: new Date(),
        lastReviewDate: new Date('2023-01-01'),
        lastQuality: 4,
      };

      const before = Date.now();
      const updated = SpacedRepetitionEngine.updateAfterReview(currentData, 4);
      const after = Date.now();

      expect(updated.lastReviewDate.getTime()).toBeGreaterThanOrEqual(before);
      expect(updated.lastReviewDate.getTime()).toBeLessThanOrEqual(after);
    });
  });

  describe('Integration - Complete Review Cycle', () => {
    it('should handle complete review cycle from initialization to mastery', () => {
      // Initialize
      let data = SpacedRepetitionEngine.initializeSpacedRepetition(
        'student_123',
        'concept_algebra',
        'Algebra'
      );

      expect(data.interval).toBe(0);
      expect(data.repetitions).toBe(0);

      // First review - good performance
      data = SpacedRepetitionEngine.updateAfterReview(data, 4);
      expect(data.interval).toBe(1);
      expect(data.repetitions).toBe(1);

      // Second review - good performance
      data = SpacedRepetitionEngine.updateAfterReview(data, 4);
      expect(data.interval).toBe(6);
      expect(data.repetitions).toBe(2);

      // Third review - excellent performance
      data = SpacedRepetitionEngine.updateAfterReview(data, 5);
      expect(data.interval).toBeGreaterThan(6);
      expect(data.repetitions).toBe(3);
      expect(data.easinessFactor).toBeGreaterThan(2.5);
    });

    it('should handle review cycle with failure and recovery', () => {
      // Initialize
      let data = SpacedRepetitionEngine.initializeSpacedRepetition(
        'student_123',
        'concept_algebra',
        'Algebra'
      );

      // First review - good
      data = SpacedRepetitionEngine.updateAfterReview(data, 4);
      expect(data.repetitions).toBe(1);

      // Second review - failure
      data = SpacedRepetitionEngine.updateAfterReview(data, 2);
      expect(data.interval).toBe(1);
      expect(data.repetitions).toBe(0);

      // Third review - recovery
      data = SpacedRepetitionEngine.updateAfterReview(data, 4);
      expect(data.interval).toBe(1);
      expect(data.repetitions).toBe(1);

      // Fourth review - good
      data = SpacedRepetitionEngine.updateAfterReview(data, 4);
      expect(data.interval).toBe(6);
      expect(data.repetitions).toBe(2);
    });

    it('should maintain EF >= 1.3 throughout cycle', () => {
      let data = SpacedRepetitionEngine.initializeSpacedRepetition(
        'student_123',
        'concept_algebra',
        'Algebra'
      );

      // Simulate many failures
      for (let i = 0; i < 10; i++) {
        data = SpacedRepetitionEngine.updateAfterReview(data, 0);
        expect(data.easinessFactor).toBeGreaterThanOrEqual(1.3);
      }
    });
  });
});
