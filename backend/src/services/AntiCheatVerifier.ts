/**
 * Anti-Cheat Learning Verifier Service
 * 
 * Generates follow-up questions to verify student understanding and prevent
 * answer copying. Tests concepts from different angles requiring application.
 * 
 * Features:
 * - Follow-up question generation
 * - Answer evaluation against key points
 * - Verification confidence calculation
 * - Understanding verification (confidence > 0.6)
 * 
 * Requirements:
 * - REQ-4.4.1: System SHALL generate follow-up questions to verify understanding
 * - REQ-4.4.2: System SHALL test same concept from different angle
 * - REQ-4.4.3: System SHALL require application, not just recall
 * - REQ-4.4.4: System SHALL evaluate follow-up answers against expected key points
 * - REQ-4.4.5: System SHALL calculate verification confidence (0-1)
 * - REQ-4.4.6: System SHALL mark understanding as verified when confidence >0.6
 */

import { GeminiClient, GeminiResponse } from './GeminiClient.js';

export interface VerificationOptions {
  studentId: string;
  originalQuestion: string;
  studentAnswer: string;
  topic?: string;
  grade?: number;
}

export interface FollowUpQuestion {
  question: string;
  expectedKeyPoints: string[];
  concept: string;
}

export interface VerificationResult {
  verified: boolean;
  confidence: number;
  followUpQuestion?: string;
  expectedKeyPoints?: string[];
  matchedPoints?: string[];
  missingPoints?: string[];
}

export interface FollowUpEvaluation {
  verified: boolean;
  confidence: number;
  matchedPoints: string[];
  missingPoints: string[];
  feedback: string;
}

export class AntiCheatVerifier {
  private geminiClient: GeminiClient;
  private static readonly VERIFICATION_THRESHOLD = 0.6;

  constructor(geminiClient: GeminiClient) {
    this.geminiClient = geminiClient;
  }

  /**
   * Verify student understanding by generating a follow-up question
   * 
   * REQ-4.4.1: System SHALL generate follow-up questions to verify understanding
   * REQ-4.4.2: System SHALL test same concept from different angle
   * REQ-4.4.3: System SHALL require application, not just recall
   */
  async verifyUnderstanding(options: VerificationOptions): Promise<VerificationResult> {
    const { studentId, originalQuestion, studentAnswer, topic, grade } = options;

    try {
      // Generate follow-up question using Gemini
      const followUp = await this.generateFollowUpQuestion(
        originalQuestion,
        studentAnswer,
        topic,
        grade
      );

      return {
        verified: false, // Will be verified after student answers follow-up
        confidence: 0,
        followUpQuestion: followUp.question,
        expectedKeyPoints: followUp.expectedKeyPoints
      };
    } catch (error) {
      console.error('Error generating follow-up question:', error);
      
      // Fallback to simple follow-up
      const fallbackFollowUp = this.generateFallbackFollowUp(originalQuestion, topic);
      
      return {
        verified: false,
        confidence: 0,
        followUpQuestion: fallbackFollowUp.question,
        expectedKeyPoints: fallbackFollowUp.expectedKeyPoints
      };
    }
  }

  /**
   * Generate follow-up question that tests understanding from different angle
   * 
   * REQ-4.4.1: System SHALL generate follow-up questions to verify understanding
   * REQ-4.4.2: System SHALL test same concept from different angle
   * REQ-4.4.3: System SHALL require application, not just recall
   */
  private async generateFollowUpQuestion(
    originalQuestion: string,
    studentAnswer: string,
    topic?: string,
    grade?: number
  ): Promise<FollowUpQuestion> {
    const systemPrompt = this.buildFollowUpPrompt(
      originalQuestion,
      studentAnswer,
      topic,
      grade
    );

    const response: GeminiResponse = await this.geminiClient.generateResponse(
      'Generate follow-up question',
      systemPrompt,
      []
    );

    // Parse JSON response
    try {
      const parsed = JSON.parse(response.text);
      return {
        question: parsed.followUpQuestion,
        expectedKeyPoints: parsed.expectedKeyPoints || [],
        concept: parsed.concept || topic || 'concept'
      };
    } catch (parseError) {
      // If JSON parsing fails, extract from text
      return this.extractFollowUpFromText(response.text, topic);
    }
  }

  /**
   * Build system prompt for follow-up question generation
   * 
   * REQ-4.4.2: System SHALL test same concept from different angle
   * REQ-4.4.3: System SHALL require application, not just recall
   */
  private buildFollowUpPrompt(
    originalQuestion: string,
    studentAnswer: string,
    topic?: string,
    grade?: number
  ): string {
    let prompt = `You are an anti-cheat learning verifier. A student has answered a question, and you need to verify they truly understand the concept (not just copied the answer).

ORIGINAL QUESTION: "${originalQuestion}"
STUDENT'S ANSWER: "${studentAnswer}"
${topic ? `TOPIC: ${topic}` : ''}
${grade ? `GRADE LEVEL: ${grade}` : ''}

YOUR TASK:
Generate a follow-up question that verifies genuine understanding. The follow-up question MUST:

1. Test the SAME CONCEPT from a DIFFERENT ANGLE
   - Don't just rephrase the original question
   - Approach the concept from a new perspective
   - Use a different context or scenario

2. Require APPLICATION, not just RECALL
   - Student must apply the concept to a new situation
   - Cannot be answered by simply repeating memorized information
   - Requires thinking and reasoning, not just memory

3. Be at the SAME DIFFICULTY LEVEL
   - Not easier (too obvious they understand)
   - Not harder (unfair verification)
   - Appropriate for the grade level

4. Be SPECIFIC and CLEAR
   - Unambiguous what is being asked
   - Clear success criteria
   - Focused on one key aspect of understanding

EXAMPLES OF GOOD FOLLOW-UP QUESTIONS:

Original: "What is photosynthesis?"
Answer: "Process where plants make food using sunlight"
Follow-up: "If you put a plant in a dark closet for a week, what would happen to it and why?"
(Tests same concept - photosynthesis needs light - but requires application to new scenario)

Original: "What is 5 × 7?"
Answer: "35"
Follow-up: "You have 5 bags with 7 apples each. If you eat 3 apples, how many are left?"
(Tests multiplication understanding through word problem application)

Original: "What causes seasons?"
Answer: "Earth's tilt as it orbits the sun"
Follow-up: "Why is it summer in Australia when it's winter in Canada?"
(Tests understanding of tilt concept applied to real-world observation)

RESPONSE FORMAT:
Return ONLY valid JSON in this exact format:
{
  "followUpQuestion": "Your follow-up question here",
  "expectedKeyPoints": ["key point 1", "key point 2", "key point 3"],
  "concept": "core concept being tested"
}

The expectedKeyPoints should be 3-5 key concepts or phrases that a correct answer should contain.

Generate the follow-up question now:`;

    return prompt;
  }

  /**
   * Evaluate student's follow-up answer against expected key points
   * 
   * REQ-4.4.4: System SHALL evaluate follow-up answers against expected key points
   * REQ-4.4.5: System SHALL calculate verification confidence (0-1)
   * REQ-4.4.6: System SHALL mark understanding as verified when confidence >0.6
   */
  async evaluateFollowUp(
    followUpAnswer: string,
    expectedKeyPoints: string[]
  ): Promise<FollowUpEvaluation> {
    // Normalize answer for comparison
    const normalizedAnswer = followUpAnswer.toLowerCase().trim();
    
    // Check which key points are present in the answer
    const matchedPoints: string[] = [];
    const missingPoints: string[] = [];

    for (const keyPoint of expectedKeyPoints) {
      const normalizedKeyPoint = keyPoint.toLowerCase().trim();
      
      // Check for exact match or semantic similarity
      if (this.containsKeyPoint(normalizedAnswer, normalizedKeyPoint)) {
        matchedPoints.push(keyPoint);
      } else {
        missingPoints.push(keyPoint);
      }
    }

    // Calculate confidence as ratio of matched points
    const confidence = expectedKeyPoints.length > 0
      ? matchedPoints.length / expectedKeyPoints.length
      : 0;

    // Verify if confidence exceeds threshold
    const verified = confidence > AntiCheatVerifier.VERIFICATION_THRESHOLD;

    // Generate feedback
    const feedback = this.generateFeedback(verified, confidence, matchedPoints, missingPoints);

    return {
      verified,
      confidence,
      matchedPoints,
      missingPoints,
      feedback
    };
  }

  /**
   * Check if answer contains a key point (with fuzzy matching)
   */
  private containsKeyPoint(answer: string, keyPoint: string): boolean {
    // Direct substring match
    if (answer.includes(keyPoint)) {
      return true;
    }

    // Check for individual words from key point (at least 50% match)
    const keyWords = keyPoint.split(/\s+/).filter(word => word.length > 2);
    if (keyWords.length === 0) {
      return answer.includes(keyPoint);
    }

    const matchedWords = keyWords.filter(word => answer.includes(word));
    const matchRatio = matchedWords.length / keyWords.length;

    return matchRatio >= 0.5;
  }

  /**
   * Generate feedback based on evaluation results
   */
  private generateFeedback(
    verified: boolean,
    confidence: number,
    matchedPoints: string[],
    missingPoints: string[]
  ): string {
    if (verified) {
      if (confidence >= 0.9) {
        return "Excellent! Your answer demonstrates strong understanding of the concept. ✓";
      } else if (confidence >= 0.7) {
        return "Good work! You've shown solid understanding. Keep it up! ✓";
      } else {
        return "You've demonstrated basic understanding. Consider exploring the concept further. ✓";
      }
    } else {
      if (confidence >= 0.4) {
        return `You're on the right track, but let's review some key points: ${missingPoints.slice(0, 2).join(', ')}`;
      } else if (confidence > 0) {
        return `I see you have some understanding, but there are important concepts to review. Focus on: ${missingPoints.slice(0, 2).join(', ')}`;
      } else {
        return "Let's review this concept together. It seems there might be some confusion.";
      }
    }
  }

  /**
   * Extract follow-up question from text response (fallback for non-JSON)
   */
  private extractFollowUpFromText(text: string, topic?: string): FollowUpQuestion {
    // Try to find question in text
    const questionMatch = text.match(/"followUpQuestion":\s*"([^"]+)"/);
    const question = questionMatch ? questionMatch[1] : text.split('\n')[0];

    // Try to extract key points
    const keyPointsMatch = text.match(/"expectedKeyPoints":\s*\[([^\]]+)\]/);
    let expectedKeyPoints: string[] = [];
    
    if (keyPointsMatch) {
      expectedKeyPoints = keyPointsMatch[1]
        .split(',')
        .map(point => point.trim().replace(/"/g, ''));
    }

    return {
      question,
      expectedKeyPoints,
      concept: topic || 'concept'
    };
  }

  /**
   * Generate fallback follow-up question when API fails
   */
  private generateFallbackFollowUp(
    originalQuestion: string,
    topic?: string
  ): FollowUpQuestion {
    const topicStr = topic || 'this concept';
    
    return {
      question: `Can you explain how ${topicStr} would apply in a different situation? Give me a specific example.`,
      expectedKeyPoints: [
        'specific example',
        'application of concept',
        'explanation of reasoning'
      ],
      concept: topicStr
    };
  }

  /**
   * Get verification threshold
   */
  static getVerificationThreshold(): number {
    return AntiCheatVerifier.VERIFICATION_THRESHOLD;
  }

  /**
   * Validate if a follow-up question is appropriate
   */
  static isValidFollowUpQuestion(question: string): boolean {
    // Check minimum length
    if (question.length < 15) {
      return false;
    }

    // Check for application/reasoning indicators
    const applicationIndicators = [
      'how',
      'why',
      'what if',
      'apply',
      'example',
      'situation',
      'scenario',
      'would',
      'could',
      'explain',
      'describe',
      'give',
      'can you'
    ];

    const lowerQuestion = question.toLowerCase();
    const hasIndicator = applicationIndicators.some(indicator =>
      lowerQuestion.includes(indicator)
    );

    return hasIndicator;
  }
}
