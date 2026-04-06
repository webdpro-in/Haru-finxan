/**
 * Property-Based Tests for Predictive Failure Detection Service
 * Task 34.4: Write property tests for risk calculation
 * 
 * **Validates: Requirements 4.2.1, 4.2.2, 4.2.3, 4.2.4**
 * 
 * Tests invariants that must hold for all possible inputs:
 * 1. Risk score must always be in [0, 100] (REQ-4.2.1)
 * 2. Risk score > 60 => predictedOutcome = 'at_risk' (REQ-4.2.2)
 * 3. Risk score in [30, 60] => predictedOutcome = 'needs_attention' (REQ-4.2.3)
 * 4. Risk score < 30 => predictedOutcome = 'on_track' (REQ-4.2.4)
 * 5. Confidence must be in [0, 1]
 * 6. Risk factors must have weights that sum to <= 1.0
 * 7. Interventions must be non-empty for at-risk students
 * 8. Risk score must be monotonic with respect to negative indicators
 * 
 * Uses fast-check library for comprehensive property-based testing
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { 
  calculateRiskScore, 
  type StudentProfile, 
  type LearningSession, 
  type ConceptMastery,
  type MoodCheckIn
} from '../PredictiveFailureDetection.js';

describe('PredictiveFailureDetection Property-Based Tests', () => {
  /**
   * Arbitraries (generators) for property-based testing
   */
  
  // Generate valid mastery level (0-100)
  const masteryLevel = fc.integer({ min: 0, max: 100 });
  
  // Generate valid success rate (0-1)
  const successRate = fc.double({ min: 0, max: 1, noNaN: true });
  
  // Generate valid classroom average (0-100)
  const classroomAverage = fc.integer({ min: 0, max: 100 });
  
  // Generate valid mood
  const mood = fc.constantFrom('happy', 'neutral', 'sad', 'anxious', 'frustrated');
  
  // Generate valid energy level (1-5)
  const energyLevel = fc.integer({ min: 1, max: 5 });
  
  // Generate valid attempts count
  const attemptsCount = fc.integer({ min: 1, max: 100 });
  
  // Generate valid session duration (in seconds)
  const sessionDuration = fc.integer({ min: 60, max: 7200 });
  
  // Generate valid questions asked count
  const questionsAsked = fc.integer({ min: 0, max: 50 });
  
  // Generate valid confusion count
  const confusionCount = fc.integer({ min: 0, max: 20 });
  
  // Generate valid mastery change (-20 to +20)
  const masteryChange = fc.integer({ min: -20, max: 20 });

  /**
   * Helper functions to create test data
   */
  
  function createMockMastery(
    name: string,
    level: number,
    attempts: number,
    successRate: number
  ): ConceptMastery {
    return {
      conceptId: `concept_${name.toLowerCase()}`,
      conceptName: name,
      masteryLevel: level,
      lastPracticed: new Date(),
      attemptsCount: attempts,
      successRate,
      prerequisites: []
    };
  }

  function createMockMoodCheckIn(mood: MoodCheckIn['mood'], energy: number): MoodCheckIn {
    return {
      timestamp: new Date(),
      mood,
      energyLevel: energy
    };
  }

  function createMockSession(
    daysAgo: number,
    duration: number,
    questionsAsked: number,
    confusionDetected: boolean,
    confusionCount: number,
    masteryGained: Record<string, number>
  ): LearningSession {
    const now = Date.now();
    return {
      sessionId: `session_${Math.random()}`,
      timestamp: new Date(now - daysAgo * 24 * 60 * 60 * 1000),
      duration,
      topicsCovered: ['Math'],
      questionsAsked,
      confusionDetected,
      confusionCount,
      masteryGained
    };
  }

  function createMockStudent(
    conceptMasteries: Map<string, ConceptMastery>,
    moodHistory: MoodCheckIn[]
  ): StudentProfile {
    return {
      studentId: 'student_test',
      name: 'Test Student',
      grade: 8,
      preferredLanguage: 'en',
      conceptMasteries,
      weakConcepts: [],
      strongConcepts: [],
      learningStyle: 'mixed',
      averageSessionDuration: 1800,
      preferredDifficulty: 'medium',
      totalSessions: 10,
      totalQuestionsAsked: 50,
      recentSessions: [],
      confusionTriggers: [],
      hesitationPatterns: [],
      moodHistory,
      createdAt: new Date(),
      lastActiveAt: new Date(),
      streakDays: 5,
      totalLearningTime: 300
    };
  }

  describe('Risk Score Bounds Invariants', () => {
    it('Property: Risk score must always be in [0, 100] for any valid inputs', () => {
      fc.assert(
        fc.property(
          fc.array(fc.tuple(masteryLevel, successRate), { minLength: 0, maxLength: 10 }),
          fc.array(mood, { minLength: 0, maxLength: 20 }),
          fc.array(fc.boolean(), { minLength: 3, maxLength: 20 }),
          classroomAverage,
          (masteries, moods, confusionFlags, classAvg) => {
            // Create concept masteries
            const conceptMasteries = new Map<string, ConceptMastery>();
            masteries.forEach(([level, rate], idx) => {
              conceptMasteries.set(
                `concept_${idx}`,
                createMockMastery(`Concept${idx}`, level, 5, rate)
              );
            });

            // Create mood history
            const moodHistory = moods.map(m => createMockMoodCheckIn(m, 3));

            // Create sessions with confusion flags
            const sessions = confusionFlags.map((confused, idx) => 
              createMockSession(idx, 1800, 5, confused, confused ? 2 : 0, { math_1: 3 })
            );

            const student = createMockStudent(conceptMasteries, moodHistory);
            const result = calculateRiskScore(student, sessions, classAvg);

            expect(result.riskScore).toBeGreaterThanOrEqual(0);
            expect(result.riskScore).toBeLessThanOrEqual(100);
          }
        ),
        { numRuns: 500 }
      );
    });

    it('Property: Risk score must be deterministic for same inputs', () => {
      fc.assert(
        fc.property(
          fc.array(masteryLevel, { minLength: 1, maxLength: 5 }),
          fc.array(mood, { minLength: 1, maxLength: 10 }),
          classroomAverage,
          (masteries, moods, classAvg) => {
            const conceptMasteries = new Map<string, ConceptMastery>();
            masteries.forEach((level, idx) => {
              conceptMasteries.set(
                `concept_${idx}`,
                createMockMastery(`Concept${idx}`, level, 5, 0.7)
              );
            });

            const moodHistory = moods.map(m => createMockMoodCheckIn(m, 3));
            const sessions = [
              createMockSession(1, 1800, 5, false, 0, { math_1: 3 }),
              createMockSession(2, 1800, 5, false, 0, { math_1: 3 }),
              createMockSession(3, 1800, 5, false, 0, { math_1: 3 })
            ];

            const student = createMockStudent(conceptMasteries, moodHistory);
            
            const result1 = calculateRiskScore(student, sessions, classAvg);
            const result2 = calculateRiskScore(student, sessions, classAvg);

            expect(result1.riskScore).toBe(result2.riskScore);
            expect(result1.predictedOutcome).toBe(result2.predictedOutcome);
          }
        ),
        { numRuns: 200 }
      );
    });

    it('Property: Risk score of 0 is achievable with perfect performance', () => {
      fc.assert(
        fc.property(classroomAverage, (classAvg) => {
          // Perfect student: high mastery, no confusion, positive mood
          const conceptMasteries = new Map<string, ConceptMastery>();
          conceptMasteries.set('math_1', createMockMastery('Algebra', 95, 10, 0.95));
          conceptMasteries.set('math_2', createMockMastery('Geometry', 90, 8, 0.9));

          const moodHistory = [
            createMockMoodCheckIn('happy', 5),
            createMockMoodCheckIn('happy', 5),
            createMockMoodCheckIn('happy', 4)
          ];

          const sessions = [
            createMockSession(1, 1800, 5, false, 0, { math_1: 5, math_2: 5 }),
            createMockSession(2, 1800, 5, false, 0, { math_1: 5, math_2: 5 }),
            createMockSession(3, 1800, 5, false, 0, { math_1: 5, math_2: 5 })
          ];

          const student = createMockStudent(conceptMasteries, moodHistory);
          const result = calculateRiskScore(student, sessions, Math.min(classAvg, 85));

          expect(result.riskScore).toBeLessThan(30);
          expect(result.predictedOutcome).toBe('on_track');
        }),
        { numRuns: 100 }
      );
    });

    it('Property: Risk score of 100 is bounded even with worst performance', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          // Worst case student: low mastery, high confusion, negative mood
          const conceptMasteries = new Map<string, ConceptMastery>();
          conceptMasteries.set('math_1', createMockMastery('Algebra', 10, 20, 0.1));
          conceptMasteries.set('math_2', createMockMastery('Geometry', 5, 15, 0.05));

          const moodHistory = Array(20).fill(null).map(() => 
            createMockMoodCheckIn('anxious', 1)
          );

          const sessions = Array(10).fill(null).map((_, idx) => 
            createMockSession(idx, 1800, 2, true, 5, { math_1: -5, math_2: -5 })
          );

          const student = createMockStudent(conceptMasteries, moodHistory);
          const result = calculateRiskScore(student, sessions, 90);

          expect(result.riskScore).toBeLessThanOrEqual(100);
          expect(result.predictedOutcome).toBe('at_risk');
        }),
        { numRuns: 50 }
      );
    });
  });

  describe('Predicted Outcome Classification Invariants', () => {
    it('Property: Risk score > 60 must always result in at_risk outcome', () => {
      fc.assert(
        fc.property(
          fc.array(masteryLevel, { minLength: 1, maxLength: 5 }),
          fc.array(mood, { minLength: 1, maxLength: 10 }),
          classroomAverage,
          (masteries, moods, classAvg) => {
            const conceptMasteries = new Map<string, ConceptMastery>();
            masteries.forEach((level, idx) => {
              conceptMasteries.set(
                `concept_${idx}`,
                createMockMastery(`Concept${idx}`, Math.min(level, 30), 10, 0.2)
              );
            });

            const moodHistory = moods.map(() => createMockMoodCheckIn('anxious', 1));
            const sessions = Array(10).fill(null).map((_, idx) => 
              createMockSession(idx, 1800, 2, true, 4, { math_1: -5 })
            );

            const student = createMockStudent(conceptMasteries, moodHistory);
            const result = calculateRiskScore(student, sessions, classAvg);

            if (result.riskScore > 60) {
              expect(result.predictedOutcome).toBe('at_risk');
            }
          }
        ),
        { numRuns: 300 }
      );
    });

    it('Property: Risk score in [30, 60] must result in needs_attention outcome', () => {
      fc.assert(
        fc.property(
          fc.array(masteryLevel, { minLength: 1, maxLength: 5 }),
          classroomAverage,
          (masteries, classAvg) => {
            const conceptMasteries = new Map<string, ConceptMastery>();
            masteries.forEach((level, idx) => {
              conceptMasteries.set(
                `concept_${idx}`,
                createMockMastery(`Concept${idx}`, level, 5, 0.6)
              );
            });

            const moodHistory = [createMockMoodCheckIn('neutral', 3)];
            const sessions = Array(5).fill(null).map((_, idx) => 
              createMockSession(idx, 1800, 5, idx % 2 === 0, idx % 2 === 0 ? 2 : 0, { math_1: 2 })
            );

            const student = createMockStudent(conceptMasteries, moodHistory);
            const result = calculateRiskScore(student, sessions, classAvg);

            if (result.riskScore >= 30 && result.riskScore <= 60) {
              expect(result.predictedOutcome).toBe('needs_attention');
            }
          }
        ),
        { numRuns: 300 }
      );
    });

    it('Property: Risk score < 30 must result in on_track outcome', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: 70, max: 100 }), { minLength: 1, maxLength: 5 }),
          fc.integer({ min: 50, max: 80 }),
          (masteries, classAvg) => {
            const conceptMasteries = new Map<string, ConceptMastery>();
            masteries.forEach((level, idx) => {
              conceptMasteries.set(
                `concept_${idx}`,
                createMockMastery(`Concept${idx}`, level, 5, 0.85)
              );
            });

            const moodHistory = [createMockMoodCheckIn('happy', 4)];
            const sessions = Array(5).fill(null).map((_, idx) => 
              createMockSession(idx, 1800, 5, false, 0, { math_1: 5 })
            );

            const student = createMockStudent(conceptMasteries, moodHistory);
            const result = calculateRiskScore(student, sessions, classAvg);

            if (result.riskScore < 30) {
              expect(result.predictedOutcome).toBe('on_track');
            }
          }
        ),
        { numRuns: 300 }
      );
    });

    it('Property: Outcome classification must be exhaustive and mutually exclusive', () => {
      fc.assert(
        fc.property(
          fc.array(masteryLevel, { minLength: 1, maxLength: 5 }),
          fc.array(mood, { minLength: 1, maxLength: 10 }),
          classroomAverage,
          (masteries, moods, classAvg) => {
            const conceptMasteries = new Map<string, ConceptMastery>();
            masteries.forEach((level, idx) => {
              conceptMasteries.set(
                `concept_${idx}`,
                createMockMastery(`Concept${idx}`, level, 5, 0.6)
              );
            });

            const moodHistory = moods.map(m => createMockMoodCheckIn(m, 3));
            const sessions = Array(5).fill(null).map((_, idx) => 
              createMockSession(idx, 1800, 5, false, 0, { math_1: 3 })
            );

            const student = createMockStudent(conceptMasteries, moodHistory);
            const result = calculateRiskScore(student, sessions, classAvg);

            // Must be exactly one of the three outcomes
            const validOutcomes = ['at_risk', 'needs_attention', 'on_track'];
            expect(validOutcomes).toContain(result.predictedOutcome);

            // Verify classification matches score
            if (result.riskScore > 60) {
              expect(result.predictedOutcome).toBe('at_risk');
            } else if (result.riskScore >= 30) {
              expect(result.predictedOutcome).toBe('needs_attention');
            } else {
              expect(result.predictedOutcome).toBe('on_track');
            }
          }
        ),
        { numRuns: 500 }
      );
    });
  });

  describe('Confidence Bounds Invariants', () => {
    it('Property: Confidence must always be in [0, 1]', () => {
      fc.assert(
        fc.property(
          fc.array(masteryLevel, { minLength: 0, maxLength: 10 }),
          fc.array(fc.boolean(), { minLength: 1, maxLength: 30 }),
          classroomAverage,
          (masteries, confusionFlags, classAvg) => {
            const conceptMasteries = new Map<string, ConceptMastery>();
            masteries.forEach((level, idx) => {
              conceptMasteries.set(
                `concept_${idx}`,
                createMockMastery(`Concept${idx}`, level, 5, 0.6)
              );
            });

            const sessions = confusionFlags.map((confused, idx) => 
              createMockSession(idx, 1800, 5, confused, confused ? 2 : 0, { math_1: 3 })
            );

            const student = createMockStudent(conceptMasteries, []);
            const result = calculateRiskScore(student, sessions, classAvg);

            expect(result.confidence).toBeGreaterThanOrEqual(0);
            expect(result.confidence).toBeLessThanOrEqual(1);
          }
        ),
        { numRuns: 500 }
      );
    });

    it('Property: Confidence increases with more session data', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 3, max: 5 }),
          fc.integer({ min: 15, max: 30 }),
          classroomAverage,
          (fewSessions, manySessions, classAvg) => {
            const conceptMasteries = new Map<string, ConceptMastery>();
            conceptMasteries.set('math_1', createMockMastery('Algebra', 70, 5, 0.7));

            const student = createMockStudent(conceptMasteries, []);

            // Few sessions
            const sessionsLow = Array(fewSessions).fill(null).map((_, idx) => 
              createMockSession(idx, 1800, 5, false, 0, { math_1: 3 })
            );
            const resultLow = calculateRiskScore(student, sessionsLow, classAvg);

            // Many sessions
            const sessionsHigh = Array(manySessions).fill(null).map((_, idx) => 
              createMockSession(idx, 1800, 5, false, 0, { math_1: 3 })
            );
            const resultHigh = calculateRiskScore(student, sessionsHigh, classAvg);

            expect(resultHigh.confidence).toBeGreaterThanOrEqual(resultLow.confidence);
          }
        ),
        { numRuns: 200 }
      );
    });

    it('Property: Confidence with 10+ sessions should be >= 0.8', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10, max: 50 }),
          classroomAverage,
          (sessionCount, classAvg) => {
            const conceptMasteries = new Map<string, ConceptMastery>();
            conceptMasteries.set('math_1', createMockMastery('Algebra', 70, 5, 0.7));

            const student = createMockStudent(conceptMasteries, []);
            const sessions = Array(sessionCount).fill(null).map((_, idx) => 
              createMockSession(idx, 1800, 5, false, 0, { math_1: 3 })
            );

            const result = calculateRiskScore(student, sessions, classAvg);

            expect(result.confidence).toBeGreaterThanOrEqual(0.8);
          }
        ),
        { numRuns: 200 }
      );
    });
  });

  describe('Risk Factor Weight Invariants', () => {
    it('Property: Sum of risk factor weights must be <= 1.0', () => {
      fc.assert(
        fc.property(
          fc.array(masteryLevel, { minLength: 1, maxLength: 10 }),
          fc.array(mood, { minLength: 1, maxLength: 20 }),
          classroomAverage,
          (masteries, moods, classAvg) => {
            const conceptMasteries = new Map<string, ConceptMastery>();
            masteries.forEach((level, idx) => {
              conceptMasteries.set(
                `concept_${idx}`,
                createMockMastery(`Concept${idx}`, level, 5, 0.5)
              );
            });

            const moodHistory = moods.map(m => createMockMoodCheckIn(m, 3));
            const sessions = Array(10).fill(null).map((_, idx) => 
              createMockSession(idx, 1800, 5, true, 2, { math_1: -2 })
            );

            const student = createMockStudent(conceptMasteries, moodHistory);
            const result = calculateRiskScore(student, sessions, classAvg);

            const totalWeight = result.riskFactors.reduce((sum, f) => sum + f.weight, 0);
            expect(totalWeight).toBeLessThanOrEqual(1.0);
          }
        ),
        { numRuns: 300 }
      );
    });

    it('Property: Each risk factor weight must be in (0, 1]', () => {
      fc.assert(
        fc.property(
          fc.array(masteryLevel, { minLength: 1, maxLength: 10 }),
          classroomAverage,
          (masteries, classAvg) => {
            const conceptMasteries = new Map<string, ConceptMastery>();
            masteries.forEach((level, idx) => {
              conceptMasteries.set(
                `concept_${idx}`,
                createMockMastery(`Concept${idx}`, level, 5, 0.5)
              );
            });

            const sessions = Array(10).fill(null).map((_, idx) => 
              createMockSession(idx, 1800, 5, true, 2, { math_1: -2 })
            );

            const student = createMockStudent(conceptMasteries, []);
            const result = calculateRiskScore(student, sessions, classAvg);

            result.riskFactors.forEach(factor => {
              expect(factor.weight).toBeGreaterThan(0);
              expect(factor.weight).toBeLessThanOrEqual(1);
            });
          }
        ),
        { numRuns: 300 }
      );
    });

    it('Property: Risk factors must have non-empty descriptions', () => {
      fc.assert(
        fc.property(
          fc.array(masteryLevel, { minLength: 1, maxLength: 10 }),
          classroomAverage,
          (masteries, classAvg) => {
            const conceptMasteries = new Map<string, ConceptMastery>();
            masteries.forEach((level, idx) => {
              conceptMasteries.set(
                `concept_${idx}`,
                createMockMastery(`Concept${idx}`, level, 5, 0.5)
              );
            });

            const sessions = Array(10).fill(null).map((_, idx) => 
              createMockSession(idx, 1800, 5, true, 2, { math_1: -2 })
            );

            const student = createMockStudent(conceptMasteries, []);
            const result = calculateRiskScore(student, sessions, classAvg);

            result.riskFactors.forEach(factor => {
              expect(factor.factor).toBeTruthy();
              expect(factor.factor.length).toBeGreaterThan(0);
              expect(factor.description).toBeTruthy();
              expect(factor.description.length).toBeGreaterThan(0);
            });
          }
        ),
        { numRuns: 200 }
      );
    });
  });

  describe('Intervention Generation Invariants', () => {
    it('Property: At-risk students must have non-empty interventions', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: 0, max: 30 }), { minLength: 1, maxLength: 5 }),
          classroomAverage,
          (lowMasteries, classAvg) => {
            const conceptMasteries = new Map<string, ConceptMastery>();
            lowMasteries.forEach((level, idx) => {
              conceptMasteries.set(
                `concept_${idx}`,
                createMockMastery(`Concept${idx}`, level, 10, 0.2)
              );
            });

            const moodHistory = Array(10).fill(null).map(() => 
              createMockMoodCheckIn('anxious', 1)
            );

            const sessions = Array(10).fill(null).map((_, idx) => 
              createMockSession(idx, 1800, 2, true, 4, { math_1: -5 })
            );

            const student = createMockStudent(conceptMasteries, moodHistory);
            const result = calculateRiskScore(student, sessions, classAvg);

            if (result.predictedOutcome === 'at_risk') {
              expect(result.recommendedInterventions.length).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 200 }
      );
    });

    it('Property: Interventions must be limited to 5 maximum', () => {
      fc.assert(
        fc.property(
          fc.array(masteryLevel, { minLength: 1, maxLength: 10 }),
          fc.array(mood, { minLength: 1, maxLength: 20 }),
          classroomAverage,
          (masteries, moods, classAvg) => {
            const conceptMasteries = new Map<string, ConceptMastery>();
            masteries.forEach((level, idx) => {
              conceptMasteries.set(
                `concept_${idx}`,
                createMockMastery(`Concept${idx}`, level, 5, 0.3)
              );
            });

            const moodHistory = moods.map(m => createMockMoodCheckIn(m, 2));
            const sessions = Array(10).fill(null).map((_, idx) => 
              createMockSession(idx, 1800, 2, true, 3, { math_1: -3 })
            );

            const student = createMockStudent(conceptMasteries, moodHistory);
            const result = calculateRiskScore(student, sessions, classAvg);

            expect(result.recommendedInterventions.length).toBeLessThanOrEqual(5);
          }
        ),
        { numRuns: 300 }
      );
    });

    it('Property: Interventions must be unique (no duplicates)', () => {
      fc.assert(
        fc.property(
          fc.array(masteryLevel, { minLength: 1, maxLength: 10 }),
          classroomAverage,
          (masteries, classAvg) => {
            const conceptMasteries = new Map<string, ConceptMastery>();
            masteries.forEach((level, idx) => {
              conceptMasteries.set(
                `concept_${idx}`,
                createMockMastery(`Concept${idx}`, level, 5, 0.3)
              );
            });

            const sessions = Array(10).fill(null).map((_, idx) => 
              createMockSession(idx, 1800, 2, true, 3, { math_1: -3 })
            );

            const student = createMockStudent(conceptMasteries, []);
            const result = calculateRiskScore(student, sessions, classAvg);

            const uniqueInterventions = new Set(result.recommendedInterventions);
            expect(uniqueInterventions.size).toBe(result.recommendedInterventions.length);
          }
        ),
        { numRuns: 300 }
      );
    });
  });

  describe('Monotonicity Invariants', () => {
    it('Property: Lower mastery levels should increase risk score', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 70, max: 100 }),
          fc.integer({ min: 20, max: 50 }),
          classroomAverage,
          (highMastery, lowMastery, classAvg) => {
            const sessions = Array(5).fill(null).map((_, idx) => 
              createMockSession(idx, 1800, 5, false, 0, { math_1: 3 })
            );

            // High mastery student
            const highMasteryMap = new Map<string, ConceptMastery>();
            highMasteryMap.set('math_1', createMockMastery('Algebra', highMastery, 5, 0.9));
            const studentHigh = createMockStudent(highMasteryMap, []);
            const resultHigh = calculateRiskScore(studentHigh, sessions, classAvg);

            // Low mastery student
            const lowMasteryMap = new Map<string, ConceptMastery>();
            lowMasteryMap.set('math_1', createMockMastery('Algebra', lowMastery, 5, 0.3));
            const studentLow = createMockStudent(lowMasteryMap, []);
            const resultLow = calculateRiskScore(studentLow, sessions, classAvg);

            expect(resultLow.riskScore).toBeGreaterThanOrEqual(resultHigh.riskScore);
          }
        ),
        { numRuns: 200 }
      );
    });

    it('Property: More confusion events should increase risk score', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 2 }),
          fc.integer({ min: 8, max: 10 }),
          classroomAverage,
          (lowConfusion, highConfusion, classAvg) => {
            const conceptMasteries = new Map<string, ConceptMastery>();
            conceptMasteries.set('math_1', createMockMastery('Algebra', 70, 5, 0.7));

            const student = createMockStudent(conceptMasteries, []);

            // Low confusion sessions
            const sessionsLow = Array(10).fill(null).map((_, idx) => 
              createMockSession(idx, 1800, 5, idx < lowConfusion, idx < lowConfusion ? 2 : 0, { math_1: 3 })
            );
            const resultLow = calculateRiskScore(student, sessionsLow, classAvg);

            // High confusion sessions
            const sessionsHigh = Array(10).fill(null).map((_, idx) => 
              createMockSession(idx, 1800, 5, idx < highConfusion, idx < highConfusion ? 2 : 0, { math_1: 3 })
            );
            const resultHigh = calculateRiskScore(student, sessionsHigh, classAvg);

            expect(resultHigh.riskScore).toBeGreaterThanOrEqual(resultLow.riskScore);
          }
        ),
        { numRuns: 200 }
      );
    });

    it('Property: More negative moods should increase risk score', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 2 }),
          fc.integer({ min: 8, max: 10 }),
          classroomAverage,
          (fewNegative, manyNegative, classAvg) => {
            const conceptMasteries = new Map<string, ConceptMastery>();
            conceptMasteries.set('math_1', createMockMastery('Algebra', 70, 5, 0.7));

            const sessions = Array(5).fill(null).map((_, idx) => 
              createMockSession(idx, 1800, 5, false, 0, { math_1: 3 })
            );

            // Few negative moods
            const moodHistoryLow = Array(10).fill(null).map((_, idx) => 
              createMockMoodCheckIn(idx < fewNegative ? 'anxious' : 'happy', 3)
            );
            const studentLow = createMockStudent(conceptMasteries, moodHistoryLow);
            const resultLow = calculateRiskScore(studentLow, sessions, classAvg);

            // Many negative moods
            const moodHistoryHigh = Array(10).fill(null).map((_, idx) => 
              createMockMoodCheckIn(idx < manyNegative ? 'anxious' : 'happy', 3)
            );
            const studentHigh = createMockStudent(conceptMasteries, moodHistoryHigh);
            const resultHigh = calculateRiskScore(studentHigh, sessions, classAvg);

            expect(resultHigh.riskScore).toBeGreaterThanOrEqual(resultLow.riskScore);
          }
        ),
        { numRuns: 200 }
      );
    });

    it('Property: Larger session gaps should increase risk score', () => {
      fc.assert(
        fc.property(
          classroomAverage,
          (classAvg) => {
            const conceptMasteries = new Map<string, ConceptMastery>();
            conceptMasteries.set('math_1', createMockMastery('Algebra', 70, 5, 0.7));

            const student = createMockStudent(conceptMasteries, []);

            // Regular sessions (1 day apart)
            const sessionsRegular = Array(5).fill(null).map((_, idx) => 
              createMockSession(idx, 1800, 5, false, 0, { math_1: 3 })
            );
            const resultRegular = calculateRiskScore(student, sessionsRegular, classAvg);

            // Irregular sessions (5+ days apart)
            const sessionsIrregular = Array(5).fill(null).map((_, idx) => 
              createMockSession(idx * 5, 1800, 5, false, 0, { math_1: 3 })
            );
            const resultIrregular = calculateRiskScore(student, sessionsIrregular, classAvg);

            expect(resultIrregular.riskScore).toBeGreaterThanOrEqual(resultRegular.riskScore);
          }
        ),
        { numRuns: 200 }
      );
    });

    it('Property: Being below classroom average should increase risk score', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 50, max: 70 }),
          fc.integer({ min: 75, max: 95 }),
          (studentMastery, classAvg) => {
            const conceptMasteries = new Map<string, ConceptMastery>();
            conceptMasteries.set('math_1', createMockMastery('Algebra', studentMastery, 5, 0.7));

            const sessions = Array(5).fill(null).map((_, idx) => 
              createMockSession(idx, 1800, 5, false, 0, { math_1: 3 })
            );

            const student = createMockStudent(conceptMasteries, []);
            
            // Compare with high classroom average
            const resultBelowAvg = calculateRiskScore(student, sessions, classAvg);
            
            // Compare with low classroom average
            const resultAboveAvg = calculateRiskScore(student, sessions, studentMastery - 15);

            expect(resultBelowAvg.riskScore).toBeGreaterThanOrEqual(resultAboveAvg.riskScore);
          }
        ),
        { numRuns: 200 }
      );
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('Property: Empty concept masteries should not crash', () => {
      fc.assert(
        fc.property(classroomAverage, (classAvg) => {
          const conceptMasteries = new Map<string, ConceptMastery>();
          const student = createMockStudent(conceptMasteries, []);
          
          const sessions = Array(5).fill(null).map((_, idx) => 
            createMockSession(idx, 1800, 5, false, 0, {})
          );

          expect(() => {
            const result = calculateRiskScore(student, sessions, classAvg);
            expect(result.riskScore).toBeGreaterThanOrEqual(0);
            expect(result.riskScore).toBeLessThanOrEqual(100);
          }).not.toThrow();
        }),
        { numRuns: 100 }
      );
    });

    it('Property: Empty mood history should not crash', () => {
      fc.assert(
        fc.property(
          fc.array(masteryLevel, { minLength: 1, maxLength: 5 }),
          classroomAverage,
          (masteries, classAvg) => {
            const conceptMasteries = new Map<string, ConceptMastery>();
            masteries.forEach((level, idx) => {
              conceptMasteries.set(
                `concept_${idx}`,
                createMockMastery(`Concept${idx}`, level, 5, 0.7)
              );
            });

            const student = createMockStudent(conceptMasteries, []);
            const sessions = Array(5).fill(null).map((_, idx) => 
              createMockSession(idx, 1800, 5, false, 0, { math_1: 3 })
            );

            expect(() => {
              const result = calculateRiskScore(student, sessions, classAvg);
              expect(result.riskScore).toBeGreaterThanOrEqual(0);
              expect(result.riskScore).toBeLessThanOrEqual(100);
            }).not.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property: Minimum sessions (3) should produce valid results', () => {
      fc.assert(
        fc.property(
          fc.array(masteryLevel, { minLength: 1, maxLength: 5 }),
          classroomAverage,
          (masteries, classAvg) => {
            const conceptMasteries = new Map<string, ConceptMastery>();
            masteries.forEach((level, idx) => {
              conceptMasteries.set(
                `concept_${idx}`,
                createMockMastery(`Concept${idx}`, level, 5, 0.7)
              );
            });

            const student = createMockStudent(conceptMasteries, []);
            const sessions = Array(3).fill(null).map((_, idx) => 
              createMockSession(idx, 1800, 5, false, 0, { math_1: 3 })
            );

            const result = calculateRiskScore(student, sessions, classAvg);

            expect(result.riskScore).toBeGreaterThanOrEqual(0);
            expect(result.riskScore).toBeLessThanOrEqual(100);
            expect(result.confidence).toBeGreaterThanOrEqual(0);
            expect(result.confidence).toBeLessThanOrEqual(1);
            expect(['at_risk', 'needs_attention', 'on_track']).toContain(result.predictedOutcome);
          }
        ),
        { numRuns: 200 }
      );
    });

    it('Property: Extreme classroom averages (0 or 100) should not crash', () => {
      fc.assert(
        fc.property(
          fc.array(masteryLevel, { minLength: 1, maxLength: 5 }),
          fc.constantFrom(0, 100),
          (masteries, extremeAvg) => {
            const conceptMasteries = new Map<string, ConceptMastery>();
            masteries.forEach((level, idx) => {
              conceptMasteries.set(
                `concept_${idx}`,
                createMockMastery(`Concept${idx}`, level, 5, 0.7)
              );
            });

            const student = createMockStudent(conceptMasteries, []);
            const sessions = Array(5).fill(null).map((_, idx) => 
              createMockSession(idx, 1800, 5, false, 0, { math_1: 3 })
            );

            expect(() => {
              const result = calculateRiskScore(student, sessions, extremeAvg);
              expect(result.riskScore).toBeGreaterThanOrEqual(0);
              expect(result.riskScore).toBeLessThanOrEqual(100);
            }).not.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property: All sessions with zero mastery gain should not crash', () => {
      fc.assert(
        fc.property(
          fc.array(masteryLevel, { minLength: 1, maxLength: 5 }),
          classroomAverage,
          (masteries, classAvg) => {
            const conceptMasteries = new Map<string, ConceptMastery>();
            masteries.forEach((level, idx) => {
              conceptMasteries.set(
                `concept_${idx}`,
                createMockMastery(`Concept${idx}`, level, 5, 0.7)
              );
            });

            const student = createMockStudent(conceptMasteries, []);
            const sessions = Array(5).fill(null).map((_, idx) => 
              createMockSession(idx, 1800, 5, false, 0, {})
            );

            expect(() => {
              const result = calculateRiskScore(student, sessions, classAvg);
              expect(result.riskScore).toBeGreaterThanOrEqual(0);
              expect(result.riskScore).toBeLessThanOrEqual(100);
            }).not.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property: Very large session counts should not cause performance issues', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 50, max: 200 }),
          classroomAverage,
          (sessionCount, classAvg) => {
            const conceptMasteries = new Map<string, ConceptMastery>();
            conceptMasteries.set('math_1', createMockMastery('Algebra', 70, 5, 0.7));

            const student = createMockStudent(conceptMasteries, []);
            const sessions = Array(sessionCount).fill(null).map((_, idx) => 
              createMockSession(idx, 1800, 5, false, 0, { math_1: 3 })
            );

            const startTime = Date.now();
            const result = calculateRiskScore(student, sessions, classAvg);
            const endTime = Date.now();

            expect(result.riskScore).toBeGreaterThanOrEqual(0);
            expect(result.riskScore).toBeLessThanOrEqual(100);
            expect(endTime - startTime).toBeLessThan(1000); // Should complete in < 1 second
          }
        ),
        { numRuns: 50 }
      );
    });

    it('Property: Student with all perfect scores should have minimal risk', () => {
      fc.assert(
        fc.property(classroomAverage, (classAvg) => {
          const conceptMasteries = new Map<string, ConceptMastery>();
          for (let i = 0; i < 10; i++) {
            conceptMasteries.set(
              `concept_${i}`,
              createMockMastery(`Concept${i}`, 100, 10, 1.0)
            );
          }

          const moodHistory = Array(20).fill(null).map(() => 
            createMockMoodCheckIn('happy', 5)
          );

          const sessions = Array(20).fill(null).map((_, idx) => 
            createMockSession(idx, 1800, 10, false, 0, { math_1: 5 })
          );

          const student = createMockStudent(conceptMasteries, moodHistory);
          const result = calculateRiskScore(student, sessions, Math.min(classAvg, 95));

          expect(result.riskScore).toBeLessThan(30);
          expect(result.predictedOutcome).toBe('on_track');
          expect(result.riskFactors.length).toBe(0);
        }),
        { numRuns: 50 }
      );
    });
  });

  describe('Complete Algorithm Invariants', () => {
    it('Property: All output fields must be present and valid', () => {
      fc.assert(
        fc.property(
          fc.array(masteryLevel, { minLength: 1, maxLength: 10 }),
          fc.array(mood, { minLength: 1, maxLength: 20 }),
          classroomAverage,
          (masteries, moods, classAvg) => {
            const conceptMasteries = new Map<string, ConceptMastery>();
            masteries.forEach((level, idx) => {
              conceptMasteries.set(
                `concept_${idx}`,
                createMockMastery(`Concept${idx}`, level, 5, 0.6)
              );
            });

            const moodHistory = moods.map(m => createMockMoodCheckIn(m, 3));
            const sessions = Array(5).fill(null).map((_, idx) => 
              createMockSession(idx, 1800, 5, false, 0, { math_1: 3 })
            );

            const student = createMockStudent(conceptMasteries, moodHistory);
            const result = calculateRiskScore(student, sessions, classAvg);

            // Verify all required fields are present
            expect(result.studentId).toBeTruthy();
            expect(result.studentName).toBeTruthy();
            expect(typeof result.riskScore).toBe('number');
            expect(Array.isArray(result.riskFactors)).toBe(true);
            expect(Array.isArray(result.recommendedInterventions)).toBe(true);
            expect(result.predictedOutcome).toBeTruthy();
            expect(typeof result.confidence).toBe('number');

            // Verify field constraints
            expect(result.riskScore).toBeGreaterThanOrEqual(0);
            expect(result.riskScore).toBeLessThanOrEqual(100);
            expect(result.confidence).toBeGreaterThanOrEqual(0);
            expect(result.confidence).toBeLessThanOrEqual(1);
            expect(['at_risk', 'needs_attention', 'on_track']).toContain(result.predictedOutcome);
          }
        ),
        { numRuns: 500 }
      );
    });

    it('Property: Risk calculation must be idempotent', () => {
      fc.assert(
        fc.property(
          fc.array(masteryLevel, { minLength: 1, maxLength: 5 }),
          fc.array(mood, { minLength: 1, maxLength: 10 }),
          classroomAverage,
          (masteries, moods, classAvg) => {
            const conceptMasteries = new Map<string, ConceptMastery>();
            masteries.forEach((level, idx) => {
              conceptMasteries.set(
                `concept_${idx}`,
                createMockMastery(`Concept${idx}`, level, 5, 0.6)
              );
            });

            const moodHistory = moods.map(m => createMockMoodCheckIn(m, 3));
            const sessions = Array(5).fill(null).map((_, idx) => 
              createMockSession(idx, 1800, 5, false, 0, { math_1: 3 })
            );

            const student = createMockStudent(conceptMasteries, moodHistory);
            
            // Call multiple times
            const result1 = calculateRiskScore(student, sessions, classAvg);
            const result2 = calculateRiskScore(student, sessions, classAvg);
            const result3 = calculateRiskScore(student, sessions, classAvg);

            // All results should be identical
            expect(result1.riskScore).toBe(result2.riskScore);
            expect(result2.riskScore).toBe(result3.riskScore);
            expect(result1.predictedOutcome).toBe(result2.predictedOutcome);
            expect(result2.predictedOutcome).toBe(result3.predictedOutcome);
            expect(result1.confidence).toBe(result2.confidence);
            expect(result2.confidence).toBe(result3.confidence);
          }
        ),
        { numRuns: 200 }
      );
    });
  });
});
