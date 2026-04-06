/**
 * Integration Tests for Concept Connection Mapper
 * Tests REQ-2.8.1 through REQ-2.8.5
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { KnowledgeGraph } from '../KnowledgeGraph';
import { driver, executeQuery } from '../../config/neo4j';

describe('Concept Connection Mapper Integration Tests', () => {
  let knowledgeGraph: KnowledgeGraph;

  beforeAll(async () => {
    knowledgeGraph = new KnowledgeGraph();
    
    // Verify Neo4j connection
    try {
      await executeQuery('RETURN 1');
    } catch (error) {
      console.warn('Neo4j not available, skipping integration tests');
      return;
    }
  });

  afterAll(async () => {
    await driver.close();
  });

  describe('REQ-2.8.1: Store cross-subject concept connections in Neo4j', () => {
    it('should retrieve cross-subject connections between math and physics', async () => {
      const connections = await knowledgeGraph.queryConceptConnections(
        'math_ratios',
        10
      );

      expect(connections).toBeDefined();
      expect(connections.crossSubjectConnections.length).toBeGreaterThan(0);
      
      // Check for physics connection
      const physicsConnection = connections.crossSubjectConnections.find(
        conn => conn.relatedSubject === 'physics'
      );
      expect(physicsConnection).toBeDefined();
    });

    it('should retrieve cross-subject connections between math and chemistry', async () => {
      const connections = await knowledgeGraph.queryConceptConnections(
        'math_percentages',
        10
      );

      const chemConnection = connections.crossSubjectConnections.find(
        conn => conn.relatedSubject === 'chemistry'
      );
      expect(chemConnection).toBeDefined();
    });

    it('should retrieve cross-subject connections between physics and biology', async () => {
      const connections = await knowledgeGraph.queryConceptConnections(
        'phy_energy',
        10
      );

      const bioConnection = connections.crossSubjectConnections.find(
        conn => conn.relatedSubject === 'biology'
      );
      expect(bioConnection).toBeDefined();
    });

    it('should support bidirectional connections', async () => {
      // Query from math to physics
      const mathToPhysics = await knowledgeGraph.queryConceptConnections(
        'math_algebra_basics',
        10
      );

      // Query from physics to math
      const physicsToMath = await knowledgeGraph.queryConceptConnections(
        'phy_force',
        10
      );

      // Both should have connections
      expect(mathToPhysics.crossSubjectConnections.length).toBeGreaterThan(0);
      expect(physicsToMath.crossSubjectConnections.length).toBeGreaterThan(0);
    });
  });

  describe('REQ-2.8.2: Identify real-world applications of concepts', () => {
    it('should retrieve real-world applications for math concepts', async () => {
      const connections = await knowledgeGraph.queryConceptConnections(
        'math_percentages',
        10
      );

      expect(connections.realWorldApplications.length).toBeGreaterThan(0);
      
      const application = connections.realWorldApplications[0];
      expect(application.description).toBeDefined();
      expect(application.description.length).toBeGreaterThan(0);
    });

    it('should retrieve real-world applications for physics concepts', async () => {
      const connections = await knowledgeGraph.queryConceptConnections(
        'phy_electricity',
        10
      );

      expect(connections.realWorldApplications.length).toBeGreaterThan(0);
      
      const application = connections.realWorldApplications[0];
      expect(application.description).toContain('electric');
    });

    it('should retrieve real-world applications for chemistry concepts', async () => {
      const connections = await knowledgeGraph.queryConceptConnections(
        'chem_reactions',
        10
      );

      expect(connections.realWorldApplications.length).toBeGreaterThan(0);
    });

    it('should filter by realWorld connection type only', async () => {
      const connections = await knowledgeGraph.queryConceptConnections(
        'math_trigonometry',
        10,
        ['realWorld']
      );

      // All connections should be realWorld type
      connections.realWorldApplications.forEach(conn => {
        expect(conn.connectionType).toBe('realWorld');
      });
    });
  });

  describe('REQ-2.8.3: Find surprising connections between topics', () => {
    it('should retrieve surprising connections for math concepts', async () => {
      const connections = await knowledgeGraph.queryConceptConnections(
        'math_ratios',
        10
      );

      expect(connections.surprisingLinks.length).toBeGreaterThan(0);
      
      const surprising = connections.surprisingLinks[0];
      expect(surprising.surprisingFactor).toBeGreaterThan(0.5);
    });

    it('should have high surprising factor for music-math connections', async () => {
      const connections = await knowledgeGraph.queryConceptConnections(
        'math_fractions',
        10,
        ['surprising']
      );

      const musicConnection = connections.surprisingLinks.find(
        conn => conn.description.toLowerCase().includes('music')
      );
      
      if (musicConnection) {
        expect(musicConnection.surprisingFactor).toBeGreaterThan(0.8);
      }
    });

    it('should retrieve surprising connections about cooking and chemistry', async () => {
      const connections = await knowledgeGraph.queryConceptConnections(
        'chem_reactions',
        10,
        ['surprising']
      );

      const cookingConnection = connections.surprisingLinks.find(
        conn => conn.description.toLowerCase().includes('caramel') ||
               conn.description.toLowerCase().includes('cooking')
      );
      
      expect(cookingConnection).toBeDefined();
    });

    it('should sort surprising connections by surprising factor', async () => {
      const connections = await knowledgeGraph.queryConceptConnections(
        'math_ratios',
        10,
        ['surprising']
      );

      if (connections.surprisingLinks.length > 1) {
        for (let i = 0; i < connections.surprisingLinks.length - 1; i++) {
          expect(connections.surprisingLinks[i].surprisingFactor)
            .toBeGreaterThanOrEqual(connections.surprisingLinks[i + 1].surprisingFactor);
        }
      }
    });
  });

  describe('REQ-2.8.4: Filter connections by student grade level', () => {
    it('should only return connections appropriate for grade 6', async () => {
      const connections = await knowledgeGraph.queryConceptConnections(
        'math_percentages',
        6
      );

      // All connections should be at or below grade 6
      const allConnections = [
        ...connections.crossSubjectConnections,
        ...connections.realWorldApplications,
        ...connections.surprisingLinks
      ];

      allConnections.forEach(conn => {
        expect(conn.gradeLevel).toBeLessThanOrEqual(6);
      });
    });

    it('should return more connections for higher grade levels', async () => {
      const grade6Connections = await knowledgeGraph.queryConceptConnections(
        'math_algebra_basics',
        6
      );

      const grade10Connections = await knowledgeGraph.queryConceptConnections(
        'math_algebra_basics',
        10
      );

      const grade6Total = 
        grade6Connections.crossSubjectConnections.length +
        grade6Connections.realWorldApplications.length +
        grade6Connections.surprisingLinks.length;

      const grade10Total = 
        grade10Connections.crossSubjectConnections.length +
        grade10Connections.realWorldApplications.length +
        grade10Connections.surprisingLinks.length;

      expect(grade10Total).toBeGreaterThanOrEqual(grade6Total);
    });

    it('should filter by subject (math only)', async () => {
      const connections = await knowledgeGraph.filterConnectionsBySubject(
        'math_ratios',
        10,
        ['math']
      );

      connections.forEach(conn => {
        expect(conn.relatedSubject).toBe('math');
      });
    });

    it('should filter by multiple subjects (physics and chemistry)', async () => {
      const connections = await knowledgeGraph.filterConnectionsBySubject(
        'phy_energy',
        10,
        ['physics', 'chemistry']
      );

      connections.forEach(conn => {
        expect(['physics', 'chemistry']).toContain(conn.relatedSubject);
      });
    });

    it('should combine subject and connection type filters', async () => {
      const connections = await knowledgeGraph.filterConnectionsBySubject(
        'math_percentages',
        10,
        ['chemistry'],
        ['application']
      );

      connections.forEach(conn => {
        expect(conn.relatedSubject).toBe('chemistry');
        expect(conn.connectionType).toBe('application');
      });
    });
  });

  describe('REQ-2.8.5: Present connections in digestible format', () => {
    it('should return connections in digestible format', async () => {
      const digestible = await knowledgeGraph.getDigestibleConnections(
        'math_ratios',
        10
      );

      expect(digestible).toBeDefined();
      expect(digestible.crossSubject).toBeDefined();
      expect(digestible.realWorld).toBeDefined();
      expect(digestible.surprising).toBeDefined();
    });

    it('should limit connections per category', async () => {
      const digestible = await knowledgeGraph.getDigestibleConnections(
        'math_percentages',
        10,
        3
      );

      expect(digestible.crossSubject.length).toBeLessThanOrEqual(3);
      expect(digestible.realWorld.length).toBeLessThanOrEqual(3);
      expect(digestible.surprising.length).toBeLessThanOrEqual(3);
    });

    it('should format cross-subject connections with subject labels', async () => {
      const digestible = await knowledgeGraph.getDigestibleConnections(
        'math_algebra_basics',
        10
      );

      if (digestible.crossSubject.length > 0) {
        const connection = digestible.crossSubject[0];
        expect(connection.subject).toBeDefined();
        expect(connection.description).toBeDefined();
        expect(connection.strength).toBeGreaterThan(0);
      }
    });

    it('should include strength scores for real-world applications', async () => {
      const digestible = await knowledgeGraph.getDigestibleConnections(
        'phy_electricity',
        10
      );

      if (digestible.realWorld.length > 0) {
        const application = digestible.realWorld[0];
        expect(application.strength).toBeGreaterThan(0);
        expect(application.strength).toBeLessThanOrEqual(1);
      }
    });

    it('should include surprising factor for surprising connections', async () => {
      const digestible = await knowledgeGraph.getDigestibleConnections(
        'math_ratios',
        10
      );

      if (digestible.surprising.length > 0) {
        const surprising = digestible.surprising[0];
        expect(surprising.surprisingFactor).toBeGreaterThan(0);
        expect(surprising.surprisingFactor).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('Connection Quality and Coverage', () => {
    it('should have at least 50 total connections across all concepts', async () => {
      // Query all concept connections
      const conceptIds = [
        'math_ratios',
        'math_percentages',
        'math_algebra_basics',
        'phy_motion',
        'phy_force',
        'phy_energy',
        'chem_reactions',
        'bio_photosynthesis'
      ];

      let totalConnections = 0;

      for (const conceptId of conceptIds) {
        const connections = await knowledgeGraph.queryConceptConnections(
          conceptId,
          12
        );

        totalConnections += 
          connections.crossSubjectConnections.length +
          connections.realWorldApplications.length +
          connections.surprisingLinks.length;
      }

      expect(totalConnections).toBeGreaterThanOrEqual(50);
    });

    it('should have connections with valid strength scores', async () => {
      const connections = await knowledgeGraph.queryConceptConnections(
        'math_trigonometry',
        10
      );

      const allConnections = [
        ...connections.crossSubjectConnections,
        ...connections.realWorldApplications,
        ...connections.surprisingLinks
      ];

      allConnections.forEach(conn => {
        expect(conn.strength).toBeGreaterThan(0);
        expect(conn.strength).toBeLessThanOrEqual(1);
      });
    });

    it('should have meaningful descriptions for all connections', async () => {
      const connections = await knowledgeGraph.queryConceptConnections(
        'math_quadratic_equations',
        10
      );

      const allConnections = [
        ...connections.crossSubjectConnections,
        ...connections.realWorldApplications,
        ...connections.surprisingLinks
      ];

      allConnections.forEach(conn => {
        expect(conn.description).toBeDefined();
        expect(conn.description.length).toBeGreaterThan(10);
      });
    });
  });

  describe('Student-specific connection discovery', () => {
    it('should find relevant connections for a student', async () => {
      const studentId = 'test_student_123';
      knowledgeGraph.getProfile(studentId, 'Test Student', 8);

      const connections = await knowledgeGraph.findRelevantConnections(
        'math_fractions',
        studentId,
        5
      );

      expect(connections.length).toBeGreaterThan(0);
      expect(connections.length).toBeLessThanOrEqual(5);
    });

    it('should respect student grade level in relevant connections', async () => {
      const studentId = 'test_student_grade6';
      knowledgeGraph.getProfile(studentId, 'Grade 6 Student', 6);

      const connections = await knowledgeGraph.findRelevantConnections(
        'math_percentages',
        studentId
      );

      connections.forEach(conn => {
        expect(conn.gradeLevel).toBeLessThanOrEqual(6);
      });
    });

    it('should sort connections by strength and surprising factor', async () => {
      const studentId = 'test_student_sorting';
      knowledgeGraph.getProfile(studentId, 'Test Student', 10);

      const connections = await knowledgeGraph.findRelevantConnections(
        'math_ratios',
        studentId,
        10
      );

      if (connections.length > 1) {
        for (let i = 0; i < connections.length - 1; i++) {
          // Should be sorted by strength DESC, then surprising factor DESC
          if (connections[i].strength === connections[i + 1].strength) {
            expect(connections[i].surprisingFactor)
              .toBeGreaterThanOrEqual(connections[i + 1].surprisingFactor);
          } else {
            expect(connections[i].strength)
              .toBeGreaterThanOrEqual(connections[i + 1].strength);
          }
        }
      }
    });
  });
});
