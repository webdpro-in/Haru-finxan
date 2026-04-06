/**
 * Unit Tests for Analogy Switching Engine
 * 
 * Tests cover:
 * - REQ-2.4.1: Database of 50+ analogies per concept
 * - REQ-2.4.2: Track which analogies have been used per student
 * - REQ-2.4.3: Automatically switch analogy when student remains confused
 * - REQ-2.4.4: Reset analogy usage after all are exhausted
 * - REQ-2.4.5: Select analogies appropriate for student's grade level
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnalogyEngine, Analogy } from '../AnalogyEngine';
import { supabase } from '../../config/supabase';

// Mock Supabase
vi.mock('../../config/supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}));

describe('AnalogyEngine', () => {
  let engine: AnalogyEngine;
  let mockFrom: any;
  let mockSelect: any;
  let mockEq: any;
  let mockLte: any;
  let mockGte: any;
  let mockOrder: any;
  let mockInsert: any;
  let mockUpdate: any;
  let mockDelete: any;

  beforeEach(() => {
    engine = new AnalogyEngine();
    
    // Reset all mocks
    vi.clearAllMocks();

    // Setup mock chain
    mockDelete = vi.fn().mockReturnThis();
    mockUpdate = vi.fn().mockReturnThis();
    mockInsert = vi.fn().mockResolvedValue({ data: null, error: null });
    mockOrder = vi.fn().mockReturnThis();
    mockGte = vi.fn().mockReturnThis();
    mockLte = vi.fn().mockReturnThis();
    mockEq = vi.fn().mockReturnThis();
    mockSelect = vi.fn().mockReturnThis();
    mockFrom = vi.fn().mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete
    });

    (supabase.from as any) = mockFrom;
  });

  describe('getNextAnalogy', () => {
    const mockAnalogies: Analogy[] = [
      {
        analogy_id: 'a1',
        concept_id: 'math_fractions',
        concept_name: 'Fractions',
        analogy_text: 'Like cutting a pizza',
        grade_level: 3,
        difficulty: 'easy',
        subject: 'math'
      },
      {
        analogy_id: 'a2',
        concept_id: 'math_fractions',
        concept_name: 'Fractions',
        analogy_text: 'Like sharing chocolate',
        grade_level: 4,
        difficulty: 'easy',
        subject: 'math'
      },
      {
        analogy_id: 'a3',
        concept_id: 'math_fractions',
        concept_name: 'Fractions',
        analogy_text: 'Like a clock face',
        grade_level: 5,
        difficulty: 'medium',
        subject: 'math'
      }
    ];

    it('should return first unused analogy for new student', async () => {
      // Mock analogies query
      mockSelect.mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          lte: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: mockAnalogies,
                error: null
              })
            })
          })
        })
      });

      // Mock empty usage (new student)
      mockSelect.mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [],
            error: null
          })
        })
      });

      const result = await engine.getNextAnalogy('math_fractions', 'student1', 4, false);

      expect(result).toEqual(mockAnalogies[0]);
      expect(mockFrom).toHaveBeenCalledWith('analogies');
      expect(mockFrom).toHaveBeenCalledWith('student_analogy_usage');
    });

    it('should skip already used analogies', async () => {
      // Mock analogies query
      mockSelect.mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          lte: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: mockAnalogies,
                error: null
              })
            })
          })
        })
      });

      // Mock usage showing first analogy was used
      mockSelect.mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [{ analogy_id: 'a1' }],
            error: null
          })
        })
      });

      const result = await engine.getNextAnalogy('math_fractions', 'student1', 4, false);

      // Should return second analogy since first was used
      expect(result).toEqual(mockAnalogies[1]);
    });

    it('should filter analogies by grade level (REQ-2.4.5)', async () => {
      const studentGrade = 4;

      // Mock analogies query
      mockSelect.mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          lte: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: mockAnalogies.filter(
                  a => a.grade_level <= studentGrade + 2 && a.grade_level >= studentGrade - 1
                ),
                error: null
              })
            })
          })
        })
      });

      // Mock empty usage
      mockSelect.mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [],
            error: null
          })
        })
      });

      const result = await engine.getNextAnalogy('math_fractions', 'student1', studentGrade, false);

      expect(result).toBeTruthy();
      expect(result!.grade_level).toBeGreaterThanOrEqual(studentGrade - 1);
      expect(result!.grade_level).toBeLessThanOrEqual(studentGrade + 2);
    });

    it('should reset usage when all analogies exhausted (REQ-2.4.4)', async () => {
      // Mock analogies query
      mockSelect.mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          lte: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: mockAnalogies,
                error: null
              })
            })
          })
        })
      });

      // Mock usage showing all analogies were used
      mockSelect.mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [
              { analogy_id: 'a1' },
              { analogy_id: 'a2' },
              { analogy_id: 'a3' }
            ],
            error: null
          })
        })
      });

      // Mock delete for reset
      mockDelete.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null })
        })
      });

      const result = await engine.getNextAnalogy('math_fractions', 'student1', 4, false);

      // Should reset and return first analogy
      expect(result).toEqual(mockAnalogies[0]);
      expect(mockDelete).toHaveBeenCalled();
    });

    it('should track confusion when detected (REQ-2.4.3)', async () => {
      // Mock analogies query
      mockSelect.mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          lte: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: mockAnalogies,
                error: null
              })
            })
          })
        })
      });

      // Mock empty usage
      mockSelect.mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [],
            error: null
          })
        })
      });

      // Call with confusion detected
      const result = await engine.getNextAnalogy('math_fractions', 'student1', 4, true);

      // Should still return an analogy even with confusion
      expect(result).toEqual(mockAnalogies[0]);
      
      // Verify from was called for insert (third call after analogies and usage queries)
      expect(mockFrom).toHaveBeenCalledWith('student_analogy_usage');
    });

    it('should return null when no analogies found', async () => {
      // Mock empty analogies query
      mockSelect.mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          lte: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          })
        })
      });

      const result = await engine.getNextAnalogy('unknown_concept', 'student1', 4, false);

      expect(result).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      // Mock error in analogies query
      mockSelect.mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          lte: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database error' }
              })
            })
          })
        })
      });

      const result = await engine.getNextAnalogy('math_fractions', 'student1', 4, false);

      expect(result).toBeNull();
    });
  });

  describe('markAnalogyFeedback', () => {
    it('should update feedback for an analogy', async () => {
      const mockUpdateChain = {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null })
          })
        })
      };
      mockFrom.mockReturnValue(mockUpdateChain);

      await engine.markAnalogyFeedback('student1', 'a1', true, true);

      expect(mockUpdateChain.update).toHaveBeenCalledWith({
        was_helpful: true,
        confusion_resolved: true
      });
    });

    it('should handle update errors gracefully', async () => {
      const mockUpdateChain = {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: { message: 'Update failed' } })
          })
        })
      };
      mockFrom.mockReturnValue(mockUpdateChain);

      // Should not throw
      await expect(
        engine.markAnalogyFeedback('student1', 'a1', true, true)
      ).resolves.not.toThrow();
    });
  });

  describe('getAnalogyStats', () => {
    it('should return statistics for a concept', async () => {
      // Mock count query
      mockSelect.mockReturnValueOnce({
        eq: vi.fn().mockResolvedValue({
          count: 50
        })
      });

      // Mock usage query
      mockSelect.mockReturnValueOnce({
        eq: vi.fn().mockResolvedValue({
          data: [
            { was_helpful: true, confusion_resolved: true },
            { was_helpful: true, confusion_resolved: false },
            { was_helpful: false, confusion_resolved: false },
            { was_helpful: null, confusion_resolved: true }
          ]
        })
      });

      const stats = await engine.getAnalogyStats('math_fractions');

      expect(stats.totalAnalogies).toBe(50);
      expect(stats.totalUsages).toBe(4);
      expect(stats.helpfulCount).toBe(2);
      expect(stats.confusionResolvedCount).toBe(2);
      expect(stats.averageHelpfulness).toBe(0.5);
    });

    it('should handle empty usage data', async () => {
      // Mock count query
      mockSelect.mockReturnValueOnce({
        eq: vi.fn().mockResolvedValue({
          count: 50
        })
      });

      // Mock empty usage query
      mockSelect.mockReturnValueOnce({
        eq: vi.fn().mockResolvedValue({
          data: []
        })
      });

      const stats = await engine.getAnalogyStats('math_fractions');

      expect(stats.totalAnalogies).toBe(50);
      expect(stats.totalUsages).toBe(0);
      expect(stats.averageHelpfulness).toBe(0);
    });
  });

  describe('getAvailableConcepts', () => {
    it('should return list of concepts with counts', async () => {
      const mockData = [
        { concept_id: 'math_fractions', concept_name: 'Fractions', subject: 'math' },
        { concept_id: 'math_fractions', concept_name: 'Fractions', subject: 'math' },
        { concept_id: 'science_photosynthesis', concept_name: 'Photosynthesis', subject: 'science' }
      ];

      mockSelect.mockResolvedValue({
        data: mockData,
        error: null
      });

      const concepts = await engine.getAvailableConcepts();

      expect(concepts).toHaveLength(2);
      expect(concepts[0].concept_id).toBe('math_fractions');
      expect(concepts[0].analogy_count).toBe(2);
      expect(concepts[1].concept_id).toBe('science_photosynthesis');
      expect(concepts[1].analogy_count).toBe(1);
    });

    it('should handle errors gracefully', async () => {
      mockSelect.mockResolvedValue({
        data: null,
        error: { message: 'Query failed' }
      });

      const concepts = await engine.getAvailableConcepts();

      expect(concepts).toEqual([]);
    });
  });

  describe('resetStudentAnalogyUsage', () => {
    it('should delete all usage records for a student', async () => {
      const mockDeleteChain = {
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null })
        })
      };
      mockFrom.mockReturnValue(mockDeleteChain);

      await engine.resetStudentAnalogyUsage('student1');

      expect(mockDeleteChain.delete).toHaveBeenCalled();
    });

    it('should handle delete errors gracefully', async () => {
      const mockDeleteChain = {
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: { message: 'Delete failed' } })
        })
      };
      mockFrom.mockReturnValue(mockDeleteChain);

      // Should not throw
      await expect(
        engine.resetStudentAnalogyUsage('student1')
      ).resolves.not.toThrow();
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete workflow: get analogy -> mark feedback -> get next', async () => {
      const mockAnalogies: Analogy[] = [
        {
          analogy_id: 'a1',
          concept_id: 'math_fractions',
          concept_name: 'Fractions',
          analogy_text: 'Like cutting a pizza',
          grade_level: 3,
          difficulty: 'easy',
          subject: 'math'
        },
        {
          analogy_id: 'a2',
          concept_id: 'math_fractions',
          concept_name: 'Fractions',
          analogy_text: 'Like sharing chocolate',
          grade_level: 4,
          difficulty: 'easy',
          subject: 'math'
        }
      ];

      // First call - get first analogy
      mockSelect.mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          lte: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: mockAnalogies,
                error: null
              })
            })
          })
        })
      });
      mockSelect.mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [],
            error: null
          })
        })
      });

      const firstAnalogy = await engine.getNextAnalogy('math_fractions', 'student1', 4, false);
      expect(firstAnalogy).toEqual(mockAnalogies[0]);

      // Mark feedback
      const mockUpdateChain = {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null })
          })
        })
      };
      mockFrom.mockReturnValueOnce(mockUpdateChain);
      await engine.markAnalogyFeedback('student1', 'a1', false, false);

      // Reset mockFrom to return proper structure for second getNextAnalogy call
      mockFrom.mockReturnValue({
        select: mockSelect,
        insert: mockInsert,
        update: mockUpdate,
        delete: mockDelete
      });

      // Second call - get second analogy (first was used)
      mockSelect.mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          lte: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: mockAnalogies,
                error: null
              })
            })
          })
        })
      });
      mockSelect.mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [{ analogy_id: 'a1' }],
            error: null
          })
        })
      });

      const secondAnalogy = await engine.getNextAnalogy('math_fractions', 'student1', 4, true);
      expect(secondAnalogy).toEqual(mockAnalogies[1]);
    });
  });
});

