/**
 * Socratic Mode Service
 * 
 * Generates leading questions instead of direct answers to guide students
 * to discover solutions themselves. Implements Socratic teaching methodology
 * with attempt tracking and hint system.
 * 
 * Features:
 * - Leading question generation
 * - Complex problem breakdown into smaller questions
 * - Attempt tracking per student per question
 * - Hint system after 3 unsuccessful attempts
 * - Celebration of student discoveries
 * 
 * Requirements:
 * - REQ-2.5.1: Socratic Mode toggle for teachers/students
 * - REQ-2.5.2: Generate leading questions instead of direct answers
 * - REQ-2.5.3: Break complex problems into smaller questions
 * - REQ-2.5.4: Provide hints after 3 unsuccessful attempts
 * - REQ-2.5.5: Celebrate student discoveries
 */

export interface SocraticPromptOptions {
  studentName?: string;
  grade: number;
  topic: string;
  question: string;
  attemptCount?: number;
  previousResponses?: string[];
  conceptMastery?: number; // 0-100
}

export interface SocraticResponse {
  leadingQuestions: string[];
  hint?: string;
  shouldProvideHint: boolean;
  encouragement: string;
  isDiscoveryMoment: boolean;
}

export interface AttemptTracker {
  studentId: string;
  questionId: string;
  attemptCount: number;
  lastAttempt: Date;
  previousResponses: string[];
}

export class SocraticMode {
  // Maximum attempts before providing hint
  private static readonly MAX_ATTEMPTS_BEFORE_HINT = 3;

  // Celebration messages for student discoveries
  private static readonly CELEBRATION_MESSAGES = [
    "Excellent! You figured it out yourself! 🎉",
    "That's exactly right! You discovered the answer on your own! ⭐",
    "Brilliant thinking! You worked through that beautifully! 🌟",
    "Yes! You got it! I'm so proud of how you reasoned through that! 🎊",
    "Perfect! You didn't need me to tell you - you found the answer yourself! 💫"
  ];

  // Encouragement messages for attempts
  private static readonly ENCOURAGEMENT_MESSAGES = [
    "You're on the right track! Keep thinking...",
    "Good thinking! Let's explore this further...",
    "Interesting approach! What else can you consider?",
    "You're getting closer! Think about...",
    "That's a good start! Now consider..."
  ];

  /**
   * Generate Socratic prompt for Gemini API
   * Creates a system prompt that instructs the AI to use Socratic method
   * 
   * REQ-2.5.2: Generate leading questions instead of direct answers
   * REQ-2.5.3: Break complex problems into smaller questions
   * REQ-2.5.4: Provide hints after 3 unsuccessful attempts
   */
  static generateSocraticPrompt(options: SocraticPromptOptions): string {
    const {
      studentName = 'Student',
      grade,
      topic,
      question,
      attemptCount = 0,
      previousResponses = [],
      conceptMastery = 50
    } = options;

    const shouldProvideHint = attemptCount >= this.MAX_ATTEMPTS_BEFORE_HINT;

    let prompt = `You are Haru in Socratic Mode. Your goal is to guide ${studentName} (Grade ${grade}) to discover the answer to their question about ${topic} through leading questions.

CRITICAL RULES:
1. NEVER give the answer directly
2. Ask leading questions that help the student think through the problem
3. Break down complex problems into smaller, manageable questions
4. Build on what the student already knows
5. Guide them step-by-step toward the solution
${shouldProvideHint ? '6. After 3 attempts, you may provide a helpful hint (but still not the direct answer)' : ''}

STUDENT'S QUESTION: "${question}"

TEACHING APPROACH:
- Start with what the student already knows about the topic
- Ask questions that activate prior knowledge
- Use "What do you think...?" and "Why do you think...?" questions
- Break complex concepts into simpler components
- Encourage reasoning and critical thinking
- Celebrate when the student makes progress

GRADE LEVEL: ${grade}
- Use age-appropriate language
- Adjust complexity to grade level
- Reference concepts they should know at this grade

CONCEPT MASTERY: ${conceptMastery}%
${conceptMastery < 40 ? '- Student is struggling - use simpler questions and more scaffolding' : ''}
${conceptMastery >= 40 && conceptMastery < 70 ? '- Student has basic understanding - guide them to deeper insights' : ''}
${conceptMastery >= 70 ? '- Student has good grasp - challenge them with thought-provoking questions' : ''}
`;

    // Add context from previous attempts
    if (previousResponses.length > 0) {
      prompt += `\nPREVIOUS ATTEMPTS (${attemptCount}):\n`;
      previousResponses.slice(-3).forEach((response, index) => {
        prompt += `Attempt ${attemptCount - previousResponses.length + index + 1}: "${response}"\n`;
      });
      prompt += '\nBuild on their previous thinking. Acknowledge what they got right and guide them further.\n';
    }

    // Add hint guidance if needed
    if (shouldProvideHint) {
      prompt += `\nHINT GUIDANCE:
The student has tried ${attemptCount} times. You may now provide a helpful hint that points them in the right direction without giving away the answer. The hint should:
- Highlight a key concept they might be missing
- Suggest a different way to think about the problem
- Provide an analogy or example that illuminates the path
- Still require them to make the final connection themselves\n`;
    }

    prompt += `\nEXAMPLE SOCRATIC DIALOGUE:
Student: "What is photosynthesis?"
Haru: "Great question! Let's think about this together. First, what do plants need to survive?"
Student: "Water and sunlight?"
Haru: "Exactly! Now, what do you think plants do with that sunlight? Have you noticed anything about plants and light?"
Student: "They grow toward light?"
Haru: "Yes! They need light for something important. What do you think they might be making with the sunlight and water?"

RESPONSE FORMAT:
- Ask 1-2 leading questions (not more)
- Keep questions clear and focused
- Use encouraging, supportive tone
- If providing a hint, make it subtle and guiding
- Celebrate any progress the student makes

Now, respond to the student's question using the Socratic method:`;

    return prompt;
  }

  /**
   * Generate leading questions for a given topic and student question
   * Enhanced with curriculum-awareness and grade-level appropriateness
   * 
   * REQ-2.5.2: Generate leading questions instead of direct answers
   */
  static generateLeadingQuestions(
    topic: string,
    studentQuestion: string,
    grade: number,
    conceptMastery?: number
  ): string[] {
    const questions: string[] = [];
    const lowerQuestion = studentQuestion.toLowerCase();
    
    // Adjust question complexity based on grade level
    const isElementary = grade <= 5;
    const isMiddleSchool = grade >= 6 && grade <= 8;
    const isHighSchool = grade >= 9;

    // Pattern 1: "What is X?" questions - Definition seeking
    if (lowerQuestion.includes('what is') || lowerQuestion.includes('what are')) {
      if (isElementary) {
        questions.push(`Have you seen or heard about ${topic} before? Where?`);
        questions.push(`Can you think of something similar to ${topic}?`);
      } else if (isMiddleSchool) {
        questions.push(`What do you already know about ${topic}?`);
        questions.push(`Can you think of any examples or situations where ${topic} appears?`);
      } else {
        questions.push(`What concepts or ideas do you associate with ${topic}?`);
        questions.push(`How would you explain ${topic} to someone younger than you?`);
      }
    }
    // Pattern 2: "How does X work?" questions - Process understanding
    else if (lowerQuestion.includes('how does') || lowerQuestion.includes('how do') || 
             lowerQuestion.includes('how to')) {
      if (isElementary) {
        questions.push(`What do you think happens first in ${topic}?`);
        questions.push(`What things are needed for ${topic} to work?`);
      } else if (isMiddleSchool) {
        questions.push(`What parts or components do you think are involved in ${topic}?`);
        questions.push(`Can you describe the steps you think might happen?`);
      } else {
        questions.push(`What are the key mechanisms or processes involved in ${topic}?`);
        questions.push(`How do you think the different components interact?`);
      }
    }
    // Pattern 3: "Why" questions - Reasoning and causation
    else if (lowerQuestion.includes('why')) {
      if (isElementary) {
        questions.push(`What do you think is the reason?`);
        questions.push(`Have you noticed this happening before?`);
      } else if (isMiddleSchool) {
        questions.push(`What factors do you think might cause this?`);
        questions.push(`Can you think of a similar situation and why it happens?`);
      } else {
        questions.push(`What underlying principles might explain this?`);
        questions.push(`How would you test your hypothesis about why this occurs?`);
      }
    }
    // Pattern 4: "Solve" or "Calculate" questions - Problem-solving
    else if (lowerQuestion.includes('solve') || lowerQuestion.includes('calculate') || 
             lowerQuestion.includes('find')) {
      if (isElementary) {
        questions.push(`What information do we have in the problem?`);
        questions.push(`What are we trying to find out?`);
      } else if (isMiddleSchool) {
        questions.push(`What information is given, and what do we need to find?`);
        questions.push(`What formula or method do you think might help?`);
      } else {
        questions.push(`What are the known variables and what are we solving for?`);
        questions.push(`What mathematical relationships or principles apply here?`);
      }
    }
    // Default pattern - General exploration
    else {
      if (isElementary) {
        questions.push(`What do you think about ${topic}?`);
        questions.push(`Can you tell me anything you know about this?`);
      } else if (isMiddleSchool) {
        questions.push(`Let's break this down. What do you already know about ${topic}?`);
        questions.push(`What's the first thing that comes to mind when you think about this?`);
      } else {
        questions.push(`What prior knowledge can you apply to understand ${topic}?`);
        questions.push(`How would you approach analyzing this concept?`);
      }
    }

    // Add mastery-based follow-up question if mastery level is provided
    if (conceptMastery !== undefined) {
      if (conceptMastery < 40) {
        // Low mastery - encourage basic recall
        questions.push(`Let's start simple. What's one thing you remember about ${topic}?`);
      } else if (conceptMastery >= 40 && conceptMastery < 70) {
        // Medium mastery - encourage deeper thinking
        questions.push(`You have some understanding. How does ${topic} connect to what you've learned before?`);
      } else {
        // High mastery - encourage critical thinking
        questions.push(`You know this well. What's a challenging aspect of ${topic} you'd like to explore?`);
      }
    }

    return questions;
  }

  /**
   * Generate a hint after multiple unsuccessful attempts
   * 
   * REQ-2.5.4: Provide hints after 3 unsuccessful attempts
   */
  static generateHint(
    topic: string,
    question: string,
    attemptCount: number,
    previousResponses: string[]
  ): string {
    if (attemptCount < this.MAX_ATTEMPTS_BEFORE_HINT) {
      return '';
    }

    // Generic hint structure - in production, this would be enhanced by Gemini API
    const hints = [
      `Here's a hint: Think about the key concept of ${topic}. What's the main idea?`,
      `Let me give you a clue: Consider how ${topic} relates to what you already know.`,
      `Hint: Try thinking about ${topic} from a different angle. What if you started with...?`,
      `Here's something to consider: ${topic} often involves... What does that tell you?`
    ];

    return hints[Math.min(attemptCount - this.MAX_ATTEMPTS_BEFORE_HINT, hints.length - 1)];
  }

  /**
   * Generate encouragement message based on attempt count
   * 
   * REQ-2.5.5: Celebrate student discoveries
   */
  static generateEncouragement(attemptCount: number, isCorrect: boolean = false): string {
    if (isCorrect) {
      // Celebration for correct answer
      return this.CELEBRATION_MESSAGES[
        Math.floor(Math.random() * this.CELEBRATION_MESSAGES.length)
      ];
    }

    // Encouragement for continued attempts
    return this.ENCOURAGEMENT_MESSAGES[
      Math.min(attemptCount, this.ENCOURAGEMENT_MESSAGES.length - 1)
    ];
  }

  /**
   * Check if student's response indicates they've discovered the answer
   * This is a simple heuristic - in production, would use AI to evaluate
   */
  static isDiscoveryMoment(
    studentResponse: string,
    expectedConcepts: string[]
  ): boolean {
    const lowerResponse = studentResponse.toLowerCase();
    
    // Check if response contains key concepts
    const conceptsFound = expectedConcepts.filter(concept =>
      lowerResponse.includes(concept.toLowerCase())
    );

    // If student mentions most key concepts, it's likely a discovery moment
    return conceptsFound.length >= Math.ceil(expectedConcepts.length * 0.6);
  }

  /**
   * Break down a complex problem into smaller questions
   * 
   * REQ-2.5.3: Break complex problems into smaller questions
   */
  static breakDownProblem(
    problem: string,
    grade: number,
    topic: string
  ): string[] {
    const questions: string[] = [];

    // Step 1: Identify what we know
    questions.push("Let's start with what we know. What information is given in the problem?");

    // Step 2: Identify what we need to find
    questions.push("Good! Now, what are we trying to find or solve for?");

    // Step 3: Connect knowledge to goal
    questions.push("How do you think the information we have can help us find what we're looking for?");

    // Step 4: Plan the approach
    questions.push("What steps do you think we need to take to solve this?");

    // Step 5: Execute and verify
    questions.push("Let's try that approach. What would be the first calculation or step?");

    return questions;
  }

  /**
   * Track student attempts for a question
   * This would integrate with a database in production
   */
  static trackAttempt(
    studentId: string,
    questionId: string,
    response: string,
    existingTracker?: AttemptTracker
  ): AttemptTracker {
    if (existingTracker) {
      return {
        ...existingTracker,
        attemptCount: existingTracker.attemptCount + 1,
        lastAttempt: new Date(),
        previousResponses: [...existingTracker.previousResponses, response]
      };
    }

    return {
      studentId,
      questionId,
      attemptCount: 1,
      lastAttempt: new Date(),
      previousResponses: [response]
    };
  }

  /**
   * Determine if hint should be provided based on attempt count
   * 
   * REQ-2.5.4: Provide hints after 3 unsuccessful attempts
   */
  static shouldProvideHint(attemptCount: number): boolean {
    return attemptCount >= this.MAX_ATTEMPTS_BEFORE_HINT;
  }

  /**
   * Generate a complete Socratic response
   * Combines all elements: questions, hints, encouragement
   */
  static generateSocraticResponse(options: SocraticPromptOptions): SocraticResponse {
    const {
      topic,
      question,
      attemptCount = 0,
      previousResponses = [],
      grade,
      conceptMastery
    } = options;

    const leadingQuestions = this.generateLeadingQuestions(topic, question, grade, conceptMastery);
    const shouldProvideHint = this.shouldProvideHint(attemptCount);
    const hint = shouldProvideHint 
      ? this.generateHint(topic, question, attemptCount, previousResponses)
      : undefined;
    const encouragement = this.generateEncouragement(attemptCount);

    // Check if this might be a discovery moment (simplified heuristic)
    const isDiscoveryMoment = previousResponses.length > 0 && 
                              previousResponses[previousResponses.length - 1].length > 20;

    return {
      leadingQuestions,
      hint,
      shouldProvideHint,
      encouragement,
      isDiscoveryMoment
    };
  }

  /**
   * Get Socratic mode configuration for system prompt builder
   * This integrates with the existing SystemPromptBuilder
   */
  static getSocraticModeConfig(): {
    socraticMode: boolean;
    description: string;
  } {
    return {
      socraticMode: true,
      description: 'Ask leading questions instead of giving direct answers. Guide student to discover solutions themselves. Provide hints after 3 unsuccessful attempts.'
    };
  }
}
