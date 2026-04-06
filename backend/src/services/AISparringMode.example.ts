/**
 * Example usage of AI Sparring Mode
 * 
 * Demonstrates how to use the AISparringMode service to generate
 * counter-arguments and engage students in intellectual debate.
 */

import { AISparringMode } from './AISparringMode.js';
import { GeminiClient } from './GeminiClient.js';

// Example 1: Basic counter-argument generation
async function basicSparringExample() {
  const geminiClient = new GeminiClient({
    apiKey: process.env.GEMINI_API_KEY || '',
    model: 'gemini-1.5-flash'
  });

  const sparringMode = new AISparringMode(geminiClient);

  const counterArgument = await sparringMode.generateCounterArgument({
    studentArgument: 'I think homework is useless because we already learn everything in class',
    topic: 'Education and Learning',
    studentName: 'Alice',
    grade: 8
  });

  console.log('Counter-argument:', counterArgument);
}

// Example 2: Ongoing debate with context
async function ongoingDebateExample() {
  const geminiClient = new GeminiClient({
    apiKey: process.env.GEMINI_API_KEY || '',
    model: 'gemini-1.5-flash'
  });

  const sparringMode = new AISparringMode(geminiClient);

  // Simulate an ongoing debate
  const previousArguments = [
    'Homework is useless',
    'We already learn everything in class',
    'It just takes up our free time'
  ];

  const counterArgument = await sparringMode.generateCounterArgument({
    studentArgument: 'But that still doesn\'t prove homework is necessary',
    topic: 'Education and Learning',
    studentName: 'Alice',
    grade: 8,
    previousArguments,
    debateContext: 'Discussing the value of homework in modern education'
  });

  console.log('Counter-argument with context:', counterArgument);
}

// Example 3: Structured response
async function structuredResponseExample() {
  const geminiClient = new GeminiClient({
    apiKey: process.env.GEMINI_API_KEY || '',
    model: 'gemini-1.5-flash'
  });

  const sparringMode = new AISparringMode(geminiClient);

  const response = await sparringMode.generateStructuredCounterArgument({
    studentArgument: 'Social media does more harm than good',
    topic: 'Technology and Society',
    studentName: 'Bob',
    grade: 10
  });

  console.log('Acknowledgment:', response.acknowledgment);
  console.log('Challenge:', response.challenge);
  console.log('Encouragement:', response.encouragement);
}

// Example 4: Validating counter-arguments
function validationExample() {
  const goodCounterArgument = "That's an interesting point. However, have you considered the alternative perspective? What if we looked at this differently?";
  const poorCounterArgument = "I disagree.";

  console.log('Good counter-argument valid?', AISparringMode.isValidCounterArgument(goodCounterArgument));
  console.log('Poor counter-argument valid?', AISparringMode.isValidCounterArgument(poorCounterArgument));
}

// Example 5: Integration with system prompt builder
function systemPromptIntegration() {
  const config = AISparringMode.getSparringModeConfig();
  console.log('Sparring mode config:', config);
  
  // This config can be used in SystemPromptBuilder to enable sparring mode
  // systemPromptBuilder.withSparringMode(config);
}

// Run examples (commented out to prevent execution during import)
// basicSparringExample();
// ongoingDebateExample();
// structuredResponseExample();
// validationExample();
// systemPromptIntegration();

export {
  basicSparringExample,
  ongoingDebateExample,
  structuredResponseExample,
  validationExample,
  systemPromptIntegration
};
