const conceptMasteries = new Map([
  ['math_1', { conceptId: 'concept_algebra', conceptName: 'Algebra', masteryLevel: 40, lastPracticed: new Date(), attemptsCount: 5, successRate: 0.3, prerequisites: [] }],
  ['math_2', { conceptId: 'concept_geometry', conceptName: 'Geometry', masteryLevel: 35, lastPracticed: new Date(), attemptsCount: 6, successRate: 0.25, prerequisites: [] }]
]);

function findRepeatedFailures(conceptMasteries) {
  const failures = [];
  for (const mastery of conceptMasteries.values()) {
    console.log('Checking mastery:', mastery.conceptName, 'level:', mastery.masteryLevel, 'success:', mastery.successRate);
    if (mastery.masteryLevel < 50 && mastery.successRate < 0.5) {
      failures.push(mastery.conceptName);
    }
  }
  return failures;
}

const result = findRepeatedFailures(conceptMasteries);
console.log('Repeated failures:', result);
