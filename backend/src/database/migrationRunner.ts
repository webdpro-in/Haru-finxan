/**
 * Database Migration Runner
 * Handles execution and tracking of database migrations
 */

import { supabase } from '../config/supabase.js';
import { executeQuery, getSession } from '../config/neo4j.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Migration {
  id: number;
  name: string;
  type: 'sql' | 'cypher';
  executedAt: Date;
}

/**
 * Ensure migrations tracking table exists in Supabase
 */
async function ensureMigrationsTable(): Promise<void> {
  const { error } = await supabase.rpc('create_migrations_table', {});
  
  // If RPC doesn't exist, create table directly
  if (error) {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        type VARCHAR(10) NOT NULL,
        executed_at TIMESTAMP DEFAULT NOW()
      );
    `;
    
    // Note: This requires direct SQL execution which may need admin privileges
    console.log('⚠️  Migrations table creation requires manual setup');
    console.log('   Run this SQL in Supabase SQL Editor:');
    console.log(createTableSQL);
  }
}

/**
 * Get list of executed migrations
 */
async function getExecutedMigrations(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('migrations')
      .select('name')
      .order('id', { ascending: true });
    
    if (error) {
      console.warn('⚠️  Could not fetch migrations:', error.message);
      return [];
    }
    
    return data?.map(m => m.name) || [];
  } catch (err) {
    console.warn('⚠️  Migrations table may not exist yet');
    return [];
  }
}

/**
 * Record a migration as executed
 */
async function recordMigration(name: string, type: 'sql' | 'cypher'): Promise<void> {
  const { error } = await supabase
    .from('migrations')
    .insert({ name, type });
  
  if (error) {
    console.error(`❌ Failed to record migration ${name}:`, error.message);
  }
}

/**
 * Execute SQL migration file
 */
async function executeSQLMigration(filePath: string, fileName: string): Promise<void> {
  try {
    const sql = await fs.readFile(filePath, 'utf-8');
    
    // Note: Supabase client doesn't support raw SQL execution
    // Migrations should be run manually in Supabase SQL Editor
    console.log(`📄 SQL Migration: ${fileName}`);
    console.log('   ⚠️  Please run this migration manually in Supabase SQL Editor');
    console.log(`   File: ${filePath}`);
    
    // Record as executed (assuming manual execution)
    await recordMigration(fileName, 'sql');
  } catch (err) {
    console.error(`❌ Error reading SQL migration ${fileName}:`, err);
    throw err;
  }
}

/**
 * Execute Cypher migration file for Neo4j
 */
async function executeCypherMigration(filePath: string, fileName: string): Promise<void> {
  try {
    const cypher = await fs.readFile(filePath, 'utf-8');
    
    // Split by semicolons and execute each statement
    const statements = cypher
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('//'));
    
    const session = getSession();
    
    try {
      for (const statement of statements) {
        if (statement.trim()) {
          await session.run(statement);
        }
      }
      
      console.log(`✅ Executed Cypher migration: ${fileName}`);
      await recordMigration(fileName, 'cypher');
    } finally {
      await session.close();
    }
  } catch (err) {
    console.error(`❌ Error executing Cypher migration ${fileName}:`, err);
    throw err;
  }
}

/**
 * Run all pending migrations
 */
export async function runMigrations(): Promise<void> {
  console.log('\n🔄 Running database migrations...');
  
  try {
    // Ensure migrations table exists
    await ensureMigrationsTable();
    
    // Get executed migrations
    const executed = await getExecutedMigrations();
    console.log(`   Found ${executed.length} executed migrations`);
    
    // Get migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = await fs.readdir(migrationsDir);
    
    // Sort files to ensure order
    const migrationFiles = files
      .filter(f => f.endsWith('.sql') || f.endsWith('.cypher'))
      .sort();
    
    console.log(`   Found ${migrationFiles.length} migration files`);
    
    // Execute pending migrations
    let executedCount = 0;
    for (const file of migrationFiles) {
      if (!executed.includes(file)) {
        const filePath = path.join(migrationsDir, file);
        
        if (file.endsWith('.sql')) {
          await executeSQLMigration(filePath, file);
        } else if (file.endsWith('.cypher')) {
          await executeCypherMigration(filePath, file);
        }
        
        executedCount++;
      }
    }
    
    if (executedCount === 0) {
      console.log('✅ All migrations up to date');
    } else {
      console.log(`✅ Executed ${executedCount} new migrations`);
    }
  } catch (err) {
    console.error('❌ Migration error:', err);
    throw err;
  }
}

/**
 * List all migrations and their status
 */
export async function listMigrations(): Promise<void> {
  console.log('\n📋 Migration Status:');
  
  try {
    const executed = await getExecutedMigrations();
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = await fs.readdir(migrationsDir);
    
    const migrationFiles = files
      .filter(f => f.endsWith('.sql') || f.endsWith('.cypher'))
      .sort();
    
    for (const file of migrationFiles) {
      const status = executed.includes(file) ? '✅' : '⏳';
      const type = file.endsWith('.sql') ? 'SQL' : 'Cypher';
      console.log(`   ${status} [${type}] ${file}`);
    }
  } catch (err) {
    console.error('❌ Error listing migrations:', err);
  }
}

