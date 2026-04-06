#!/usr/bin/env node
/**
 * Migration CLI Tool
 * Usage: npm run migrate [command]
 * Commands:
 *   - run: Execute pending migrations
 *   - list: List all migrations and their status
 */

import { runMigrations, listMigrations } from '../database/migrationRunner.js';
import dotenv from 'dotenv';

dotenv.config();

const command = process.argv[2] || 'run';

async function main() {
  console.log('🗄️  FinxanAI Database Migration Tool\n');
  
  switch (command) {
    case 'run':
      await runMigrations();
      break;
    
    case 'list':
      await listMigrations();
      break;
    
    default:
      console.log('❌ Unknown command:', command);
      console.log('\nAvailable commands:');
      console.log('  run  - Execute pending migrations');
      console.log('  list - List all migrations and their status');
      process.exit(1);
  }
  
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});

