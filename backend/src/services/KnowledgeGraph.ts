/**
 * Knowledge Graph Service
 * Manages student knowledge state, concept relationships, and learning paths
 * 
 * This is the core of Finxan's competitive moat - persistent memory per student
 */

import { StudentProfile, StudentProfileManager, ConceptMastery } from '../models/StudentProfile';
import { executeQuery } from '../config/neo4j';

// Types for concept connections
export interface ConceptConnection {
  relatedConcept: string;
  relatedSubject: string;
  connectionType: 'application' | 'related' | 'surprising' | 'realWorld';
  description: string;
  strength: number;
  gradeLevel: number;
  surprisingFactor: number;
}

export interface ConceptConnectionResult {
  crossSubjectConnections: ConceptConnection[];
  realWorldApplications: ConceptConnection[];
  surprisingLinks: ConceptConnection[];
}

export class KnowledgeGraph {
  private profiles: Map<string, StudentProfile> = new Map();
  
  /**
   * Get or create student profile
   */
  getProfile(studentId: string, name?: string, grade?: number): StudentProfile {
    if (!this.profiles.has(studentId)) {
      const profile = StudentProfileManager.createProfile(
        studentId,
        name || `Student_${studentId}`,
        grade || 8
      );
      this.profiles.set(studentId, profile);
      console.log(`📚 Created new student profile: ${studentId}`);
    }
    return this.profiles.get(studentId)!;
  }

  /**
   * Update student's concept mastery after interaction
   */
  updateMastery(
    studentId: string,
    conceptId: string,
    conceptName: string,
    success: boolean,
    prerequisites: string[] = []
  ): void {
    const profile = this.getProfile(studentId);
    StudentProfileManager.updateMastery(profile, conceptId, conceptName, success, prerequisites);
    console.log(`📈 Updated mastery for ${studentId}: ${conceptName} = ${profile.conceptMasteries.get(conceptId)?.masteryLevel}%`);
  }

  /**
   * Record a learning session
   */
  recordSession(
    studentId: string,
    duration: number,
    topicsCovered: string[],
    questionsAsked: number,
    confusionDetected: boolean,
    confusionCount: number,
    masteryGained: Record<string, number>
  ): void {
    const profile = this.getProfile(studentId);
    StudentProfileManager.recordSession(profile, {
      timestamp: new Date(),
      duration,
      topicsCovered,
      questionsAsked,
      confusionDetected,
      confusionCount,
      masteryGained,
    });
    console.log(`📝 Recorded session for ${studentId}: ${duration}s, ${topicsCovered.length} topics`);
  }

  /**
   * Record confusion event
   */
  recordConfusion(studentId: string, topic: string): void {
    const profile = this.getProfile(studentId);
    StudentProfileManager.recordConfusion(profile, topic);
    console.log(`😕 Confusion recorded for ${studentId}: ${topic}`);
  }

  /**
   * Get personalized context for AI prompt
   * This is injected into the system prompt to make Haru aware of student's history
   */
  getPersonalizedContext(studentId: string): string {
    const profile = this.getProfile(studentId);
    
    const context = `
STUDENT CONTEXT (Private - for teaching adaptation only):
- Name: ${profile.name}
- Grade: ${profile.grade}
- Language: ${profile.preferredLanguage}
- Total sessions: ${profile.totalSessions}
- Learning style: ${profile.learningStyle}

KNOWLEDGE STATE:
- Strong concepts: ${profile.strongConcepts.slice(0, 5).join(', ') || 'None yet'}
- Weak concepts: ${profile.weakConcepts.slice(0, 5).join(', ') || 'None yet'}
- Recent confusion triggers: ${profile.confusionTriggers.slice(0, 3).join(', ') || 'None'}

TEACHING GUIDANCE:
${profile.weakConcepts.length > 0 ? `- Student struggles with: ${profile.weakConcepts[0]}. Be extra patient with related topics.` : ''}
${profile.confusionTriggers.length > 0 ? `- Previously confused by: ${profile.confusionTriggers[0]}. Explain clearly if this comes up.` : ''}
${profile.totalSessions < 3 ? '- New student. Start with basics and assess understanding frequently.' : ''}
`;
    
    return context.trim();
  }

  /**
   * Get recommended next topics for student
   */
  getRecommendations(studentId: string): string[] {
    const profile = this.getProfile(studentId);
    return StudentProfileManager.getRecommendedTopics(profile);
  }

  /**
   * Check if student has prerequisite knowledge for a topic
   */
  hasPrerequisites(studentId: string, prerequisites: string[]): boolean {
    const profile = this.getProfile(studentId);
    
    return prerequisites.every(prereq => {
      const mastery = Array.from(profile.conceptMasteries.values())
        .find(m => m.conceptName.toLowerCase().includes(prereq.toLowerCase()));
      return mastery && mastery.masteryLevel >= 60;
    });
  }

  /**
   * Get missing prerequisites for a topic
   */
  getMissingPrerequisites(studentId: string, prerequisites: string[]): string[] {
    const profile = this.getProfile(studentId);
    
    return prerequisites.filter(prereq => {
      const mastery = Array.from(profile.conceptMasteries.values())
        .find(m => m.conceptName.toLowerCase().includes(prereq.toLowerCase()));
      return !mastery || mastery.masteryLevel < 60;
    });
  }

  /**
   * Export profile for persistence (to database)
   */
  exportProfile(studentId: string): object {
    const profile = this.getProfile(studentId);
    return {
      ...profile,
      conceptMasteries: Array.from(profile.conceptMasteries.entries()),
    };
  }

  /**
   * Import profile from persistence (from database)
   */
  importProfile(data: any): void {
    const profile: StudentProfile = {
      ...data,
      conceptMasteries: new Map(data.conceptMasteries),
      createdAt: new Date(data.createdAt),
      lastActiveAt: new Date(data.lastActiveAt),
    };
    this.profiles.set(profile.studentId, profile);
  }

  /**
   * Query concept connections from Neo4j
   * Supports filtering by connection type and returns bidirectional connections
   * REQ-2.8.1, REQ-2.8.2, REQ-2.8.3
   */
  async queryConceptConnections(
    conceptId: string,
    studentGrade: number,
    connectionTypes?: ('application' | 'related' | 'surprising' | 'realWorld')[]
  ): Promise<ConceptConnectionResult> {
    try {
      // Build connection type filter
      const typeFilter = connectionTypes && connectionTypes.length > 0
        ? `AND r.connectionType IN [${connectionTypes.map(t => `'${t}'`).join(', ')}]`
        : '';

      // Query Neo4j for concept connections
      const query = `
        MATCH (concept:Concept {conceptId: $conceptId})-[r:CONNECTS_TO]-(related:Concept)
        WHERE related.grade <= $studentGrade ${typeFilter}
        RETURN 
          related.conceptName as relatedConcept,
          related.subject as relatedSubject,
          r.connectionType as connectionType,
          r.description as description,
          r.strength as strength,
          r.gradeLevel as gradeLevel,
          r.surprisingFactor as surprisingFactor
        ORDER BY r.strength DESC, r.surprisingFactor DESC
      `;

      const results = await executeQuery<{
        relatedConcept: string;
        relatedSubject: string;
        connectionType: string;
        description: string;
        strength: number;
        gradeLevel: number;
        surprisingFactor: number;
      }>(query, { conceptId, studentGrade });

      // Categorize connections
      const result: ConceptConnectionResult = {
        crossSubjectConnections: [],
        realWorldApplications: [],
        surprisingLinks: []
      };

      for (const conn of results) {
        const connection: ConceptConnection = {
          relatedConcept: conn.relatedConcept,
          relatedSubject: conn.relatedSubject,
          connectionType: conn.connectionType as any,
          description: conn.description,
          strength: conn.strength,
          gradeLevel: conn.gradeLevel,
          surprisingFactor: conn.surprisingFactor
        };

        // Categorize based on connection type
        if (conn.connectionType === 'realWorld') {
          result.realWorldApplications.push(connection);
        } else if (conn.connectionType === 'surprising') {
          result.surprisingLinks.push(connection);
        } else {
          // Check if it's cross-subject
          // We'll need to get the source concept's subject to determine this
          result.crossSubjectConnections.push(connection);
        }
      }

      return result;
    } catch (error) {
      console.error('Error querying concept connections:', error);
      // Return empty result on error
      return {
        crossSubjectConnections: [],
        realWorldApplications: [],
        surprisingLinks: []
      };
    }
  }

  /**
   * Find connections with relevance scoring
   * Returns connections sorted by relevance to student's current knowledge
   * REQ-2.8.1
   */
  async findRelevantConnections(
    conceptId: string,
    studentId: string,
    limit: number = 10
  ): Promise<ConceptConnection[]> {
    try {
      const profile = this.getProfile(studentId);
      
      const query = `
        MATCH (concept:Concept {conceptId: $conceptId})-[r:CONNECTS_TO]-(related:Concept)
        WHERE related.grade <= $studentGrade
        RETURN 
          related.conceptName as relatedConcept,
          related.subject as relatedSubject,
          r.connectionType as connectionType,
          r.description as description,
          r.strength as strength,
          r.gradeLevel as gradeLevel,
          r.surprisingFactor as surprisingFactor
        ORDER BY r.strength DESC, r.surprisingFactor DESC
        LIMIT $limit
      `;

      const results = await executeQuery<{
        relatedConcept: string;
        relatedSubject: string;
        connectionType: string;
        description: string;
        strength: number;
        gradeLevel: number;
        surprisingFactor: number;
      }>(query, { conceptId, studentGrade: profile.grade, limit });

      return results.map(conn => ({
        relatedConcept: conn.relatedConcept,
        relatedSubject: conn.relatedSubject,
        connectionType: conn.connectionType as any,
        description: conn.description,
        strength: conn.strength,
        gradeLevel: conn.gradeLevel,
        surprisingFactor: conn.surprisingFactor
      }));
    } catch (error) {
      console.error('Error finding relevant connections:', error);
      return [];
    }
  }

  /**
   * Filter connections by subject and grade level
   * Supports multiple filter combinations
   * REQ-2.8.4, REQ-2.8.5
   */
  async filterConnectionsBySubject(
    conceptId: string,
    studentGrade: number,
    subjects?: string[],
    connectionTypes?: ('application' | 'related' | 'surprising' | 'realWorld')[]
  ): Promise<ConceptConnection[]> {
    try {
      // Build subject filter
      const subjectFilter = subjects && subjects.length > 0
        ? `AND related.subject IN [${subjects.map(s => `'${s}'`).join(', ')}]`
        : '';

      // Build connection type filter
      const typeFilter = connectionTypes && connectionTypes.length > 0
        ? `AND r.connectionType IN [${connectionTypes.map(t => `'${t}'`).join(', ')}]`
        : '';

      const query = `
        MATCH (concept:Concept {conceptId: $conceptId})-[r:CONNECTS_TO]-(related:Concept)
        WHERE related.grade <= $studentGrade ${subjectFilter} ${typeFilter}
        RETURN 
          related.conceptName as relatedConcept,
          related.subject as relatedSubject,
          r.connectionType as connectionType,
          r.description as description,
          r.strength as strength,
          r.gradeLevel as gradeLevel,
          r.surprisingFactor as surprisingFactor
        ORDER BY r.strength DESC
      `;

      const results = await executeQuery<{
        relatedConcept: string;
        relatedSubject: string;
        connectionType: string;
        description: string;
        strength: number;
        gradeLevel: number;
        surprisingFactor: number;
      }>(query, { conceptId, studentGrade });

      return results.map(conn => ({
        relatedConcept: conn.relatedConcept,
        relatedSubject: conn.relatedSubject,
        connectionType: conn.connectionType as any,
        description: conn.description,
        strength: conn.strength,
        gradeLevel: conn.gradeLevel,
        surprisingFactor: conn.surprisingFactor
      }));
    } catch (error) {
      console.error('Error filtering connections by subject:', error);
      return [];
    }
  }

  /**
   * Get connections in digestible format for students
   * Groups connections by type and formats descriptions
   * REQ-2.8.5
   */
  async getDigestibleConnections(
    conceptId: string,
    studentGrade: number,
    maxPerCategory: number = 5
  ): Promise<{
    crossSubject: Array<{ subject: string; description: string; strength: number }>;
    realWorld: Array<{ description: string; strength: number }>;
    surprising: Array<{ description: string; surprisingFactor: number }>;
  }> {
    try {
      const connections = await this.queryConceptConnections(conceptId, studentGrade);

      return {
        crossSubject: connections.crossSubjectConnections
          .slice(0, maxPerCategory)
          .map(conn => ({
            subject: conn.relatedSubject,
            description: `${conn.relatedConcept}: ${conn.description}`,
            strength: conn.strength
          })),
        realWorld: connections.realWorldApplications
          .slice(0, maxPerCategory)
          .map(conn => ({
            description: conn.description,
            strength: conn.strength
          })),
        surprising: connections.surprisingLinks
          .slice(0, maxPerCategory)
          .map(conn => ({
            description: conn.description,
            surprisingFactor: conn.surprisingFactor
          }))
      };
    } catch (error) {
      console.error('Error getting digestible connections:', error);
      return {
        crossSubject: [],
        realWorld: [],
        surprising: []
      };
    }
  }
}

// Singleton instance
export const knowledgeGraph = new KnowledgeGraph();
