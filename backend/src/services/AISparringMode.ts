/**
 * AI Sparring Mode Service
 * 
 * Generates thoughtful counter-arguments to challenge students' thinking
 * and help them develop critical thinking skills through intellectual debate.
 * 
 * Features:
 * - Counter-argument generation
 * - Respectful but intellectually rigorous tone
 * - Focus on critical thinking, not being right
 * - Topic-aware argumentation
 * - Acknowledgment of student's points
 * 
 * Requirements:
 * - REQ-2.10.1: System SHALL provide AI Sparring Mode for intellectual challenge
 * - REQ-2.10.2: System SHALL generate thoughtful counter-arguments
 * - REQ-2.10.3: System SHALL challenge students to defend positions
 * - REQ-2.10.4: System SHALL maintain respectful tone
 * - REQ-2.10.5: System SHALL focus on critical thinking, not being right
 */

import { GeminiClient, GeminiResponse } from './GeminiClient.js';

export interface CounterArgumentOptions {
  studentArgument: string;
  topic: string;
  studentName?: string;
  grade?: number;
  previousArguments?: string[];
  debateContext?: string;
}

export interface CounterArgumentResponse {
  counterArgument: string;
  acknowledgment: string;
  challenge: string;
  encouragement: string;
}

export class AISparringMode {
  private geminiClient: GeminiClient;

  constructor(geminiClient: GeminiClient) {
    this.geminiClient = geminiClient;
  }

  /**
   * Generate a counter-argument to challenge student's thinking
   * 
   * REQ-2.10.2: System SHALL generate thoughtful counter-arguments
   * REQ-2.10.3: System SHALL challenge students to defend positions
   * REQ-2.10.4: System SHALL maintain respectful tone
   * REQ-2.10.5: System SHALL focus on critical thinking, not being right
   */
  async generateCounterArgument(options: CounterArgumentOptions): Promise<string> {
    const {
      studentArgument,
      topic,
      studentName = 'Student',
      grade,
      previousArguments = [],
      debateContext
    } = options;

    const systemPrompt = this.buildSparringPrompt(
      studentArgument,
      topic,
      studentName,
      grade,
      previousArguments,
      debateContext
    );

    try {
      const response: GeminiResponse = await this.geminiClient.generateResponse(
        studentArgument,
        systemPrompt,
        []
      );

      return response.text;
    } catch (error) {
      console.error('Error generating counter-argument:', error);
      // Fallback response
      return this.generateFallbackCounterArgument(studentArgument, topic);
    }
  }

  /**
   * Build the system prompt for counter-argument generation
   * 
   * REQ-2.10.4: System SHALL maintain respectful tone
   * REQ-2.10.5: System SHALL focus on critical thinking, not being right
   */
  private buildSparringPrompt(
    studentArgument: string,
    topic: string,
    studentName: string,
    grade?: number,
    previousArguments?: string[],
    debateContext?: string
  ): string {
    let prompt = `You are Haru in AI Sparring Mode. The student has made an argument about ${topic}. Your job is to engage them in intellectual sparring to develop their critical thinking skills.

CRITICAL RULES:
1. Acknowledge their point respectfully - show you understand their perspective
2. Present a thoughtful counter-argument that challenges their thinking
3. Challenge them to defend their position with follow-up questions
4. Be respectful but intellectually rigorous
5. This is NOT about being right - it's about helping them think critically
6. Focus on strengthening their reasoning, not winning the debate
7. Encourage them to consider alternative perspectives

TOPIC: ${topic}
STUDENT'S ARGUMENT: "${studentArgument}"

YOUR APPROACH:
- Start by acknowledging what's valid or interesting in their argument
- Present a counter-perspective that makes them reconsider
- Use evidence, logic, or alternative viewpoints
- Ask probing questions that challenge assumptions
- Maintain a tone of intellectual curiosity, not confrontation
- End with an invitation to defend or refine their position

TONE GUIDELINES:
✓ "That's an interesting point about X. However, have you considered..."
✓ "I see where you're coming from. Let me challenge that idea..."
✓ "You make a valid observation. But what if we look at it from..."
✗ "You're wrong because..."
✗ "That doesn't make sense..."
✗ "Actually, the correct answer is..."

`;

    // Add grade-level context if provided
    if (grade) {
      prompt += `GRADE LEVEL: ${grade}
- Use age-appropriate language and examples
- Adjust complexity of counter-arguments to their level
- Reference concepts they should understand at this grade

`;
    }

    // Add debate context if provided
    if (debateContext) {
      prompt += `DEBATE CONTEXT: ${debateContext}

`;
    }

    // Add previous arguments for continuity
    if (previousArguments && previousArguments.length > 0) {
      prompt += `PREVIOUS ARGUMENTS IN THIS DEBATE:
${previousArguments.slice(-3).map((arg, i) => `${i + 1}. "${arg}"`).join('\n')}

Build on the ongoing debate. Reference earlier points if relevant.

`;
    }

    prompt += `EXAMPLE SPARRING DIALOGUE:
Student: "I think homework is useless because we already learn everything in class."
Haru: "I hear you - it can feel redundant when you've already covered material in class. That's a fair observation. But let me challenge that idea: what if homework serves a different purpose than initial learning? Consider this: when you practice a sport or instrument, you don't just learn the technique once and stop. You practice repeatedly. Could homework be serving a similar function for your brain? What's your take on that comparison?"

RESPONSE FORMAT:
1. Acknowledge their point (1-2 sentences)
2. Present your counter-argument (2-3 sentences with reasoning)
3. Challenge them with a thought-provoking question
4. Keep it conversational and engaging

Now, respond to ${studentName}'s argument:`;

    return prompt;
  }

  /**
   * Generate a structured counter-argument response with separate components
   * 
   * REQ-2.10.2: System SHALL generate thoughtful counter-arguments
   */
  async generateStructuredCounterArgument(
    options: CounterArgumentOptions
  ): Promise<CounterArgumentResponse> {
    const fullResponse = await this.generateCounterArgument(options);

    // Parse the response into components (simplified parsing)
    // In production, this could use more sophisticated NLP or structured prompts
    const lines = fullResponse.split('\n').filter(line => line.trim());
    
    return {
      counterArgument: fullResponse,
      acknowledgment: lines[0] || "I understand your perspective.",
      challenge: lines.slice(1, -1).join(' ') || "Let me offer a different viewpoint.",
      encouragement: lines[lines.length - 1] || "What do you think about this perspective?"
    };
  }

  /**
   * Generate fallback counter-argument when API fails
   * 
   * REQ-2.10.4: System SHALL maintain respectful tone
   */
  private generateFallbackCounterArgument(studentArgument: string, topic: string): string {
    const fallbacks = [
      `That's an interesting perspective on ${topic}. Let me challenge that idea: have you considered the opposite viewpoint? What evidence might support a different conclusion? I'd love to hear your thoughts on the counterarguments.`,
      
      `I see where you're coming from with your argument about ${topic}. However, let's explore an alternative angle. What if we looked at this from a different perspective? Can you think of any situations where your argument might not hold true?`,
      
      `You make a valid point about ${topic}. But let me play devil's advocate for a moment. What assumptions are you making in your argument? How would you respond to someone who disagrees with those assumptions?`,
      
      `That's a thoughtful argument about ${topic}. Now, let me challenge you to think deeper. What are the potential weaknesses in this position? How would you defend against the strongest counter-argument you can imagine?`
    ];

    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }

  /**
   * Validate if a response is a genuine counter-argument
   * Helps ensure quality of generated responses
   */
  static isValidCounterArgument(response: string): boolean {
    // Check minimum length
    if (response.length < 50) {
      return false;
    }

    // Check for key sparring indicators
    const sparringIndicators = [
      'however',
      'but',
      'consider',
      'what if',
      'alternative',
      'challenge',
      'perspective',
      'think about',
      'on the other hand'
    ];

    const lowerResponse = response.toLowerCase();
    const hasIndicator = sparringIndicators.some(indicator => 
      lowerResponse.includes(indicator)
    );

    return hasIndicator;
  }

  /**
   * Get AI Sparring Mode configuration for system prompt builder
   * This integrates with the existing SystemPromptBuilder
   */
  static getSparringModeConfig(): {
    sparringMode: boolean;
    description: string;
  } {
    return {
      sparringMode: true,
      description: 'Generate thoughtful counter-arguments to challenge student thinking. Maintain respectful tone while being intellectually rigorous. Focus on critical thinking development, not being right.'
    };
  }
}
