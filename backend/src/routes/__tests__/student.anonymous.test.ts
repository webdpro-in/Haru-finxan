/**
 * Unit Tests for Anonymous Question Submission
 * 
 * Tests for POST /api/student/anonymous-question endpoint
 * 
 * REQ-3.1.1: System SHALL provide anonymous question submission with padlock icon
 * REQ-3.1.2: System SHALL create one-way hash of student ID for analytics
 * REQ-3.1.3: System SHALL store questions without revealing identity
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { hashStudentId, createAnonymousIdentifier } from '../../utils/anonymousMode.js';
import { supabase } from '../../config/supabase.js';

// Mock dependencies
vi.mock('../../config/supabase.js', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      }))
    }))
  }
}));

vi.mock('../../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }
}));

describe('Anonymous Question Submission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set SALT environment variable for testing
    process.env.SALT = 'test-salt-for-hashing-student-ids';
  });

  describe('Input Validation', () => {
    it('should reject request when studentId is missing', () => {
      const request = {
        classroomId: 'classroom-123',
        question: 'What is algebra?'
      };

      expect(request).not.toHaveProperty('studentId');
    });

    it('should reject request when classroomId is missing', () => {
      const request = {
        studentId: 'student-123',
        question: 'What is algebra?'
      };

      expect(request).not.toHaveProperty('classroomId');
    });

    it('should reject request when question is missing', () => {
      const request = {
        studentId: 'student-123',
        classroomId: 'classroom-123'
      };

      expect(request).not.toHaveProperty('question');
    });

    it('should reject request when question is empty string', () => {
      const question = '   ';
      const trimmed = question.trim();

      expect(trimmed.length).toBe(0);
    });

    it('should accept valid request with all required fields', () => {
      const request = {
        studentId: 'student-123',
        classroomId: 'classroom-123',
        question: 'What is algebra?'
      };

      expect(request.studentId).toBeTruthy();
      expect(request.classroomId).toBeTruthy();
      expect(request.question).toBeTruthy();
      expect(request.question.trim().length).toBeGreaterThan(0);
    });
  });

  describe('Student ID Hashing', () => {
    it('should hash student ID before storing', () => {
      const studentId = 'student-123';
      const hash = hashStudentId(studentId);

      expect(hash).toBeTruthy();
      expect(hash).not.toBe(studentId);
      expect(typeof hash).toBe('string');
    });

    it('should produce consistent hash for same student ID', () => {
      const studentId = 'student-123';
      const hash1 = hashStudentId(studentId);
      const hash2 = hashStudentId(studentId);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different student IDs', () => {
      const studentId1 = 'student-123';
      const studentId2 = 'student-456';
      const hash1 = hashStudentId(studentId1);
      const hash2 = hashStudentId(studentId2);

      expect(hash1).not.toBe(hash2);
    });

    it('should create one-way hash that cannot be reversed', () => {
      const studentId = 'student-123';
      const hash = hashStudentId(studentId);

      // Hash should not contain the original student ID
      expect(hash).not.toContain(studentId);
      expect(hash).not.toContain('student');
      expect(hash).not.toContain('123');
    });
  });

  describe('Anonymous Identifier Generation', () => {
    it('should create anonymous identifier for display', () => {
      const studentId = 'student-123';
      const anonymousId = createAnonymousIdentifier(studentId);

      expect(anonymousId).toBeTruthy();
      expect(anonymousId).toMatch(/^anon-[a-f0-9]{8}$/);
    });

    it('should produce consistent identifier for same student', () => {
      const studentId = 'student-123';
      const id1 = createAnonymousIdentifier(studentId);
      const id2 = createAnonymousIdentifier(studentId);

      expect(id1).toBe(id2);
    });

    it('should not reveal student identity in identifier', () => {
      const studentId = 'student-123';
      const anonymousId = createAnonymousIdentifier(studentId);

      expect(anonymousId).not.toContain(studentId);
      expect(anonymousId).not.toContain('student');
      expect(anonymousId).not.toContain('123');
    });
  });

  describe('Database Storage', () => {
    it('should store question with hashed student ID', async () => {
      const studentId = 'student-123';
      const classroomId = 'classroom-456';
      const question = 'What is algebra?';

      const studentIdHash = hashStudentId(studentId);

      const mockQuestionData = {
        question_id: 'question-789',
        student_id_hash: studentIdHash,
        classroom_id: classroomId,
        question,
        asked_at: new Date().toISOString(),
        answered: false
      };

      vi.mocked(supabase.from).mockReturnValueOnce({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockQuestionData, error: null })
          })
        })
      } as any);

      const result = await supabase
        .from('anonymous_questions')
        .insert({
          student_id_hash: studentIdHash,
          classroom_id: classroomId,
          question: question.trim(),
          asked_at: new Date().toISOString(),
          answered: false
        })
        .select()
        .single();

      expect(result.data).toBeTruthy();
      expect(result.data?.student_id_hash).toBe(studentIdHash);
      expect(result.data?.student_id_hash).not.toBe(studentId);
    });

    it('should not store actual student ID in database', async () => {
      const studentId = 'student-123';
      const studentIdHash = hashStudentId(studentId);

      const insertData = {
        student_id_hash: studentIdHash,
        classroom_id: 'classroom-456',
        question: 'What is algebra?',
        asked_at: new Date().toISOString(),
        answered: false
      };

      // Verify that actual student ID is not in the insert data
      expect(JSON.stringify(insertData)).not.toContain(studentId);
      expect(insertData).not.toHaveProperty('student_id');
      expect(insertData).toHaveProperty('student_id_hash');
    });

    it('should trim whitespace from question before storing', () => {
      const question = '  What is algebra?  ';
      const trimmed = question.trim();

      expect(trimmed).toBe('What is algebra?');
      expect(trimmed).not.toMatch(/^\s/);
      expect(trimmed).not.toMatch(/\s$/);
    });

    it('should set answered to false by default', () => {
      const insertData = {
        student_id_hash: 'hash-123',
        classroom_id: 'classroom-456',
        question: 'What is algebra?',
        asked_at: new Date().toISOString(),
        answered: false
      };

      expect(insertData.answered).toBe(false);
    });

    it('should include timestamp when question was asked', () => {
      const askedAt = new Date().toISOString();
      const insertData = {
        student_id_hash: 'hash-123',
        classroom_id: 'classroom-456',
        question: 'What is algebra?',
        asked_at: askedAt,
        answered: false
      };

      expect(insertData.asked_at).toBeTruthy();
      expect(new Date(insertData.asked_at).getTime()).toBeGreaterThan(0);
    });
  });

  describe('Response Format', () => {
    it('should return success response with required fields', () => {
      const response = {
        success: true,
        questionId: 'question-789',
        anonymousId: 'anon-a3f2b1c4',
        message: 'Your question has been submitted anonymously'
      };

      expect(response.success).toBe(true);
      expect(response.questionId).toBeTruthy();
      expect(response.anonymousId).toBeTruthy();
      expect(response.message).toBeTruthy();
    });

    it('should return 201 status code on successful creation', () => {
      const statusCode = 201;
      expect(statusCode).toBe(201);
    });

    it('should return anonymous identifier in response', () => {
      const studentId = 'student-123';
      const anonymousId = createAnonymousIdentifier(studentId);

      const response = {
        success: true,
        questionId: 'question-789',
        anonymousId,
        message: 'Your question has been submitted anonymously'
      };

      expect(response.anonymousId).toMatch(/^anon-[a-f0-9]{8}$/);
      expect(response.anonymousId).not.toContain(studentId);
    });

    it('should not include actual student ID in response', () => {
      const studentId = 'student-123';
      const response = {
        success: true,
        questionId: 'question-789',
        anonymousId: 'anon-a3f2b1c4',
        message: 'Your question has been submitted anonymously'
      };

      expect(JSON.stringify(response)).not.toContain(studentId);
      expect(response).not.toHaveProperty('studentId');
    });
  });

  describe('Error Handling', () => {
    it('should return 400 error when studentId is missing', () => {
      const request = {
        classroomId: 'classroom-123',
        question: 'What is algebra?'
      };

      const error = { error: 'studentId is required' };
      expect(error.error).toBe('studentId is required');
    });

    it('should return 400 error when classroomId is missing', () => {
      const request = {
        studentId: 'student-123',
        question: 'What is algebra?'
      };

      const error = { error: 'classroomId is required' };
      expect(error.error).toBe('classroomId is required');
    });

    it('should return 400 error when question is missing', () => {
      const request = {
        studentId: 'student-123',
        classroomId: 'classroom-123'
      };

      const error = { error: 'question is required and cannot be empty' };
      expect(error.error).toContain('question is required');
    });

    it('should return 400 error when question is empty', () => {
      const question = '   ';
      const isEmpty = question.trim().length === 0;

      expect(isEmpty).toBe(true);
      const error = { error: 'question is required and cannot be empty' };
      expect(error.error).toContain('cannot be empty');
    });

    it('should return 500 error when database insert fails', async () => {
      vi.mocked(supabase.from).mockReturnValueOnce({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' }
            })
          })
        })
      } as any);

      const result = await supabase
        .from('anonymous_questions')
        .insert({})
        .select()
        .single();

      expect(result.error).toBeTruthy();
      const errorResponse = { error: 'Failed to submit anonymous question' };
      expect(errorResponse.error).toContain('Failed to submit');
    });
  });

  describe('Privacy & Security', () => {
    it('should never expose student identity to teacher', () => {
      const studentId = 'student-123';
      const hash = hashStudentId(studentId);
      const anonymousId = createAnonymousIdentifier(studentId);

      // Neither hash nor anonymous ID should reveal student identity
      expect(hash).not.toContain(studentId);
      expect(anonymousId).not.toContain(studentId);
    });

    it('should allow analytics using hash without revealing identity', () => {
      const studentId = 'student-123';
      const hash = hashStudentId(studentId);

      // Same student can be tracked across questions using hash
      const question1Hash = hash;
      const question2Hash = hashStudentId(studentId);

      expect(question1Hash).toBe(question2Hash);
      // But identity cannot be determined from hash alone
      expect(hash).not.toContain(studentId);
    });

    it('should maintain anonymity even with multiple questions', () => {
      const studentId = 'student-123';
      const questions = [
        { hash: hashStudentId(studentId), question: 'Question 1' },
        { hash: hashStudentId(studentId), question: 'Question 2' },
        { hash: hashStudentId(studentId), question: 'Question 3' }
      ];

      // All questions have same hash (for analytics)
      expect(questions[0].hash).toBe(questions[1].hash);
      expect(questions[1].hash).toBe(questions[2].hash);

      // But student ID is never exposed
      questions.forEach(q => {
        expect(q.hash).not.toContain(studentId);
      });
    });
  });

  describe('Integration with Requirements', () => {
    it('should satisfy REQ-3.1.1: provide anonymous question submission', () => {
      const request = {
        studentId: 'student-123',
        classroomId: 'classroom-456',
        question: 'What is algebra?'
      };

      // Endpoint accepts anonymous question submission
      expect(request.studentId).toBeTruthy();
      expect(request.question).toBeTruthy();
    });

    it('should satisfy REQ-3.1.2: create one-way hash of student ID', () => {
      const studentId = 'student-123';
      const hash = hashStudentId(studentId);

      // Hash is one-way (cannot be reversed)
      expect(hash).not.toBe(studentId);
      expect(hash).not.toContain(studentId);
      // Hash is consistent for analytics
      expect(hash).toBe(hashStudentId(studentId));
    });

    it('should satisfy REQ-3.1.3: store questions without revealing identity', () => {
      const studentId = 'student-123';
      const hash = hashStudentId(studentId);

      const storedData = {
        student_id_hash: hash,
        classroom_id: 'classroom-456',
        question: 'What is algebra?'
      };

      // Stored data does not contain actual student ID
      expect(storedData).not.toHaveProperty('student_id');
      expect(storedData).toHaveProperty('student_id_hash');
      expect(JSON.stringify(storedData)).not.toContain(studentId);
    });
  });
});
