/**
 * Integration Tests for Anonymous Question with Socket.io
 * 
 * Tests the complete flow from HTTP request to Socket.io notification
 * 
 * REQ-3.1.4: System SHALL notify teacher of anonymous questions via Socket.io
 * 
 * **Validates: Requirements 3.1.4**
 */

import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import { Server } from 'socket.io';
import request from 'supertest';
import { studentRouter } from '../student.js';

// Mock dependencies
vi.mock('../../config/supabase.js', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: {
              question_id: 'test-question-id',
              student_id_hash: 'test-hash',
              classroom_id: 'classroom-123',
              question: 'What is algebra?',
              asked_at: new Date().toISOString(),
              answered: false
            },
            error: null
          })
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

vi.mock('../../utils/anonymousMode.js', () => ({
  hashStudentId: (id: string) => `hash-${id}`,
  createAnonymousIdentifier: (id: string) => `anon-${id.slice(-8)}`
}));

describe('Anonymous Question Integration with Socket.io', () => {
  it('should emit Socket.io event when anonymous question is submitted', async () => {
    // Set up Express app with Socket.io
    const app = express();
    app.use(express.json());

    // Create mock Socket.io instance
    const mockEmit = vi.fn();
    const mockTo = vi.fn().mockReturnValue({ emit: mockEmit });
    const mockIo = { to: mockTo };

    // Make io available to routes
    app.set('io', mockIo);

    // Mount student router
    app.use('/api/student', studentRouter);

    // Set SALT for hashing
    process.env.SALT = 'test-salt';

    const classroomId = 'classroom-123';
    const studentId = 'student-456';
    const question = 'What is algebra?';

    // Submit anonymous question
    const response = await request(app)
      .post('/api/student/anonymous-question')
      .send({
        studentId,
        classroomId,
        question
      })
      .expect(201);

    // Verify HTTP response
    expect(response.body.success).toBe(true);
    expect(response.body.questionId).toBe('test-question-id');

    // Verify Socket.io emission
    expect(mockTo).toHaveBeenCalledWith(`classroom:${classroomId}`);
    expect(mockEmit).toHaveBeenCalledWith('teacher:anonymous_question', expect.objectContaining({
      questionId: 'test-question-id',
      anonymousId: expect.stringMatching(/^anon-/),
      question,
      timestamp: expect.any(String)
    }));

    // Verify student ID is NOT included in notification
    const emittedData = mockEmit.mock.calls[0][1];
    expect(emittedData).not.toHaveProperty('studentId');
    expect(JSON.stringify(emittedData)).not.toContain(studentId);
  });

  it('should include all required fields in notification payload', async () => {
    const app = express();
    app.use(express.json());

    const mockEmit = vi.fn();
    const mockTo = vi.fn().mockReturnValue({ emit: mockEmit });
    const mockIo = { to: mockTo };

    app.set('io', mockIo);
    app.use('/api/student', studentRouter);

    process.env.SALT = 'test-salt';

    const classroomId = 'classroom-123';
    const studentId = 'student-456';
    const question = 'What is photosynthesis?';

    await request(app)
      .post('/api/student/anonymous-question')
      .send({ studentId, classroomId, question })
      .expect(201);

    // Verify all required fields per REQ-3.1.4
    expect(mockEmit).toHaveBeenCalledWith('teacher:anonymous_question', expect.objectContaining({
      questionId: expect.any(String),
      anonymousId: expect.stringMatching(/^anon-/),
      question,
      timestamp: expect.any(String)
    }));

    const emittedData = mockEmit.mock.calls[0][1];
    expect(emittedData).toHaveProperty('questionId');
    expect(emittedData).toHaveProperty('anonymousId');
    expect(emittedData).toHaveProperty('question');
    expect(emittedData).toHaveProperty('timestamp');
  });

  it('should send notification to correct classroom room', async () => {
    const app = express();
    app.use(express.json());

    const mockEmit = vi.fn();
    const mockTo = vi.fn().mockReturnValue({ emit: mockEmit });
    const mockIo = { to: mockTo };

    app.set('io', mockIo);
    app.use('/api/student', studentRouter);

    process.env.SALT = 'test-salt';

    const classroomId = 'classroom-456';

    await request(app)
      .post('/api/student/anonymous-question')
      .send({
        studentId: 'student-123',
        classroomId,
        question: 'Test question'
      })
      .expect(201);

    // Verify notification sent to correct classroom room
    expect(mockTo).toHaveBeenCalledWith(`classroom:${classroomId}`);
    expect(mockTo).toHaveBeenCalledTimes(1);
  });

  it('should NOT include actual student ID in notification', async () => {
    const app = express();
    app.use(express.json());

    const mockEmit = vi.fn();
    const mockTo = vi.fn().mockReturnValue({ emit: mockEmit });
    const mockIo = { to: mockTo };

    app.set('io', mockIo);
    app.use('/api/student', studentRouter);

    process.env.SALT = 'test-salt';

    const studentId = 'student-123';

    await request(app)
      .post('/api/student/anonymous-question')
      .send({
        studentId,
        classroomId: 'classroom-123',
        question: 'Test question'
      })
      .expect(201);

    const emittedData = mockEmit.mock.calls[0][1];

    // REQ-3.1.4 explicitly states: "Do NOT include actual student ID"
    expect(emittedData).not.toHaveProperty('studentId');
    expect(JSON.stringify(emittedData)).not.toContain(studentId);
  });

  it('should still return success even if Socket.io is unavailable', async () => {
    const app = express();
    app.use(express.json());

    // No Socket.io instance set
    app.set('io', null);

    app.use('/api/student', studentRouter);

    process.env.SALT = 'test-salt';

    const response = await request(app)
      .post('/api/student/anonymous-question')
      .send({
        studentId: 'student-123',
        classroomId: 'classroom-123',
        question: 'Test question'
      })
      .expect(201);

    // Should still succeed even without Socket.io
    expect(response.body.success).toBe(true);
    expect(response.body.questionId).toBeTruthy();
  });

  it('should use correct event name for teacher notifications', async () => {
    const app = express();
    app.use(express.json());

    const mockEmit = vi.fn();
    const mockTo = vi.fn().mockReturnValue({ emit: mockEmit });
    const mockIo = { to: mockTo };

    app.set('io', mockIo);
    app.use('/api/student', studentRouter);

    process.env.SALT = 'test-salt';

    await request(app)
      .post('/api/student/anonymous-question')
      .send({
        studentId: 'student-123',
        classroomId: 'classroom-123',
        question: 'Test question'
      })
      .expect(201);

    // Verify correct event name
    expect(mockEmit).toHaveBeenCalledWith('teacher:anonymous_question', expect.any(Object));
  });
});
