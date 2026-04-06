/**
 * Confusion Detector Service
 * Analyzes student responses to detect confusion, hesitation, and understanding gaps
 * 
 * Detection methods:
 * 1. Text analysis: Question patterns, uncertainty words
 * 2. Interaction patterns: Repeated questions, long pauses
 * 3. Response quality: Incomplete answers, off-topic responses
 * 4. Voice metrics: Pause count, filler words, hesitation
 * 5. Message length analysis
 */

export interface ConfusionSignal {
  type: 'hesitation' | 'repetition' | 'uncertainty' | 'off-topic' | 'incomplete';
  confidence: number; // 0-1
  trigger: string; // What caused the confusion
  suggestion: string; // How to address it
}

export interface VoiceMetrics {
  pauseCount: number;
  fillerWordCount: number;
  averagePauseDuration: number; // milliseconds
  speechRate: number; // words per minute
  hesitationScore: number; // 0-1
}

export class ConfusionDetector {
  // Words that indicate uncertainty
  private static readonly UNCERTAINTY_WORDS = [
    'maybe', 'perhaps', 'i think', 'not sure', 'confused', 'don\'t understand',
    'what does', 'what is', 'how do', 'why does', 'can you explain',
    'i don\'t get', 'lost', 'unclear', 'complicated', 'difficult', 'unsure',
    'kind of', 'sort of', 'i guess', 'probably', 'might be',
  ];

  // Filler words that indicate hesitation
  private static readonly FILLER_WORDS = [
    'um', 'uh', 'er', 'ah', 'like', 'you know', 'i mean', 'well',
    'so', 'basically', 'actually', 'literally',
  ];

  // Question patterns that indicate confusion
  private static readonly CONFUSION_PATTERNS = [
    /can you (explain|clarify|repeat|rephrase)/i,
    /what (do you mean|does that mean|is that)/i,
    /i (don't|dont) (understand|get|know)/i,
    /why (is|does|do|would)/i,
    /how (is|does|do|can|would)/i,
    /could you (explain|clarify|repeat)/i,
    /i'm (confused|lost|stuck)/i,
    /this (doesn't|doesnt) make sense/i,
  ];

  /**
   * Analyze student message for confusion signals
   */
  static detectConfusion(
    message: string,
    conversationHistory: string[] = [],
    voiceMetrics?: VoiceMetrics
  ): ConfusionSignal[] {
    const signals: ConfusionSignal[] = [];
    const lowerMessage = message.toLowerCase();

    // 1. Check for uncertainty words
    const uncertaintyCount = this.UNCERTAINTY_WORDS.filter(word => 
      lowerMessage.includes(word)
    ).length;

    if (uncertaintyCount > 0) {
      signals.push({
        type: 'uncertainty',
        confidence: Math.min(0.9, uncertaintyCount * 0.3),
        trigger: message,
        suggestion: 'Simplify explanation, use more examples, check understanding',
      });
    }

    // 2. Check for confusion patterns
    for (const pattern of this.CONFUSION_PATTERNS) {
      if (pattern.test(message)) {
        signals.push({
          type: 'hesitation',
          confidence: 0.8,
          trigger: message,
          suggestion: 'Student needs clarification - rephrase previous explanation',
        });
        break;
      }
    }

    // 3. Check for repeated questions
    if (conversationHistory.length > 0) {
      const recentMessages = conversationHistory.slice(-5);
      const similarity = recentMessages.filter(msg => 
        this.areSimilar(msg, message)
      ).length;

      if (similarity > 0) {
        signals.push({
          type: 'repetition',
          confidence: 0.9,
          trigger: message,
          suggestion: 'Student asking same question - previous answer was unclear',
        });
      }
    }

    // 4. Check message length (very short = possible confusion)
    if (message.trim().split(/\s+/).length <= 2 && !this.isGreeting(message)) {
      signals.push({
        type: 'incomplete',
        confidence: 0.5,
        trigger: message,
        suggestion: 'Very short response - student may be confused or disengaged',
      });
    }

    // 5. Analyze voice metrics if provided
    if (voiceMetrics) {
      const voiceSignals = this.analyzeVoiceMetrics(voiceMetrics, message);
      signals.push(...voiceSignals);
    }

    return signals;
  }

  /**
   * Analyze voice metrics for confusion signals
   */
  static analyzeVoiceMetrics(metrics: VoiceMetrics, message: string): ConfusionSignal[] {
    const signals: ConfusionSignal[] = [];

    // High pause count indicates hesitation
    if (metrics.pauseCount > 3) {
      signals.push({
        type: 'hesitation',
        confidence: Math.min(0.9, metrics.pauseCount * 0.15),
        trigger: `${metrics.pauseCount} pauses detected`,
        suggestion: 'Student is hesitating - may need clarification or encouragement',
      });
    }

    // Long average pause duration
    if (metrics.averagePauseDuration > 2000) { // 2 seconds
      signals.push({
        type: 'hesitation',
        confidence: 0.7,
        trigger: `Long pauses (avg ${Math.round(metrics.averagePauseDuration)}ms)`,
        suggestion: 'Student taking long pauses - may be struggling to formulate response',
      });
    }

    // High filler word count
    if (metrics.fillerWordCount > 2) {
      signals.push({
        type: 'uncertainty',
        confidence: Math.min(0.8, metrics.fillerWordCount * 0.2),
        trigger: `${metrics.fillerWordCount} filler words detected`,
        suggestion: 'Student using many filler words - may be uncertain or confused',
      });
    }

    // Very slow speech rate
    if (metrics.speechRate < 80) { // words per minute
      signals.push({
        type: 'hesitation',
        confidence: 0.6,
        trigger: `Slow speech rate (${metrics.speechRate} wpm)`,
        suggestion: 'Student speaking slowly - may be thinking hard or confused',
      });
    }

    // High hesitation score
    if (metrics.hesitationScore > 0.6) {
      signals.push({
        type: 'hesitation',
        confidence: metrics.hesitationScore,
        trigger: `High hesitation score (${metrics.hesitationScore.toFixed(2)})`,
        suggestion: 'Multiple hesitation indicators - student likely confused',
      });
    }

    return signals;
  }

  /**
   * Calculate voice metrics from message
   */
  static calculateVoiceMetrics(
    message: string,
    duration: number, // milliseconds
    pauseCount: number = 0,
    pauseDurations: number[] = []
  ): VoiceMetrics {
    const lowerMessage = message.toLowerCase();
    
    // Count filler words
    const fillerWordCount = this.FILLER_WORDS.filter(word =>
      lowerMessage.includes(word)
    ).length;

    // Calculate speech rate
    const wordCount = message.trim().split(/\s+/).length;
    const speechRate = duration > 0 ? (wordCount / duration) * 60000 : 0; // words per minute

    // Calculate average pause duration
    const averagePauseDuration = pauseDurations.length > 0
      ? pauseDurations.reduce((a, b) => a + b, 0) / pauseDurations.length
      : 0;

    // Calculate hesitation score (0-1)
    const hesitationScore = this.calculateHesitationScore(
      pauseCount,
      fillerWordCount,
      speechRate,
      averagePauseDuration
    );

    return {
      pauseCount,
      fillerWordCount,
      averagePauseDuration,
      speechRate,
      hesitationScore,
    };
  }

  /**
   * Calculate overall hesitation score
   */
  private static calculateHesitationScore(
    pauseCount: number,
    fillerWordCount: number,
    speechRate: number,
    averagePauseDuration: number
  ): number {
    let score = 0;

    // Pause count contribution (0-0.3)
    score += Math.min(0.3, pauseCount * 0.05);

    // Filler word contribution (0-0.3)
    score += Math.min(0.3, fillerWordCount * 0.1);

    // Speech rate contribution (0-0.2)
    if (speechRate < 80) {
      score += 0.2;
    } else if (speechRate < 100) {
      score += 0.1;
    }

    // Pause duration contribution (0-0.2)
    if (averagePauseDuration > 3000) {
      score += 0.2;
    } else if (averagePauseDuration > 2000) {
      score += 0.1;
    }

    return Math.min(1.0, score);
  }

  /**
   * Generate teaching adjustment based on confusion signals
   */
  static generateTeachingAdjustment(signals: ConfusionSignal[]): string {
    if (signals.length === 0) {
      return '';
    }

    const highConfidenceSignals = signals.filter(s => s.confidence > 0.6);
    
    if (highConfidenceSignals.length === 0) {
      return '';
    }

    const adjustments: string[] = [
      '\nTEACHING ADJUSTMENT NEEDED:',
      `- Confusion detected: ${highConfidenceSignals.map(s => s.type).join(', ')}`,
      `- Suggestions: ${highConfidenceSignals.map(s => s.suggestion).join('; ')}`,
      '- Action: Simplify language, use concrete examples, check understanding before proceeding',
    ];

    return adjustments.join('\n');
  }

  /**
   * Aggregate confusion signals and calculate overall confidence
   */
  static aggregateConfusionSignals(signals: ConfusionSignal[]): {
    overallConfidence: number;
    dominantType: string;
    isConfused: boolean;
  } {
    if (signals.length === 0) {
      return {
        overallConfidence: 0,
        dominantType: 'none',
        isConfused: false,
      };
    }

    // Calculate overall confidence (weighted average)
    const totalConfidence = signals.reduce((sum, s) => sum + s.confidence, 0);
    const overallConfidence = totalConfidence / signals.length;

    // Find dominant type
    const typeCounts = signals.reduce((acc, s) => {
      acc[s.type] = (acc[s.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const dominantType = Object.entries(typeCounts)
      .sort(([, a], [, b]) => b - a)[0][0];

    // Determine if student is confused (threshold: 0.6)
    const isConfused = overallConfidence > 0.6;

    return {
      overallConfidence,
      dominantType,
      isConfused,
    };
  }

  /**
   * Check if student is ready for next concept
   */
  static isReadyForNext(confusionHistory: ConfusionSignal[][]): boolean {
    // If last 3 interactions had no confusion, student is ready
    const recentConfusion = confusionHistory.slice(-3);
    return recentConfusion.every(signals => signals.length === 0);
  }

  /**
   * Calculate overall confusion score (0-100)
   */
  static calculateConfusionScore(signals: ConfusionSignal[]): number {
    if (signals.length === 0) return 0;
    
    const totalConfidence = signals.reduce((sum, s) => sum + s.confidence, 0);
    return Math.min(100, Math.round((totalConfidence / signals.length) * 100));
  }

  /**
   * Check if two messages are similar
   */
  private static areSimilar(msg1: string, msg2: string): boolean {
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const norm1 = normalize(msg1);
    const norm2 = normalize(msg2);
    
    if (norm1 === norm2) return true;
    
    const words1 = new Set(norm1.split(/\s+/));
    const words2 = new Set(norm2.split(/\s+/));
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    
    return intersection.size / Math.min(words1.size, words2.size) > 0.7;
  }

  /**
   * Check if message is a greeting
   */
  private static isGreeting(message: string): boolean {
    const greetings = ['hi', 'hello', 'hey', 'namaste', 'good morning', 'good afternoon'];
    const lower = message.toLowerCase().trim();
    return greetings.some(g => lower === g || lower.startsWith(g + ' '));
  }
}
