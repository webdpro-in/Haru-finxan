// Simulate the exact test case
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

const sessions = [];
const now = Date.now();
for (let i = 0; i < 5; i++) {
  sessions.push({
    sessionId: `session_${Math.random()}`,
    timestamp: new Date(now - i * 24 * 60 * 60 * 1000),
    duration: 1800,
    topicsCovered: ['Algebra'],
    questionsAsked: 5,
    confusionDetected: false,
    confusionCount: 0,
    masteryGained: { math_1: 3 }
  });
}

function findRepeatedFailures(conceptMasteries) {
  const failures = [];
  for (const mastery of conceptMasteries.values()) {
    console.log('Checking:', mastery.conceptName, 'mastery:', mastery.masteryLevel, 'success:', mastery.successRate);
    if (mastery.masteryLevel < 50 && mastery.successRate < 0.5) {
      failures.push(mastery.conceptName);
    }
  }
  return failures;
}

const failures = findRepeatedFailures(student.conceptMasteries);
console.log('Found failures:', failures);
console.log('Should have risk factor:', failures.length > 0);
