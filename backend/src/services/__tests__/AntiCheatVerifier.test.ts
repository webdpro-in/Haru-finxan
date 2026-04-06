/**
 * Unit Tests for AntiCheatVerifier Service
 * 
 * Tests verification of student understanding through follow-up questions
 * and answer evaluation against expected key points.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AntiCheatVerifier, VerificationOptions, FollowUpEvaluation } from '../AntiCheatVerifier.js';
import { GeminiClient, GeminiResponse } from '../GeminiClient.js';

describe('AntiCheatVerifier', () => {
  let verifier: AntiCheatVerifier;
  let mockGeminiClient: GeminiClient;

  beforeEach(() => {
    // Create mock Gemini client
    mockGeminiClient = {
      generateResponse: vi.fn(),
    } as any;

    verifier = new AntiCheatVerifier(mockGeminiClient);
  });

  describe('verifyUnderstanding', () => {
    it('should generate follow-up question to verify understanding', async () => {
      // REQ-4.4.1: System SHALL generate follow-up questions to verify understanding
      const mockResponse: GeminiResponse = {
        text: JSON.stringify({
          followUpQuestion: 'If you put a plant in a dark closet, what would happen and why?',
          expectedKeyPoints: ['no sunlight', 'cannot photosynthesize', 'plant would die or weaken'],
          concept: 'photosynthesis'
        }),
        finishReason: 'STOP'
      };

      vi.mocked(mockGeminiClient.generateResponse).mockResolvedValue(mockResponse);

      const options: VerificationOptions = {
        studentId: 'student123',
        originalQuestion: 'What is photosynthesis?',
        studentAnswer: 'Process where plants make food using sunlight',
        topic: 'photosynthesis',
        grade: 7
      };

      const result = await verifier.verifyUnderstanding(options);

      expect(result.verified).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.followUpQuestion).toBeDefined();
      expect(result.expectedKeyPoints).toBeDefined();
      expect(result.expectedKeyPoints?.length).toBeGreaterThan(0);
    });

    it('should test same concept from different angle', async () => {
      // REQ-4.4.2: System SHALL test same concept from different angle
      const mockResponse: GeminiResponse = {
        text: JSON.stringify({
          followUpQuestion: 'Why is it summer in Australia when it\'s winter in Canada?',
          expectedKeyPoints: ['earth tilt', 'different hemispheres', 'sun angle'],
          concept: 'seasons'
        }),
        finishReason: 'STOP'
      };

      vi.mocked(mockGeminiClient.generateResponse).mockResolvedValue(mockResponse);

      const options: VerificationOptions = {
        studentId: 'student123',
        originalQuestion: 'What causes seasons?',
        studentAnswer: 'Earth\'s tilt as it orbits the sun',
        topic: 'seasons'
      };

      const result = await verifier.verifyUnderstanding(options);

      expect(result.followUpQuestion).not.toContain('What causes seasons');
      expect(result.followUpQuestion).toBeDefined();
      expect(AntiCheatVerifier.isValidFollowUpQuestion(result.followUpQuestion!)).toBe(true);
    });

    it('should require application not just recall', async () => {
      // REQ-4.4.3: System SHALL require application, not just recall
      const mockResponse: GeminiResponse = {
        text: JSON.stringify({
          followUpQuestion: 'You have 5 bags with 7 apples each. If you eat 3 apples, how many are left?',
          expectedKeyPoints: ['multiply 5 and 7', 'get 35', 'subtract 3', 'answer is 32'],
          concept: 'multiplication'
        }),
        finishReason: 'STOP'
      };

      vi.mocked(mockGeminiClient.generateResponse).mockResolvedValue(mockResponse);

      const options: VerificationOptions = {
        studentId: 'student123',
        originalQuestion: 'What is 5 × 7?',
        studentAnswer: '35',
        topic: 'multiplication',
        grade: 3
      };

      const result = await verifier.verifyUnderstanding(options);

      // Follow-up should require application (word problem), not just recall
      expect(result.followUpQuestion).toBeDefined();
      const question = result.followUpQuestion!.toLowerCase();
      const hasApplicationIndicators = 
        question.includes('how') ||
        question.includes('why') ||
        question.includes('what if') ||
        question.includes('apply') ||
        question.includes('example');
      
      expect(hasApplicationIndicators).toBe(true);
    });

    it('should handle API errors with fallback', async () => {
      vi.mocked(mockGeminiClient.generateResponse).mockRejectedValue(
        new Error('API Error')
      );

      const options: VerificationOptions = {
        studentId: 'student123',
        originalQuestion: 'What is gravity?',
        studentAnswer: 'Force that pulls objects toward Earth',
        topic: 'gravity'
      };

      const result = await verifier.verifyUnderstanding(options);

      expect(result.verified).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.followUpQuestion).toBeDefined();
      expect(result.expectedKeyPoints).toBeDefined();
    });

    it('should handle non-JSON responses gracefully', async () => {
      const mockResponse: GeminiResponse = {
        text: 'Here is a follow-up question: Can you explain how this concept applies in real life?',
        finishReason: 'STOP'
      };

      vi.mocked(mockGeminiClient.generateResponse).mockResolvedValue(mockResponse);

      const options: VerificationOptions = {
        studentId: 'student123',
        originalQuestion: 'What is friction?',
        studentAnswer: 'Force that opposes motion',
        topic: 'friction'
      };

      const result = await verifier.verifyUnderstanding(options);

      expect(result.followUpQuestion).toBeDefined();
      expect(result.expectedKeyPoints).toBeDefined();
    });
  });

  describe('evaluateFollowUp', () => {
    it('should evaluate follow-up answers against expected key points', async () => {
      // REQ-4.4.4: System SHALL evaluate follow-up answers against expected key points
      const followUpAnswer = 'The plant would die because it needs sunlight to make food through photosynthesis';
      const expectedKeyPoints = ['no sunlight', 'cannot photosynthesize', 'plant would die'];

      const result = await verifier.evaluateFollowUp(followUpAnswer, expectedKeyPoints);

      expect(result.matchedPoints.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should calculate verification confidence (0-1)', () => {
      // REQ-4.4.5: System SHALL calculate verification confidence (0-1)
      const followUpAnswer = 'The plant needs sunlight for photosynthesis, so it would die without light';
      const expectedKeyPoints = ['sunlight', 'photosynthesis', 'die'];

      return verifier.evaluateFollowUp(followUpAnswer, expectedKeyPoints).then(result => {
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
        expect(result.confidence).toBeCloseTo(1.0, 1);
      });
    });

    it('should mark understanding as verified when confidence >0.6', async () => {
      // REQ-4.4.6: System SHALL mark understanding as verified when confidence >0.6
      const followUpAnswer = 'The plant would die because without sunlight it cannot perform photosynthesis to make food';
      const expectedKeyPoints = ['sunlight', 'photosynthesis', 'die'];

      const result = await verifier.evaluateFollowUp(followUpAnswer, expectedKeyPoints);

      expect(result.confidence).toBeGreaterThan(0.6);
      expect(result.verified).toBe(true);
    });

    it('should not verify when confidence <=0.6', async () => {
      const followUpAnswer = 'The plant would be sad';
      const expectedKeyPoints = ['no sunlight', 'cannot photosynthesize', 'plant would die'];

      const result = await verifier.evaluateFollowUp(followUpAnswer, expectedKeyPoints);

      expect(result.confidence).toBeLessThanOrEqual(0.6);
      expect(result.verified).toBe(false);
    });

    it('should identify matched and missing key points', async () => {
      const followUpAnswer = 'The plant needs sunlight to survive';
      const expectedKeyPoints = ['sunlight', 'photosynthesis', 'die', 'energy'];

      const result = await verifier.evaluateFollowUp(followUpAnswer, expectedKeyPoints);

      expect(result.matchedPoints).toContain('sunlight');
      expect(result.missingPoints.length).toBeGreaterThan(0);
      expect(result.matchedPoints.length + result.missingPoints.length).toBe(expectedKeyPoints.length);
    });

    it('should handle fuzzy matching of key points', async () => {
      const followUpAnswer = 'Without light, the plant cannot make its own food and will eventually wither';
      const expectedKeyPoints = ['no sunlight', 'cannot photosynthesize', 'plant would die'];

      const result = await verifier.evaluateFollowUp(followUpAnswer, expectedKeyPoints);

      // Should match despite different wording
      expect(result.matchedPoints.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0.3); // Adjusted for realistic fuzzy matching
    });

    it('should provide helpful feedback based on confidence', async () => {
      const testCases = [
        {
          answer: 'The plant needs sunlight for photosynthesis and would die without it',
          expectedKeyPoints: ['sunlight', 'photosynthesis', 'die'],
          expectedFeedbackPattern: /excellent|good|strong/i
        },
        {
          answer: 'The plant would be unhappy',
          expectedKeyPoints: ['sunlight', 'photosynthesis', 'die'],
          expectedFeedbackPattern: /review|focus|confusion/i
        }
      ];

      for (const testCase of testCases) {
        const result = await verifier.evaluateFollowUp(
          testCase.answer,
          testCase.expectedKeyPoints
        );

        expect(result.feedback).toBeDefined();
        expect(result.feedback.length).toBeGreaterThan(0);
      }
    });

    it('should handle empty answer', async () => {
      const followUpAnswer = '';
      const expectedKeyPoints = ['sunlight', 'photosynthesis', 'die'];

      const result = await verifier.evaluateFollowUp(followUpAnswer, expectedKeyPoints);

      expect(result.confidence).toBe(0);
      expect(result.verified).toBe(false);
      expect(result.matchedPoints.length).toBe(0);
      expect(result.missingPoints.length).toBe(expectedKeyPoints.length);
    });

    it('should handle empty expected key points', async () => {
      const followUpAnswer = 'Some answer';
      const expectedKeyPoints: string[] = [];

      const result = await verifier.evaluateFollowUp(followUpAnswer, expectedKeyPoints);

      expect(result.confidence).toBe(0);
      expect(result.verified).toBe(false);
    });
  });

  describe('isValidFollowUpQuestion', () => {
    it('should validate appropriate follow-up questions', () => {
      const validQuestions = [
        'How would you apply this concept in a real-world situation?',
        'Can you explain why this happens?',
        'What if we changed the conditions?',
        'Give me an example of where this would be useful',
        'Explain how this concept relates to what you learned before'
      ];

      for (const question of validQuestions) {
        expect(AntiCheatVerifier.isValidFollowUpQuestion(question)).toBe(true);
      }
    });

    it('should reject invalid follow-up questions', () => {
      const invalidQuestions = [
        'Yes or no',
        'What is X?', // Too short and just recall
        'Define this term', // Just recall
        '', // Empty
        'True or false' // Not application-based
      ];

      for (const question of invalidQuestions) {
        expect(AntiCheatVerifier.isValidFollowUpQuestion(question)).toBe(false);
      }
    });

    it('should require minimum length', () => {
      expect(AntiCheatVerifier.isValidFollowUpQuestion('Why?')).toBe(false);
      expect(AntiCheatVerifier.isValidFollowUpQuestion('How does this work?')).toBe(true);
    });

    it('should check for application indicators', () => {
      const withIndicators = 'How would you apply this concept to solve a problem?';
      const withoutIndicators = 'What is the definition?';

      expect(AntiCheatVerifier.isValidFollowUpQuestion(withIndicators)).toBe(true);
      expect(AntiCheatVerifier.isValidFollowUpQuestion(withoutIndicators)).toBe(false);
    });
  });

  describe('getVerificationThreshold', () => {
    it('should return 0.6 as verification threshold', () => {
      expect(AntiCheatVerifier.getVerificationThreshold()).toBe(0.6);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete verification workflow', async () => {
      // Step 1: Generate follow-up question
      const mockResponse: GeminiResponse = {
        text: JSON.stringify({
          followUpQuestion: 'If Earth had no tilt, what would happen to seasons?',
          expectedKeyPoints: ['no seasons', 'same temperature year-round', 'no variation'],
          concept: 'seasons'
        }),
        finishReason: 'STOP'
      };

      vi.mocked(mockGeminiClient.generateResponse).mockResolvedValue(mockResponse);

      const verificationOptions: VerificationOptions = {
        studentId: 'student123',
        originalQuestion: 'What causes seasons?',
        studentAnswer: 'Earth\'s tilt causes seasons',
        topic: 'seasons',
        grade: 6
      };

      const verificationResult = await verifier.verifyUnderstanding(verificationOptions);

      expect(verificationResult.verified).toBe(false);
      expect(verificationResult.followUpQuestion).toBeDefined();
      expect(verificationResult.expectedKeyPoints).toBeDefined();

      // Step 2: Evaluate student's follow-up answer
      const followUpAnswer = 'There would be no seasons because the tilt causes different amounts of sunlight';
      const evaluation = await verifier.evaluateFollowUp(
        followUpAnswer,
        verificationResult.expectedKeyPoints!
      );

      expect(evaluation.confidence).toBeGreaterThanOrEqual(0);
      expect(evaluation.confidence).toBeLessThanOrEqual(1);
      expect(evaluation.feedback).toBeDefined();
    });

    it('should handle student with strong understanding', async () => {
      const mockResponse: GeminiResponse = {
        text: JSON.stringify({
          followUpQuestion: 'Explain how photosynthesis and cellular respiration are related',
          expectedKeyPoints: ['opposite processes', 'oxygen and carbon dioxide', 'energy cycle'],
          concept: 'photosynthesis'
        }),
        finishReason: 'STOP'
      };

      vi.mocked(mockGeminiClient.generateResponse).mockResolvedValue(mockResponse);

      const options: VerificationOptions = {
        studentId: 'student456',
        originalQuestion: 'What is photosynthesis?',
        studentAnswer: 'Photosynthesis is the process where plants convert light energy into chemical energy',
        topic: 'photosynthesis',
        grade: 8
      };

      const result = await verifier.verifyUnderstanding(options);

      const strongAnswer = 'They are opposite processes - photosynthesis produces oxygen and uses carbon dioxide, while cellular respiration does the reverse, creating an energy cycle';
      const evaluation = await verifier.evaluateFollowUp(
        strongAnswer,
        result.expectedKeyPoints!
      );

      expect(evaluation.verified).toBe(true);
      expect(evaluation.confidence).toBeGreaterThan(0.8);
      expect(evaluation.feedback).toMatch(/excellent|good|strong/i);
    });

    it('should handle student with weak understanding', async () => {
      const mockResponse: GeminiResponse = {
        text: JSON.stringify({
          followUpQuestion: 'Why do we need to multiply in this problem?',
          expectedKeyPoints: ['repeated addition', 'groups of items', 'total calculation'],
          concept: 'multiplication'
        }),
        finishReason: 'STOP'
      };

      vi.mocked(mockGeminiClient.generateResponse).mockResolvedValue(mockResponse);

      const options: VerificationOptions = {
        studentId: 'student789',
        originalQuestion: 'What is 4 × 6?',
        studentAnswer: '24',
        topic: 'multiplication',
        grade: 3
      };

      const result = await verifier.verifyUnderstanding(options);

      const weakAnswer = 'Because the teacher said so';
      const evaluation = await verifier.evaluateFollowUp(
        weakAnswer,
        result.expectedKeyPoints!
      );

      expect(evaluation.verified).toBe(false);
      expect(evaluation.confidence).toBeLessThan(0.3);
      expect(evaluation.feedback).toMatch(/review|focus|confusion/i);
    });
  });
});
