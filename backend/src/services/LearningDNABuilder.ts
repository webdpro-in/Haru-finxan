/**
 * Learning DNA Fingerprint Builder
 * Creates unique behavioral fingerprints for each student
 * 
 * Task Group 11: Learning DNA Fingerprint
 */

import { client as weaviateClient, storeLearningDNA, findSimilarLearners } from '../config/weaviate.js';
import { StudentProfile } from '../models/StudentProfile.js';

export interface BehavioralFeatures {
  // Learning patterns
  averageResponseTime: number; // milliseconds
  preferredExplanationStyle: 'visual' | 'analytical' | 'story-based' | 'analogy-driven';
  questionFrequency: number; // questions per session
  confusionTriggers: string[];
  
  // Interaction patterns
  sessionDuration: number; // average in minutes
  pauseFrequency: number; // pauses per minute
  fillerWordRate: number; // filler words per 100 words
  
  // Performance patterns
  masteryGrowthRate: number; // average mastery gain per session
  retentionRate: number; // percentage of concepts retained after 7 days
  errorPatterns: string[]; // common mistake types
  
  // Engagement patterns
  timeOfDayPreference: 'morning' | 'afternoon' | 'evening';
  topicInterests: string[];
  struggleTopics: string[];
}

export interface LearningDNA {
  studentId: string;
  sessionId: string;
  timestamp: Date;
  features: BehavioralFeatures;
  embedding: number[]; // 384-dimensional vector
}

export interface SimilarLearner {
  studentId: string;
  similarity: number; // 0-1
  sharedPatterns: string[];
  recommendedApproach: string;
}

export class LearningDNABuilder {
  /**
   * 11.1: Implement behavioral feature extraction
   * Extract behavioral features from student profile and session data
   */
  static extractFeatures(
    profile: StudentProfile,
    sessionData: {
      responseTime: number;
      pauseCount: number;
      fillerWordCount: number;
      wordCount: number;
      duration: number;
    }
  ): BehavioralFeatures {
    // Calculate rates and averages
    const pauseFrequency = sessionData.duration > 0 
      ? (sessionData.pauseCount / sessionData.duration) * 60 
      : 0;
    
    const fillerWordRate = sessionData.wordCount > 0
      ? (sessionData.fillerWordCount / sessionData.wordCount) * 100
      : 0;
    
    // Determine preferred explanation style based on interaction patterns
    const preferredStyle = this.determineExplanationStyle(profile, sessionData);
    
    // Calculate mastery growth rate
    const masteryGrowthRate = this.calculateMasteryGrowthRate(profile);
    
    // Determine time of day preference
    const timeOfDayPreference = this.determineTimePreference(profile);
    
    return {
      averageResponseTime: sessionData.responseTime,
      preferredExplanationStyle: preferredStyle,
      questionFrequency: profile.totalSessions > 0 
        ? profile.totalQuestionsAsked / profile.totalSessions 
        : 0,
      confusionTriggers: profile.confusionTriggers.slice(0, 10),
      sessionDuration: profile.averageSessionDuration / 60000, // convert ms to minutes
      pauseFrequency,
      fillerWordRate,
      masteryGrowthRate,
      retentionRate: this.calculateRetentionRate(profile),
      errorPatterns: this.identifyErrorPatterns(profile),
      timeOfDayPreference,
      topicInterests: profile.strongConcepts.slice(0, 5),
      struggleTopics: profile.weakConcepts.slice(0, 5),
    };
  }

  /**
   * 11.2: Implement embedding generation
   * Generate vector embedding from behavioral features
   */
  static generateEmbedding(features: BehavioralFeatures): number[] {
    // Create a 384-dimensional embedding vector
    // In production, this would use a proper embedding model
    // For now, we'll create a deterministic embedding based on features
    
    const embedding: number[] = new Array(384).fill(0);
    
    // Encode response time (normalized to 0-1)
    const normalizedResponseTime = Math.min(features.averageResponseTime / 10000, 1);
    for (let i = 0; i < 48; i++) {
      embedding[i] = normalizedResponseTime;
    }
    
    // Encode explanation style (one-hot encoding)
    const styleIndex = {
      'visual': 48,
      'analytical': 96,
      'story-based': 144,
      'analogy-driven': 192,
    }[features.preferredExplanationStyle];
    for (let i = styleIndex; i < styleIndex + 48; i++) {
      embedding[i] = 1;
    }
    
    // Encode question frequency
    const normalizedQuestionFreq = Math.min(features.questionFrequency / 20, 1);
    for (let i = 240; i < 288; i++) {
      embedding[i] = normalizedQuestionFreq;
    }
    
    // Encode mastery growth rate
    const normalizedGrowth = Math.min(features.masteryGrowthRate / 50, 1);
    for (let i = 288; i < 336; i++) {
      embedding[i] = normalizedGrowth;
    }
    
    // Encode retention rate
    for (let i = 336; i < 384; i++) {
      embedding[i] = features.retentionRate;
    }
    
    return embedding;
  }

  /**
   * 11.3: Implement Weaviate storage
   * Store Learning DNA in Weaviate vector database
   */
  static async storeDNA(dna: LearningDNA): Promise<string> {
    try {
      const properties = {
        studentId: dna.studentId,
        sessionId: dna.sessionId,
        timestamp: dna.timestamp.getTime(),
        preferredExplanationStyle: dna.features.preferredExplanationStyle,
        avgResponseTime: dna.features.averageResponseTime,
        confusionTriggers: dna.features.confusionTriggers,
      };
      
      const id = await storeLearningDNA(
        dna.studentId,
        dna.sessionId,
        properties,
        dna.embedding
      );
      
      console.log(`✅ Stored Learning DNA for student ${dna.studentId}`);
      return id;
    } catch (error) {
      console.error('Failed to store Learning DNA:', error);
      throw error;
    }
  }

  /**
   * 11.4: Implement similar learner search
   * Find students with similar learning patterns
   */
  static async findSimilarLearners(
    studentId: string,
    embedding: number[],
    limit: number = 10
  ): Promise<SimilarLearner[]> {
    try {
      const results = await findSimilarLearners(embedding, limit);
      
      return results
        .filter((r: any) => r.studentId !== studentId) // Exclude self
        .map((r: any) => ({
          studentId: r.studentId,
          similarity: 1 - (r._additional?.distance || 0),
          sharedPatterns: this.identifySharedPatterns(r),
          recommendedApproach: this.generateRecommendation(r),
        }));
    } catch (error) {
      console.error('Failed to find similar learners:', error);
      return [];
    }
  }

  /**
   * 11.5: Implement teaching style adaptation
   * Adapt teaching approach based on similar learners' success
   */
  static async adaptTeachingStyle(
    studentId: string,
    currentFeatures: BehavioralFeatures
  ): Promise<{
    recommendedStyle: string;
    adjustments: string[];
    reasoning: string;
  }> {
    // Generate embedding for current student
    const embedding = this.generateEmbedding(currentFeatures);
    
    // Find similar learners
    const similarLearners = await this.findSimilarLearners(studentId, embedding, 5);
    
    if (similarLearners.length === 0) {
      return {
        recommendedStyle: currentFeatures.preferredExplanationStyle,
        adjustments: [],
        reasoning: 'No similar learners found, continuing with current approach',
      };
    }
    
    // Analyze what worked for similar learners
    const adjustments: string[] = [];
    
    // Check if similar learners prefer different explanation styles
    const styleFrequency: Record<string, number> = {};
    similarLearners.forEach(learner => {
      learner.sharedPatterns.forEach(pattern => {
        styleFrequency[pattern] = (styleFrequency[pattern] || 0) + 1;
      });
    });
    
    const mostCommonStyle = Object.entries(styleFrequency)
      .sort(([, a], [, b]) => b - a)[0]?.[0];
    
    if (mostCommonStyle && mostCommonStyle !== currentFeatures.preferredExplanationStyle) {
      adjustments.push(`Try ${mostCommonStyle} explanations`);
    }
    
    // Check for common success patterns
    if (currentFeatures.pauseFrequency > 5) {
      adjustments.push('Slow down pace, allow more processing time');
    }
    
    if (currentFeatures.confusionTriggers.length > 5) {
      adjustments.push('Break down complex topics into smaller chunks');
    }
    
    if (currentFeatures.questionFrequency < 2) {
      adjustments.push('Encourage more questions with prompts');
    }
    
    return {
      recommendedStyle: mostCommonStyle || currentFeatures.preferredExplanationStyle,
      adjustments,
      reasoning: `Based on ${similarLearners.length} similar learners with ${Math.round(similarLearners[0].similarity * 100)}% similarity`,
    };
  }

  /**
   * Build complete Learning DNA from profile and session
   */
  static async buildDNA(
    profile: StudentProfile,
    sessionId: string,
    sessionData: {
      responseTime: number;
      pauseCount: number;
      fillerWordCount: number;
      wordCount: number;
      duration: number;
    }
  ): Promise<LearningDNA> {
    const features = this.extractFeatures(profile, sessionData);
    const embedding = this.generateEmbedding(features);
    
    const dna: LearningDNA = {
      studentId: profile.studentId,
      sessionId,
      timestamp: new Date(),
      features,
      embedding,
    };
    
    // Store in Weaviate
    await this.storeDNA(dna);
    
    return dna;
  }

  // Helper methods
  
  private static determineExplanationStyle(
    profile: StudentProfile,
    sessionData: any
  ): 'visual' | 'analytical' | 'story-based' | 'analogy-driven' {
    // Simple heuristic based on learning patterns
    if (profile.learningStyle === 'visual') return 'visual';
    if (sessionData.pauseCount > 5) return 'story-based'; // Needs more context
    if (profile.totalQuestionsAsked / Math.max(profile.totalSessions, 1) > 5) return 'analytical';
    return 'analogy-driven';
  }

  private static calculateMasteryGrowthRate(profile: StudentProfile): number {
    if (profile.conceptMasteries.size === 0) return 0;
    
    const totalMastery = Array.from(profile.conceptMasteries.values())
      .reduce((sum, m) => sum + m.masteryLevel, 0);
    
    return profile.totalSessions > 0 
      ? totalMastery / profile.totalSessions 
      : 0;
  }

  private static calculateRetentionRate(profile: StudentProfile): number {
    // Calculate percentage of concepts with mastery > 60 after 7 days
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    
    const oldConcepts = Array.from(profile.conceptMasteries.values())
      .filter(m => m.lastPracticed.getTime() < sevenDaysAgo);
    
    if (oldConcepts.length === 0) return 1;
    
    const retained = oldConcepts.filter(m => m.masteryLevel > 60).length;
    return retained / oldConcepts.length;
  }

  private static identifyErrorPatterns(profile: StudentProfile): string[] {
    // Identify common error patterns from confusion triggers
    const patterns: string[] = [];
    
    if (profile.confusionTriggers.some(t => t.toLowerCase().includes('fraction'))) {
      patterns.push('fraction-operations');
    }
    if (profile.confusionTriggers.some(t => t.toLowerCase().includes('equation'))) {
      patterns.push('equation-solving');
    }
    if (profile.confusionTriggers.some(t => t.toLowerCase().includes('word'))) {
      patterns.push('word-problems');
    }
    
    return patterns;
  }

  private static determineTimePreference(profile: StudentProfile): 'morning' | 'afternoon' | 'evening' {
    // Analyze session timestamps to determine preferred time
    // For now, return a default
    return 'afternoon';
  }

  private static identifySharedPatterns(learner: any): string[] {
    const patterns: string[] = [];
    
    if (learner.preferredExplanationStyle) {
      patterns.push(learner.preferredExplanationStyle);
    }
    
    return patterns;
  }

  private static generateRecommendation(learner: any): string {
    return `Use ${learner.preferredExplanationStyle || 'adaptive'} teaching approach`;
  }
}
