/**
 * AI Interview Simulator Service
 * 
 * Simulates job interviews with Haru as the interviewer.
 * Supports multiple difficulty levels and generates role-specific questions.
 * Evaluates answers with feedback and scores, and generates final reports.
 * 
 * Requirements:
 * - REQ-5.1.1: System SHALL simulate job interviews with Haru as interviewer
 * - REQ-5.1.2: System SHALL support difficulty levels: entry, mid, senior
 * - REQ-5.1.3: System SHALL generate role-specific interview questions
 * - REQ-5.1.4: System SHALL evaluate answers with feedback and scores (0-10)
 * - REQ-5.1.5: System SHALL generate final report: overall score, strengths, areas to improve, recommendation
 * - REQ-5.1.6: System SHALL maintain interview state in Redis with 1-hour TTL
 */

import { redis } from '../config/redis.js';
import { GeminiClient } from './GeminiClient.js';
import { v4 as uuidv4 } from 'uuid';

export type DifficultyLevel = 'entry' | 'mid' | 'senior';

export interface InterviewSession {
  interviewId: string;
  studentId: string;
  jobRole: string;
  difficulty: DifficultyLevel;
  startedAt: number;
  questions: string[];
  answers: string[];
  scores: number[];
  currentQuestionIndex: number;
}

export interface StartInterviewResponse {
  interviewId: string;
  firstQuestion: string;
}

export interface AnswerQuestionResponse {
  feedback: string;
  score: number;
  nextQuestion: string | null;
  isComplete: boolean;
}

export interface FinalReport {
  overallScore: number;
  strengths: string[];
  areasToImprove: string[];
  recommendation: 'hire' | 'maybe' | 'no';
}

export class AIInterviewSimulator {
  private geminiClient: GeminiClient;
  private readonly SESSION_TTL = 3600; // 1 hour
  private readonly MAX_QUESTIONS = 5; // Maximum questions per interview

  constructor(geminiClient: GeminiClient) {
    this.geminiClient = geminiClient;
  }

  /**
   * Start a new interview session
   * REQ-5.1.1, REQ-5.1.2, REQ-5.1.3, REQ-5.1.6
   */
  async startInterview(
    studentId: string,
    jobRole: string,
    difficulty: DifficultyLevel
  ): Promise<StartInterviewResponse> {
    // Validate inputs
    if (!studentId || !jobRole || !difficulty) {
      throw new Error('Missing required parameters: studentId, jobRole, or difficulty');
    }

    if (!['entry', 'mid', 'senior'].includes(difficulty)) {
      throw new Error('Invalid difficulty level. Must be: entry, mid, or senior');
    }

    const interviewId = uuidv4();

    // Generate first question
    const firstQuestion = await this.generateFirstQuestion(jobRole, difficulty);

    // Initialize interview session
    const session: InterviewSession = {
      interviewId,
      studentId,
      jobRole,
      difficulty,
      startedAt: Date.now(),
      questions: [firstQuestion],
      answers: [],
      scores: [],
      currentQuestionIndex: 0
    };

    // Store in Redis with 1-hour TTL
    await redis.setex(
      `interview:${interviewId}`,
      this.SESSION_TTL,
      JSON.stringify(session)
    );

    return {
      interviewId,
      firstQuestion
    };
  }

  /**
   * Answer a question and get feedback with next question
   * REQ-5.1.4
   */
  async answerQuestion(
    interviewId: string,
    answer: string
  ): Promise<AnswerQuestionResponse> {
    // Validate inputs
    if (!interviewId || !answer) {
      throw new Error('Missing required parameters: interviewId or answer');
    }

    // Get interview state
    const session = await this.getSession(interviewId);
    if (!session) {
      throw new Error('Interview session not found or expired');
    }

    // Check if interview is already complete
    if (session.currentQuestionIndex >= session.questions.length) {
      throw new Error('Interview is already complete. Call endInterview to get final report.');
    }

    const currentQuestion = session.questions[session.currentQuestionIndex];

    // Evaluate answer
    const evaluation = await this.evaluateAnswer(
      currentQuestion,
      answer,
      session.jobRole,
      session.difficulty
    );

    // Update session
    session.answers.push(answer);
    session.scores.push(evaluation.score);
    session.currentQuestionIndex++;

    // Check if we should generate next question
    const isComplete = session.currentQuestionIndex >= this.MAX_QUESTIONS;
    let nextQuestion: string | null = null;

    if (!isComplete) {
      nextQuestion = await this.generateNextQuestion(
        session.jobRole,
        session.difficulty,
        session.questions,
        session.answers
      );
      session.questions.push(nextQuestion);
    }

    // Save updated session
    await this.saveSession(session);

    return {
      feedback: evaluation.feedback,
      score: evaluation.score,
      nextQuestion,
      isComplete
    };
  }

  /**
   * End interview and generate final report
   * REQ-5.1.5
   */
  async endInterview(interviewId: string): Promise<FinalReport> {
    // Validate input
    if (!interviewId) {
      throw new Error('Missing required parameter: interviewId');
    }

    // Get interview state
    const session = await this.getSession(interviewId);
    if (!session) {
      throw new Error('Interview session not found or expired');
    }

    // Check if any questions were answered
    if (session.answers.length === 0) {
      throw new Error('Cannot generate report: no questions have been answered');
    }

    // Generate final report
    const report = await this.generateFinalReport(session);

    // Delete session from Redis (interview is complete)
    await redis.del(`interview:${interviewId}`);

    return report;
  }

  /**
   * Get interview session from Redis
   */
  private async getSession(interviewId: string): Promise<InterviewSession | null> {
    const data = await redis.get(`interview:${interviewId}`);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Save interview session to Redis
   */
  private async saveSession(session: InterviewSession): Promise<void> {
    await redis.setex(
      `interview:${session.interviewId}`,
      this.SESSION_TTL,
      JSON.stringify(session)
    );
  }

  /**
   * Generate first interview question
   * REQ-5.1.3
   */
  private async generateFirstQuestion(
    jobRole: string,
    difficulty: DifficultyLevel
  ): Promise<string> {
    const systemPrompt = `You are Haru, a friendly and professional AI interviewer. You are conducting a ${difficulty}-level job interview for a ${jobRole} position.`;

    const prompt = `Generate the first interview question for a ${difficulty}-level ${jobRole} position. 

The question should:
- Be appropriate for ${difficulty} level (${this.getDifficultyDescription(difficulty)})
- Be role-specific and relevant to ${jobRole}
- Be clear and professional
- Be open-ended to allow detailed answers

Return ONLY the question text, nothing else.`;

    const response = await this.geminiClient.generateResponse(prompt, systemPrompt);
    return response.text.trim();
  }

  /**
   * Generate next interview question
   * REQ-5.1.3
   */
  private async generateNextQuestion(
    jobRole: string,
    difficulty: DifficultyLevel,
    previousQuestions: string[],
    previousAnswers: string[]
  ): Promise<string> {
    const systemPrompt = `You are Haru, a friendly and professional AI interviewer. You are conducting a ${difficulty}-level job interview for a ${jobRole} position.`;

    const conversationHistory = previousQuestions
      .map((q, i) => `Q${i + 1}: ${q}\nA${i + 1}: ${previousAnswers[i] || 'No answer yet'}`)
      .join('\n\n');

    const prompt = `Based on the interview so far, generate the next question for a ${difficulty}-level ${jobRole} position.

Previous conversation:
${conversationHistory}

The next question should:
- Cover a DIFFERENT topic than previous questions
- Be appropriate for ${difficulty} level
- Be role-specific and relevant to ${jobRole}
- Build on the conversation naturally
- Be clear and professional

Return ONLY the question text, nothing else.`;

    const response = await this.geminiClient.generateResponse(prompt, systemPrompt);
    return response.text.trim();
  }

  /**
   * Evaluate an answer and provide feedback
   * REQ-5.1.4
   */
  private async evaluateAnswer(
    question: string,
    answer: string,
    jobRole: string,
    difficulty: DifficultyLevel
  ): Promise<{ feedback: string; score: number }> {
    const systemPrompt = `You are Haru, a friendly and professional AI interviewer evaluating answers for a ${difficulty}-level ${jobRole} position.`;

    const prompt = `Evaluate this interview answer:

Question: ${question}
Answer: ${answer}

Provide:
1. Brief constructive feedback (2-3 sentences)
2. Score from 0-10 (where 0 is completely wrong/irrelevant and 10 is excellent)

Consider:
- Relevance to the question
- Depth of knowledge
- Communication clarity
- Appropriateness for ${difficulty} level

Return your response in this EXACT JSON format:
{
  "feedback": "Your feedback here",
  "score": 8
}`;

    const response = await this.geminiClient.generateResponse(prompt, systemPrompt);
    
    try {
      // Try to parse JSON response
      const evaluation = JSON.parse(response.text);
      
      // Validate score is between 0-10
      if (typeof evaluation.score !== 'number' || evaluation.score < 0 || evaluation.score > 10) {
        throw new Error('Invalid score value');
      }

      return {
        feedback: evaluation.feedback || 'Good answer.',
        score: Math.round(evaluation.score) // Ensure integer
      };
    } catch (error) {
      // Fallback if JSON parsing fails
      console.error('Failed to parse evaluation response:', error);
      return {
        feedback: 'Thank you for your answer. Let\'s continue with the next question.',
        score: 5
      };
    }
  }

  /**
   * Generate final interview report
   * REQ-5.1.5
   */
  private async generateFinalReport(session: InterviewSession): Promise<FinalReport> {
    const systemPrompt = `You are Haru, a professional AI interviewer providing final interview feedback for a ${session.difficulty}-level ${session.jobRole} position.`;

    const conversationHistory = session.questions
      .map((q, i) => `Q${i + 1}: ${q}\nA${i + 1}: ${session.answers[i]}\nScore: ${session.scores[i]}/10`)
      .join('\n\n');

    const averageScore = session.scores.reduce((sum, score) => sum + score, 0) / session.scores.length;

    const prompt = `Generate a final interview performance report:

Job Role: ${session.jobRole}
Difficulty Level: ${session.difficulty}
Average Score: ${averageScore.toFixed(1)}/10

Interview Conversation:
${conversationHistory}

Provide:
1. Overall score (0-100)
2. Top 3 strengths (specific, actionable)
3. Top 3 areas to improve (specific, actionable)
4. Final recommendation: "hire", "maybe", or "no"

Return your response in this EXACT JSON format:
{
  "overallScore": 75,
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "areasToImprove": ["area 1", "area 2", "area 3"],
  "recommendation": "maybe"
}`;

    const response = await this.geminiClient.generateResponse(prompt, systemPrompt);
    
    try {
      const report = JSON.parse(response.text);
      
      // Validate overall score
      if (typeof report.overallScore !== 'number' || report.overallScore < 0 || report.overallScore > 100) {
        report.overallScore = Math.round(averageScore * 10);
      }

      // Validate recommendation
      if (!['hire', 'maybe', 'no'].includes(report.recommendation)) {
        report.recommendation = averageScore >= 7 ? 'hire' : averageScore >= 5 ? 'maybe' : 'no';
      }

      // Ensure arrays exist
      report.strengths = Array.isArray(report.strengths) ? report.strengths.slice(0, 3) : ['Good communication'];
      report.areasToImprove = Array.isArray(report.areasToImprove) ? report.areasToImprove.slice(0, 3) : ['Continue practicing'];

      return report;
    } catch (error) {
      // Fallback report if JSON parsing fails
      console.error('Failed to parse final report:', error);
      const overallScore = Math.round(averageScore * 10);
      return {
        overallScore,
        strengths: ['Completed the interview', 'Provided answers to all questions'],
        areasToImprove: ['Continue practicing interview skills', 'Work on technical knowledge'],
        recommendation: overallScore >= 70 ? 'hire' : overallScore >= 50 ? 'maybe' : 'no'
      };
    }
  }

  /**
   * Get difficulty level description
   */
  private getDifficultyDescription(difficulty: DifficultyLevel): string {
    switch (difficulty) {
      case 'entry':
        return 'entry-level, suitable for fresh graduates or those with 0-2 years experience';
      case 'mid':
        return 'mid-level, suitable for professionals with 2-5 years experience';
      case 'senior':
        return 'senior-level, suitable for experienced professionals with 5+ years experience';
      default:
        return 'appropriate level';
    }
  }

  /**
   * Get interview session status (for debugging/monitoring)
   */
  async getInterviewStatus(interviewId: string): Promise<{
    exists: boolean;
    questionsAnswered: number;
    totalQuestions: number;
    isComplete: boolean;
  } | null> {
    const session = await this.getSession(interviewId);
    
    if (!session) {
      return null;
    }

    return {
      exists: true,
      questionsAnswered: session.answers.length,
      totalQuestions: session.questions.length,
      isComplete: session.currentQuestionIndex >= this.MAX_QUESTIONS
    };
  }
}
