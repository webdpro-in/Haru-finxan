/**
 * Example usage of SocraticMode service
 * 
 * This file demonstrates how to use the Socratic Mode service
 * to generate leading questions and guide students to discover answers.
 */

import { SocraticMode, SocraticPromptOptions } from './SocraticMode';
import { SystemPromptBuilder, StudentContext, TopicContext, TeachingMode } from './SystemPromptBuilder';

// Example 1: Basic Socratic prompt generation
function example1_BasicPrompt() {
  console.log('=== Example 1: Basic Socratic Prompt ===\n');

  const options: SocraticPromptOptions = {
    studentName: 'Rahul',
    grade: 8,
    topic: 'photosynthesis',
    question: 'What is photosynthesis?'
  };

  const prompt = SocraticMode.generateSocraticPrompt(options);
  console.log(prompt);
  console.log('\n');
}

// Example 2: Socratic prompt with attempt tracking
function example2_WithAttempts() {
  console.log('=== Example 2: Socratic Prompt with Attempts ===\n');

  const options: SocraticPromptOptions = {
    studentName: 'Priya',
    grade: 9,
    topic: 'quadratic equations',
    question: 'How do I solve x² + 5x + 6 = 0?',
    attemptCount: 2,
    previousResponses: [
      'I think I need to factor it?',
      'Maybe (x + 2)(x + 3)?'
    ],
    conceptMastery: 55
  };

  const prompt = SocraticMode.generateSocraticPrompt(options);
  console.log(prompt);
  console.log('\n');
}

// Example 3: Socratic prompt with hint (after 3 attempts)
function example3_WithHint() {
  console.log('=== Example 3: Socratic Prompt with Hint ===\n');

  const options: SocraticPromptOptions = {
    studentName: 'Arjun',
    grade: 10,
    topic: 'Newton\'s laws',
    question: 'What is Newton\'s second law?',
    attemptCount: 3,
    previousResponses: [
      'Something about force?',
      'Force equals mass?',
      'Force and acceleration?'
    ],
    conceptMastery: 40
  };

  const prompt = SocraticMode.generateSocraticPrompt(options);
  console.log(prompt);
  console.log('\n');
}

// Example 4: Generate leading questions
function example4_LeadingQuestions() {
  console.log('=== Example 4: Generate Leading Questions ===\n');

  const questions1 = SocraticMode.generateLeadingQuestions(
    'photosynthesis',
    'What is photosynthesis?',
    8
  );
  console.log('Questions for "What is photosynthesis?":');
  questions1.forEach((q, i) => console.log(`${i + 1}. ${q}`));
  console.log('\n');

  const questions2 = SocraticMode.generateLeadingQuestions(
    'water cycle',
    'How does the water cycle work?',
    7
  );
  console.log('Questions for "How does the water cycle work?":');
  questions2.forEach((q, i) => console.log(`${i + 1}. ${q}`));
  console.log('\n');
}

// Example 5: Break down complex problem
function example5_BreakDownProblem() {
  console.log('=== Example 5: Break Down Complex Problem ===\n');

  const problem = 'A train travels 120 km in 2 hours. What is its average speed?';
  const questions = SocraticMode.breakDownProblem(problem, 8, 'speed and distance');

  console.log(`Problem: ${problem}\n`);
  console.log('Breakdown questions:');
  questions.forEach((q, i) => console.log(`${i + 1}. ${q}`));
  console.log('\n');
}

// Example 6: Track student attempts
function example6_TrackAttempts() {
  console.log('=== Example 6: Track Student Attempts ===\n');

  // First attempt
  let tracker = SocraticMode.trackAttempt(
    'student123',
    'question456',
    'Plants need sunlight?'
  );
  console.log('After attempt 1:', tracker);

  // Second attempt
  tracker = SocraticMode.trackAttempt(
    'student123',
    'question456',
    'Plants use sunlight to make food?',
    tracker
  );
  console.log('After attempt 2:', tracker);

  // Third attempt
  tracker = SocraticMode.trackAttempt(
    'student123',
    'question456',
    'Photosynthesis is when plants convert sunlight into energy!',
    tracker
  );
  console.log('After attempt 3:', tracker);
  console.log('\n');
}

// Example 7: Generate complete Socratic response
function example7_CompleteResponse() {
  console.log('=== Example 7: Complete Socratic Response ===\n');

  const options: SocraticPromptOptions = {
    studentName: 'Maya',
    grade: 7,
    topic: 'fractions',
    question: 'What is 1/2 + 1/4?',
    attemptCount: 1,
    previousResponses: ['I think it\'s 2/6?'],
    conceptMastery: 45
  };

  const response = SocraticMode.generateSocraticResponse(options);
  console.log('Leading Questions:');
  response.leadingQuestions.forEach((q, i) => console.log(`${i + 1}. ${q}`));
  console.log(`\nShould Provide Hint: ${response.shouldProvideHint}`);
  if (response.hint) {
    console.log(`Hint: ${response.hint}`);
  }
  console.log(`Encouragement: ${response.encouragement}`);
  console.log(`Is Discovery Moment: ${response.isDiscoveryMoment}`);
  console.log('\n');
}

// Example 8: Integration with SystemPromptBuilder
function example8_SystemPromptIntegration() {
  console.log('=== Example 8: Integration with SystemPromptBuilder ===\n');

  const studentContext: StudentContext = {
    studentId: 'student123',
    name: 'Rahul',
    grade: 9,
    preferredLanguage: 'en',
    learningStyle: 'visual',
    cognitiveLoadThreshold: 60
  };

  const topicContext: TopicContext = {
    subject: 'Mathematics',
    topic: 'Algebra',
    difficulty: 'medium',
    currentMastery: 55
  };

  const teachingMode: TeachingMode = {
    socraticMode: true
  };

  const systemPrompt = SystemPromptBuilder.buildPrompt(
    studentContext,
    topicContext,
    undefined,
    teachingMode
  );

  console.log('System Prompt with Socratic Mode:');
  console.log(systemPrompt);
  console.log('\n');
}

// Example 9: Check if hint should be provided
function example9_HintDecision() {
  console.log('=== Example 9: Hint Decision Logic ===\n');

  for (let attempts = 0; attempts <= 5; attempts++) {
    const shouldProvide = SocraticMode.shouldProvideHint(attempts);
    console.log(`After ${attempts} attempts: ${shouldProvide ? 'PROVIDE HINT' : 'Continue guiding'}`);
  }
  console.log('\n');
}

// Example 10: Celebration messages
function example10_Celebrations() {
  console.log('=== Example 10: Celebration Messages ===\n');

  console.log('Sample celebration messages:');
  for (let i = 0; i < 5; i++) {
    const celebration = SocraticMode.generateEncouragement(i, true);
    console.log(`${i + 1}. ${celebration}`);
  }
  console.log('\n');

  console.log('Sample encouragement messages:');
  for (let i = 0; i < 5; i++) {
    const encouragement = SocraticMode.generateEncouragement(i, false);
    console.log(`${i + 1}. ${encouragement}`);
  }
  console.log('\n');
}

// Run all examples
function runAllExamples() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         Socratic Mode Service - Usage Examples            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  example1_BasicPrompt();
  example2_WithAttempts();
  example3_WithHint();
  example4_LeadingQuestions();
  example5_BreakDownProblem();
  example6_TrackAttempts();
  example7_CompleteResponse();
  example8_SystemPromptIntegration();
  example9_HintDecision();
  example10_Celebrations();

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                    Examples Complete                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
}

// Export for use in other files
export {
  example1_BasicPrompt,
  example2_WithAttempts,
  example3_WithHint,
  example4_LeadingQuestions,
  example5_BreakDownProblem,
  example6_TrackAttempts,
  example7_CompleteResponse,
  example8_SystemPromptIntegration,
  example9_HintDecision,
  example10_Celebrations,
  runAllExamples
};

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples();
}
