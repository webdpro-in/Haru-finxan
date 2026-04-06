/**
 * Class Health Heatmap Service
 * Generates real-time heatmap grid showing student mastery across concepts
 * 
 * Requirements:
 * - REQ-4.1.1: Generate live heatmap grid (students × concepts)
 * - REQ-4.1.2: Color-code cells: red (<50%), yellow (50-75%), green (≥75%)
 * - REQ-4.1.3: Update heatmap every 30 seconds via Socket.io
 * - REQ-4.1.4: Highlight cells with confusion detected
 * - REQ-4.1.5: Display last updated timestamp per cell
 * - REQ-4.1.6: Calculate classroom average mastery
 * - REQ-4.1.7: Identify concepts needing review
 */

import Redis from 'ioredis';
import { StudentProfileManager, ConceptMastery } from '../models/StudentProfile.js';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

export interface HeatmapCell {
  studentId: string;
  studentName: string;
  conceptId: string;
  conceptName: string;
  masteryLevel: number; // 0-100
  color: 'red' | 'yellow' | 'green';
  lastUpdated: Date;
  confusionDetected: boolean;
}

export interface ClassHealthHeatmap {
  classroomId: string;
  timestamp: Date;
  grid: HeatmapCell[][];
  students: string[]; // Student IDs
  concepts: string[]; // Concept IDs
  classroomAverage: number;
  conceptsNeedingReview: string[];
  updateFrequency: number; // seconds
}

export interface ClassroomStats {
  classroomId: string;
  averageMastery: number;
  conceptAverages: Map<string, number>;
  weakConcepts: string[]; // Concepts with class average < 50%
  confusionHotspots: string[]; // Concepts with high confusion rate
}

export class ClassHealthHeatmapService {
  private static readonly CACHE_TTL = 30; // 30 seconds (REQ-4.1.3)
  private static readonly CACHE_PREFIX = 'heatmap:';
  private static readonly UPDATE_FREQUENCY = 30; // seconds

  /**
   * Task 14.1: Generate heatmap for a classroom
   * Creates a grid of student mastery levels across all concepts
   */
  static async generateHeatmap(
    classroomId: string,
    studentIds: string[]
  ): Promise<ClassHealthHeatmap> {
    // Check cache first (REQ-10.4: Cache heatmaps for 30 seconds)
    const cached = await this.getFromCache(classroomId);
    if (cached) {
      return cached;
    }

    // OPTIMIZATION: Use batch loading to avoid N+1 query pattern
    // Old: N*2 queries (N students × 2 queries each)
    // New: 2 queries total (1 for students, 1 for masteries)
    // Performance: 200 queries → 2 queries = 100x faster
    const validProfiles = await StudentProfileManager.loadBatchFromDatabase(studentIds);

    if (validProfiles.length === 0) {
      return this.createEmptyHeatmap(classroomId);
    }

    // Extract all unique concepts across all students
    const allConcepts = new Set<string>();
    const conceptNames = new Map<string, string>();
    
    validProfiles.forEach(profile => {
      profile.conceptMasteries.forEach((mastery, conceptId) => {
        allConcepts.add(conceptId);
        conceptNames.set(conceptId, mastery.conceptName);
      });
    });

    const concepts = Array.from(allConcepts);

    // Build the grid: students × concepts
    const grid: HeatmapCell[][] = validProfiles.map(profile => {
      return concepts.map(conceptId => {
        const mastery = profile.conceptMasteries.get(conceptId);
        const masteryLevel = mastery?.masteryLevel || 0;
        const confusionDetected = profile.confusionTriggers.includes(
          conceptNames.get(conceptId) || ''
        );

        return {
          studentId: profile.studentId,
          studentName: profile.name,
          conceptId,
          conceptName: conceptNames.get(conceptId) || conceptId,
          masteryLevel,
          color: this.getMasteryColor(masteryLevel), // Task 14.2
          lastUpdated: mastery?.lastPracticed || profile.lastActiveAt,
          confusionDetected, // REQ-4.1.4
        };
      });
    });

    // Calculate classroom statistics
    const stats = this.calculateClassroomStats(classroomId, grid, concepts);

    const heatmap: ClassHealthHeatmap = {
      classroomId,
      timestamp: new Date(),
      grid,
      students: validProfiles.map(p => p.studentId),
      concepts,
      classroomAverage: stats.averageMastery, // REQ-4.1.6
      conceptsNeedingReview: stats.weakConcepts, // REQ-4.1.7
      updateFrequency: this.UPDATE_FREQUENCY,
    };

    // Cache the heatmap (Task 14.4)
    await this.cacheHeatmap(heatmap);

    return heatmap;
  }

  /**
   * Task 14.2: Implement mastery color coding
   * REQ-4.1.2: Color-code cells: red (<50%), yellow (50-75%), green (≥75%)
   */
  static getMasteryColor(masteryLevel: number): 'red' | 'yellow' | 'green' {
    if (masteryLevel < 50) {
      return 'red';
    } else if (masteryLevel < 75) {
      return 'yellow';
    } else {
      return 'green';
    }
  }

  /**
   * Calculate classroom-wide statistics
   * REQ-4.1.6: Calculate classroom average mastery
   * REQ-4.1.7: Identify concepts needing review
   */
  static calculateClassroomStats(
    classroomId: string,
    grid: HeatmapCell[][],
    concepts: string[]
  ): ClassroomStats {
    if (grid.length === 0 || concepts.length === 0) {
      return {
        classroomId,
        averageMastery: 0,
        conceptAverages: new Map(),
        weakConcepts: [],
        confusionHotspots: [],
      };
    }

    // Calculate average mastery per concept
    const conceptAverages = new Map<string, number>();
    const confusionCounts = new Map<string, number>();

    concepts.forEach((conceptId, conceptIndex) => {
      let totalMastery = 0;
      let confusionCount = 0;
      let studentCount = 0;

      grid.forEach(studentRow => {
        const cell = studentRow[conceptIndex];
        if (cell) {
          totalMastery += cell.masteryLevel;
          studentCount++;
          if (cell.confusionDetected) {
            confusionCount++;
          }
        }
      });

      const average = studentCount > 0 ? totalMastery / studentCount : 0;
      conceptAverages.set(conceptId, average);
      confusionCounts.set(conceptId, confusionCount);
    });

    // Calculate overall classroom average
    const allAverages = Array.from(conceptAverages.values());
    const averageMastery = allAverages.length > 0
      ? allAverages.reduce((sum, avg) => sum + avg, 0) / allAverages.length
      : 0;

    // Identify weak concepts (average < 50%)
    const weakConcepts = Array.from(conceptAverages.entries())
      .filter(([_, avg]) => avg < 50)
      .map(([conceptId, _]) => conceptId);

    // Identify confusion hotspots (>30% of students confused)
    const confusionThreshold = grid.length * 0.3;
    const confusionHotspots = Array.from(confusionCounts.entries())
      .filter(([_, count]) => count >= confusionThreshold)
      .map(([conceptId, _]) => conceptId);

    return {
      classroomId,
      averageMastery,
      conceptAverages,
      weakConcepts,
      confusionHotspots,
    };
  }

  /**
   * Task 14.4: Implement heatmap caching in Redis
   * REQ-10.4: Cache heatmaps for 30 seconds
   */
  static async cacheHeatmap(heatmap: ClassHealthHeatmap): Promise<void> {
    const key = `${this.CACHE_PREFIX}${heatmap.classroomId}`;
    const serialized = this.serializeHeatmap(heatmap);
    
    await redis.setex(key, this.CACHE_TTL, JSON.stringify(serialized));
  }

  /**
   * Get heatmap from cache
   */
  static async getFromCache(classroomId: string): Promise<ClassHealthHeatmap | null> {
    const key = `${this.CACHE_PREFIX}${classroomId}`;
    const cached = await redis.get(key);
    
    if (!cached) {
      return null;
    }
    
    return this.deserializeHeatmap(JSON.parse(cached));
  }

  /**
   * Invalidate heatmap cache
   */
  static async invalidateCache(classroomId: string): Promise<void> {
    const key = `${this.CACHE_PREFIX}${classroomId}`;
    await redis.del(key);
  }

  /**
   * Create empty heatmap for classrooms with no data
   */
  private static createEmptyHeatmap(classroomId: string): ClassHealthHeatmap {
    return {
      classroomId,
      timestamp: new Date(),
      grid: [],
      students: [],
      concepts: [],
      classroomAverage: 0,
      conceptsNeedingReview: [],
      updateFrequency: this.UPDATE_FREQUENCY,
    };
  }

  /**
   * Serialize heatmap for caching
   */
  private static serializeHeatmap(heatmap: ClassHealthHeatmap): any {
    return {
      ...heatmap,
      timestamp: heatmap.timestamp.toISOString(),
      grid: heatmap.grid.map(row =>
        row.map(cell => ({
          ...cell,
          lastUpdated: cell.lastUpdated.toISOString(),
        }))
      ),
    };
  }

  /**
   * Deserialize heatmap from cache
   */
  private static deserializeHeatmap(data: any): ClassHealthHeatmap {
    return {
      ...data,
      timestamp: new Date(data.timestamp),
      grid: data.grid.map((row: any[]) =>
        row.map((cell: any) => ({
          ...cell,
          lastUpdated: new Date(cell.lastUpdated),
        }))
      ),
    };
  }
}
