/**
 * Integration Tests for AI Interview Simulator Service
 * 
 * Tests the complete interview flow with real Redis and Gemini client interactions.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AIInterviewSimulator, DifficultyLevel } from '../AIInterviewSimulator.js';
import { GeminiClient } from '../GeminiClient.js';
import { redis } from '../../config/redis.js';

describe('AIInterviewSimulator Integration Tests', () => {
  let simulator: AIInterviewSimulator;
  let geminiClient: GeminiClient;
  const testInterviewIds: string[] = [];

  beforeEach(async () => {
    // Initialize real Gemini client
    const apiKey = process.env.GEMINI_API_KEY || 'test-api-key';
    geminiClient = new GeminiClient({
      apiKey,
      model: 'gemini-1.5-flash'
    });

    simulator = new AIInterviewSimulator(geminiClient);

    // Ensure Redis is connected
    try {
      await redis.ping();
    } catch (error) {
      console.warn('Redis not available for integration tests');
    }
  });

  afterEach(async () => {
    // Clean up test interview sessions
    for (const interviewId of testInterviewIds) {
      try {
        await redis.del(`interview:${interviewId}`);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    testInterviewIds.length = 0;
  });

  describe('Complete Interview Flow', () => {
    it('should complete full interview cycle: start -> answer -> end', async () => {
      // Skip if no API key
      if (!process.env.GEMINI_API_KEY) {
        console.log('Skipping integration test: GEMINI_API_KEY not set');
        return;
      }

      // Start interview
      const startResult = await simulator.startInterview(
        'student-integration-test',
        'Software Engineer',
        'mid'
      );

      testInterviewIds.push(startResult.interviewId);

      expect(startResult.interviewId).toBeTruthy();
      expect(startResult.firstQuestion).toBeTruthy();
      expect(startResult.firstQuestion.length).toBeGreaterThan(10);

      // Verify session exists in Redis
      const sessionData = await redis.get(`interview:${startResult.interviewId}`);
      expect(sessionData).toBeTruthy();

      const session = JSON.parse(sessionData!);
      expect(session.studentId).toBe('student-integration-test');
      expect(session.jobRole).toBe('Software Engineer');
      expect(session.difficulty).toBe('mid');

      // Answer first question
      const answer1 = 'I have 3 years of experience in full-stack development, working with React, Node.js, and PostgreSQL.';
      const answerResult1 = await simulator.answerQuestion(
        startResult.interviewId,
        answer1
      );

      expect(answerResult1.feedback).toBeTruthy();
      expect(answerResult1.score).toBeGreaterThanOrEqual(0);
      expect(answerResult1.score).toBeLessThanOrEqual(10);
      expect(answerResult1.nextQuestion).toBeTruthy();
      expect(answerResult1.isComplete).toBe(false);

      // Answer second question
      const answer2 = 'My main strengths are problem-solving, teamwork, and quick learning. I enjoy tackling complex challenges.';
      const answerResult2 = await simulator.answerQuestion(
        startResult.interviewId,
        answer2
      );

      expect(answerResult2.feedback).toBeTruthy();
      expect(answerResult2.score).toBeGreaterThanOrEqual(0);
      expect(answerResult2.score).toBeLessThanOrEqual(10);

      // Answer remaining questions to complete interview
      for (let i = 0; i < 3; i++) {
        const result = await simulator.answerQuestion(
          startResult.interviewId,
          'This is a sample answer demonstrating my knowledge and experience.'
        );

        if (result.isComplete) {
          break;
        }
      }

      // End interview and get final report
      const finalReport = await simulator.endInterview(startResult.interviewId);

      expect(finalReport.overallScore).toBeGreaterThanOrEqual(0);
      expect(finalReport.overallScore).toBeLessThanOrEqual(100);
      expect(finalReport.strengths).toBeInstanceOf(Array);
      expect(finalReport.strengths.length).toBeGreaterThan(0);
      expect(finalReport.areasToImprove).toBeInstanceOf(Array);
      expect(finalReport.areasToImprove.length).toBeGreaterThan(0);
      expect(['hire', 'maybe', 'no']).toContain(finalReport.recommendation);

      // Verify session was deleted
      const deletedSession = await redis.get(`interview:${startResult.interviewId}`);
      expect(deletedSession).toBeNull();
    }, 60000); // 60 second timeout for API calls

    it('should handle entry-level interview', async () => {
      if (!process.env.GEMINI_API_KEY) {
        console.log('Skipping integration test: GEMINI_API_KEY not set');
        return;
      }

      const startResult = await simulator.startInterview(
        'student-entry-test',
        'Junior Developer',
        'entry'
      );

      testInterviewIds.push(startResult.interviewId);

      expect(startResult.firstQuestion).toBeTruthy();
      
      // Entry-level questions should be simpler
      expect(startResult.firstQuestion.length).toBeGreaterThan(10);

      // Answer question
      const answerResult = await simulator.answerQuestion(
        startResult.interviewId,
        'I recently graduated with a degree in Computer Science and completed several projects.'
      );

      expect(answerResult.score).toBeGreaterThanOrEqual(0);
      expect(answerResult.score).toBeLessThanOrEqual(10);
    }, 30000);

    it('should handle senior-level interview', async () => {
      if (!process.env.GEMINI_API_KEY) {
        console.log('Skipping integration test: GEMINI_API_KEY not set');
        return;
      }

      const startResult = await simulator.startInterview(
        'student-senior-test',
        'Senior Software Architect',
        'senior'
      );

      testInterviewIds.push(startResult.interviewId);

      expect(startResult.firstQuestion).toBeTruthy();

      // Answer question
      const answerResult = await simulator.answerQuestion(
        startResult.interviewId,
        'I have 10 years of experience leading teams and designing scalable systems for enterprise applications.'
      );

      expect(answerResult.score).toBeGreaterThanOrEqual(0);
      expect(answerResult.score).toBeLessThanOrEqual(10);
    }, 30000);
  });

  describe('Session Management', () => {
    it('should maintain session state across multiple answers', async () => {
      if (!process.env.GEMINI_API_KEY) {
        console.log('Skipping integration test: GEMINI_API_KEY not set');
        return;
      }

      const startResult = await simulator.startInterview(
        'student-session-test',
        'Data Analyst',
        'mid'
      );

      testInterviewIds.push(startResult.interviewId);

      // Answer multiple questions
      const answers = [
        'I have experience with SQL, Python, and data visualization tools.',
        'I once analyzed customer data to identify trends that increased sales by 20%.',
        'I am proficient in Excel, Tableau, and Power BI.'
      ];

      for (const answer of answers) {
        const result = await simulator.answerQuestion(startResult.interviewId, answer);
        
        // Verify session still exists
        const sessionData = await redis.get(`interview:${startResult.interviewId}`);
        expect(sessionData).toBeTruthy();

        if (result.isComplete) {
          break;
        }
      }

      // Check interview status
      const status = await simulator.getInterviewStatus(startResult.interviewId);
      expect(status).toBeTruthy();
      expect(status!.exists).toBe(true);
      expect(status!.questionsAnswered).toBeGreaterThan(0);
    }, 60000);

    it('should respect 1-hour TTL for sessions', async () => {
      if (!process.env.GEMINI_API_KEY) {
        console.log('Skipping integration test: GEMINI_API_KEY not set');
        return;
      }

      const startResult = await simulator.startInterview(
        'student-ttl-test',
        'Product Manager',
        'mid'
      );

      testInterviewIds.push(startResult.interviewId);

      // Check TTL is set correctly
      const ttl = await redis.ttl(`interview:${startResult.interviewId}`);
      expect(ttl).toBeGreaterThan(3500); // Should be close to 3600 seconds
      expect(ttl).toBeLessThanOrEqual(3600);
    }, 30000);
  });

  describe('Error Handling', () => {
    it('should handle non-existent interview gracefully', async () => {
      await expect(
        simulator.answerQuestion('non-existent-interview-id', 'answer')
      ).rejects.toThrow('Interview session not found or expired');
    });

    it('should handle invalid parameters', async () => {
      await expect(
        simulator.startInterview('', 'Software Engineer', 'mid')
      ).rejects.toThrow('Missing required parameters');

      await expect(
        simulator.startInterview('student-123', 'Software Engineer', 'invalid' as any)
      ).rejects.toThrow('Invalid difficulty level');
    });

    it('should handle ending interview with no answers', async () => {
      if (!process.env.GEMINI_API_KEY) {
        console.log('Skipping integration test: GEMINI_API_KEY not set');
        return;
      }

      const startResult = await simulator.startInterview(
        'student-no-answers',
        'Software Engineer',
        'mid'
      );

      testInterviewIds.push(startResult.interviewId);

      // Try to end interview without answering any questions
      await expect(
        simulator.endInterview(startResult.interviewId)
      ).rejects.toThrow('Cannot generate report: no questions have been answered');
    }, 30000);
  });

  describe('Different Job Roles', () => {
    const jobRoles = [
      'Software Engineer',
      'Data Scientist',
      'Product Manager',
      'UX Designer',
      'DevOps Engineer'
    ];

    it('should generate role-specific questions for different roles', async () => {
      if (!process.env.GEMINI_API_KEY) {
        console.log('Skipping integration test: GEMINI_API_KEY not set');
        return;
      }

      for (const jobRole of jobRoles) {
        const startResult = await simulator.startInterview(
          `student-${jobRole.replace(/\s+/g, '-').toLowerCase()}`,
          jobRole,
          'mid'
        );

        testInterviewIds.push(startResult.interviewId);

        expect(startResult.firstQuestion).toBeTruthy();
        expect(startResult.firstQuestion.length).toBeGreaterThan(10);

        // Questions should be relevant to the role
        // (We can't strictly validate content, but we can check it's not empty)
      }
    }, 60000);
  });

  describe('Interview Status Tracking', () => {
    it('should track interview progress accurately', async () => {
      if (!process.env.GEMINI_API_KEY) {
        console.log('Skipping integration test: GEMINI_API_KEY not set');
        return;
      }

      const startResult = await simulator.startInterview(
        'student-status-test',
        'Software Engineer',
        'mid'
      );

      testInterviewIds.push(startResult.interviewId);

      // Check initial status
      let status = await simulator.getInterviewStatus(startResult.interviewId);
      expect(status?.questionsAnswered).toBe(0);
      expect(status?.isComplete).toBe(false);

      // Answer one question
      await simulator.answerQuestion(
        startResult.interviewId,
        'Sample answer'
      );

      // Check updated status
      status = await simulator.getInterviewStatus(startResult.interviewId);
      expect(status?.questionsAnswered).toBe(1);

      // Answer more questions
      await simulator.answerQuestion(startResult.interviewId, 'Answer 2');
      await simulator.answerQuestion(startResult.interviewId, 'Answer 3');

      status = await simulator.getInterviewStatus(startResult.interviewId);
      expect(status?.questionsAnswered).toBe(3);
    }, 60000);
  });

  describe('Concurrent Interviews', () => {
    it('should handle multiple concurrent interviews independently', async () => {
      if (!process.env.GEMINI_API_KEY) {
        console.log('Skipping integration test: GEMINI_API_KEY not set');
        return;
      }

      // Start two interviews simultaneously
      const [interview1, interview2] = await Promise.all([
        simulator.startInterview('student-1', 'Software Engineer', 'entry'),
        simulator.startInterview('student-2', 'Data Analyst', 'senior')
      ]);

      testInterviewIds.push(interview1.interviewId, interview2.interviewId);

      expect(interview1.interviewId).not.toBe(interview2.interviewId);

      // Answer questions in both interviews
      const [answer1, answer2] = await Promise.all([
        simulator.answerQuestion(interview1.interviewId, 'Answer for interview 1'),
        simulator.answerQuestion(interview2.interviewId, 'Answer for interview 2')
      ]);

      expect(answer1.feedback).toBeTruthy();
      expect(answer2.feedback).toBeTruthy();

      // Verify both sessions exist independently
      const status1 = await simulator.getInterviewStatus(interview1.interviewId);
      const status2 = await simulator.getInterviewStatus(interview2.interviewId);

      expect(status1?.questionsAnswered).toBe(1);
      expect(status2?.questionsAnswered).toBe(1);
    }, 60000);
  });
});
