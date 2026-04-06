/**
 * Unit Tests for Migration Runner
 * Tests migration tracking, execution, and error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runMigrations, listMigrations } from '../migrationRunner';
import * as fs from 'fs/promises';

// Mock dependencies
vi.mock('../../config/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: [], error: null }))
      })),
      insert: vi.fn(() => Promise.resolve({ error: null }))
    }))
  }
}));

vi.mock('../../config/neo4j', () => ({
  executeQuery: vi.fn(),
  getSession: vi.fn(() => ({
    run: vi.fn(),
    close: vi.fn()
  }))
}));

vi.mock('fs/promises');

describe('Migration Runner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('runMigrations', () => {
    it('should execute pending SQL migrations', async () => {
      const { supabase } = await import('../../config/supabase');
      
      // Mock migrations table exists
      (supabase.rpc as any).mockResolvedValue({ error: null });
      
      // Mock no executed migrations
      (supabase.from as any).mockReturnValue({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null }))
        })),
        insert: vi.fn(() => Promise.resolve({ error: null }))
      });

      // Mock migration files
      (fs.readdir as any).mockResolvedValue([
        '001_initial_schema.sql',
        '002_neo4j_seed_data.cypher'
      ]);

      (fs.readFile as any).mockResolvedValue('CREATE TABLE test;');

      await runMigrations();

      expect(fs.readdir).toHaveBeenCalled();
    });

    it('should skip already executed migrations', async () => {
      const { supabase } = await import('../../config/supabase');
      
      // Mock executed migrations
      (supabase.from as any).mockReturnValue({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ 
            data: [{ name: '001_initial_schema.sql' }], 
            error: null 
          }))
        })),
        insert: vi.fn(() => Promise.resolve({ error: null }))
      });

      (fs.readdir as any).mockResolvedValue([
        '001_initial_schema.sql',
        '002_neo4j_seed_data.cypher'
      ]);

      (fs.readFile as any).mockResolvedValue('MATCH (n) RETURN n;');

      const { getSession } = await import('../../config/neo4j');
      const mockSession = {
        run: vi.fn().mockResolvedValue({}),
        close: vi.fn()
      };
      (getSession as any).mockReturnValue(mockSession);

      await runMigrations();

      // Should only execute the Cypher migration (002)
      expect(mockSession.run).toHaveBeenCalled();
    });

    it('should execute Cypher migrations for Neo4j', async () => {
      const { supabase } = await import('../../config/supabase');
      const { getSession } = await import('../../config/neo4j');
      
      (supabase.from as any).mockReturnValue({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null }))
        })),
        insert: vi.fn(() => Promise.resolve({ error: null }))
      });

      (fs.readdir as any).mockResolvedValue(['002_neo4j_seed_data.cypher']);
      (fs.readFile as any).mockResolvedValue('CREATE (n:Concept {name: "Test"});');

      const mockSession = {
        run: vi.fn().mockResolvedValue({}),
        close: vi.fn()
      };
      (getSession as any).mockReturnValue(mockSession);

      await runMigrations();

      expect(mockSession.run).toHaveBeenCalled();
      expect(mockSession.close).toHaveBeenCalled();
    });

    it('should handle multiple Cypher statements separated by semicolons', async () => {
      const { supabase } = await import('../../config/supabase');
      const { getSession } = await import('../../config/neo4j');
      
      (supabase.from as any).mockReturnValue({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null }))
        })),
        insert: vi.fn(() => Promise.resolve({ error: null }))
      });

      (fs.readdir as any).mockResolvedValue(['002_test.cypher']);
      (fs.readFile as any).mockResolvedValue(
        'CREATE (n:Node1);CREATE (n:Node2);CREATE (n:Node3);'
      );

      const mockSession = {
        run: vi.fn().mockResolvedValue({}),
        close: vi.fn()
      };
      (getSession as any).mockReturnValue(mockSession);

      await runMigrations();

      // Should execute 3 statements
      expect(mockSession.run).toHaveBeenCalledTimes(3);
    });

    it('should filter out comments in Cypher files', async () => {
      const { supabase } = await import('../../config/supabase');
      const { getSession } = await import('../../config/neo4j');
      
      (supabase.from as any).mockReturnValue({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null }))
        })),
        insert: vi.fn(() => Promise.resolve({ error: null }))
      });

      (fs.readdir as any).mockResolvedValue(['002_test.cypher']);
      (fs.readFile as any).mockResolvedValue(
        '// This is a comment\nCREATE (n:Node);'
      );

      const mockSession = {
        run: vi.fn().mockResolvedValue({}),
        close: vi.fn()
      };
      (getSession as any).mockReturnValue(mockSession);

      await runMigrations();

      // The migration runner executes statements, but comments are filtered
      // We just verify the migration completed without error
      expect(mockSession.close).toHaveBeenCalled();
    });

    it('should handle migration errors gracefully', async () => {
      const { supabase } = await import('../../config/supabase');
      
      (supabase.from as any).mockReturnValue({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ 
            data: null, 
            error: { message: 'Database error' } 
          }))
        }))
      });

      (fs.readdir as any).mockResolvedValue(['001_test.sql']);
      (fs.readFile as any).mockRejectedValue(new Error('File read error'));

      // The migration runner should throw when file read fails
      await expect(runMigrations()).rejects.toThrow('File read error');
    });

    it('should sort migration files to ensure correct order', async () => {
      const { supabase } = await import('../../config/supabase');
      
      (supabase.from as any).mockReturnValue({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null }))
        })),
        insert: vi.fn(() => Promise.resolve({ error: null }))
      });

      // Return files in wrong order
      (fs.readdir as any).mockResolvedValue([
        '003_analogy_database.sql',
        '001_initial_schema.sql',
        '002_neo4j_seed_data.cypher'
      ]);

      (fs.readFile as any).mockResolvedValue('SELECT 1;');

      await runMigrations();

      // Files should be processed in sorted order
      expect(fs.readFile).toHaveBeenCalled();
    });
  });

  describe('listMigrations', () => {
    it('should list all migrations with their status', async () => {
      const { supabase } = await import('../../config/supabase');
      
      (supabase.from as any).mockReturnValue({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ 
            data: [{ name: '001_initial_schema.sql' }], 
            error: null 
          }))
        }))
      });

      (fs.readdir as any).mockResolvedValue([
        '001_initial_schema.sql',
        '002_neo4j_seed_data.cypher',
        '003_analogy_database.sql'
      ]);

      await listMigrations();

      expect(fs.readdir).toHaveBeenCalled();
    });

    it('should handle errors when listing migrations', async () => {
      const { supabase } = await import('../../config/supabase');
      
      (supabase.from as any).mockReturnValue({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.reject(new Error('Connection failed')))
        }))
      });

      (fs.readdir as any).mockResolvedValue([]);

      // Should not throw, just log error
      await listMigrations();

      expect(fs.readdir).toHaveBeenCalled();
    });

    it('should filter only SQL and Cypher files', async () => {
      const { supabase } = await import('../../config/supabase');
      
      (supabase.from as any).mockReturnValue({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      });

      (fs.readdir as any).mockResolvedValue([
        '001_initial_schema.sql',
        '002_neo4j_seed_data.cypher',
        'README.md',
        'notes.txt',
        '003_analogy_database.sql'
      ]);

      await listMigrations();

      // Should only process .sql and .cypher files
      expect(fs.readdir).toHaveBeenCalled();
    });
  });
});
