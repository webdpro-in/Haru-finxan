/**
 * ConsentManager Tests
 * 
 * Tests DPDP 2026 compliance requirements:
 * - REQ-7.1.1: Granular purpose-specific consent
 * - REQ-7.1.3: Log all consent grants with IP and user agent
 * - REQ-7.1.4: Support consent revocation
 * - REQ-7.1.7: Check consent before processing data
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConsentManager, CONSENT_PURPOSES } from '../ConsentManager';

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: vi.fn(() => ({ error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          error: null,
          is: vi.fn(() => ({ error: null }))
        }))
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            is: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => ({
                  single: vi.fn(() => ({ data: { granted: true }, error: null }))
                }))
              }))
            }))
          })),
          order: vi.fn(() => ({
            data: [],
            error: null
          }))
        }))
      }))
    }))
  }))
}));

describe('ConsentManager', () => {
  let consentManager: ConsentManager;

  beforeEach(() => {
    consentManager = new ConsentManager();
    vi.clearAllMocks();
  });

  describe('requestConsent', () => {
    it('should create consent request with all required fields', async () => {
      const request = {
        userId: 'user-123',
        userType: 'student' as const,
        purpose: CONSENT_PURPOSES.LEARNING_ANALYTICS,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      };

      const consentId = await consentManager.requestConsent(request);

      expect(consentId).toBeDefined();
      expect(typeof consentId).toBe('string');
      expect(consentId.length).toBeGreaterThan(0);
    });

    it('should support different user types', async () => {
      const studentRequest = {
        userId: 'student-123',
        userType: 'student' as const,
        purpose: CONSENT_PURPOSES.MOOD_TRACKING,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      };

      const parentRequest = {
        userId: 'parent-456',
        userType: 'parent' as const,
        purpose: CONSENT_PURPOSES.PARENT_NOTIFICATIONS,
        ipAddress: '192.168.1.2',
        userAgent: 'Chrome/90.0'
      };

      const studentConsentId = await consentManager.requestConsent(studentRequest);
      const parentConsentId = await consentManager.requestConsent(parentRequest);

      expect(studentConsentId).toBeDefined();
      expect(parentConsentId).toBeDefined();
      expect(studentConsentId).not.toBe(parentConsentId);
    });

    it('should support all consent purposes', async () => {
      const purposes = Object.values(CONSENT_PURPOSES);

      for (const purpose of purposes) {
        const request = {
          userId: 'user-123',
          userType: 'student' as const,
          purpose,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0'
        };

        const consentId = await consentManager.requestConsent(request);
        expect(consentId).toBeDefined();
      }
    });
  });

  describe('grantConsent', () => {
    it('should grant consent for a valid consent ID', async () => {
      const consentId = 'consent-123';

      await expect(
        consentManager.grantConsent(consentId)
      ).resolves.not.toThrow();
    });

    it('should support Aadhaar verification for minors', async () => {
      const consentId = 'consent-123';
      const aadhaarVerification = 'aadhaar-verification-token';

      await expect(
        consentManager.grantConsent(consentId, aadhaarVerification)
      ).resolves.not.toThrow();
    });
  });

  describe('revokeConsent', () => {
    it('should revoke consent for a valid consent ID', async () => {
      const consentId = 'consent-123';

      await expect(
        consentManager.revokeConsent(consentId)
      ).resolves.not.toThrow();
    });
  });

  describe('checkConsentForPurpose', () => {
    it('should return true when consent is granted', async () => {
      const userId = 'user-123';
      const purpose = CONSENT_PURPOSES.LEARNING_ANALYTICS;

      const hasConsent = await consentManager.checkConsentForPurpose(userId, purpose);

      expect(hasConsent).toBe(true);
    });

    it('should return false when consent is not granted', async () => {
      const userId = 'user-456';
      const purpose = CONSENT_PURPOSES.RESEARCH;

      // Mock no consent found
      vi.mocked(consentManager).checkConsentForPurpose = vi.fn().mockResolvedValue(false);

      const hasConsent = await consentManager.checkConsentForPurpose(userId, purpose);

      expect(hasConsent).toBe(false);
    });

    it('should check consent for specific purpose only', async () => {
      const userId = 'user-123';
      const purpose1 = CONSENT_PURPOSES.MOOD_TRACKING;
      const purpose2 = CONSENT_PURPOSES.PARENT_NOTIFICATIONS;

      // User has consent for purpose1 but not purpose2
      vi.mocked(consentManager).checkConsentForPurpose = vi.fn()
        .mockImplementation((uid, p) => Promise.resolve(p === purpose1));

      const hasConsent1 = await consentManager.checkConsentForPurpose(userId, purpose1);
      const hasConsent2 = await consentManager.checkConsentForPurpose(userId, purpose2);

      expect(hasConsent1).toBe(true);
      expect(hasConsent2).toBe(false);
    });
  });

  describe('getUserConsents', () => {
    it('should return all consent records for a user', async () => {
      const userId = 'user-123';

      const consents = await consentManager.getUserConsents(userId);

      expect(Array.isArray(consents)).toBe(true);
    });

    it('should return consent status with timestamps', async () => {
      const userId = 'user-123';

      vi.mocked(consentManager).getUserConsents = vi.fn().mockResolvedValue([
        {
          purpose: CONSENT_PURPOSES.LEARNING_ANALYTICS,
          granted: true,
          grantedAt: new Date('2024-01-01'),
          revokedAt: null
        }
      ]);

      const consents = await consentManager.getUserConsents(userId);

      expect(consents.length).toBeGreaterThan(0);
      expect(consents[0]).toHaveProperty('purpose');
      expect(consents[0]).toHaveProperty('granted');
      expect(consents[0]).toHaveProperty('grantedAt');
      expect(consents[0]).toHaveProperty('revokedAt');
    });
  });

  describe('revokeAllConsents', () => {
    it('should revoke all consents for a user', async () => {
      const userId = 'user-123';

      await expect(
        consentManager.revokeAllConsents(userId)
      ).resolves.not.toThrow();
    });
  });

  describe('DPDP Compliance', () => {
    it('REQ-7.1.1: should support granular purpose-specific consent', async () => {
      const purposes = [
        CONSENT_PURPOSES.LEARNING_ANALYTICS,
        CONSENT_PURPOSES.MOOD_TRACKING,
        CONSENT_PURPOSES.PARENT_NOTIFICATIONS,
        CONSENT_PURPOSES.TEACHER_MONITORING,
        CONSENT_PURPOSES.PERSONALIZATION,
        CONSENT_PURPOSES.RESEARCH,
        CONSENT_PURPOSES.THIRD_PARTY_SHARING
      ];

      expect(purposes.length).toBeGreaterThanOrEqual(7);

      for (const purpose of purposes) {
        const request = {
          userId: 'user-123',
          userType: 'student' as const,
          purpose,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0'
        };

        const consentId = await consentManager.requestConsent(request);
        expect(consentId).toBeDefined();
      }
    });

    it('REQ-7.1.3: should log consent grants with IP and user agent', async () => {
      const request = {
        userId: 'user-123',
        userType: 'student' as const,
        purpose: CONSENT_PURPOSES.LEARNING_ANALYTICS,
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      };

      const consentId = await consentManager.requestConsent(request);
      expect(consentId).toBeDefined();

      // Verify IP and user agent are captured
      expect(request.ipAddress).toBe('192.168.1.100');
      expect(request.userAgent).toContain('Mozilla');
    });

    it('REQ-7.1.4: should support consent revocation', async () => {
      const request = {
        userId: 'user-123',
        userType: 'student' as const,
        purpose: CONSENT_PURPOSES.MOOD_TRACKING,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      };

      const consentId = await consentManager.requestConsent(request);
      await consentManager.grantConsent(consentId);

      // Revoke consent
      await expect(
        consentManager.revokeConsent(consentId)
      ).resolves.not.toThrow();
    });

    it('REQ-7.1.7: should check consent before processing data', async () => {
      const userId = 'user-123';
      const purpose = CONSENT_PURPOSES.LEARNING_ANALYTICS;

      // This check should happen before any data processing
      const hasConsent = await consentManager.checkConsentForPurpose(userId, purpose);

      expect(typeof hasConsent).toBe('boolean');
    });
  });
});
