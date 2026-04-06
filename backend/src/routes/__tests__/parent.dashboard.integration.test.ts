/**
 * Integration Tests for Parent Dashboard and Reports (Task 35.3)
 * Tests the complete parent dashboard flow including:
 * - Daily report generation
 * - Mood summary aggregation
 * - Progress tracking
 * - Weak concepts identification
 * - Data aggregation from multiple sources (Supabase)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import parentRouter from '../parent';

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/api/parent', parentRouter);

// Mock data for comprehensive testing
const mockSupabaseData: Record<string, any> = {
  sessions: [],
  mood_checkins: [],
  concept_masteries: [],
  students: [],
  student_insights: [],
  parents: null
};

// Helper to reset mock data
function resetMockData() {
  const today = new Date();
  
  mockSupabaseData.sessions = [
    {
      session_id: 'session-1',
      student_id: 'student-1',
      started_at: today.toISOString(),
      duration: 1800, // 30 minutes
      topics_covered: ['Algebra', 'Quadratic Equations'],
      confusion_count: 2,
      mastery_gained: { 'Algebra': 5, 'Quadratic Equations': 3 }
    },
    {
      session_id: 'session-2',
      student_id: 'student-1',
      started_at: today.toISOString(),
      duration: 2400, // 40 minutes
      topics_covered: ['Geometry', 'Triangles'],
      confusion_count: 1,
      mastery_gained: { 'Geometry': 7, 'Triangles': 4 }
    },
    {
      session_id: 'session-3',
      student_id: 'student-2',
      started_at: today.toISOString(),
      duration: 3600, // 60 minutes
      topics_covered: ['Physics', 'Newton\'s Laws'],
      confusion_count: 5,
      mastery_gained: { 'Physics': 2, 'Newton\'s Laws': 1 }
    }
  ];
  
  mockSupabaseData.mood_checkins = [
    { student_id: 'student-1', mood: 'happy', energy_level: 4, timestamp: today.toISOString() },
    { student_id: 'student-1', mood: 'happy', energy_level: 5, timestamp: today.toISOString() },
    { student_id: 'student-1', mood: 'neutral', energy_level: 3, timestamp: today.toISOString() },
    { student_id: 'student-2', mood: 'anxious', energy_level: 2, timestamp: today.toISOString() },
    { student_id: 'student-2', mood: 'frustrated', energy_level: 2, timestamp: today.toISOString() }
  ];
  
  mockSupabaseData.concept_masteries = [
    { student_id: 'student-1', concept_id: 'algebra-1', mastery_level: 85, last_practiced: today.toISOString() },
    { student_id: 'student-1', concept_id: 'geometry-1', mastery_level: 90, last_practiced: today.toISOString() },
    { student_id: 'student-1', concept_id: 'quadratic-1', mastery_level: 82, last_practiced: today.toISOString() },
    { student_id: 'student-2', concept_id: 'physics-1', mastery_level: 45, last_practiced: today.toISOString() },
    { student_id: 'student-2', concept_id: 'newton-1', mastery_level: 50, last_practiced: today.toISOString() }
  ];
  
  mockSupabaseData.students = [
    {
      student_id: 'student-1',
      name: 'Rahul Kumar',
      grade: 10,
      streak_days: 7,
      parent_id: 'parent-1'
    },
    {
      student_id: 'student-2',
      name: 'Priya Sharma',
      grade: 9,
      streak_days: 2,
      parent_id: 'parent-1'
    }
  ];
  
  mockSupabaseData.student_insights = [
    {
      student_id: 'student-1',
      finding: 'Strong progress in algebra',
      recommendation: 'Continue with current pace',
      generated_at: today.toISOString()
    },
    {
      student_id: 'student-2',
      finding: 'Struggling with physics concepts',
      recommendation: 'Review prerequisites and provide additional support',
      generated_at: today.toISOString()
    }
  ];
  
  mockSupabaseData.parents = {
    parent_id: 'parent-1',
    name: 'Mr. Kumar',
    phone: '+919876543210',
    whatsapp_enabled: true
  };
}

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: (table: string) => {
      const mockChain: any = {
        _table: table,
        _filters: [],
        select: function(columns?: string) {
          this._columns = columns;
          return this;
        },
        eq: function(column: string, value: any) {
          this._filters.push({ type: 'eq', column, value });
          return this;
        },
        gte: function(column: string, value: any) {
          this._filters.push({ type: 'gte', column, value });
          return this;
        },
        lte: function(column: string, value: any) {
          this._filters.push({ type: 'lte', column, value });
          return this;
        },
        order: function() {
          return this;
        },
        limit: function() {
          return this;
        },
        single: async function() {
          let data = mockSupabaseData[this._table];
          
          // Apply filters
          if (this._filters && Array.isArray(data)) {
            data = data.filter((item: any) => {
              return this._filters.every((filter: any) => {
                if (filter.type === 'eq') {
                  return item[filter.column] === filter.value;
                }
                return true;
              });
            });
            data = data[0] || null;
          }
          
          return { data, error: null };
        },
        then: function(resolve: any) {
          let data = mockSupabaseData[this._table];
          
          // Apply filters
          if (this._filters && Array.isArray(data)) {
            data = data.filter((item: any) => {
              return this._filters.every((filter: any) => {
                if (filter.type === 'eq') {
                  return item[filter.column] === filter.value;
                }
                if (filter.type === 'gte') {
                  return new Date(item[filter.column]) >= new Date(filter.value);
                }
                if (filter.type === 'lte') {
                  return new Date(item[filter.column]) <= new Date(filter.value);
                }
                return true;
              });
            });
          }
          
          return resolve({ data, error: null });
        }
      };
      return mockChain;
    }
  }))
}));

describe('Parent Dashboard and Reports - Integration Tests (Task 35.3)', () => {
  beforeEach(() => {
    resetMockData();
    vi.clearAllMocks();
  });

  describe('API Endpoint Integration - Dashboard', () => {
    it('should return complete parent dashboard with all children', async () => {
      const response = await request(app)
        .get('/api/parent/parent-1/dashboard')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.parentId).toBe('parent-1');
      expect(response.body.children).toHaveLength(2);
      expect(response.body.dailyReports).toHaveLength(2);
      expect(response.body.whatsappEnabled).toBe(true);
    });

    it('should include child summaries with achievements', async () => {
      const response = await request(app)
        .get('/api/parent/parent-1/dashboard')
        .expect(200);

      const rahul = response.body.children.find((c: any) => c.studentId === 'student-1');
      expect(rahul).toBeDefined();
      expect(rahul.name).toBe('Rahul Kumar');
      expect(rahul.grade).toBe(10);
      expect(rahul.currentStreak).toBe(7);
      expect(rahul.recentAchievements).toBeDefined();
      expect(Array.isArray(rahul.recentAchievements)).toBe(true);
    });

    it('should identify areas of concern for struggling students', async () => {
      const response = await request(app)
        .get('/api/parent/parent-1/dashboard')
        .expect(200);

      const priya = response.body.children.find((c: any) => c.studentId === 'student-2');
      expect(priya).toBeDefined();
      expect(priya.areasOfConcern).toBeDefined();
      expect(Array.isArray(priya.areasOfConcern)).toBe(true);
      // Priya should have concerns due to high confusion and low mood
      expect(priya.areasOfConcern.length).toBeGreaterThan(0);
    });

    it('should award streak achievement for 7-day streak', async () => {
      const response = await request(app)
        .get('/api/parent/parent-1/dashboard')
        .expect(200);

      const rahul = response.body.children.find((c: any) => c.studentId === 'student-1');
      const streakAchievement = rahul.recentAchievements.find(
        (a: any) => a.title === '7-Day Streak'
      );
      expect(streakAchievement).toBeDefined();
      expect(streakAchievement.icon).toBe('🔥');
    });
  });

  describe('API Endpoint Integration - Daily Reports', () => {
    it('should return daily report for specific child', async () => {
      const response = await request(app)
        .get('/api/parent/parent-1/child/student-1/report')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.studentId).toBe('student-1');
      expect(response.body.sessionsCompleted).toBe(2);
      expect(response.body.totalLearningTime).toBe(4200); // 1800 + 2400 seconds
      expect(response.body.topicsCovered).toContain('Algebra');
      expect(response.body.confusionEvents).toBe(3); // 2 + 1
    });

    it('should aggregate mastery gains correctly', async () => {
      const response = await request(app)
        .get('/api/parent/parent-1/child/student-1/report')
        .expect(200);

      expect(response.body.masteryGained).toBeDefined();
      expect(response.body.masteryGained['Algebra']).toBe(5);
      expect(response.body.masteryGained['Geometry']).toBe(7);
      expect(response.body.masteryGained['Quadratic Equations']).toBe(3);
      expect(response.body.masteryGained['Triangles']).toBe(4);
    });

    it('should include mood summary in report', async () => {
      const response = await request(app)
        .get('/api/parent/parent-1/child/student-1/report')
        .expect(200);

      expect(response.body.moodSummary).toBeDefined();
      expect(response.body.moodSummary).toContain('happy');
      expect(response.body.moodSummary).toMatch(/energy: \d\.\d\/5/);
    });

    it('should include teacher notes when available', async () => {
      const response = await request(app)
        .get('/api/parent/parent-1/child/student-1/report')
        .expect(200);

      expect(response.body.teacherNotes).toBeDefined();
      expect(response.body.teacherNotes).toContain('Strong progress in algebra');
    });

    it('should handle date parameter correctly', async () => {
      const date = '2024-01-15';
      const response = await request(app)
        .get(`/api/parent/parent-1/child/student-1/report?date=${date}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.studentId).toBe('student-1');
    });

    it('should reject invalid date format', async () => {
      const response = await request(app)
        .get('/api/parent/parent-1/child/student-1/report?date=invalid-date')
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Data Aggregation from Multiple Sources', () => {
    it('should aggregate session data correctly', async () => {
      const response = await request(app)
        .get('/api/parent/parent-1/child/student-1/report')
        .expect(200);

      // Session aggregation
      expect(response.body.sessionsCompleted).toBe(2);
      expect(response.body.totalLearningTime).toBe(4200);
      expect(response.body.topicsCovered).toEqual(
        expect.arrayContaining(['Algebra', 'Quadratic Equations', 'Geometry', 'Triangles'])
      );
    });

    it('should aggregate mood data correctly', async () => {
      const response = await request(app)
        .get('/api/parent/parent-1/child/student-1/report')
        .expect(200);

      // Mood summary should show dominant mood (happy) and average energy (4.0)
      expect(response.body.moodSummary).toContain('happy');
      expect(response.body.moodSummary).toContain('4.0/5');
    });

    it('should detect high confusion for struggling students', async () => {
      const response = await request(app)
        .get('/api/parent/parent-1/child/student-2/report')
        .expect(200);

      // Student 2 has 5 confusion events
      expect(response.body.confusionEvents).toBe(5);
      expect(response.body.moodSummary).toMatch(/anxious|frustrated/i);
    });
  });

  describe('Weekly Progress Tracking', () => {
    it('should include weekly progress in dashboard', async () => {
      const response = await request(app)
        .get('/api/parent/parent-1/dashboard')
        .expect(200);

      const rahul = response.body.children.find((c: any) => c.studentId === 'student-1');
      expect(rahul.weeklyProgress).toBeDefined();
      expect(rahul.weeklyProgress.totalSessions).toBeDefined();
      expect(rahul.weeklyProgress.totalTime).toBeDefined();
      expect(rahul.weeklyProgress.conceptsMastered).toBeDefined();
    });

    it('should calculate weekly metrics correctly', async () => {
      const response = await request(app)
        .get('/api/parent/parent-1/dashboard')
        .expect(200);

      const rahul = response.body.children.find((c: any) => c.studentId === 'student-1');
      expect(rahul.weeklyProgress.totalSessions).toBe(2);
      expect(rahul.weeklyProgress.totalTime).toBe(4200);
      expect(rahul.weeklyProgress.conceptsMastered).toBe(3); // Concepts with mastery >= 80
    });
  });

  describe('Weak Concepts Identification', () => {
    it('should flag low mastery concepts as areas of concern', async () => {
      const response = await request(app)
        .get('/api/parent/parent-1/dashboard')
        .expect(200);

      const priya = response.body.children.find((c: any) => c.studentId === 'student-2');
      // Priya has low mastery (45, 50) and should have concerns
      expect(priya.areasOfConcern.length).toBeGreaterThan(0);
    });

    it('should flag high confusion as area of concern', async () => {
      const response = await request(app)
        .get('/api/parent/parent-1/dashboard')
        .expect(200);

      const priya = response.body.children.find((c: any) => c.studentId === 'student-2');
      expect(priya.areasOfConcern).toContain('High confusion detected');
    });

    it('should flag low energy levels as area of concern', async () => {
      const response = await request(app)
        .get('/api/parent/parent-1/dashboard')
        .expect(200);

      const priya = response.body.children.find((c: any) => c.studentId === 'student-2');
      expect(priya.areasOfConcern).toContain('Low energy levels');
    });
  });

  describe('Performance and Scalability', () => {
    it('should generate dashboard within acceptable time', async () => {
      const startTime = Date.now();
      await request(app)
        .get('/api/parent/parent-1/dashboard')
        .expect(200);
      const duration = Date.now() - startTime;

      // Should complete within 3 seconds
      expect(duration).toBeLessThan(3000);
    });

    it('should handle multiple children efficiently', async () => {
      // Add more children
      for (let i = 3; i <= 5; i++) {
        mockSupabaseData.students.push({
          student_id: `student-${i}`,
          name: `Student ${i}`,
          grade: 8 + i,
          streak_days: i,
          parent_id: 'parent-1'
        });
      }

      const startTime = Date.now();
      const response = await request(app)
        .get('/api/parent/parent-1/dashboard')
        .expect(200);
      const duration = Date.now() - startTime;

      expect(response.body.children.length).toBe(5);
      expect(duration).toBeLessThan(5000); // Should scale reasonably
    });
  });

  describe('Data Consistency and Validation', () => {
    it('should ensure mastery gains are non-negative', async () => {
      const response = await request(app)
        .get('/api/parent/parent-1/child/student-1/report')
        .expect(200);

      Object.values(response.body.masteryGained).forEach((gain: any) => {
        expect(gain).toBeGreaterThanOrEqual(0);
      });
    });

    it('should ensure learning time is non-negative', async () => {
      const response = await request(app)
        .get('/api/parent/parent-1/child/student-1/report')
        .expect(200);

      expect(response.body.totalLearningTime).toBeGreaterThanOrEqual(0);
    });

    it('should ensure confusion events are non-negative', async () => {
      const response = await request(app)
        .get('/api/parent/parent-1/child/student-1/report')
        .expect(200);

      expect(response.body.confusionEvents).toBeGreaterThanOrEqual(0);
    });

    it('should ensure session count is non-negative', async () => {
      const response = await request(app)
        .get('/api/parent/parent-1/child/student-1/report')
        .expect(200);

      expect(response.body.sessionsCompleted).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing parent ID', async () => {
      const response = await request(app)
        .get('/api/parent//dashboard')
        .expect(404);
    });

    it('should handle empty data sets gracefully', async () => {
      // Clear all data
      mockSupabaseData.sessions = [];
      mockSupabaseData.mood_checkins = [];

      const response = await request(app)
        .get('/api/parent/parent-1/child/student-1/report')
        .expect(200);

      expect(response.body.sessionsCompleted).toBe(0);
      expect(response.body.totalLearningTime).toBe(0);
      expect(response.body.topicsCovered).toEqual([]);
      expect(response.body.confusionEvents).toBe(0);
    });
  });
});
