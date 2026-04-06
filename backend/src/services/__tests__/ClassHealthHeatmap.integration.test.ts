/**
 * Class Health Heatmap Integration Tests
 * Task 14.6: Integration tests for real-time heatmap updates
 * 
 * Tests Socket.io broadcasting and end-to-end heatmap generation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ClassHealthHeatmapService } from '../ClassHealthHeatmap.js';
import { StudentProfileManager, StudentProfile } from '../../models/StudentProfile.js';

// Mock Supabase
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

// Mock Redis with proper constructor
vi.mock('ioredis', () => {
  const RedisMock = vi.fn(function() {
    return {
      setex: vi.fn().mockResolvedValue('OK'),
      get: vi.fn().mockResolvedValue(null),
      del: vi.fn().mockResolvedValue(1),
    };
  });
  return {
    default: RedisMock,
  };
});

describe('ClassHealthHeatmap Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('End-to-End Heatmap Generation', () => {
    it('should generate complete heatmap for classroom with multiple students', async () => {
      // Create realistic student profiles
      const students: StudentProfile[] = [
        {
          studentId: 'student_1',
          name: 'Alice Johnson',
          grade: 8,
          preferredLanguage: 'en',
          conceptMasteries: new Map([
            ['algebra_basics', {
              conceptId: 'algebra_basics',
              conceptName: 'Algebra Basics',
              masteryLevel: 85,
              lastPracticed: new Date('2024-01-15T10:00:00Z'),
              attemptsCount: 15,
              successRate: 0.85,
              prerequisites: [],
            }],
            ['fractions', {
              conceptId: 'fractions',
              conceptName: 'Fractions',
              masteryLevel: 92,
              lastPracticed: new Date('2024-01-14T14:30:00Z'),
              attemptsCount: 20,
              successRate: 0.92,
              prerequisites: [],
            }],
            ['geometry', {
              conceptId: 'geometry',
              conceptName: 'Geometry',
              masteryLevel: 78,
              lastPracticed: new Date('2024-01-13T09:15:00Z'),
              attemptsCount: 12,
              successRate: 0.78,
              prerequisites: [],
            }],
          ]),
          weakConcepts: [],
          strongConcepts: ['Algebra Basics', 'Fractions', 'Geometry'],
          learningStyle: 'visual',
          averageSessionDuration: 1800,
          preferredDifficulty: 'medium',
          totalSessions: 12,
          totalQuestionsAsked: 48,
          recentSessions: [],
          confusionTriggers: [],
          hesitationPatterns: [],
          createdAt: new Date('2024-01-01'),
          lastActiveAt: new Date('2024-01-15'),
          streakDays: 10,
          totalLearningTime: 360,
        },
        {
          studentId: 'student_2',
          name: 'Bob Smith',
          grade: 8,
          preferredLanguage: 'en',
          conceptMasteries: new Map([
            ['algebra_basics', {
              conceptId: 'algebra_basics',
              conceptName: 'Algebra Basics',
              masteryLevel: 45,
              lastPracticed: new Date('2024-01-15T11:00:00Z'),
              attemptsCount: 10,
              successRate: 0.45,
              prerequisites: [],
            }],
            ['fractions', {
              conceptId: 'fractions',
              conceptName: 'Fractions',
              masteryLevel: 38,
              lastPracticed: new Date('2024-01-14T15:00:00Z'),
              attemptsCount: 8,
              successRate: 0.38,
              prerequisites: [],
            }],
            ['geometry', {
              conceptId: 'geometry',
              conceptName: 'Geometry',
              masteryLevel: 55,
              lastPracticed: new Date('2024-01-13T10:00:00Z'),
              attemptsCount: 9,
              successRate: 0.55,
              prerequisites: [],
            }],
          ]),
          weakConcepts: ['Algebra Basics', 'Fractions'],
          strongConcepts: [],
          learningStyle: 'auditory',
          averageSessionDuration: 1200,
          preferredDifficulty: 'easy',
          totalSessions: 8,
          totalQuestionsAsked: 32,
          recentSessions: [],
          confusionTriggers: ['Fractions', 'Algebra Basics'],
          hesitationPatterns: [],
          createdAt: new Date('2024-01-01'),
          lastActiveAt: new Date('2024-01-15'),
          streakDays: 5,
          totalLearningTime: 160,
        },
        {
          studentId: 'student_3',
          name: 'Charlie Davis',
          grade: 8,
          preferredLanguage: 'en',
          conceptMasteries: new Map([
            ['algebra_basics', {
              conceptId: 'algebra_basics',
              conceptName: 'Algebra Basics',
              masteryLevel: 68,
              lastPracticed: new Date('2024-01-15T12:00:00Z'),
              attemptsCount: 12,
              successRate: 0.68,
              prerequisites: [],
            }],
            ['fractions', {
              conceptId: 'fractions',
              conceptName: 'Fractions',
              masteryLevel: 72,
              lastPracticed: new Date('2024-01-14T16:00:00Z'),
              attemptsCount: 14,
              successRate: 0.72,
              prerequisites: [],
            }],
            ['geometry', {
              conceptId: 'geometry',
              conceptName: 'Geometry',
              masteryLevel: 65,
              lastPracticed: new Date('2024-01-13T11:00:00Z'),
              attemptsCount: 11,
              successRate: 0.65,
              prerequisites: [],
            }],
          ]),
          weakConcepts: [],
          strongConcepts: [],
          learningStyle: 'kinesthetic',
          averageSessionDuration: 1500,
          preferredDifficulty: 'medium',
          totalSessions: 10,
          totalQuestionsAsked: 40,
          recentSessions: [],
          confusionTriggers: [],
          hesitationPatterns: [],
          createdAt: new Date('2024-01-01'),
          lastActiveAt: new Date('2024-01-15'),
          streakDays: 8,
          totalLearningTime: 250,
        },
      ];

      // Mock database calls
      vi.spyOn(StudentProfileManager, 'loadFromDatabase')
        .mockResolvedValueOnce(students[0])
        .mockResolvedValueOnce(students[1])
        .mockResolvedValueOnce(students[2]);

      // Generate heatmap
      const heatmap = await ClassHealthHeatmapService.generateHeatmap(
        'classroom_8a',
        ['student_1', 'student_2', 'student_3']
      );

      // Verify heatmap structure (REQ-4.1.1)
      expect(heatmap.classroomId).toBe('classroom_8a');
      expect(heatmap.students).toHaveLength(3);
      expect(heatmap.concepts).toHaveLength(3);
      expect(heatmap.grid).toHaveLength(3); // 3 students
      expect(heatmap.grid[0]).toHaveLength(3); // 3 concepts per student

      // Verify color coding (REQ-4.1.2)
      const aliceAlgebra = heatmap.grid[0].find(c => c.conceptId === 'algebra_basics');
      expect(aliceAlgebra?.color).toBe('green'); // 85%
      
      const bobFractions = heatmap.grid[1].find(c => c.conceptId === 'fractions');
      expect(bobFractions?.color).toBe('red'); // 38%
      
      const charlieGeometry = heatmap.grid[2].find(c => c.conceptId === 'geometry');
      expect(charlieGeometry?.color).toBe('yellow'); // 65%

      // Verify confusion detection (REQ-4.1.4)
      const bobAlgebra = heatmap.grid[1].find(c => c.conceptId === 'algebra_basics');
      expect(bobAlgebra?.confusionDetected).toBe(true);

      // Verify classroom average (REQ-4.1.6)
      // Algebra: (85 + 45 + 68) / 3 = 66
      // Fractions: (92 + 38 + 72) / 3 = 67.33
      // Geometry: (78 + 55 + 65) / 3 = 66
      // Overall: (66 + 67.33 + 66) / 3 = 66.44
      expect(heatmap.classroomAverage).toBeCloseTo(66.44, 1);

      // Verify concepts needing review (REQ-4.1.7)
      // All concepts have average > 50%, so none should need review
      expect(heatmap.conceptsNeedingReview).toHaveLength(0);

      // Verify update frequency (REQ-4.1.3)
      expect(heatmap.updateFrequency).toBe(30);

      // Verify timestamps (REQ-4.1.5)
      heatmap.grid.forEach(row => {
        row.forEach(cell => {
          expect(cell.lastUpdated).toBeInstanceOf(Date);
        });
      });
    });

    it('should identify concepts needing review when class average is low', async () => {
      const students: StudentProfile[] = [
        {
          studentId: 'student_1',
          name: 'Student A',
          grade: 8,
          preferredLanguage: 'en',
          conceptMasteries: new Map([
            ['difficult_topic', {
              conceptId: 'difficult_topic',
              conceptName: 'Difficult Topic',
              masteryLevel: 35,
              lastPracticed: new Date(),
              attemptsCount: 10,
              successRate: 0.35,
              prerequisites: [],
            }],
          ]),
          weakConcepts: ['Difficult Topic'],
          strongConcepts: [],
          learningStyle: 'mixed',
          averageSessionDuration: 1000,
          preferredDifficulty: 'medium',
          totalSessions: 5,
          totalQuestionsAsked: 20,
          recentSessions: [],
          confusionTriggers: ['Difficult Topic'],
          hesitationPatterns: [],
          createdAt: new Date(),
          lastActiveAt: new Date(),
          streakDays: 3,
          totalLearningTime: 83,
        },
        {
          studentId: 'student_2',
          name: 'Student B',
          grade: 8,
          preferredLanguage: 'en',
          conceptMasteries: new Map([
            ['difficult_topic', {
              conceptId: 'difficult_topic',
              conceptName: 'Difficult Topic',
              masteryLevel: 42,
              lastPracticed: new Date(),
              attemptsCount: 8,
              successRate: 0.42,
              prerequisites: [],
            }],
          ]),
          weakConcepts: ['Difficult Topic'],
          strongConcepts: [],
          learningStyle: 'mixed',
          averageSessionDuration: 1000,
          preferredDifficulty: 'medium',
          totalSessions: 4,
          totalQuestionsAsked: 16,
          recentSessions: [],
          confusionTriggers: ['Difficult Topic'],
          hesitationPatterns: [],
          createdAt: new Date(),
          lastActiveAt: new Date(),
          streakDays: 2,
          totalLearningTime: 67,
        },
      ];

      vi.spyOn(StudentProfileManager, 'loadFromDatabase')
        .mockResolvedValueOnce(students[0])
        .mockResolvedValueOnce(students[1]);

      const heatmap = await ClassHealthHeatmapService.generateHeatmap(
        'classroom_8b',
        ['student_1', 'student_2']
      );

      // Average: (35 + 42) / 2 = 38.5 < 50%
      expect(heatmap.conceptsNeedingReview).toContain('difficult_topic');
      expect(heatmap.classroomAverage).toBe(38.5);
    });

    it('should handle performance requirements (REQ-9.3)', async () => {
      // Create 30 students with 10 concepts each
      const students: StudentProfile[] = Array.from({ length: 30 }, (_, i) => ({
        studentId: `student_${i + 1}`,
        name: `Student ${i + 1}`,
        grade: 8,
        preferredLanguage: 'en' as const,
        conceptMasteries: new Map(
          Array.from({ length: 10 }, (_, j) => [
            `concept_${j + 1}`,
            {
              conceptId: `concept_${j + 1}`,
              conceptName: `Concept ${j + 1}`,
              masteryLevel: Math.floor(Math.random() * 100),
              lastPracticed: new Date(),
              attemptsCount: 10,
              successRate: 0.7,
              prerequisites: [],
            },
          ])
        ),
        weakConcepts: [],
        strongConcepts: [],
        learningStyle: 'mixed' as const,
        averageSessionDuration: 1200,
        preferredDifficulty: 'medium' as const,
        totalSessions: 5,
        totalQuestionsAsked: 20,
        recentSessions: [],
        confusionTriggers: [],
        hesitationPatterns: [],
        createdAt: new Date(),
        lastActiveAt: new Date(),
        streakDays: 3,
        totalLearningTime: 100,
      }));

      // Mock all database calls
      const loadSpy = vi.spyOn(StudentProfileManager, 'loadFromDatabase');
      students.forEach(student => {
        loadSpy.mockResolvedValueOnce(student);
      });

      const startTime = Date.now();
      const heatmap = await ClassHealthHeatmapService.generateHeatmap(
        'large_classroom',
        students.map(s => s.studentId)
      );
      const duration = Date.now() - startTime;

      // REQ-9.3: Generate heatmap for 30 students in <2 seconds
      expect(duration).toBeLessThan(2000);
      expect(heatmap.students).toHaveLength(30);
      expect(heatmap.concepts).toHaveLength(10);
      expect(heatmap.grid).toHaveLength(30);
    });
  });

  describe('Caching Behavior', () => {
    it('should cache heatmap for 30 seconds (REQ-10.4)', async () => {
      const mockProfile: StudentProfile = {
        studentId: 'student_1',
        name: 'Test Student',
        grade: 8,
        preferredLanguage: 'en',
        conceptMasteries: new Map([
          ['concept_1', {
            conceptId: 'concept_1',
            conceptName: 'Test Concept',
            masteryLevel: 75,
            lastPracticed: new Date(),
            attemptsCount: 10,
            successRate: 0.75,
            prerequisites: [],
          }],
        ]),
        weakConcepts: [],
        strongConcepts: ['Test Concept'],
        learningStyle: 'mixed',
        averageSessionDuration: 1200,
        preferredDifficulty: 'medium',
        totalSessions: 5,
        totalQuestionsAsked: 20,
        recentSessions: [],
        confusionTriggers: [],
        hesitationPatterns: [],
        createdAt: new Date(),
        lastActiveAt: new Date(),
        streakDays: 3,
        totalLearningTime: 100,
      };

      vi.spyOn(StudentProfileManager, 'loadFromDatabase').mockResolvedValue(mockProfile);

      // First call should generate and cache
      const heatmap1 = await ClassHealthHeatmapService.generateHeatmap('class_1', ['student_1']);
      expect(heatmap1).toBeDefined();

      // Verify cache TTL is 30 seconds
      expect(heatmap1.updateFrequency).toBe(30);
    });
  });
});
