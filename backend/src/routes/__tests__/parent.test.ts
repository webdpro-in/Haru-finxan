/**
 * Unit tests for Parent API routes
 * Tests GET /api/parent/:id/dashboard and related endpoints
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import express, { Request, Response } from 'express';
import parentRouter from '../parent';

// Mock the ParentVoiceBridge service
vi.mock('../../services/ParentVoiceBridge', () => ({
  getParentDashboard: vi.fn(async (parentId: string) => {
    if (parentId === 'invalid-parent') {
      throw new Error('Parent not found');
    }
    return {
      parentId,
      children: [
        {
          studentId: 'student-1',
          name: 'Rahul Kumar',
          grade: 10,
          currentStreak: 7,
          weeklyProgress: {
            weekStart: new Date(),
            weekEnd: new Date(),
            totalSessions: 5,
            totalTime: 7200,
            conceptsMastered: 3,
            averageMood: 4.0,
            streakMaintained: true
          },
          recentAchievements: [
            {
              achievementId: 'streak-1',
              title: '7-Day Streak',
              description: 'Maintained learning streak for a week!',
              earnedAt: new Date(),
              icon: '🔥'
            }
          ],
          areasOfConcern: []
        }
      ],
      dailyReports: [
        {
          date: new Date(),
          studentId: 'student-1',
          sessionsCompleted: 2,
          totalLearningTime: 3600,
          topicsCovered: ['Algebra', 'Geometry'],
          masteryGained: { 'Algebra': 5, 'Geometry': 7 },
          confusionEvents: 1,
          moodSummary: 'Mostly happy (energy: 4.0/5)',
          teacherNotes: 'Great progress!'
        }
      ],
      whatsappEnabled: true
    };
  }),
  generateDailyReport: vi.fn(async (studentId: string, date: Date) => {
    if (studentId === 'invalid-student') {
      throw new Error('Student not found');
    }
    return {
      date,
      studentId,
      sessionsCompleted: 2,
      totalLearningTime: 3600,
      topicsCovered: ['Algebra', 'Geometry'],
      masteryGained: { 'Algebra': 5, 'Geometry': 7 },
      confusionEvents: 1,
      moodSummary: 'Mostly happy (energy: 4.0/5)',
      teacherNotes: 'Great progress!'
    };
  })
}));

describe('Parent API Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/parent', parentRouter);
  });

  describe('GET /api/parent/:id/dashboard', () => {
    it('should return parent dashboard successfully', async () => {
      const mockReq = {
        params: { id: 'parent-1' }
      } as unknown as Request;

      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as unknown as Response;

      await parentRouter.stack[0].route.stack[0].handle(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          parentId: 'parent-1',
          children: expect.any(Array),
          dailyReports: expect.any(Array),
          whatsappEnabled: true
        })
      );
    });

    it('should return 400 if parent ID is missing', async () => {
      const mockReq = {
        params: {}
      } as unknown as Request;

      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as unknown as Response;

      await parentRouter.stack[0].route.stack[0].handle(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Parent ID is required'
        })
      );
    });

    it('should return 500 if service throws error', async () => {
      const mockReq = {
        params: { id: 'invalid-parent' }
      } as unknown as Request;

      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as unknown as Response;

      await parentRouter.stack[0].route.stack[0].handle(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Failed to fetch parent dashboard'
        })
      );
    });

    it('should include children data in response', async () => {
      const mockReq = {
        params: { id: 'parent-1' }
      } as unknown as Request;

      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as unknown as Response;

      await parentRouter.stack[0].route.stack[0].handle(mockReq, mockRes);

      const responseData = mockRes.json.mock.calls[0][0];
      expect(responseData.children).toHaveLength(1);
      expect(responseData.children[0]).toMatchObject({
        studentId: 'student-1',
        name: 'Rahul Kumar',
        grade: 10,
        currentStreak: 7
      });
    });

    it('should include weekly progress in children data', async () => {
      const mockReq = {
        params: { id: 'parent-1' }
      } as unknown as Request;

      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as unknown as Response;

      await parentRouter.stack[0].route.stack[0].handle(mockReq, mockRes);

      const responseData = mockRes.json.mock.calls[0][0];
      const child = responseData.children[0];
      expect(child.weeklyProgress).toBeDefined();
      expect(child.weeklyProgress.totalSessions).toBe(5);
      expect(child.weeklyProgress.conceptsMastered).toBe(3);
    });

    it('should include achievements in children data', async () => {
      const mockReq = {
        params: { id: 'parent-1' }
      } as unknown as Request;

      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as unknown as Response;

      await parentRouter.stack[0].route.stack[0].handle(mockReq, mockRes);

      const responseData = mockRes.json.mock.calls[0][0];
      const child = responseData.children[0];
      expect(child.recentAchievements).toBeDefined();
      expect(child.recentAchievements).toHaveLength(1);
      expect(child.recentAchievements[0].title).toBe('7-Day Streak');
    });
  });

  describe('GET /api/parent/:id/child/:studentId/report', () => {
    it('should return daily report successfully', async () => {
      const mockReq = {
        params: { id: 'parent-1', studentId: 'student-1' },
        query: {}
      } as unknown as Request;

      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as unknown as Response;

      await parentRouter.stack[1].route.stack[0].handle(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          studentId: 'student-1',
          sessionsCompleted: 2,
          totalLearningTime: 3600,
          topicsCovered: expect.arrayContaining(['Algebra', 'Geometry'])
        })
      );
    });

    it('should accept date query parameter', async () => {
      const testDate = '2024-01-15';
      const mockReq = {
        params: { id: 'parent-1', studentId: 'student-1' },
        query: { date: testDate }
      } as unknown as Request;

      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as unknown as Response;

      await parentRouter.stack[1].route.stack[0].handle(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const responseData = mockRes.json.mock.calls[0][0];
      expect(responseData.date).toBeDefined();
    });

    it('should return 400 if parent ID is missing', async () => {
      const mockReq = {
        params: { studentId: 'student-1' },
        query: {}
      } as unknown as Request;

      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as unknown as Response;

      await parentRouter.stack[1].route.stack[0].handle(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Parent ID and Student ID are required'
        })
      );
    });

    it('should return 400 if student ID is missing', async () => {
      const mockReq = {
        params: { id: 'parent-1' },
        query: {}
      } as unknown as Request;

      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as unknown as Response;

      await parentRouter.stack[1].route.stack[0].handle(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Parent ID and Student ID are required'
        })
      );
    });

    it('should return 400 for invalid date format', async () => {
      const mockReq = {
        params: { id: 'parent-1', studentId: 'student-1' },
        query: { date: 'invalid-date' }
      } as unknown as Request;

      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as unknown as Response;

      await parentRouter.stack[1].route.stack[0].handle(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid date format'
        })
      );
    });

    it('should return 500 if service throws error', async () => {
      const mockReq = {
        params: { id: 'parent-1', studentId: 'invalid-student' },
        query: {}
      } as unknown as Request;

      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as unknown as Response;

      await parentRouter.stack[1].route.stack[0].handle(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Failed to generate daily report'
        })
      );
    });

    it('should include mastery gains in report', async () => {
      const mockReq = {
        params: { id: 'parent-1', studentId: 'student-1' },
        query: {}
      } as unknown as Request;

      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as unknown as Response;

      await parentRouter.stack[1].route.stack[0].handle(mockReq, mockRes);

      const responseData = mockRes.json.mock.calls[0][0];
      expect(responseData.masteryGained).toBeDefined();
      expect(responseData.masteryGained['Algebra']).toBe(5);
      expect(responseData.masteryGained['Geometry']).toBe(7);
    });

    it('should include mood summary in report', async () => {
      const mockReq = {
        params: { id: 'parent-1', studentId: 'student-1' },
        query: {}
      } as unknown as Request;

      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as unknown as Response;

      await parentRouter.stack[1].route.stack[0].handle(mockReq, mockRes);

      const responseData = mockRes.json.mock.calls[0][0];
      expect(responseData.moodSummary).toBeDefined();
      expect(responseData.moodSummary).toContain('happy');
    });

    it('should include teacher notes when available', async () => {
      const mockReq = {
        params: { id: 'parent-1', studentId: 'student-1' },
        query: {}
      } as unknown as Request;

      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as unknown as Response;

      await parentRouter.stack[1].route.stack[0].handle(mockReq, mockRes);

      const responseData = mockRes.json.mock.calls[0][0];
      expect(responseData.teacherNotes).toBeDefined();
      expect(responseData.teacherNotes).toBe('Great progress!');
    });
  });
});
