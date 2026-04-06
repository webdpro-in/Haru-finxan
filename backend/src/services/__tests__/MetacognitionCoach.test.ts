/**
 * Unit tests for MetacognitionCoach
 * Tests all 5 requirements: REQ-2.7.1 through REQ-2.7.5
 */

import { MetacognitionCoach, SessionAnalysis, LearningPattern, ReflectionPrompt } from '../MetacognitionCoach';
import { StudentProfile, LearningSession, StudentProfileManager } from '../../models/StudentProfile';

describe('MetacognitionCoach', () => {
  let mockProfile: StudentProfile;
  let mockSessions: LearningSession[];

  beforeEach(() => {
    // Create a mock student profile
    mockProfile = StudentProfileManager.createProfile('student_123', 'Test Student', 8);
    
    // Add some concept masteries
    mockProfile.conceptMasteries.set('algebra_basics', {
      conceptId: 'algebra_basics',
      conceptName: 'Algebra Basics',
      masteryLevel: 45,
      lastPracticed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      attemptsCount: 10,
      successRate: 0.6,
      prerequisites: [],
    });

    mockProfile.conceptMasteries.set('geometry', {
      conceptId: 'geometry',
      conceptName: 'Geometry',
      masteryLevel: 85,
      lastPracticed: new Date(),
      attemptsCount: 15,
      successRate: 0.9,
      prerequisites: [],
    });

    mockProfile.weakConcepts = ['Algebra Basics', 'Fractions'];
    mockProfile.strongConcepts = ['Geometry', 'Basic Arithmetic'];
    mockProfile.confusionTriggers = ['Algebra Basics', 'Word Problems'];
    mockProfile.hesitationPatterns = [
      { topic: 'Algebra Basics', frequency: 5, lastOccurrence: new Date() },
      { topic: 'Word Problems', frequency: 3, lastOccurrence: new Date() },
    ];

    // Create mock sessions
    mockSessions = [
      {
        sessionId: 'session_1',
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        duration: 1200, // 20 minutes
        topicsCovered: ['Algebra Basics', 'Linear Equations'],
        questionsAsked: 6,
        confusionDetected: false,
        confusionCount: 0,
        masteryGained: { algebra_basics: 5, linear_equations: 3 },
      },
      {
        sessionId: 'session_2',
        timestamp: new Date(Date.now() - 25 * 60 * 60 * 1000), // 1 day ago
        duration: 900, // 15 minutes
        topicsCovered: ['Geometry'],
        questionsAsked: 4,
        confusionDetected: true,
        confusionCount: 2,
        masteryGained: { geometry: 2 },
      },
      {
        sessionId: 'session_3',
        timestamp: new Date(Date.now() - 49 * 60 * 60 * 1000), // 2 days ago
        duration: 1500, // 25 minutes
        topicsCovered: ['Fractions', 'Decimals'],
        questionsAsked: 8,
        confusionDetected: false,
        confusionCount: 0,
        masteryGained: { fractions: 6, decimals: 4 },
      },
    ];

    mockProfile.recentSessions = mockSessions;
    mockProfile.totalSessions = 3;
    mockProfile.averageSessionDuration = 1200;
  });

  describe('Task 21.1: Session Analysis', () => {
    test('should analyze recent sessions correctly', () => {
      const analysis = MetacognitionCoach.analyzeRecentSessions(mockProfile, 10);

      expect(analysis).toBeDefined();
      expect(analysis.sessionQuality).toBeGreaterThanOrEqual(0);
      expect(analysis.sessionQuality).toBeLessThanOrEqual(100);
      expect(analysis.cognitiveLoadAverage).toBeGreaterThanOrEqual(0);
      expect(analysis.cognitiveLoadAverage).toBeLessThanOrEqual(100);
      expect(analysis.masteryGainTotal).toBeGreaterThan(0);
      expect(analysis.confusionRate).toBeGreaterThanOrEqual(0);
      expect(analysis.confusionRate).toBeLessThanOrEqual(1);
      expect(analysis.engagementScore).toBeGreaterThanOrEqual(0);
      expect(analysis.engagementScore).toBeLessThanOrEqual(100);
    });

    test('should calculate mastery gain total correctly', () => {
      const analysis = MetacognitionCoach.analyzeRecentSessions(mockProfile, 10);
      
      // Total mastery: (5+3) + (2) + (6+4) = 20
      expect(analysis.masteryGainTotal).toBe(20);
    });

    test('should calculate confusion rate correctly', () => {
      const analysis = MetacognitionCoach.analyzeRecentSessions(mockProfile, 10);
      
      // 1 out of 3 sessions had confusion
      expect(analysis.confusionRate).toBeCloseTo(1 / 3, 2);
    });

    test('should calculate average duration correctly', () => {
      const analysis = MetacognitionCoach.analyzeRecentSessions(mockProfile, 10);
      
      // Average: (1200 + 900 + 1500) / 3 = 1200
      expect(analysis.averageDuration).toBe(1200);
    });

    test('should handle empty session list', () => {
      mockProfile.recentSessions = [];
      const analysis = MetacognitionCoach.analyzeRecentSessions(mockProfile, 10);

      expect(analysis.sessionQuality).toBe(0);
      expect(analysis.masteryGainTotal).toBe(0);
      expect(analysis.confusionRate).toBe(0);
      expect(analysis.engagementScore).toBe(0);
    });

    test('should calculate engagement score based on questions asked', () => {
      const analysis = MetacognitionCoach.analyzeRecentSessions(mockProfile, 10);
      
      // Average questions: (6 + 4 + 8) / 3 = 6
      // Engagement: (6 / 5) * 100 = 100 (capped)
      expect(analysis.engagementScore).toBe(100);
    });

    test('should identify optimal time of day', () => {
      // Set specific times for sessions
      mockProfile.recentSessions[0].timestamp = new Date('2024-01-15T09:00:00'); // Morning
      mockProfile.recentSessions[1].timestamp = new Date('2024-01-15T14:00:00'); // Afternoon
      mockProfile.recentSessions[2].timestamp = new Date('2024-01-15T10:00:00'); // Morning

      const analysis = MetacognitionCoach.analyzeRecentSessions(mockProfile, 10);
      
      // Morning has 2 sessions with higher mastery gains
      expect(analysis.optimalTimeOfDay).toBe('morning');
    });
  });

  describe('Task 21.2: Pattern Identification', () => {
    test('should identify learning patterns', () => {
      const analysis = MetacognitionCoach.analyzeRecentSessions(mockProfile, 10);
      const patterns = MetacognitionCoach.identifyPatterns(mockProfile, analysis);

      expect(patterns).toBeDefined();
      expect(Array.isArray(patterns)).toBe(true);
      expect(patterns.length).toBeGreaterThan(0);
    });

    test('should identify confusion trigger patterns', () => {
      const analysis = MetacognitionCoach.analyzeRecentSessions(mockProfile, 10);
      const patterns = MetacognitionCoach.identifyPatterns(mockProfile, analysis);

      const confusionPattern = patterns.find(p => p.type === 'confusion_trigger');
      expect(confusionPattern).toBeDefined();
      expect(confusionPattern?.description).toContain('Algebra Basics');
      expect(confusionPattern?.confidence).toBeGreaterThan(0.7);
    });

    test('should identify mastery trend patterns', () => {
      const analysis = MetacognitionCoach.analyzeRecentSessions(mockProfile, 10);
      const patterns = MetacognitionCoach.identifyPatterns(mockProfile, analysis);

      const masteryPattern = patterns.find(p => p.type === 'mastery_trend');
      expect(masteryPattern).toBeDefined();
    });

    test('should identify engagement patterns for high engagement', () => {
      const analysis = MetacognitionCoach.analyzeRecentSessions(mockProfile, 10);
      const patterns = MetacognitionCoach.identifyPatterns(mockProfile, analysis);

      const engagementPattern = patterns.find(p => p.type === 'engagement_pattern');
      expect(engagementPattern).toBeDefined();
      expect(engagementPattern?.description).toContain('highly engaged');
    });

    test('should identify engagement patterns for low engagement', () => {
      // Modify sessions to have low engagement
      mockProfile.recentSessions.forEach(s => s.questionsAsked = 1);
      
      const analysis = MetacognitionCoach.analyzeRecentSessions(mockProfile, 10);
      const patterns = MetacognitionCoach.identifyPatterns(mockProfile, analysis);

      const engagementPattern = patterns.find(p => p.type === 'engagement_pattern');
      expect(engagementPattern).toBeDefined();
      expect(engagementPattern?.description).toContain('fewer questions');
    });

    test('should return empty patterns for insufficient data', () => {
      mockProfile.recentSessions = mockProfile.recentSessions.slice(0, 2); // Only 2 sessions
      
      const analysis = MetacognitionCoach.analyzeRecentSessions(mockProfile, 10);
      const patterns = MetacognitionCoach.identifyPatterns(mockProfile, analysis);

      expect(patterns.length).toBe(0);
    });

    test('should include recommendations in patterns', () => {
      const analysis = MetacognitionCoach.analyzeRecentSessions(mockProfile, 10);
      const patterns = MetacognitionCoach.identifyPatterns(mockProfile, analysis);

      patterns.forEach(pattern => {
        expect(pattern.recommendation).toBeDefined();
        expect(pattern.recommendation.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Task 21.3: Reflection Generation', () => {
    test('REQ-2.7.1: should generate post-session reflection prompts', () => {
      const session = mockProfile.recentSessions[0];
      const reflection = MetacognitionCoach.generateReflection(session, mockProfile);

      expect(reflection).toBeDefined();
      expect(reflection.whatWentWell).toBeDefined();
      expect(reflection.areasToImprove).toBeDefined();
      expect(reflection.patternsDiscovered).toBeDefined();
      expect(reflection.nextSteps).toBeDefined();
      expect(reflection.motivationalMessage).toBeDefined();
    });

    test('REQ-2.7.3: should highlight what went well', () => {
      const session = mockProfile.recentSessions[0]; // No confusion, 6 questions
      const reflection = MetacognitionCoach.generateReflection(session, mockProfile);

      expect(reflection.whatWentWell.length).toBeGreaterThan(0);
      expect(reflection.whatWentWell.some(item => item.includes('understood concepts'))).toBe(true);
      expect(reflection.whatWentWell.some(item => item.includes('questions'))).toBe(true);
    });

    test('REQ-2.7.4: should suggest areas to improve', () => {
      const session = mockProfile.recentSessions[1]; // Has confusion
      const reflection = MetacognitionCoach.generateReflection(session, mockProfile);

      // Session has low questions (4) and confusion
      expect(reflection.areasToImprove.length).toBeGreaterThan(0);
    });

    test('REQ-2.7.2: should identify patterns discovered', () => {
      const session = mockProfile.recentSessions[0];
      const reflection = MetacognitionCoach.generateReflection(session, mockProfile);

      expect(reflection.patternsDiscovered).toBeDefined();
      expect(Array.isArray(reflection.patternsDiscovered)).toBe(true);
    });

    test('REQ-2.7.5: should recommend next steps based on weak concepts', () => {
      const session = mockProfile.recentSessions[0];
      const reflection = MetacognitionCoach.generateReflection(session, mockProfile);

      expect(reflection.nextSteps.length).toBeGreaterThan(0);
      
      // Should include weak concepts
      const hasWeakConcepts = reflection.nextSteps.some(step => 
        step.includes('Algebra Basics') || step.includes('Fractions')
      );
      expect(hasWeakConcepts).toBe(true);
    });

    test('should generate motivational message', () => {
      const session = mockProfile.recentSessions[0];
      const reflection = MetacognitionCoach.generateReflection(session, mockProfile);

      expect(reflection.motivationalMessage).toBeDefined();
      expect(reflection.motivationalMessage.length).toBeGreaterThan(0);
    });

    test('should highlight high mastery gains', () => {
      const session = mockProfile.recentSessions[2]; // 10 mastery points gained
      const reflection = MetacognitionCoach.generateReflection(session, mockProfile);

      const hasMasteryHighlight = reflection.whatWentWell.some(item => 
        item.includes('mastery points')
      );
      expect(hasMasteryHighlight).toBe(true);
    });

    test('should suggest improvement for high confusion rate', () => {
      // Add more confused sessions
      mockProfile.recentSessions.forEach(s => {
        s.confusionDetected = true;
        s.confusionCount = 3;
      });

      const session = mockProfile.recentSessions[0];
      const reflection = MetacognitionCoach.generateReflection(session, mockProfile);

      const hasConfusionSuggestion = reflection.areasToImprove.some(item => 
        item.includes('confused') || item.includes('fundamentals')
      );
      expect(hasConfusionSuggestion).toBe(true);
    });

    test('should recommend reviewing stale concepts', () => {
      // Add a stale concept (not practiced in 8 days)
      mockProfile.conceptMasteries.set('old_topic', {
        conceptId: 'old_topic',
        conceptName: 'Old Topic',
        masteryLevel: 70,
        lastPracticed: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        attemptsCount: 5,
        successRate: 0.8,
        prerequisites: [],
      });

      const session = mockProfile.recentSessions[0];
      const reflection = MetacognitionCoach.generateReflection(session, mockProfile);

      const hasReviewSuggestion = reflection.nextSteps.some(step => 
        step.includes('Review') || step.includes('Old Topic')
      );
      expect(hasReviewSuggestion).toBe(true);
    });
  });

  describe('Integration with StudentProfile', () => {
    test('should work with real StudentProfile data', () => {
      const profile = StudentProfileManager.createProfile('test_student', 'Test', 9);
      
      // Record some sessions
      StudentProfileManager.recordSession(profile, {
        timestamp: new Date(),
        duration: 1200,
        topicsCovered: ['Math'],
        questionsAsked: 5,
        confusionDetected: false,
        confusionCount: 0,
        masteryGained: { math: 5 },
      });

      const analysis = MetacognitionCoach.analyzeRecentSessions(profile, 10);
      expect(analysis).toBeDefined();
      expect(analysis.sessionQuality).toBeGreaterThan(0);
    });

    test('should handle profile with no sessions', () => {
      const profile = StudentProfileManager.createProfile('new_student', 'New', 7);
      
      const analysis = MetacognitionCoach.analyzeRecentSessions(profile, 10);
      expect(analysis.sessionQuality).toBe(0);
      expect(analysis.masteryGainTotal).toBe(0);
    });

    test('should respect session count limit', () => {
      // Start with original 3 sessions (total mastery: 20)
      const originalMastery = 20;
      
      // Add 12 more sessions (15 total)
      for (let i = 0; i < 12; i++) {
        mockProfile.recentSessions.push({
          sessionId: `session_${i}`,
          timestamp: new Date(Date.now() - (i + 3) * 60 * 60 * 1000),
          duration: 1000,
          topicsCovered: ['Topic'],
          questionsAsked: 3,
          confusionDetected: false,
          confusionCount: 0,
          masteryGained: { topic: 2 },
        });
      }

      // Request only 5 sessions
      const analysis = MetacognitionCoach.analyzeRecentSessions(mockProfile, 5);
      
      // Should only analyze first 5 sessions
      // First 3 original sessions: 20 mastery
      // Next 2 added sessions: 2 * 2 = 4 mastery
      // Total: 24 mastery (but we're only taking first 5 from the array)
      // Actually the first 5 are: session_1 (8), session_2 (2), session_3 (10), session_0 (2), session_1 (2) = 24
      expect(analysis.masteryGainTotal).toBeLessThanOrEqual(originalMastery + 4);
    });
  });

  describe('Edge Cases', () => {
    test('should handle session with no mastery gained', () => {
      const session: LearningSession = {
        sessionId: 'empty_session',
        timestamp: new Date(),
        duration: 600,
        topicsCovered: [],
        questionsAsked: 0,
        confusionDetected: false,
        confusionCount: 0,
        masteryGained: {},
      };

      mockProfile.recentSessions = [session];
      const reflection = MetacognitionCoach.generateReflection(session, mockProfile);

      expect(reflection).toBeDefined();
      expect(reflection.areasToImprove.length).toBeGreaterThan(0);
    });

    test('should handle very short sessions', () => {
      const session: LearningSession = {
        sessionId: 'short_session',
        timestamp: new Date(),
        duration: 60, // 1 minute
        topicsCovered: ['Quick Review'],
        questionsAsked: 1,
        confusionDetected: false,
        confusionCount: 0,
        masteryGained: { review: 1 },
      };

      mockProfile.recentSessions = [session];
      const analysis = MetacognitionCoach.analyzeRecentSessions(mockProfile, 10);

      expect(analysis).toBeDefined();
      expect(analysis.averageDuration).toBe(60);
    });

    test('should handle very long sessions', () => {
      const session: LearningSession = {
        sessionId: 'long_session',
        timestamp: new Date(),
        duration: 7200, // 2 hours
        topicsCovered: ['Deep Dive'],
        questionsAsked: 20,
        confusionDetected: false,
        confusionCount: 0,
        masteryGained: { topic: 15 },
      };

      mockProfile.recentSessions = [session];
      mockProfile.averageSessionDuration = 1200;
      
      const reflection = MetacognitionCoach.generateReflection(session, mockProfile);

      const hasFocusHighlight = reflection.whatWentWell.some(item => 
        item.includes('focused longer')
      );
      expect(hasFocusHighlight).toBe(true);
    });

    test('should handle profile with no weak concepts', () => {
      mockProfile.weakConcepts = [];
      
      const session = mockProfile.recentSessions[0];
      const reflection = MetacognitionCoach.generateReflection(session, mockProfile);

      expect(reflection).toBeDefined();
      expect(reflection.nextSteps).toBeDefined();
    });

    test('should handle profile with no confusion triggers', () => {
      mockProfile.confusionTriggers = [];
      mockProfile.hesitationPatterns = [];
      
      const analysis = MetacognitionCoach.analyzeRecentSessions(mockProfile, 10);
      const patterns = MetacognitionCoach.identifyPatterns(mockProfile, analysis);

      expect(patterns).toBeDefined();
      // Should not have confusion trigger pattern
      const confusionPattern = patterns.find(p => p.type === 'confusion_trigger');
      expect(confusionPattern).toBeUndefined();
    });
  });

  describe('Performance', () => {
    test('should analyze sessions efficiently', () => {
      // Add 50 sessions
      for (let i = 0; i < 50; i++) {
        mockProfile.recentSessions.push({
          sessionId: `perf_session_${i}`,
          timestamp: new Date(Date.now() - i * 60 * 60 * 1000),
          duration: 1000 + i * 10,
          topicsCovered: [`Topic ${i}`],
          questionsAsked: 3 + (i % 5),
          confusionDetected: i % 3 === 0,
          confusionCount: i % 3,
          masteryGained: { [`topic_${i}`]: 2 + (i % 3) },
        });
      }

      const startTime = Date.now();
      const analysis = MetacognitionCoach.analyzeRecentSessions(mockProfile, 50);
      const endTime = Date.now();

      expect(analysis).toBeDefined();
      expect(endTime - startTime).toBeLessThan(100); // Should complete in < 100ms
    });
  });
});
