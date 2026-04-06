/**
 * Metacognition Coach
 * Helps students reflect on their learning patterns and improve study strategies
 * 
 * Requirements:
 * - REQ-2.7.1: Generate post-session reflection prompts
 * - REQ-2.7.2: Identify patterns across recent sessions
 * - REQ-2.7.3: Highlight what went well
 * - REQ-2.7.4: Suggest areas to improve
 * - REQ-2.7.5: Recommend next steps based on weak concepts
 */

import { StudentProfile, LearningSession } from '../models/StudentProfile';
import { GeminiClient } from './GeminiClient';

export interface SessionAnalysis {
  sessionQuality: number; // 0-100
  cognitiveLoadAverage: number; // 0-100
  masteryGainTotal: number;
  confusionRate: number; // 0-1
  engagementScore: number; // 0-100
  optimalTimeOfDay?: string;
  averageDuration: number; // seconds
}

export interface LearningPattern {
  type: 'time_preference' | 'confusion_trigger' | 'mastery_trend' | 'engagement_pattern';
  description: string;
  confidence: number; // 0-1
  recommendation: string;
}

export interface ReflectionPrompt {
  whatWentWell: string[];
  areasToImprove: string[];
  patternsDiscovered: string[];
  nextSteps: string[];
  motivationalMessage: string;
}

export class MetacognitionCoach {
  private static geminiClient: GeminiClient | null = null;

  /**
   * Initialize Gemini client for AI-powered reflections
   */
  private static getGeminiClient(): GeminiClient {
    if (!this.geminiClient) {
      this.geminiClient = new GeminiClient({
        apiKey: process.env.GEMINI_API_KEY || '',
        model: 'gemini-1.5-flash',
        temperature: 0.7,
        maxTokens: 500,
      });
    }
    return this.geminiClient;
  }

  /**
   * Task 21.1: Analyze recent learning sessions
   * Extracts patterns from last 5-10 sessions
   */
  static analyzeRecentSessions(
    profile: StudentProfile,
    sessionCount: number = 10
  ): SessionAnalysis {
    const sessions = profile.recentSessions.slice(0, Math.min(sessionCount, profile.recentSessions.length));
    
    if (sessions.length === 0) {
      return {
        sessionQuality: 0,
        cognitiveLoadAverage: 0,
        masteryGainTotal: 0,
        confusionRate: 0,
        engagementScore: 0,
        averageDuration: 0,
      };
    }

    // Calculate session quality metrics
    const totalMasteryGain = sessions.reduce((sum, session) => {
      return sum + Object.values(session.masteryGained).reduce((a, b) => a + b, 0);
    }, 0);

    const confusionCount = sessions.filter(s => s.confusionDetected).length;
    const confusionRate = confusionCount / sessions.length;

    // Calculate average duration
    const averageDuration = sessions.reduce((sum, s) => sum + s.duration, 0) / sessions.length;

    // Calculate engagement score based on questions asked and session completion
    const avgQuestionsPerSession = sessions.reduce((sum, s) => sum + s.questionsAsked, 0) / sessions.length;
    const engagementScore = Math.min(100, (avgQuestionsPerSession / 5) * 100); // 5 questions = 100% engagement

    // Calculate session quality (composite metric)
    const sessionQuality = Math.round(
      (1 - confusionRate) * 40 + // Low confusion = good
      Math.min(totalMasteryGain / sessions.length, 20) * 2 + // Mastery gains
      (engagementScore / 100) * 20 // Engagement
    );

    // Identify optimal time of day (if timestamp data available)
    const optimalTimeOfDay = this.identifyOptimalTime(sessions);

    return {
      sessionQuality,
      cognitiveLoadAverage: this.estimateCognitiveLoad(sessions),
      masteryGainTotal: totalMasteryGain,
      confusionRate,
      engagementScore,
      optimalTimeOfDay,
      averageDuration,
    };
  }

  /**
   * Task 21.2: Identify learning patterns across sessions
   */
  static identifyPatterns(
    profile: StudentProfile,
    analysis: SessionAnalysis
  ): LearningPattern[] {
    const patterns: LearningPattern[] = [];
    const sessions = profile.recentSessions.slice(0, 10);

    if (sessions.length < 3) {
      return patterns; // Need at least 3 sessions for pattern detection
    }

    // Pattern 1: Optimal learning time
    if (analysis.optimalTimeOfDay) {
      patterns.push({
        type: 'time_preference',
        description: `You learn best during ${analysis.optimalTimeOfDay}`,
        confidence: 0.8,
        recommendation: `Schedule your most challenging topics for ${analysis.optimalTimeOfDay}`,
      });
    }

    // Pattern 2: Confusion triggers
    const confusionTriggers = this.identifyConfusionTriggers(profile);
    if (confusionTriggers.length > 0) {
      patterns.push({
        type: 'confusion_trigger',
        description: `You often get confused with: ${confusionTriggers.slice(0, 2).join(', ')}`,
        confidence: 0.9,
        recommendation: 'Break these topics into smaller chunks and review prerequisites',
      });
    }

    // Pattern 3: Mastery trend
    const masteryTrend = this.calculateMasteryTrend(sessions);
    if (masteryTrend > 0) {
      patterns.push({
        type: 'mastery_trend',
        description: `Your understanding is improving by ${masteryTrend.toFixed(1)}% per session`,
        confidence: 0.85,
        recommendation: 'Keep up the consistent practice!',
      });
    } else if (masteryTrend < -2) {
      patterns.push({
        type: 'mastery_trend',
        description: 'Your mastery has been declining recently',
        confidence: 0.85,
        recommendation: 'Take a break and review fundamentals before moving forward',
      });
    }

    // Pattern 4: Engagement patterns
    if (analysis.engagementScore < 40) {
      patterns.push({
        type: 'engagement_pattern',
        description: 'You\'re asking fewer questions than usual',
        confidence: 0.7,
        recommendation: 'Try to be more curious - asking questions helps you learn faster',
      });
    } else if (analysis.engagementScore > 80) {
      patterns.push({
        type: 'engagement_pattern',
        description: 'You\'re highly engaged and asking great questions',
        confidence: 0.9,
        recommendation: 'Your curiosity is your superpower - keep it up!',
      });
    }

    return patterns;
  }

  /**
   * Task 21.3: Generate post-session reflection prompts
   */
  static generateReflection(
    session: LearningSession,
    profile: StudentProfile
  ): ReflectionPrompt {
    const analysis = this.analyzeRecentSessions(profile, 10);
    const patterns = this.identifyPatterns(profile, analysis);

    const reflection: ReflectionPrompt = {
      whatWentWell: [],
      areasToImprove: [],
      patternsDiscovered: [],
      nextSteps: [],
      motivationalMessage: '',
    };

    // REQ-2.7.3: Highlight what went well
    if (session.confusionCount === 0) {
      reflection.whatWentWell.push('🎉 You understood concepts quickly today!');
    }

    if (session.questionsAsked > 5) {
      reflection.whatWentWell.push('💡 You asked great questions - that shows curiosity!');
    }

    const sessionMasteryGain = Object.values(session.masteryGained).reduce((a, b) => a + b, 0);
    if (sessionMasteryGain >= 10) {
      reflection.whatWentWell.push(`📈 You gained ${sessionMasteryGain.toFixed(0)} mastery points!`);
    }

    if (session.duration > profile.averageSessionDuration * 1.2) {
      reflection.whatWentWell.push('⏱️ You stayed focused longer than usual!');
    }

    // REQ-2.7.4: Suggest areas to improve
    if (session.confusionCount >= 2) {
      reflection.areasToImprove.push('You seemed confused multiple times - try breaking topics into smaller pieces');
    }

    if (session.questionsAsked < 3) {
      reflection.areasToImprove.push('Ask more questions! Curiosity accelerates learning');
    }

    if (analysis.confusionRate > 0.6) {
      reflection.areasToImprove.push('You\'ve been confused in most recent sessions - let\'s slow down and review fundamentals');
    }

    // REQ-2.7.2: Identify patterns discovered
    patterns.forEach(pattern => {
      if (pattern.confidence > 0.7) {
        reflection.patternsDiscovered.push(pattern.description);
      }
    });

    // REQ-2.7.5: Recommend next steps based on weak concepts
    const weakConcepts = profile.weakConcepts.slice(0, 3);
    if (weakConcepts.length > 0) {
      reflection.nextSteps.push(`📚 Focus on: ${weakConcepts.join(', ')}`);
    }

    // Add pattern-based recommendations
    patterns.forEach(pattern => {
      if (pattern.confidence > 0.7) {
        reflection.nextSteps.push(`💡 ${pattern.recommendation}`);
      }
    });

    // Add spaced repetition recommendations
    const staleConcepts = this.identifyStaleConcepts(profile);
    if (staleConcepts.length > 0) {
      reflection.nextSteps.push(`🔄 Review these concepts: ${staleConcepts.slice(0, 2).join(', ')}`);
    }

    // REQ-2.7.1: Generate motivational message
    reflection.motivationalMessage = this.generateMotivationalMessage(analysis, profile);

    return reflection;
  }

  /**
   * Task 21.3: Generate AI-powered personalized reflection using Gemini
   * REQ-2.7.1: Generate post-session reflection prompts with AI
   */
  static async generateAIReflection(
    session: LearningSession,
    profile: StudentProfile
  ): Promise<ReflectionPrompt> {
    const analysis = this.analyzeRecentSessions(profile, 10);
    const patterns = this.identifyPatterns(profile, analysis);

    // Build context for Gemini
    const context = {
      sessionData: {
        duration: Math.round(session.duration / 60),
        questionsAsked: session.questionsAsked,
        confusionCount: session.confusionCount,
        topicsCovered: session.topicsCovered,
        masteryGained: Object.values(session.masteryGained).reduce((a, b) => a + b, 0),
      },
      studentContext: {
        grade: profile.grade,
        totalSessions: profile.totalSessions,
        weakConcepts: profile.weakConcepts.slice(0, 3),
        strongConcepts: profile.strongConcepts.slice(0, 3),
      },
      patterns: patterns.map(p => p.description),
      analysis: {
        sessionQuality: analysis.sessionQuality,
        confusionRate: analysis.confusionRate,
        engagementScore: analysis.engagementScore,
      },
    };

    const prompt = `You are a metacognition coach helping a grade ${profile.grade} student reflect on their learning session.

Session Summary:
- Duration: ${context.sessionData.duration} minutes
- Questions asked: ${context.sessionData.questionsAsked}
- Confusion events: ${context.sessionData.confusionCount}
- Topics covered: ${context.sessionData.topicsCovered.join(', ')}
- Mastery gained: ${context.sessionData.masteryGained.toFixed(1)} points

Student Context:
- Total sessions: ${context.studentContext.totalSessions}
- Weak concepts: ${context.studentContext.weakConcepts.join(', ') || 'None'}
- Strong concepts: ${context.studentContext.strongConcepts.join(', ') || 'None'}

Learning Patterns Detected:
${context.patterns.join('\n')}

Generate a personalized reflection with:
1. What went well (2-3 specific positive observations)
2. Areas to improve (1-2 constructive suggestions)
3. Next steps (2-3 actionable recommendations focusing on weak concepts)
4. A motivational message (1 sentence)

Format as JSON:
{
  "whatWentWell": ["...", "..."],
  "areasToImprove": ["...", "..."],
  "nextSteps": ["...", "..."],
  "motivationalMessage": "..."
}`;

    try {
      const gemini = this.getGeminiClient();
      const response = await gemini.generateResponse(prompt, []);

      // Parse AI response
      const aiReflection = JSON.parse(response.text);

      return {
        whatWentWell: aiReflection.whatWentWell || [],
        areasToImprove: aiReflection.areasToImprove || [],
        patternsDiscovered: patterns.map(p => p.description),
        nextSteps: aiReflection.nextSteps || [],
        motivationalMessage: aiReflection.motivationalMessage || this.generateMotivationalMessage(analysis, profile),
      };
    } catch (error) {
      console.error('Error generating AI reflection:', error);
      // Fallback to rule-based reflection
      return this.generateReflection(session, profile);
    }
  }

  /**
   * Helper: Identify optimal time of day for learning
   */
  private static identifyOptimalTime(sessions: LearningSession[]): string | undefined {
    const timeSlots = {
      morning: { count: 0, totalMastery: 0 },
      afternoon: { count: 0, totalMastery: 0 },
      evening: { count: 0, totalMastery: 0 },
    };

    sessions.forEach(session => {
      const hour = session.timestamp.getHours();
      const masteryGain = Object.values(session.masteryGained).reduce((a, b) => a + b, 0);

      if (hour >= 6 && hour < 12) {
        timeSlots.morning.count++;
        timeSlots.morning.totalMastery += masteryGain;
      } else if (hour >= 12 && hour < 18) {
        timeSlots.afternoon.count++;
        timeSlots.afternoon.totalMastery += masteryGain;
      } else {
        timeSlots.evening.count++;
        timeSlots.evening.totalMastery += masteryGain;
      }
    });

    // Find time slot with highest average mastery gain
    let bestSlot: string | undefined;
    let bestAverage = 0;

    Object.entries(timeSlots).forEach(([slot, data]) => {
      if (data.count > 0) {
        const average = data.totalMastery / data.count;
        if (average > bestAverage) {
          bestAverage = average;
          bestSlot = slot;
        }
      }
    });

    return bestSlot;
  }

  /**
   * Helper: Estimate cognitive load from session data
   */
  private static estimateCognitiveLoad(sessions: LearningSession[]): number {
    // Estimate based on confusion rate and question frequency
    const avgConfusionCount = sessions.reduce((sum, s) => sum + s.confusionCount, 0) / sessions.length;
    const avgQuestions = sessions.reduce((sum, s) => sum + s.questionsAsked, 0) / sessions.length;

    // High confusion + many questions = high cognitive load
    const cognitiveLoad = Math.min(100, (avgConfusionCount * 15) + (avgQuestions * 5));
    
    return Math.round(cognitiveLoad);
  }

  /**
   * Helper: Identify confusion triggers
   */
  private static identifyConfusionTriggers(profile: StudentProfile): string[] {
    // Sort by frequency
    const sorted = [...profile.hesitationPatterns].sort((a, b) => b.frequency - a.frequency);
    return sorted.slice(0, 3).map(p => p.topic);
  }

  /**
   * Helper: Calculate mastery trend
   */
  private static calculateMasteryTrend(sessions: LearningSession[]): number {
    if (sessions.length < 2) return 0;

    const masteryGains = sessions.map(s => 
      Object.values(s.masteryGained).reduce((a, b) => a + b, 0)
    );

    // Simple linear regression
    const n = masteryGains.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = masteryGains.reduce((a, b) => a + b, 0);
    const sumXY = masteryGains.reduce((sum, y, i) => sum + i * y, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    
    return slope;
  }

  /**
   * Helper: Identify concepts that need review (stale)
   */
  private static identifyStaleConcepts(profile: StudentProfile): string[] {
    const staleThreshold = 7 * 24 * 60 * 60 * 1000; // 7 days
    const staleConcepts: string[] = [];

    profile.conceptMasteries.forEach((mastery) => {
      const daysSinceReview = Date.now() - mastery.lastPracticed.getTime();
      if (daysSinceReview > staleThreshold && mastery.masteryLevel < 90) {
        staleConcepts.push(mastery.conceptName);
      }
    });

    return staleConcepts;
  }

  /**
   * Helper: Generate motivational message
   */
  private static generateMotivationalMessage(
    analysis: SessionAnalysis,
    profile: StudentProfile
  ): string {
    if (analysis.sessionQuality > 80) {
      return '🌟 Outstanding work! You\'re mastering concepts at an impressive pace!';
    } else if (analysis.sessionQuality > 60) {
      return '👍 Great progress! Keep up the consistent effort!';
    } else if (analysis.sessionQuality > 40) {
      return '💪 You\'re making progress! Remember, learning takes time and practice.';
    } else {
      return '🌱 Every expert was once a beginner. Keep going - you\'re building important skills!';
    }
  }
}
