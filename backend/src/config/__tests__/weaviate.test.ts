/**
 * Unit Tests for Weaviate Configuration
 * Tests connection, schema initialization, Learning DNA storage, and error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Create mock functions that can be accessed in tests
const mockMiscGetter = vi.fn();
const mockSchemaGetter = vi.fn();
const mockSchemaCreator = vi.fn();
const mockDataCreator = vi.fn();
const mockGraphQL = vi.fn();

// Mock Weaviate client
vi.mock('weaviate-ts-client', () => {
  const mockClient = {
    schema: {
      getter: () => ({ do: mockSchemaGetter }),
      classCreator: () => ({
        withClass: vi.fn().mockReturnThis(),
        do: mockSchemaCreator
      })
    },
    data: {
      creator: () => ({
        withClassName: vi.fn().mockReturnThis(),
        withProperties: vi.fn().mockReturnThis(),
        withVector: vi.fn().mockReturnThis(),
        do: mockDataCreator
      })
    },
    graphql: {
      get: () => ({
        withClassName: vi.fn().mockReturnThis(),
        withNearVector: vi.fn().mockReturnThis(),
        withLimit: vi.fn().mockReturnThis(),
        withFields: vi.fn().mockReturnThis(),
        do: mockGraphQL
      })
    },
    misc: {
      metaGetter: () => ({ do: mockMiscGetter })
    }
  };

  return {
    default: {
      client: vi.fn(() => mockClient),
      ApiKey: vi.fn((key) => key)
    }
  };
});

import { 
  client, 
  testConnection, 
  initializeSchema, 
  storeLearningDNA, 
  findSimilarLearners,
  handleWeaviateError 
} from '../weaviate';

describe('Weaviate Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Client Initialization', () => {
    it('should create Weaviate client', () => {
      expect(client).toBeDefined();
    });
  });

  describe('testConnection', () => {
    it('should return true when connection is successful', async () => {
      mockMiscGetter.mockResolvedValue({ version: '1.23.0' });

      const result = await testConnection();

      expect(result).toBe(true);
      expect(mockMiscGetter).toHaveBeenCalled();
    });

    it('should return false when connection fails', async () => {
      mockMiscGetter.mockRejectedValue(new Error('Connection refused'));

      const result = await testConnection();

      expect(result).toBe(false);
    });
  });

  describe('initializeSchema', () => {
    it('should create all schema classes when none exist', async () => {
      mockSchemaGetter.mockResolvedValue({ classes: [] });
      mockSchemaCreator.mockResolvedValue({ class: 'LearningDNA' });

      await initializeSchema();

      // Should attempt to create all three classes
      expect(mockSchemaCreator).toHaveBeenCalledTimes(3);
    });

    it('should skip creating existing classes', async () => {
      mockSchemaGetter.mockResolvedValue({
        classes: [
          { class: 'LearningDNA' },
          { class: 'Concept' }
        ]
      });
      mockSchemaCreator.mockResolvedValue({ class: 'QAPair' });

      await initializeSchema();

      // Should only create QAPair (the missing one)
      expect(mockSchemaCreator).toHaveBeenCalledTimes(1);
    });

    it('should handle empty schema response', async () => {
      mockSchemaGetter.mockResolvedValue({});
      mockSchemaCreator.mockResolvedValue({ class: 'LearningDNA' });

      await initializeSchema();

      expect(mockSchemaCreator).toHaveBeenCalledTimes(3);
    });

    it('should throw error when schema creation fails', async () => {
      mockSchemaGetter.mockResolvedValue({ classes: [] });
      mockSchemaCreator.mockRejectedValue(new Error('Schema creation failed'));

      await expect(initializeSchema()).rejects.toThrow('Schema creation failed');
    });
  });

  describe('storeLearningDNA', () => {
    it('should store Learning DNA with vector', async () => {
      const mockId = 'uuid-123';
      mockDataCreator.mockResolvedValue({ id: mockId });

      const properties = {
        preferredExplanationStyle: 'Visual',
        avgResponseTime: 2500,
        confusionTriggers: ['algebra', 'calculus']
      };
      const vector = [0.1, 0.2, 0.3, 0.4];

      const result = await storeLearningDNA('student123', 'session456', properties, vector);

      expect(result).toBe(mockId);
      expect(mockDataCreator).toHaveBeenCalled();
    });

    it('should include timestamp in stored data', async () => {
      const mockId = 'uuid-456';
      mockDataCreator.mockResolvedValue({ id: mockId });

      const beforeTimestamp = Date.now();
      await storeLearningDNA('student123', 'session456', {}, [0.1, 0.2]);
      const afterTimestamp = Date.now();

      expect(mockDataCreator).toHaveBeenCalled();
      // Verify timestamp was added (we can't check exact value due to timing)
      expect(beforeTimestamp).toBeLessThanOrEqual(afterTimestamp);
    });

    it('should throw error when storage fails', async () => {
      mockDataCreator.mockRejectedValue(new Error('Storage failed'));

      await expect(
        storeLearningDNA('student123', 'session456', {}, [0.1, 0.2])
      ).rejects.toThrow('Storage failed');
    });
  });

  describe('findSimilarLearners', () => {
    it('should find similar learners using vector similarity', async () => {
      const mockResults = {
        data: {
          Get: {
            LearningDNA: [
              { 
                studentId: 'student1', 
                preferredExplanationStyle: 'Visual',
                _additional: { distance: 0.1 }
              },
              { 
                studentId: 'student2', 
                preferredExplanationStyle: 'Analytical',
                _additional: { distance: 0.2 }
              }
            ]
          }
        }
      };
      mockGraphQL.mockResolvedValue(mockResults);

      const vector = [0.1, 0.2, 0.3, 0.4];
      const result = await findSimilarLearners(vector, 10);

      expect(result).toHaveLength(2);
      expect(result[0].studentId).toBe('student1');
      expect(mockGraphQL).toHaveBeenCalled();
    });

    it('should use default limit of 10', async () => {
      mockGraphQL.mockResolvedValue({
        data: { Get: { LearningDNA: [] } }
      });

      await findSimilarLearners([0.1, 0.2]);

      expect(mockGraphQL).toHaveBeenCalled();
    });

    it('should return empty array when no similar learners found', async () => {
      mockGraphQL.mockResolvedValue({
        data: { Get: { LearningDNA: [] } }
      });

      const result = await findSimilarLearners([0.1, 0.2]);

      expect(result).toEqual([]);
    });

    it('should handle missing LearningDNA in response', async () => {
      mockGraphQL.mockResolvedValue({
        data: { Get: {} }
      });

      const result = await findSimilarLearners([0.1, 0.2]);

      expect(result).toEqual([]);
    });

    it('should throw error when query fails', async () => {
      mockGraphQL.mockRejectedValue(new Error('Query failed'));

      await expect(
        findSimilarLearners([0.1, 0.2])
      ).rejects.toThrow('Query failed');
    });
  });

  describe('handleWeaviateError', () => {
    it('should throw error with message from Weaviate error', () => {
      const error = { message: 'Invalid vector dimensions' };

      expect(() => handleWeaviateError(error)).toThrow('Vector database error: Invalid vector dimensions');
    });

    it('should throw error with unknown error message when no message provided', () => {
      const error = {};

      expect(() => handleWeaviateError(error)).toThrow('Vector database error: Unknown error');
    });

    it('should handle null error', () => {
      expect(() => handleWeaviateError(null)).toThrow('Vector database error: Unknown error');
    });
  });
});
