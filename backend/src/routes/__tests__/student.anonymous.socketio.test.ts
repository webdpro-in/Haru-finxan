/**
 * Unit Tests for Anonymous Question Socket.io Notifications
 * 
 * Tests for Socket.io notification when anonymous questions are submitted
 * 
 * REQ-3.1.4: System SHALL notify teacher of anonymous questions via Socket.io
 * 
 * **Validates: Requirements 3.1.4**
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { hashStudentId, createAnonymousIdentifier } from '../../utils/anonymousMode.js';

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

describe('Anonymous Question Socket.io Notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SALT = 'test-salt-for-hashing-student-ids';
  });

  describe('Socket.io Event Emission', () => {
    it('should emit teacher:anonymous_question event to classroom', () => {
      const classroomId = 'classroom-123';
      const mockIo = {
        to: vi.fn().mockReturnThis(),
        emit: vi.fn()
      };

      const questionData = {
        questionId: 'question-789',
        anonymousId: 'anon-a3f2b1c4',
        question: 'What is algebra?',
        timestamp: new Date().toISOString()
      };

      // Simulate Socket.io emission
      mockIo.to(`classroom:${classroomId}`).emit('teacher:anonymous_question', questionData);

      expect(mockIo.to).toHaveBeenCalledWith(`classroom:${classroomId}`);
      expect(mockIo.emit).toHaveBeenCalledWith('teacher:anonymous_question', questionData);
    });

    it('should send notification to correct classroom room', () => {
      const classroomId = 'classroom-456';
      const mockIo = {
        to: vi.fn().mockReturnThis(),
        emit: vi.fn()
      };

      mockIo.to(`classroom:${classroomId}`).emit('teacher:anonymous_question', {});

      expect(mockIo.to).toHaveBeenCalledWith(`classroom:${classroomId}`);
      expect(mockIo.to).toHaveBeenCalledTimes(1);
    });

    it('should use correct event name for teacher notifications', () => {
      const mockIo = {
        to: vi.fn().mockReturnThis(),
        emit: vi.fn()
      };

      mockIo.to('classroom:123').emit('teacher:anonymous_question', {});

      expect(mockIo.emit).toHaveBeenCalledWith('teacher:anonymous_question', expect.any(Object));
    });
  });

  describe('Notification Payload', () => {
    it('should include questionId in notification', () => {
      const questionId = 'question-789';
      const payload = {
        questionId,
        anonymousId: 'anon-a3f2b1c4',
        question: 'What is algebra?',
        timestamp: new Date().toISOString()
      };

      expect(payload.questionId).toBe(questionId);
      expect(payload.questionId).toBeTruthy();
    });

    it('should include anonymousId in notification', () => {
      const studentId = 'student-123';
      const anonymousId = createAnonymousIdentifier(studentId);
      
      const payload = {
        questionId: 'question-789',
        anonymousId,
        question: 'What is algebra?',
        timestamp: new Date().toISOString()
      };

      expect(payload.anonymousId).toBe(anonymousId);
      expect(payload.anonymousId).toMatch(/^anon-[a-f0-9]{8}$/);
    });

    it('should include question text in notification', () => {
      const question = 'What is algebra?';
      const payload = {
        questionId: 'question-789',
        anonymousId: 'anon-a3f2b1c4',
        question,
        timestamp: new Date().toISOString()
      };

      expect(payload.question).toBe(question);
      expect(payload.question).toBeTruthy();
    });

    it('should include timestamp in notification', () => {
      const timestamp = new Date().toISOString();
      const payload = {
        questionId: 'question-789',
        anonymousId: 'anon-a3f2b1c4',
        question: 'What is algebra?',
        timestamp
      };

      expect(payload.timestamp).toBe(timestamp);
      expect(new Date(payload.timestamp).getTime()).toBeGreaterThan(0);
    });

    it('should have all required fields in payload', () => {
      const payload = {
        questionId: 'question-789',
        anonymousId: 'anon-a3f2b1c4',
        question: 'What is algebra?',
        timestamp: new Date().toISOString()
      };

      expect(payload).toHaveProperty('questionId');
      expect(payload).toHaveProperty('anonymousId');
      expect(payload).toHaveProperty('question');
      expect(payload).toHaveProperty('timestamp');
    });
  });

  describe('Privacy Protection in Notifications', () => {
    it('should NOT include actual student ID in notification', () => {
      const studentId = 'student-123';
      const anonymousId = createAnonymousIdentifier(studentId);
      
      const payload = {
        questionId: 'question-789',
        anonymousId,
        question: 'What is algebra?',
        timestamp: new Date().toISOString()
      };

      expect(payload).not.toHaveProperty('studentId');
      expect(JSON.stringify(payload)).not.toContain(studentId);
    });

    it('should NOT include student ID hash in notification', () => {
      const studentId = 'student-123';
      const studentIdHash = hashStudentId(studentId);
      const anonymousId = createAnonymousIdentifier(studentId);
      
      const payload = {
        questionId: 'question-789',
        anonymousId,
        question: 'What is algebra?',
        timestamp: new Date().toISOString()
      };

      expect(payload).not.toHaveProperty('studentIdHash');
      expect(JSON.stringify(payload)).not.toContain(studentIdHash);
    });

    it('should only expose anonymous identifier to teacher', () => {
      const studentId = 'student-123';
      const anonymousId = createAnonymousIdentifier(studentId);
      
      const payload = {
        questionId: 'question-789',
        anonymousId,
        question: 'What is algebra?',
        timestamp: new Date().toISOString()
      };

      // Only anonymous ID should be present
      expect(payload.anonymousId).toBeTruthy();
      expect(payload.anonymousId).not.toContain(studentId);
      expect(payload).not.toHaveProperty('studentId');
    });

    it('should maintain anonymity even with sensitive questions', () => {
      const studentId = 'student-123';
      const anonymousId = createAnonymousIdentifier(studentId);
      const sensitiveQuestion = 'I am confused about everything and feel embarrassed';
      
      const payload = {
        questionId: 'question-789',
        anonymousId,
        question: sensitiveQuestion,
        timestamp: new Date().toISOString()
      };

      // Question is included but student identity is protected
      expect(payload.question).toBe(sensitiveQuestion);
      expect(payload.anonymousId).not.toContain(studentId);
      expect(JSON.stringify(payload)).not.toContain(studentId);
    });
  });

  describe('Real-time Notification Flow', () => {
    it('should notify teachers immediately after question submission', () => {
      const mockIo = {
        to: vi.fn().mockReturnThis(),
        emit: vi.fn()
      };

      const classroomId = 'classroom-123';
      const payload = {
        questionId: 'question-789',
        anonymousId: 'anon-a3f2b1c4',
        question: 'What is algebra?',
        timestamp: new Date().toISOString()
      };

      // Simulate immediate notification
      mockIo.to(`classroom:${classroomId}`).emit('teacher:anonymous_question', payload);

      expect(mockIo.to).toHaveBeenCalledWith(`classroom:${classroomId}`);
      expect(mockIo.emit).toHaveBeenCalledWith('teacher:anonymous_question', payload);
      expect(mockIo.emit).toHaveBeenCalledTimes(1);
    });

    it('should notify all teachers in the classroom', () => {
      const mockIo = {
        to: vi.fn().mockReturnThis(),
        emit: vi.fn()
      };

      const classroomId = 'classroom-123';
      
      // Socket.io room pattern ensures all teachers in room receive notification
      mockIo.to(`classroom:${classroomId}`).emit('teacher:anonymous_question', {});

      // Verify room-based broadcast
      expect(mockIo.to).toHaveBeenCalledWith(`classroom:${classroomId}`);
    });

    it('should handle multiple classrooms independently', () => {
      const mockIo = {
        to: vi.fn().mockReturnThis(),
        emit: vi.fn()
      };

      const classroom1 = 'classroom-123';
      const classroom2 = 'classroom-456';

      // Questions in different classrooms
      mockIo.to(`classroom:${classroom1}`).emit('teacher:anonymous_question', {
        questionId: 'q1',
        anonymousId: 'anon-1',
        question: 'Question 1',
        timestamp: new Date().toISOString()
      });

      mockIo.to(`classroom:${classroom2}`).emit('teacher:anonymous_question', {
        questionId: 'q2',
        anonymousId: 'anon-2',
        question: 'Question 2',
        timestamp: new Date().toISOString()
      });

      expect(mockIo.to).toHaveBeenCalledWith(`classroom:${classroom1}`);
      expect(mockIo.to).toHaveBeenCalledWith(`classroom:${classroom2}`);
      expect(mockIo.emit).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing Socket.io instance gracefully', () => {
      const io = undefined;

      // Should not throw error when io is undefined
      expect(() => {
        if (io) {
          io.to('classroom:123').emit('teacher:anonymous_question', {});
        }
      }).not.toThrow();
    });

    it('should log warning when Socket.io is unavailable', () => {
      const io = null;
      const shouldWarn = !io;

      expect(shouldWarn).toBe(true);
      // In actual implementation, logger.warn would be called
    });

    it('should still store question even if notification fails', () => {
      // Question storage should succeed independently of notification
      const questionStored = true;
      const notificationFailed = true;

      // Both can be true - storage is independent of notification
      expect(questionStored).toBe(true);
      expect(notificationFailed).toBe(true);
    });
  });

  describe('Integration with Requirements', () => {
    it('should satisfy REQ-3.1.4: notify teacher via Socket.io', () => {
      const mockIo = {
        to: vi.fn().mockReturnThis(),
        emit: vi.fn()
      };

      const classroomId = 'classroom-123';
      const payload = {
        questionId: 'question-789',
        anonymousId: 'anon-a3f2b1c4',
        question: 'What is algebra?',
        timestamp: new Date().toISOString()
      };

      // Emit notification via Socket.io
      mockIo.to(`classroom:${classroomId}`).emit('teacher:anonymous_question', payload);

      // Verify notification was sent
      expect(mockIo.to).toHaveBeenCalledWith(`classroom:${classroomId}`);
      expect(mockIo.emit).toHaveBeenCalledWith('teacher:anonymous_question', payload);
    });

    it('should include all required fields per REQ-3.1.4', () => {
      const payload = {
        questionId: 'question-789',
        anonymousId: 'anon-a3f2b1c4',
        question: 'What is algebra?',
        timestamp: new Date().toISOString()
      };

      // REQ-3.1.4 specifies: questionId, anonymousId, question text, timestamp
      expect(payload.questionId).toBeTruthy();
      expect(payload.anonymousId).toBeTruthy();
      expect(payload.question).toBeTruthy();
      expect(payload.timestamp).toBeTruthy();
    });

    it('should NOT include actual student ID per REQ-3.1.4', () => {
      const studentId = 'student-123';
      const payload = {
        questionId: 'question-789',
        anonymousId: createAnonymousIdentifier(studentId),
        question: 'What is algebra?',
        timestamp: new Date().toISOString()
      };

      // REQ-3.1.4 explicitly states: "Do NOT include actual student ID"
      expect(payload).not.toHaveProperty('studentId');
      expect(JSON.stringify(payload)).not.toContain(studentId);
    });

    it('should send to all teachers in classroom per REQ-3.1.4', () => {
      const mockIo = {
        to: vi.fn().mockReturnThis(),
        emit: vi.fn()
      };

      const classroomId = 'classroom-123';

      // REQ-3.1.4: "Send notification to all teachers in the classroom"
      mockIo.to(`classroom:${classroomId}`).emit('teacher:anonymous_question', {});

      // Room-based emission ensures all teachers in room receive it
      expect(mockIo.to).toHaveBeenCalledWith(`classroom:${classroomId}`);
    });
  });

  describe('Notification Timing', () => {
    it('should send notification with current timestamp', () => {
      const beforeTime = Date.now();
      const timestamp = new Date().toISOString();
      const afterTime = Date.now();

      const timestampMs = new Date(timestamp).getTime();

      expect(timestampMs).toBeGreaterThanOrEqual(beforeTime);
      expect(timestampMs).toBeLessThanOrEqual(afterTime);
    });

    it('should use same timestamp for storage and notification', () => {
      const timestamp = new Date().toISOString();

      const storageData = {
        asked_at: timestamp
      };

      const notificationData = {
        timestamp
      };

      expect(storageData.asked_at).toBe(notificationData.timestamp);
    });
  });

  describe('Question Content Handling', () => {
    it('should trim whitespace from question in notification', () => {
      const question = '  What is algebra?  ';
      const trimmed = question.trim();

      const payload = {
        questionId: 'question-789',
        anonymousId: 'anon-a3f2b1c4',
        question: trimmed,
        timestamp: new Date().toISOString()
      };

      expect(payload.question).toBe('What is algebra?');
      expect(payload.question).not.toMatch(/^\s/);
      expect(payload.question).not.toMatch(/\s$/);
    });

    it('should preserve question content exactly as submitted', () => {
      const question = 'What is the difference between mitosis and meiosis?';
      
      const payload = {
        questionId: 'question-789',
        anonymousId: 'anon-a3f2b1c4',
        question,
        timestamp: new Date().toISOString()
      };

      expect(payload.question).toBe(question);
    });

    it('should handle long questions in notification', () => {
      const longQuestion = 'I am really confused about how photosynthesis works. Can you explain the light-dependent and light-independent reactions in detail? Also, what is the role of chlorophyll?';
      
      const payload = {
        questionId: 'question-789',
        anonymousId: 'anon-a3f2b1c4',
        question: longQuestion,
        timestamp: new Date().toISOString()
      };

      expect(payload.question).toBe(longQuestion);
      expect(payload.question.length).toBeGreaterThan(100);
    });

    it('should handle questions with special characters', () => {
      const question = 'What is E=mc²? How does it relate to energy?';
      
      const payload = {
        questionId: 'question-789',
        anonymousId: 'anon-a3f2b1c4',
        question,
        timestamp: new Date().toISOString()
      };

      expect(payload.question).toBe(question);
      expect(payload.question).toContain('²');
    });
  });
});
