/**
 * Unit Tests for PrerequisiteDetector
 * Tests knowledge graph traversal, prerequisite checking, and learning path generation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PrerequisiteDetector } from '../PrerequisiteDetector';
import * as neo4jConfig from '../../config/neo4j';

// Mock Neo4j session
const mockSession = {
  run: vi.fn(),
  close: vi.fn(),
};

vi.mock('../../config/neo4j', () => ({
  getSession: vi.fn(() => mockSession),
}));

describe('PrerequisiteDetector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('8.1: Knowledge Graph Traversal (BFS)', () => {
    it('should traverse graph and return concepts in BFS order', async () => {
      mockSession.run.mockResolvedValueOnce({
        records: [
          {
            get: (key: string) => {
              const data: Record<string, any> = {
                conceptId: 'math_algebra_basics',
                conceptName: 'Algebraic Expressions',
                subject: 'math',
                grade: 7,
                difficulty: 6,
                estimatedLearningTime: 90,
                depth: 0,
              };
              return data[key];
            },
          },
          {
            get: (key: string) => {
              const data: Record<string, any> = {
                conceptId: 'math_integers',
                conceptName: 'Integers',
                subject: 'math',
                grade: 7,
                difficulty: 5,
                estimatedLearningTime: 60,
                depth: 1,
              };
              return data[key];
            },
          },
        ],
      });

      const result = await PrerequisiteDetector.traverseKnowledgeGraph('math_algebra_basics', 3);

      expect(result).toHaveLength(2);
      expect(result[0].conceptId).toBe('math_algebra_basics');
      expect(result[1].conceptId).toBe('math_integers');
      expect(mockSession.close).toHaveBeenCalled();
    });

    it('should handle empty graph traversal', async () => {
      mockSession.run.mockResolvedValueOnce({
        records: [],
      });

      const result = await PrerequisiteDetector.traverseKnowledgeGraph('nonexistent_concept');

      expect(result).toHaveLength(0);
      expect(mockSession.close).toHaveBeenCalled();
    });
  });

  describe('8.2: Prerequisite Check Algorithm', () => {
    it('should identify missing prerequisites', async () => {
      mockSession.run
        .mockResolvedValueOnce({
          records: [
            {
              get: (key: string) => {
                const data: Record<string, any> = {
                  conceptId: 'math_integers',
                  conceptName: 'Integers',
                  estimatedTime: 60,
                  strength: 0.9,
                };
                return data[key];
              },
            },
          ],
        })
        .mockResolvedValueOnce({
          records: [
            {
              get: () => 'Algebraic Expressions',
            },
          ],
        });

      const studentMasteries = new Map([['math_integers', 40]]);

      const result = await PrerequisiteDetector.checkPrerequisitesFromGraph(
        'math_algebra_basics',
        studentMasteries
      );

      expect(result.readyToLearn).toBe(false);
      expect(result.missingPrerequisites).toContain('Integers');
      expect(result.recommendedPath).toContain('Integers');
      expect(mockSession.close).toHaveBeenCalled();
    });

    it('should mark student as ready when prerequisites are met', async () => {
      mockSession.run
        .mockResolvedValueOnce({
          records: [
            {
              get: (key: string) => {
                const data: Record<string, any> = {
                  conceptId: 'math_integers',
                  conceptName: 'Integers',
                  estimatedTime: 60,
                  strength: 0.9,
                };
                return data[key];
              },
            },
          ],
        })
        .mockResolvedValueOnce({
          records: [
            {
              get: () => 'Algebraic Expressions',
            },
          ],
        });

      const studentMasteries = new Map([['math_integers', 85]]);

      const result = await PrerequisiteDetector.checkPrerequisitesFromGraph(
        'math_algebra_basics',
        studentMasteries
      );

      expect(result.readyToLearn).toBe(true);
      expect(result.missingPrerequisites).toHaveLength(0);
    });

    it('should distinguish between required and optional prerequisites', async () => {
      mockSession.run
        .mockResolvedValueOnce({
          records: [
            {
              get: (key: string) => {
                const data: Record<string, any> = {
                  conceptId: 'math_integers',
                  conceptName: 'Integers',
                  estimatedTime: 60,
                  strength: 0.9, // Required
                };
                return data[key];
              },
            },
            {
              get: (key: string) => {
                const data: Record<string, any> = {
                  conceptId: 'math_fractions',
                  conceptName: 'Fractions',
                  estimatedTime: 90,
                  strength: 0.5, // Optional
                };
                return data[key];
              },
            },
          ],
        })
        .mockResolvedValueOnce({
          records: [
            {
              get: () => 'Algebraic Expressions',
            },
          ],
        });

      const studentMasteries = new Map([
        ['math_integers', 40],
        ['math_fractions', 40],
      ]);

      const result = await PrerequisiteDetector.checkPrerequisitesFromGraph(
        'math_algebra_basics',
        studentMasteries
      );

      expect(result.missingPrerequisites).toHaveLength(2);
      expect(result.recommendedPath).toHaveLength(1); // Only required
      expect(result.recommendedPath).toContain('Integers');
    });
  });

  describe('8.3: Topological Sort for Learning Path', () => {
    it('should generate learning path in dependency order', async () => {
      mockSession.run
        .mockResolvedValueOnce({
          records: [
            {
              get: (key: string) => {
                const data: Record<string, any> = {
                  conceptId: 'math_numbers_basic',
                  conceptName: 'Numbers and Counting',
                  maxDepth: 3,
                };
                return data[key];
              },
            },
            {
              get: (key: string) => {
                const data: Record<string, any> = {
                  conceptId: 'math_addition_basic',
                  conceptName: 'Addition',
                  maxDepth: 2,
                };
                return data[key];
              },
            },
            {
              get: (key: string) => {
                const data: Record<string, any> = {
                  conceptId: 'math_integers',
                  conceptName: 'Integers',
                  maxDepth: 1,
                };
                return data[key];
              },
            },
          ],
        })
        .mockResolvedValueOnce({
          records: [
            {
              get: () => 'Algebraic Expressions',
            },
          ],
        });

      const studentMasteries = new Map([
        ['math_numbers_basic', 40],
        ['math_addition_basic', 40],
        ['math_integers', 40],
      ]);

      const path = await PrerequisiteDetector.getTopologicalLearningPath(
        'math_algebra_basics',
        studentMasteries
      );

      expect(path).toHaveLength(4);
      expect(path[0]).toBe('Numbers and Counting');
      expect(path[1]).toBe('Addition');
      expect(path[2]).toBe('Integers');
      expect(path[3]).toBe('Algebraic Expressions');
    });

    it('should skip already mastered concepts', async () => {
      mockSession.run
        .mockResolvedValueOnce({
          records: [
            {
              get: (key: string) => {
                const data: Record<string, any> = {
                  conceptId: 'math_numbers_basic',
                  conceptName: 'Numbers and Counting',
                  maxDepth: 2,
                };
                return data[key];
              },
            },
            {
              get: (key: string) => {
                const data: Record<string, any> = {
                  conceptId: 'math_integers',
                  conceptName: 'Integers',
                  maxDepth: 1,
                };
                return data[key];
              },
            },
          ],
        })
        .mockResolvedValueOnce({
          records: [
            {
              get: () => 'Algebraic Expressions',
            },
          ],
        });

      const studentMasteries = new Map([
        ['math_numbers_basic', 90], // Already mastered
        ['math_integers', 40],
      ]);

      const path = await PrerequisiteDetector.getTopologicalLearningPath(
        'math_algebra_basics',
        studentMasteries
      );

      expect(path).toHaveLength(2);
      expect(path).not.toContain('Numbers and Counting');
      expect(path).toContain('Integers');
    });
  });

  describe('8.4: Missing Prerequisite Identification', () => {
    it('should identify all missing prerequisites recursively', async () => {
      mockSession.run.mockResolvedValueOnce({
        records: [
          {
            get: (key: string) => {
              const data: Record<string, any> = {
                conceptId: 'math_integers',
                conceptName: 'Integers',
                estimatedTime: 60,
              };
              return data[key];
            },
          },
          {
            get: (key: string) => {
              const data: Record<string, any> = {
                conceptId: 'math_numbers_basic',
                conceptName: 'Numbers and Counting',
                estimatedTime: 30,
              };
              return data[key];
            },
          },
        ],
      });

      const studentMasteries = new Map([
        ['math_integers', 40],
        ['math_numbers_basic', 30],
      ]);

      const missing = await PrerequisiteDetector.identifyMissingPrerequisites(
        'math_algebra_basics',
        studentMasteries
      );

      expect(missing).toHaveLength(2);
      expect(missing.map(p => p.conceptName)).toContain('Integers');
      expect(missing.map(p => p.conceptName)).toContain('Numbers and Counting');
    });

    it('should respect custom mastery threshold', async () => {
      mockSession.run.mockResolvedValueOnce({
        records: [
          {
            get: (key: string) => {
              const data: Record<string, any> = {
                conceptId: 'math_integers',
                conceptName: 'Integers',
                estimatedTime: 60,
              };
              return data[key];
            },
          },
        ],
      });

      const studentMasteries = new Map([['math_integers', 70]]);

      const missing = await PrerequisiteDetector.identifyMissingPrerequisites(
        'math_algebra_basics',
        studentMasteries,
        80 // Higher threshold
      );

      expect(missing).toHaveLength(1);
      expect(missing[0].conceptName).toBe('Integers');
    });
  });

  describe('8.5: Prerequisite Prompt Generation', () => {
    it('should generate teaching prompt for missing prerequisites', () => {
      const check = {
        topic: 'Algebraic Expressions',
        prerequisites: [],
        missingPrerequisites: ['Integers', 'Addition'],
        readyToLearn: false,
        recommendedPath: ['Integers', 'Addition'],
      };

      const prompt = PrerequisiteDetector.generatePrerequisitePrompt(check);

      expect(prompt).toContain('PREREQUISITE GAP DETECTED');
      expect(prompt).toContain('Algebraic Expressions');
      expect(prompt).toContain('Integers');
      expect(prompt).toContain('TEACHING STRATEGY');
    });

    it('should return empty string when ready to learn', () => {
      const check = {
        topic: 'Algebraic Expressions',
        prerequisites: [],
        missingPrerequisites: [],
        readyToLearn: true,
        recommendedPath: [],
      };

      const prompt = PrerequisiteDetector.generatePrerequisitePrompt(check);

      expect(prompt).toBe('');
    });
  });

  describe('8.6: Cycle Detection', () => {
    it('should detect circular dependencies', async () => {
      mockSession.run.mockResolvedValueOnce({
        records: [
          {
            get: () => ['Concept A', 'Concept B', 'Concept C', 'Concept A'],
          },
        ],
      });

      const cycles = await PrerequisiteDetector.detectCycles();

      expect(cycles).toHaveLength(1);
      expect(cycles[0]).toContain('Concept A');
      expect(cycles[0][0]).toBe(cycles[0][cycles[0].length - 1]);
    });

    it('should detect cycles for specific concept', async () => {
      mockSession.run.mockResolvedValueOnce({
        records: [
          {
            get: () => ['Algebra', 'Calculus', 'Algebra'],
          },
        ],
      });

      const cycles = await PrerequisiteDetector.detectCycles('math_algebra_basics');

      expect(cycles).toHaveLength(1);
      expect(cycles[0]).toContain('Algebra');
    });

    it('should return empty array when no cycles exist', async () => {
      mockSession.run.mockResolvedValueOnce({
        records: [],
      });

      const cycles = await PrerequisiteDetector.detectCycles();

      expect(cycles).toHaveLength(0);
    });
  });

  describe('Find Concept by Name or ID', () => {
    it('should find concept by exact ID', async () => {
      mockSession.run.mockResolvedValueOnce({
        records: [
          {
            get: () => 'math_algebra_basics',
          },
        ],
      });

      const conceptId = await PrerequisiteDetector.findConceptId('math_algebra_basics');

      expect(conceptId).toBe('math_algebra_basics');
    });

    it('should find concept by partial name match', async () => {
      mockSession.run.mockResolvedValueOnce({
        records: [
          {
            get: () => 'math_algebra_basics',
          },
        ],
      });

      const conceptId = await PrerequisiteDetector.findConceptId('algebra');

      expect(conceptId).toBe('math_algebra_basics');
    });

    it('should return null for non-existent concept', async () => {
      mockSession.run.mockResolvedValueOnce({
        records: [],
      });

      const conceptId = await PrerequisiteDetector.findConceptId('nonexistent');

      expect(conceptId).toBeNull();
    });
  });

  describe('Legacy Methods (Backward Compatibility)', () => {
    it('should check prerequisites using static map', () => {
      const studentMasteries = new Map([
        ['arithmetic', 40],
        ['fractions', 40],
      ]);

      const check = PrerequisiteDetector.checkPrerequisites('algebra', studentMasteries);

      expect(check.readyToLearn).toBe(false);
      expect(check.missingPrerequisites.length).toBeGreaterThan(0);
    });

    it('should extract topic from question', () => {
      const topic1 = PrerequisiteDetector.extractTopic('Can you explain algebra?');
      const topic2 = PrerequisiteDetector.extractTopic('What is photosynthesis?');
      const topic3 = PrerequisiteDetector.extractTopic('How does electricity work?');

      expect(topic1).toContain('algebra');
      expect(topic2).toContain('photosynthesis');
      expect(topic3).toContain('electricity');
    });

    it('should get learning path using static map', () => {
      const studentMasteries = new Map([
        ['arithmetic', 40],
        ['fractions', 40],
      ]);

      const path = PrerequisiteDetector.getLearningPath('algebra', studentMasteries);

      expect(path.length).toBeGreaterThan(0);
      expect(path[path.length - 1]).toContain('algebra');
    });
  });
});
