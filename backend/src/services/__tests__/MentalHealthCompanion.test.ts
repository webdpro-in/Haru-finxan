/**
 * Tests for Mental Health Companion Service
 * Task 24.1: Implement daily mood check-in
 * 
 * Tests cover:
 * - REQ-3.3.1: Daily mood check-in prompts
 * - REQ-3.3.2: Mood options (happy, neutral, sad, anxious, frustrated)
 * - REQ-3.3.3: Energy level recording (1-5)
 * - REQ-3.3.4: Empathetic responses based on mood
 * - REQ-3.3.5: Mental health risk detection (7+ negative moods in 10 check-ins)
 * - REQ-3.3.6: Alert school counselor when risk detected
 * - REQ-3.3.7: Student consent for mood data sharing
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MentalHealthCompanion } from '../MentalHealthCompanion.js';
import type { MoodOption } from '../MentalHealthCompanion.js';
import { supabase } from '../../config/supabase.js';

// Mock Supabase
vi.mock('../../config/supabase.js', () => ({
  supabase: {
    from: vi.fn()
  }
}));

describe('MentalHealthCompanion', () => {
  let mockFrom: any;
  let mockSelect: any;
  let mockInsert: any;
  let mockUpdate: any;
  let mockEq: any;
  let mockOrder: any;
  let mockLimit: any;
  let mockIs: any;
  let mockSingle: any;

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    
    // Setup mock chain
    mockSingle = vi.fn().mockReturnValue({ data: null, error: { code: 'PGRST116' } });
    mockIs = vi.fn().mockReturnValue({ single: mockSingle });
    mockLimit = vi.fn().mockReturnValue({ data: [], error: null });
    mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
    mockEq = vi.fn().mockReturnValue({ order: mockOrder, is: mockIs });
    mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    mockInsert = vi.fn().mockReturnValue({ error: null });
    mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    mockFrom = vi.fn().mockReturnValue({
      insert: mockInsert,
      select: mockSelect,
      update: mockUpdate
    });
    
    (supabase.from as any) = mockFrom;
  });

  describe('dailyMoodCheckIn', () => {
    it('should return mood check-in prompt with question', async () => {
      const result = await MentalHealthCompanion.dailyMoodCheckIn('student-123');
      
      expect(result).toBeDefined();
      expect(result.question).toBe("How are you feeling today?");
    });

    it('should return all 5 mood options with emojis', async () => {
      const result = await MentalHealthCompanion.dailyMoodCheckIn('student-123');
      
      expect(result.options).toHaveLength(5);
      expect(result.options).toContain('😊 Happy');
      expect(result.options).toContain('😐 Neutral');
      expect(result.options).toContain('😔 Sad');
      expect(result.options).toContain('😰 Anxious');
      expect(result.options).toContain('😤 Frustrated');
    });

    it('should return consistent prompt for different students', async () => {
      const result1 = await MentalHealthCompanion.dailyMoodCheckIn('student-1');
      const result2 = await MentalHealthCompanion.dailyMoodCheckIn('student-2');
      
      expect(result1.question).toBe(result2.question);
      expect(result1.options).toEqual(result2.options);
    });

    it('should return mood options in correct order', async () => {
      const result = await MentalHealthCompanion.dailyMoodCheckIn('student-123');
      
      expect(result.options[0]).toBe('😊 Happy');
      expect(result.options[1]).toBe('😐 Neutral');
      expect(result.options[2]).toBe('😔 Sad');
      expect(result.options[3]).toBe('😰 Anxious');
      expect(result.options[4]).toBe('😤 Frustrated');
    });
  });

  describe('recordMoodCheckIn', () => {
    it('should return empathetic response for happy mood', async () => {
      const response = await MentalHealthCompanion.recordMoodCheckIn(
        'student-123',
        'happy',
        5
      );
      
      expect(response).toContain('wonderful');
      expect(response).toContain('positive energy');
    });

    it('should return empathetic response for neutral mood', async () => {
      const response = await MentalHealthCompanion.recordMoodCheckIn(
        'student-123',
        'neutral',
        3
      );
      
      expect(response).toContain('Thanks for sharing');
      expect(response).toContain('good learning day');
    });

    it('should return empathetic response for sad mood', async () => {
      const response = await MentalHealthCompanion.recordMoodCheckIn(
        'student-123',
        'sad',
        2
      );
      
      expect(response).toContain('sorry');
      expect(response).toContain('tough days');
    });

    it('should return empathetic response for anxious mood', async () => {
      const response = await MentalHealthCompanion.recordMoodCheckIn(
        'student-123',
        'anxious',
        2
      );
      
      expect(response).toContain('deep breath');
      expect(response).toContain('one step at a time');
    });

    it('should return empathetic response for frustrated mood', async () => {
      const response = await MentalHealthCompanion.recordMoodCheckIn(
        'student-123',
        'frustrated',
        3
      );
      
      expect(response).toContain('understand');
      expect(response).toContain('challenging');
      expect(response).toContain('together');
    });

    it('should accept energy level 1', async () => {
      await expect(
        MentalHealthCompanion.recordMoodCheckIn('student-123', 'neutral', 1)
      ).resolves.toBeDefined();
    });

    it('should accept energy level 5', async () => {
      await expect(
        MentalHealthCompanion.recordMoodCheckIn('student-123', 'happy', 5)
      ).resolves.toBeDefined();
    });

    it('should reject energy level 0', async () => {
      await expect(
        MentalHealthCompanion.recordMoodCheckIn('student-123', 'neutral', 0)
      ).rejects.toThrow('Energy level must be between 1 and 5');
    });

    it('should reject energy level 6', async () => {
      await expect(
        MentalHealthCompanion.recordMoodCheckIn('student-123', 'neutral', 6)
      ).rejects.toThrow('Energy level must be between 1 and 5');
    });

    it('should accept optional notes parameter', async () => {
      const response = await MentalHealthCompanion.recordMoodCheckIn(
        'student-123',
        'happy',
        5,
        'Had a great day at school!'
      );
      
      expect(response).toBeDefined();
    });

    it('should work without notes parameter', async () => {
      const response = await MentalHealthCompanion.recordMoodCheckIn(
        'student-123',
        'neutral',
        3
      );
      
      expect(response).toBeDefined();
    });
  });

  describe('detectMentalHealthRisk', () => {
    it('should return not at risk when less than 10 check-ins', async () => {
      // Mock less than 10 check-ins
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({ data: [], error: null })
            })
          })
        })
      });

      const risk = await MentalHealthCompanion.detectMentalHealthRisk('student-123');
      
      expect(risk.atRisk).toBe(false);
      expect(risk.reason).toBe('');
      expect(risk.recommendedAction).toBe('');
    });

    it('should return not at risk when no negative moods', async () => {
      // Mock 10 happy moods
      const mockData = Array(10).fill(null).map(() => ({
        mood: 'happy',
        timestamp: new Date().toISOString()
      }));

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({ data: mockData, error: null })
            })
          })
        })
      });

      const risk = await MentalHealthCompanion.detectMentalHealthRisk('student-123');
      
      expect(risk.atRisk).toBe(false);
    });

    it('should detect risk with 7 negative moods in 10 check-ins', async () => {
      // Mock 7 sad moods and 3 happy moods
      const mockData = [
        ...Array(7).fill(null).map(() => ({ mood: 'sad' })),
        ...Array(3).fill(null).map(() => ({ mood: 'happy' }))
      ];

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({ data: mockData, error: null })
            })
          })
        })
      });

      const risk = await MentalHealthCompanion.detectMentalHealthRisk('student-123');
      
      expect(risk.atRisk).toBe(true);
      expect(risk.reason).toBe('Persistent negative mood pattern detected');
      expect(risk.recommendedAction).toBe('Alert school counselor for check-in');
    });

    it('should detect risk with 8 negative moods in 10 check-ins', async () => {
      const mockData = [
        ...Array(8).fill(null).map(() => ({ mood: 'anxious' })),
        ...Array(2).fill(null).map(() => ({ mood: 'happy' }))
      ];

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({ data: mockData, error: null })
            })
          })
        })
      });

      const risk = await MentalHealthCompanion.detectMentalHealthRisk('student-123');
      
      expect(risk.atRisk).toBe(true);
    });

    it('should not detect risk with 6 negative moods in 10 check-ins', async () => {
      const mockData = [
        ...Array(6).fill(null).map(() => ({ mood: 'frustrated' })),
        ...Array(4).fill(null).map(() => ({ mood: 'happy' }))
      ];

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({ data: mockData, error: null })
            })
          })
        })
      });

      const risk = await MentalHealthCompanion.detectMentalHealthRisk('student-123');
      
      expect(risk.atRisk).toBe(false);
    });

    it('should count sad as negative mood', async () => {
      const mockData = [
        ...Array(7).fill(null).map(() => ({ mood: 'sad' })),
        ...Array(3).fill(null).map(() => ({ mood: 'neutral' }))
      ];

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({ data: mockData, error: null })
            })
          })
        })
      });

      const risk = await MentalHealthCompanion.detectMentalHealthRisk('student-123');
      
      expect(risk.atRisk).toBe(true);
    });

    it('should count anxious as negative mood', async () => {
      const mockData = [
        ...Array(7).fill(null).map(() => ({ mood: 'anxious' })),
        ...Array(3).fill(null).map(() => ({ mood: 'neutral' }))
      ];

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({ data: mockData, error: null })
            })
          })
        })
      });

      const risk = await MentalHealthCompanion.detectMentalHealthRisk('student-123');
      
      expect(risk.atRisk).toBe(true);
    });

    it('should count frustrated as negative mood', async () => {
      const mockData = [
        ...Array(7).fill(null).map(() => ({ mood: 'frustrated' })),
        ...Array(3).fill(null).map(() => ({ mood: 'neutral' }))
      ];

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({ data: mockData, error: null })
            })
          })
        })
      });

      const risk = await MentalHealthCompanion.detectMentalHealthRisk('student-123');
      
      expect(risk.atRisk).toBe(true);
    });

    it('should not count happy as negative mood', async () => {
      const mockData = Array(10).fill(null).map(() => ({ mood: 'happy' }));

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({ data: mockData, error: null })
            })
          })
        })
      });

      const risk = await MentalHealthCompanion.detectMentalHealthRisk('student-123');
      
      expect(risk.atRisk).toBe(false);
    });

    it('should not count neutral as negative mood', async () => {
      const mockData = Array(10).fill(null).map(() => ({ mood: 'neutral' }));

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({ data: mockData, error: null })
            })
          })
        })
      });

      const risk = await MentalHealthCompanion.detectMentalHealthRisk('student-123');
      
      expect(risk.atRisk).toBe(false);
    });

    it('should detect risk with mixed negative moods', async () => {
      const mockData = [
        { mood: 'sad' },
        { mood: 'anxious' },
        { mood: 'frustrated' },
        { mood: 'sad' },
        { mood: 'anxious' },
        { mood: 'frustrated' },
        { mood: 'sad' },
        { mood: 'happy' },
        { mood: 'neutral' },
        { mood: 'happy' }
      ];

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({ data: mockData, error: null })
            })
          })
        })
      });

      const risk = await MentalHealthCompanion.detectMentalHealthRisk('student-123');
      
      expect(risk.atRisk).toBe(true);
    });
  });

  describe('getMoodHistory', () => {
    it('should return empty array when no mood history', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({ data: [], error: null })
            })
          })
        })
      });

      const history = await MentalHealthCompanion.getMoodHistory('student-123');
      
      expect(history).toEqual([]);
    });

    it('should use default limit of 30', async () => {
      const limitSpy = vi.fn().mockReturnValue({ data: [], error: null });
      
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: limitSpy
            })
          })
        })
      });

      await MentalHealthCompanion.getMoodHistory('student-123');
      
      expect(limitSpy).toHaveBeenCalledWith(30);
    });

    it('should accept custom limit', async () => {
      const limitSpy = vi.fn().mockReturnValue({ data: [], error: null });
      
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: limitSpy
            })
          })
        })
      });

      await MentalHealthCompanion.getMoodHistory('student-123', 10);
      
      expect(limitSpy).toHaveBeenCalledWith(10);
    });
  });

  describe('hasConsentForMoodSharing', () => {
    it('should return false when no consent record exists', async () => {
      mockSingle.mockReturnValue({ data: null, error: { code: 'PGRST116' } });
      mockIs.mockReturnValue({ single: mockSingle });
      const mockEqChain = vi.fn().mockReturnValue({ is: mockIs });
      mockSelect.mockReturnValue({ 
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue(mockEqChain())
            })
          })
        })
      });
      mockFrom.mockReturnValue({ select: mockSelect });

      const hasConsent = await MentalHealthCompanion.hasConsentForMoodSharing('student-123');
      
      expect(hasConsent).toBe(false);
    });

    it('should return true when valid consent exists', async () => {
      mockSingle.mockReturnValue({ data: { consent_id: 'consent-123', granted: true }, error: null });
      mockIs.mockReturnValue({ single: mockSingle });
      const mockEqChain = vi.fn().mockReturnValue({ is: mockIs });
      mockSelect.mockReturnValue({ 
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue(mockEqChain())
            })
          })
        })
      });
      mockFrom.mockReturnValue({ select: mockSelect });

      const hasConsent = await MentalHealthCompanion.hasConsentForMoodSharing('student-123');
      
      expect(hasConsent).toBe(true);
    });

    it('should return false when consent is revoked', async () => {
      mockSingle.mockReturnValue({ data: null, error: { code: 'PGRST116' } });
      mockIs.mockReturnValue({ single: mockSingle });
      const mockEqChain = vi.fn().mockReturnValue({ is: mockIs });
      mockSelect.mockReturnValue({ 
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue(mockEqChain())
            })
          })
        })
      });
      mockFrom.mockReturnValue({ select: mockSelect });

      const hasConsent = await MentalHealthCompanion.hasConsentForMoodSharing('student-123');
      
      expect(hasConsent).toBe(false);
    });
  });

  describe('recordMoodSharingConsent', () => {
    it('should record granted consent', async () => {
      const consentId = await MentalHealthCompanion.recordMoodSharingConsent(
        'student-123',
        true
      );
      
      expect(consentId).toBeDefined();
      expect(typeof consentId).toBe('string');
    });

    it('should record denied consent', async () => {
      const consentId = await MentalHealthCompanion.recordMoodSharingConsent(
        'student-123',
        false
      );
      
      expect(consentId).toBeDefined();
      expect(typeof consentId).toBe('string');
    });

    it('should accept optional IP address', async () => {
      const consentId = await MentalHealthCompanion.recordMoodSharingConsent(
        'student-123',
        true,
        '192.168.1.1'
      );
      
      expect(consentId).toBeDefined();
    });

    it('should accept optional user agent', async () => {
      const consentId = await MentalHealthCompanion.recordMoodSharingConsent(
        'student-123',
        true,
        '192.168.1.1',
        'Mozilla/5.0'
      );
      
      expect(consentId).toBeDefined();
    });
  });

  describe('alertCounselor', () => {
    it('should create alert when student has consent', async () => {
      // Mock consent check to return true
      const consentMockEq = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                single: vi.fn().mockReturnValue({ 
                  data: { consent_id: 'consent-123', granted: true }, 
                  error: null 
                })
              })
            })
          })
        })
      });
      
      const consentMockSelect = vi.fn().mockReturnValue({ eq: consentMockEq });
      const alertMockInsert = vi.fn().mockReturnValue({ error: null });
      
      mockFrom.mockImplementation((table: string) => {
        if (table === 'consent_records') {
          return { select: consentMockSelect };
        }
        return { insert: alertMockInsert };
      });

      const risk = {
        atRisk: true,
        reason: 'Persistent negative mood pattern detected',
        recommendedAction: 'Alert school counselor for check-in'
      };

      const alertId = await MentalHealthCompanion.alertCounselor('student-123', risk);
      
      expect(alertId).toBeDefined();
      expect(typeof alertId).toBe('string');
      expect(alertMockInsert).toHaveBeenCalled();
    });

    it('should throw error when student has no consent', async () => {
      // Mock consent check to return false
      const consentMockEq = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                single: vi.fn().mockReturnValue({ 
                  data: null, 
                  error: { code: 'PGRST116' } 
                })
              })
            })
          })
        })
      });
      
      const consentMockSelect = vi.fn().mockReturnValue({ eq: consentMockEq });
      mockFrom.mockReturnValue({ select: consentMockSelect });

      const risk = {
        atRisk: true,
        reason: 'Persistent negative mood pattern detected',
        recommendedAction: 'Alert school counselor for check-in'
      };

      await expect(
        MentalHealthCompanion.alertCounselor('student-123', risk)
      ).rejects.toThrow('Cannot alert counselor: Student has not given consent for mood data sharing');
    });

    it('should include risk information in alert', async () => {
      const insertSpy = vi.fn().mockReturnValue({ error: null });
      
      // Mock consent check to return true
      const consentMockEq = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                single: vi.fn().mockReturnValue({ 
                  data: { consent_id: 'consent-123', granted: true }, 
                  error: null 
                })
              })
            })
          })
        })
      });
      
      const consentMockSelect = vi.fn().mockReturnValue({ eq: consentMockEq });
      
      mockFrom.mockImplementation((table: string) => {
        if (table === 'consent_records') {
          return { select: consentMockSelect };
        }
        return { insert: insertSpy };
      });

      const risk = {
        atRisk: true,
        reason: 'Persistent negative mood pattern detected',
        recommendedAction: 'Alert school counselor for check-in'
      };

      await MentalHealthCompanion.alertCounselor('student-123', risk);
      
      expect(insertSpy).toHaveBeenCalled();
      const insertCall = insertSpy.mock.calls[0][0];
      expect(insertCall.risk_score).toBeGreaterThanOrEqual(70);
      expect(insertCall.risk_reason).toBe('Persistent negative mood pattern detected');
      expect(insertCall.recommended_action).toBe('Alert school counselor for check-in');
    });
  });

  describe('getUnacknowledgedAlerts', () => {
    it('should return empty array when no unacknowledged alerts', async () => {
      const testOrder = vi.fn().mockResolvedValue({ data: [], error: null });
      const testIs = vi.fn().mockReturnValue({ order: testOrder });
      const testSelect = vi.fn().mockReturnValue({ is: testIs });
      mockFrom.mockReturnValue({ select: testSelect });

      const alerts = await MentalHealthCompanion.getUnacknowledgedAlerts();
      
      expect(alerts).toEqual([]);
    });

    it('should return unacknowledged alerts', async () => {
      const mockAlerts = [
        {
          alert_id: 'alert-1',
          student_id: 'student-123',
          risk_score: 70,
          risk_reason: 'Persistent negative mood pattern detected',
          recommended_action: 'Alert school counselor for check-in',
          alert_sent_at: new Date().toISOString(),
          acknowledged_at: null
        }
      ];

      // Create a fresh mock chain for this test
      const testOrder = vi.fn().mockResolvedValue({ data: mockAlerts, error: null });
      const testIs = vi.fn().mockReturnValue({ order: testOrder });
      const testSelect = vi.fn().mockReturnValue({ is: testIs });
      mockFrom.mockReturnValue({ select: testSelect });

      const alerts = await MentalHealthCompanion.getUnacknowledgedAlerts();
      
      expect(alerts).toHaveLength(1);
      expect(alerts[0].alert_id).toBe('alert-1');
    });
  });

  describe('acknowledgeAlert', () => {
    it('should acknowledge alert with counselor ID', async () => {
      const mockAlert = {
        alert_id: 'alert-1',
        student_id: 'student-123',
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: 'counselor-456'
      };

      mockSingle.mockReturnValue({ data: mockAlert, error: null });
      mockSelect.mockReturnValue({ single: mockSingle });
      mockEq.mockReturnValue({ select: mockSelect });
      mockUpdate.mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ update: mockUpdate });

      const alert = await MentalHealthCompanion.acknowledgeAlert('alert-1', 'counselor-456');
      
      expect(alert.acknowledged_by).toBe('counselor-456');
      expect(alert.acknowledged_at).toBeDefined();
    });
  });

  describe('resolveAlert', () => {
    it('should resolve alert without notes', async () => {
      const mockAlert = {
        alert_id: 'alert-1',
        resolved_at: new Date().toISOString()
      };

      mockSingle.mockReturnValue({ data: mockAlert, error: null });
      mockSelect.mockReturnValue({ single: mockSingle });
      mockEq.mockReturnValue({ select: mockSelect });
      mockUpdate.mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ update: mockUpdate });

      const alert = await MentalHealthCompanion.resolveAlert('alert-1');
      
      expect(alert.resolved_at).toBeDefined();
    });

    it('should resolve alert with notes', async () => {
      const mockAlert = {
        alert_id: 'alert-1',
        resolved_at: new Date().toISOString(),
        notes: 'Spoke with student and parent'
      };

      mockSingle.mockReturnValue({ data: mockAlert, error: null });
      mockSelect.mockReturnValue({ single: mockSingle });
      mockEq.mockReturnValue({ select: mockSelect });
      mockUpdate.mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ update: mockUpdate });

      const alert = await MentalHealthCompanion.resolveAlert('alert-1', 'Spoke with student and parent');
      
      expect(alert.notes).toBe('Spoke with student and parent');
    });
  });

  describe('getAlertsForStudent', () => {
    it('should return empty array when no alerts for student', async () => {
      mockLimit.mockReturnValue({ data: [], error: null });
      mockOrder.mockReturnValue({ limit: mockLimit });
      mockEq.mockReturnValue({ order: mockOrder });
      mockSelect.mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ select: mockSelect });

      const alerts = await MentalHealthCompanion.getAlertsForStudent('student-123');
      
      expect(alerts).toEqual([]);
    });

    it('should return alerts for specific student', async () => {
      const mockAlerts = [
        {
          alert_id: 'alert-1',
          student_id: 'student-123',
          risk_score: 70,
          risk_reason: 'Persistent negative mood pattern detected',
          recommended_action: 'Alert school counselor for check-in',
          alert_sent_at: new Date().toISOString()
        }
      ];

      mockLimit.mockReturnValue({ data: mockAlerts, error: null });
      mockOrder.mockReturnValue({ limit: mockLimit });
      mockEq.mockReturnValue({ order: mockOrder });
      mockSelect.mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ select: mockSelect });

      const alerts = await MentalHealthCompanion.getAlertsForStudent('student-123');
      
      expect(alerts).toHaveLength(1);
      expect(alerts[0].student_id).toBe('student-123');
    });
  });
});
