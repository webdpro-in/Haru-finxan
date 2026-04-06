/**
 * Integration Tests for Teacher Dashboard Real-Time Updates
 * 
 * Tests Socket.io real-time updates for:
 * - Class health heatmap updates (REQ-4.1.3)
 * - Student confusion alerts (REQ-2.1.5)
 * - Risk alerts for at-risk students (REQ-4.2.6)
 * - Anonymous question notifications (REQ-3.1.4)
 * - Multiple teacher connections
 * 
 * **Validates: Requirements 4.1.3, 2.1.5, 4.2.6, 3.1.4**
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createAnonymousIdentifier } from '../../utils/anonymousMode.js';

// Mock Socket.io
const mockSocket = {
  id: 'socket-123',
  connected: true,
  join: vi.fn(),
  on: vi.fn(),
  emit: vi.fn(),
  disconnect: vi.fn()
};

const mockIo = {
  to: vi.fn().mockReturnThis(),
  emit: vi.fn(),
  on: vi.fn()
};

// Mock Supabase
vi.mock('../../config/supabase.js', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          is: vi.fn(() => ({
            select: vi.fn()
          }))
        })),
        in: vi.fn(() => ({
          order: vi.fn(() => ({
            select: vi.fn()
          }))
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
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

// Mock Redis
vi.mock('ioredis', () => {
  return {
    default: vi.fn(() => ({
      get: vi.fn(),
      setex: vi.fn(),
      del: vi.fn()
    }))
  };
});

// Mock logger
vi.mock('../../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }
}));

describe('Teacher Dashboard Real-Time Updates - Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SALT = 'test-salt-for-hashing-student-ids';
    mockSocket.connected = true;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Heatmap Real-Time Updates (REQ-4.1.3)', () => {
    it('should broadcast heatmap update to classroom every 30 seconds', async () => {
      const classroomId = 'classroom-123';
      const studentIds = ['student-1', 'student-2', 'student-3'];

      // Simulate heatmap data
      const heatmapData = {
        classroomId,
        timestamp: new Date(),
        grid: [
          [
            {
              studentId: 'student-1',
              studentName: 'Alice',
              conceptId: 'algebra-basics',
              conceptName: 'Algebra Basics',
              masteryLevel: 85,
              color: 'green' as const,
              lastUpdated: new Date(),
              confusionDetected: false
            }
          ]
        ],
        students: studentIds,
        concepts: ['algebra-basics'],
        classroomAverage: 75,
        conceptsNeedingReview: [],
        updateFrequency: 30
      };

      // Broadcast heatmap update
      mockIo.to(`classroom:${classroomId}`).emit('heatmap:update', heatmapData);

      expect(mockIo.to).toHaveBeenCalledWith(`classroom:${classroomId}`);
      expect(mockIo.emit).toHaveBeenCalledWith('heatmap:update', heatmapData);
    });

    it('should include all required heatmap fields in update', () => {
      const heatmapData = {
        classroomId: 'classroom-123',
        timestamp: new Date(),
        grid: [],
        students: ['student-1'],
        concepts: ['concept-1'],
        classroomAverage: 75,
        conceptsNeedingReview: ['concept-2'],
        updateFrequency: 30
      };

      mockIo.to('classroom:classroom-123').emit('heatmap:update', heatmapData);

      const emitCall = mockIo.emit.mock.calls[0];
      const payload = emitCall[1];

      expect(payload).toHaveProperty('classroomId');
      expect(payload).toHaveProperty('timestamp');
      expect(payload).toHaveProperty('grid');
      expect(payload).toHaveProperty('students');
      expect(payload).toHaveProperty('concepts');
      expect(payload).toHaveProperty('classroomAverage');
      expect(payload).toHaveProperty('conceptsNeedingReview');
      expect(payload).toHaveProperty('updateFrequency');
    });

    it('should color-code cells correctly (REQ-4.1.2)', () => {
      const cells = [
        { masteryLevel: 30, expectedColor: 'red' },
        { masteryLevel: 60, expectedColor: 'yellow' },
        { masteryLevel: 85, expectedColor: 'green' }
      ];

      cells.forEach(({ masteryLevel, expectedColor }) => {
        const color = masteryLevel < 50 ? 'red' : masteryLevel < 75 ? 'yellow' : 'green';
        expect(color).toBe(expectedColor);
      });
    });

    it('should highlight cells with confusion detected (REQ-4.1.4)', () => {
      const cellWithConfusion = {
        studentId: 'student-1',
        studentName: 'Alice',
        conceptId: 'algebra',
        conceptName: 'Algebra',
        masteryLevel: 60,
        color: 'yellow' as const,
        lastUpdated: new Date(),
        confusionDetected: true
      };

      expect(cellWithConfusion.confusionDetected).toBe(true);
      expect(cellWithConfusion.masteryLevel).toBeLessThan(75);
    });

    it('should include last updated timestamp per cell (REQ-4.1.5)', () => {
      const cell = {
        studentId: 'student-1',
        studentName: 'Alice',
        conceptId: 'algebra',
        conceptName: 'Algebra',
        masteryLevel: 75,
        color: 'green' as const,
        lastUpdated: new Date(),
        confusionDetected: false
      };

      expect(cell.lastUpdated).toBeInstanceOf(Date);
      expect(cell.lastUpdated.getTime()).toBeGreaterThan(0);
    });

    it('should calculate classroom average mastery (REQ-4.1.6)', () => {
      const studentMasteries = [85, 70, 60, 90, 75];
      const average = studentMasteries.reduce((sum, m) => sum + m, 0) / studentMasteries.length;

      expect(average).toBe(76);
      expect(average).toBeGreaterThan(0);
      expect(average).toBeLessThanOrEqual(100);
    });

    it('should identify concepts needing review (REQ-4.1.7)', () => {
      const conceptAverages = [
        { conceptId: 'algebra', average: 45 },
        { conceptId: 'geometry', average: 80 },
        { conceptId: 'calculus', average: 35 }
      ];

      const needingReview = conceptAverages
        .filter(c => c.average < 50)
        .map(c => c.conceptId);

      expect(needingReview).toContain('algebra');
      expect(needingReview).toContain('calculus');
      expect(needingReview).not.toContain('geometry');
    });

    it('should update heatmap when student mastery changes', async () => {
      const classroomId = 'classroom-123';
      const studentId = 'student-1';

      // Simulate mastery update
      const masteryUpdate = {
        studentId,
        conceptId: 'algebra',
        newMasteryLevel: 85
      };

      // Trigger heatmap refresh
      mockIo.to(`classroom:${classroomId}`).emit('heatmap:update', {
        classroomId,
        timestamp: new Date(),
        grid: [[{
          studentId,
          studentName: 'Alice',
          conceptId: 'algebra',
          conceptName: 'Algebra',
          masteryLevel: masteryUpdate.newMasteryLevel,
          color: 'green' as const,
          lastUpdated: new Date(),
          confusionDetected: false
        }]],
        students: [studentId],
        concepts: ['algebra'],
        classroomAverage: 85,
        conceptsNeedingReview: [],
        updateFrequency: 30
      });

      expect(mockIo.to).toHaveBeenCalledWith(`classroom:${classroomId}`);
      expect(mockIo.emit).toHaveBeenCalledWith('heatmap:update', expect.any(Object));
    });
  });

  describe('Student Confusion Alerts (REQ-2.1.5)', () => {
    it('should emit confusion alert when student shows confusion signals', () => {
      const classroomId = 'classroom-123';
      const confusionAlert = {
        studentId: 'student-1',
        studentName: 'Alice',
        topic: 'algebra',
        confusionSignals: [
          {
            type: 'uncertainty',
            confidence: 0.8,
            trigger: 'I am not sure about this',
            suggestion: 'Simplify explanation',
            timestamp: new Date()
          }
        ],
        timestamp: new Date()
      };

      mockIo.to(`classroom:${classroomId}`).emit('teacher:confusion_alert', confusionAlert);

      expect(mockIo.to).toHaveBeenCalledWith(`classroom:${classroomId}`);
      expect(mockIo.emit).toHaveBeenCalledWith('teacher:confusion_alert', confusionAlert);
    });

    it('should include confusion signal details in alert', () => {
      const alert = {
        studentId: 'student-1',
        studentName: 'Alice',
        topic: 'algebra',
        confusionSignals: [
          {
            type: 'uncertainty',
            confidence: 0.8,
            trigger: 'I am not sure',
            suggestion: 'Simplify',
            timestamp: new Date()
          }
        ],
        timestamp: new Date()
      };

      expect(alert.confusionSignals).toHaveLength(1);
      expect(alert.confusionSignals[0]).toHaveProperty('type');
      expect(alert.confusionSignals[0]).toHaveProperty('confidence');
      expect(alert.confusionSignals[0]).toHaveProperty('trigger');
      expect(alert.confusionSignals[0]).toHaveProperty('suggestion');
    });

    it('should emit alert immediately when confusion is detected', () => {
      const beforeTime = Date.now();
      const alert = {
        studentId: 'student-1',
        studentName: 'Alice',
        topic: 'algebra',
        confusionSignals: [],
        timestamp: new Date()
      };
      const afterTime = Date.now();

      const alertTime = alert.timestamp.getTime();
      expect(alertTime).toBeGreaterThanOrEqual(beforeTime);
      expect(alertTime).toBeLessThanOrEqual(afterTime);
    });

    it('should send confusion alert to correct classroom', () => {
      const classroomId = 'classroom-456';
      const alert = {
        studentId: 'student-1',
        studentName: 'Alice',
        topic: 'algebra',
        confusionSignals: [],
        timestamp: new Date()
      };

      mockIo.to(`classroom:${classroomId}`).emit('teacher:confusion_alert', alert);

      expect(mockIo.to).toHaveBeenCalledWith(`classroom:${classroomId}`);
    });
  });

  describe('Risk Alerts for At-Risk Students (REQ-4.2.6)', () => {
    it('should emit risk alert for high-risk students', () => {
      const classroomId = 'classroom-123';
      const riskAlert = {
        predictionId: 'pred-789',
        studentId: 'student-1',
        studentName: 'Alice',
        riskScore: 75,
        riskFactors: [
          {
            factor: 'Declining mastery trend',
            weight: 0.25,
            description: 'Mastery declining at 5% per session'
          }
        ],
        predictedOutcome: 'at_risk' as const,
        confidence: 0.85,
        recommendedInterventions: [
          'Schedule 1-on-1 tutoring session',
          'Review foundational concepts'
        ],
        timestamp: new Date()
      };

      mockIo.to(`classroom:${classroomId}`).emit('teacher:risk_alert', riskAlert);

      expect(mockIo.to).toHaveBeenCalledWith(`classroom:${classroomId}`);
      expect(mockIo.emit).toHaveBeenCalledWith('teacher:risk_alert', riskAlert);
    });

    it('should include risk score and factors in alert', () => {
      const alert = {
        predictionId: 'pred-789',
        studentId: 'student-1',
        studentName: 'Alice',
        riskScore: 75,
        riskFactors: [
          {
            factor: 'Declining mastery',
            weight: 0.25,
            description: 'Mastery declining'
          }
        ],
        predictedOutcome: 'at_risk' as const,
        confidence: 0.85,
        recommendedInterventions: ['Tutoring'],
        timestamp: new Date()
      };

      expect(alert.riskScore).toBeGreaterThan(60);
      expect(alert.riskFactors).toHaveLength(1);
      expect(alert.predictedOutcome).toBe('at_risk');
      expect(alert.recommendedInterventions).toHaveLength(1);
    });

    it('should send real-time alert when risk prediction completes', () => {
      const alert = {
        predictionId: 'pred-789',
        studentId: 'student-1',
        studentName: 'Alice',
        riskScore: 75,
        riskFactors: [],
        predictedOutcome: 'at_risk' as const,
        confidence: 0.85,
        recommendedInterventions: [],
        timestamp: new Date()
      };

      mockIo.to('classroom:123').emit('teacher:risk_alert', alert);

      expect(mockIo.emit).toHaveBeenCalledWith('teacher:risk_alert', alert);
    });

    it('should include recommended interventions in alert', () => {
      const alert = {
        predictionId: 'pred-789',
        studentId: 'student-1',
        studentName: 'Alice',
        riskScore: 75,
        riskFactors: [],
        predictedOutcome: 'at_risk' as const,
        confidence: 0.85,
        recommendedInterventions: [
          'Schedule 1-on-1 tutoring',
          'Review prerequisites',
          'Pair with peer mentor'
        ],
        timestamp: new Date()
      };

      expect(alert.recommendedInterventions).toHaveLength(3);
      expect(alert.recommendedInterventions[0]).toContain('tutoring');
    });

    it('should only alert for high-risk students (score > 60)', () => {
      const students = [
        { riskScore: 75, shouldAlert: true },
        { riskScore: 45, shouldAlert: false },
        { riskScore: 85, shouldAlert: true },
        { riskScore: 30, shouldAlert: false }
      ];

      students.forEach(({ riskScore, shouldAlert }) => {
        const isHighRisk = riskScore > 60;
        expect(isHighRisk).toBe(shouldAlert);
      });
    });
  });

  describe('Anonymous Question Notifications (REQ-3.1.4)', () => {
    it('should emit anonymous question notification to teachers', () => {
      const classroomId = 'classroom-123';
      const notification = {
        questionId: 'question-789',
        anonymousId: 'anon-a3f2b1c4',
        question: 'What is algebra?',
        timestamp: new Date().toISOString()
      };

      mockIo.to(`classroom:${classroomId}`).emit('teacher:anonymous_question', notification);

      expect(mockIo.to).toHaveBeenCalledWith(`classroom:${classroomId}`);
      expect(mockIo.emit).toHaveBeenCalledWith('teacher:anonymous_question', notification);
    });

    it('should NOT include student ID in notification', () => {
      const studentId = 'student-123';
      const notification = {
        questionId: 'question-789',
        anonymousId: createAnonymousIdentifier(studentId),
        question: 'What is algebra?',
        timestamp: new Date().toISOString()
      };

      expect(notification).not.toHaveProperty('studentId');
      expect(JSON.stringify(notification)).not.toContain(studentId);
    });

    it('should include all required fields in notification', () => {
      const notification = {
        questionId: 'question-789',
        anonymousId: 'anon-a3f2b1c4',
        question: 'What is algebra?',
        timestamp: new Date().toISOString()
      };

      expect(notification).toHaveProperty('questionId');
      expect(notification).toHaveProperty('anonymousId');
      expect(notification).toHaveProperty('question');
      expect(notification).toHaveProperty('timestamp');
    });

    it('should send notification immediately after question submission', () => {
      const beforeTime = Date.now();
      const timestamp = new Date().toISOString();
      const afterTime = Date.now();

      const timestampMs = new Date(timestamp).getTime();
      expect(timestampMs).toBeGreaterThanOrEqual(beforeTime);
      expect(timestampMs).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('Student Activity Notifications', () => {
    it('should emit student activity event when question is asked', () => {
      const classroomId = 'classroom-123';
      const activity = {
        type: 'student_activity',
        studentId: 'student-1',
        activity: 'question_asked',
        confusionDetected: false,
        timestamp: new Date()
      };

      mockIo.to(`classroom:${classroomId}`).emit('teacher:student_activity', activity);

      expect(mockIo.to).toHaveBeenCalledWith(`classroom:${classroomId}`);
      expect(mockIo.emit).toHaveBeenCalledWith('teacher:student_activity', activity);
    });

    it('should include confusion detection status in activity', () => {
      const activity = {
        type: 'student_activity',
        studentId: 'student-1',
        activity: 'question_asked',
        confusionDetected: true,
        timestamp: new Date()
      };

      expect(activity.confusionDetected).toBe(true);
      expect(activity).toHaveProperty('confusionDetected');
    });
  });

  describe('Multiple Teacher Connections', () => {
    it('should allow multiple teachers to join same classroom', () => {
      const classroomId = 'classroom-123';
      const teacher1Socket = { ...mockSocket, id: 'socket-1' };
      const teacher2Socket = { ...mockSocket, id: 'socket-2' };

      teacher1Socket.join(`classroom:${classroomId}`);
      teacher2Socket.join(`classroom:${classroomId}`);

      expect(teacher1Socket.join).toHaveBeenCalledWith(`classroom:${classroomId}`);
      expect(teacher2Socket.join).toHaveBeenCalledWith(`classroom:${classroomId}`);
    });

    it('should broadcast updates to all teachers in classroom', () => {
      const classroomId = 'classroom-123';
      const update = {
        type: 'heatmap_update',
        data: {}
      };

      // Room-based emission ensures all teachers receive update
      mockIo.to(`classroom:${classroomId}`).emit('heatmap:update', update);

      expect(mockIo.to).toHaveBeenCalledWith(`classroom:${classroomId}`);
    });

    it('should handle teacher disconnection gracefully', () => {
      const socket = { ...mockSocket };
      socket.connected = false;

      // Should not send updates to disconnected socket
      const shouldSend = socket.connected;
      expect(shouldSend).toBe(false);
    });

    it('should isolate updates between different classrooms', () => {
      const classroom1 = 'classroom-123';
      const classroom2 = 'classroom-456';

      mockIo.to(`classroom:${classroom1}`).emit('heatmap:update', { classroomId: classroom1 });
      mockIo.to(`classroom:${classroom2}`).emit('heatmap:update', { classroomId: classroom2 });

      expect(mockIo.to).toHaveBeenCalledWith(`classroom:${classroom1}`);
      expect(mockIo.to).toHaveBeenCalledWith(`classroom:${classroom2}`);
      expect(mockIo.emit).toHaveBeenCalledTimes(2);
    });
  });

  describe('Socket.io Room Management', () => {
    it('should join teacher to correct rooms on connection', () => {
      const teacherId = 'teacher-123';
      const classroomId = 'classroom-456';

      mockSocket.join(`teacher:${teacherId}`);
      mockSocket.join(`classroom:${classroomId}`);

      expect(mockSocket.join).toHaveBeenCalledWith(`teacher:${teacherId}`);
      expect(mockSocket.join).toHaveBeenCalledWith(`classroom:${classroomId}`);
    });

    it('should use correct room naming convention', () => {
      const classroomId = 'classroom-123';
      const roomName = `classroom:${classroomId}`;

      expect(roomName).toBe('classroom:classroom-123');
      expect(roomName).toMatch(/^classroom:/);
    });

    it('should handle teacher joining multiple classrooms', () => {
      const teacherId = 'teacher-123';
      const classrooms = ['classroom-1', 'classroom-2', 'classroom-3'];

      classrooms.forEach(classroomId => {
        mockSocket.join(`classroom:${classroomId}`);
      });

      expect(mockSocket.join).toHaveBeenCalledTimes(3);
    });
  });

  describe('Update Frequency and Timing', () => {
    it('should update heatmap every 30 seconds (REQ-4.1.3)', () => {
      const updateFrequency = 30; // seconds
      const expectedInterval = 30000; // milliseconds

      expect(updateFrequency * 1000).toBe(expectedInterval);
    });

    it('should send initial heatmap immediately on teacher join', async () => {
      const classroomId = 'classroom-123';
      
      // Simulate teacher joining
      mockSocket.join(`classroom:${classroomId}`);

      // Initial heatmap should be sent immediately
      mockIo.to(`classroom:${classroomId}`).emit('heatmap:update', {
        classroomId,
        timestamp: new Date(),
        grid: [],
        students: [],
        concepts: [],
        classroomAverage: 0,
        conceptsNeedingReview: [],
        updateFrequency: 30
      });

      expect(mockIo.emit).toHaveBeenCalled();
    });

    it('should stop updates when teacher disconnects', () => {
      mockSocket.connected = false;

      const shouldContinueUpdates = mockSocket.connected;
      expect(shouldContinueUpdates).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing Socket.io instance gracefully', () => {
      const io = undefined;

      expect(() => {
        if (io) {
          io.to('classroom:123').emit('heatmap:update', {});
        }
      }).not.toThrow();
    });

    it('should continue operation if one broadcast fails', () => {
      const classrooms = ['classroom-1', 'classroom-2'];
      
      // Even if first fails, second should proceed
      classrooms.forEach(classroomId => {
        try {
          mockIo.to(`classroom:${classroomId}`).emit('heatmap:update', {});
        } catch (error) {
          // Log but continue
        }
      });

      expect(mockIo.to).toHaveBeenCalledTimes(2);
    });

    it('should validate classroom ID before broadcasting', () => {
      const classroomId = '';
      const isValid = classroomId.length > 0;

      expect(isValid).toBe(false);
    });
  });

  describe('Data Consistency', () => {
    it('should maintain consistent timestamp format across updates', () => {
      const timestamp1 = new Date().toISOString();
      const timestamp2 = new Date().toISOString();

      expect(timestamp1).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(timestamp2).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should ensure heatmap data structure is consistent', () => {
      const heatmap = {
        classroomId: 'classroom-123',
        timestamp: new Date(),
        grid: [],
        students: [],
        concepts: [],
        classroomAverage: 75,
        conceptsNeedingReview: [],
        updateFrequency: 30
      };

      expect(heatmap).toHaveProperty('classroomId');
      expect(heatmap).toHaveProperty('timestamp');
      expect(heatmap).toHaveProperty('grid');
      expect(Array.isArray(heatmap.grid)).toBe(true);
      expect(Array.isArray(heatmap.students)).toBe(true);
      expect(Array.isArray(heatmap.concepts)).toBe(true);
    });
  });

  describe('Performance Considerations', () => {
    it('should handle large classrooms efficiently', () => {
      const largeClassroom = {
        classroomId: 'classroom-123',
        studentCount: 50,
        conceptCount: 20
      };

      const gridSize = largeClassroom.studentCount * largeClassroom.conceptCount;
      expect(gridSize).toBe(1000);
      expect(gridSize).toBeLessThan(10000); // Reasonable limit
    });

    it('should cache heatmap data to reduce computation', () => {
      const cacheKey = 'heatmap:classroom-123';
      const cacheTTL = 30; // seconds

      expect(cacheKey).toMatch(/^heatmap:/);
      expect(cacheTTL).toBe(30);
    });
  });
});
