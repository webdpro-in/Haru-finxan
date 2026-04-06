import { calculateRiskScore } from './src/services/PredictiveFailureDetection.ts';

const student = {
  studentId: 'student_123',
  name: 'Test Student',
  grade: 8,
  preferredLanguage: 'en',
  conceptMasteries: new Map([
    ['math_1', { conceptId: 'concept_algebra', conceptName: 'Algebra', masteryLevel: 30, lastPracticed: new Date(), attemptsCount: 8, successRate: 0.2, prerequisites: [] }],
    ['math_2', { conceptId: 'concept_geometry', conceptName: 'Geometry', masteryLevel: 25, lastPracticed: new Date(), attemptsCount: 7, successRate: 0.15, prerequisites: [] }]
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
  moodHistory: [
    { timestamp: new Date(), mood: 'anxious', energyLevel: 1 },
    { timestamp: new Date(), mood: 'frustrated', energyLevel: 2 },
    { timestamp: new Date(), mood: 'sad', energyLevel: 1 }
  ],
  createdAt: new Date(),
  lastActiveAt: new Date(),
  streakDays: 5,
  totalLearningTime: 300
};

const sessions = [
  { sessionId: 'session_1', timestamp: new Date(), duration: 1800, topicsCovered: ['Algebra'], questionsAsked: 5, confusionDetected: true, confusionCount: 4, masteryGained: { math_1: -5, math_2: -4 } },
  { sessionId: 'session_2', timestamp: new Date(), duration: 1800, topicsCovered: ['Algebra'], questionsAsked: 5, confusionDetected: true, confusionCount: 4, masteryGained: { math_1: -5, math_2: -4 } },
  { sessionId: 'session_3', timestamp: new Date(), duration: 1800, topicsCovered: ['Algebra'], questionsAsked: 5, confusionDetected: true, confusionCount: 4, masteryGained: { math_1: -5, math_2: -4 } },
  { sessionId: 'session_4', timestamp: new Date(), duration: 1800, topicsCovered: ['Algebra'], questionsAsked: 5, confusionDetected: true, confusionCount: 4, masteryGained: { math_1: -5, math_2: -4 } },
  { sessionId: 'session_5', timestamp: new Date(), duration: 1800, topicsCovered: ['Algebra'], questionsAsked: 5, confusionDetected: true, confusionCount: 4, masteryGained: { math_1: -5, math_2: -4 } }
];

const result = calculateRiskScore(student, sessions, 75);

console.log('Risk Score:', result.riskScore);
console.log('Expected: > 60');
console.log('Predicted Outcome:', result.predictedOutcome);
console.log('Expected: at_risk');
console.log('\nRisk Factors:');
result.riskFactors.forEach(f => {
  console.log(`- ${f.factor} (weight: ${f.weight}): ${f.description}`);
});
