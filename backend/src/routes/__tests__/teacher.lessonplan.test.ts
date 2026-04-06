/**
 * Tests for Lesson Plan Generator Endpoint
 * Task 23.3: Implement POST /api/teacher/lesson-plan/generate endpoint
 * 
 * REQ-4.3.1: System SHALL generate lesson plans using Gemini API
 * REQ-4.3.2: System SHALL include: objectives, prerequisites, activities, assessments, differentiation
 * REQ-4.3.3: System SHALL consider classroom average mastery
 * REQ-4.3.4: System SHALL provide timing breakdown for activities
 * REQ-4.3.5: System SHALL require teacher approval before use
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { teacherRouter } from '../teacher.js';

// Mock dependencies
vi.mock('../../config/supabase.js', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'students') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              is: vi.fn(() => ({
                data: [
                  { student_id: 'student1', name: 'Alice', last_active_at: new Date().toISOString() },
                  { student_id: 'student2', name: 'Bob', last_active_at: new Date().toISOString() }
                ],
                error: null
              }))
            }))
          }))
        };
      } else if (table === 'concept_masteries') {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => ({
              data: [
                { student_id: 'student1', concept_id: 'concept1', concept_name: 'Addition', mastery_level: 75 },
                { student_id: 'student2', concept_id: 'concept1', concept_name: 'Addition', mastery_level: 60 }
              ],
              error: null
            }))
          }))
        };
      } else if (table === 'lesson_plans') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn((field: string, value: any) => {
              if (field === 'classroom_id') {
                return {
                  order: vi.fn(() => ({
                    eq: vi.fn(() => ({
                      data: [{ lesson_id: 'lesson123', title: 'Test Lesson', teacher_approved: true }],
                      error: null
                    })),
                    data: [{ lesson_id: 'lesson123', title: 'Test Lesson' }],
                    error: null
                  }))
                };
              }
              return {
                single: vi.fn(() => ({
                  data: { lesson_id: 'lesson123', title: 'Test Lesson', teacher_approved: false },
                  error: null
                })),
                order: vi.fn(() => ({
                  data: [{ lesson_id: 'lesson123', title: 'Test Lesson' }],
                  error: null
                }))
              };
            }),
            order: vi.fn(() => ({
              data: [{ lesson_id: 'lesson123', title: 'Test Lesson' }],
              error: null
            }))
          })),
          insert: vi.fn(() => ({
            data: { lesson_id: 'lesson123' },
            error: null
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => ({
                  data: { lesson_id: 'lesson123', teacher_approved: true },
                  error: null
                }))
              }))
            }))
          })),
          delete: vi.fn(() => ({
            eq: vi.fn(() => ({
              error: null
            }))
          }))
        };
      }
      return {};
    })
  }
}));

vi.mock('../../services/GeminiClient.js', () => ({
  GeminiClient: class MockGeminiClient {
    generateResponse = vi.fn().mockResolvedValue({
      text: JSON.stringify({
        title: 'Introduction to Photosynthesis',
        objectives: [
          'Understand the process of photosynthesis',
          'Identify the key components needed for photosynthesis',
          'Explain the importance of photosynthesis in the ecosystem'
        ],
        prerequisites: ['Basic plant biology', 'Understanding of chemical reactions'],
        activities: [
          {
            type: 'lecture',
            duration: 15,
            description: 'Introduction to photosynthesis and its importance',
            materials: ['Whiteboard', 'Markers', 'Plant diagram']
          },
          {
            type: 'discussion',
            duration: 10,
            description: 'Group discussion on where photosynthesis occurs',
            materials: ['Discussion prompts']
          },
          {
            type: 'practice',
            duration: 20,
            description: 'Hands-on activity: Observing leaf structure under microscope',
            materials: ['Microscopes', 'Leaf samples', 'Slides']
          }
        ],
        assessments: [
          {
            type: 'formative',
            description: 'Quick quiz on photosynthesis components',
            rubric: 'Pass: 70% or higher'
          }
        ],
        differentiation: {
          forStruggling: [
            'Provide visual aids and diagrams',
            'Use simplified vocabulary',
            'Offer one-on-one support during practice'
          ],
          forAdvanced: [
            'Challenge with complex scenarios',
            'Encourage research on advanced topics',
            'Assign leadership roles in group activities'
          ],
          generalStrategies: [
            'Use multiple modalities (visual, auditory, kinesthetic)',
            'Provide frequent check-ins',
            'Allow flexible pacing'
          ]
        }
      }),
      usage: { totalTokens: 500 }
    });
  }
}));

describe('Lesson Plan Generator Endpoint', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/teacher', teacherRouter);
  });

  describe('POST /api/teacher/lesson-plan/generate', () => {
    it('should generate a lesson plan successfully', async () => {
      const response = await request(app)
        .post('/api/teacher/lesson-plan/generate')
        .send({
          classroomId: 'classroom123',
          subject: 'Science',
          topic: 'Photosynthesis',
          duration: 45,
          grade: 8
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.lessonPlan).toBeDefined();
      expect(response.body.lessonPlan.title).toBe('Introduction to Photosynthesis');
      expect(response.body.lessonPlan.objectives).toHaveLength(3);
      expect(response.body.lessonPlan.activities).toHaveLength(3);
      expect(response.body.lessonPlan.teacherApproved).toBe(false);
    });

    it('should include all required components (REQ-4.3.2)', async () => {
      const response = await request(app)
        .post('/api/teacher/lesson-plan/generate')
        .send({
          classroomId: 'classroom123',
          subject: 'Science',
          topic: 'Photosynthesis',
          duration: 45,
          grade: 8
        });

      expect(response.status).toBe(200);
      const { lessonPlan } = response.body;

      // REQ-4.3.2: System SHALL include: objectives, prerequisites, activities, assessments, differentiation
      expect(lessonPlan.objectives).toBeDefined();
      expect(Array.isArray(lessonPlan.objectives)).toBe(true);
      expect(lessonPlan.objectives.length).toBeGreaterThan(0);

      expect(lessonPlan.prerequisites).toBeDefined();
      expect(Array.isArray(lessonPlan.prerequisites)).toBe(true);

      expect(lessonPlan.activities).toBeDefined();
      expect(Array.isArray(lessonPlan.activities)).toBe(true);
      expect(lessonPlan.activities.length).toBeGreaterThan(0);

      expect(lessonPlan.assessments).toBeDefined();
      expect(Array.isArray(lessonPlan.assessments)).toBe(true);

      expect(lessonPlan.differentiation).toBeDefined();
      expect(lessonPlan.differentiation.forStruggling).toBeDefined();
      expect(lessonPlan.differentiation.forAdvanced).toBeDefined();
      expect(lessonPlan.differentiation.generalStrategies).toBeDefined();
    });

    it('should provide timing breakdown for activities (REQ-4.3.4)', async () => {
      const response = await request(app)
        .post('/api/teacher/lesson-plan/generate')
        .send({
          classroomId: 'classroom123',
          subject: 'Science',
          topic: 'Photosynthesis',
          duration: 45,
          grade: 8
        });

      expect(response.status).toBe(200);
      const { lessonPlan } = response.body;

      // REQ-4.3.4: System SHALL provide timing breakdown for activities
      lessonPlan.activities.forEach((activity: any) => {
        expect(activity.duration).toBeDefined();
        expect(typeof activity.duration).toBe('number');
        expect(activity.duration).toBeGreaterThan(0);
      });

      // Verify total duration matches requested duration
      const totalDuration = lessonPlan.activities.reduce(
        (sum: number, activity: any) => sum + activity.duration,
        0
      );
      expect(totalDuration).toBe(45);
    });

    it('should require teacher approval (REQ-4.3.5)', async () => {
      const response = await request(app)
        .post('/api/teacher/lesson-plan/generate')
        .send({
          classroomId: 'classroom123',
          subject: 'Science',
          topic: 'Photosynthesis',
          duration: 45,
          grade: 8
        });

      expect(response.status).toBe(200);
      const { lessonPlan } = response.body;

      // REQ-4.3.5: System SHALL require teacher approval before use
      expect(lessonPlan.teacherApproved).toBe(false);
      expect(lessonPlan.generatedBy).toBe('ai');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/teacher/lesson-plan/generate')
        .send({
          classroomId: 'classroom123',
          // Missing subject, topic, duration, grade
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should validate grade range (1-12)', async () => {
      const response = await request(app)
        .post('/api/teacher/lesson-plan/generate')
        .send({
          classroomId: 'classroom123',
          subject: 'Science',
          topic: 'Photosynthesis',
          duration: 45,
          grade: 15 // Invalid grade
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should validate duration is a positive number', async () => {
      const response = await request(app)
        .post('/api/teacher/lesson-plan/generate')
        .send({
          classroomId: 'classroom123',
          subject: 'Science',
          topic: 'Photosynthesis',
          duration: -10, // Invalid duration
          grade: 8
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/teacher/lesson-plan/:lessonId', () => {
    it('should retrieve a lesson plan by ID', async () => {
      const response = await request(app)
        .get('/api/teacher/lesson-plan/lesson123');

      expect(response.status).toBe(200);
      expect(response.body.lessonPlan).toBeDefined();
      expect(response.body.lessonPlan.lesson_id).toBe('lesson123');
    });
  });

  describe('POST /api/teacher/lesson-plan/:lessonId/approve', () => {
    it('should approve a lesson plan', async () => {
      const response = await request(app)
        .post('/api/teacher/lesson-plan/lesson123/approve');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.lessonPlan.teacher_approved).toBe(true);
    });
  });

  describe('POST /api/teacher/lesson-plan/:lessonId/reject', () => {
    it('should reject and delete a lesson plan', async () => {
      const response = await request(app)
        .post('/api/teacher/lesson-plan/lesson123/reject');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Lesson plan rejected');
    });
  });

  describe('GET /api/teacher/classroom/:classroomId/lesson-plans', () => {
    it('should retrieve all lesson plans for a classroom', async () => {
      const response = await request(app)
        .get('/api/teacher/classroom/classroom123/lesson-plans');

      expect(response.status).toBe(200);
      expect(response.body.lessonPlans).toBeDefined();
      expect(Array.isArray(response.body.lessonPlans)).toBe(true);
    });

    it('should filter by approval status', async () => {
      const response = await request(app)
        .get('/api/teacher/classroom/classroom123/lesson-plans?approved=true');

      expect(response.status).toBe(200);
      expect(response.body.lessonPlans).toBeDefined();
    });
  });
});
