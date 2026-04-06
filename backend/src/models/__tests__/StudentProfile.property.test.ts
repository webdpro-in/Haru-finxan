/**
 * Property-Based Tests for StudentProfile
 * Tests invariants and properties that should always hold
 * 
 * 9.8: Write property-based tests for mastery bounds
 * 34.2: Write property tests for mastery updates
 * 
 * **Validates: Requirements REQ-9.3 (updateMastery function)**
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';

// Mock Redis and Supabase before imports
vi.mock('ioredis', () => {
  return {
    default: class MockRedis {
      setex = vi.fn().mockResolvedValue('OK');
      get = vi.fn().mockResolvedValue(null);
      del = vi.fn().mockResolvedValue(1);
    },
  };
});

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      upsert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
    })),
  })),
}));

import { StudentProfileManager, StudentProfile } from '../StudentProfile';

describe('StudentProfile Property-Based Tests', () => {
  let profile: StudentProfile;

  beforeEach(() => {
    profile = StudentProfileManager.createProfile('student_test', 'Test Student', 8);
  });

  describe('Mastery Bounds Invariants', () => {
    it('Property: Mastery level must always be between 0 and 100', () => {
      const conceptId = 'test_concept';
      const conceptName = 'Test Concept';

      // Test with random sequences of successes and failures
      for (let trial = 0; trial < 100; trial++) {
        const profile = StudentProfileManager.createProfile(`student_${trial}`, 'Test', 8);
        
        // Random sequence of 50 attempts
        for (let i = 0; i < 50; i++) {
          const success = Math.random() > 0.5;
          StudentProfileManager.updateMastery(profile, conceptId, conceptName, success);
          
          const mastery = profile.conceptMasteries.get(conceptId)!;
          expect(mastery.masteryLevel).toBeGreaterThanOrEqual(0);
          expect(mastery.masteryLevel).toBeLessThanOrEqual(100);
        }
      }
    });

    it('Property: Success rate must always be between 0 and 1', () => {
      const conceptId = 'test_concept';
      const conceptName = 'Test Concept';

      for (let trial = 0; trial < 50; trial++) {
        const profile = StudentProfileManager.createProfile(`student_${trial}`, 'Test', 8);
        
        for (let i = 0; i < 30; i++) {
          const success = Math.random() > 0.5;
          StudentProfileManager.updateMastery(profile, conceptId, conceptName, success);
          
          const mastery = profile.conceptMasteries.get(conceptId)!;
          expect(mastery.successRate).toBeGreaterThanOrEqual(0);
          expect(mastery.successRate).toBeLessThanOrEqual(1);
        }
      }
    });

    it('Property: Attempts count must always increase', () => {
      const conceptId = 'test_concept';
      const conceptName = 'Test Concept';

      for (let i = 0; i < 20; i++) {
        const success = Math.random() > 0.5;
        StudentProfileManager.updateMastery(profile, conceptId, conceptName, success);
        
        const mastery = profile.conceptMasteries.get(conceptId)!;
        expect(mastery.attemptsCount).toBe(i + 1);
      }
    });

    it('Property: All successes should result in 100% success rate', () => {
      const conceptId = 'test_concept';
      const conceptName = 'Test Concept';

      for (let i = 0; i < 20; i++) {
        StudentProfileManager.updateMastery(profile, conceptId, conceptName, true);
      }

      const mastery = profile.conceptMasteries.get(conceptId)!;
      expect(mastery.successRate).toBe(1);
    });

    it('Property: All failures should result in 0% success rate', () => {
      const conceptId = 'test_concept';
      const conceptName = 'Test Concept';

      for (let i = 0; i < 20; i++) {
        StudentProfileManager.updateMastery(profile, conceptId, conceptName, false);
      }

      const mastery = profile.conceptMasteries.get(conceptId)!;
      expect(mastery.successRate).toBe(0);
    });

    it('Property: Mastery cannot exceed 100 even with many successes', () => {
      const conceptId = 'test_concept';
      const conceptName = 'Test Concept';

      // 100 consecutive successes
      for (let i = 0; i < 100; i++) {
        StudentProfileManager.updateMastery(profile, conceptId, conceptName, true);
      }

      const mastery = profile.conceptMasteries.get(conceptId)!;
      expect(mastery.masteryLevel).toBeLessThanOrEqual(100);
    });

    it('Property: Mastery cannot go below 0 even with many failures', () => {
      const conceptId = 'test_concept';
      const conceptName = 'Test Concept';

      // 100 consecutive failures
      for (let i = 0; i < 100; i++) {
        StudentProfileManager.updateMastery(profile, conceptId, conceptName, false);
      }

      const mastery = profile.conceptMasteries.get(conceptId)!;
      expect(mastery.masteryLevel).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Weak/Strong Concept List Invariants', () => {
    it('Property: Weak concepts must have mastery < 50', () => {
      // Create multiple concepts with varying mastery
      for (let i = 0; i < 10; i++) {
        const conceptId = `concept_${i}`;
        const conceptName = `Concept ${i}`;
        const successCount = Math.floor(Math.random() * 20);
        
        for (let j = 0; j < successCount; j++) {
          StudentProfileManager.updateMastery(profile, conceptId, conceptName, true);
        }
        for (let j = 0; j < 20 - successCount; j++) {
          StudentProfileManager.updateMastery(profile, conceptId, conceptName, false);
        }
      }

      // Verify all weak concepts have mastery < 50
      for (const weakConcept of profile.weakConcepts) {
        const mastery = Array.from(profile.conceptMasteries.values())
          .find(m => m.conceptName === weakConcept);
        
        expect(mastery).toBeDefined();
        expect(mastery!.masteryLevel).toBeLessThan(50);
      }
    });

    it('Property: Strong concepts must have mastery > 80', () => {
      // Create concepts with high mastery
      for (let i = 0; i < 5; i++) {
        const conceptId = `concept_${i}`;
        const conceptName = `Concept ${i}`;
        
        // Ensure high mastery
        for (let j = 0; j < 15; j++) {
          StudentProfileManager.updateMastery(profile, conceptId, conceptName, true);
        }
      }

      // Verify all strong concepts have mastery > 80
      for (const strongConcept of profile.strongConcepts) {
        const mastery = Array.from(profile.conceptMasteries.values())
          .find(m => m.conceptName === strongConcept);
        
        expect(mastery).toBeDefined();
        expect(mastery!.masteryLevel).toBeGreaterThan(80);
      }
    });

    it('Property: A concept cannot be both weak and strong', () => {
      // Create multiple concepts
      for (let i = 0; i < 10; i++) {
        const conceptId = `concept_${i}`;
        const conceptName = `Concept ${i}`;
        const successCount = Math.floor(Math.random() * 20);
        
        for (let j = 0; j < successCount; j++) {
          StudentProfileManager.updateMastery(profile, conceptId, conceptName, Math.random() > 0.5);
        }
      }

      // Check no overlap
      const weakSet = new Set(profile.weakConcepts);
      const strongSet = new Set(profile.strongConcepts);
      
      for (const weak of weakSet) {
        expect(strongSet.has(weak)).toBe(false);
      }
    });

    it('Property: Weak and strong lists should update after every mastery change', () => {
      const conceptId = 'test_concept';
      const conceptName = 'Test Concept';

      // Start weak
      StudentProfileManager.updateMastery(profile, conceptId, conceptName, false);
      expect(profile.weakConcepts).toContain(conceptName);

      // Improve to medium (neither weak nor strong)
      for (let i = 0; i < 8; i++) {
        StudentProfileManager.updateMastery(profile, conceptId, conceptName, true);
      }
      expect(profile.weakConcepts).not.toContain(conceptName);
      expect(profile.strongConcepts).not.toContain(conceptName);

      // Improve to strong
      for (let i = 0; i < 10; i++) {
        StudentProfileManager.updateMastery(profile, conceptId, conceptName, true);
      }
      expect(profile.strongConcepts).toContain(conceptName);
    });
  });

  describe('Session Recording Invariants', () => {
    it('Property: Total sessions must always increase', () => {
      for (let i = 0; i < 20; i++) {
        StudentProfileManager.recordSession(profile, {
          timestamp: new Date(),
          duration: 300,
          topicsCovered: ['Topic'],
          questionsAsked: 1,
          confusionDetected: false,
          confusionCount: 0,
          masteryGained: {},
        });

        expect(profile.totalSessions).toBe(i + 1);
      }
    });

    it('Property: Total questions asked must be sum of all session questions', () => {
      let expectedTotal = 0;

      for (let i = 0; i < 10; i++) {
        const questionsAsked = Math.floor(Math.random() * 10) + 1;
        expectedTotal += questionsAsked;

        StudentProfileManager.recordSession(profile, {
          timestamp: new Date(),
          duration: 300,
          topicsCovered: ['Topic'],
          questionsAsked,
          confusionDetected: false,
          confusionCount: 0,
          masteryGained: {},
        });

        expect(profile.totalQuestionsAsked).toBe(expectedTotal);
      }
    });

    it('Property: Recent sessions list should never exceed 50', () => {
      for (let i = 0; i < 100; i++) {
        StudentProfileManager.recordSession(profile, {
          timestamp: new Date(),
          duration: 300,
          topicsCovered: ['Topic'],
          questionsAsked: 1,
          confusionDetected: false,
          confusionCount: 0,
          masteryGained: {},
        });

        expect(profile.recentSessions.length).toBeLessThanOrEqual(50);
      }
    });

    it('Property: Average session duration should be within min/max of recorded sessions', () => {
      const durations: number[] = [];

      for (let i = 0; i < 20; i++) {
        const duration = Math.floor(Math.random() * 1000) + 100;
        durations.push(duration);

        StudentProfileManager.recordSession(profile, {
          timestamp: new Date(),
          duration,
          topicsCovered: ['Topic'],
          questionsAsked: 1,
          confusionDetected: false,
          confusionCount: 0,
          masteryGained: {},
        });
      }

      const min = Math.min(...durations);
      const max = Math.max(...durations);

      expect(profile.averageSessionDuration).toBeGreaterThanOrEqual(min);
      expect(profile.averageSessionDuration).toBeLessThanOrEqual(max);
    });
  });

  describe('Confusion Pattern Invariants', () => {
    it('Property: Confusion triggers should not contain duplicates', () => {
      const topic = 'Quadratic Equations';

      for (let i = 0; i < 10; i++) {
        StudentProfileManager.recordConfusion(profile, topic);
      }

      const uniqueTriggers = new Set(profile.confusionTriggers);
      expect(uniqueTriggers.size).toBe(profile.confusionTriggers.length);
    });

    it('Property: Hesitation frequency must always increase for same topic', () => {
      const topic = 'Quadratic Equations';

      for (let i = 0; i < 10; i++) {
        StudentProfileManager.recordConfusion(profile, topic);
        
        const pattern = profile.hesitationPatterns.find(p => p.topic === topic);
        expect(pattern).toBeDefined();
        expect(pattern!.frequency).toBe(i + 1);
      }
    });

    it('Property: Each hesitation pattern must have corresponding confusion trigger', () => {
      const topics = ['Algebra', 'Geometry', 'Calculus'];

      for (const topic of topics) {
        StudentProfileManager.recordConfusion(profile, topic);
      }

      for (const pattern of profile.hesitationPatterns) {
        expect(profile.confusionTriggers).toContain(pattern.topic);
      }
    });
  });

  describe('Timestamp Invariants', () => {
    it('Property: lastActiveAt should always be updated on session recording', () => {
      const before = new Date();

      StudentProfileManager.recordSession(profile, {
        timestamp: new Date(),
        duration: 300,
        topicsCovered: ['Topic'],
        questionsAsked: 1,
        confusionDetected: false,
        confusionCount: 0,
        masteryGained: {},
      });

      expect(profile.lastActiveAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('Property: lastPracticed should be updated on every mastery update', () => {
      const conceptId = 'test_concept';
      const conceptName = 'Test Concept';

      for (let i = 0; i < 5; i++) {
        const before = new Date();
        
        StudentProfileManager.updateMastery(profile, conceptId, conceptName, true);
        
        const mastery = profile.conceptMasteries.get(conceptId)!;
        expect(mastery.lastPracticed.getTime()).toBeGreaterThanOrEqual(before.getTime());
      }
    });
  });

  describe('Recommended Topics Invariants', () => {
    it('Property: Recommendations should never exceed 5 topics', () => {
      // Create many weak concepts
      for (let i = 0; i < 20; i++) {
        StudentProfileManager.updateMastery(profile, `concept_${i}`, `Concept ${i}`, false);
      }

      const recommendations = StudentProfileManager.getRecommendedTopics(profile);
      expect(recommendations.length).toBeLessThanOrEqual(5);
    });

    it('Property: Recommended topics should exist in concept masteries', () => {
      StudentProfileManager.updateMastery(profile, 'math_algebra', 'Algebra', false);
      StudentProfileManager.updateMastery(profile, 'math_geometry', 'Geometry', false);

      const recommendations = StudentProfileManager.getRecommendedTopics(profile);
      const conceptNames = Array.from(profile.conceptMasteries.values()).map(m => m.conceptName);

      for (const rec of recommendations) {
        expect(conceptNames).toContain(rec);
      }
    });
  });

  describe('Mastery Update Properties (fast-check)', () => {
    /**
     * Property: Mastery level must always remain in [0, 100] regardless of input sequence
     * **Validates: Requirements REQ-9.3**
     */
    it('Property: Mastery always stays in bounds [0, 100] for any sequence of attempts', () => {
      fc.assert(
        fc.property(
          fc.array(fc.boolean(), { minLength: 1, maxLength: 100 }),
          (attempts) => {
            const testProfile = StudentProfileManager.createProfile('test_student', 'Test', 8);
            const conceptId = 'test_concept';
            const conceptName = 'Test Concept';

            for (const success of attempts) {
              StudentProfileManager.updateMastery(testProfile, conceptId, conceptName, success);
              const mastery = testProfile.conceptMasteries.get(conceptId)!;
              
              // Mastery must always be in [0, 100]
              expect(mastery.masteryLevel).toBeGreaterThanOrEqual(0);
              expect(mastery.masteryLevel).toBeLessThanOrEqual(100);
            }
          }
        ),
        { numRuns: 1000 }
      );
    });

    /**
     * Property: Attempts count increments by exactly 1 on each update
     * **Validates: Requirements REQ-9.3**
     */
    it('Property: Attempts count increments by exactly 1 on each updateMastery call', () => {
      fc.assert(
        fc.property(
          fc.array(fc.boolean(), { minLength: 1, maxLength: 50 }),
          (attempts) => {
            const testProfile = StudentProfileManager.createProfile('test_student', 'Test', 8);
            const conceptId = 'test_concept';
            const conceptName = 'Test Concept';

            for (let i = 0; i < attempts.length; i++) {
              StudentProfileManager.updateMastery(testProfile, conceptId, conceptName, attempts[i]);
              const mastery = testProfile.conceptMasteries.get(conceptId)!;
              
              // Attempts must equal the number of updates
              expect(mastery.attemptsCount).toBe(i + 1);
            }
          }
        ),
        { numRuns: 500 }
      );
    });

    /**
     * Property: Success increases mastery by 5 (capped at 100)
     * **Validates: Requirements REQ-9.3**
     */
    it('Property: Success increases mastery by 5 (capped at 100)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100 }),
          (initialMastery) => {
            const testProfile = StudentProfileManager.createProfile('test_student', 'Test', 8);
            const conceptId = 'test_concept';
            const conceptName = 'Test Concept';

            // Set initial mastery by manipulating the map directly
            testProfile.conceptMasteries.set(conceptId, {
              conceptId,
              conceptName,
              masteryLevel: initialMastery,
              lastPracticed: new Date(),
              attemptsCount: 1,
              successRate: 0.5,
              prerequisites: [],
            });

            const before = initialMastery;
            StudentProfileManager.updateMastery(testProfile, conceptId, conceptName, true);
            const after = testProfile.conceptMasteries.get(conceptId)!.masteryLevel;

            // Success should increase by 5, capped at 100
            const expected = Math.min(100, before + 5);
            expect(after).toBe(expected);
          }
        ),
        { numRuns: 500 }
      );
    });

    /**
     * Property: Failure decreases mastery by 2 (floored at 0)
     * **Validates: Requirements REQ-9.3**
     */
    it('Property: Failure decreases mastery by 2 (floored at 0)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100 }),
          (initialMastery) => {
            const testProfile = StudentProfileManager.createProfile('test_student', 'Test', 8);
            const conceptId = 'test_concept';
            const conceptName = 'Test Concept';

            // Set initial mastery
            testProfile.conceptMasteries.set(conceptId, {
              conceptId,
              conceptName,
              masteryLevel: initialMastery,
              lastPracticed: new Date(),
              attemptsCount: 1,
              successRate: 0.5,
              prerequisites: [],
            });

            const before = initialMastery;
            StudentProfileManager.updateMastery(testProfile, conceptId, conceptName, false);
            const after = testProfile.conceptMasteries.get(conceptId)!.masteryLevel;

            // Failure should decrease by 2, floored at 0
            const expected = Math.max(0, before - 2);
            expect(after).toBe(expected);
          }
        ),
        { numRuns: 500 }
      );
    });

    /**
     * Property: Success rate is always in [0, 1]
     * **Validates: Requirements REQ-9.3**
     */
    it('Property: Success rate always stays in [0, 1]', () => {
      fc.assert(
        fc.property(
          fc.array(fc.boolean(), { minLength: 1, maxLength: 100 }),
          (attempts) => {
            const testProfile = StudentProfileManager.createProfile('test_student', 'Test', 8);
            const conceptId = 'test_concept';
            const conceptName = 'Test Concept';

            for (const success of attempts) {
              StudentProfileManager.updateMastery(testProfile, conceptId, conceptName, success);
              const mastery = testProfile.conceptMasteries.get(conceptId)!;
              
              expect(mastery.successRate).toBeGreaterThanOrEqual(0);
              expect(mastery.successRate).toBeLessThanOrEqual(1);
            }
          }
        ),
        { numRuns: 500 }
      );
    });

    /**
     * Property: Success rate equals actual success ratio
     * **Validates: Requirements REQ-9.3**
     */
    it('Property: Success rate accurately reflects actual success ratio', () => {
      fc.assert(
        fc.property(
          fc.array(fc.boolean(), { minLength: 1, maxLength: 50 }),
          (attempts) => {
            const testProfile = StudentProfileManager.createProfile('test_student', 'Test', 8);
            const conceptId = 'test_concept';
            const conceptName = 'Test Concept';

            let successCount = 0;
            for (const success of attempts) {
              if (success) successCount++;
              StudentProfileManager.updateMastery(testProfile, conceptId, conceptName, success);
            }

            const mastery = testProfile.conceptMasteries.get(conceptId)!;
            const expectedRate = successCount / attempts.length;
            
            // Allow small floating point error
            expect(Math.abs(mastery.successRate - expectedRate)).toBeLessThan(0.0001);
          }
        ),
        { numRuns: 500 }
      );
    });

    /**
     * Property: Mastery is monotonically increasing with all successes
     * **Validates: Requirements REQ-9.3**
     */
    it('Property: Consecutive successes monotonically increase mastery (until cap)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 30 }),
          (numSuccesses) => {
            const testProfile = StudentProfileManager.createProfile('test_student', 'Test', 8);
            const conceptId = 'test_concept';
            const conceptName = 'Test Concept';

            let previousMastery = 0;
            for (let i = 0; i < numSuccesses; i++) {
              StudentProfileManager.updateMastery(testProfile, conceptId, conceptName, true);
              const currentMastery = testProfile.conceptMasteries.get(conceptId)!.masteryLevel;
              
              // Mastery should increase or stay at cap
              expect(currentMastery).toBeGreaterThanOrEqual(previousMastery);
              previousMastery = currentMastery;
            }
          }
        ),
        { numRuns: 300 }
      );
    });

    /**
     * Property: Mastery is monotonically decreasing with all failures
     * **Validates: Requirements REQ-9.3**
     */
    it('Property: Consecutive failures monotonically decrease mastery (until floor)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 30 }),
          fc.integer({ min: 50, max: 100 }),
          (numFailures, startingMastery) => {
            const testProfile = StudentProfileManager.createProfile('test_student', 'Test', 8);
            const conceptId = 'test_concept';
            const conceptName = 'Test Concept';

            // Set initial mastery
            testProfile.conceptMasteries.set(conceptId, {
              conceptId,
              conceptName,
              masteryLevel: startingMastery,
              lastPracticed: new Date(),
              attemptsCount: 1,
              successRate: 0.5,
              prerequisites: [],
            });

            let previousMastery = startingMastery;
            for (let i = 0; i < numFailures; i++) {
              StudentProfileManager.updateMastery(testProfile, conceptId, conceptName, false);
              const currentMastery = testProfile.conceptMasteries.get(conceptId)!.masteryLevel;
              
              // Mastery should decrease or stay at floor
              expect(currentMastery).toBeLessThanOrEqual(previousMastery);
              previousMastery = currentMastery;
            }
          }
        ),
        { numRuns: 300 }
      );
    });

    /**
     * Property: lastPracticed timestamp is updated on every update
     * **Validates: Requirements REQ-9.3**
     */
    it('Property: lastPracticed is always updated to current time', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          (success) => {
            const testProfile = StudentProfileManager.createProfile('test_student', 'Test', 8);
            const conceptId = 'test_concept';
            const conceptName = 'Test Concept';

            const before = Date.now();
            StudentProfileManager.updateMastery(testProfile, conceptId, conceptName, success);
            const after = Date.now();

            const mastery = testProfile.conceptMasteries.get(conceptId)!;
            const lastPracticedTime = mastery.lastPracticed.getTime();

            expect(lastPracticedTime).toBeGreaterThanOrEqual(before);
            expect(lastPracticedTime).toBeLessThanOrEqual(after);
          }
        ),
        { numRuns: 200 }
      );
    });

    /**
     * Property: Weak concepts list is consistent with mastery levels
     * **Validates: Requirements REQ-9.6**
     */
    it('Property: All weak concepts have mastery < 50', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              conceptId: fc.string({ minLength: 1, maxLength: 20 }),
              success: fc.boolean(),
            }),
            { minLength: 5, maxLength: 20 }
          ),
          (updates) => {
            const testProfile = StudentProfileManager.createProfile('test_student', 'Test', 8);

            // Apply all updates
            for (const update of updates) {
              StudentProfileManager.updateMastery(
                testProfile,
                update.conceptId,
                `Concept ${update.conceptId}`,
                update.success
              );
            }

            // Verify all weak concepts have mastery < 50
            for (const weakConcept of testProfile.weakConcepts) {
              const mastery = Array.from(testProfile.conceptMasteries.values())
                .find(m => m.conceptName === weakConcept);
              
              expect(mastery).toBeDefined();
              expect(mastery!.masteryLevel).toBeLessThan(50);
            }
          }
        ),
        { numRuns: 200 }
      );
    });

    /**
     * Property: Strong concepts list is consistent with mastery levels
     * **Validates: Requirements REQ-9.6**
     */
    it('Property: All strong concepts have mastery > 80', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              conceptId: fc.string({ minLength: 1, maxLength: 20 }),
              success: fc.boolean(),
            }),
            { minLength: 5, maxLength: 20 }
          ),
          (updates) => {
            const testProfile = StudentProfileManager.createProfile('test_student', 'Test', 8);

            // Apply all updates
            for (const update of updates) {
              StudentProfileManager.updateMastery(
                testProfile,
                update.conceptId,
                `Concept ${update.conceptId}`,
                update.success
              );
            }

            // Verify all strong concepts have mastery > 80
            for (const strongConcept of testProfile.strongConcepts) {
              const mastery = Array.from(testProfile.conceptMasteries.values())
                .find(m => m.conceptName === strongConcept);
              
              expect(mastery).toBeDefined();
              expect(mastery!.masteryLevel).toBeGreaterThan(80);
            }
          }
        ),
        { numRuns: 200 }
      );
    });

    /**
     * Property: No concept can be both weak and strong
     * **Validates: Requirements REQ-9.6**
     */
    it('Property: Weak and strong concept lists are disjoint', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              conceptId: fc.string({ minLength: 1, maxLength: 20 }),
              success: fc.boolean(),
            }),
            { minLength: 5, maxLength: 20 }
          ),
          (updates) => {
            const testProfile = StudentProfileManager.createProfile('test_student', 'Test', 8);

            // Apply all updates
            for (const update of updates) {
              StudentProfileManager.updateMastery(
                testProfile,
                update.conceptId,
                `Concept ${update.conceptId}`,
                update.success
              );
            }

            // Verify no overlap between weak and strong
            const weakSet = new Set(testProfile.weakConcepts);
            const strongSet = new Set(testProfile.strongConcepts);

            for (const weak of weakSet) {
              expect(strongSet.has(weak)).toBe(false);
            }
          }
        ),
        { numRuns: 200 }
      );
    });

    /**
     * Property: Initial mastery for new concept is deterministic
     * **Validates: Requirements REQ-9.3**
     */
    it('Property: First update creates concept with correct initial mastery', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          (success) => {
            const testProfile = StudentProfileManager.createProfile('test_student', 'Test', 8);
            const conceptId = 'new_concept';
            const conceptName = 'New Concept';

            StudentProfileManager.updateMastery(testProfile, conceptId, conceptName, success);
            const mastery = testProfile.conceptMasteries.get(conceptId)!;

            // Initial mastery should be 60 for success, 40 for failure
            const expectedMastery = success ? 60 : 40;
            expect(mastery.masteryLevel).toBe(expectedMastery);
            expect(mastery.attemptsCount).toBe(1);
            expect(mastery.successRate).toBe(success ? 1 : 0);
          }
        ),
        { numRuns: 200 }
      );
    });
  });
});
