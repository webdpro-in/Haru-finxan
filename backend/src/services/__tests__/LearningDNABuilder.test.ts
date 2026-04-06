/**
 * Tests for Learning DNA Builder
 * Task Group 11.6: Write unit tests for DNA builder
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LearningDNABuilder, BehavioralFeatures, LearningDNA } from '../LearningDNABuilder.js';
import { StudentProfile } from '../../models/StudentProfile.js';

// Mock Weaviate client
vi.mock('../../config/weaviate.js', () => ({
  client: {},
  storeLearningDNA: vi.fn().mockResolvedValue('mock-id'),
  findSimilarLearners: vi.fn().mockResolvedValue([
    {
      studentId: 'similar-student-1',
      preferredExplanationStyle: 'visual',
      _additional: { distance: 0.2 },
    },
    {
      studentId: 'similar-student-2',
      preferredExplanationStyle: 'analytical',
      _additional: { distance: 0.3 },
    },
  ]),
}));

describe('LearningDNABuilder', () => {
  let mockProfile: StudentProfile;
  let mockSessionData: any;

  beforeEach(() => {
    mockProfile = {
      studentId: 'student-123',
      name: 'Test Student',
      grade: 8,
      preferredLanguage: 'en',
      conceptMasteries: new Map([
        ['math-algebra', {
          conceptId: 'math-algebra',
          conceptName: 'Algebra',
          masteryLevel: 75,
          lastPracticed: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          attemptsCount: 10,
          successRate: 0.8,
          prerequisites: [],
          spacedRepetitionDue: new Date(),
          easinessFactor: 2.5,
          interval: 7,
        }],
      ]),
      weakConcepts: ['fractions', 'decimals'],
      strongConcepts: ['algebra', 'geometry'],
      learningStyle: 'visual',
      averageSessionDuration: 1800000, // 30 minutes in ms
      preferredDifficulty: 'medium',
      cognitiveLoadThreshold: 60,
      totalSessions: 20,
      totalQuestionsAsked: 100,
      recentSessions: [],
      confusionTriggers: ['word problems', 'fractions'],
      hesitationPatterns: [],
      moodHistory: [],
      anxietyTriggers: [],
      neurodiversityFlags: [],
      createdAt: new Date(),
      lastActiveAt: new Date(),
      streakDays: 5,
      totalLearningTime: 36000000,
    };

    mockSessionData = {
      responseTime: 3000,
      pauseCount: 2,
      fillerWordCount: 1,
      wordCount: 50,
      duration: 1800, // 30 minutes in seconds
    };
  });

  describe('extractFeatures', () => {
    it('should extract behavioral features from profile and session data', () => {
      const features = LearningDNABuilder.extractFeatures(mockProfile, mockSessionData);

      expect(features).toBeDefined();
      expect(features.averageResponseTime).toBe(3000);
      expect(features.preferredExplanationStyle).toBeDefined();
      expect(features.questionFrequency).toBe(5); // 100 questions / 20 sessions
      expect(features.confusionTriggers).toEqual(['word problems', 'fractions']);
      expect(features.sessionDuration).toBe(30); // 1800000 ms / 60000 = 30 minutes
    });

    it('should calculate pause frequency correctly', () => {
      const features = LearningDNABuilder.extractFeatures(mockProfile, mockSessionData);

      // pauseCount / duration * 60 = 2 / 1800 * 60 = 0.0667
      expect(features.pauseFrequency).toBeCloseTo(0.0667, 2);
    });

    it('should calculate filler word rate correctly', () => {
      const features = LearningDNABuilder.extractFeatures(mockProfile, mockSessionData);

      // fillerWordCount / wordCount * 100 = 1 / 50 * 100 = 2
      expect(features.fillerWordRate).toBe(2);
    });

    it('should handle zero session duration', () => {
      const zeroSessionData = { ...mockSessionData, duration: 0 };
      const features = LearningDNABuilder.extractFeatures(mockProfile, zeroSessionData);

      expect(features.pauseFrequency).toBe(0);
    });

    it('should handle zero word count', () => {
      const zeroWordData = { ...mockSessionData, wordCount: 0 };
      const features = LearningDNABuilder.extractFeatures(mockProfile, zeroWordData);

      expect(features.fillerWordRate).toBe(0);
    });

    it('should limit confusion triggers to 10', () => {
      const profileWithManyTriggers = {
        ...mockProfile,
        confusionTriggers: Array(20).fill('trigger'),
      };
      const features = LearningDNABuilder.extractFeatures(profileWithManyTriggers, mockSessionData);

      expect(features.confusionTriggers.length).toBe(10);
    });

    it('should limit topic interests to 5', () => {
      const profileWithManyInterests = {
        ...mockProfile,
        strongConcepts: Array(10).fill('concept'),
      };
      const features = LearningDNABuilder.extractFeatures(profileWithManyInterests, mockSessionData);

      expect(features.topicInterests.length).toBe(5);
    });
  });

  describe('generateEmbedding', () => {
    it('should generate 384-dimensional embedding', () => {
      const features: BehavioralFeatures = {
        averageResponseTime: 3000,
        preferredExplanationStyle: 'visual',
        questionFrequency: 5,
        confusionTriggers: ['fractions'],
        sessionDuration: 30,
        pauseFrequency: 2,
        fillerWordRate: 2,
        masteryGrowthRate: 10,
        retentionRate: 0.8,
        errorPatterns: ['fraction-operations'],
        timeOfDayPreference: 'afternoon',
        topicInterests: ['algebra'],
        struggleTopics: ['fractions'],
      };

      const embedding = LearningDNABuilder.generateEmbedding(features);

      expect(embedding).toHaveLength(384);
      expect(embedding.every(v => typeof v === 'number')).toBe(true);
    });

    it('should normalize response time to 0-1 range', () => {
      const features: BehavioralFeatures = {
        averageResponseTime: 10000, // Should be clamped to 1
        preferredExplanationStyle: 'visual',
        questionFrequency: 5,
        confusionTriggers: [],
        sessionDuration: 30,
        pauseFrequency: 2,
        fillerWordRate: 2,
        masteryGrowthRate: 10,
        retentionRate: 0.8,
        errorPatterns: [],
        timeOfDayPreference: 'afternoon',
        topicInterests: [],
        struggleTopics: [],
      };

      const embedding = LearningDNABuilder.generateEmbedding(features);

      // First 48 dimensions should be 1 (normalized response time)
      expect(embedding[0]).toBe(1);
      expect(embedding[47]).toBe(1);
    });

    it('should encode explanation style correctly', () => {
      const styles: Array<'visual' | 'analytical' | 'story-based' | 'analogy-driven'> = [
        'visual',
        'analytical',
        'story-based',
        'analogy-driven',
      ];

      styles.forEach(style => {
        const features: BehavioralFeatures = {
          averageResponseTime: 3000,
          preferredExplanationStyle: style,
          questionFrequency: 5,
          confusionTriggers: [],
          sessionDuration: 30,
          pauseFrequency: 2,
          fillerWordRate: 2,
          masteryGrowthRate: 10,
          retentionRate: 0.8,
          errorPatterns: [],
          timeOfDayPreference: 'afternoon',
          topicInterests: [],
          struggleTopics: [],
        };

        const embedding = LearningDNABuilder.generateEmbedding(features);
        
        // Check that the appropriate section is set to 1
        const styleIndex = {
          'visual': 48,
          'analytical': 96,
          'story-based': 144,
          'analogy-driven': 192,
        }[style];

        expect(embedding[styleIndex]).toBe(1);
      });
    });
  });

  describe('storeDNA', () => {
    it('should store DNA in Weaviate and return ID', async () => {
      const dna: LearningDNA = {
        studentId: 'student-123',
        sessionId: 'session-456',
        timestamp: new Date(),
        features: {
          averageResponseTime: 3000,
          preferredExplanationStyle: 'visual',
          questionFrequency: 5,
          confusionTriggers: ['fractions'],
          sessionDuration: 30,
          pauseFrequency: 2,
          fillerWordRate: 2,
          masteryGrowthRate: 10,
          retentionRate: 0.8,
          errorPatterns: [],
          timeOfDayPreference: 'afternoon',
          topicInterests: ['algebra'],
          struggleTopics: ['fractions'],
        },
        embedding: new Array(384).fill(0.5),
      };

      const id = await LearningDNABuilder.storeDNA(dna);

      expect(id).toBe('mock-id');
    });

    it('should handle storage errors gracefully', async () => {
      const { storeLearningDNA } = await import('../../config/weaviate.js');
      vi.mocked(storeLearningDNA).mockRejectedValueOnce(new Error('Storage failed'));

      const dna: LearningDNA = {
        studentId: 'student-123',
        sessionId: 'session-456',
        timestamp: new Date(),
        features: {} as BehavioralFeatures,
        embedding: [],
      };

      await expect(LearningDNABuilder.storeDNA(dna)).rejects.toThrow('Storage failed');
    });
  });

  describe('findSimilarLearners', () => {
    it('should find similar learners and exclude self', async () => {
      const embedding = new Array(384).fill(0.5);
      const similarLearners = await LearningDNABuilder.findSimilarLearners('student-123', embedding, 10);

      expect(similarLearners).toHaveLength(2);
      expect(similarLearners[0].studentId).toBe('similar-student-1');
      expect(similarLearners[0].similarity).toBeCloseTo(0.8, 1); // 1 - 0.2
      expect(similarLearners[0].sharedPatterns).toBeDefined();
      expect(similarLearners[0].recommendedApproach).toBeDefined();
    });

    it('should handle empty results', async () => {
      const { findSimilarLearners } = await import('../../config/weaviate.js');
      vi.mocked(findSimilarLearners).mockResolvedValueOnce([]);

      const embedding = new Array(384).fill(0.5);
      const similarLearners = await LearningDNABuilder.findSimilarLearners('student-123', embedding, 10);

      expect(similarLearners).toHaveLength(0);
    });

    it('should handle errors gracefully', async () => {
      const { findSimilarLearners } = await import('../../config/weaviate.js');
      vi.mocked(findSimilarLearners).mockRejectedValueOnce(new Error('Query failed'));

      const embedding = new Array(384).fill(0.5);
      const similarLearners = await LearningDNABuilder.findSimilarLearners('student-123', embedding, 10);

      expect(similarLearners).toHaveLength(0);
    });
  });

  describe('adaptTeachingStyle', () => {
    it('should recommend teaching style based on similar learners', async () => {
      const features: BehavioralFeatures = {
        averageResponseTime: 3000,
        preferredExplanationStyle: 'analytical',
        questionFrequency: 5,
        confusionTriggers: ['fractions'],
        sessionDuration: 30,
        pauseFrequency: 2,
        fillerWordRate: 2,
        masteryGrowthRate: 10,
        retentionRate: 0.8,
        errorPatterns: [],
        timeOfDayPreference: 'afternoon',
        topicInterests: ['algebra'],
        struggleTopics: ['fractions'],
      };

      const adaptation = await LearningDNABuilder.adaptTeachingStyle('student-123', features);

      expect(adaptation.recommendedStyle).toBeDefined();
      expect(adaptation.adjustments).toBeInstanceOf(Array);
      expect(adaptation.reasoning).toContain('similar learners');
    });

    it('should provide adjustments for high pause frequency', async () => {
      const features: BehavioralFeatures = {
        averageResponseTime: 3000,
        preferredExplanationStyle: 'visual',
        questionFrequency: 5,
        confusionTriggers: [],
        sessionDuration: 30,
        pauseFrequency: 6, // High pause frequency
        fillerWordRate: 2,
        masteryGrowthRate: 10,
        retentionRate: 0.8,
        errorPatterns: [],
        timeOfDayPreference: 'afternoon',
        topicInterests: [],
        struggleTopics: [],
      };

      const adaptation = await LearningDNABuilder.adaptTeachingStyle('student-123', features);

      expect(adaptation.adjustments).toContain('Slow down pace, allow more processing time');
    });

    it('should provide adjustments for many confusion triggers', async () => {
      const features: BehavioralFeatures = {
        averageResponseTime: 3000,
        preferredExplanationStyle: 'visual',
        questionFrequency: 5,
        confusionTriggers: Array(6).fill('trigger'), // Many triggers
        sessionDuration: 30,
        pauseFrequency: 2,
        fillerWordRate: 2,
        masteryGrowthRate: 10,
        retentionRate: 0.8,
        errorPatterns: [],
        timeOfDayPreference: 'afternoon',
        topicInterests: [],
        struggleTopics: [],
      };

      const adaptation = await LearningDNABuilder.adaptTeachingStyle('student-123', features);

      expect(adaptation.adjustments).toContain('Break down complex topics into smaller chunks');
    });

    it('should provide adjustments for low question frequency', async () => {
      const features: BehavioralFeatures = {
        averageResponseTime: 3000,
        preferredExplanationStyle: 'visual',
        questionFrequency: 1, // Low question frequency
        confusionTriggers: [],
        sessionDuration: 30,
        pauseFrequency: 2,
        fillerWordRate: 2,
        masteryGrowthRate: 10,
        retentionRate: 0.8,
        errorPatterns: [],
        timeOfDayPreference: 'afternoon',
        topicInterests: [],
        struggleTopics: [],
      };

      const adaptation = await LearningDNABuilder.adaptTeachingStyle('student-123', features);

      expect(adaptation.adjustments).toContain('Encourage more questions with prompts');
    });

    it('should handle no similar learners found', async () => {
      const { findSimilarLearners } = await import('../../config/weaviate.js');
      vi.mocked(findSimilarLearners).mockResolvedValueOnce([]);

      const features: BehavioralFeatures = {
        averageResponseTime: 3000,
        preferredExplanationStyle: 'visual',
        questionFrequency: 5,
        confusionTriggers: [],
        sessionDuration: 30,
        pauseFrequency: 2,
        fillerWordRate: 2,
        masteryGrowthRate: 10,
        retentionRate: 0.8,
        errorPatterns: [],
        timeOfDayPreference: 'afternoon',
        topicInterests: [],
        struggleTopics: [],
      };

      const adaptation = await LearningDNABuilder.adaptTeachingStyle('student-123', features);

      expect(adaptation.recommendedStyle).toBe('visual');
      expect(adaptation.adjustments).toHaveLength(0);
      expect(adaptation.reasoning).toContain('No similar learners found');
    });
  });

  describe('buildDNA', () => {
    it('should build complete DNA and store it', async () => {
      const dna = await LearningDNABuilder.buildDNA(mockProfile, 'session-456', mockSessionData);

      expect(dna.studentId).toBe('student-123');
      expect(dna.sessionId).toBe('session-456');
      expect(dna.features).toBeDefined();
      expect(dna.embedding).toHaveLength(384);
      expect(dna.timestamp).toBeInstanceOf(Date);
    });
  });
});
