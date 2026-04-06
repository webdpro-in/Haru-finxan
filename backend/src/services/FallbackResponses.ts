/**
 * Fallback Response Generator
 * 
 * Provides graceful fallback responses when Gemini API fails.
 * Ensures students always receive a helpful response even during outages.
 */

export interface FallbackContext {
  studentName?: string;
  grade?: number;
  topic?: string;
  errorType?: 'timeout' | 'rate_limit' | 'api_error' | 'network_error';
}

export class FallbackResponses {
  /**
   * Get a fallback response based on context
   */
  static getFallbackResponse(context: FallbackContext = {}): string {
    const { studentName, grade, topic, errorType } = context;

    // Select appropriate fallback based on error type
    switch (errorType) {
      case 'timeout':
        return this.getTimeoutResponse(studentName);
      case 'rate_limit':
        return this.getRateLimitResponse(studentName);
      case 'network_error':
        return this.getNetworkErrorResponse(studentName);
      default:
        return this.getGenericFallback(studentName, topic);
    }
  }

  /**
   * Get timeout fallback response
   */
  private static getTimeoutResponse(studentName?: string): string {
    const name = studentName || 'there';
    return `Hi ${name}! I'm taking a bit longer than usual to respond. Let me try to help you quickly:

I'm here to assist you with your learning. Could you please:
1. Rephrase your question in simpler terms
2. Break it down into smaller parts
3. Or try asking about a specific aspect

I'll do my best to help you right away! 🌟`;
  }

  /**
   * Get rate limit fallback response
   */
  private static getRateLimitResponse(studentName?: string): string {
    const name = studentName || 'there';
    return `Hi ${name}! I'm getting a lot of questions right now and need a moment to catch up.

While you wait, here are some things you can do:
1. Review your notes on this topic
2. Try working through an example problem
3. Think about what specific part is confusing you

I'll be ready to help you in just a moment! Thank you for your patience. 💙`;
  }

  /**
   * Get network error fallback response
   */
  private static getNetworkErrorResponse(studentName?: string): string {
    const name = studentName || 'there';
    return `Hi ${name}! I'm having trouble connecting right now.

Don't worry - your learning doesn't have to stop! Here's what you can do:
1. Check your internet connection
2. Try refreshing the page
3. If the problem continues, you can still review your notes or practice problems

I'll be back online as soon as possible! 🌈`;
  }

  /**
   * Get generic fallback response
   */
  private static getGenericFallback(studentName?: string, topic?: string): string {
    const name = studentName || 'there';
    const topicText = topic ? ` about ${topic}` : '';

    return `Hi ${name}! I'm having a small technical issue${topicText}, but I'm still here to help!

Let me give you some general guidance:
1. Break down the problem into smaller steps
2. Review the basics of this topic
3. Try working through a simple example first
4. Don't hesitate to ask your teacher for help

Remember: It's okay to ask questions and take your time learning. You're doing great! ⭐`;
  }

  /**
   * Get helpful tips for common topics
   */
  static getTopicTips(topic: string, grade: number): string {
    const tips = this.getTopicSpecificTips(topic.toLowerCase(), grade);
    
    if (tips) {
      return `Here are some quick tips about ${topic}:\n\n${tips}`;
    }

    return this.getGenericLearningTips(grade);
  }

  /**
   * Get topic-specific tips
   */
  private static getTopicSpecificTips(topic: string, grade: number): string | null {
    // Math topics
    if (topic.includes('fraction')) {
      return `Fractions Tips:
1. Think of fractions as parts of a whole (like slices of pizza!)
2. The bottom number (denominator) tells you how many equal parts
3. The top number (numerator) tells you how many parts you have
4. Practice with visual diagrams to understand better`;
    }

    if (topic.includes('algebra') || topic.includes('equation')) {
      return `Algebra Tips:
1. Think of equations like a balanced scale
2. What you do to one side, do to the other
3. Work step by step, don't rush
4. Check your answer by substituting back`;
    }

    if (topic.includes('geometry') || topic.includes('triangle') || topic.includes('circle')) {
      return `Geometry Tips:
1. Draw diagrams to visualize the problem
2. Label all known measurements
3. Look for patterns and relationships
4. Remember your formulas (area, perimeter, etc.)`;
    }

    // Science topics
    if (topic.includes('photosynthesis')) {
      return `Photosynthesis Tips:
1. Remember: Plants make their own food using sunlight
2. Key ingredients: Sunlight + Water + Carbon Dioxide
3. Products: Glucose (food) + Oxygen
4. Think of it as the plant's kitchen!`;
    }

    if (topic.includes('force') || topic.includes('motion')) {
      return `Force & Motion Tips:
1. Force is a push or pull
2. Newton's laws help explain how things move
3. Think about everyday examples (pushing a door, riding a bike)
4. Draw diagrams showing force directions`;
    }

    return null;
  }

  /**
   * Get generic learning tips
   */
  private static getGenericLearningTips(grade: number): string {
    return `General Learning Tips:
1. Break complex problems into smaller steps
2. Draw diagrams or pictures to visualize
3. Practice with examples
4. Don't be afraid to ask questions
5. Review basics if you're stuck
6. Take breaks when needed

Remember: Learning takes time and practice. You're doing great! 🌟`;
  }

  /**
   * Get encouragement message
   */
  static getEncouragementMessage(): string {
    const messages = [
      "You're doing great! Keep up the good work! 🌟",
      "Every question you ask helps you learn more! 💡",
      "I believe in you! You can do this! 💪",
      "Learning is a journey - you're making progress! 🚀",
      "Great job staying curious and asking questions! 🌈",
      "You're on the right track! Keep going! ⭐",
      "I'm proud of your effort! Learning takes courage! 💙",
      "Every mistake is a step toward understanding! 🎯",
    ];

    return messages[Math.floor(Math.random() * messages.length)];
  }

  /**
   * Get error recovery suggestion
   */
  static getRecoverySuggestion(errorType?: string): string {
    switch (errorType) {
      case 'timeout':
        return 'Try asking a simpler question or breaking your question into parts.';
      case 'rate_limit':
        return 'Please wait a moment and try again. I\'ll be ready soon!';
      case 'network_error':
        return 'Check your internet connection and try refreshing the page.';
      default:
        return 'Try refreshing the page or asking your question again in a moment.';
    }
  }
}
