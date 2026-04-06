/**
 * Predictive Failure Detection Service
 * Calculates risk scores for students based on multiple factors
 */

export interface StudentProfile {
  studentId: string;
  name: string;
  grade: number;
  preferredLanguage: string;
  conceptMasteries: Map<string, ConceptMastery>;
  weakConcepts: string[];
  strongConcepts: string[];
  learningStyle: string;
  averageSessionDuration: number;
  preferredDifficulty: string;
  totalSessions: number;
  totalQuestionsAsked: number;
  recentSessions: any[];
  confusionTriggers: string[];
  hesitationPatterns: any[];
  moodHistory: MoodCheckIn[];
  createdAt: Date;
  lastActiveAt: Date;
  streakDays: number;
  totalLearningTime: number;
}

export interface ConceptMastery {
  conceptId: string;
  conceptName: string;
  masteryLevel: number;
  lastPracticed: Date;
  attemptsCount: number;
  successRate: number;
  prerequisites: string[];
}

export interface LearningSession {
  sessionId: string;
  timestamp: Date;
  duration: number;
  topicsCovered: string[];
  questionsAsked: number;
  confusionDetected: boolean;
  confusionCount: number;
  masteryGained: Record<string, number>;
}

export interface MoodCheckIn {
  timestamp: Date;
  mood: 'happy' | 'neutral' | 'sad' | 'anxious' | 'frustrated';
  energyLevel: number;
  notes?: string;
}


export interface RiskFactor {
  factor: string;
  weight: number;
  description: string;
}

export interface RiskPrediction {
  studentId: string;
  studentName: string;
  riskScore: number;
  riskFactors: RiskFactor[];
  recommendedInterventions: string[];
  predictedOutcome: 'at_risk' | 'needs_attention' | 'on_track';
  confidence: number;
}

/**
 * Calculate mastery trend from recent sessions
 */
function calculateMasteryTrend(recentSessions: LearningSession[]): number {
  if (recentSessions.length < 2) return 0;

  let totalChange = 0;
  let changeCount = 0;

  for (const session of recentSessions) {
    for (const change of Object.values(session.masteryGained)) {
      totalChange += change;
      changeCount++;
    }
  }

  return changeCount > 0 ? totalChange / changeCount : 0;
}

/**
 * Calculate average session gap in days
 */
function calculateAverageSessionGap(recentSessions: LearningSession[]): number {
  if (recentSessions.length < 2) return 0;

  const sortedSessions = [...recentSessions].sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
  );

  let totalGap = 0;
  for (let i = 0; i < sortedSessions.length - 1; i++) {
    const gap = sortedSessions[i].timestamp.getTime() - sortedSessions[i + 1].timestamp.getTime();
    totalGap += gap / (1000 * 60 * 60 * 24); // Convert to days
  }

  return totalGap / (sortedSessions.length - 1);
}


/**
 * Calculate average mastery across all concepts
 */
function calculateAverageMastery(conceptMasteries: Map<string, ConceptMastery>): number {
  if (conceptMasteries.size === 0) return 0;

  let total = 0;
  for (const mastery of conceptMasteries.values()) {
    total += mastery.masteryLevel;
  }

  return total / conceptMasteries.size;
}

/**
 * Find concepts with repeated failures (low mastery and low success rate)
 */
function findRepeatedFailures(conceptMasteries: Map<string, ConceptMastery>): string[] {
  const failures: string[] = [];

  for (const mastery of conceptMasteries.values()) {
    if (mastery.masteryLevel < 50 && mastery.successRate < 0.5) {
      failures.push(mastery.conceptName);
    }
  }

  return failures;
}

/**
 * Calculate rate of negative moods
 */
function calculateNegativeMoodRate(moodHistory: MoodCheckIn[]): number {
  if (moodHistory.length === 0) return 0;

  const negativeMoods = moodHistory.filter(
    m => m.mood === 'anxious' || m.mood === 'frustrated' || m.mood === 'sad'
  );

  return negativeMoods.length / moodHistory.length;
}


/**
 * Generate intervention recommendations based on risk factors
 */
function generateInterventions(riskFactors: RiskFactor[]): string[] {
  const interventions: string[] = [];

  for (const factor of riskFactors) {
    if (factor.factor.includes('mastery trend')) {
      interventions.push('Schedule 1-on-1 tutoring session');
      interventions.push('Review foundational concepts');
    }
    if (factor.factor.includes('confusion')) {
      interventions.push('Simplify explanations, use more examples');
      interventions.push('Check for prerequisite gaps');
    }
    if (factor.factor.includes('engagement')) {
      interventions.push('Send motivational message to parent');
      interventions.push('Assign engaging project-based activity');
    }
    if (factor.factor.includes('classroom average')) {
      interventions.push('Pair with peer mentor');
      interventions.push('Provide additional practice materials');
    }
    if (factor.factor.includes('repeated failures')) {
      interventions.push('Identify root cause with prerequisite detective');
      interventions.push('Try alternative teaching approach');
    }
    if (factor.factor.includes('mood')) {
      interventions.push('Check in with school counselor');
      interventions.push('Reduce pressure, focus on small wins');
    }
  }

  // Remove duplicates and limit to 5
  return [...new Set(interventions)].slice(0, 5);
}


/**
 * Calculate risk score for a student based on multiple factors
 * 
 * @param student - Student profile with mastery and mood data
 * @param recentSessions - Recent learning sessions
 * @param classroomAverage - Average mastery level for the classroom
 * @returns Risk prediction with score, factors, and interventions
 */
export function calculateRiskScore(
  student: StudentProfile,
  recentSessions: LearningSession[],
  classroomAverage: number
): RiskPrediction {
  const riskFactors: RiskFactor[] = [];
  let totalRisk = 0;

  // Factor 1: Mastery trend (weight: 0.25)
  const masteryTrend = calculateMasteryTrend(recentSessions);
  if (masteryTrend < 0) {
    const factor: RiskFactor = {
      factor: 'Declining mastery trend',
      weight: 0.25,
      description: `Mastery declining at ${Math.abs(masteryTrend).toFixed(1)}% per session`
    };
    riskFactors.push(factor);
    totalRisk += 0.25 * Math.min(100, Math.abs(masteryTrend) * 10);
  }

  // Factor 2: Confusion frequency (weight: 0.20)
  if (recentSessions.length > 0) {
    const confusionRate = recentSessions.filter(s => s.confusionDetected).length / recentSessions.length;
    if (confusionRate > 0.5) {
      const factor: RiskFactor = {
        factor: 'High confusion frequency',
        weight: 0.20,
        description: `Confused in ${(confusionRate * 100).toFixed(0)}% of recent sessions`
      };
      riskFactors.push(factor);
      totalRisk += 0.20 * (confusionRate * 100);
    }
  }

  // Factor 3: Session frequency (weight: 0.15)
  const avgSessionGap = calculateAverageSessionGap(recentSessions);
  const expectedGap = 2; // days
  if (avgSessionGap > expectedGap * 2) {
    const factor: RiskFactor = {
      factor: 'Reduced engagement',
      weight: 0.15,
      description: `Average ${avgSessionGap.toFixed(1)} days between sessions`
    };
    riskFactors.push(factor);
    totalRisk += 0.15 * Math.min(100, (avgSessionGap / expectedGap) * 50);
  }


  // Factor 4: Below classroom average (weight: 0.15)
  const studentAverage = calculateAverageMastery(student.conceptMasteries);
  if (studentAverage < classroomAverage - 10) {
    const factor: RiskFactor = {
      factor: 'Below classroom average',
      weight: 0.15,
      description: `${studentAverage.toFixed(0)}% vs class average ${classroomAverage.toFixed(0)}%`
    };
    riskFactors.push(factor);
    totalRisk += 0.15 * Math.min(100, classroomAverage - studentAverage);
  }

  // Factor 5: Repeated failures (weight: 0.15)
  const repeatedFailures = findRepeatedFailures(student.conceptMasteries);
  if (repeatedFailures.length > 0) {
    const factor: RiskFactor = {
      factor: 'Repeated failures on same concepts',
      weight: 0.15,
      description: `Struggling with: ${repeatedFailures.slice(0, 3).join(', ')}`
    };
    riskFactors.push(factor);
    totalRisk += 0.15 * Math.min(100, repeatedFailures.length * 20);
  }

  // Factor 6: Mood indicators (weight: 0.10)
  const negativeMoodRate = calculateNegativeMoodRate(student.moodHistory);
  if (negativeMoodRate > 0.4) {
    const factor: RiskFactor = {
      factor: 'Negative mood patterns',
      weight: 0.10,
      description: `${(negativeMoodRate * 100).toFixed(0)}% of check-ins show anxiety/frustration`
    };
    riskFactors.push(factor);
    totalRisk += 0.10 * (negativeMoodRate * 100);
  }

  // Generate interventions
  const recommendedInterventions = generateInterventions(riskFactors);

  // Calculate confidence based on data completeness
  const dataQuality = Math.min(1, recentSessions.length / 10);
  const confidence = dataQuality * 0.8 + 0.2;

  // Determine outcome
  let predictedOutcome: 'at_risk' | 'needs_attention' | 'on_track';
  if (totalRisk > 60) {
    predictedOutcome = 'at_risk';
  } else if (totalRisk > 30) {
    predictedOutcome = 'needs_attention';
  } else {
    predictedOutcome = 'on_track';
  }

  return {
    studentId: student.studentId,
    studentName: student.name,
    riskScore: Math.min(100, totalRisk),
    riskFactors,
    recommendedInterventions,
    predictedOutcome,
    confidence
  };
}


/**
 * Run nightly predictions for all students
 * Task 15.4: REQ-4.2.1 - System SHALL run nightly risk predictions for all students
 */
export async function runNightlyPredictions(io: any): Promise<void> {
  console.log('🌙 Running nightly prediction job...');
  
  try {
    // TODO: Fetch all students from database
    // For now, this is a placeholder that will be implemented when database is connected
    console.log('✅ Nightly prediction job completed (placeholder)');
  } catch (error) {
    console.error('❌ Nightly prediction job failed:', error);
    throw error;
  }
}
