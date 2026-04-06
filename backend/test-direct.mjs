import fs from 'fs';

const content = fs.readFileSync('./src/services/CognitiveLoadMeter.ts', 'utf-8');
console.log('File contains "Factor 4: Detect filler words":', content.includes('Factor 4: Detect filler words'));
console.log('File contains "complexityScore += Math.min(20, fillerCount * 5)":', content.includes('complexityScore += Math.min(20, fillerCount * 5)'));
console.log('\nFirst 100 chars of analyzeMessageComplexity:');
const startIdx = content.indexOf('static analyzeMessageComplexity');
console.log(content.substring(startIdx, startIdx + 500));
