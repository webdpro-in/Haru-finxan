/**
 * Integration tests for Socratic Mode
 * Tests the complete Socratic Mode flow including:
 * - Leading question generation
 * - Hint system after 3 attempts
 * - Celebration responses on discovery
 * - Complex problem breakdown
 * - Integration with SystemPromptBuilder
 * 
 * Requirements tested:
 * - REQ-2.5.1: Socratic Mode toggle
 * - REQ-2.5.2: Generate leading questions
 * - REQ-2.5.3: Break complex problems
 * - REQ-2.5.4: Hints after 3 attempts
 * - REQ-2.5.5: Celebrate discoveries
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SocraticMode, SocraticPromptOptions } from '../SocraticMode';
import { SocraticAttemptTracker } from '../SocraticAttemptTracker';
import { SystemPromptBuilder, StudentContext, TopicContext, TeachingMode } from '../SystemPromptBuilder';
import { redis } from '../../config/redis';

// Mock Redis
vi.mock('../../config/redis', () => ({
  redis: {
    get: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
    keys: vi.fn(),
    ttl: vi.fn()
  }
}));

describe('Socratic Mode Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('REQ-2.5.1: Socratic Mode Toggle', () => {
    it('should enable Socratic Mode through SystemPromptBuilder', () => {
      const studentContext: StudentContext = {
        studentId: 'student123',
        name: 'Rahul',
        grade: 8,
        preferredLanguage: 'en'
      };

      const topicContext: TopicContext = {
        subject: 'Biology',
        topic: 'Photosynthesis',
        difficulty: 'medium'
      };

      const teachingMode: TeachingMode = {
        socraticMode: true
      };

      const prompt = SystemPromptBuilder.buildPrompt(
        studentContext,
        topicContext,
        undefined,
        teachingMode
      );

      expect(prompt).toContain('Socratic Mode: ACTIVE');
      expect(prompt).toContain('Ask leading questions instead of giving direct answers');
      expect(prompt).toContain('Guide student to discover solutions themselves');
      expect(prompt).toContain('Provide hints after 3 unsuccessful attempts');
    });

    it('should not include Socratic Mode when disabled', () => {
      const studentContext: StudentContext = {
        studentId: 'student123',
        name: 'Rahul',
        grade: 8,
        preferredLanguage: 'en'
      };

      const teachingMode: TeachingMode = {
        socraticMode: false
      };

      const prompt = SystemPromptBuilder.buildPrompt(
        studentContext,
        undefined,
        undefined,
        teachingMode
      );

      expect(prompt).not.toContain('Socratic Mode: ACTIVE');
    });

    it('should work with other teaching modes', () => {
      const studentContext: StudentContext = {
        studentId: 'student123',
        name: 'Priya',
        grade: 10,
        preferredLanguage: 'en'
      };

      const teachingMode: TeachingMode = {
        socraticMode: true,
        analogySwitching: true,
        examAnxietyMode: true
      };

      const prompt = SystemPromptBuilder.buildPrompt(
        studentContext,
        undefined,
        undefined,
        teachingMode
      );

      expect(prompt).toContain('Socratic Mode: ACTIVE');
      expect(prompt).toContain('Analogy Switching: ACTIVE');
      expect(prompt).toContain('Exam Anxiety Support: ACTIVE');
    });
  });

  describe('REQ-2.5.2: Leading Question Generation', () => {
    it('should generate grade-appropriate leading questions', () => {
      // Elementary school
      const elementary = SocraticMode.generateLeadingQuestions(
        'addition',
        'What is addition?',
        3
      );
      expect(elementary.length).toBeGreaterThan(0);
      expect(elementary.some(q => q.includes('seen') || q.includes('heard'))).toBe(true);

      // Middle school
      const middle = SocraticMode.generateLeadingQuestions(
        'photosynthesis',
        'What is photosynthesis?',
        7
      );
      expect(middle.length).toBeGreaterThan(0);
      expect(middle.some(q => q.includes('already know') || q.includes('examples'))).toBe(true);

      // High school
      const high = SocraticMode.generateLeadingQuestions(
        'calculus',
        'What is a derivative?',
        11
      );
      expect(high.length).toBeGreaterThan(0);
      expect(high.some(q => q.includes('concepts') || q.includes('explain'))).toBe(true);
    });

    it('should adapt questions based on concept mastery', () => {
      // Low mastery
      const low = SocraticMode.generateLeadingQuestions(
        'algebra',
        'What is a variable?',
        8,
        30
      );
      expect(low.some(q => q.toLowerCase().includes('remember'))).toBe(true);

      // Medium mastery
      const medium = SocraticMode.generateLeadingQuestions(
        'algebra',
        'What is a variable?',
        8,
        55
      );
      expect(medium.some(q => q.toLowerCase().includes('connect'))).toBe(true);

      // High mastery
      const high = SocraticMode.generateLeadingQuestions(
        'algebra',
        'What is a variable?',
        8,
        85
      );
      expect(high.some(q => q.toLowerCase().includes('challenging'))).toBe(true);
    });

    it('should generate different questions for different question types', () => {
      const whatIs = SocraticMode.generateLeadingQuestions(
        'gravity',
        'What is gravity?',
        9
      );

      const howDoes = SocraticMode.generateLeadingQuestions(
        'gravity',
        'How does gravity work?',
        9
      );

      const why = SocraticMode.generateLeadingQuestions(
        'gravity',
        'Why do objects fall?',
        9
      );

      // Questions should be different for different patterns
      expect(whatIs).not.toEqual(howDoes);
      expect(howDoes).not.toEqual(why);
      expect(whatIs).not.toEqual(why);
    });

    it('should integrate with complete Socratic prompt', () => {
      const options: SocraticPromptOptions = {
        studentName: 'Amit',
        grade: 9,
        topic: 'Newton\'s laws',
        question: 'What is Newton\'s first law?',
        conceptMastery: 60
      };

      const prompt = SocraticMode.generateSocraticPrompt(options);

      expect(prompt).toContain('Amit');
      expect(prompt).toContain('Grade 9');
      expect(prompt).toContain('Newton\'s laws');
      expect(prompt).toContain('NEVER give the answer directly');
      expect(prompt).toContain('Ask leading questions');
    });
  });

  describe('REQ-2.5.3: Break Complex Problems', () => {
    it('should break down math word problems', () => {
      const problem = 'A train travels 120 km in 2 hours. What is its average speed?';
      const questions = SocraticMode.breakDownProblem(problem, 8, 'speed and distance');

      expect(questions.length).toBeGreaterThanOrEqual(3);
      expect(questions.some(q => q.toLowerCase().includes('given') || q.toLowerCase().includes('know'))).toBe(true);
      expect(questions.some(q => q.toLowerCase().includes('find') || q.toLowerCase().includes('solve'))).toBe(true);
      expect(questions.some(q => q.toLowerCase().includes('step'))).toBe(true);
    });

    it('should break down science problems', () => {
      const problem = 'Explain how photosynthesis converts light energy into chemical energy';
      const questions = SocraticMode.breakDownProblem(problem, 10, 'photosynthesis');

      expect(questions.length).toBeGreaterThanOrEqual(3);
      // Should guide through the process step by step
      expect(questions[0].toLowerCase()).toContain('know');
      expect(questions[questions.length - 1].toLowerCase()).toContain('step');
    });

    it('should integrate problem breakdown with Socratic prompt', () => {
      const options: SocraticPromptOptions = {
        studentName: 'Neha',
        grade: 9,
        topic: 'algebra',
        question: 'Solve for x: 2x + 5 = 15',
        conceptMastery: 50
      };

      const prompt = SocraticMode.generateSocraticPrompt(options);

      expect(prompt).toContain('Break down complex problems into smaller, manageable questions');
      expect(prompt).toContain('step-by-step');
    });
  });

  describe('REQ-2.5.4: Hints After 3 Attempts', () => {
    it('should not provide hint before 3 attempts', async () => {
      vi.mocked(redis.get).mockResolvedValue(null);
      vi.mocked(redis.setex).mockResolvedValue('OK');

      // First attempt
      const tracker1 = await SocraticAttemptTracker.trackAttempt(
        'student123',
        'question456',
        'First answer'
      );
      expect(SocraticAttemptTracker.shouldProvideHint(tracker1.attemptCount)).toBe(false);

      // Second attempt
      vi.mocked(redis.get).mockResolvedValue(JSON.stringify(tracker1));
      const tracker2 = await SocraticAttemptTracker.trackAttempt(
        'student123',
        'question456',
        'Second answer'
      );
      expect(SocraticAttemptTracker.shouldProvideHint(tracker2.attemptCount)).toBe(false);
    });

    it('should provide hint after 3 attempts', async () => {
      vi.mocked(redis.get).mockResolvedValue(null);
      vi.mocked(redis.setex).mockResolvedValue('OK');

      // Track 3 attempts
      let tracker = await SocraticAttemptTracker.trackAttempt(
        'student123',
        'question456',
        'First answer'
      );

      vi.mocked(redis.get).mockResolvedValue(JSON.stringify(tracker));
      tracker = await SocraticAttemptTracker.trackAttempt(
        'student123',
        'question456',
        'Second answer'
      );

      vi.mocked(redis.get).mockResolvedValue(JSON.stringify(tracker));
      tracker = await SocraticAttemptTracker.trackAttempt(
        'student123',
        'question456',
        'Third answer'
      );

      expect(SocraticAttemptTracker.shouldProvideHint(tracker.attemptCount)).toBe(true);

      // Generate hint
      const hint = SocraticMode.generateHint(
        'photosynthesis',
        'What is photosynthesis?',
        tracker.attemptCount,
        tracker.previousResponses
      );

      expect(hint).toBeTruthy();
      expect(hint.length).toBeGreaterThan(0);
    });

    it('should include hint in Socratic response after 3 attempts', () => {
      const options: SocraticPromptOptions = {
        studentName: 'Ravi',
        grade: 8,
        topic: 'algebra',
        question: 'What is a variable?',
        attemptCount: 3,
        previousResponses: ['A letter?', 'A symbol?', 'A number?']
      };

      const response = SocraticMode.generateSocraticResponse(options);

      expect(response.shouldProvideHint).toBe(true);
      expect(response.hint).toBeDefined();
      expect(response.hint).toBeTruthy();
    });

    it('should include hint guidance in prompt after 3 attempts', () => {
      const options: SocraticPromptOptions = {
        studentName: 'Sita',
        grade: 9,
        topic: 'physics',
        question: 'What is momentum?',
        attemptCount: 3,
        previousResponses: ['Speed?', 'Force?', 'Energy?']
      };

      const prompt = SocraticMode.generateSocraticPrompt(options);

      expect(prompt).toContain('HINT GUIDANCE');
      expect(prompt).toContain('tried 3 times');
      expect(prompt).toContain('helpful hint');
    });

    it('should persist attempts across sessions', async () => {
      vi.mocked(redis.get).mockResolvedValue(null);
      vi.mocked(redis.setex).mockResolvedValue('OK');

      // Session 1: 2 attempts
      let tracker = await SocraticAttemptTracker.trackAttempt(
        'student123',
        'question456',
        'First answer'
      );
      vi.mocked(redis.get).mockResolvedValue(JSON.stringify(tracker));
      tracker = await SocraticAttemptTracker.trackAttempt(
        'student123',
        'question456',
        'Second answer'
      );

      // Simulate session end and restart
      const savedTracker = JSON.stringify(tracker);

      // Session 2: Load previous attempts
      vi.mocked(redis.get).mockResolvedValue(savedTracker);
      const loadedTracker = await SocraticAttemptTracker.getAttemptTracker(
        'student123',
        'question456'
      );

      expect(loadedTracker).toBeDefined();
      expect(loadedTracker?.attemptCount).toBe(2);

      // Third attempt should trigger hint
      tracker = await SocraticAttemptTracker.trackAttempt(
        'student123',
        'question456',
        'Third answer'
      );

      expect(SocraticAttemptTracker.shouldProvideHint(tracker.attemptCount)).toBe(true);
    });
  });

  describe('REQ-2.5.5: Celebrate Discoveries', () => {
    it('should generate celebration messages', () => {
      const celebration = SocraticMode.generateEncouragement(3, true);

      expect(celebration).toBeTruthy();
      expect(
        celebration.includes('!') ||
        celebration.includes('🎉') ||
        celebration.includes('⭐') ||
        celebration.includes('🌟') ||
        celebration.includes('🎊') ||
        celebration.includes('💫')
      ).toBe(true);
    });

    it('should detect discovery moments', () => {
      const goodResponse = 'Photosynthesis is when plants use sunlight and water to make food and oxygen';
      const concepts = ['plants', 'sunlight', 'water', 'food', 'oxygen'];

      const isDiscovery = SocraticMode.isDiscoveryMoment(goodResponse, concepts);

      expect(isDiscovery).toBe(true);
    });

    it('should not celebrate incomplete answers', () => {
      const incompleteResponse = 'Plants need sunlight';
      const concepts = ['plants', 'sunlight', 'water', 'carbon dioxide', 'glucose', 'oxygen'];

      const isDiscovery = SocraticMode.isDiscoveryMoment(incompleteResponse, concepts);

      expect(isDiscovery).toBe(false);
    });

    it('should include celebration in Socratic response', () => {
      const options: SocraticPromptOptions = {
        studentName: 'Lakshmi',
        grade: 8,
        topic: 'photosynthesis',
        question: 'What is photosynthesis?',
        attemptCount: 2,
        previousResponses: [
          'Plants need sunlight',
          'Photosynthesis is when plants use sunlight and water to make food and oxygen'
        ]
      };

      const response = SocraticMode.generateSocraticResponse(options);

      expect(response.isDiscoveryMoment).toBe(true);
      expect(response.encouragement).toBeTruthy();
    });

    it('should clear attempts after successful discovery', async () => {
      vi.mocked(redis.del).mockResolvedValue(1);

      await SocraticAttemptTracker.clearAttemptTracker('student123', 'question456');

      expect(redis.del).toHaveBeenCalledWith('socratic:attempt:student123:question456');
    });
  });

  describe('Complete Socratic Flow Integration', () => {
    it('should handle complete student learning journey', async () => {
      vi.mocked(redis.get).mockResolvedValue(null);
      vi.mocked(redis.setex).mockResolvedValue('OK');

      const studentContext: StudentContext = {
        studentId: 'student123',
        name: 'Arjun',
        grade: 9,
        preferredLanguage: 'en'
      };

      const topicContext: TopicContext = {
        subject: 'Physics',
        topic: 'Newton\'s First Law',
        difficulty: 'medium',
        currentMastery: 45
      };

      const teachingMode: TeachingMode = {
        socraticMode: true
      };

      // Step 1: Student asks question
      const question = 'What is Newton\'s first law?';

      // Step 2: Generate Socratic prompt
      const prompt = SystemPromptBuilder.buildPrompt(
        studentContext,
        topicContext,
        undefined,
        teachingMode
      );

      expect(prompt).toContain('Socratic Mode: ACTIVE');

      // Step 3: Generate leading questions
      const leadingQuestions = SocraticMode.generateLeadingQuestions(
        topicContext.topic,
        question,
        studentContext.grade,
        topicContext.currentMastery
      );

      expect(leadingQuestions.length).toBeGreaterThan(0);

      // Step 4: Track first attempt
      let tracker = await SocraticAttemptTracker.trackAttempt(
        studentContext.studentId,
        'newton-first-law',
        'Objects stay still?'
      );

      expect(tracker.attemptCount).toBe(1);
      expect(SocraticAttemptTracker.shouldProvideHint(tracker.attemptCount)).toBe(false);

      // Step 5: Track second attempt
      vi.mocked(redis.get).mockResolvedValue(JSON.stringify(tracker));
      tracker = await SocraticAttemptTracker.trackAttempt(
        studentContext.studentId,
        'newton-first-law',
        'Objects don\'t move unless pushed?'
      );

      expect(tracker.attemptCount).toBe(2);

      // Step 6: Track third attempt - hint should be provided
      vi.mocked(redis.get).mockResolvedValue(JSON.stringify(tracker));
      tracker = await SocraticAttemptTracker.trackAttempt(
        studentContext.studentId,
        'newton-first-law',
        'Objects resist changes in motion?'
      );

      expect(tracker.attemptCount).toBe(3);
      expect(SocraticAttemptTracker.shouldProvideHint(tracker.attemptCount)).toBe(true);

      const hint = SocraticMode.generateHint(
        topicContext.topic,
        question,
        tracker.attemptCount,
        tracker.previousResponses
      );

      expect(hint).toBeTruthy();

      // Step 7: Student discovers answer
      const discoveryResponse = 'An object at rest stays at rest and an object in motion stays in motion unless acted upon by an external force';
      const concepts = ['object', 'rest', 'motion', 'force', 'external'];

      const isDiscovery = SocraticMode.isDiscoveryMoment(discoveryResponse, concepts);
      expect(isDiscovery).toBe(true);

      // Step 8: Celebrate and clear attempts
      const celebration = SocraticMode.generateEncouragement(tracker.attemptCount, true);
      expect(celebration).toBeTruthy();

      vi.mocked(redis.del).mockResolvedValue(1);
      await SocraticAttemptTracker.clearAttemptTracker(
        studentContext.studentId,
        'newton-first-law'
      );

      expect(redis.del).toHaveBeenCalled();
    });

    it('should handle multiple students with different progress', async () => {
      vi.mocked(redis.get).mockResolvedValue(null);
      vi.mocked(redis.setex).mockResolvedValue('OK');

      // Student 1: Just starting
      const tracker1 = await SocraticAttemptTracker.trackAttempt(
        'student1',
        'question1',
        'First answer'
      );
      expect(tracker1.attemptCount).toBe(1);

      // Student 2: On third attempt
      let tracker2 = await SocraticAttemptTracker.trackAttempt(
        'student2',
        'question1',
        'First answer'
      );
      vi.mocked(redis.get).mockResolvedValue(JSON.stringify(tracker2));
      tracker2 = await SocraticAttemptTracker.trackAttempt(
        'student2',
        'question1',
        'Second answer'
      );
      vi.mocked(redis.get).mockResolvedValue(JSON.stringify(tracker2));
      tracker2 = await SocraticAttemptTracker.trackAttempt(
        'student2',
        'question1',
        'Third answer'
      );

      expect(tracker2.attemptCount).toBe(3);
      expect(SocraticAttemptTracker.shouldProvideHint(tracker2.attemptCount)).toBe(true);
    });

    it('should adapt to different grade levels throughout flow', () => {
      // Elementary
      const elementary = SocraticMode.generateSocraticResponse({
        grade: 3,
        topic: 'addition',
        question: 'What is addition?',
        conceptMastery: 40
      });

      expect(elementary.leadingQuestions.length).toBeGreaterThan(0);

      // High school
      const highSchool = SocraticMode.generateSocraticResponse({
        grade: 11,
        topic: 'calculus',
        question: 'What is a derivative?',
        conceptMastery: 70
      });

      expect(highSchool.leadingQuestions.length).toBeGreaterThan(0);

      // Questions should be different complexity
      expect(elementary.leadingQuestions).not.toEqual(highSchool.leadingQuestions);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle Redis connection failures gracefully', async () => {
      vi.mocked(redis.get).mockRejectedValue(new Error('Redis connection failed'));

      const tracker = await SocraticAttemptTracker.getAttemptTracker(
        'student123',
        'question456'
      );

      expect(tracker).toBeNull();
    });

    it('should handle empty or invalid questions', () => {
      const questions = SocraticMode.generateLeadingQuestions(
        'topic',
        '',
        8
      );

      expect(questions.length).toBeGreaterThan(0);
    });

    it('should handle extreme grade levels', () => {
      const veryLow = SocraticMode.generateLeadingQuestions(
        'counting',
        'What is counting?',
        1
      );

      const veryHigh = SocraticMode.generateLeadingQuestions(
        'quantum physics',
        'What is quantum entanglement?',
        12
      );

      expect(veryLow.length).toBeGreaterThan(0);
      expect(veryHigh.length).toBeGreaterThan(0);
    });

    it('should handle very long previous responses', async () => {
      vi.mocked(redis.get).mockResolvedValue(null);
      vi.mocked(redis.setex).mockResolvedValue('OK');

      const longResponse = 'A'.repeat(10000);

      const tracker = await SocraticAttemptTracker.trackAttempt(
        'student123',
        'question456',
        longResponse
      );

      expect(tracker.previousResponses[0]).toBe(longResponse);
    });
  });
});
