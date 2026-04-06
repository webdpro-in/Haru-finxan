/**
 * Consent Checking Middleware Tests
 * 
 * Tests DPDP 2026 compliance:
 * - REQ-7.1.7: Check consent before processing data for each purpose
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { requireConsent, requireMultipleConsents, logConsentCheck } from '../consentCheck';
import { CONSENT_PURPOSES } from '../../services/ConsentManager';

// Mock ConsentManager
const mockCheckConsentForPurpose = vi.fn().mockResolvedValue(true);

vi.mock('../../services/ConsentManager', () => {
  return {
    ConsentManager: class {
      checkConsentForPurpose = mockCheckConsentForPurpose;
    },
    CONSENT_PURPOSES: {
      LEARNING_ANALYTICS: 'learning_analytics',
      MOOD_TRACKING: 'mood_tracking',
      PARENT_NOTIFICATIONS: 'parent_notifications',
      TEACHER_MONITORING: 'teacher_monitoring',
      PERSONALIZATION: 'personalization',
      RESEARCH: 'research',
      THIRD_PARTY_SHARING: 'third_party_sharing'
    }
  };
});

describe('Consent Checking Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      params: {},
      body: {},
      ip: '192.168.1.1',
      get: vi.fn().mockReturnValue('Mozilla/5.0')
    };

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };

    mockNext = vi.fn();

    vi.clearAllMocks();
  });

  describe('requireConsent', () => {
    it('should allow request when consent is granted', async () => {
      mockRequest.params = { studentId: 'student-123' };

      const middleware = requireConsent({
        purpose: CONSENT_PURPOSES.LEARNING_ANALYTICS
      });

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject request when consent is not granted', async () => {
      mockRequest.params = { studentId: 'student-456' };

      // Mock consent not granted
      mockCheckConsentForPurpose.mockResolvedValueOnce(false);

      const middleware = requireConsent({
        purpose: CONSENT_PURPOSES.MOOD_TRACKING
      });

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Consent required'
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should extract user ID from params', async () => {
      mockRequest.params = { studentId: 'student-789' };

      const middleware = requireConsent({
        purpose: CONSENT_PURPOSES.PERSONALIZATION,
        userIdParam: 'studentId'
      });

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should extract user ID from body', async () => {
      mockRequest.body = { studentId: 'student-101' };

      const middleware = requireConsent({
        purpose: CONSENT_PURPOSES.LEARNING_ANALYTICS,
        userIdBody: 'studentId'
      });

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 400 when user ID is missing', async () => {
      mockRequest.params = {};
      mockRequest.body = {};

      const middleware = requireConsent({
        purpose: CONSENT_PURPOSES.LEARNING_ANALYTICS
      });

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'User ID not found in request'
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should attach consent status to request', async () => {
      mockRequest.params = { studentId: 'student-123' };

      const middleware = requireConsent({
        purpose: CONSENT_PURPOSES.LEARNING_ANALYTICS
      });

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect((mockRequest as any).consentGranted).toBe(true);
      expect((mockRequest as any).consentPurpose).toBe(CONSENT_PURPOSES.LEARNING_ANALYTICS);
    });

    it('should support optional consent check', async () => {
      mockRequest.params = { studentId: 'student-123' };

      // Mock consent not granted
      mockCheckConsentForPurpose.mockResolvedValueOnce(false);

      const middleware = requireConsent({
        purpose: CONSENT_PURPOSES.RESEARCH,
        required: false
      });

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Should proceed even without consent when required=false
      expect(mockNext).toHaveBeenCalled();
      expect((mockRequest as any).consentGranted).toBe(false);
    });
  });

  describe('requireMultipleConsents', () => {
    it('should allow request when all consents are granted', async () => {
      mockRequest.params = { studentId: 'student-123' };

      const middleware = requireMultipleConsents([
        CONSENT_PURPOSES.LEARNING_ANALYTICS,
        CONSENT_PURPOSES.MOOD_TRACKING
      ]);

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject request when any consent is missing', async () => {
      mockRequest.params = { studentId: 'student-456' };

      // Mock one consent granted, one not
      mockCheckConsentForPurpose
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      const middleware = requireMultipleConsents([
        CONSENT_PURPOSES.LEARNING_ANALYTICS,
        CONSENT_PURPOSES.THIRD_PARTY_SHARING
      ]);

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Consent required',
          deniedPurposes: expect.arrayContaining([CONSENT_PURPOSES.THIRD_PARTY_SHARING])
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should attach all consent purposes to request', async () => {
      mockRequest.params = { studentId: 'student-123' };

      const purposes = [
        CONSENT_PURPOSES.LEARNING_ANALYTICS,
        CONSENT_PURPOSES.PERSONALIZATION
      ];

      const middleware = requireMultipleConsents(purposes);

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect((mockRequest as any).consentsGranted).toBe(true);
      expect((mockRequest as any).consentPurposes).toEqual(purposes);
    });
  });

  describe('logConsentCheck', () => {
    it('should log consent check with user details', () => {
      mockRequest.params = { studentId: 'student-123' };
      const consoleSpy = vi.spyOn(console, 'log');

      const middleware = logConsentCheck(CONSENT_PURPOSES.LEARNING_ANALYTICS);

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[CONSENT CHECK]')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('student-123')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(CONSENT_PURPOSES.LEARNING_ANALYTICS)
      );
      expect(mockNext).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should log IP address and user agent', () => {
      mockRequest.params = { studentId: 'student-123' };
      mockRequest.ip = '192.168.1.100';
      mockRequest.get = vi.fn().mockReturnValue('Chrome/90.0');

      const consoleSpy = vi.spyOn(console, 'log');

      const middleware = logConsentCheck(CONSENT_PURPOSES.MOOD_TRACKING);

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('192.168.1.100')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Chrome/90.0')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('DPDP Compliance', () => {
    it('REQ-7.1.7: should check consent before processing data', async () => {
      mockRequest.params = { studentId: 'student-123' };

      const middleware = requireConsent({
        purpose: CONSENT_PURPOSES.LEARNING_ANALYTICS
      });

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Verify consent check happens before next() is called
      expect(mockNext).toHaveBeenCalled();
    });

    it('REQ-7.1.7: should prevent data processing without consent', async () => {
      mockRequest.params = { studentId: 'student-456' };

      // Mock consent not granted
      mockCheckConsentForPurpose.mockResolvedValueOnce(false);

      const middleware = requireConsent({
        purpose: CONSENT_PURPOSES.MOOD_TRACKING
      });

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Verify request is blocked
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should support all defined consent purposes', async () => {
      mockRequest.params = { studentId: 'student-123' };

      const purposes = Object.values(CONSENT_PURPOSES);

      for (const purpose of purposes) {
        const middleware = requireConsent({ purpose });
        await middleware(mockRequest as Request, mockResponse as Response, mockNext);
      }

      expect(mockNext).toHaveBeenCalledTimes(purposes.length);
    });
  });
});
