/**
 * Nightly Prediction Job Script
 * 
 * This script can be run manually or scheduled via cron
 * to execute nightly risk predictions for all students.
 * 
 * Usage:
 *   npm run predict:nightly
 *   or
 *   tsx src/scripts/nightlyPredictionJob.ts
 */

import dotenv from 'dotenv';
import { runNightlyPredictions } from '../services/PredictiveFailureDetection.js';

// Load environment variables
dotenv.config();

async function main() {
  console.log('🌙 Nightly Prediction Job Started');
  console.log(`⏰ Time: ${new Date().toISOString()}`);
  console.log('─'.repeat(50));
  
  try {
    await runNightlyPredictions();
    console.log('─'.repeat(50));
    console.log('✅ Nightly Prediction Job Completed Successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Nightly Prediction Job Failed:', error);
    process.exit(1);
  }
}

main();
