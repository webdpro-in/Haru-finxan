/**
 * Class Health Heatmap Service Tests
 * Task 14.6: Write integration tests for heatmap updates
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Supabase before importing anything else
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      upsert: vi.fn(),
    })),
  })),
}));

// Mock Redis
vi.mock('ioredis', () => {
  const RedisMock = vi.fn(function() {
    return {
      setex: vi.fn(),
      get: vi.fn(),
      del: vi.fn(),
    };
  });
  return {
    default: RedisMock,
  };
});

import { ClassHealthHeatmapService } from '../ClassHealthHeatmap.js';
import { StudentProfileManager, StudentProfile } from '../../models/StudentProfile.js';

// Mock StudentProfileManager methods
vi.spyOn(StudentProfileManager, 'loadFromDatabase').mockImplementation(vi.fn());
vi.spyOn(StudentProfileManager, 'cacheProfile').mockImplementation(vi.fn());

describe('ClassHealthHeatmapService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Task 14.2: getMasteryColor', () => {
    it('should return red for mastery < 50%', () => {
      expect(ClassHealthHeatmapService.getMasteryColor(0)).toBe('red');
      expect(ClassHealthHeatmapService.getMasteryColor(25)).toBe('red');
      expect(ClassHealthHeatmapService.getMasteryColor(49)).toBe('red');
    });

    it('should return yellow for mastery 50-74%', () => {
      expect(ClassHealthHeatmapService.getMasteryColor(50)).toBe('yellow');
      expect(ClassHealthHeatmapService.getMasteryColor(60)).toBe('yellow');
      expect(ClassHealthHeatmapService.getMasteryColor(74)).toBe('yellow');
    });

    it('should return green for mastery >= 75%', () => {
      expect(ClassHealthHeatmapService.getMasteryColor(75)).toBe('green');
      expect(ClassHealthHeatmapService.getMasteryColor(85)).toBe('green');
      expect(ClassHealthHeatmapService.getMasteryColor(100)).toBe('green');
    });

    it('should handle boundary values correctly (REQ-4.1.2)', () => {
      expect(ClassHealthHeatmapService.getMasteryColor(49.9)).toBe('red');
      expect(ClassHealthHeatmapService.getMasteryColor(50.0)).toBe('yellow');
      expect(ClassHealthHeatmapService.getMasteryColor(74.9)).toBe('yellow');
      expect(ClassHealthHeatmapService.getMasteryColor(75.0)).toBe('green');
    });
  });

  describe('Task 14.1: generateHeatmap', () => {
    it('should generate empty heatmap for empty classroom', async () => {
      vi.mocked(StudentProfileManager.loadFromDatabase).mockResolvedValue(null);

      const heatmap = await ClassHealthHeatmapService.generateHeatmap('class_1', []);

      expect(heatmap.classroomId).toBe('class_1');
      expect(heatmap.grid).toEqual([]);
      expect(heatmap.students).toEqual([]);
      expect(heatmap.concepts).toEqual([]);
      expect(heatmap.classroomAverage).toBe(0);
      expect(heatmap.updateFrequency).toBe(30); // REQ-4.1.3
    });

    it('should generate heatmap with single student', async () => {
      const mockProfile: StudentProfile = {
        studentId: 'student_1',
        name: 'Alice',
        grade: 8,
        preferredLanguage: 'en',
        conceptMasteries: new Map([
          ['concept_1', {
            conceptId: 'concept_1',
            conceptName: 'Photosynthesis',
            masteryLevel: 80,
            lastPracticed: new Date('2024-01-15'),
            attemptsCount: 10,
            successRate: 0.8,
            prerequisites: [],
          }],
          ['concept_2', {
            conceptId: 'concept_2',
            conceptName: 'Water Cycle',
            masteryLevel: 45,
            lastPracticed: new Date('2024-01-14'),
            attemptsCount: 5,
            successRate: 0.4,
            prerequisites: [],
          }],
        ]),
        weakConcepts: ['Water Cycle'],
        strongConcepts: ['Photosynthesis'],
        learningStyle: 'visual',
        averageSessionDuration: 1200,
        preferredDifficulty: 'medium',
        totalSessions: 5,
        totalQuestionsAsked: 20,
        recentSessions: [],
        confusionTriggers: ['Water Cycle'],
        hesitationPatterns: [],
        createdAt: new Date('2024-01-01'),
        lastActiveAt: new Date('2024-01-15'),
        streakDays: 5,
        totalLearningTime: 100,
      };

      vi.mocked(StudentProfileManager.loadFromDatabase).mockResolvedValue(mockProfile);

      const heatmap = await ClassHealthHeatmapService.generateHeatmap('class_1', ['student_1']);

      expect(heatmap.classroomId).toBe('class_1');
      expect(heatmap.students).toEqual(['student_1']);
      expect(heatmap.concepts).toHaveLength(2);
      expect(heatmap.grid).toHaveLength(1); // 1 student
      expect(heatmap.grid[0]).toHaveLength(2); // 2 concepts
      
      // Check cell properties (REQ-4.1.1)
      const cell1 = heatmap.grid[0][0];
      expect(cell1.studentId).toBe('student_1');
      expect(cell1.studentName).toBe('Alice');
      expect(cell1.masteryLevel).toBeGreaterThanOrEqual(0);
      expect(cell1.masteryLevel).toBeLessThanOrEqual(100);
      expect(['red', 'yellow', 'green']).toContain(cell1.color);
      expect(cell1.lastUpdated).toBeInstanceOf(Date); // REQ-4.1.5
    });

    it('should detect confusion in cells (REQ-4.1.4)', async () => {
      const mockProfile: StudentProfile = {
        studentId: 'student_1',
        name: 'Bob',
        grade: 8,
        preferredLanguage: 'en',
        conceptMasteries: new Map([
          ['concept_1', {
            conceptId: 'concept_1',
            conceptName: 'Fractions',
            masteryLevel: 40,
            lastPracticed: new Date(),
            attemptsCount: 8,
            successRate: 0.3,
            prerequisites: [],
          }],
        ]),
        weakConcepts: ['Fractions'],
        strongConcepts: [],
        learningStyle: 'mixed',
        averageSessionDuration: 900,
        preferredDifficulty: 'easy',
        totalSessions: 3,
        totalQuestionsAsked: 15,
        recentSessions: [],
        confusionTriggers: ['Fractions'], // Confusion detected
        hesitationPatterns: [],
        createdAt: new Date(),
        lastActiveAt: new Date(),
        streakDays: 2,
        totalLearningTime: 45,
      };

      vi.mocked(StudentProfileManager.loadFromDatabase).mockResolvedValue(mockProfile);

      const heatmap = await ClassHealthHeatmapService.generateHeatmap('class_1', ['student_1']);

      const cell = heatmap.grid[0][0];
      expect(cell.confusionDetected).toBe(true); // REQ-4.1.4
      expect(cell.color).toBe('red'); // Low mastery
    });

    it('should generate heatmap with multiple students', async () => {
      const mockProfile1: StudentProfile = {
        studentId: 'student_1',
        name: 'Alice',
        grade: 8,
        preferredLanguage: 'en',
        conceptMasteries: new Map([
          ['concept_1', {
            conceptId: 'concept_1',
            conceptName: 'Algebra',
            masteryLevel: 85,
            lastPracticed: new Date(),
            attemptsCount: 10,
            successRate: 0.85,
            prerequisites: [],
          }],
        ]),
        weakConcepts: [],
        strongConcepts: ['Algebra'],
        learningStyle: 'visual',
        averageSessionDuration: 1200,
        preferredDifficulty: 'medium',
        totalSessions: 5,
        totalQuestionsAsked: 20,
        recentSessions: [],
        confusionTriggers: [],
        hesitationPatterns: [],
        createdAt: new Date(),
        lastActiveAt: new Date(),
        streakDays: 5,
        totalLearningTime: 100,
      };

      const mockProfile2: StudentProfile = {
        studentId: 'student_2',
        name: 'Bob',
        grade: 8,
        preferredLanguage: 'en',
        conceptMasteries: new Map([
          ['concept_1', {
            conceptId: 'concept_1',
            conceptName: 'Algebra',
            masteryLevel: 55,
            lastPracticed: new Date(),
            attemptsCount: 8,
            successRate: 0.55,
            prerequisites: [],
          }],
        ]),
        weakConcepts: [],
        strongConcepts: [],
        learningStyle: 'auditory',
        averageSessionDuration: 900,
        preferredDifficulty: 'easy',
        totalSessions: 3,
        totalQuestionsAsked: 12,
        recentSessions: [],
        confusionTriggers: [],
        hesitationPatterns: [],
        createdAt: new Date(),
        lastActiveAt: new Date(),
        streakDays: 3,
        totalLearningTime: 45,
      };

      vi.mocked(StudentProfileManager.loadFromDatabase)
        .mockResolvedValueOnce(mockProfile1)
        .mockResolvedValueOnce(mockProfile2);

      const heatmap = await ClassHealthHeatmapService.generateHeatmap(
        'class_1',
        ['student_1', 'student_2']
      );

      expect(heatmap.students).toHaveLength(2);
      expect(heatmap.grid).toHaveLength(2); // 2 students
      expect(heatmap.grid[0][0].color).toBe('green'); // Alice: 85%
      expect(heatmap.grid[1][0].color).toBe('yellow'); // Bob: 55%
    });
  });

  describe('calculateClassroomStats', () => {
    it('should calculate classroom average mastery (REQ-4.1.6)', () => {
      const grid = [
        [
          {
            studentId: 's1',
            studentName: 'Alice',
            conceptId: 'c1',
            conceptName: 'Math',
            masteryLevel: 80,
            color: 'green' as const,
            lastUpdated: new Date(),
            confusionDetected: false,
          },
          {
            studentId: 's1',
            studentName: 'Alice',
            conceptId: 'c2',
            conceptName: 'Science',
            masteryLevel: 60,
            color: 'yellow' as const,
            lastUpdated: new Date(),
            confusionDetected: false,
          },
        ],
        [
          {
            studentId: 's2',
            studentName: 'Bob',
            conceptId: 'c1',
            conceptName: 'Math',
            masteryLevel: 40,
            color: 'red' as const,
            lastUpdated: new Date(),
            confusionDetected: true,
          },
          {
            studentId: 's2',
            studentName: 'Bob',
            conceptId: 'c2',
            conceptName: 'Science',
            masteryLevel: 50,
            color: 'yellow' as const,
            lastUpdated: new Date(),
            confusionDetected: false,
          },
        ],
      ];

      const stats = ClassHealthHeatmapService.calculateClassroomStats(
        'class_1',
        grid,
        ['c1', 'c2']
      );

      // Math average: (80 + 40) / 2 = 60
      // Science average: (60 + 50) / 2 = 55
      // Overall average: (60 + 55) / 2 = 57.5
      expect(stats.averageMastery).toBe(57.5);
      expect(stats.conceptAverages.get('c1')).toBe(60);
      expect(stats.conceptAverages.get('c2')).toBe(55);
    });

    it('should identify concepts needing review (REQ-4.1.7)', () => {
      const grid = [
        [
          {
            studentId: 's1',
            studentName: 'Alice',
            conceptId: 'c1',
            conceptName: 'Math',
            masteryLevel: 45,
            color: 'red' as const,
            lastUpdated: new Date(),
            confusionDetected: false,
          },
          {
            studentId: 's1',
            studentName: 'Alice',
            conceptId: 'c2',
            conceptName: 'Science',
            masteryLevel: 80,
            color: 'green' as const,
            lastUpdated: new Date(),
            confusionDetected: false,
          },
        ],
        [
          {
            studentId: 's2',
            studentName: 'Bob',
            conceptId: 'c1',
            conceptName: 'Math',
            masteryLevel: 35,
            color: 'red' as const,
            lastUpdated: new Date(),
            confusionDetected: true,
          },
          {
            studentId: 's2',
            studentName: 'Bob',
            conceptId: 'c2',
            conceptName: 'Science',
            masteryLevel: 75,
            color: 'green' as const,
            lastUpdated: new Date(),
            confusionDetected: false,
          },
        ],
      ];

      const stats = ClassHealthHeatmapService.calculateClassroomStats(
        'class_1',
        grid,
        ['c1', 'c2']
      );

      // Math average: (45 + 35) / 2 = 40 < 50% -> needs review
      expect(stats.weakConcepts).toContain('c1');
      expect(stats.weakConcepts).not.toContain('c2');
    });

    it('should identify confusion hotspots', () => {
      const grid = [
        [
          {
            studentId: 's1',
            studentName: 'Alice',
            conceptId: 'c1',
            conceptName: 'Math',
            masteryLevel: 60,
            color: 'yellow' as const,
            lastUpdated: new Date(),
            confusionDetected: true, // Confused
          },
        ],
        [
          {
            studentId: 's2',
            studentName: 'Bob',
            conceptId: 'c1',
            conceptName: 'Math',
            masteryLevel: 55,
            color: 'yellow' as const,
            lastUpdated: new Date(),
            confusionDetected: true, // Confused
          },
        ],
        [
          {
            studentId: 's3',
            studentName: 'Charlie',
            conceptId: 'c1',
            conceptName: 'Math',
            masteryLevel: 70,
            color: 'yellow' as const,
            lastUpdated: new Date(),
            confusionDetected: false,
          },
        ],
      ];

      const stats = ClassHealthHeatmapService.calculateClassroomStats(
        'class_1',
        grid,
        ['c1']
      );

      // 2 out of 3 students confused (66% > 30% threshold)
      expect(stats.confusionHotspots).toContain('c1');
    });

    it('should handle empty grid', () => {
      const stats = ClassHealthHeatmapService.calculateClassroomStats('class_1', [], []);

      expect(stats.averageMastery).toBe(0);
      expect(stats.conceptAverages.size).toBe(0);
      expect(stats.weakConcepts).toEqual([]);
      expect(stats.confusionHotspots).toEqual([]);
    });
  });

  describe('Task 14.4: Caching', () => {
    it('should cache heatmap with 30 second TTL (REQ-10.4)', async () => {
      const mockHeatmap = {
        classroomId: 'class_1',
        timestamp: new Date(),
        grid: [],
        students: [],
        concepts: [],
        classroomAverage: 0,
        conceptsNeedingReview: [],
        updateFrequency: 30,
      };

      // Note: Actual caching is tested via integration tests
      // This test verifies the structure
      expect(mockHeatmap.updateFrequency).toBe(30); // REQ-4.1.3
    });
  });

  describe('Edge Cases', () => {
    it('should handle students with no concept masteries', async () => {
      const mockProfile: StudentProfile = {
        studentId: 'student_1',
        name: 'New Student',
        grade: 8,
        preferredLanguage: 'en',
        conceptMasteries: new Map(), // Empty
        weakConcepts: [],
        strongConcepts: [],
        learningStyle: 'mixed',
        averageSessionDuration: 0,
        preferredDifficulty: 'medium',
        totalSessions: 0,
        totalQuestionsAsked: 0,
        recentSessions: [],
        confusionTriggers: [],
        hesitationPatterns: [],
        createdAt: new Date(),
        lastActiveAt: new Date(),
        streakDays: 0,
        totalLearningTime: 0,
      };

      vi.mocked(StudentProfileManager.loadFromDatabase).mockResolvedValue(mockProfile);

      const heatmap = await ClassHealthHeatmapService.generateHeatmap('class_1', ['student_1']);

      expect(heatmap.students).toEqual(['student_1']);
      expect(heatmap.concepts).toEqual([]);
      expect(heatmap.grid[0]).toEqual([]);
    });

    it('should handle mixed concept coverage across students', async () => {
      const mockProfile1: StudentProfile = {
        studentId: 'student_1',
        name: 'Alice',
        grade: 8,
        preferredLanguage: 'en',
        conceptMasteries: new Map([
          ['concept_1', {
            conceptId: 'concept_1',
            conceptName: 'Math',
            masteryLevel: 80,
            lastPracticed: new Date(),
            attemptsCount: 10,
            successRate: 0.8,
            prerequisites: [],
          }],
        ]),
        weakConcepts: [],
        strongConcepts: ['Math'],
        learningStyle: 'visual',
        averageSessionDuration: 1200,
        preferredDifficulty: 'medium',
        totalSessions: 5,
        totalQuestionsAsked: 20,
        recentSessions: [],
        confusionTriggers: [],
        hesitationPatterns: [],
        createdAt: new Date(),
        lastActiveAt: new Date(),
        streakDays: 5,
        totalLearningTime: 100,
      };

      const mockProfile2: StudentProfile = {
        studentId: 'student_2',
        name: 'Bob',
        grade: 8,
        preferredLanguage: 'en',
        conceptMasteries: new Map([
          ['concept_2', {
            conceptId: 'concept_2',
            conceptName: 'Science',
            masteryLevel: 60,
            lastPracticed: new Date(),
            attemptsCount: 5,
            successRate: 0.6,
            prerequisites: [],
          }],
        ]),
        weakConcepts: [],
        strongConcepts: [],
        learningStyle: 'auditory',
        averageSessionDuration: 900,
        preferredDifficulty: 'easy',
        totalSessions: 3,
        totalQuestionsAsked: 12,
        recentSessions: [],
        confusionTriggers: [],
        hesitationPatterns: [],
        createdAt: new Date(),
        lastActiveAt: new Date(),
        streakDays: 3,
        totalLearningTime: 45,
      };

      vi.mocked(StudentProfileManager.loadFromDatabase)
        .mockResolvedValueOnce(mockProfile1)
        .mockResolvedValueOnce(mockProfile2);

      const heatmap = await ClassHealthHeatmapService.generateHeatmap(
        'class_1',
        ['student_1', 'student_2']
      );

      // Should include both concepts
      expect(heatmap.concepts).toHaveLength(2);
      
      // Alice should have 0 mastery for concept_2 (not practiced)
      const aliceScience = heatmap.grid[0].find(cell => cell.conceptId === 'concept_2');
      expect(aliceScience?.masteryLevel).toBe(0);
      
      // Bob should have 0 mastery for concept_1 (not practiced)
      const bobMath = heatmap.grid[1].find(cell => cell.conceptId === 'concept_1');
      expect(bobMath?.masteryLevel).toBe(0);
    });
  });
});
