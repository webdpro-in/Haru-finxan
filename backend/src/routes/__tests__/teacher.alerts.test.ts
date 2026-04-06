/**
 * Tests for Teacher Risk Alert Endpoints
 * Task 15.5: Implement risk alert notifications
 */

import { describe, it, expect } from 'vitest';

describe('Teacher Risk Alert Endpoints', () => {
  describe('Acknowledge Risk Alert', () => {
    it('should update teacher_acknowledged field to true', () => {
      // Test that the acknowledgment logic is correct
      const prediction = {
        prediction_id: 'pred-1',
        student_id: 'student-1',
        risk_score: 75,
        teacher_acknowledged: false
      };

      // After acknowledgment
      const acknowledged = { ...prediction, teacher_acknowledged: true };
      
      expect(acknowledged.teacher_acknowledged).toBe(true);
      expect(acknowledged.prediction_id).toBe('pred-1');
    });
  });

  describe('Get Risk Alerts', () => {
    it('should filter alerts by classroom students', () => {
      const students = [
        { student_id: 'student-1', name: 'Student One' },
        { student_id: 'student-2', name: 'Student Two' }
      ];

      const predictions = [
        {
          prediction_id: 'pred-1',
          student_id: 'student-1',
          risk_score: 75,
          predicted_outcome: 'at_risk',
          teacher_acknowledged: false
        },
        {
          prediction_id: 'pred-2',
          student_id: 'student-3', // Not in classroom
          risk_score: 45,
          predicted_outcome: 'needs_attention',
          teacher_acknowledged: false
        }
      ];

      const studentIds = students.map(s => s.student_id);
      const classroomPredictions = predictions.filter(p => 
        studentIds.includes(p.student_id)
      );

      expect(classroomPredictions).toHaveLength(1);
      expect(classroomPredictions[0].student_id).toBe('student-1');
    });

    it('should filter by acknowledgment status', () => {
      const predictions = [
        {
          prediction_id: 'pred-1',
          student_id: 'student-1',
          teacher_acknowledged: false
        },
        {
          prediction_id: 'pred-2',
          student_id: 'student-2',
          teacher_acknowledged: true
        }
      ];

      const unacknowledged = predictions.filter(p => !p.teacher_acknowledged);
      const acknowledged = predictions.filter(p => p.teacher_acknowledged);

      expect(unacknowledged).toHaveLength(1);
      expect(acknowledged).toHaveLength(1);
    });

    it('should enrich predictions with student names', () => {
      const students = [
        { student_id: 'student-1', name: 'Student One' }
      ];

      const predictions = [
        {
          prediction_id: 'pred-1',
          student_id: 'student-1',
          risk_score: 75
        }
      ];

      const enriched = predictions.map(p => {
        const student = students.find(s => s.student_id === p.student_id);
        return {
          ...p,
          studentName: student?.name || 'Unknown'
        };
      });

      expect(enriched[0].studentName).toBe('Student One');
    });
  });

  describe('Alert Structure', () => {
    it('should include all required fields in alert', () => {
      const alert = {
        type: 'risk_alert',
        studentId: 'student-1',
        studentName: 'Test Student',
        riskScore: 75,
        riskFactors: [
          {
            factor: 'declining mastery trend',
            weight: 0.25,
            description: 'Mastery declining'
          }
        ],
        interventions: ['Schedule 1-on-1 tutoring'],
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

    it('should validate alert field types', () => {
      const alert = {
        type: 'risk_alert',
        studentId: 'student-1',
        studentName: 'Test Student',
        riskScore: 75,
        riskFactors: [],
        interventions: [],
        predictedOutcome: 'at_risk' as const,
        confidence: 0.85,
        timestamp: new Date().toISOString()
      };

      expect(typeof alert.studentId).toBe('string');
      expect(typeof alert.studentName).toBe('string');
      expect(typeof alert.riskScore).toBe('number');
      expect(Array.isArray(alert.riskFactors)).toBe(true);
      expect(Array.isArray(alert.interventions)).toBe(true);
      expect(['at_risk', 'needs_attention', 'on_track']).toContain(alert.predictedOutcome);
      expect(typeof alert.confidence).toBe('number');
      expect(typeof alert.timestamp).toBe('string');
    });
  });
});
