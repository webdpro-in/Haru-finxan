/**
 * WhatsApp Bridge Integration Tests
 * Task 25.5: Integration tests for WhatsApp flow
 * 
 * Tests end-to-end WhatsApp communication flow including:
 * - Daily report generation and sending
 * - Database integration
 * - Message handling with database updates
 * - Phone verification
 * - Error handling
 * 
 * **Validates: Requirements REQ-5.2.1 through REQ-5.2.6**
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WhatsAppBridge } from '../WhatsAppBridge.js';
import { generateDailyReport } from '../ParentVoiceBridge.js';
import type { DailyReport } from '../ParentVoiceBridge.js';

// Mock Twilio
const mockTwilioCreate = vi.fn();
const mockTwilioLookup = vi.fn();

vi.mock('twilio', () => {
  return {
    default: vi.fn(() => ({
      messages: {
        create: mockTwilioCreate
      },
      lookups: {
        v2: {
          phoneNumbers: (number: string) => ({
            fetch: () => mockTwilioLookup(number)
          })
        }
      }
    }))
  };
});

// Mock Supabase with more realistic behavior
let mockSupabaseFrom: any;
let mockSupabaseSelect: any;
let mockSupabaseEq: any;
let mockSupabaseSingle: any;
let mockSupabaseUpdate: any;
let mockSupabaseGte: any;
let mockSupabaseLte: any;

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: (...args: any[]) => mockSupabaseFrom(...args)
  }))
}));

describe('WhatsAppBridge Integration Tests', () => {
  let bridge: WhatsAppBridge;

  beforeEach(() => {
    // Set environment variables
    process.env.TWILIO_ACCOUNT_SID = 'AC123456789';
    process.env.TWILIO_AUTH_TOKEN = 'test_auth_token';
    process.env.TWILIO_WHATSAPP_NUMBER = '+14155238886';
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_KEY = 'test_service_key';

    // Reset all mocks
    vi.clearAllMocks();

    // Initialize mock functions
    mockSupabaseFrom = vi.fn();
    mockSupabaseSelect = vi.fn();
    mockSupabaseEq = vi.fn();
    mockSupabaseSingle = vi.fn();
    mockSupabaseUpdate = vi.fn();
    mockSupabaseGte = vi.fn();
    mockSupabaseLte = vi.fn();

    // Setup default mock chain
    mockSupabaseFrom.mockReturnValue({
      select: mockSupabaseSelect
    });
    mockSupabaseSelect.mockReturnValue({
      eq: mockSupabaseEq,
      gte: mockSupabaseGte
    });
    mockSupabaseEq.mockReturnValue({
      single: mockSupabaseSingle,
      gte: mockSupabaseGte,
      lte: mockSupabaseLte
    });
    mockSupabaseGte.mockReturnValue({
      lte: mockSupabaseLte,
      eq: mockSupabaseEq
    });
    mockSupabaseLte.mockReturnValue({
      data: [],
      error: null
    });

    bridge = new WhatsAppBridge();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('End-to-End Daily Report Flow', () => {
    /**
     * REQ-5.2.2: System SHALL send daily learning reports to parents
     * REQ-5.2.3: System SHALL include: sessions, time, topics, progress, confusion events
     */
    it('should generate and send complete daily report via WhatsApp', async () => {
      // Mock session data
      const mockSessions = [
        {
          student_id: 'student-123',
          started_at: new Date('2024-01-15T10:00:00Z'),
          duration: 1200, // 20 minutes
          topics_covered: ['Algebra', 'Quadratic Equations'],
          mastery_gained: { 'algebra-basics': 10, 'quadratic-equations': 15 },
          confusion_count: 1
        },
        {
          student_id: 'student-123',
          started_at: new Date('2024-01-15T14:00:00Z'),
          duration: 1800, // 30 minutes
          topics_covered: ['Geometry', 'Pythagorean Theorem'],
          mastery_gained: { 'geometry-basics': 12, 'pythagorean-theorem': 18 },
          confusion_count: 0
        }
      ];

      // Mock mood check-ins
      const mockMoods = [
        { mood: 'happy', energy_level: 4 },
        { mood: 'happy', energy_level: 5 }
      ];

      // Mock teacher insights
      const mockInsights = [
        {
          finding: 'Strong progress in algebra',
          recommendation: 'Continue with current pace'
        }
      ];

      // Setup Supabase mocks for sessions
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'sessions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  lte: vi.fn().mockResolvedValue({
                    data: mockSessions,
                    error: null
                  })
                })
              })
            })
          };
        }
        if (table === 'mood_checkins') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  lte: vi.fn().mockResolvedValue({
                    data: mockMoods,
                    error: null
                  })
                })
              })
            })
          };
        }
        if (table === 'student_insights') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  lte: vi.fn().mockReturnValue({
                    order: vi.fn().mockReturnValue({
                      limit: vi.fn().mockResolvedValue({
                        data: mockInsights,
                        error: null
                      })
                    })
                  })
                })
              })
            })
          };
        }
        return { select: vi.fn() };
      });

      // Mock Twilio success
      mockTwilioCreate.mockResolvedValue({ sid: 'SM123456789' });

      // Generate report
      const report = await generateDailyReport('student-123', new Date('2024-01-15'));

      // Verify report structure
      expect(report.sessionsCompleted).toBe(2);
      expect(report.totalLearningTime).toBe(3000); // 50 minutes
      expect(report.topicsCovered).toContain('Algebra');
      expect(report.topicsCovered).toContain('Geometry');
      expect(report.confusionEvents).toBe(1);
      expect(report.moodSummary).toContain('happy');
      expect(report.teacherNotes).toContain('Strong progress in algebra');

      // Send via WhatsApp
      const messageSid = await bridge.sendDailyReport('+1234567890', report);

      // Verify message was sent
      expect(messageSid).toBe('SM123456789');
      expect(mockTwilioCreate).toHaveBeenCalledWith({
        from: 'whatsapp:+14155238886',
        to: 'whatsapp:+1234567890',
        body: expect.stringContaining('Daily Learning Report')
      });

      // Verify message content includes all required fields (REQ-5.2.3)
      const sentMessage = mockTwilioCreate.mock.calls[0][0].body;
      expect(sentMessage).toContain('Sessions: 2');
      expect(sentMessage).toContain('Time: 50 minutes');
      expect(sentMessage).toContain('Algebra');
      expect(sentMessage).toContain('Progress: 4 concepts improved');
      expect(sentMessage).toContain('Confusion events: 1');
      expect(sentMessage).toContain('Teacher note: Strong progress in algebra');
    });

    it('should handle report with no activity', async () => {
      // Mock empty sessions
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'sessions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  lte: vi.fn().mockResolvedValue({
                    data: [],
                    error: null
                  })
                })
              })
            })
          };
        }
        if (table === 'mood_checkins') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  lte: vi.fn().mockResolvedValue({
                    data: [],
                    error: null
                  })
                })
              })
            })
          };
        }
        if (table === 'student_insights') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  lte: vi.fn().mockReturnValue({
                    order: vi.fn().mockReturnValue({
                      limit: vi.fn().mockResolvedValue({
                        data: [],
                        error: null
                      })
                    })
                  })
                })
              })
            })
          };
        }
        return { select: vi.fn() };
      });

      mockTwilioCreate.mockResolvedValue({ sid: 'SM123456789' });

      const report = await generateDailyReport('student-123', new Date('2024-01-15'));

      expect(report.sessionsCompleted).toBe(0);
      expect(report.totalLearningTime).toBe(0);
      expect(report.topicsCovered).toHaveLength(0);
      expect(report.moodSummary).toBe('No mood check-ins today');

      const messageSid = await bridge.sendDailyReport('+1234567890', report);
      expect(messageSid).toBe('SM123456789');

      const sentMessage = mockTwilioCreate.mock.calls[0][0].body;
      expect(sentMessage).toContain('Sessions: 0');
      expect(sentMessage).toContain('Topics: No topics covered');
    });
  });

  describe('Database Integration', () => {
    /**
     * REQ-5.2.4: System SHALL handle incoming parent questions
     */
    it('should lookup parent by phone number and handle message', async () => {
      const mockParent = {
        parent_id: 'parent-123',
        name: 'John Doe',
        phone: '+1234567890',
        whatsapp_enabled: true
      };

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockParent,
              error: null
            })
          })
        })
      });

      mockTwilioCreate.mockResolvedValue({ sid: 'SM123456789' });

      await bridge.handleIncomingMessage({
        from: 'whatsapp:+1234567890',
        body: 'How is my child doing?',
        messageId: 'msg-123'
      });

      // Verify parent lookup
      expect(mockSupabaseFrom).toHaveBeenCalledWith('parents');

      // Verify response was sent
      expect(mockTwilioCreate).toHaveBeenCalled();
      const sentMessage = mockTwilioCreate.mock.calls[0][0].body;
      expect(sentMessage).toContain('Thank you for your message');
      expect(sentMessage).toContain('Haru');
    });

    it('should handle unrecognized phone number', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' }
            })
          })
        })
      });

      mockTwilioCreate.mockResolvedValue({ sid: 'SM123456789' });

      await bridge.handleIncomingMessage({
        from: 'whatsapp:+9999999999',
        body: 'Hello',
        messageId: 'msg-123'
      });

      expect(mockTwilioCreate).toHaveBeenCalled();
      const sentMessage = mockTwilioCreate.mock.calls[0][0].body;
      expect(sentMessage).toContain('don\'t recognize this number');
      expect(sentMessage).toContain('register first');
    });
  });

  describe('STOP/START Command Workflow', () => {
    /**
     * REQ-5.2.5: System SHALL support STOP command for unsubscribe
     */
    it('should handle STOP command and update database', async () => {
      const mockParent = {
        parent_id: 'parent-123',
        phone: '+1234567890',
        whatsapp_enabled: true
      };

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: { ...mockParent, whatsapp_enabled: false },
          error: null
        })
      });

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'parents') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockParent,
                  error: null
                })
              })
            }),
            update: mockUpdate
          };
        }
        return { select: vi.fn() };
      });

      mockTwilioCreate.mockResolvedValue({ sid: 'SM123456789' });

      await bridge.handleIncomingMessage({
        from: 'whatsapp:+1234567890',
        body: 'STOP',
        messageId: 'msg-123'
      });

      // Verify database update
      expect(mockUpdate).toHaveBeenCalledWith({ whatsapp_enabled: false });

      // Verify confirmation message
      expect(mockTwilioCreate).toHaveBeenCalled();
      const sentMessage = mockTwilioCreate.mock.calls[0][0].body;
      expect(sentMessage).toContain('unsubscribed from daily reports');
    });

    it('should handle START command and re-enable WhatsApp', async () => {
      const mockParent = {
        parent_id: 'parent-123',
        phone: '+1234567890',
        whatsapp_enabled: false
      };

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: { ...mockParent, whatsapp_enabled: true },
          error: null
        })
      });

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'parents') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockParent,
                  error: null
                })
              })
            }),
            update: mockUpdate
          };
        }
        return { select: vi.fn() };
      });

      mockTwilioCreate.mockResolvedValue({ sid: 'SM123456789' });

      await bridge.handleIncomingMessage({
        from: 'whatsapp:+1234567890',
        body: 'START',
        messageId: 'msg-123'
      });

      // Verify database update
      expect(mockUpdate).toHaveBeenCalledWith({ whatsapp_enabled: true });

      // Verify confirmation message
      expect(mockTwilioCreate).toHaveBeenCalled();
      const sentMessage = mockTwilioCreate.mock.calls[0][0].body;
      expect(sentMessage).toContain('subscribed to daily reports');
    });

    it('should handle case-insensitive STOP/START commands', async () => {
      const mockParent = {
        parent_id: 'parent-123',
        phone: '+1234567890',
        whatsapp_enabled: true
      };

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: mockParent,
          error: null
        })
      });

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'parents') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockParent,
                  error: null
                })
              })
            }),
            update: mockUpdate
          };
        }
        return { select: vi.fn() };
      });

      mockTwilioCreate.mockResolvedValue({ sid: 'SM123456789' });

      // Test lowercase
      await bridge.handleIncomingMessage({
        from: 'whatsapp:+1234567890',
        body: 'stop',
        messageId: 'msg-123'
      });

      expect(mockUpdate).toHaveBeenCalledWith({ whatsapp_enabled: false });

      vi.clearAllMocks();
      mockUpdate.mockClear();

      // Test mixed case
      await bridge.handleIncomingMessage({
        from: 'whatsapp:+1234567890',
        body: 'StArT',
        messageId: 'msg-124'
      });

      expect(mockUpdate).toHaveBeenCalledWith({ whatsapp_enabled: true });
    });
  });

  describe('Phone Number Verification', () => {
    /**
     * REQ-5.2.6: System SHALL verify parent phone numbers
     */
    it('should verify valid phone number using Twilio Lookup API', async () => {
      mockTwilioLookup.mockResolvedValue({ valid: true });

      const isValid = await bridge.verifyPhoneNumber('+1234567890');

      expect(isValid).toBe(true);
      expect(mockTwilioLookup).toHaveBeenCalledWith('+1234567890');
    });

    it('should return false for invalid phone number', async () => {
      mockTwilioLookup.mockRejectedValue(new Error('Invalid phone number'));

      const isValid = await bridge.verifyPhoneNumber('invalid-number');

      expect(isValid).toBe(false);
    });

    it('should handle phone numbers with various formats', async () => {
      mockTwilioLookup.mockResolvedValue({ valid: true });

      // Test with whatsapp: prefix
      await bridge.verifyPhoneNumber('whatsapp:+1234567890');
      expect(mockTwilioLookup).toHaveBeenCalledWith('+1234567890');

      mockTwilioLookup.mockClear();

      // Test with dashes
      await bridge.verifyPhoneNumber('+1-234-567-8900');
      expect(mockTwilioLookup).toHaveBeenCalledWith('+12345678900');
    });

    it('should handle Twilio Lookup API errors gracefully', async () => {
      mockTwilioLookup.mockRejectedValue(new Error('API rate limit exceeded'));

      const isValid = await bridge.verifyPhoneNumber('+1234567890');

      expect(isValid).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle Twilio API failures when sending messages', async () => {
      mockTwilioCreate.mockRejectedValue(new Error('Twilio service unavailable'));

      await expect(
        bridge.sendMessage('+1234567890', 'Test message')
      ).rejects.toThrow('Failed to send WhatsApp message');
    });

    it('should handle database errors when fetching sessions', async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'sessions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  lte: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Database connection failed' }
                  })
                })
              })
            })
          };
        }
        return { select: vi.fn() };
      });

      await expect(
        generateDailyReport('student-123', new Date('2024-01-15'))
      ).rejects.toThrow('Failed to fetch sessions');
    });

    it('should handle missing parent data gracefully', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Parent not found' }
            })
          })
        })
      });

      mockTwilioCreate.mockResolvedValue({ sid: 'SM123456789' });

      await bridge.handleIncomingMessage({
        from: 'whatsapp:+9999999999',
        body: 'Hello',
        messageId: 'msg-123'
      });

      // Should send "don't recognize" message
      expect(mockTwilioCreate).toHaveBeenCalled();
      const sentMessage = mockTwilioCreate.mock.calls[0][0].body;
      expect(sentMessage).toContain('don\'t recognize this number');
    });

    it('should handle network timeouts', async () => {
      mockTwilioCreate.mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Network timeout')), 100);
        });
      });

      await expect(
        bridge.sendMessage('+1234567890', 'Test')
      ).rejects.toThrow('Failed to send WhatsApp message');
    });

    it('should handle malformed phone numbers', async () => {
      mockTwilioCreate.mockRejectedValue(new Error('Invalid phone number format'));

      await expect(
        bridge.sendMessage('not-a-phone-number', 'Test')
      ).rejects.toThrow('Failed to send WhatsApp message');
    });
  });

  describe('Report Formatting', () => {
    it('should format report with all required fields', async () => {
      const report: DailyReport = {
        date: new Date('2024-01-15'),
        studentId: 'student-123',
        sessionsCompleted: 5,
        totalLearningTime: 3600, // 60 minutes
        topicsCovered: ['Math', 'Science', 'English', 'History'],
        masteryGained: {
          'algebra': 20,
          'geometry': 15,
          'biology': 10
        },
        confusionEvents: 3,
        moodSummary: 'Mostly focused (energy: 4.5/5)',
        teacherNotes: 'Excellent participation in class discussions'
      };

      mockTwilioCreate.mockResolvedValue({ sid: 'SM123456789' });

      await bridge.sendDailyReport('+1234567890', report);

      const sentMessage = mockTwilioCreate.mock.calls[0][0].body;

      // Verify all required fields are present
      expect(sentMessage).toContain('Daily Learning Report');
      expect(sentMessage).toContain('Sessions: 5');
      expect(sentMessage).toContain('Time: 60 minutes');
      expect(sentMessage).toContain('Math');
      expect(sentMessage).toContain('Progress: 3 concepts improved');
      expect(sentMessage).toContain('Confusion events: 3');
      expect(sentMessage).toContain('Teacher note: Excellent participation');
      expect(sentMessage).toContain('STOP to unsubscribe');
    });

    it('should truncate long topic lists', async () => {
      const report: DailyReport = {
        date: new Date('2024-01-15'),
        studentId: 'student-123',
        sessionsCompleted: 1,
        totalLearningTime: 600,
        topicsCovered: ['Topic1', 'Topic2', 'Topic3', 'Topic4', 'Topic5'],
        masteryGained: {},
        confusionEvents: 0,
        moodSummary: 'Happy'
      };

      mockTwilioCreate.mockResolvedValue({ sid: 'SM123456789' });

      await bridge.sendDailyReport('+1234567890', report);

      const sentMessage = mockTwilioCreate.mock.calls[0][0].body;

      // Should only show first 3 topics
      expect(sentMessage).toContain('Topic1');
      expect(sentMessage).toContain('Topic2');
      expect(sentMessage).toContain('Topic3');
    });

    it('should handle reports with zero learning time', async () => {
      const report: DailyReport = {
        date: new Date('2024-01-15'),
        studentId: 'student-123',
        sessionsCompleted: 0,
        totalLearningTime: 0,
        topicsCovered: [],
        masteryGained: {},
        confusionEvents: 0,
        moodSummary: 'No activity'
      };

      mockTwilioCreate.mockResolvedValue({ sid: 'SM123456789' });

      await bridge.sendDailyReport('+1234567890', report);

      const sentMessage = mockTwilioCreate.mock.calls[0][0].body;

      expect(sentMessage).toContain('Time: 0 minutes');
      expect(sentMessage).toContain('Sessions: 0');
    });
  });

  describe('Nightly Job Integration', () => {
    it('should process multiple parents and students', async () => {
      const mockParents = [
        { parent_id: 'parent-1', phone: '+1111111111', whatsapp_enabled: true },
        { parent_id: 'parent-2', phone: '+2222222222', whatsapp_enabled: true }
      ];

      const mockStudents = [
        { student_id: 'student-1', name: 'Alice', parent_id: 'parent-1' },
        { student_id: 'student-2', name: 'Bob', parent_id: 'parent-2' }
      ];

      const mockSessions = [
        {
          student_id: 'student-1',
          started_at: new Date(),
          duration: 1200,
          topics_covered: ['Math'],
          mastery_gained: { 'math': 10 },
          confusion_count: 0
        }
      ];

      const mockMoods = [
        { mood: 'happy', energy_level: 4 }
      ];

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'parents') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: mockParents,
                error: null
              })
            })
          };
        }
        if (table === 'students') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: mockStudents,
                error: null
              })
            })
          };
        }
        if (table === 'sessions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  lte: vi.fn().mockResolvedValue({
                    data: mockSessions,
                    error: null
                  })
                })
              })
            })
          };
        }
        if (table === 'mood_checkins') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  lte: vi.fn().mockResolvedValue({
                    data: mockMoods,
                    error: null
                  })
                })
              })
            })
          };
        }
        if (table === 'student_insights') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  lte: vi.fn().mockReturnValue({
                    order: vi.fn().mockReturnValue({
                      limit: vi.fn().mockResolvedValue({
                        data: [],
                        error: null
                      })
                    })
                  })
                })
              })
            })
          };
        }
        return { select: vi.fn() };
      });

      mockTwilioCreate.mockResolvedValue({ sid: 'SM123456789' });

      // Simulate nightly job processing
      for (const parent of mockParents) {
        const students = mockStudents.filter(s => s.parent_id === parent.parent_id);
        
        for (const student of students) {
          const report = await generateDailyReport(student.student_id, new Date());
          
          if (report.sessionsCompleted > 0) {
            await bridge.sendDailyReport(parent.phone, report);
          }
        }
      }

      // Verify messages were sent
      expect(mockTwilioCreate).toHaveBeenCalled();
    });
  });
});
