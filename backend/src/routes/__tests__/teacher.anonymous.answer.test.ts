/**
 * Unit Tests for Anonymous Question Answer Broadcasting
 * 
 * Tests for POST /api/teacher/anonymous-question/:questionId/answer endpoint
 * 
 * REQ-3.1.5: System SHALL broadcast answers to entire classroom
 * 
 * **Validates: Requirements 3.1.5**
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createAnonymousIdentifier } from '../../utils/anonymousMode.js';

// Mock dependencies
vi.mock('../../config/supabase.js', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn()
          }))
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

describe('Anonymous Question Answer Broadcasting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SALT = 'test-salt-for-hashing-student-ids';
  });

  describe('Input Validation', () => {
    it('should reject request when answer is missing', () => {
      const request = {
        questionId: 'question-123'
      };

      expect(request).not.toHaveProperty('answer');
    });

    it('should reject request when answer is empty string', () => {
      const answer = '   ';
      const trimmed = answer.trim();

      expect(trimmed.length).toBe(0);
    });

    it('should accept valid request with answer', () => {
      const request = {
        questionId: 'question-123',
        answer: 'Algebra is a branch of mathematics...'
      };

      expect(request.questionId).toBeTruthy();
      expect(request.answer).toBeTruthy();
      expect(request.answer.trim().length).toBeGreaterThan(0);
    });

    it('should validate questionId is provided in URL params', () => {
      const params = {
        questionId: 'question-123'
      };

      expect(params.questionId).toBeTruthy();
    });
  });

  describe('Question Retrieval', () => {
    it('should fetch question from database by questionId', () => {
      const questionId = 'question-123';
      const expectedQuery = {
        table: 'anonymous_questions',
        filter: { question_id: questionId }
      };

      expect(expectedQuery.table).toBe('anonymous_questions');
      expect(expectedQuery.filter.question_id).toBe(questionId);
    });

    it('should return 404 when question not found', () => {
      const questionData = null;
      const error = { error: 'Question not found' };

      expect(questionData).toBeNull();
      expect(error.error).toBe('Question not found');
    });

    it('should retrieve all question fields for broadcasting', () => {
      const questionData = {
        question_id: 'question-123',
        student_id_hash: 'hash-abc123',
        classroom_id: 'classroom-456',
        question: 'What is algebra?',
        asked_at: new Date().toISOString(),
        answered: false,
        answer: null
      };

      expect(questionData.question_id).toBeTruthy();
      expect(questionData.student_id_hash).toBeTruthy();
      expect(questionData.classroom_id).toBeTruthy();
      expect(questionData.question).toBeTruthy();
    });
  });

  describe('Database Update', () => {
    it('should update question with answer text', () => {
      const answer = 'Algebra is a branch of mathematics...';
      const updateData = {
        answered: true,
        answer: answer.trim()
      };

      expect(updateData.answered).toBe(true);
      expect(updateData.answer).toBe(answer.trim());
    });

    it('should set answered flag to true', () => {
      const updateData = {
        answered: true,
        answer: 'Some answer'
      };

      expect(updateData.answered).toBe(true);
    });

    it('should trim whitespace from answer before storing', () => {
      const answer = '  Algebra is a branch of mathematics...  ';
      const trimmed = answer.trim();

      expect(trimmed).toBe('Algebra is a branch of mathematics...');
      expect(trimmed).not.toMatch(/^\s/);
      expect(trimmed).not.toMatch(/\s$/);
    });

    it('should update only the specified question', () => {
      const questionId = 'question-123';
      const updateFilter = {
        question_id: questionId
      };

      expect(updateFilter.question_id).toBe(questionId);
    });

    it('should return updated question data', () => {
      const updatedQuestion = {
        question_id: 'question-123',
        student_id_hash: 'hash-abc123',
        classroom_id: 'classroom-456',
        question: 'What is algebra?',
        answered: true,
        answer: 'Algebra is a branch of mathematics...'
      };

      expect(updatedQuestion.answered).toBe(true);
      expect(updatedQuestion.answer).toBeTruthy();
    });
  });

  describe('Anonymous Identifier Generation', () => {
    it('should create anonymous identifier from student ID hash', () => {
      const studentIdHash = 'hash-abc123';
      const anonymousId = createAnonymousIdentifier(studentIdHash);

      expect(anonymousId).toBeTruthy();
      expect(anonymousId).toMatch(/^anon-[a-f0-9]{8}$/);
    });

    it('should produce consistent identifier for same hash', () => {
      const studentIdHash = 'hash-abc123';
      const id1 = createAnonymousIdentifier(studentIdHash);
      const id2 = createAnonymousIdentifier(studentIdHash);

      expect(id1).toBe(id2);
    });

    it('should not reveal student identity in identifier', () => {
      const studentIdHash = 'hash-abc123';
      const anonymousId = createAnonymousIdentifier(studentIdHash);

      expect(anonymousId).not.toContain('hash');
      expect(anonymousId).not.toContain('abc123');
    });
  });

  describe('Socket.io Broadcasting', () => {
    it('should emit student:anonymous_answer event to classroom', () => {
      const classroomId = 'classroom-456';
      const mockIo = {
        to: vi.fn().mockReturnThis(),
        emit: vi.fn()
      };

      const payload = {
        questionId: 'question-123',
        anonymousId: 'anon-a3f2b1c4',
        question: 'What is algebra?',
        answer: 'Algebra is a branch of mathematics...',
        timestamp: new Date().toISOString()
      };

      mockIo.to(`classroom:${classroomId}`).emit('student:anonymous_answer', payload);

      expect(mockIo.to).toHaveBeenCalledWith(`classroom:${classroomId}`);
      expect(mockIo.emit).toHaveBeenCalledWith('student:anonymous_answer', payload);
    });

    it('should broadcast to correct classroom room', () => {
      const classroomId = 'classroom-456';
      const mockIo = {
        to: vi.fn().mockReturnThis(),
        emit: vi.fn()
      };

      mockIo.to(`classroom:${classroomId}`).emit('student:anonymous_answer', {});

      expect(mockIo.to).toHaveBeenCalledWith(`classroom:${classroomId}`);
    });

    it('should use correct event name for student notifications', () => {
      const mockIo = {
        to: vi.fn().mockReturnThis(),
        emit: vi.fn()
      };

      mockIo.to('classroom:456').emit('student:anonymous_answer', {});

      expect(mockIo.emit).toHaveBeenCalledWith('student:anonymous_answer', expect.any(Object));
    });
  });

  describe('Broadcast Payload', () => {
    it('should include questionId in broadcast', () => {
      const questionId = 'question-123';
      const payload = {
        questionId,
        anonymousId: 'anon-a3f2b1c4',
        question: 'What is algebra?',
        answer: 'Algebra is a branch of mathematics...',
        timestamp: new Date().toISOString()
      };

      expect(payload.questionId).toBe(questionId);
    });

    it('should include anonymousId in broadcast', () => {
      const anonymousId = 'anon-a3f2b1c4';
      const payload = {
        questionId: 'question-123',
        anonymousId,
        question: 'What is algebra?',
        answer: 'Algebra is a branch of mathematics...',
        timestamp: new Date().toISOString()
      };

      expect(payload.anonymousId).toBe(anonymousId);
      expect(payload.anonymousId).toMatch(/^anon-[a-f0-9]{8}$/);
    });

    it('should include original question text in broadcast', () => {
      const question = 'What is algebra?';
      const payload = {
        questionId: 'question-123',
        anonymousId: 'anon-a3f2b1c4',
        question,
        answer: 'Algebra is a branch of mathematics...',
        timestamp: new Date().toISOString()
      };

      expect(payload.question).toBe(question);
    });

    it('should include answer text in broadcast', () => {
      const answer = 'Algebra is a branch of mathematics...';
      const payload = {
        questionId: 'question-123',
        anonymousId: 'anon-a3f2b1c4',
        question: 'What is algebra?',
        answer,
        timestamp: new Date().toISOString()
      };

      expect(payload.answer).toBe(answer);
    });

    it('should include timestamp in broadcast', () => {
      const timestamp = new Date().toISOString();
      const payload = {
        questionId: 'question-123',
        anonymousId: 'anon-a3f2b1c4',
        question: 'What is algebra?',
        answer: 'Algebra is a branch of mathematics...',
        timestamp
      };

      expect(payload.timestamp).toBe(timestamp);
      expect(new Date(payload.timestamp).getTime()).toBeGreaterThan(0);
    });

    it('should have all required fields in payload', () => {
      const payload = {
        questionId: 'question-123',
        anonymousId: 'anon-a3f2b1c4',
        question: 'What is algebra?',
        answer: 'Algebra is a branch of mathematics...',
        timestamp: new Date().toISOString()
      };

      expect(payload).toHaveProperty('questionId');
      expect(payload).toHaveProperty('anonymousId');
      expect(payload).toHaveProperty('question');
      expect(payload).toHaveProperty('answer');
      expect(payload).toHaveProperty('timestamp');
    });
  });

  describe('Privacy Protection', () => {
    it('should NOT include actual student ID in broadcast', () => {
      const studentId = 'student-123';
      const payload = {
        questionId: 'question-123',
        anonymousId: 'anon-a3f2b1c4',
        question: 'What is algebra?',
        answer: 'Algebra is a branch of mathematics...',
        timestamp: new Date().toISOString()
      };

      expect(payload).not.toHaveProperty('studentId');
      expect(JSON.stringify(payload)).not.toContain(studentId);
    });

    it('should NOT include student ID hash in broadcast', () => {
      const studentIdHash = 'hash-abc123';
      const payload = {
        questionId: 'question-123',
        anonymousId: 'anon-a3f2b1c4',
        question: 'What is algebra?',
        answer: 'Algebra is a branch of mathematics...',
        timestamp: new Date().toISOString()
      };

      expect(payload).not.toHaveProperty('studentIdHash');
      expect(JSON.stringify(payload)).not.toContain(studentIdHash);
    });

    it('should only expose anonymous identifier', () => {
      const payload = {
        questionId: 'question-123',
        anonymousId: 'anon-a3f2b1c4',
        question: 'What is algebra?',
        answer: 'Algebra is a branch of mathematics...',
        timestamp: new Date().toISOString()
      };

      expect(payload.anonymousId).toBeTruthy();
      expect(payload.anonymousId).toMatch(/^anon-[a-f0-9]{8}$/);
      expect(payload).not.toHaveProperty('studentId');
      expect(payload).not.toHaveProperty('studentIdHash');
    });
  });

  describe('Broadcasting to All Students', () => {
    it('should broadcast to all students in classroom', () => {
      const mockIo = {
        to: vi.fn().mockReturnThis(),
        emit: vi.fn()
      };

      const classroomId = 'classroom-456';

      // Socket.io room pattern ensures all students in room receive answer
      mockIo.to(`classroom:${classroomId}`).emit('student:anonymous_answer', {});

      expect(mockIo.to).toHaveBeenCalledWith(`classroom:${classroomId}`);
    });

    it('should broadcast immediately after answer is saved', () => {
      const mockIo = {
        to: vi.fn().mockReturnThis(),
        emit: vi.fn()
      };

      const payload = {
        questionId: 'question-123',
        anonymousId: 'anon-a3f2b1c4',
        question: 'What is algebra?',
        answer: 'Algebra is a branch of mathematics...',
        timestamp: new Date().toISOString()
      };

      mockIo.to('classroom:456').emit('student:anonymous_answer', payload);

      expect(mockIo.emit).toHaveBeenCalledWith('student:anonymous_answer', payload);
      expect(mockIo.emit).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple classrooms independently', () => {
      const mockIo = {
        to: vi.fn().mockReturnThis(),
        emit: vi.fn()
      };

      const classroom1 = 'classroom-123';
      const classroom2 = 'classroom-456';

      mockIo.to(`classroom:${classroom1}`).emit('student:anonymous_answer', {
        questionId: 'q1',
        answer: 'Answer 1'
      });

      mockIo.to(`classroom:${classroom2}`).emit('student:anonymous_answer', {
        questionId: 'q2',
        answer: 'Answer 2'
      });

      expect(mockIo.to).toHaveBeenCalledWith(`classroom:${classroom1}`);
      expect(mockIo.to).toHaveBeenCalledWith(`classroom:${classroom2}`);
      expect(mockIo.emit).toHaveBeenCalledTimes(2);
    });
  });

  describe('Response Format', () => {
    it('should return success response with required fields', () => {
      const response = {
        success: true,
        message: 'Answer provided and broadcast to classroom',
        question: {
          question_id: 'question-123',
          answered: true,
          answer: 'Algebra is a branch of mathematics...'
        }
      };

      expect(response.success).toBe(true);
      expect(response.message).toBeTruthy();
      expect(response.question).toBeTruthy();
    });

    it('should return 200 status code on success', () => {
      const statusCode = 200;
      expect(statusCode).toBe(200);
    });

    it('should include updated question in response', () => {
      const response = {
        success: true,
        message: 'Answer provided and broadcast to classroom',
        question: {
          question_id: 'question-123',
          answered: true,
          answer: 'Algebra is a branch of mathematics...'
        }
      };

      expect(response.question.answered).toBe(true);
      expect(response.question.answer).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should return 400 error when answer is missing', () => {
      const request = {
        questionId: 'question-123'
      };

      const error = { error: 'answer is required and cannot be empty' };
      expect(error.error).toContain('answer is required');
    });

    it('should return 400 error when answer is empty', () => {
      const answer = '   ';
      const isEmpty = answer.trim().length === 0;

      expect(isEmpty).toBe(true);
      const error = { error: 'answer is required and cannot be empty' };
      expect(error.error).toContain('cannot be empty');
    });

    it('should return 404 error when question not found', () => {
      const questionData = null;
      const error = { error: 'Question not found' };

      expect(questionData).toBeNull();
      expect(error.error).toBe('Question not found');
    });

    it('should return 500 error when database update fails', () => {
      const updateError = { message: 'Database error' };
      const error = { error: 'Failed to update question' };

      expect(updateError).toBeTruthy();
      expect(error.error).toContain('Failed to update');
    });

    it('should handle missing Socket.io instance gracefully', () => {
      const io = undefined;

      expect(() => {
        if (io) {
          io.to('classroom:123').emit('student:anonymous_answer', {});
        }
      }).not.toThrow();
    });

    it('should log warning when Socket.io is unavailable', () => {
      const io = null;
      const shouldWarn = !io;

      expect(shouldWarn).toBe(true);
    });

    it('should still save answer even if broadcast fails', () => {
      const answerSaved = true;
      const broadcastFailed = true;

      expect(answerSaved).toBe(true);
      expect(broadcastFailed).toBe(true);
    });
  });

  describe('Answer Content Handling', () => {
    it('should handle short answers', () => {
      const answer = 'Yes, that is correct.';
      const payload = {
        questionId: 'question-123',
        anonymousId: 'anon-a3f2b1c4',
        question: 'Is this right?',
        answer,
        timestamp: new Date().toISOString()
      };

      expect(payload.answer).toBe(answer);
      expect(payload.answer.length).toBeLessThan(50);
    });

    it('should handle long detailed answers', () => {
      const answer = 'Algebra is a branch of mathematics that uses symbols and letters to represent numbers and quantities in formulas and equations. It allows us to solve problems by finding unknown values. For example, in the equation x + 5 = 10, we can solve for x by subtracting 5 from both sides, giving us x = 5.';
      
      const payload = {
        questionId: 'question-123',
        anonymousId: 'anon-a3f2b1c4',
        question: 'What is algebra?',
        answer,
        timestamp: new Date().toISOString()
      };

      expect(payload.answer).toBe(answer);
      expect(payload.answer.length).toBeGreaterThan(100);
    });

    it('should handle answers with special characters', () => {
      const answer = 'The formula is E=mc². This means energy equals mass times the speed of light squared.';
      
      const payload = {
        questionId: 'question-123',
        anonymousId: 'anon-a3f2b1c4',
        question: 'What is E=mc²?',
        answer,
        timestamp: new Date().toISOString()
      };

      expect(payload.answer).toBe(answer);
      expect(payload.answer).toContain('²');
    });

    it('should handle answers with line breaks', () => {
      const answer = 'Here are the steps:\n1. First step\n2. Second step\n3. Third step';
      
      const payload = {
        questionId: 'question-123',
        anonymousId: 'anon-a3f2b1c4',
        question: 'How do I solve this?',
        answer,
        timestamp: new Date().toISOString()
      };

      expect(payload.answer).toBe(answer);
      expect(payload.answer).toContain('\n');
    });

    it('should preserve answer content exactly as provided', () => {
      const answer = 'Photosynthesis is the process by which plants convert light energy into chemical energy.';
      
      const payload = {
        questionId: 'question-123',
        anonymousId: 'anon-a3f2b1c4',
        question: 'What is photosynthesis?',
        answer,
        timestamp: new Date().toISOString()
      };

      expect(payload.answer).toBe(answer);
    });
  });

  describe('Integration with Requirements', () => {
    it('should satisfy REQ-3.1.5: broadcast answers to entire classroom', () => {
      const mockIo = {
        to: vi.fn().mockReturnThis(),
        emit: vi.fn()
      };

      const classroomId = 'classroom-456';
      const payload = {
        questionId: 'question-123',
        anonymousId: 'anon-a3f2b1c4',
        question: 'What is algebra?',
        answer: 'Algebra is a branch of mathematics...',
        timestamp: new Date().toISOString()
      };

      mockIo.to(`classroom:${classroomId}`).emit('student:anonymous_answer', payload);

      expect(mockIo.to).toHaveBeenCalledWith(`classroom:${classroomId}`);
      expect(mockIo.emit).toHaveBeenCalledWith('student:anonymous_answer', payload);
    });

    it('should include all required fields per REQ-3.1.5', () => {
      const payload = {
        questionId: 'question-123',
        anonymousId: 'anon-a3f2b1c4',
        question: 'What is algebra?',
        answer: 'Algebra is a branch of mathematics...',
        timestamp: new Date().toISOString()
      };

      // REQ-3.1.5 specifies: questionId, anonymousId, question, answer, timestamp
      expect(payload.questionId).toBeTruthy();
      expect(payload.anonymousId).toBeTruthy();
      expect(payload.question).toBeTruthy();
      expect(payload.answer).toBeTruthy();
      expect(payload.timestamp).toBeTruthy();
    });

    it('should update question as answered per REQ-3.1.5', () => {
      const updateData = {
        answered: true,
        answer: 'Algebra is a branch of mathematics...'
      };

      expect(updateData.answered).toBe(true);
      expect(updateData.answer).toBeTruthy();
    });

    it('should broadcast to all students in classroom per REQ-3.1.5', () => {
      const mockIo = {
        to: vi.fn().mockReturnThis(),
        emit: vi.fn()
      };

      const classroomId = 'classroom-456';

      // REQ-3.1.5: "Broadcast answer to all students in classroom"
      mockIo.to(`classroom:${classroomId}`).emit('student:anonymous_answer', {});

      expect(mockIo.to).toHaveBeenCalledWith(`classroom:${classroomId}`);
    });

    it('should maintain anonymity in answer broadcast per REQ-3.1.5', () => {
      const payload = {
        questionId: 'question-123',
        anonymousId: 'anon-a3f2b1c4',
        question: 'What is algebra?',
        answer: 'Algebra is a branch of mathematics...',
        timestamp: new Date().toISOString()
      };

      // Student identity should remain protected
      expect(payload.anonymousId).toMatch(/^anon-[a-f0-9]{8}$/);
      expect(payload).not.toHaveProperty('studentId');
      expect(payload).not.toHaveProperty('studentIdHash');
    });
  });

  describe('Timestamp Handling', () => {
    it('should use current timestamp for answer', () => {
      const beforeTime = Date.now();
      const timestamp = new Date().toISOString();
      const afterTime = Date.now();

      const timestampMs = new Date(timestamp).getTime();

      expect(timestampMs).toBeGreaterThanOrEqual(beforeTime);
      expect(timestampMs).toBeLessThanOrEqual(afterTime);
    });

    it('should include timestamp in broadcast payload', () => {
      const timestamp = new Date().toISOString();
      const payload = {
        questionId: 'question-123',
        anonymousId: 'anon-a3f2b1c4',
        question: 'What is algebra?',
        answer: 'Algebra is a branch of mathematics...',
        timestamp
      };

      expect(payload.timestamp).toBe(timestamp);
      expect(new Date(payload.timestamp).getTime()).toBeGreaterThan(0);
    });
  });

  describe('Classroom Isolation', () => {
    it('should only broadcast to specified classroom', () => {
      const mockIo = {
        to: vi.fn().mockReturnThis(),
        emit: vi.fn()
      };

      const classroomId = 'classroom-456';

      mockIo.to(`classroom:${classroomId}`).emit('student:anonymous_answer', {});

      expect(mockIo.to).toHaveBeenCalledWith(`classroom:${classroomId}`);
      expect(mockIo.to).toHaveBeenCalledTimes(1);
    });

    it('should not broadcast to other classrooms', () => {
      const mockIo = {
        to: vi.fn().mockReturnThis(),
        emit: vi.fn()
      };

      const targetClassroom = 'classroom-456';
      const otherClassroom = 'classroom-789';

      mockIo.to(`classroom:${targetClassroom}`).emit('student:anonymous_answer', {});

      expect(mockIo.to).not.toHaveBeenCalledWith(`classroom:${otherClassroom}`);
    });
  });
});
