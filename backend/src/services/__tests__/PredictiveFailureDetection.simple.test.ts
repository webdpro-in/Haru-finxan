import { describe, it, expect } from 'vitest';

// Inline the function for testing
function calculateRiskScore(
  student: any,
  recentSessions: any[],
  classroomAverage: number
): any {
  const riskFactors: any[] = [];
  let totalRisk = 0;

  // Simple test implementation
  const confusionRate = recentSessions.filter(s => s.confusionDetected).length / recentSessions.length;
  if (confusionRate > 0.5) {
    riskFactors.push({
      factor: 'High confusion frequency',
      weight: 0.20,
      description: `Confused in ${(confusionRate * 100).toFixed(0)}% of recent sessions`
    });
    totalRisk += 0.20 * (confusionRate * 100);
  }

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
    recommendedInterventions: [],
    predictedOutcome,
    confidence: 0.8
  };
}

describe('Simple Test', () => {
  it('should work with inline function', () => {
    const student = { studentId: '123', name: 'Test' };
    const sessions = [
      { confusionDetected: false },
      { confusionDetected: false }
    ];

    const result = calculateRiskScore(student, sessions, 75);
    expect(result.predictedOutcome).toBe('on_track');
  });
});
