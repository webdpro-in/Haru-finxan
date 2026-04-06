/**
 * Consent Checking Middleware
 * 
 * Implements DPDP 2026 compliance:
 * - REQ-7.1.7: Check consent before processing data for each purpose
 */

import { Request, Response, NextFunction } from 'express';
import { ConsentManager, ConsentPurpose } from '../services/ConsentManager.js';

export interface ConsentCheckOptions {
  purpose: ConsentPurpose | string;
  userIdParam?: string; // Parameter name in req.params (default: 'studentId')
  userIdBody?: string; // Field name in req.body
  required?: boolean; // If true, reject request if consent not granted (default: true)
}

/**
 * Middleware to check if user has granted consent for a specific purpose
 * 
 * Usage:
 * ```
 * router.post('/api/student/:studentId/mood', 
 *   requireConsent({ purpose: CONSENT_PURPOSES.MOOD_TRACKING }),
 *   handleMoodCheckIn
 * );
 * ```
 */
export function requireConsent(options: ConsentCheckOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const consentManager = new ConsentManager();
      
      const {
        purpose,
        userIdParam = 'studentId',
        userIdBody,
        required = true
      } = options;

      // Extract user ID from request
      let userId: string | undefined;

      if (userIdParam && req.params[userIdParam]) {
        userId = req.params[userIdParam];
      } else if (userIdBody && req.body[userIdBody]) {
        userId = req.body[userIdBody];
      }

      if (!userId) {
        return res.status(400).json({
          error: 'User ID not found in request',
          message: 'Cannot check consent without user ID'
        });
      }

      // Check consent
      const hasConsent = await consentManager.checkConsentForPurpose(userId, purpose);

      if (!hasConsent && required) {
        return res.status(403).json({
          error: 'Consent required',
          message: `User has not granted consent for purpose: ${purpose}`,
          purpose,
          userId
        });
      }

      // Attach consent status to request for downstream handlers
      (req as any).consentGranted = hasConsent;
      (req as any).consentPurpose = purpose;

      next();
    } catch (error) {
      console.error('Consent check error:', error);
      return res.status(500).json({
        error: 'Consent check failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}

/**
 * Middleware to check multiple consent purposes
 * All purposes must be granted for request to proceed
 */
export function requireMultipleConsents(purposes: (ConsentPurpose | string)[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const consentManager = new ConsentManager();
      
      const userId = req.params.studentId || req.body.studentId;

      if (!userId) {
        return res.status(400).json({
          error: 'User ID not found in request'
        });
      }

      // Check all purposes
      const consentChecks = await Promise.all(
        purposes.map(purpose =>
          consentManager.checkConsentForPurpose(userId, purpose)
        )
      );

      const allGranted = consentChecks.every(granted => granted);

      if (!allGranted) {
        const deniedPurposes = purposes.filter((_, index) => !consentChecks[index]);
        
        return res.status(403).json({
          error: 'Consent required',
          message: 'User has not granted consent for all required purposes',
          deniedPurposes,
          userId
        });
      }

      // Attach consent status to request
      (req as any).consentsGranted = true;
      (req as any).consentPurposes = purposes;

      next();
    } catch (error) {
      console.error('Multiple consent check error:', error);
      return res.status(500).json({
        error: 'Consent check failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}

/**
 * Middleware to log consent check for audit trail
 */
export function logConsentCheck(purpose: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userId = req.params.studentId || req.body.studentId;
    const timestamp = new Date().toISOString();
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';

    console.log(`[CONSENT CHECK] ${timestamp} - User: ${userId}, Purpose: ${purpose}, IP: ${ipAddress}, UA: ${userAgent}`);

    next();
  };
}
