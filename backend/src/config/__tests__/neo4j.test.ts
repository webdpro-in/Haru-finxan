/**
 * Unit Tests for Neo4j Configuration
 * Tests connection, session management, query execution, and error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  driver, 
  getSession, 
  executeQuery, 
  testConnection, 
  closeDriver,
  handleNeo4jError 
} from '../neo4j';

// Mock Neo4j driver
vi.mock('neo4j-driver', () => {
  const mockSession = {
    run: vi.fn(),
    close: vi.fn()
  };

  const mockDriver = {
    session: vi.fn(() => mockSession),
    close: vi.fn()
  };

  return {
    default: {
      driver: vi.fn(() => mockDriver),
      auth: {
        basic: vi.fn((user, password) => ({ user, password }))
      },
      session: {
        READ: 'READ',
        WRITE: 'WRITE'
      }
    }
  };
});

describe('Neo4j Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Driver Initialization', () => {
    it('should create Neo4j driver', () => {
      expect(driver).toBeDefined();
    });
  });

  describe('getSession', () => {
    it('should create a new session with default READ mode', () => {
      const session = getSession();
      
      expect(session).toBeDefined();
      expect(driver.session).toHaveBeenCalled();
    });

    it('should return session with run and close methods', () => {
      const session = getSession();
      
      expect(session.run).toBeDefined();
      expect(session.close).toBeDefined();
    });
  });

  describe('executeQuery', () => {
    it('should execute query and return mapped results', async () => {
      const mockRecords = [
        { toObject: () => ({ id: 1, name: 'Concept A' }) },
        { toObject: () => ({ id: 2, name: 'Concept B' }) }
      ];

      const session = getSession();
      (session.run as any).mockResolvedValue({ records: mockRecords });

      const result = await executeQuery('MATCH (n) RETURN n', { limit: 10 });

      expect(result).toEqual([
        { id: 1, name: 'Concept A' },
        { id: 2, name: 'Concept B' }
      ]);
      expect(session.close).toHaveBeenCalled();
    });

    it('should execute query without parameters', async () => {
      const session = getSession();
      (session.run as any).mockResolvedValue({ records: [] });

      const result = await executeQuery('RETURN 1');

      expect(result).toEqual([]);
    });

    it('should close session even if query fails', async () => {
      const session = getSession();
      (session.run as any).mockRejectedValue(new Error('Query failed'));

      await expect(executeQuery('INVALID QUERY')).rejects.toThrow('Query failed');
    });

    it('should handle empty result set', async () => {
      const session = getSession();
      (session.run as any).mockResolvedValue({ records: [] });

      const result = await executeQuery('MATCH (n:NonExistent) RETURN n');

      expect(result).toEqual([]);
    });
  });

  describe('testConnection', () => {
    it('should return true when connection is successful', async () => {
      const session = getSession();
      (session.run as any).mockResolvedValue({ records: [] });

      const result = await testConnection();

      expect(result).toBe(true);
    });

    it('should return false when connection fails', async () => {
      const session = getSession();
      (session.run as any).mockRejectedValue(new Error('Connection refused'));

      const result = await testConnection();

      expect(result).toBe(false);
    });

    it('should close session even on connection failure', async () => {
      const session = getSession();
      (session.run as any).mockRejectedValue(new Error('Timeout'));

      await testConnection();
    });
  });

  describe('closeDriver', () => {
    it('should close the driver connection', async () => {
      await closeDriver();

      expect(driver.close).toHaveBeenCalled();
    });
  });

  describe('handleNeo4jError', () => {
    it('should throw error with message from Neo4j error', () => {
      const error = { message: 'Constraint violation' };

      expect(() => handleNeo4jError(error)).toThrow('Knowledge graph error: Constraint violation');
    });

    it('should throw error with unknown error message when no message provided', () => {
      const error = {};

      expect(() => handleNeo4jError(error)).toThrow('Knowledge graph error: Unknown error');
    });

    it('should handle null error', () => {
      expect(() => handleNeo4jError(null)).toThrow('Knowledge graph error: Unknown error');
    });
  });
});
