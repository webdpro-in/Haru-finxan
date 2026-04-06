/**
 * ConsentManager Service
 * 
 * Implements DPDP 2026 compliance for consent management:
 * - REQ-7.1.1: Granular purpose-specific consent
 * - REQ-7.1.3: Log all consent grants with IP and user agent
 * - REQ-7.1.4: Support consent revocation
 * - REQ-7.1.7: Check consent before processing data
 */

import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export interface ConsentRequest {
  userId: string;
  userType: 'student' | 'parent';
  purpose: string;
  ipAddress: string;
  userAgent: string;
}

export interface ConsentRecord {
  consentId: string;
  userId: string;
  userType: 'student' | 'parent';
  purpose: string;
  granted: boolean;
  grantedAt: Date | null;
  revokedAt: Date | null;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
}

export interface ConsentStatus {
  purpose: string;
  granted: boolean;
  grantedAt: Date | null;
  revokedAt: Date | null;
}

/**
 * Purpose types for DPDP compliance
 */
export const CONSENT_PURPOSES = {
  LEARNING_ANALYTICS: 'learning_analytics',
  MOOD_TRACKING: 'mood_tracking',
  PARENT_NOTIFICATIONS: 'parent_notifications',
  TEACHER_MONITORING: 'teacher_monitoring',
  PERSONALIZATION: 'personalization',
  RESEARCH: 'research',
  THIRD_PARTY_SHARING: 'third_party_sharing'
} as const;

export type ConsentPurpose = typeof CONSENT_PURPOSES[keyof typeof CONSENT_PURPOSES];

export class ConsentManager {
  /**
   * Request consent for a specific purpose
   * REQ-7.1.1: Granular purpose-specific consent
   * REQ-7.1.3: Log with IP and user agent
   */
  async requestConsent(request: ConsentRequest): Promise<string> {
    const consentId = uuidv4();
    
    const { error } = await supabase.from('consent_records').insert({
      consent_id: consentId,
      user_id: request.userId,
      user_type: request.userType,
      purpose: request.purpose,
      granted: false,
      granted_at: null,
      revoked_at: null,
      ip_address: request.ipAddress,
      user_agent: request.userAgent
    });

    if (error) {
      throw new Error(`Failed to request consent: ${error.message}`);
    }

    return consentId;
  }

  /**
   * Grant consent for a specific consent request
   * REQ-7.1.3: Log consent grant with timestamp
   */
  async grantConsent(
    consentId: string,
    aadhaarVerification?: string
  ): Promise<void> {
    const grantedAt = new Date().toISOString();

    const { error } = await supabase
      .from('consent_records')
      .update({
        granted: true,
        granted_at: grantedAt
      })
      .eq('consent_id', consentId);

    if (error) {
      throw new Error(`Failed to grant consent: ${error.message}`);
    }

    // Log for audit trail
    console.log(`Consent granted: ${consentId} at ${grantedAt}${aadhaarVerification ? ' (Aadhaar verified)' : ''}`);
  }

  /**
   * Revoke consent for a specific consent request
   * REQ-7.1.4: Support consent revocation
   */
  async revokeConsent(consentId: string): Promise<void> {
    const revokedAt = new Date().toISOString();

    const { error } = await supabase
      .from('consent_records')
      .update({
        granted: false,
        revoked_at: revokedAt
      })
      .eq('consent_id', consentId);

    if (error) {
      throw new Error(`Failed to revoke consent: ${error.message}`);
    }

    console.log(`Consent revoked: ${consentId} at ${revokedAt}`);
  }

  /**
   * Check if user has granted consent for a specific purpose
   * REQ-7.1.7: Check consent before processing data
   */
  async checkConsentForPurpose(
    userId: string,
    purpose: string
  ): Promise<boolean> {
    const { data, error } = await supabase
      .from('consent_records')
      .select('granted')
      .eq('user_id', userId)
      .eq('purpose', purpose)
      .is('revoked_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      // No consent record found
      return false;
    }

    return data?.granted || false;
  }

  /**
   * Get all consent records for a user
   */
  async getUserConsents(userId: string): Promise<ConsentStatus[]> {
    const { data, error } = await supabase
      .from('consent_records')
      .select('purpose, granted, granted_at, revoked_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get user consents: ${error.message}`);
    }

    return (data || []).map(record => ({
      purpose: record.purpose,
      granted: record.granted,
      grantedAt: record.granted_at ? new Date(record.granted_at) : null,
      revokedAt: record.revoked_at ? new Date(record.revoked_at) : null
    }));
  }

  /**
   * Get consent record by ID
   */
  async getConsentById(consentId: string): Promise<ConsentRecord | null> {
    const { data, error } = await supabase
      .from('consent_records')
      .select('*')
      .eq('consent_id', consentId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      consentId: data.consent_id,
      userId: data.user_id,
      userType: data.user_type,
      purpose: data.purpose,
      granted: data.granted,
      grantedAt: data.granted_at ? new Date(data.granted_at) : null,
      revokedAt: data.revoked_at ? new Date(data.revoked_at) : null,
      ipAddress: data.ip_address,
      userAgent: data.user_agent,
      createdAt: new Date(data.created_at)
    };
  }

  /**
   * Revoke all consents for a user (used during account deletion)
   */
  async revokeAllConsents(userId: string): Promise<void> {
    const revokedAt = new Date().toISOString();

    const { error } = await supabase
      .from('consent_records')
      .update({
        granted: false,
        revoked_at: revokedAt
      })
      .eq('user_id', userId)
      .is('revoked_at', null);

    if (error) {
      throw new Error(`Failed to revoke all consents: ${error.message}`);
    }

    console.log(`All consents revoked for user: ${userId} at ${revokedAt}`);
  }
}
