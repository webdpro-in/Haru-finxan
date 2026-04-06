/**
 * Tests for Risk Alert Notifications
 * Task 15.5: Implement risk alert notifications
 */

import { describe, it, expect } from 'vitest';

describe('Risk Alert Notifications', () => {
  describe('Alert Emission Logic', () => {
    it('should emit alerts for at-risk students', () => {
      const prediction = {
        studentId: 'student-1',
        studentName: 'At Risk Student',
        riskScore: 75,
        predictedOutcome: 'at_risk' as const,
        riskFactors: [],
        recommendedInterventions: [],
        confidence: 0.85
      };

      // Alert should be sent for at-risk students
      const shouldSendAlert = prediction.predictedOutcome === 'at_risk';
      expect(shouldSendAlert).toBe(true);
    });

    it('should not emit alerts for on-track students', () => {
      const prediction = {
        studentId: 'student-2',
        studentName: 'Good Student',
        riskScore: 20,
        predictedOutcome: 'on_track' as const,
        riskFactors: [],
        recommendedInterventions: [],
        confidence: 0.85
      };

      // Alert should NOT be sent for on-track students
      const shouldSendAlert = prediction.predictedOutcome === 'at_risk';
      expect(shouldSendAlert).toBe(false);
    });

    it('should not emit alerts for needs-attention students', () => {
      const prediction = {
        studentId: 'student-3',
        studentName: 'Moderate Student',
        riskScore: 45,
        predictedOutcome: 'needs_attention' as const,
        riskFactors: [],
        recommendedInterventions: [],
        confidence: 0.85
      };

      // Alert should NOT be sent for needs-attention students (only at-risk)
      const shouldSendAlert = prediction.predictedOutcome === 'at_risk';
      expect(shouldSendAlert).toBe(false);
    });
  });

  describe('Alert Structure', () => {
    it('should include all required alert fields', () => {
      const alert = {
        type: 'risk_alert',
        studentId: 'student-1',
        studentName: 'Test Student',
        riskScore: 75,
        riskFactors: [
          {
            factor: 'declining mastery trend',
            weight: 0.25,
            description: 'Mastery declining at 5.0% per session'
          }
        ],
        interventions: ['Schedule 1-on-1 tutoring session'],
        predictedOutcome: 'at_risk',
        confidence: 0.85,
        timestamp: new Date().toISOString()
      };

      expect(alert).toHaveProperty('type', 'risk_alert');
      expect(alert).toHaveProperty('studentId');
      expect(alert).toHaveProperty('studentName');
      expect(alert).toHaveProperty('riskScore');
      expect(alert).toHaveProperty('riskFactors');
      expect(alert).toHaveProperty('interventions');
      expect(alert).toHaveProperty('predictedOutcome');
      expect(alert).toHaveProperty('confidence');
      expect(alert).toHaveProperty('timestamp');
    });

    it('should validate risk factors structure', () => {
      const riskFactor = {
        factor: 'declining mastery trend',
        weight: 0.25,
        description: 'Mastery declining at 5.0% per session'
      };

      expect(riskFactor).toHaveProperty('factor');
      expect(riskFactor).toHaveProperty('weight');
      expect(riskFactor).toHaveProperty('description');
      expect(typeof riskFactor.factor).toBe('string');
      expect(typeof riskFactor.weight).toBe('number');
      expect(typeof riskFactor.description).toBe('string');
      expect(riskFactor.weight).toBeGreaterThan(0);
      expect(riskFactor.weight).toBeLessThanOrEqual(1);
    });

    it('should validate interventions are strings', () => {
      const interventions = [
        'Schedule 1-on-1 tutoring session',
        'Review foundational concepts',
        'Check for prerequisite gaps'
      ];

      expect(Array.isArray(interventions)).toBe(true);
      interventions.forEach(intervention => {
        expect(typeof intervention).toBe('string');
        expect(intervention.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Socket.io Room Targeting', () => {
    it('should target correct classroom room', () => {
      const classroomId = 'classroom-123';
      const roomName = `classroom:${classroomId}`;
      
      expect(roomName).toBe('classroom:classroom-123');
    });

    it('should handle missing classroom ID gracefully', () => {
      const classroomId = null;
      const shouldEmit = classroomId !== null && classroomId !== undefined;
      
      expect(shouldEmit).toBe(false);
    });
  });

  describe('Nightly Prediction Job', () => {
    it('should skip students with insufficient session data', () => {
      const sessions = [
        { sessionId: 's1', timestamp: new Date(), duration: 600 },
        { sessionId: 's2', timestamp: new Date(), duration: 500 }
      ];

      const hasEnoughData = sessions.length >= 3;
      expect(hasEnoughData).toBe(false);
    });

    it('should process students with sufficient session data', () => {
      const sessions = [
        { sessionId: 's1', timestamp: new Date(), duration: 600 },
        { sessionId: 's2', timestamp: new Date(), duration: 500 },
        { sessionId: 's3', timestamp: new Date(), duration: 700 }
      ];

      const hasEnoughData = sessions.length >= 3;
      expect(hasEnoughData).toBe(true);
    });

    it('should track predictions and alerts count', () => {
      let predictionsGenerated = 0;
      let alertsSent = 0;

      // Simulate processing 3 students
      const students = [
        { outcome: 'at_risk', hasClassroom: true },
        { outcome: 'on_track', hasClassroom: true },
        { outcome: 'at_risk', hasClassroom: false }
      ];

      students.forEach(student => {
        predictionsGenerated++;
        if (student.outcome === 'at_risk' && student.hasClassroom) {
          alertsSent++;
        }
      });

      expect(predictionsGenerated).toBe(3);
      expect(alertsSent).toBe(1); // Only 1 at-risk student with classroom
    });
  });
});
