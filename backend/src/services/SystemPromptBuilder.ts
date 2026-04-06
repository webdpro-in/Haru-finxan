/**
 * System Prompt Builder
 * 
 * Builds context-aware system prompts for Gemini API based on:
 * - Student profile and learning style
 * - Current topic and difficulty level
 * - Confusion signals and teaching adjustments
 * - Session context and history
 */

export interface StudentContext {
  studentId: string;
  name: string;
  grade: number;
  preferredLanguage: string;
  learningStyle?: 'visual' | 'auditory' | 'kinesthetic' | 'mixed';
  cognitiveLoadThreshold?: number;
  neurodiversityFlags?: Array<{
    type: string;
    accommodations: string[];
  }>;
}

export interface TopicContext {
  subject: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  prerequisites?: string[];
  currentMastery?: number;
}

export interface SessionContext {
  sessionId: string;
  duration: number;
  confusionCount: number;
  questionsAsked: number;
  topicsCovered: string[];
}

export interface TeachingMode {
  socraticMode?: boolean;
  analogySwitching?: boolean;
  examAnxietyMode?: boolean;
  sparringMode?: boolean;
}

export class SystemPromptBuilder {
  /**
   * Build a complete system prompt
   */
  static buildPrompt(
    studentContext: StudentContext,
    topicContext?: TopicContext,
    sessionContext?: SessionContext,
    teachingMode?: TeachingMode,
    confusionAdjustment?: string
  ): string {
    const sections: string[] = [];

    // Core identity
    sections.push(this.buildIdentitySection());

    // Student context
    sections.push(this.buildStudentSection(studentContext));

    // Topic context
    if (topicContext) {
      sections.push(this.buildTopicSection(topicContext));
    }

    // Session context
    if (sessionContext) {
      sections.push(this.buildSessionSection(sessionContext));
    }

    // Teaching mode
    if (teachingMode) {
      sections.push(this.buildTeachingModeSection(teachingMode));
    }

    // Confusion adjustment
    if (confusionAdjustment) {
      sections.push(this.buildConfusionSection(confusionAdjustment));
    }

    // Response guidelines
    sections.push(this.buildGuidelinesSection());

    return sections.join('\n\n');
  }

  /**
   * Build identity section
   */
  private static buildIdentitySection(): string {
    return `You are Haru, an AI teaching assistant designed to help students learn effectively.

Your core principles:
- Be patient, encouraging, and supportive
- Adapt to each student's learning style and pace
- Detect confusion early and adjust your teaching
- Use clear, age-appropriate language
- Celebrate progress and build confidence
- Make learning engaging and fun`;
  }

  /**
   * Build student context section
   */
  private static buildStudentSection(context: StudentContext): string {
    const lines: string[] = [
      `STUDENT PROFILE:`,
      `- Name: ${context.name}`,
      `- Grade: ${context.grade}`,
      `- Language: ${context.preferredLanguage}`,
    ];

    if (context.learningStyle) {
      lines.push(`- Learning Style: ${context.learningStyle}`);
      lines.push(this.getLearningStyleGuidance(context.learningStyle));
    }

    if (context.cognitiveLoadThreshold) {
      lines.push(`- Cognitive Load Threshold: ${context.cognitiveLoadThreshold}/100`);
      if (context.cognitiveLoadThreshold > 70) {
        lines.push('  ⚠️ Student is experiencing high cognitive load - simplify explanations');
      }
    }

    if (context.neurodiversityFlags && context.neurodiversityFlags.length > 0) {
      lines.push('\nACCOMMODATIONS:');
      for (const flag of context.neurodiversityFlags) {
        lines.push(`- ${flag.type}: ${flag.accommodations.join(', ')}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Build topic context section
   */
  private static buildTopicSection(context: TopicContext): string {
    const lines: string[] = [
      `CURRENT TOPIC:`,
      `- Subject: ${context.subject}`,
      `- Topic: ${context.topic}`,
      `- Difficulty: ${context.difficulty}`,
    ];

    if (context.currentMastery !== undefined) {
      lines.push(`- Current Mastery: ${context.currentMastery}%`);
      
      if (context.currentMastery < 50) {
        lines.push('  ⚠️ Student is struggling - use simpler explanations and more examples');
      } else if (context.currentMastery > 80) {
        lines.push('  ✓ Student has good understanding - can introduce advanced concepts');
      }
    }

    if (context.prerequisites && context.prerequisites.length > 0) {
      lines.push(`- Prerequisites: ${context.prerequisites.join(', ')}`);
    }

    return lines.join('\n');
  }

  /**
   * Build session context section
   */
  private static buildSessionSection(context: SessionContext): string {
    const lines: string[] = [
      `SESSION CONTEXT:`,
      `- Duration: ${Math.round(context.duration / 60000)} minutes`,
      `- Questions Asked: ${context.questionsAsked}`,
      `- Confusion Events: ${context.confusionCount}`,
    ];

    if (context.topicsCovered.length > 0) {
      lines.push(`- Topics Covered: ${context.topicsCovered.join(', ')}`);
    }

    if (context.confusionCount > 3) {
      lines.push('  ⚠️ High confusion detected - consider reviewing prerequisites');
    }

    return lines.join('\n');
  }

  /**
   * Build teaching mode section
   */
  private static buildTeachingModeSection(mode: TeachingMode): string {
    const lines: string[] = ['TEACHING MODE:'];

    if (mode.socraticMode) {
      lines.push(`- Socratic Mode: ACTIVE
  → Ask leading questions instead of giving direct answers
  → Guide student to discover solutions themselves
  → Provide hints after 3 unsuccessful attempts`);
    }

    if (mode.analogySwitching) {
      lines.push(`- Analogy Switching: ACTIVE
  → Use different analogies if student remains confused
  → Adapt examples to student's interests and background`);
    }

    if (mode.examAnxietyMode) {
      lines.push(`- Exam Anxiety Support: ACTIVE
  → Be extra encouraging and supportive
  → Break down topics into smaller, manageable pieces
  → Remind student of past successes
  → Provide calming techniques if needed`);
    }

    if (mode.sparringMode) {
      lines.push(`- AI Sparring Mode: ACTIVE
  → Challenge student's thinking with thoughtful counter-arguments
  → Encourage critical thinking and debate
  → Maintain respectful, constructive tone`);
    }

    return lines.join('\n');
  }

  /**
   * Build confusion adjustment section
   */
  private static buildConfusionSection(adjustment: string): string {
    return `CONFUSION DETECTED:\n${adjustment}`;
  }

  /**
   * Build response guidelines section
   */
  private static buildGuidelinesSection(): string {
    return `RESPONSE GUIDELINES:
- Keep responses concise and focused (2-3 paragraphs max)
- Use simple, clear language appropriate for the student's grade
- Include concrete examples and analogies
- Check understanding with questions
- Encourage questions and curiosity
- Celebrate effort and progress
- If explaining math, use clear step-by-step breakdowns
- If student is confused, simplify and rephrase
- Never make the student feel bad for not understanding`;
  }

  /**
   * Get learning style guidance
   */
  private static getLearningStyleGuidance(style: string): string {
    const guidance: Record<string, string> = {
      visual: '  → Use diagrams, charts, and visual examples',
      auditory: '  → Use verbal explanations and sound-based examples',
      kinesthetic: '  → Use hands-on examples and real-world applications',
      mixed: '  → Use a combination of visual, auditory, and practical examples',
    };

    return guidance[style] || '';
  }

  /**
   * Build a simple prompt for quick responses
   */
  static buildSimplePrompt(studentName: string, grade: number): string {
    return `You are Haru, an AI teaching assistant helping ${studentName}, a grade ${grade} student.

Be patient, encouraging, and supportive. Use clear, age-appropriate language.
Keep responses concise and focused. Celebrate progress and build confidence.`;
  }

  /**
   * Build a prompt for anonymous questions
   */
  static buildAnonymousPrompt(grade: number, subject: string): string {
    return `You are Haru, an AI teaching assistant answering an anonymous question from a grade ${grade} student about ${subject}.

The student asked anonymously because they may feel shy or uncertain. Be extra supportive and encouraging.
Make them feel safe asking questions. Use clear, simple language.`;
  }
}
