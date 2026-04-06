import { calculateRiskScore } from './src/services/PredictiveFailureDetection.ts';

const student = {
  studentId: 'student_123',
  name: 'Test Student',
  grade: 8,
  preferredLanguage: 'en',
  conceptMasteries: new Map([
    ['math_1', { conceptId: 'concept_algebra', conceptName: 'Algebra', masteryLevel: 40, lastPracticed: new Date(), attemptsCount: 5, successRate: 0.3, prerequisites: [] }],
    ['math_2', { conceptId: 'concept_geometry', conceptName: 'Geometry', masteryLevel: 35, lastPracticed: new Date(), attemptsCount: 6, successRate: 0.25, prerequisites: [] }]
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
  { sessionId: 'session_1', timestamp: new Date(), duration: 1800, topicsCovered: ['Algebra'], questionsAsked: 5, confusionDetected: false, confusionCount: 0, masteryGained: { math_1: 3 } },
  { sessionId: 'session_2', timestamp: new Date(), duration: 1800, topicsCovered: ['Algebra'], questionsAsked: 5, confusionDetected: false, confusionCount: 0, masteryGained: { math_1: 3 } },
  { sessionId: 'session_3', timestamp: new Date(), duration: 1800, topicsCovered: ['Algebra'], questionsAsked: 5, confusionDetected: false, confusionCount: 0, masteryGained: { math_1: 3 } },
  { sessionId: 'session_4', timestamp: new Date(), duration: 1800, topicsCovered: ['Algebra'], questionsAsked: 5, confusionDetected: false, confusionCount: 0, masteryGained: { math_1: 3 } },
  { sessionId: 'session_5', timestamp: new Date(), duration: 1800, topicsCovered: ['Algebra'], questionsAsked: 5, confusionDetected: false, confusionCount: 0, masteryGained: { math_1: 3 } }
];

const result = calculateRiskScore(student, sessions, 75);

console.log('Risk Score:', result.riskScore);
console.log('Risk Factors:', result.riskFactors);
console.log('Interventions:', result.recommendedInterventions);
console.log('Predicted Outcome:', result.predictedOutcome);
console.log('\nChecking repeated failures:');
console.log('Concept Masteries:', Array.from(student.conceptMasteries.entries()));

console.log('\nChecking intervention generation:');
for (const factor of result.riskFactors) {
  console.log(`Factor: "${factor.factor}"`);
  console.log(`  Includes "repeated failures": ${factor.factor.includes('repeated failures')}`);
  console.log(`  Includes "classroom average": ${factor.factor.includes('classroom average')}`);
}
