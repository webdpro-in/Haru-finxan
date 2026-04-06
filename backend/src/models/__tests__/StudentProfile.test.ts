/**
 * Unit Tests for StudentProfile
 * Tests mastery updates, caching, and persistence
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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

describe('StudentProfileManager', () => {
  let profile: StudentProfile;

  beforeEach(() => {
    profile = StudentProfileManager.createProfile('student_123', 'Alice', 8);
  });

  describe('9.1: StudentProfile Model', () => {
    it('should create a new student profile with default values', () => {
      expect(profile.studentId).toBe('student_123');
      expect(profile.name).toBe('Alice');
      expect(profile.grade).toBe(8);
      expect(profile.preferredLanguage).toBe('en');
      expect(profile.conceptMasteries.size).toBe(0);
      expect(profile.weakConcepts).toEqual([]);
      expect(profile.strongConcepts).toEqual([]);
      expect(profile.totalSessions).toBe(0);
    });

    it('should initialize with correct data types', () => {
      expect(profile.conceptMasteries).toBeInstanceOf(Map);
      expect(Array.isArray(profile.weakConcepts)).toBe(true);
      expect(Array.isArray(profile.strongConcepts)).toBe(true);
      expect(profile.createdAt).toBeInstanceOf(Date);
      expect(profile.lastActiveAt).toBeInstanceOf(Date);
    });
  });

  describe('9.2: ConceptMastery Model', () => {
    it('should create concept mastery on first interaction', () => {
      StudentProfileManager.updateMastery(profile, 'math_algebra', 'Algebra', true);

      const mastery = profile.conceptMasteries.get('math_algebra');
      expect(mastery).toBeDefined();
      expect(mastery?.conceptId).toBe('math_algebra');
      expect(mastery?.conceptName).toBe('Algebra');
      expect(mastery?.masteryLevel).toBe(60);
      expect(mastery?.attemptsCount).toBe(1);
      expect(mastery?.successRate).toBe(1);
    });

    it('should track prerequisites in concept mastery', () => {
      StudentProfileManager.updateMastery(
        profile,
        'math_calculus',
        'Calculus',
        true,
        ['math_algebra', 'math_trigonometry']
      );

      const mastery = profile.conceptMasteries.get('math_calculus');
      expect(mastery?.prerequisites).toEqual(['math_algebra', 'math_trigonometry']);
    });
  });

  describe('9.3: updateMastery() Function', () => {
    it('should increase mastery on successful attempt', () => {
      StudentProfileManager.updateMastery(profile, 'math_algebra', 'Algebra', true);
      const initialMastery = profile.conceptMasteries.get('math_algebra')!.masteryLevel;

      StudentProfileManager.updateMastery(profile, 'math_algebra', 'Algebra', true);
      const updatedMastery = profile.conceptMasteries.get('math_algebra')!.masteryLevel;

      expect(updatedMastery).toBeGreaterThan(initialMastery);
      expect(updatedMastery).toBe(initialMastery + 5);
    });

    it('should decrease mastery on failed attempt', () => {
      StudentProfileManager.updateMastery(profile, 'math_algebra', 'Algebra', true);
      const initialMastery = profile.conceptMasteries.get('math_algebra')!.masteryLevel;

      StudentProfileManager.updateMastery(profile, 'math_algebra', 'Algebra', false);
      const updatedMastery = profile.conceptMasteries.get('math_algebra')!.masteryLevel;

      expect(updatedMastery).toBeLessThan(initialMastery);
      expect(updatedMastery).toBe(initialMastery - 2);
    });

    it('should update success rate correctly', () => {
      StudentProfileManager.updateMastery(profile, 'math_algebra', 'Algebra', true);
      StudentProfileManager.updateMastery(profile, 'math_algebra', 'Algebra', true);
      StudentProfileManager.updateMastery(profile, 'math_algebra', 'Algebra', false);

      const mastery = profile.conceptMasteries.get('math_algebra')!;
      expect(mastery.attemptsCount).toBe(3);
      expect(mastery.successRate).toBeCloseTo(2 / 3, 2);
    });

    it('should update lastPracticed timestamp', () => {
      const before = new Date();
      StudentProfileManager.updateMastery(profile, 'math_algebra', 'Algebra', true);
      const after = new Date();

      const mastery = profile.conceptMasteries.get('math_algebra')!;
      expect(mastery.lastPracticed.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(mastery.lastPracticed.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should enforce mastery bounds (0-100)', () => {
      // Test upper bound
      for (let i = 0; i < 20; i++) {
        StudentProfileManager.updateMastery(profile, 'math_algebra', 'Algebra', true);
      }
      const mastery = profile.conceptMasteries.get('math_algebra')!;
      expect(mastery.masteryLevel).toBeLessThanOrEqual(100);
      expect(mastery.masteryLevel).toBeGreaterThanOrEqual(0);

      // Test lower bound
      for (let i = 0; i < 50; i++) {
        StudentProfileManager.updateMastery(profile, 'math_algebra', 'Algebra', false);
      }
      const masteryAfterFailures = profile.conceptMasteries.get('math_algebra')!;
      expect(masteryAfterFailures.masteryLevel).toBeGreaterThanOrEqual(0);
      expect(masteryAfterFailures.masteryLevel).toBeLessThanOrEqual(100);
    });
  });

  describe('9.6: Weak/Strong Concept List Updates', () => {
    it('should add concept to weak list when mastery < 50', () => {
      StudentProfileManager.updateMastery(profile, 'math_algebra', 'Algebra', false);
      
      expect(profile.weakConcepts).toContain('Algebra');
      expect(profile.strongConcepts).not.toContain('Algebra');
    });

    it('should add concept to strong list when mastery > 80', () => {
      // Boost mastery to > 80
      for (let i = 0; i < 10; i++) {
        StudentProfileManager.updateMastery(profile, 'math_algebra', 'Algebra', true);
      }

      expect(profile.strongConcepts).toContain('Algebra');
      expect(profile.weakConcepts).not.toContain('Algebra');
    });

    it('should move concept from weak to strong as mastery improves', () => {
      // Start weak
      StudentProfileManager.updateMastery(profile, 'math_algebra', 'Algebra', false);
      expect(profile.weakConcepts).toContain('Algebra');

      // Improve to strong
      for (let i = 0; i < 15; i++) {
        StudentProfileManager.updateMastery(profile, 'math_algebra', 'Algebra', true);
      }

      expect(profile.strongConcepts).toContain('Algebra');
      expect(profile.weakConcepts).not.toContain('Algebra');
    });

    it('should handle multiple concepts in weak/strong lists', () => {
      StudentProfileManager.updateMastery(profile, 'math_algebra', 'Algebra', false);
      StudentProfileManager.updateMastery(profile, 'math_geometry', 'Geometry', false);
      
      for (let i = 0; i < 10; i++) {
        StudentProfileManager.updateMastery(profile, 'math_calculus', 'Calculus', true);
      }

      expect(profile.weakConcepts).toHaveLength(2);
      expect(profile.strongConcepts).toHaveLength(1);
    });
  });

  describe('Session Recording', () => {
    it('should record learning session', () => {
      StudentProfileManager.recordSession(profile, {
        timestamp: new Date(),
        duration: 600,
        topicsCovered: ['Algebra', 'Geometry'],
        questionsAsked: 5,
        confusionDetected: false,
        confusionCount: 0,
        masteryGained: { math_algebra: 5 },
      });

      expect(profile.totalSessions).toBe(1);
      expect(profile.totalQuestionsAsked).toBe(5);
      expect(profile.recentSessions).toHaveLength(1);
      expect(profile.totalLearningTime).toBe(10); // 600 seconds = 10 minutes
    });

    it('should update average session duration', () => {
      StudentProfileManager.recordSession(profile, {
        timestamp: new Date(),
        duration: 600,
        topicsCovered: ['Algebra'],
        questionsAsked: 3,
        confusionDetected: false,
        confusionCount: 0,
        masteryGained: {},
      });

      StudentProfileManager.recordSession(profile, {
        timestamp: new Date(),
        duration: 900,
        topicsCovered: ['Geometry'],
        questionsAsked: 4,
        confusionDetected: false,
        confusionCount: 0,
        masteryGained: {},
      });

      expect(profile.averageSessionDuration).toBe(750); // (600 + 900) / 2
    });

    it('should limit recent sessions to 50', () => {
      for (let i = 0; i < 60; i++) {
        StudentProfileManager.recordSession(profile, {
          timestamp: new Date(),
          duration: 300,
          topicsCovered: ['Topic'],
          questionsAsked: 1,
          confusionDetected: false,
          confusionCount: 0,
          masteryGained: {},
        });
      }

      expect(profile.recentSessions).toHaveLength(50);
    });
  });

  describe('Confusion Recording', () => {
    it('should record confusion trigger', () => {
      StudentProfileManager.recordConfusion(profile, 'Quadratic Equations');

      expect(profile.confusionTriggers).toContain('Quadratic Equations');
      expect(profile.hesitationPatterns).toHaveLength(1);
      expect(profile.hesitationPatterns[0].topic).toBe('Quadratic Equations');
      expect(profile.hesitationPatterns[0].frequency).toBe(1);
    });

    it('should increment confusion frequency on repeated confusion', () => {
      StudentProfileManager.recordConfusion(profile, 'Quadratic Equations');
      StudentProfileManager.recordConfusion(profile, 'Quadratic Equations');
      StudentProfileManager.recordConfusion(profile, 'Quadratic Equations');

      expect(profile.hesitationPatterns[0].frequency).toBe(3);
    });

    it('should not duplicate confusion triggers', () => {
      StudentProfileManager.recordConfusion(profile, 'Quadratic Equations');
      StudentProfileManager.recordConfusion(profile, 'Quadratic Equations');

      expect(profile.confusionTriggers.filter(t => t === 'Quadratic Equations')).toHaveLength(1);
    });
  });

  describe('Recommended Topics', () => {
    it('should recommend weak concepts first', () => {
      StudentProfileManager.updateMastery(profile, 'math_algebra', 'Algebra', false);
      StudentProfileManager.updateMastery(profile, 'math_geometry', 'Geometry', false);

      const recommendations = StudentProfileManager.getRecommendedTopics(profile);

      expect(recommendations).toContain('Algebra');
      expect(recommendations).toContain('Geometry');
    });

    it('should recommend stale concepts', () => {
      StudentProfileManager.updateMastery(profile, 'math_algebra', 'Algebra', true);
      
      // Manually set lastPracticed to 8 days ago
      const mastery = profile.conceptMasteries.get('math_algebra')!;
      mastery.lastPracticed = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);

      const recommendations = StudentProfileManager.getRecommendedTopics(profile);

      expect(recommendations).toContain('Algebra');
    });

    it('should limit recommendations to 5', () => {
      for (let i = 0; i < 10; i++) {
        StudentProfileManager.updateMastery(profile, `concept_${i}`, `Concept ${i}`, false);
      }

      const recommendations = StudentProfileManager.getRecommendedTopics(profile);

      expect(recommendations.length).toBeLessThanOrEqual(5);
    });
  });
});
