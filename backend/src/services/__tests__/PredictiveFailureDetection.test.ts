/**
 * Unit tests for Predictive Failure Detection Service
 * Tests risk score calculation with various student scenarios
 */

import { describe, it, expect } from 'vitest';
import { calculateRiskScore, type StudentProfile, type LearningSession, type ConceptMastery } from '../PredictiveFailureDetection.js';

describe('PredictiveFailureDetection', () => {
  describe('calculateRiskScore', () => {
    it('should return on_track for student with good performance', () => {
      const student = createMockStudent({
        conceptMasteries: new Map([
          ['math_1', createMockMastery('Algebra', 85, 5, 0.9)],
          ['math_2', createMockMastery('Geometry', 80, 4, 0.85)]
        ]),
        moodHistory: [
          { timestamp: new Date(), mood: 'happy', energyLevel: 4 },
          { timestamp: new Date(), mood: 'happy', energyLevel: 5 }
        ]
      });

      const sessions = createMockSessions(5, {
        confusionDetected: false,
        masteryGained: { math_1: 5, math_2: 5 }
      });

      const result = calculateRiskScore(student, sessions, 75);

      expect(result.predictedOutcome).toBe('on_track');
      expect(result.riskScore).toBeLessThan(30);
      expect(result.riskFactors).toHaveLength(0);
    });

    it('should detect declining mastery trend', () => {
      const student = createMockStudent({
        conceptMasteries: new Map([
          ['math_1', createMockMastery('Algebra', 60, 8, 0.5)]
        ])
      });

      const sessions = createMockSessions(5, {
        masteryGained: { math_1: -3 } // Declining
      });

      const result = calculateRiskScore(student, sessions, 75);

      expect(result.riskFactors.some(f => f.factor.includes('mastery trend'))).toBe(true);
      expect(result.recommendedInterventions).toContain('Schedule 1-on-1 tutoring session');
    });

    it('should detect high confusion frequency', () => {
      const student = createMockStudent();

      const sessions = createMockSessions(5, {
        confusionDetected: true,
        confusionCount: 3
      });

      const result = calculateRiskScore(student, sessions, 75);

      expect(result.riskFactors.some(f => f.factor.includes('confusion'))).toBe(true);
      expect(result.recommendedInterventions).toContain('Simplify explanations, use more examples');
    });

    it('should detect reduced engagement (large session gaps)', () => {
      const student = createMockStudent();

      const now = new Date();
      const sessions: LearningSession[] = [
        createMockSession({ timestamp: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000) }),
        createMockSession({ timestamp: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000) }),
        createMockSession({ timestamp: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000) })
      ];

      const result = calculateRiskScore(student, sessions, 75);

      expect(result.riskFactors.some(f => f.factor.includes('engagement'))).toBe(true);
      expect(result.recommendedInterventions).toContain('Send motivational message to parent');
    });

    it('should detect below classroom average', () => {
      const student = createMockStudent({
        conceptMasteries: new Map([
          ['math_1', createMockMastery('Algebra', 50, 5, 0.6)],
          ['math_2', createMockMastery('Geometry', 45, 4, 0.5)]
        ])
      });

      const sessions = createMockSessions(5);

      const result = calculateRiskScore(student, sessions, 75);

      expect(result.riskFactors.some(f => f.factor.includes('classroom average'))).toBe(true);
      expect(result.recommendedInterventions).toContain('Pair with peer mentor');
    });

    it('should detect repeated failures', () => {
      const student = createMockStudent({
        conceptMasteries: new Map([
          ['math_1', createMockMastery('Algebra', 40, 5, 0.3)],
          ['math_2', createMockMastery('Geometry', 35, 6, 0.25)]
        ])
      });

      const sessions = createMockSessions(5);

      const result = calculateRiskScore(student, sessions, 75);
      
      console.log('Risk factors:', result.riskFactors);
      console.log('Risk score:', result.riskScore);

      expect(result.riskFactors.some(f => f.factor.includes('repeated failures'))).toBe(true);
      expect(result.recommendedInterventions).toContain('Identify root cause with prerequisite detective');
    });

    it('should detect negative mood patterns', () => {
      const student = createMockStudent({
        moodHistory: [
          { timestamp: new Date(), mood: 'anxious', energyLevel: 2 },
          { timestamp: new Date(), mood: 'frustrated', energyLevel: 2 },
          { timestamp: new Date(), mood: 'sad', energyLevel: 1 },
          { timestamp: new Date(), mood: 'anxious', energyLevel: 2 },
          { timestamp: new Date(), mood: 'happy', energyLevel: 4 }
        ]
      });

      const sessions = createMockSessions(5);

      const result = calculateRiskScore(student, sessions, 75);

      expect(result.riskFactors.some(f => f.factor.includes('mood'))).toBe(true);
      expect(result.recommendedInterventions).toContain('Check in with school counselor');
    });

    it('should classify as at_risk when score > 60', () => {
      const student = createMockStudent({
        conceptMasteries: new Map([
          ['math_1', createMockMastery('Algebra', 30, 8, 0.2)],
          ['math_2', createMockMastery('Geometry', 25, 7, 0.15)]
        ]),
        moodHistory: [
          { timestamp: new Date(), mood: 'anxious', energyLevel: 1 },
          { timestamp: new Date(), mood: 'frustrated', energyLevel: 2 },
          { timestamp: new Date(), mood: 'sad', energyLevel: 1 }
        ]
      });

      const sessions = createMockSessions(5, {
        confusionDetected: true,
        confusionCount: 4,
        masteryGained: { math_1: -5, math_2: -4 }
      });

      const result = calculateRiskScore(student, sessions, 75);

      expect(result.predictedOutcome).toBe('at_risk');
      expect(result.riskScore).toBeGreaterThan(60);
    });

    it('should classify as needs_attention when score 30-60', () => {
      const student = createMockStudent({
        conceptMasteries: new Map([
          ['math_1', createMockMastery('Algebra', 55, 5, 0.6)]
        ])
      });

      const sessions = createMockSessions(5, {
        confusionDetected: true,
        confusionCount: 2
      });

      const result = calculateRiskScore(student, sessions, 75);

      expect(result.predictedOutcome).toBe('needs_attention');
      expect(result.riskScore).toBeGreaterThanOrEqual(30);
      expect(result.riskScore).toBeLessThanOrEqual(60);
    });

    it('should calculate confidence based on data completeness', () => {
      const student = createMockStudent();

      // Test with minimal sessions (3)
      const minimalSessions = createMockSessions(3);
      const minimalResult = calculateRiskScore(student, minimalSessions, 75);
      expect(minimalResult.confidence).toBeLessThan(0.5);

      // Test with many sessions (10+)
      const manySessions = createMockSessions(15);
      const manyResult = calculateRiskScore(student, manySessions, 75);
      expect(manyResult.confidence).toBeGreaterThan(0.8);
    });

    it('should limit interventions to 5 maximum', () => {
      const student = createMockStudent({
        conceptMasteries: new Map([
          ['math_1', createMockMastery('Algebra', 30, 8, 0.2)],
          ['math_2', createMockMastery('Geometry', 25, 7, 0.15)]
        ]),
        moodHistory: [
          { timestamp: new Date(), mood: 'anxious', energyLevel: 1 },
          { timestamp: new Date(), mood: 'frustrated', energyLevel: 2 }
        ]
      });

      const sessions = createMockSessions(5, {
        confusionDetected: true,
        masteryGained: { math_1: -5 }
      });

      const result = calculateRiskScore(student, sessions, 75);

      expect(result.recommendedInterventions.length).toBeLessThanOrEqual(5);
    });

    it('should handle student with no mood history', () => {
      const student = createMockStudent({
        moodHistory: []
      });

      const sessions = createMockSessions(5);

      const result = calculateRiskScore(student, sessions, 75);

      expect(result.riskFactors.some(f => f.factor.includes('mood'))).toBe(false);
    });

    it('should handle student with no concept masteries', () => {
      const student = createMockStudent({
        conceptMasteries: new Map()
      });

      const sessions = createMockSessions(5);

      const result = calculateRiskScore(student, sessions, 75);

      expect(result).toBeDefined();
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
    });
  });
});

// Helper functions for creating mock data

function createMockStudent(overrides: Partial<StudentProfile> = {}): StudentProfile {
  return {
    studentId: 'student_123',
    name: 'Test Student',
    grade: 8,
    preferredLanguage: 'en',
    conceptMasteries: new Map(),
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
    moodHistory: [],
    createdAt: new Date(),
    lastActiveAt: new Date(),
    streakDays: 5,
    totalLearningTime: 300,
    ...overrides
  };
}

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

function createMockSession(overrides: Partial<LearningSession> = {}): LearningSession {
  return {
    sessionId: `session_${Math.random()}`,
    timestamp: new Date(),
    duration: 1800,
    topicsCovered: ['Algebra'],
    questionsAsked: 5,
    confusionDetected: false,
    confusionCount: 0,
    masteryGained: { math_1: 3 },
    ...overrides
  };
}

function createMockSessions(
  count: number,
  overrides: Partial<LearningSession> = {}
): LearningSession[] {
  const sessions: LearningSession[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    sessions.push(
      createMockSession({
        timestamp: new Date(now - i * 24 * 60 * 60 * 1000), // 1 day apart
        ...overrides
      })
    );
  }

  return sessions;
}
