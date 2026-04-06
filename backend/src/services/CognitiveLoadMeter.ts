/**
 * Cognitive Load Meter Service
 * Monitors student cognitive load through response time, message complexity, and voice hesitation
 */

export interface VoiceMetrics {
  pauseCount: number;
  fillerWordCount: number;
  averagePauseDuration: number;
  speechRate: number;
}

export interface LoadMetrics {
  responseTime: number;
  messageComplexity: number;
  voiceHesitation: number;
  totalLoad: number;
  overloaded: boolean;
}

export interface DifficultyAdjustment {
  recommendation: 'simplify' | 'maintain' | 'increase';
  adjustments: string[];
  reasoning: string;
  currentLoad: number;
}

export interface SessionMetrics {
  averageLoad: number;
  peakLoad: number;
  loadTrend: 'increasing' | 'decreasing' | 'stable';
  overloadEvents: number;
}

export interface Interaction {
  message: string;
  responseTime: number;
  voiceMetrics: VoiceMetrics | null;
  confusionSignalsCount: number;
}

export class CognitiveLoadMeter {
  /**
   * Monitor response time and return load score (0-100)
   * Task 12.1: Implement response time monitoring
   */
  static monitorResponseTime(responseTimeMs: number): number {
    // Map response time to load score based on test expectations
    if (responseTimeMs <= 2000) return 0;
    if (responseTimeMs <= 5000) return 10;
    if (responseTimeMs <= 8000) return 30;
    if (responseTimeMs <= 12000) return 50;
    if (responseTimeMs <= 20000) return 70;
    return 100;
  }


  /**
   * Analyze message complexity and return load score (0-100)
   * Task 12.2: Implement message complexity analysis
   */
  static analyzeMessageComplexity(message: string): number {
    if (!message || message.trim().length === 0) {
      return 0;
    }

    const text = message.trim();
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;

    // Very short messages (1-2 words) indicate high cognitive load
    if (wordCount <= 2) return 20;
    
    // Short messages (3-5 words) indicate moderate load
    if (wordCount <= 5) return 10;
    
    // Fragmented responses (multiple short sentences)
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length >= 3 && wordCount <= 10) return 15;
    
    // Normal complexity messages indicate low load
    return 0;
  }

  /**
   * Detect voice hesitation and return load score (0-100)
   * Task 12.3: Implement voice hesitation detection
   */
  static detectVoiceHesitation(voiceMetrics: VoiceMetrics | null): number {
    if (!voiceMetrics) return 0;

    let hesitationScore = 0;

    // High pause count (>5)
    if (voiceMetrics.pauseCount > 5) {
      hesitationScore += 30;
    } else if (voiceMetrics.pauseCount >= 4) {
      // Moderate pause count (4-5)
      hesitationScore += 20;
    }

    // Filler words (>2)
    if (voiceMetrics.fillerWordCount >= 3) {
      hesitationScore += 30;
    }

    // Slow speech rate (<100 wpm)
    if (voiceMetrics.speechRate < 100) {
      hesitationScore += 20;
    }

    return Math.min(100, hesitationScore);
  }

  /**
   * Calculate overall cognitive load score
   * Task 12.4: Implement load score calculation
   */
  static calculateLoadScore(
    message: string,
    responseTime: number,
    voiceMetrics: VoiceMetrics | null,
    confusionSignalsCount: number
  ): LoadMetrics {
    const responseTimeLoad = this.monitorResponseTime(responseTime);
    const messageComplexity = this.analyzeMessageComplexity(message);
    const voiceHesitation = this.detectVoiceHesitation(voiceMetrics);

    // Weighted calculation
    const baseLoad = 
      responseTimeLoad * 0.4 +
      messageComplexity * 0.3 +
      voiceHesitation * 0.3;

    // Add confusion signal penalty (10 points per signal)
    const confusionPenalty = confusionSignalsCount * 10;
    const totalLoad = Math.min(100, Math.round(baseLoad + confusionPenalty));

    return {
      responseTime: responseTimeLoad,
      messageComplexity,
      voiceHesitation,
      totalLoad,
      overloaded: totalLoad > 60
    };
  }


  /**
   * Recommend difficulty adjustment based on load metrics
   * Task 12.5: Implement difficulty adjustment
   */
  static recommendDifficultyAdjustment(loadMetrics: LoadMetrics): DifficultyAdjustment {
    const { totalLoad } = loadMetrics;

    if (totalLoad > 70) {
      return {
        recommendation: 'simplify',
        adjustments: [
          'Break down concepts into smaller chunks',
          'Use more concrete examples and analogies',
          'Slow down the pace of instruction',
          'Provide more scaffolding and support'
        ],
        reasoning: 'Student is experiencing high cognitive load and may be struggling',
        currentLoad: totalLoad
      };
    } else if (totalLoad >= 40) {
      return {
        recommendation: 'maintain',
        adjustments: [
          'Maintain current pace',
          'Continue with current difficulty level',
          'Monitor for changes in engagement'
        ],
        reasoning: 'Student is learning at a comfortable pace',
        currentLoad: totalLoad
      };
    } else {
      return {
        recommendation: 'increase',
        adjustments: [
          'Introduce more advanced concepts',
          'Challenge with deeper questions',
          'Increase pace slightly',
          'Add complexity to problems'
        ],
        reasoning: 'Student is ready for more challenge',
        currentLoad: totalLoad
      };
    }
  }

  /**
   * Monitor entire session and calculate session-level metrics
   * Task 12.6: Write unit tests for load meter
   */
  static monitorSession(interactions: Interaction[]): SessionMetrics {
    if (interactions.length === 0) {
      return {
        averageLoad: 0,
        peakLoad: 0,
        loadTrend: 'stable',
        overloadEvents: 0
      };
    }

    // Calculate load for each interaction
    const loads = interactions.map(interaction => {
      const metrics = this.calculateLoadScore(
        interaction.message,
        interaction.responseTime,
        interaction.voiceMetrics,
        interaction.confusionSignalsCount
      );
      return metrics.totalLoad;
    });

    // Calculate metrics
    const averageLoad = Math.round(loads.reduce((sum, load) => sum + load, 0) / loads.length);
    const peakLoad = Math.max(...loads);
    const overloadEvents = loads.filter(load => load > 60).length;

    // Determine trend (compare first half to second half)
    const midpoint = Math.floor(loads.length / 2);
    const firstHalfAvg = loads.slice(0, midpoint).reduce((sum, load) => sum + load, 0) / midpoint;
    const secondHalfAvg = loads.slice(midpoint).reduce((sum, load) => sum + load, 0) / (loads.length - midpoint);

    let loadTrend: 'increasing' | 'decreasing' | 'stable';
    if (secondHalfAvg > firstHalfAvg + 10) {
      loadTrend = 'increasing';
    } else if (secondHalfAvg < firstHalfAvg - 10) {
      loadTrend = 'decreasing';
    } else {
      loadTrend = 'stable';
    }

    return {
      averageLoad,
      peakLoad,
      loadTrend,
      overloadEvents
    };
  }
}
