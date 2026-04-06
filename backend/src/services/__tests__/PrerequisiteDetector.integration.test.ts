/**
 * Integration Tests for PrerequisiteDetector with Neo4j
 * These tests require a running Neo4j instance with seed data
 * 
 * Run with: npm test -- PrerequisiteDetector.integration.test.ts
 * Set NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD in .env for real testing
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { PrerequisiteDetector } from '../PrerequisiteDetector';
import { testConnection } from '../../config/neo4j';

// Skip these tests if Neo4j is not configured
const skipIfNoNeo4j = process.env.NEO4J_URI ? describe : describe.skip;

skipIfNoNeo4j('PrerequisiteDetector Integration Tests', () => {
  beforeAll(async () => {
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Neo4j connection failed. Check your configuration.');
    }
  });

  describe('Real Neo4j Graph Traversal', () => {
    it('should traverse from algebra to its prerequisites', async () => {
      const concepts = await PrerequisiteDetector.traverseKnowledgeGraph(
        'math_algebra_basics',
        5
      );

      expect(concepts.length).toBeGreaterThan(0);
      expect(concepts.some(c => c.conceptId === 'math_algebra_basics')).toBe(true);
      
      // Should include prerequisites like integers
      const hasPrereqs = concepts.some(c => 
        c.conceptId === 'math_integers' || 
        c.conceptId === 'math_numbers_basic'
      );
      expect(hasPrereqs).toBe(true);
    });

    it('should traverse from calculus to deep prerequisites', async () => {
      const concepts = await PrerequisiteDetector.traverseKnowledgeGraph(
        'math_calculus_basics',
        10
      );

      expect(concepts.length).toBeGreaterThan(5);
      
      // Should include deep prerequisites
      const conceptIds = concepts.map(c => c.conceptId);
      expect(conceptIds).toContain('math_algebra_basics');
    });
  });

  describe('Real Prerequisite Checking', () => {
    it('should check prerequisites for quadratic equations', async () => {
      const studentMasteries = new Map([
        ['math_linear_equations', 85],
        ['math_algebra_basics', 90],
      ]);

      const check = await PrerequisiteDetector.checkPrerequisitesFromGraph(
        'math_quadratic_equations',
        studentMasteries
      );

      expect(check.topic).toBe('Quadratic Equations');
      expect(check.readyToLearn).toBe(true);
      expect(check.missingPrerequisites).toHaveLength(0);
    });

    it('should identify missing prerequisites for calculus', async () => {
      const studentMasteries = new Map([
        ['math_algebra_basics', 40], // Low mastery
      ]);

      const check = await PrerequisiteDetector.checkPrerequisitesFromGraph(
        'math_calculus_basics',
        studentMasteries
      );

      expect(check.readyToLearn).toBe(false);
      expect(check.missingPrerequisites.length).toBeGreaterThan(0);
    });
  });

  describe('Real Topological Sort', () => {
    it('should generate learning path from basics to calculus', async () => {
      const studentMasteries = new Map(); // Student knows nothing

      const path = await PrerequisiteDetector.getTopologicalLearningPath(
        'math_calculus_basics',
        studentMasteries
      );

      expect(path.length).toBeGreaterThan(3);
      expect(path[path.length - 1]).toContain('Calculus');
      
      // Earlier concepts should come before later ones
      const algebraIndex = path.findIndex(p => p.includes('Algebra'));
      const calculusIndex = path.findIndex(p => p.includes('Calculus'));
      expect(algebraIndex).toBeLessThan(calculusIndex);
    });

    it('should generate path for electricity with physics prerequisites', async () => {
      const studentMasteries = new Map([
        ['phy_motion', 70],
        ['phy_force', 65],
      ]);

      const path = await PrerequisiteDetector.getTopologicalLearningPath(
        'phy_electricity',
        studentMasteries
      );

      expect(path.length).toBeGreaterThan(0);
      expect(path[path.length - 1]).toContain('Electricity');
    });
  });

  describe('Real Missing Prerequisites', () => {
    it('should find all missing prerequisites for genetics', async () => {
      const studentMasteries = new Map(); // Student knows nothing

      const missing = await PrerequisiteDetector.identifyMissingPrerequisites(
        'bio_genetics',
        studentMasteries,
        60
      );

      expect(missing.length).toBeGreaterThan(0);
      expect(missing.some(p => p.conceptName.includes('Cell'))).toBe(true);
    });

    it('should respect mastery threshold', async () => {
      const studentMasteries = new Map([
        ['bio_cells', 65],
      ]);

      const missing60 = await PrerequisiteDetector.identifyMissingPrerequisites(
        'bio_genetics',
        studentMasteries,
        60
      );

      const missing80 = await PrerequisiteDetector.identifyMissingPrerequisites(
        'bio_genetics',
        studentMasteries,
        80
      );

      expect(missing80.length).toBeGreaterThanOrEqual(missing60.length);
    });
  });

  describe('Real Cycle Detection', () => {
    it('should detect if any cycles exist in the graph', async () => {
      const cycles = await PrerequisiteDetector.detectCycles();

      // Our seed data should not have cycles
      expect(cycles).toHaveLength(0);
    });

    it('should check specific concept for cycles', async () => {
      const cycles = await PrerequisiteDetector.detectCycles('math_algebra_basics');

      expect(cycles).toHaveLength(0);
    });
  });

  describe('Real Concept Search', () => {
    it('should find concept by exact ID', async () => {
      const conceptId = await PrerequisiteDetector.findConceptId('math_algebra_basics');

      expect(conceptId).toBe('math_algebra_basics');
    });

    it('should find concept by partial name', async () => {
      const conceptId = await PrerequisiteDetector.findConceptId('algebra');

      expect(conceptId).toBeTruthy();
      expect(conceptId).toContain('algebra');
    });

    it('should find concept case-insensitively', async () => {
      const conceptId = await PrerequisiteDetector.findConceptId('ALGEBRA');

      expect(conceptId).toBeTruthy();
    });

    it('should return null for non-existent concept', async () => {
      const conceptId = await PrerequisiteDetector.findConceptId('quantum_mechanics_advanced');

      expect(conceptId).toBeNull();
    });
  });

  describe('Cross-Subject Prerequisites', () => {
    it('should find math prerequisites for physics concepts', async () => {
      const concepts = await PrerequisiteDetector.traverseKnowledgeGraph(
        'phy_motion',
        5
      );

      // Motion requires ratios (math concept)
      const hasMathPrereq = concepts.some(c => c.subject === 'math');
      expect(hasMathPrereq).toBe(true);
    });

    it('should generate path across subjects', async () => {
      const studentMasteries = new Map();

      const path = await PrerequisiteDetector.getTopologicalLearningPath(
        'phy_electricity',
        studentMasteries
      );

      // Should include both physics and math concepts
      expect(path.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Tests', () => {
    it('should traverse large graph quickly', async () => {
      const start = Date.now();
      
      await PrerequisiteDetector.traverseKnowledgeGraph('math_calculus_basics', 10);
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });

    it('should check prerequisites quickly', async () => {
      const studentMasteries = new Map([
        ['math_algebra_basics', 70],
        ['math_trigonometry', 65],
      ]);

      const start = Date.now();
      
      await PrerequisiteDetector.checkPrerequisitesFromGraph(
        'math_calculus_basics',
        studentMasteries
      );
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(500); // Should complete in under 500ms
    });
  });
});
