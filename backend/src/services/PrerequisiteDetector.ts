/**
 * Prerequisite Detector Service
 * Identifies knowledge gaps and missing prerequisites before teaching new concepts
 * 
 * This is a key differentiator - Haru detects what you don't know and teaches it first
 */

import { getSession } from '../config/neo4j';

export interface Prerequisite {
  conceptId: string;
  conceptName: string;
  required: boolean; // Must know vs. helpful to know
  estimatedTime: number; // Minutes to teach
  strength?: number; // 0-1, from Neo4j relationship
}

export interface PrerequisiteCheck {
  topic: string;
  prerequisites: Prerequisite[];
  missingPrerequisites: string[];
  readyToLearn: boolean;
  recommendedPath: string[]; // Order to teach missing prerequisites
}

export interface ConceptNode {
  conceptId: string;
  conceptName: string;
  subject: string;
  grade: number;
  difficulty: number;
  estimatedLearningTime: number;
}

export class PrerequisiteDetector {
  /**
   * 8.1: Implement knowledge graph traversal (BFS)
   * Traverse the Neo4j knowledge graph using breadth-first search
   */
  static async traverseKnowledgeGraph(
    startConceptId: string,
    maxDepth: number = 5
  ): Promise<ConceptNode[]> {
    const session = getSession();
    try {
      const result = await session.run(
        `
        MATCH path = (start:Concept {conceptId: $conceptId})-[:REQUIRES*0..${maxDepth}]->(prereq:Concept)
        RETURN DISTINCT prereq.conceptId as conceptId,
               prereq.conceptName as conceptName,
               prereq.subject as subject,
               prereq.grade as grade,
               prereq.difficulty as difficulty,
               prereq.estimatedLearningTime as estimatedLearningTime,
               length(path) as depth
        ORDER BY depth ASC
        `,
        { conceptId: startConceptId }
      );

      return result.records.map(record => ({
        conceptId: record.get('conceptId'),
        conceptName: record.get('conceptName'),
        subject: record.get('subject'),
        grade: record.get('grade'),
        difficulty: record.get('difficulty'),
        estimatedLearningTime: record.get('estimatedLearningTime'),
      }));
    } finally {
      await session.close();
    }
  }

  /**
   * 8.2: Implement prerequisite check algorithm
   * Check if student has the required prerequisites for a concept
   */
  static async checkPrerequisitesFromGraph(
    conceptId: string,
    studentMasteries: Map<string, number>
  ): Promise<PrerequisiteCheck> {
    const session = getSession();
    try {
      // Get direct prerequisites from Neo4j
      const result = await session.run(
        `
        MATCH (concept:Concept {conceptId: $conceptId})-[r:REQUIRES]->(prereq:Concept)
        RETURN prereq.conceptId as conceptId,
               prereq.conceptName as conceptName,
               prereq.estimatedLearningTime as estimatedTime,
               r.strength as strength
        ORDER BY r.strength DESC
        `,
        { conceptId }
      );

      const prerequisites: Prerequisite[] = result.records.map(record => ({
        conceptId: record.get('conceptId'),
        conceptName: record.get('conceptName'),
        required: record.get('strength') >= 0.8,
        estimatedTime: record.get('estimatedTime'),
        strength: record.get('strength'),
      }));

      const missingPrerequisites: string[] = [];
      const recommendedPath: string[] = [];

      for (const prereq of prerequisites) {
        const mastery = studentMasteries.get(prereq.conceptId) || 0;
        
        if (mastery < 60) {
          missingPrerequisites.push(prereq.conceptName);
          if (prereq.required) {
            recommendedPath.push(prereq.conceptName);
          }
        }
      }

      // Get the concept name
      const conceptResult = await session.run(
        'MATCH (c:Concept {conceptId: $conceptId}) RETURN c.conceptName as name',
        { conceptId }
      );
      const conceptName = conceptResult.records[0]?.get('name') || conceptId;

      return {
        topic: conceptName,
        prerequisites,
        missingPrerequisites,
        readyToLearn: missingPrerequisites.length === 0,
        recommendedPath,
      };
    } finally {
      await session.close();
    }
  }

  /**
   * 8.3: Implement topological sort for learning path
   * Generate optimal learning sequence using topological sort
   */
  static async getTopologicalLearningPath(
    targetConceptId: string,
    studentMasteries: Map<string, number>
  ): Promise<string[]> {
    const session = getSession();
    try {
      // Get all prerequisites in dependency order
      const result = await session.run(
        `
        MATCH path = (target:Concept {conceptId: $conceptId})-[:REQUIRES*]->(prereq:Concept)
        WITH prereq, max(length(path)) as maxDepth
        RETURN DISTINCT prereq.conceptId as conceptId,
               prereq.conceptName as conceptName,
               maxDepth
        ORDER BY maxDepth DESC
        `,
        { conceptId: targetConceptId }
      );

      const path: string[] = [];
      
      for (const record of result.records) {
        const conceptId = record.get('conceptId');
        const conceptName = record.get('conceptName');
        const mastery = studentMasteries.get(conceptId) || 0;
        
        // Only include concepts that need to be learned
        if (mastery < 60) {
          path.push(conceptName);
        }
      }

      // Add target concept at the end
      const targetResult = await session.run(
        'MATCH (c:Concept {conceptId: $conceptId}) RETURN c.conceptName as name',
        { conceptId: targetConceptId }
      );
      const targetName = targetResult.records[0]?.get('name') || targetConceptId;
      path.push(targetName);

      return path;
    } finally {
      await session.close();
    }
  }

  /**
   * 8.4: Implement missing prerequisite identification
   * Identify all missing prerequisites for a concept
   */
  static async identifyMissingPrerequisites(
    conceptId: string,
    studentMasteries: Map<string, number>,
    masteryThreshold: number = 60
  ): Promise<Prerequisite[]> {
    const session = getSession();
    try {
      const result = await session.run(
        `
        MATCH (concept:Concept {conceptId: $conceptId})-[:REQUIRES*1..]->(prereq:Concept)
        RETURN DISTINCT prereq.conceptId as conceptId,
               prereq.conceptName as conceptName,
               prereq.estimatedLearningTime as estimatedTime
        `,
        { conceptId }
      );

      const missing: Prerequisite[] = [];

      for (const record of result.records) {
        const prereqId = record.get('conceptId');
        const mastery = studentMasteries.get(prereqId) || 0;
        
        if (mastery < masteryThreshold) {
          missing.push({
            conceptId: prereqId,
            conceptName: record.get('conceptName'),
            required: true,
            estimatedTime: record.get('estimatedTime'),
          });
        }
      }

      return missing;
    } finally {
      await session.close();
    }
  }

  /**
   * 8.5: Implement prerequisite prompt generation
   * Generate teaching prompt when prerequisites are missing
   */
  static generatePrerequisitePrompt(check: PrerequisiteCheck): string {
    if (check.readyToLearn) {
      return '';
    }

    return `
PREREQUISITE GAP DETECTED:
The student wants to learn about "${check.topic}" but is missing these prerequisites:
${check.missingPrerequisites.map((p, i) => `${i + 1}. ${p}`).join('\n')}

TEACHING STRATEGY:
1. Acknowledge their question about "${check.topic}"
2. Explain that understanding ${check.missingPrerequisites[0]} will make "${check.topic}" much easier
3. Offer to teach ${check.missingPrerequisites[0]} first
4. Ask: "Would you like me to explain ${check.missingPrerequisites[0]} first, then we'll come back to ${check.topic}?"

Be encouraging and frame this as helping them succeed, not as a deficiency.
`;
  }

  /**
   * 8.6: Implement cycle detection in graph
   * Detect circular dependencies in the knowledge graph
   */
  static async detectCycles(conceptId?: string): Promise<string[][]> {
    const session = getSession();
    try {
      const query = conceptId
        ? `
          MATCH path = (start:Concept {conceptId: $conceptId})-[:REQUIRES*]->(start)
          RETURN [node in nodes(path) | node.conceptName] as cycle
          LIMIT 10
          `
        : `
          MATCH path = (start:Concept)-[:REQUIRES*]->(start)
          RETURN [node in nodes(path) | node.conceptName] as cycle
          LIMIT 10
          `;

      const result = await session.run(query, conceptId ? { conceptId } : {});

      return result.records.map(record => record.get('cycle'));
    } finally {
      await session.close();
    }
  }

  /**
   * Find concept by name or ID in Neo4j
   */
  static async findConceptId(topicNameOrId: string): Promise<string | null> {
    const session = getSession();
    try {
      const result = await session.run(
        `
        MATCH (c:Concept)
        WHERE c.conceptId = $topic OR toLower(c.conceptName) CONTAINS toLower($topic)
        RETURN c.conceptId as conceptId
        LIMIT 1
        `,
        { topic: topicNameOrId }
      );

      return result.records[0]?.get('conceptId') || null;
    } finally {
      await session.close();
    }
  }

  // ============================================
  // Legacy static methods (for backward compatibility)
  // ============================================

  // Prerequisite graph - maps concepts to their dependencies
  private static readonly PREREQUISITE_MAP: Record<string, Prerequisite[]> = {
    // Math
    'algebra': [
      { conceptId: 'arithmetic', conceptName: 'Basic Arithmetic', required: true, estimatedTime: 15 },
      { conceptId: 'fractions', conceptName: 'Fractions', required: true, estimatedTime: 20 },
    ],
    'calculus': [
      { conceptId: 'algebra', conceptName: 'Algebra', required: true, estimatedTime: 30 },
      { conceptId: 'functions', conceptName: 'Functions', required: true, estimatedTime: 25 },
      { conceptId: 'limits', conceptName: 'Limits', required: true, estimatedTime: 20 },
    ],
    'integration': [
      { conceptId: 'differentiation', conceptName: 'Differentiation', required: true, estimatedTime: 30 },
      { conceptId: 'algebra', conceptName: 'Algebra', required: true, estimatedTime: 25 },
    ],
    
    // Science
    'photosynthesis': [
      { conceptId: 'cells', conceptName: 'Plant Cells', required: true, estimatedTime: 15 },
      { conceptId: 'energy', conceptName: 'Energy Basics', required: true, estimatedTime: 10 },
    ],
    'electricity': [
      { conceptId: 'atoms', conceptName: 'Atomic Structure', required: true, estimatedTime: 20 },
      { conceptId: 'charge', conceptName: 'Electric Charge', required: true, estimatedTime: 15 },
    ],
    'chemistry': [
      { conceptId: 'atoms', conceptName: 'Atoms', required: true, estimatedTime: 15 },
      { conceptId: 'periodic-table', conceptName: 'Periodic Table', required: true, estimatedTime: 20 },
    ],
    
    // Physics
    'motion': [
      { conceptId: 'vectors', conceptName: 'Vectors', required: true, estimatedTime: 20 },
      { conceptId: 'forces', conceptName: 'Forces', required: false, estimatedTime: 15 },
    ],
    'thermodynamics': [
      { conceptId: 'energy', conceptName: 'Energy', required: true, estimatedTime: 15 },
      { conceptId: 'heat', conceptName: 'Heat Transfer', required: true, estimatedTime: 20 },
    ],
  };

  /**
   * Check prerequisites for a topic
   */
  static checkPrerequisites(
    topic: string,
    studentMasteries: Map<string, number>
  ): PrerequisiteCheck {
    const topicKey = this.findTopicKey(topic);
    const prerequisites = this.PREREQUISITE_MAP[topicKey] || [];
    
    const missingPrerequisites: string[] = [];
    const recommendedPath: string[] = [];

    for (const prereq of prerequisites) {
      const mastery = studentMasteries.get(prereq.conceptId) || 0;
      
      if (mastery < 60) {
        missingPrerequisites.push(prereq.conceptName);
        if (prereq.required) {
          recommendedPath.push(prereq.conceptName);
        }
      }
    }

    return {
      topic,
      prerequisites,
      missingPrerequisites,
      readyToLearn: missingPrerequisites.length === 0,
      recommendedPath,
    };
  }

  /**
   * Generate prerequisite teaching prompt
   */
  static generatePrerequisitePrompt(check: PrerequisiteCheck): string {
    if (check.readyToLearn) {
      return '';
    }

    return `
PREREQUISITE GAP DETECTED:
The student wants to learn about "${check.topic}" but is missing these prerequisites:
${check.missingPrerequisites.map((p, i) => `${i + 1}. ${p}`).join('\n')}

TEACHING STRATEGY:
1. Acknowledge their question about "${check.topic}"
2. Explain that understanding ${check.missingPrerequisites[0]} will make "${check.topic}" much easier
3. Offer to teach ${check.missingPrerequisites[0]} first
4. Ask: "Would you like me to explain ${check.missingPrerequisites[0]} first, then we'll come back to ${check.topic}?"

Be encouraging and frame this as helping them succeed, not as a deficiency.
`;
  }

  /**
   * Extract topic from student question
   */
  static extractTopic(question: string): string {
    const lower = question.toLowerCase();
    
    // Check for explicit topic mentions
    for (const topic of Object.keys(this.PREREQUISITE_MAP)) {
      if (lower.includes(topic)) {
        return topic;
      }
    }

    // Extract from common question patterns
    const patterns = [
      /explain (.*?)(?:\?|$)/i,
      /what is (.*?)(?:\?|$)/i,
      /how does (.*?) work/i,
      /tell me about (.*?)(?:\?|$)/i,
    ];

    for (const pattern of patterns) {
      const match = question.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return question;
  }

  /**
   * Find matching topic key from natural language
   */
  private static findTopicKey(topic: string): string {
    const lower = topic.toLowerCase();
    
    for (const key of Object.keys(this.PREREQUISITE_MAP)) {
      if (lower.includes(key) || key.includes(lower)) {
        return key;
      }
    }
    
    return topic;
  }

  /**
   * Add new prerequisite relationship
   */
  static addPrerequisite(
    topic: string,
    prerequisite: Prerequisite
  ): void {
    if (!this.PREREQUISITE_MAP[topic]) {
      this.PREREQUISITE_MAP[topic] = [];
    }
    this.PREREQUISITE_MAP[topic].push(prerequisite);
  }

  /**
   * Get all topics in the knowledge graph
   */
  static getAllTopics(): string[] {
    return Object.keys(this.PREREQUISITE_MAP);
  }

  /**
   * Get learning path from current knowledge to target topic
   */
  static getLearningPath(
    targetTopic: string,
    studentMasteries: Map<string, number>
  ): string[] {
    const path: string[] = [];
    const visited = new Set<string>();
    
    const buildPath = (topic: string) => {
      if (visited.has(topic)) return;
      visited.add(topic);
      
      const topicKey = this.findTopicKey(topic);
      const prerequisites = this.PREREQUISITE_MAP[topicKey] || [];
      
      for (const prereq of prerequisites) {
        const mastery = studentMasteries.get(prereq.conceptId) || 0;
        if (mastery < 60 && prereq.required) {
          buildPath(prereq.conceptName);
          path.push(prereq.conceptName);
        }
      }
    };
    
    buildPath(targetTopic);
    path.push(targetTopic);
    
    return path;
  }
}
