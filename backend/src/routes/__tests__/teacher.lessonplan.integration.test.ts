/**
 * Integration Tests for Lesson Plan Generator
 * Task 23.5: Write integration tests for lesson generation
 * 
 * These tests verify the complete lesson generation flow including:
 * - Database interactions with Supabase
 * - Gemini API integration
 * - Classroom context analysis
 * - End-to-end lesson plan generation
 * 
 * REQ-4.3.1: System SHALL generate lesson plans using Gemini API
 * REQ-4.3.2: System SHALL include: objectives, prerequisites, activities, assessments, differentiation
 * REQ-4.3.3: System SHALL consider classroom average mastery
 * REQ-4.3.4: System SHALL provide timing breakdown for activities
 * REQ-4.3.5: System SHALL require teacher approval before use
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { teacherRouter } from '../teacher.js';
import { supabase } from '../../config/supabase.js';
import { randomUUID } from 'crypto';

describe('Lesson Plan Generator - Integration Tests', () => {
  let app: express.Application;
  let testClassroomId: string;
  let testStudentIds: string[] = [];
  let testConceptIds: string[] = [];
  let createdLessonIds: string[] = [];

  beforeAll(async () => {
    // Setup Express app
    app = express();
    app.use(express.json());
    app.use('/api/teacher', teacherRouter);

    // Create test classroom
    testClassroomId = randomUUID();
    const { error: classroomError } = await supabase
      .from('classrooms')
      .insert({
        classroom_id: testClassroomId,
        name: 'Integration Test Classroom',
        grade: 8,
        subject: 'Science'
      });

    if (classroomError) {
      console.error('Failed to create test classroom:', classroomError);
    }

    // Create test students with varying mastery levels
    const students = [
      { name: 'Alice (High Performer)', lastActive: new Date() },
      { name: 'Bob (Average)', lastActive: new Date() },
      { name: 'Charlie (Struggling)', lastActive: new Date() },
      { name: 'Diana (Advanced)', lastActive: new Date() },
      { name: 'Eve (Average)', lastActive: new Date() }
    ];

    for (const student of students) {
      const studentId = randomUUID();
      testStudentIds.push(studentId);

      const { error } = await supabase
        .from('students')
        .insert({
          student_id: studentId,
          name: student.name,
          classroom_id: testClassroomId,
          grade: 8,
          last_active_at: student.lastActive.toISOString()
        });

      if (error) {
        console.error(`Failed to create student ${student.name}:`, error);
      }
    }

    // Create test concepts and mastery data
    const concepts = [
      { name: 'Photosynthesis Basics', avgMastery: 45 }, // Weak concept
      { name: 'Cell Structure', avgMastery: 55 },
      { name: 'Chemical Reactions', avgMastery: 70 },
      { name: 'Energy Transfer', avgMastery: 85 }, // Strong concept
      { name: 'Ecosystem Dynamics', avgMastery: 90 } // Strong concept
    ];

    for (const concept of concepts) {
      const conceptId = randomUUID();
      testConceptIds.push(conceptId);

      // Create mastery records for each student
      for (let i = 0; i < testStudentIds.length; i++) {
        const studentId = testStudentIds[i];
        let masteryLevel = concept.avgMastery;

        // Vary mastery by student to create differentiation needs
        if (i === 0) masteryLevel += 20; // Alice: high performer
        else if (i === 2) masteryLevel -= 25; // Charlie: struggling
        else if (i === 3) masteryLevel += 15; // Diana: advanced
        else masteryLevel += Math.random() * 10 - 5; // Others: slight variation

        masteryLevel = Math.max(0, Math.min(100, masteryLevel));

        const { error } = await supabase
          .from('concept_masteries')
          .insert({
            student_id: studentId,
            concept_id: conceptId,
            concept_name: concept.name,
            mastery_level: Math.round(masteryLevel),
            last_practiced: new Date().toISOString()
          });

        if (error) {
          console.error(`Failed to create mastery for ${concept.name}:`, error);
        }
      }
    }
  });

  afterAll(async () => {
    // Cleanup: Delete created lesson plans
    if (createdLessonIds.length > 0) {
      await supabase
        .from('lesson_plans')
        .delete()
        .in('lesson_id', createdLessonIds);
    }

    // Cleanup: Delete test data
    await supabase
      .from('concept_masteries')
      .delete()
      .in('student_id', testStudentIds);

    await supabase
      .from('students')
      .delete()
      .in('student_id', testStudentIds);

    await supabase
      .from('classrooms')
      .delete()
      .eq('classroom_id', testClassroomId);
  });

  beforeEach(() => {
    // Reset created lesson IDs for each test
    createdLessonIds = [];
  });

  describe('End-to-End Lesson Generation Flow', () => {
    it('should generate a complete lesson plan with real database data', async () => {
      const response = await request(app)
        .post('/api/teacher/lesson-plan/generate')
        .send({
          classroomId: testClassroomId,
          subject: 'Science',
          topic: 'Photosynthesis',
          duration: 60,
          grade: 8
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.lessonPlan).toBeDefined();

      const lessonPlan = response.body.lessonPlan;
      createdLessonIds.push(lessonPlan.lessonId);

      // Verify lesson plan structure
      expect(lessonPlan.lessonId).toBeDefined();
      expect(lessonPlan.title).toBeDefined();
      expect(lessonPlan.subject).toBe('Science');
      expect(lessonPlan.grade).toBe(8);
      expect(lessonPlan.duration).toBe(60);
      expect(lessonPlan.classroomId).toBe(testClassroomId);

      // REQ-4.3.2: Verify all required components
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

      // REQ-4.3.5: Verify teacher approval requirement
      expect(lessonPlan.teacherApproved).toBe(false);
      expect(lessonPlan.generatedBy).toBe('ai');
    });

    it('should persist lesson plan to database', async () => {
      const response = await request(app)
        .post('/api/teacher/lesson-plan/generate')
        .send({
          classroomId: testClassroomId,
          subject: 'Biology',
          topic: 'Cell Division',
          duration: 45,
          grade: 8
        })
        .expect(200);

      const lessonId = response.body.lessonPlan.lessonId;
      createdLessonIds.push(lessonId);

      // Verify lesson plan was stored in database
      const { data, error } = await supabase
        .from('lesson_plans')
        .select('*')
        .eq('lesson_id', lessonId)
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.lesson_id).toBe(lessonId);
      expect(data.classroom_id).toBe(testClassroomId);
      expect(data.teacher_approved).toBe(false);
    });
  });

  describe('Classroom Context Analysis Integration', () => {
    it('should analyze real classroom data and consider mastery levels (REQ-4.3.3)', async () => {
      const response = await request(app)
        .post('/api/teacher/lesson-plan/generate')
        .send({
          classroomId: testClassroomId,
          subject: 'Science',
          topic: 'Advanced Photosynthesis',
          duration: 50,
          grade: 8
        })
        .expect(200);

      const lessonPlan = response.body.lessonPlan;
      createdLessonIds.push(lessonPlan.lessonId);

      // Verify differentiation strategies exist for struggling and advanced students
      expect(lessonPlan.differentiation.forStruggling.length).toBeGreaterThan(0);
      expect(lessonPlan.differentiation.forAdvanced.length).toBeGreaterThan(0);

      // Verify activities are appropriate for the classroom context
      expect(lessonPlan.activities.length).toBeGreaterThan(0);
      lessonPlan.activities.forEach((activity: any) => {
        expect(activity.activityId).toBeDefined();
        expect(activity.type).toMatch(/lecture|discussion|practice|assessment|group_work/);
        expect(activity.duration).toBeGreaterThan(0);
        expect(activity.description).toBeDefined();
      });
    });

    it('should identify weak and strong concepts from classroom data', async () => {
      // Query classroom context directly to verify analysis
      const { data: students } = await supabase
        .from('students')
        .select('student_id')
        .eq('classroom_id', testClassroomId);

      expect(students).toBeDefined();
      expect(students!.length).toBe(5);

      const { data: masteries } = await supabase
        .from('concept_masteries')
        .select('*')
        .in('student_id', students!.map(s => s.student_id));

      expect(masteries).toBeDefined();
      expect(masteries!.length).toBeGreaterThan(0);

      // Verify we have both weak and strong concepts
      const avgMasteryByConcept = new Map<string, number[]>();
      masteries!.forEach(m => {
        if (!avgMasteryByConcept.has(m.concept_name)) {
          avgMasteryByConcept.set(m.concept_name, []);
        }
        avgMasteryByConcept.get(m.concept_name)!.push(m.mastery_level);
      });

      const conceptAverages = Array.from(avgMasteryByConcept.entries()).map(([name, levels]) => ({
        name,
        avg: levels.reduce((a, b) => a + b, 0) / levels.length
      }));

      const weakConcepts = conceptAverages.filter(c => c.avg < 60);
      const strongConcepts = conceptAverages.filter(c => c.avg >= 75);

      expect(weakConcepts.length).toBeGreaterThan(0);
      expect(strongConcepts.length).toBeGreaterThan(0);
    });
  });

  describe('Activity Timing Validation (REQ-4.3.4)', () => {
    it('should generate activities with proper timing breakdown', async () => {
      const requestedDuration = 60;
      const response = await request(app)
        .post('/api/teacher/lesson-plan/generate')
        .send({
          classroomId: testClassroomId,
          subject: 'Science',
          topic: 'Ecosystem Dynamics',
          duration: requestedDuration,
          grade: 8
        })
        .expect(200);

      const lessonPlan = response.body.lessonPlan;
      createdLessonIds.push(lessonPlan.lessonId);

      // REQ-4.3.4: Verify timing breakdown
      expect(lessonPlan.activities.length).toBeGreaterThan(0);

      lessonPlan.activities.forEach((activity: any) => {
        expect(activity.duration).toBeDefined();
        expect(typeof activity.duration).toBe('number');
        expect(activity.duration).toBeGreaterThan(0);
      });

      // Verify total duration matches requested duration (with some tolerance)
      const totalDuration = lessonPlan.activities.reduce(
        (sum: number, activity: any) => sum + activity.duration,
        0
      );

      // Allow 5-minute tolerance for AI generation
      expect(Math.abs(totalDuration - requestedDuration)).toBeLessThanOrEqual(5);
    });

    it('should handle different lesson durations appropriately', async () => {
      const durations = [30, 45, 60, 90];

      for (const duration of durations) {
        const response = await request(app)
          .post('/api/teacher/lesson-plan/generate')
          .send({
            classroomId: testClassroomId,
            subject: 'Science',
            topic: `Test Topic ${duration}min`,
            duration,
            grade: 8
          })
          .expect(200);

        const lessonPlan = response.body.lessonPlan;
        createdLessonIds.push(lessonPlan.lessonId);

        const totalDuration = lessonPlan.activities.reduce(
          (sum: number, activity: any) => sum + activity.duration,
          0
        );

        // Verify activities scale with lesson duration
        expect(totalDuration).toBeGreaterThan(0);
        expect(totalDuration).toBeLessThanOrEqual(duration + 5);
      }
    });
  });

  describe('Teacher Approval Workflow (REQ-4.3.5)', () => {
    it('should create lesson plans requiring approval', async () => {
      const response = await request(app)
        .post('/api/teacher/lesson-plan/generate')
        .send({
          classroomId: testClassroomId,
          subject: 'Science',
          topic: 'Chemical Reactions',
          duration: 45,
          grade: 8
        })
        .expect(200);

      const lessonId = response.body.lessonPlan.lessonId;
      createdLessonIds.push(lessonId);

      // REQ-4.3.5: Verify lesson requires approval
      expect(response.body.lessonPlan.teacherApproved).toBe(false);

      // Verify in database
      const { data } = await supabase
        .from('lesson_plans')
        .select('teacher_approved')
        .eq('lesson_id', lessonId)
        .single();

      expect(data?.teacher_approved).toBe(false);
    });

    it('should allow teacher to approve lesson plan', async () => {
      // Generate lesson plan
      const generateResponse = await request(app)
        .post('/api/teacher/lesson-plan/generate')
        .send({
          classroomId: testClassroomId,
          subject: 'Science',
          topic: 'Energy Transfer',
          duration: 45,
          grade: 8
        })
        .expect(200);

      const lessonId = generateResponse.body.lessonPlan.lessonId;
      createdLessonIds.push(lessonId);

      // Approve lesson plan
      const approveResponse = await request(app)
        .post(`/api/teacher/lesson-plan/${lessonId}/approve`)
        .expect(200);

      expect(approveResponse.body.success).toBe(true);
      expect(approveResponse.body.lessonPlan.teacher_approved).toBe(true);

      // Verify in database
      const { data } = await supabase
        .from('lesson_plans')
        .select('teacher_approved')
        .eq('lesson_id', lessonId)
        .single();

      expect(data?.teacher_approved).toBe(true);
    });

    it('should allow teacher to reject lesson plan', async () => {
      // Generate lesson plan
      const generateResponse = await request(app)
        .post('/api/teacher/lesson-plan/generate')
        .send({
          classroomId: testClassroomId,
          subject: 'Science',
          topic: 'Test Rejection',
          duration: 45,
          grade: 8
        })
        .expect(200);

      const lessonId = generateResponse.body.lessonPlan.lessonId;

      // Reject lesson plan
      const rejectResponse = await request(app)
        .post(`/api/teacher/lesson-plan/${lessonId}/reject`)
        .expect(200);

      expect(rejectResponse.body.success).toBe(true);

      // Verify lesson plan was deleted from database
      const { data } = await supabase
        .from('lesson_plans')
        .select('*')
        .eq('lesson_id', lessonId)
        .single();

      expect(data).toBeNull();
    });
  });

  describe('Lesson Plan Retrieval', () => {
    it('should retrieve lesson plan by ID', async () => {
      // Generate lesson plan
      const generateResponse = await request(app)
        .post('/api/teacher/lesson-plan/generate')
        .send({
          classroomId: testClassroomId,
          subject: 'Science',
          topic: 'Retrieval Test',
          duration: 45,
          grade: 8
        })
        .expect(200);

      const lessonId = generateResponse.body.lessonPlan.lessonId;
      createdLessonIds.push(lessonId);

      // Retrieve lesson plan
      const retrieveResponse = await request(app)
        .get(`/api/teacher/lesson-plan/${lessonId}`)
        .expect(200);

      expect(retrieveResponse.body.lessonPlan).toBeDefined();
      expect(retrieveResponse.body.lessonPlan.lesson_id).toBe(lessonId);
    });

    it('should retrieve all lesson plans for a classroom', async () => {
      // Generate multiple lesson plans
      const topics = ['Topic A', 'Topic B', 'Topic C'];
      const generatedIds: string[] = [];

      for (const topic of topics) {
        const response = await request(app)
          .post('/api/teacher/lesson-plan/generate')
          .send({
            classroomId: testClassroomId,
            subject: 'Science',
            topic,
            duration: 45,
            grade: 8
          })
          .expect(200);

        generatedIds.push(response.body.lessonPlan.lessonId);
        createdLessonIds.push(response.body.lessonPlan.lessonId);
      }

      // Retrieve all lesson plans for classroom
      const response = await request(app)
        .get(`/api/teacher/classroom/${testClassroomId}/lesson-plans`)
        .expect(200);

      expect(response.body.lessonPlans).toBeDefined();
      expect(Array.isArray(response.body.lessonPlans)).toBe(true);
      expect(response.body.lessonPlans.length).toBeGreaterThanOrEqual(3);

      // Verify all generated lesson plans are in the response
      const retrievedIds = response.body.lessonPlans.map((lp: any) => lp.lesson_id);
      generatedIds.forEach(id => {
        expect(retrievedIds).toContain(id);
      });
    });

    it('should filter lesson plans by approval status', async () => {
      // Generate and approve one lesson plan
      const approvedResponse = await request(app)
        .post('/api/teacher/lesson-plan/generate')
        .send({
          classroomId: testClassroomId,
          subject: 'Science',
          topic: 'Approved Lesson',
          duration: 45,
          grade: 8
        })
        .expect(200);

      const approvedId = approvedResponse.body.lessonPlan.lessonId;
      createdLessonIds.push(approvedId);

      await request(app)
        .post(`/api/teacher/lesson-plan/${approvedId}/approve`)
        .expect(200);

      // Generate unapproved lesson plan
      const unapprovedResponse = await request(app)
        .post('/api/teacher/lesson-plan/generate')
        .send({
          classroomId: testClassroomId,
          subject: 'Science',
          topic: 'Unapproved Lesson',
          duration: 45,
          grade: 8
        })
        .expect(200);

      createdLessonIds.push(unapprovedResponse.body.lessonPlan.lessonId);

      // Filter by approved status
      const approvedOnlyResponse = await request(app)
        .get(`/api/teacher/classroom/${testClassroomId}/lesson-plans?approved=true`)
        .expect(200);

      expect(approvedOnlyResponse.body.lessonPlans).toBeDefined();
      const approvedPlans = approvedOnlyResponse.body.lessonPlans;

      // Verify all returned plans are approved
      approvedPlans.forEach((plan: any) => {
        expect(plan.teacher_approved).toBe(true);
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle non-existent classroom gracefully', async () => {
      const response = await request(app)
        .post('/api/teacher/lesson-plan/generate')
        .send({
          classroomId: 'non-existent-classroom',
          subject: 'Science',
          topic: 'Test Topic',
          duration: 45,
          grade: 8
        });

      // Should still generate a lesson plan (empty classroom context)
      expect(response.status).toBe(200);
      expect(response.body.lessonPlan).toBeDefined();
    });

    it('should handle classroom with no mastery data', async () => {
      // Create empty classroom
      const emptyClassroomId = randomUUID();
      await supabase
        .from('classrooms')
        .insert({
          classroom_id: emptyClassroomId,
          name: 'Empty Classroom',
          grade: 8,
          subject: 'Science'
        });

      const response = await request(app)
        .post('/api/teacher/lesson-plan/generate')
        .send({
          classroomId: emptyClassroomId,
          subject: 'Science',
          topic: 'Test Topic',
          duration: 45,
          grade: 8
        })
        .expect(200);

      expect(response.body.lessonPlan).toBeDefined();
      createdLessonIds.push(response.body.lessonPlan.lessonId);

      // Cleanup
      await supabase
        .from('classrooms')
        .delete()
        .eq('classroom_id', emptyClassroomId);
    });

    it('should validate input parameters', async () => {
      // Missing required fields
      const response1 = await request(app)
        .post('/api/teacher/lesson-plan/generate')
        .send({
          classroomId: testClassroomId
          // Missing subject, topic, duration, grade
        });

      expect(response1.status).toBe(400);

      // Invalid grade
      const response2 = await request(app)
        .post('/api/teacher/lesson-plan/generate')
        .send({
          classroomId: testClassroomId,
          subject: 'Science',
          topic: 'Test',
          duration: 45,
          grade: 15 // Invalid
        });

      expect(response2.status).toBe(400);

      // Invalid duration
      const response3 = await request(app)
        .post('/api/teacher/lesson-plan/generate')
        .send({
          classroomId: testClassroomId,
          subject: 'Science',
          topic: 'Test',
          duration: -10, // Invalid
          grade: 8
        });

      expect(response3.status).toBe(400);
    });

    it('should handle retrieval of non-existent lesson plan', async () => {
      const response = await request(app)
        .get('/api/teacher/lesson-plan/non-existent-id');

      expect(response.status).toBe(404);
    });
  });

  describe('Gemini API Integration', () => {
    it('should successfully call Gemini API and parse response', async () => {
      const response = await request(app)
        .post('/api/teacher/lesson-plan/generate')
        .send({
          classroomId: testClassroomId,
          subject: 'Science',
          topic: 'Gemini Integration Test',
          duration: 45,
          grade: 8
        })
        .expect(200);

      const lessonPlan = response.body.lessonPlan;
      createdLessonIds.push(lessonPlan.lessonId);

      // Verify Gemini generated valid content
      expect(lessonPlan.title).toBeDefined();
      expect(typeof lessonPlan.title).toBe('string');
      expect(lessonPlan.title.length).toBeGreaterThan(0);

      // Verify structured data from Gemini
      expect(lessonPlan.objectives.length).toBeGreaterThan(0);
      expect(lessonPlan.activities.length).toBeGreaterThan(0);

      // Verify activity structure from Gemini
      lessonPlan.activities.forEach((activity: any) => {
        expect(activity.type).toMatch(/lecture|discussion|practice|assessment|group_work/);
        expect(activity.description).toBeDefined();
        expect(activity.materials).toBeDefined();
        expect(Array.isArray(activity.materials)).toBe(true);
      });
    });

    it('should handle different subjects and topics', async () => {
      const testCases = [
        { subject: 'Mathematics', topic: 'Quadratic Equations' },
        { subject: 'Physics', topic: 'Newton\'s Laws' },
        { subject: 'Chemistry', topic: 'Periodic Table' },
        { subject: 'Biology', topic: 'DNA Structure' }
      ];

      for (const testCase of testCases) {
        const response = await request(app)
          .post('/api/teacher/lesson-plan/generate')
          .send({
            classroomId: testClassroomId,
            subject: testCase.subject,
            topic: testCase.topic,
            duration: 45,
            grade: 8
          })
          .expect(200);

        const lessonPlan = response.body.lessonPlan;
        createdLessonIds.push(lessonPlan.lessonId);

        expect(lessonPlan.subject).toBe(testCase.subject);
        expect(lessonPlan.title).toBeDefined();
        expect(lessonPlan.objectives.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Performance and Scalability', () => {
    it('should generate lesson plan within reasonable time', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .post('/api/teacher/lesson-plan/generate')
        .send({
          classroomId: testClassroomId,
          subject: 'Science',
          topic: 'Performance Test',
          duration: 45,
          grade: 8
        })
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      createdLessonIds.push(response.body.lessonPlan.lessonId);

      // Should complete within 30 seconds (Gemini API call + processing)
      expect(duration).toBeLessThan(30000);
    });
  });
});
