import { calculateRiskScore } from './src/services/PredictiveFailureDetection.ts';

const student = {
  studentId: 'student_123',
  name: 'Test Student',
  grade: 8,
  preferredLanguage: 'en',
  conceptMasteries: new Map([
    ['math_1', { conceptId: 'concept_algebra', conceptName: 'Algebra', masteryLevel: 55, lastPracticed: new Date(), attemptsCount: 5, successRate: 0.6, prerequisites: [] }]
  ]),
  weakConcepts: [],
  strongConcepts: [],
  learningStyle: 'mixed',
  averageSessionDuration: 1800,
  preferredDifficulty: 'medium',
  totalSessions: 10,
  totalQuestionsAsked: 50,
  recentSessions: [],
  confusionTriggers: [],
  hesitationPatterns: [],
  moodHistory: [],
  createdAt: new Date(),
  lastActiveAt: new Date(),
  streakDays: 5,
  totalLearningTime: 300
};

const sessions = [
  { sessionId: 'session_1', timestamp: new Date(), duration: 1800, topicsCovered: ['Algebra'], questionsAsked: 5, confusionDetected: true, confusionCount: 2, masteryGained: { math_1: 3 } },
  { sessionId: 'session_2', timestamp: new Date(), duration: 1800, topicsCovered: ['Algebra'], questionsAsked: 5, confusionDetected: true, confusionCount: 2, masteryGained: { math_1: 3 } },
  { sessionId: 'session_3', timestamp: new Date(), duration: 1800, topicsCovered: ['Algebra'], questionsAsked: 5, confusionDetected: true, confusionCount: 2, masteryGained: { math_1: 3 } },
  { sessionId: 'session_4', timestamp: new Date(), duration: 1800, topicsCovered: ['Algebra'], questionsAsked: 5, confusionDetected: true, confusionCount: 2, masteryGained: { math_1: 3 } },
  { sessionId: 'session_5', timestamp: new Date(), duration: 1800, topicsCovered: ['Algebra'], questionsAsked: 5, confusionDetected: true, confusionCount: 2, masteryGained: { math_1: 3 } }
];

const result = calculateRiskScore(student, sessions, 75);

console.log('Risk Score:', result.riskScore);
console.log('Expected: 30-60');
console.log('Predicted Outcome:', result.predictedOutcome);
console.log('Expected: needs_attention');
console.log('\nRisk Factors:');
result.riskFactors.forEach(f => {
  console.log(`- ${f.factor} (weight: ${f.weight}): ${f.description}`);
});
console.log('\nCalculation breakdown:');
console.log('- Student average mastery:', 55);
console.log('- Classroom average:', 75);
console.log('- Difference:', 20);
console.log('- Confusion rate:', '100% (5/5 sessions)');
console.log('- Expected risk from confusion: 0.20 * 100 = 20');
console.log('- Expected risk from below average: 0.15 * 20 = 3');
console.log('- Expected total: 23');
