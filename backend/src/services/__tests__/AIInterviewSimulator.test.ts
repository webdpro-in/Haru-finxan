/**
 * Unit Tests for AI Interview Simulator Service
 * 
 * Tests interview session management, question generation,
 * answer evaluation, and final report generation.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AIInterviewSimulator, DifficultyLevel } from '../AIInterviewSimulator.js';
import { GeminiClient } from '../GeminiClient.js';
import { redis } from '../../config/redis.js';

// Mock Redis
vi.mock('../../config/redis.js', () => ({
  redis: {
    setex: vi.fn(),
    get: vi.fn(),
    del: vi.fn()
  }
}));

// Mock uuid
vi.mock('uuid', () => ({
  v4: () => 'test-interview-id-123'
}));

describe('AIInterviewSimulator', () => {
  let simulator: AIInterviewSimulator;
  let mockGeminiClient: GeminiClient;

  beforeEach(() => {
    // Create mock Gemini client
    mockGeminiClient = {
      generateResponse: vi.fn()
    } as any;

    simulator = new AIInterviewSimulator(mockGeminiClient);

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('startInterview', () => {
    it('should start a new interview session with valid parameters', async () => {
      // Mock Gemini response for first question
      (mockGeminiClient.generateResponse as any).mockResolvedValue({
        text: 'Tell me about yourself and your background.'
      });

      const result = await simulator.startInterview(
        'student-123',
        'Software Engineer',
        'mid'
      );

      expect(result).toEqual({
        interviewId: 'test-interview-id-123',
        firstQuestion: 'Tell me about yourself and your background.'
      });

      // Verify Redis was called to store session
      expect(redis.setex).toHaveBeenCalledWith(
        'interview:test-interview-id-123',
        3600,
        expect.stringContaining('student-123')
      );
    });

    it('should support all difficulty levels', async () => {
      (mockGeminiClient.generateResponse as any).mockResolvedValue({
        text: 'Sample question'
      });

      const difficulties: DifficultyLevel[] = ['entry', 'mid', 'senior'];

      for (const difficulty of difficulties) {
        await simulator.startInterview('student-123', 'Data Analyst', difficulty);
        
        expect(mockGeminiClient.generateResponse).toHaveBeenCalledWith(
          expect.stringContaining(difficulty),
          expect.stringContaining(difficulty)
        );
      }
    });

    it('should throw error for missing parameters', async () => {
      await expect(
        simulator.startInterview('', 'Software Engineer', 'mid')
      ).rejects.toThrow('Missing required parameters');

      await expect(
        simulator.startInterview('student-123', '', 'mid')
      ).rejects.toThrow('Missing required parameters');
    });

    it('should throw error for invalid difficulty level', async () => {
      await expect(
        simulator.startInterview('student-123', 'Software Engineer', 'invalid' as any)
      ).rejects.toThrow('Invalid difficulty level');
    });

    it('should generate role-specific questions', async () => {
      (mockGeminiClient.generateResponse as any).mockResolvedValue({
        text: 'What is your experience with React?'
      });

      await simulator.startInterview('student-123', 'Frontend Developer', 'entry');

      expect(mockGeminiClient.generateResponse).toHaveBeenCalledWith(
        expect.stringContaining('Frontend Developer'),
        expect.stringContaining('Frontend Developer')
      );
    });

    it('should store session with 1-hour TTL', async () => {
      (mockGeminiClient.generateResponse as any).mockResolvedValue({
        text: 'First question'
      });

      await simulator.startInterview('student-123', 'Software Engineer', 'mid');

      expect(redis.setex).toHaveBeenCalledWith(
        expect.any(String),
        3600, // 1 hour TTL
        expect.any(String)
      );
    });
  });

  describe('answerQuestion', () => {
    beforeEach(() => {
      // Mock session retrieval
      const mockSession = {
        interviewId: 'test-interview-id-123',
        studentId: 'student-123',
        jobRole: 'Software Engineer',
        difficulty: 'mid',
        startedAt: Date.now(),
        questions: ['Tell me about yourself.'],
        answers: [],
        scores: [],
        currentQuestionIndex: 0
      };

      (redis.get as any).mockResolvedValue(JSON.stringify(mockSession));
    });

    it('should evaluate answer and return feedback with score', async () => {
      (mockGeminiClient.generateResponse as any)
        .mockResolvedValueOnce({
          text: JSON.stringify({
            feedback: 'Good answer with relevant experience.',
            score: 8
          })
        })
        .mockResolvedValueOnce({
          text: 'What are your strengths?'
        });

      const result = await simulator.answerQuestion(
        'test-interview-id-123',
        'I have 3 years of experience in full-stack development.'
      );

      expect(result).toEqual({
        feedback: 'Good answer with relevant experience.',
        score: 8,
        nextQuestion: 'What are your strengths?',
        isComplete: false
      });
    });

    it('should update session with answer and score', async () => {
      (mockGeminiClient.generateResponse as any)
        .mockResolvedValueOnce({
          text: JSON.stringify({ feedback: 'Good', score: 7 })
        })
        .mockResolvedValueOnce({
          text: 'Next question'
        });

      await simulator.answerQuestion('test-interview-id-123', 'My answer');

      expect(redis.setex).toHaveBeenCalledWith(
        'interview:test-interview-id-123',
        3600,
        expect.stringContaining('My answer')
      );
    });

    it('should mark interview as complete after max questions', async () => {
      // Mock session with 4 questions already answered
      const mockSession = {
        interviewId: 'test-interview-id-123',
        studentId: 'student-123',
        jobRole: 'Software Engineer',
        difficulty: 'mid',
        startedAt: Date.now(),
        questions: ['Q1', 'Q2', 'Q3', 'Q4', 'Q5'],
        answers: ['A1', 'A2', 'A3', 'A4'],
        scores: [7, 8, 6, 9],
        currentQuestionIndex: 4
      };

      (redis.get as any).mockResolvedValue(JSON.stringify(mockSession));
      (mockGeminiClient.generateResponse as any).mockResolvedValue({
        text: JSON.stringify({ feedback: 'Great!', score: 9 })
      });

      const result = await simulator.answerQuestion('test-interview-id-123', 'Final answer');

      expect(result.isComplete).toBe(true);
      expect(result.nextQuestion).toBeNull();
    });

    it('should throw error for missing parameters', async () => {
      await expect(
        simulator.answerQuestion('', 'answer')
      ).rejects.toThrow('Missing required parameters');

      await expect(
        simulator.answerQuestion('interview-123', '')
      ).rejects.toThrow('Missing required parameters');
    });

    it('should throw error for non-existent session', async () => {
      (redis.get as any).mockResolvedValue(null);

      await expect(
        simulator.answerQuestion('non-existent-id', 'answer')
      ).rejects.toThrow('Interview session not found or expired');
    });

    it('should handle malformed JSON evaluation gracefully', async () => {
      (mockGeminiClient.generateResponse as any)
        .mockResolvedValueOnce({
          text: 'Not valid JSON'
        })
        .mockResolvedValueOnce({
          text: 'Next question'
        });

      const result = await simulator.answerQuestion('test-interview-id-123', 'answer');

      expect(result.score).toBe(5); // Fallback score
      expect(result.feedback).toContain('Thank you');
    });

    it('should handle invalid score gracefully with fallback', async () => {
      (mockGeminiClient.generateResponse as any)
        .mockResolvedValueOnce({
          text: JSON.stringify({ feedback: 'Good', score: 15 }) // Invalid score
        })
        .mockResolvedValueOnce({
          text: 'Next question'
        });

      const result = await simulator.answerQuestion('test-interview-id-123', 'answer');

      // Should use fallback score when invalid
      expect(result.score).toBe(5);
      expect(result.feedback).toContain('Thank you');
    });
  });

  describe('endInterview', () => {
    beforeEach(() => {
      // Mock completed session
      const mockSession = {
        interviewId: 'test-interview-id-123',
        studentId: 'student-123',
        jobRole: 'Software Engineer',
        difficulty: 'mid',
        startedAt: Date.now(),
        questions: ['Q1', 'Q2', 'Q3'],
        answers: ['A1', 'A2', 'A3'],
        scores: [8, 7, 9],
        currentQuestionIndex: 3
      };

      (redis.get as any).mockResolvedValue(JSON.stringify(mockSession));
    });

    it('should generate final report with all required fields', async () => {
      (mockGeminiClient.generateResponse as any).mockResolvedValue({
        text: JSON.stringify({
          overallScore: 80,
          strengths: ['Strong technical knowledge', 'Good communication', 'Problem-solving skills'],
          areasToImprove: ['More experience needed', 'System design', 'Leadership skills'],
          recommendation: 'hire'
        })
      });

      const result = await simulator.endInterview('test-interview-id-123');

      expect(result).toEqual({
        overallScore: 80,
        strengths: expect.arrayContaining([expect.any(String)]),
        areasToImprove: expect.arrayContaining([expect.any(String)]),
        recommendation: 'hire'
      });

      expect(result.strengths).toHaveLength(3);
      expect(result.areasToImprove).toHaveLength(3);
    });

    it('should delete session after generating report', async () => {
      (mockGeminiClient.generateResponse as any).mockResolvedValue({
        text: JSON.stringify({
          overallScore: 75,
          strengths: ['S1', 'S2', 'S3'],
          areasToImprove: ['I1', 'I2', 'I3'],
          recommendation: 'maybe'
        })
      });

      await simulator.endInterview('test-interview-id-123');

      expect(redis.del).toHaveBeenCalledWith('interview:test-interview-id-123');
    });

    it('should support all recommendation types', async () => {
      const recommendations: Array<'hire' | 'maybe' | 'no'> = ['hire', 'maybe', 'no'];

      for (const recommendation of recommendations) {
        (mockGeminiClient.generateResponse as any).mockResolvedValue({
          text: JSON.stringify({
            overallScore: 70,
            strengths: ['S1', 'S2', 'S3'],
            areasToImprove: ['I1', 'I2', 'I3'],
            recommendation
          })
        });

        const result = await simulator.endInterview('test-interview-id-123');
        expect(result.recommendation).toBe(recommendation);
      }
    });

    it('should throw error for missing parameter', async () => {
      await expect(
        simulator.endInterview('')
      ).rejects.toThrow('Missing required parameter');
    });

    it('should throw error for non-existent session', async () => {
      (redis.get as any).mockResolvedValue(null);

      await expect(
        simulator.endInterview('non-existent-id')
      ).rejects.toThrow('Interview session not found or expired');
    });

    it('should throw error if no questions were answered', async () => {
      const mockSession = {
        interviewId: 'test-interview-id-123',
        studentId: 'student-123',
        jobRole: 'Software Engineer',
        difficulty: 'mid',
        startedAt: Date.now(),
        questions: ['Q1'],
        answers: [],
        scores: [],
        currentQuestionIndex: 0
      };

      (redis.get as any).mockResolvedValue(JSON.stringify(mockSession));

      await expect(
        simulator.endInterview('test-interview-id-123')
      ).rejects.toThrow('Cannot generate report: no questions have been answered');
    });

    it('should handle malformed JSON report gracefully', async () => {
      (mockGeminiClient.generateResponse as any).mockResolvedValue({
        text: 'Not valid JSON'
      });

      const result = await simulator.endInterview('test-interview-id-123');

      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(result.strengths).toBeInstanceOf(Array);
      expect(result.areasToImprove).toBeInstanceOf(Array);
      expect(['hire', 'maybe', 'no']).toContain(result.recommendation);
    });

    it('should validate overall score is between 0-100', async () => {
      (mockGeminiClient.generateResponse as any).mockResolvedValue({
        text: JSON.stringify({
          overallScore: 150, // Invalid
          strengths: ['S1', 'S2', 'S3'],
          areasToImprove: ['I1', 'I2', 'I3'],
          recommendation: 'hire'
        })
      });

      const result = await simulator.endInterview('test-interview-id-123');

      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
    });
  });

  describe('getInterviewStatus', () => {
    it('should return status for existing interview', async () => {
      const mockSession = {
        interviewId: 'test-interview-id-123',
        studentId: 'student-123',
        jobRole: 'Software Engineer',
        difficulty: 'mid',
        startedAt: Date.now(),
        questions: ['Q1', 'Q2', 'Q3'],
        answers: ['A1', 'A2'],
        scores: [8, 7],
        currentQuestionIndex: 2
      };

      (redis.get as any).mockResolvedValue(JSON.stringify(mockSession));

      const status = await simulator.getInterviewStatus('test-interview-id-123');

      expect(status).toEqual({
        exists: true,
        questionsAnswered: 2,
        totalQuestions: 3,
        isComplete: false
      });
    });

    it('should return null for non-existent interview', async () => {
      (redis.get as any).mockResolvedValue(null);

      const status = await simulator.getInterviewStatus('non-existent-id');

      expect(status).toBeNull();
    });

    it('should indicate when interview is complete', async () => {
      const mockSession = {
        interviewId: 'test-interview-id-123',
        studentId: 'student-123',
        jobRole: 'Software Engineer',
        difficulty: 'mid',
        startedAt: Date.now(),
        questions: ['Q1', 'Q2', 'Q3', 'Q4', 'Q5'],
        answers: ['A1', 'A2', 'A3', 'A4', 'A5'],
        scores: [8, 7, 9, 6, 8],
        currentQuestionIndex: 5
      };

      (redis.get as any).mockResolvedValue(JSON.stringify(mockSession));

      const status = await simulator.getInterviewStatus('test-interview-id-123');

      expect(status?.isComplete).toBe(true);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete interview flow', async () => {
      // Start interview
      (mockGeminiClient.generateResponse as any).mockResolvedValueOnce({
        text: 'Tell me about yourself.'
      });

      const startResult = await simulator.startInterview(
        'student-123',
        'Software Engineer',
        'mid'
      );

      expect(startResult.interviewId).toBe('test-interview-id-123');

      // Mock session for subsequent calls
      const mockSession = {
        interviewId: 'test-interview-id-123',
        studentId: 'student-123',
        jobRole: 'Software Engineer',
        difficulty: 'mid',
        startedAt: Date.now(),
        questions: ['Tell me about yourself.'],
        answers: [],
        scores: [],
        currentQuestionIndex: 0
      };

      (redis.get as any).mockResolvedValue(JSON.stringify(mockSession));

      // Answer question
      (mockGeminiClient.generateResponse as any)
        .mockResolvedValueOnce({
          text: JSON.stringify({ feedback: 'Good answer', score: 8 })
        })
        .mockResolvedValueOnce({
          text: 'What are your strengths?'
        });

      const answerResult = await simulator.answerQuestion(
        'test-interview-id-123',
        'I have 3 years of experience.'
      );

      expect(answerResult.score).toBe(8);
      expect(answerResult.nextQuestion).toBeTruthy();
    });

    it('should handle multiple difficulty levels correctly', async () => {
      const difficulties: DifficultyLevel[] = ['entry', 'mid', 'senior'];

      for (const difficulty of difficulties) {
        (mockGeminiClient.generateResponse as any).mockResolvedValue({
          text: `Question for ${difficulty} level`
        });

        const result = await simulator.startInterview(
          'student-123',
          'Software Engineer',
          difficulty
        );

        expect(result.firstQuestion).toContain(difficulty);
      }
    });
  });
});
