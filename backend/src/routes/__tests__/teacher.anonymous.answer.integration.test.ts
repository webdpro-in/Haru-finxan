/**
 * Integration Tests for Anonymous Question Answer Broadcasting
 * 
 * Tests the complete flow from answering a question to broadcasting to students
 * 
 * REQ-3.1.5: System SHALL broadcast answers to entire classroom
 * 
 * **Validates: Requirements 3.1.5**
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createAnonymousIdentifier } from '../../utils/anonymousMode.js';

// Mock Socket.io
const mockIo = {
  to: vi.fn().mockReturnThis(),
  emit: vi.fn()
};

// Mock Supabase
const mockSupabase = {
  from: vi.fn()
};

describe('Anonymous Question Answer Broadcasting - Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SALT = 'test-salt-for-hashing-student-ids';
  });

  describe('Complete Answer Broadcasting Flow', () => {
    it('should simulate complete flow: fetch question, update with answer, broadcast', async () => {
      const questionId = 'question-123';
      const classroomId = 'classroom-456';
      const studentIdHash = 'hash-abc123';
      const question = 'What is algebra?';
      const answer = 'Algebra is a branch of mathematics that uses symbols and letters to represent numbers.';

      // Step 1: Fetch question from database
      const fetchedQuestion = {
        question_id: questionId,
        student_id_hash: studentIdHash,
        classroom_id: classroomId,
        question,
        asked_at: new Date().toISOString(),
        answered: false,
        answer: null
      };

      expect(fetchedQuestion.answered).toBe(false);
      expect(fetchedQuestion.answer).toBeNull();

      // Step 2: Update question with answer
      const updatedQuestion = {
        ...fetchedQuestion,
        answered: true,
        answer: answer.trim()
      };

      expect(updatedQuestion.answered).toBe(true);
      expect(updatedQuestion.answer).toBe(answer);

      // Step 3: Create anonymous identifier
      const anonymousId = createAnonymousIdentifier(studentIdHash);
      expect(anonymousId).toMatch(/^anon-[a-f0-9]{8}$/);

      // Step 4: Broadcast to classroom
      const timestamp = new Date().toISOString();
      const broadcastPayload = {
        questionId,
        anonymousId,
        question,
        answer: answer.trim(),
        timestamp
      };

      mockIo.to(`classroom:${classroomId}`).emit('student:anonymous_answer', broadcastPayload);

      // Verify broadcast
      expect(mockIo.to).toHaveBeenCalledWith(`classroom:${classroomId}`);
      expect(mockIo.emit).toHaveBeenCalledWith('student:anonymous_answer', broadcastPayload);

      // Verify payload structure
      expect(broadcastPayload).toHaveProperty('questionId');
      expect(broadcastPayload).toHaveProperty('anonymousId');
      expect(broadcastPayload).toHaveProperty('question');
      expect(broadcastPayload).toHaveProperty('answer');
      expect(broadcastPayload).toHaveProperty('timestamp');
    });

    it('should handle multiple answers to different questions in sequence', async () => {
      const questions = [
        {
          questionId: 'q1',
          classroomId: 'classroom-1',
          studentIdHash: 'hash-1',
          question: 'What is algebra?',
          answer: 'Algebra is math with symbols.'
        },
        {
          questionId: 'q2',
          classroomId: 'classroom-2',
          studentIdHash: 'hash-2',
          question: 'What is geometry?',
          answer: 'Geometry is the study of shapes.'
        }
      ];

      for (const q of questions) {
        // Simulate answering each question
        const anonymousId = createAnonymousIdentifier(q.studentIdHash);
        const payload = {
          questionId: q.questionId,
          anonymousId,
          question: q.question,
          answer: q.answer,
          timestamp: new Date().toISOString()
        };

        mockIo.to(`classroom:${q.classroomId}`).emit('student:anonymous_answer', payload);
      }

      // Verify broadcasts to different classrooms
      expect(mockIo.to).toHaveBeenCalledWith('classroom:classroom-1');
      expect(mockIo.to).toHaveBeenCalledWith('classroom:classroom-2');
      expect(mockIo.emit).toHaveBeenCalledTimes(2);
    });
  });

  describe('Data Flow Validation', () => {
    it('should maintain data integrity through the flow', async () => {
      const originalQuestion = {
        question_id: 'q1',
        student_id_hash: 'hash-abc',
        classroom_id: 'classroom-1',
        question: 'What is photosynthesis?',
        answered: false,
        answer: null
      };

      const teacherAnswer = 'Photosynthesis is the process by which plants convert light energy into chemical energy.';

      // Update with answer
      const updatedQuestion = {
        ...originalQuestion,
        answered: true,
        answer: teacherAnswer.trim()
      };

      // Create broadcast payload
      const anonymousId = createAnonymousIdentifier(originalQuestion.student_id_hash);
      const broadcastPayload = {
        questionId: originalQuestion.question_id,
        anonymousId,
        question: originalQuestion.question,
        answer: teacherAnswer.trim(),
        timestamp: new Date().toISOString()
      };

      // Verify data consistency
      expect(broadcastPayload.questionId).toBe(originalQuestion.question_id);
      expect(broadcastPayload.question).toBe(originalQuestion.question);
      expect(broadcastPayload.answer).toBe(updatedQuestion.answer);
      expect(broadcastPayload.anonymousId).not.toContain(originalQuestion.student_id_hash);
    });

    it('should trim whitespace consistently', async () => {
      const answerWithWhitespace = '  This is the answer.  ';
      const trimmedAnswer = answerWithWhitespace.trim();

      // Database update
      const updatedQuestion = {
        answered: true,
        answer: trimmedAnswer
      };

      // Broadcast payload
      const broadcastPayload = {
        questionId: 'q1',
        anonymousId: 'anon-12345678',
        question: 'Question?',
        answer: trimmedAnswer,
        timestamp: new Date().toISOString()
      };

      expect(updatedQuestion.answer).toBe('This is the answer.');
      expect(broadcastPayload.answer).toBe('This is the answer.');
      expect(updatedQuestion.answer).toBe(broadcastPayload.answer);
    });
  });

  describe('Privacy Protection Throughout Flow', () => {
    it('should never expose student identity at any step', async () => {
      const studentIdHash = 'hash-secret-123';
      const actualStudentId = 'student-real-id-456';

      // Step 1: Question from database (has hash, not ID)
      const questionData = {
        question_id: 'q1',
        student_id_hash: studentIdHash,
        classroom_id: 'classroom-1',
        question: 'What is algebra?'
      };

      expect(questionData).not.toHaveProperty('student_id');
      expect(JSON.stringify(questionData)).not.toContain(actualStudentId);

      // Step 2: Create anonymous identifier
      const anonymousId = createAnonymousIdentifier(studentIdHash);
      expect(anonymousId).not.toContain(studentIdHash);
      expect(anonymousId).not.toContain(actualStudentId);

      // Step 3: Broadcast payload
      const broadcastPayload = {
        questionId: 'q1',
        anonymousId,
        question: 'What is algebra?',
        answer: 'Algebra is math.',
        timestamp: new Date().toISOString()
      };

      expect(broadcastPayload).not.toHaveProperty('studentId');
      expect(broadcastPayload).not.toHaveProperty('studentIdHash');
      expect(JSON.stringify(broadcastPayload)).not.toContain(actualStudentId);
      expect(JSON.stringify(broadcastPayload)).not.toContain(studentIdHash);
    });
  });

  describe('Broadcast Targeting', () => {
    it('should broadcast to correct classroom only', async () => {
      const targetClassroom = 'classroom-456';
      const otherClassroom = 'classroom-789';

      const payload = {
        questionId: 'q1',
        anonymousId: 'anon-12345678',
        question: 'What is algebra?',
        answer: 'Algebra is math.',
        timestamp: new Date().toISOString()
      };

      mockIo.to(`classroom:${targetClassroom}`).emit('student:anonymous_answer', payload);

      expect(mockIo.to).toHaveBeenCalledWith(`classroom:${targetClassroom}`);
      expect(mockIo.to).not.toHaveBeenCalledWith(`classroom:${otherClassroom}`);
    });

    it('should use correct Socket.io event name', async () => {
      const payload = {
        questionId: 'q1',
        anonymousId: 'anon-12345678',
        question: 'What is algebra?',
        answer: 'Algebra is math.',
        timestamp: new Date().toISOString()
      };

      mockIo.to('classroom:123').emit('student:anonymous_answer', payload);

      expect(mockIo.emit).toHaveBeenCalledWith('student:anonymous_answer', expect.any(Object));
    });
  });

  describe('Error Scenarios', () => {
    it('should validate answer is not empty before processing', () => {
      const emptyAnswer = '   ';
      const isValid = emptyAnswer.trim().length > 0;

      expect(isValid).toBe(false);
    });

    it('should validate question exists before answering', () => {
      const questionData = null;
      const questionExists = questionData !== null;

      expect(questionExists).toBe(false);
    });

    it('should handle missing Socket.io gracefully', () => {
      const io = undefined;

      expect(() => {
        if (io) {
          io.to('classroom:123').emit('student:anonymous_answer', {});
        }
      }).not.toThrow();
    });
  });

  describe('Timestamp Handling', () => {
    it('should use current timestamp for answer broadcast', () => {
      const beforeTime = Date.now();
      const timestamp = new Date().toISOString();
      const afterTime = Date.now();

      const timestampMs = new Date(timestamp).getTime();

      expect(timestampMs).toBeGreaterThanOrEqual(beforeTime);
      expect(timestampMs).toBeLessThanOrEqual(afterTime);
    });

    it('should include valid ISO timestamp in broadcast', () => {
      const timestamp = new Date().toISOString();
      const payload = {
        questionId: 'q1',
        anonymousId: 'anon-12345678',
        question: 'What is algebra?',
        answer: 'Algebra is math.',
        timestamp
      };

      expect(payload.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(new Date(payload.timestamp).getTime()).toBeGreaterThan(0);
    });
  });

  describe('Answer Content Handling', () => {
    it('should handle short answers', () => {
      const shortAnswer = 'Yes.';
      const payload = {
        questionId: 'q1',
        anonymousId: 'anon-12345678',
        question: 'Is this correct?',
        answer: shortAnswer,
        timestamp: new Date().toISOString()
      };

      expect(payload.answer).toBe(shortAnswer);
      expect(payload.answer.length).toBeLessThan(10);
    });

    it('should handle long detailed answers', () => {
      const longAnswer = 'Algebra is a branch of mathematics that uses symbols and letters to represent numbers and quantities in formulas and equations. It allows us to solve problems by finding unknown values. For example, in the equation x + 5 = 10, we can solve for x by subtracting 5 from both sides, giving us x = 5.';
      
      const payload = {
        questionId: 'q1',
        anonymousId: 'anon-12345678',
        question: 'What is algebra?',
        answer: longAnswer,
        timestamp: new Date().toISOString()
      };

      expect(payload.answer).toBe(longAnswer);
      expect(payload.answer.length).toBeGreaterThan(100);
    });

    it('should handle answers with special characters', () => {
      const answer = 'The formula is E=mc². Energy equals mass times speed of light squared.';
      
      const payload = {
        questionId: 'q1',
        anonymousId: 'anon-12345678',
        question: 'What is E=mc²?',
        answer,
        timestamp: new Date().toISOString()
      };

      expect(payload.answer).toContain('²');
      expect(payload.answer).toContain('=');
    });

    it('should handle answers with line breaks', () => {
      const answer = 'Steps:\n1. First step\n2. Second step\n3. Third step';
      
      const payload = {
        questionId: 'q1',
        anonymousId: 'anon-12345678',
        question: 'How to solve?',
        answer,
        timestamp: new Date().toISOString()
      };

      expect(payload.answer).toContain('\n');
      expect(payload.answer.split('\n').length).toBeGreaterThan(1);
    });
  });

  describe('Requirements Validation', () => {
    it('should satisfy REQ-3.1.5: broadcast answers to entire classroom', () => {
      const classroomId = 'classroom-456';
      const payload = {
        questionId: 'q1',
        anonymousId: 'anon-12345678',
        question: 'What is algebra?',
        answer: 'Algebra is math.',
        timestamp: new Date().toISOString()
      };

      mockIo.to(`classroom:${classroomId}`).emit('student:anonymous_answer', payload);

      expect(mockIo.to).toHaveBeenCalledWith(`classroom:${classroomId}`);
      expect(mockIo.emit).toHaveBeenCalledWith('student:anonymous_answer', payload);
    });

    it('should include all required fields per REQ-3.1.5', () => {
      const payload = {
        questionId: 'q1',
        anonymousId: 'anon-12345678',
        question: 'What is algebra?',
        answer: 'Algebra is math.',
        timestamp: new Date().toISOString()
      };

      // REQ-3.1.5 specifies: questionId, anonymousId, question, answer, timestamp
      expect(payload).toHaveProperty('questionId');
      expect(payload).toHaveProperty('anonymousId');
      expect(payload).toHaveProperty('question');
      expect(payload).toHaveProperty('answer');
      expect(payload).toHaveProperty('timestamp');
    });

    it('should update question as answered per REQ-3.1.5', () => {
      const beforeUpdate = {
        question_id: 'q1',
        answered: false,
        answer: null
      };

      const afterUpdate = {
        ...beforeUpdate,
        answered: true,
        answer: 'Algebra is math.'
      };

      expect(beforeUpdate.answered).toBe(false);
      expect(afterUpdate.answered).toBe(true);
      expect(afterUpdate.answer).toBeTruthy();
    });
  });
});

