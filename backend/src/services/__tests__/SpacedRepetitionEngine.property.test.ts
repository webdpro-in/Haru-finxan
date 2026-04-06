/**
 * Property-Based Tests for Spaced Repetition Engine (SM-2 Algorithm)
 * Task 34.3: Write property tests for SM-2 algorithm
 * 
 * **Validates: Requirements 2.6.1, 2.6.2, 2.6.3, 2.6.4, 2.6.5**
 * 
 * Tests invariants that must hold for all possible inputs:
 * 1. Easiness Factor (EF) must always be >= 1.3 (REQ-2.6.5)
 * 2. Interval must always be >= 1 day (REQ-2.6.1)
 * 3. Repetitions must be >= 0
 * 4. Quality ratings outside 0-5 should be rejected (REQ-2.6.3)
 * 5. Next review date must be in the future
 * 6. Quality < 3 must reset interval to 1 day (REQ-2.6.4)
 * 
 * Uses fast-check library for comprehensive property-based testing
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { SpacedRepetitionEngine } from '../SpacedRepetitionEngine.js';
import type { SpacedRepetitionData } from '../SpacedRepetitionEngine.js';

describe('SpacedRepetitionEngine Property-Based Tests', () => {
  /**
   * Arbitraries (generators) for property-based testing
   */
  const validQuality = fc.integer({ min: 0, max: 5 });
  const invalidQuality = fc.oneof(
    fc.integer({ max: -1 }),
    fc.integer({ min: 6 })
  );
  const easinessFactor = fc.double({ min: 1.3, max: 4.0, noNaN: true });
  const interval = fc.integer({ min: 0, max: 365 });
  const repetitions = fc.integer({ min: 0, max: 100 });
  const positiveInterval = fc.integer({ min: 1, max: 365 });

  /**
   * Helper function to create test data with specified values
   */
  function createSpacedRepetitionData(
    easinessFactor: number = 2.5,
    interval: number = 6,
    repetitions: number = 2
  ): SpacedRepetitionData {
    return {
      studentId: 'student_test',
      conceptId: 'concept_test',
      conceptName: 'Test Concept',
      easinessFactor,
      interval,
      repetitions,
      nextReviewDate: new Date(),
      lastReviewDate: new Date(),
      lastQuality: 4,
    };
  }

  describe('Easiness Factor (EF) Invariants', () => {
    it('Property: EF must always be >= 1.3 for any quality rating (REQ-2.6.5)', () => {
      fc.assert(
        fc.property(easinessFactor, validQuality, (startingEF, quality) => {
          const newEF = SpacedRepetitionEngine.calculateEasinessFactor(startingEF, quality);
          
          expect(newEF).toBeGreaterThanOrEqual(1.3);
          expect(newEF).toBeLessThanOrEqual(10); // Reasonable upper bound
        }),
        { numRuns: 1000 }
      );
    });

    it('Property: EF must be >= 1.3 even with consecutive poor quality ratings', () => {
      fc.assert(
        fc.property(easinessFactor, (startingEF) => {
          let currentEF = startingEF;
          
          // Apply 20 consecutive quality 0 ratings
          for (let i = 0; i < 20; i++) {
            currentEF = SpacedRepetitionEngine.calculateEasinessFactor(currentEF, 0);
            expect(currentEF).toBeGreaterThanOrEqual(1.3);
          }
          
          // EF should be at minimum
          expect(currentEF).toBe(1.3);
        }),
        { numRuns: 100 }
      );
    });

    it('Property: EF must remain >= 1.3 even when starting below minimum', () => {
      fc.assert(
        fc.property(
          fc.double({ min: -10, max: 1.2, noNaN: true }),
          validQuality,
          (invalidEF, quality) => {
            const newEF = SpacedRepetitionEngine.calculateEasinessFactor(invalidEF, quality);
            expect(newEF).toBeGreaterThanOrEqual(1.3);
          }
        ),
        { numRuns: 500 }
      );
    });

    it('Property: EF should increase with quality 5, maintain with quality 4, decrease with quality < 4', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 1.5, max: 3.5, noNaN: true }),
          (startingEF) => {
            // Quality 5 should increase EF
            const efAfter5 = SpacedRepetitionEngine.calculateEasinessFactor(startingEF, 5);
            expect(efAfter5).toBeGreaterThan(startingEF);
            
            // Quality 4 should maintain EF
            const efAfter4 = SpacedRepetitionEngine.calculateEasinessFactor(startingEF, 4);
            expect(efAfter4).toBe(startingEF);
            
            // Quality 3 should decrease EF
            const efAfter3 = SpacedRepetitionEngine.calculateEasinessFactor(startingEF, 3);
            expect(efAfter3).toBeLessThan(startingEF);
            
            // Quality 0 should significantly decrease EF
            const efAfter0 = SpacedRepetitionEngine.calculateEasinessFactor(startingEF, 0);
            expect(efAfter0).toBeLessThan(startingEF);
          }
        ),
        { numRuns: 200 }
      );
    });

    it('Property: EF calculation must be deterministic', () => {
      fc.assert(
        fc.property(easinessFactor, validQuality, (ef, quality) => {
          const result1 = SpacedRepetitionEngine.calculateEasinessFactor(ef, quality);
          const result2 = SpacedRepetitionEngine.calculateEasinessFactor(ef, quality);
          
          expect(result1).toBe(result2);
        }),
        { numRuns: 500 }
      );
    });

    it('Property: EF changes are bounded and predictable', () => {
      fc.assert(
        fc.property(easinessFactor, validQuality, (ef, quality) => {
          const newEF = SpacedRepetitionEngine.calculateEasinessFactor(ef, quality);
          const change = Math.abs(newEF - ef);
          
          // EF should not change by more than 0.8 in a single step
          expect(change).toBeLessThanOrEqual(0.8);
        }),
        { numRuns: 500 }
      );
    });
  });

  describe('Interval Invariants', () => {
    it('Property: Interval must always be >= 1 day for any valid inputs (REQ-2.6.1)', () => {
      fc.assert(
        fc.property(
          interval,
          easinessFactor,
          validQuality,
          repetitions,
          (currentInterval, ef, quality, reps) => {
            const newInterval = SpacedRepetitionEngine.calculateInterval(
              currentInterval,
              ef,
              quality,
              reps
            );
            
            expect(newInterval).toBeGreaterThanOrEqual(1);
            expect(Number.isInteger(newInterval)).toBe(true);
          }
        ),
        { numRuns: 1000 }
      );
    });

    it('Property: Interval must reset to 1 when quality < 3 (REQ-2.6.4)', () => {
      fc.assert(
        fc.property(
          positiveInterval,
          easinessFactor,
          fc.integer({ min: 0, max: 2 }),
          repetitions,
          (currentInterval, ef, quality, reps) => {
            const newInterval = SpacedRepetitionEngine.calculateInterval(
              currentInterval,
              ef,
              quality,
              reps
            );
            
            expect(newInterval).toBe(1);
          }
        ),
        { numRuns: 500 }
      );
    });

    it('Property: First review (interval 0 or repetitions 0) must always be 1 day', () => {
      fc.assert(
        fc.property(
          easinessFactor,
          fc.integer({ min: 3, max: 5 }),
          (ef, quality) => {
            // Test interval 0
            const interval1 = SpacedRepetitionEngine.calculateInterval(0, ef, quality, 5);
            expect(interval1).toBe(1);
            
            // Test repetitions 0
            const interval2 = SpacedRepetitionEngine.calculateInterval(10, ef, quality, 0);
            expect(interval2).toBe(1);
          }
        ),
        { numRuns: 200 }
      );
    });

    it('Property: Second review (interval 1 or repetitions 1) must always be 6 days', () => {
      fc.assert(
        fc.property(
          easinessFactor,
          fc.integer({ min: 3, max: 5 }),
          (ef, quality) => {
            // Test interval 1
            const interval1 = SpacedRepetitionEngine.calculateInterval(1, ef, quality, 5);
            expect(interval1).toBe(6);
            
            // Test repetitions 1
            const interval2 = SpacedRepetitionEngine.calculateInterval(10, ef, quality, 1);
            expect(interval2).toBe(6);
          }
        ),
        { numRuns: 200 }
      );
    });

    it('Property: Interval must grow exponentially for successful reviews', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 1.5, max: 3.0, noNaN: true }),
          (ef) => {
            let interval = 6;
            let repetitions = 2;
            const quality = 4;
            
            for (let i = 0; i < 5; i++) {
              const newInterval = SpacedRepetitionEngine.calculateInterval(
                interval,
                ef,
                quality,
                repetitions
              );
              
              // New interval should be larger than previous
              expect(newInterval).toBeGreaterThan(interval);
              
              // Should be approximately interval * EF
              const expectedInterval = Math.round(interval * ef);
              expect(newInterval).toBe(expectedInterval);
              
              interval = newInterval;
              repetitions++;
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property: Interval calculation must be deterministic', () => {
      fc.assert(
        fc.property(
          interval,
          easinessFactor,
          validQuality,
          repetitions,
          (int, ef, quality, reps) => {
            const result1 = SpacedRepetitionEngine.calculateInterval(int, ef, quality, reps);
            const result2 = SpacedRepetitionEngine.calculateInterval(int, ef, quality, reps);
            
            expect(result1).toBe(result2);
          }
        ),
        { numRuns: 500 }
      );
    });

    it('Property: Intervals grow monotonically with successful reviews', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 1.3, max: 3.0, noNaN: true }),
          fc.integer({ min: 3, max: 5 }),
          (ef, quality) => {
            const intervals: number[] = [];
            let currentInterval = 6;
            let reps = 2;
            
            for (let i = 0; i < 10; i++) {
              const newInterval = SpacedRepetitionEngine.calculateInterval(
                currentInterval,
                ef,
                quality,
                reps
              );
              intervals.push(newInterval);
              currentInterval = newInterval;
              reps++;
            }
            
            // Each interval should be greater than or equal to the previous
            for (let i = 1; i < intervals.length; i++) {
              expect(intervals[i]).toBeGreaterThanOrEqual(intervals[i - 1]);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Repetitions Invariants', () => {
    it('Property: Repetitions must always be >= 0', () => {
      fc.assert(
        fc.property(
          easinessFactor,
          interval,
          repetitions,
          validQuality,
          (ef, int, reps, quality) => {
            const data = createSpacedRepetitionData(ef, int, reps);
            const result = SpacedRepetitionEngine.calculateNextReview(data, quality);
            
            expect(result.repetitions).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 1000 }
      );
    });

    it('Property: Repetitions must increment by 1 when quality >= 3', () => {
      fc.assert(
        fc.property(
          repetitions,
          fc.integer({ min: 3, max: 5 }),
          (startingReps, quality) => {
            const data = createSpacedRepetitionData(2.5, 6, startingReps);
            const result = SpacedRepetitionEngine.calculateNextReview(data, quality);
            
            expect(result.repetitions).toBe(startingReps + 1);
          }
        ),
        { numRuns: 500 }
      );
    });

    it('Property: Repetitions must reset to 0 when quality < 3', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          fc.integer({ min: 0, max: 2 }),
          (startingReps, quality) => {
            const data = createSpacedRepetitionData(2.5, 6, startingReps);
            const result = SpacedRepetitionEngine.calculateNextReview(data, quality);
            
            expect(result.repetitions).toBe(0);
          }
        ),
        { numRuns: 500 }
      );
    });

    it('Property: Repetitions can grow indefinitely with successful reviews', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 50 }), (targetReps) => {
          let data = createSpacedRepetitionData(2.5, 6, 0);
          
          for (let i = 0; i < targetReps; i++) {
            const result = SpacedRepetitionEngine.calculateNextReview(data, 4);
            expect(result.repetitions).toBe(i + 1);
            
            // Update data for next iteration
            data = SpacedRepetitionEngine.updateAfterReview(data, 4);
          }
        }),
        { numRuns: 50 }
      );
    });
  });

  describe('Quality Rating Validation Invariants', () => {
    it('Property: Quality ratings outside 0-5 must be rejected (REQ-2.6.3)', () => {
      fc.assert(
        fc.property(invalidQuality, (quality) => {
          expect(() => {
            SpacedRepetitionEngine.calculateEasinessFactor(2.5, quality);
          }).toThrow('Quality rating must be between 0 and 5');
        }),
        { numRuns: 200 }
      );
    });

    it('Property: All valid quality ratings (0-5) must be accepted', () => {
      fc.assert(
        fc.property(validQuality, (quality) => {
          expect(() => {
            SpacedRepetitionEngine.calculateEasinessFactor(2.5, quality);
          }).not.toThrow();
        }),
        { numRuns: 100 }
      );
    });

    it('Property: Quality validation must occur before any calculations', () => {
      fc.assert(
        fc.property(invalidQuality, (quality) => {
          const data = createSpacedRepetitionData();
          
          // Invalid quality should throw before modifying any state
          expect(() => {
            SpacedRepetitionEngine.calculateNextReview(data, quality);
          }).toThrow();
        }),
        { numRuns: 200 }
      );
    });
  });

  describe('Next Review Date Invariants', () => {
    it('Property: Next review date must always be in the future', () => {
      fc.assert(
        fc.property(positiveInterval, (int) => {
          const now = new Date();
          const nextDate = SpacedRepetitionEngine.calculateNextReviewDate(now, int);
          
          expect(nextDate.getTime()).toBeGreaterThan(now.getTime());
        }),
        { numRuns: 500 }
      );
    });

    it('Property: Next review date must be exactly interval days in the future', () => {
      fc.assert(
        fc.property(positiveInterval, (int) => {
          const currentDate = new Date('2024-01-01T00:00:00Z');
          const nextDate = SpacedRepetitionEngine.calculateNextReviewDate(currentDate, int);
          
          const expectedDate = new Date(currentDate);
          expectedDate.setDate(expectedDate.getDate() + int);
          
          expect(nextDate.getTime()).toBe(expectedDate.getTime());
        }),
        { numRuns: 500 }
      );
    });

    it('Property: Date calculation must be deterministic', () => {
      fc.assert(
        fc.property(positiveInterval, (int) => {
          const currentDate = new Date('2024-01-01T00:00:00Z');
          
          const date1 = SpacedRepetitionEngine.calculateNextReviewDate(currentDate, int);
          const date2 = SpacedRepetitionEngine.calculateNextReviewDate(currentDate, int);
          
          expect(date1.getTime()).toBe(date2.getTime());
        }),
        { numRuns: 500 }
      );
    });

    it('Property: Next review date must advance with each successful review', () => {
      fc.assert(
        fc.property(easinessFactor, (ef) => {
          let data = createSpacedRepetitionData(ef, 1, 1);
          let previousDate = new Date();
          
          for (let i = 0; i < 10; i++) {
            const result = SpacedRepetitionEngine.calculateNextReview(data, 4);
            
            expect(result.nextReviewDate.getTime()).toBeGreaterThan(previousDate.getTime());
            
            previousDate = result.nextReviewDate;
            data = SpacedRepetitionEngine.updateAfterReview(data, 4);
          }
        }),
        { numRuns: 50 }
      );
    });
  });

  describe('Complete SM-2 Algorithm Invariants', () => {
    it('Property: All invariants must hold together in calculateNextReview', () => {
      fc.assert(
        fc.property(
          easinessFactor,
          interval,
          repetitions,
          validQuality,
          (ef, int, reps, quality) => {
            const data = createSpacedRepetitionData(ef, int, reps);
            const result = SpacedRepetitionEngine.calculateNextReview(data, quality);
            
            // All invariants must hold
            expect(result.newEasinessFactor).toBeGreaterThanOrEqual(1.3);
            expect(result.newInterval).toBeGreaterThanOrEqual(1);
            expect(result.repetitions).toBeGreaterThanOrEqual(0);
            expect(result.nextReviewDate.getTime()).toBeGreaterThan(Date.now() - 1000); // Allow 1s tolerance
          }
        ),
        { numRuns: 1000 }
      );
    });

    it('Property: updateAfterReview must maintain all invariants', () => {
      fc.assert(
        fc.property(
          easinessFactor,
          interval,
          repetitions,
          fc.array(validQuality, { minLength: 1, maxLength: 20 }),
          (ef, int, reps, qualities) => {
            let data = createSpacedRepetitionData(ef, int, reps);
            
            // Perform multiple random reviews
            for (const quality of qualities) {
              data = SpacedRepetitionEngine.updateAfterReview(data, quality);
              
              // All invariants must hold
              expect(data.easinessFactor).toBeGreaterThanOrEqual(1.3);
              expect(data.interval).toBeGreaterThanOrEqual(1);
              expect(data.repetitions).toBeGreaterThanOrEqual(0);
              expect(data.lastQuality).toBeGreaterThanOrEqual(0);
              expect(data.lastQuality).toBeLessThanOrEqual(5);
            }
          }
        ),
        { numRuns: 200 }
      );
    });

    it('Property: Sequence of successful reviews must follow SM-2 progression', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          let data = SpacedRepetitionEngine.initializeSpacedRepetition(
            'student_test',
            'concept_test',
            'Test Concept'
          );
          
          // First review
          data = SpacedRepetitionEngine.updateAfterReview(data, 4);
          expect(data.interval).toBe(1);
          expect(data.repetitions).toBe(1);
          
          // Second review
          data = SpacedRepetitionEngine.updateAfterReview(data, 4);
          expect(data.interval).toBe(6);
          expect(data.repetitions).toBe(2);
          
          // Third review
          data = SpacedRepetitionEngine.updateAfterReview(data, 4);
          expect(data.interval).toBe(15); // 6 * 2.5
          expect(data.repetitions).toBe(3);
          
          // All invariants maintained
          expect(data.easinessFactor).toBeGreaterThanOrEqual(1.3);
        }),
        { numRuns: 100 }
      );
    });

    it('Property: Failed review must reset interval and repetitions but maintain EF >= 1.3', () => {
      fc.assert(
        fc.property(
          easinessFactor,
          fc.integer({ min: 10, max: 100 }),
          fc.integer({ min: 5, max: 50 }),
          fc.integer({ min: 0, max: 2 }),
          (ef, int, reps, quality) => {
            let data = createSpacedRepetitionData(ef, int, reps);
            data = SpacedRepetitionEngine.updateAfterReview(data, quality);
            
            expect(data.interval).toBe(1);
            expect(data.repetitions).toBe(0);
            expect(data.easinessFactor).toBeGreaterThanOrEqual(1.3);
          }
        ),
        { numRuns: 500 }
      );
    });

    it('Property: Initialization must create valid starting state', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          (studentId, conceptId, conceptName) => {
            const data = SpacedRepetitionEngine.initializeSpacedRepetition(
              studentId,
              conceptId,
              conceptName
            );
            
            expect(data.easinessFactor).toBe(2.5);
            expect(data.interval).toBe(0);
            expect(data.repetitions).toBe(0);
            expect(data.lastQuality).toBe(0);
            expect(data.nextReviewDate).toBeInstanceOf(Date);
            expect(data.lastReviewDate).toBeInstanceOf(Date);
            expect(data.studentId).toBe(studentId);
            expect(data.conceptId).toBe(conceptId);
            expect(data.conceptName).toBe(conceptName);
          }
        ),
        { numRuns: 200 }
      );
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('Property: Minimum EF (1.3) with quality 5 must still increase', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const newEF = SpacedRepetitionEngine.calculateEasinessFactor(1.3, 5);
          expect(newEF).toBeGreaterThan(1.3);
          expect(newEF).toBeCloseTo(1.4, 1);
        }),
        { numRuns: 10 }
      );
    });

    it('Property: Very large intervals must remain valid', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 10000 }),
          easinessFactor,
          (largeInterval, ef) => {
            const quality = 4;
            const reps = 50;
            
            const newInterval = SpacedRepetitionEngine.calculateInterval(largeInterval, ef, quality, reps);
            
            expect(newInterval).toBeGreaterThanOrEqual(1);
            expect(Number.isInteger(newInterval)).toBe(true);
            expect(newInterval).toBe(Math.round(largeInterval * ef));
          }
        ),
        { numRuns: 200 }
      );
    });

    it('Property: Very high repetition counts must remain valid', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 10000 }),
          (highReps) => {
            let data = createSpacedRepetitionData(2.5, 6, highReps);
            const result = SpacedRepetitionEngine.calculateNextReview(data, 4);
            
            expect(result.repetitions).toBe(highReps + 1);
            expect(result.newEasinessFactor).toBeGreaterThanOrEqual(1.3);
            expect(result.newInterval).toBeGreaterThanOrEqual(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property: Alternating success/failure must maintain invariants', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 5, max: 50 }),
          (iterations) => {
            let data = SpacedRepetitionEngine.initializeSpacedRepetition(
              'student_test',
              'concept_test',
              'Test Concept'
            );
            
            for (let i = 0; i < iterations; i++) {
              const quality = i % 2 === 0 ? 4 : 2; // Alternate between success and failure
              data = SpacedRepetitionEngine.updateAfterReview(data, quality);
              
              expect(data.easinessFactor).toBeGreaterThanOrEqual(1.3);
              expect(data.interval).toBeGreaterThanOrEqual(1);
              expect(data.repetitions).toBeGreaterThanOrEqual(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property: Random quality sequence must maintain all invariants', () => {
      fc.assert(
        fc.property(
          fc.array(validQuality, { minLength: 10, maxLength: 100 }),
          (qualities) => {
            let data = SpacedRepetitionEngine.initializeSpacedRepetition(
              'student_test',
              'concept_test',
              'Test Concept'
            );
            
            // Apply random quality ratings
            for (const quality of qualities) {
              data = SpacedRepetitionEngine.updateAfterReview(data, quality);
              
              // Verify all invariants
              expect(data.easinessFactor).toBeGreaterThanOrEqual(1.3);
              expect(data.interval).toBeGreaterThanOrEqual(1);
              expect(data.repetitions).toBeGreaterThanOrEqual(0);
              expect(data.lastQuality).toBeGreaterThanOrEqual(0);
              expect(data.lastQuality).toBeLessThanOrEqual(5);
              expect(data.nextReviewDate).toBeInstanceOf(Date);
              expect(data.lastReviewDate).toBeInstanceOf(Date);
            }
          }
        ),
        { numRuns: 200 }
      );
    });

    it('Property: SM-2 algorithm is commutative for same quality sequences', () => {
      fc.assert(
        fc.property(
          fc.array(validQuality, { minLength: 5, maxLength: 10 }),
          (qualities) => {
            // Run the same sequence twice
            let data1 = SpacedRepetitionEngine.initializeSpacedRepetition('s1', 'c1', 'C1');
            let data2 = SpacedRepetitionEngine.initializeSpacedRepetition('s2', 'c2', 'C2');
            
            for (const quality of qualities) {
              data1 = SpacedRepetitionEngine.updateAfterReview(data1, quality);
              data2 = SpacedRepetitionEngine.updateAfterReview(data2, quality);
            }
            
            // Final states should be identical (except IDs and dates)
            expect(data1.easinessFactor).toBe(data2.easinessFactor);
            expect(data1.interval).toBe(data2.interval);
            expect(data1.repetitions).toBe(data2.repetitions);
            expect(data1.lastQuality).toBe(data2.lastQuality);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property: EF converges to minimum with sustained poor performance', () => {
      fc.assert(
        fc.property(
          easinessFactor,
          fc.integer({ min: 20, max: 100 }),
          (startingEF, iterations) => {
            let currentEF = startingEF;
            
            for (let i = 0; i < iterations; i++) {
              currentEF = SpacedRepetitionEngine.calculateEasinessFactor(currentEF, 0);
            }
            
            // After enough iterations, EF should be at minimum
            expect(currentEF).toBe(1.3);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property: Interval growth is bounded by EF', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 1.3, max: 3.0, noNaN: true }),
          fc.integer({ min: 10, max: 100 }),
          (ef, startInterval) => {
            const newInterval = SpacedRepetitionEngine.calculateInterval(startInterval, ef, 4, 10);
            const expectedMax = Math.round(startInterval * ef);
            
            expect(newInterval).toBeLessThanOrEqual(expectedMax);
            expect(newInterval).toBeGreaterThanOrEqual(startInterval);
          }
        ),
        { numRuns: 200 }
      );
    });
  });
});
