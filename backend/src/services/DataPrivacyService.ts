/**
 * DataPrivacyService
 * 
 * Implements DPDP 2026 compliance for data privacy rights:
 * - REQ-7.1.5: Right to Erasure (soft delete + anonymization)
 * - REQ-7.1.6: Right to Data Portability (export all user data)
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export interface UserDataExport {
  profile: any;
  sessions: any[];
  masteries: any[];
  consents: any[];
  moodCheckins: any[];
  interactions: any[];
  reflections: any[];
  riskPredictions: any[];
  exportedAt: string;
}

export class DataPrivacyService {
  /**
   * Right to Erasure - Soft delete and anonymize user data
   * REQ-7.1.5: Implement Right to Erasure
   * 
   * DPDP compliance:
   * - Soft delete (set deleted_at timestamp)
   * - Anonymize personal identifiable information
   * - Keep learning data for analytics (anonymized)
   */
  async rightToErasure(userId: string): Promise<void> {
    const deletedAt = new Date().toISOString();

    // Step 1: Soft delete - set deleted_at timestamp
    const { error: softDeleteError } = await supabase
      .from('students')
      .update({ deleted_at: deletedAt })
      .eq('student_id', userId);

    if (softDeleteError) {
      throw new Error(`Failed to soft delete user: ${softDeleteError.message}`);
    }

    // Step 2: Anonymize personal data
    const { error: anonymizeError } = await supabase
      .from('students')
      .update({
        name: 'DELETED_USER',
        email: null
      })
      .eq('student_id', userId);

    if (anonymizeError) {
      throw new Error(`Failed to anonymize user data: ${anonymizeError.message}`);
    }

    // Step 3: Anonymize parent data if exists
    const { data: parentData } = await supabase
      .from('parents')
      .select('parent_id')
      .eq('parent_id', (
        await supabase
          .from('students')
          .select('parent_id')
          .eq('student_id', userId)
          .single()
      ).data?.parent_id);

    if (parentData) {
      await supabase
        .from('parents')
        .update({
          name: 'DELETED_PARENT',
          email: null,
          phone: 'DELETED'
        })
        .eq('parent_id', parentData);
    }

    // Note: Keep learning data (sessions, masteries, interactions) for analytics
    // This data is now anonymized since the student profile is anonymized

    console.log(`User data erased: ${userId} at ${deletedAt}`);
  }

  /**
   * Right to Data Portability - Export all user data
   * REQ-7.1.6: Implement Right to Data Portability
   * 
   * Returns complete user data in portable JSON format
   */
  async exportUserData(userId: string): Promise<UserDataExport> {
    // Fetch profile
    const { data: profile, error: profileError } = await supabase
      .from('students')
      .select('*')
      .eq('student_id', userId)
      .single();

    if (profileError) {
      throw new Error(`Failed to export profile: ${profileError.message}`);
    }

    // Fetch sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('*')
      .eq('student_id', userId)
      .order('started_at', { ascending: false });

    if (sessionsError) {
      throw new Error(`Failed to export sessions: ${sessionsError.message}`);
    }

    // Fetch concept masteries
    const { data: masteries, error: masteriesError } = await supabase
      .from('concept_masteries')
      .select('*')
      .eq('student_id', userId)
      .order('last_practiced', { ascending: false });

    if (masteriesError) {
      throw new Error(`Failed to export masteries: ${masteriesError.message}`);
    }

    // Fetch consent records
    const { data: consents, error: consentsError } = await supabase
      .from('consent_records')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (consentsError) {
      throw new Error(`Failed to export consents: ${consentsError.message}`);
    }

    // Fetch mood check-ins
    const { data: moodCheckins, error: moodError } = await supabase
      .from('mood_checkins')
      .select('*')
      .eq('student_id', userId)
      .order('timestamp', { ascending: false });

    if (moodError) {
      throw new Error(`Failed to export mood check-ins: ${moodError.message}`);
    }

    // Fetch interactions
    const { data: interactions, error: interactionsError } = await supabase
      .from('interactions')
      .select('*')
      .eq('student_id', userId)
      .order('timestamp', { ascending: false });

    if (interactionsError) {
      throw new Error(`Failed to export interactions: ${interactionsError.message}`);
    }

    // Fetch reflections
    const { data: reflections, error: reflectionsError } = await supabase
      .from('reflections')
      .select('*')
      .eq('student_id', userId)
      .order('timestamp', { ascending: false });

    if (reflectionsError) {
      throw new Error(`Failed to export reflections: ${reflectionsError.message}`);
    }

    // Fetch risk predictions
    const { data: riskPredictions, error: riskError } = await supabase
      .from('risk_predictions')
      .select('*')
      .eq('student_id', userId)
      .order('calculated_at', { ascending: false });

    if (riskError) {
      throw new Error(`Failed to export risk predictions: ${riskError.message}`);
    }

    return {
      profile,
      sessions: sessions || [],
      masteries: masteries || [],
      consents: consents || [],
      moodCheckins: moodCheckins || [],
      interactions: interactions || [],
      reflections: reflections || [],
      riskPredictions: riskPredictions || [],
      exportedAt: new Date().toISOString()
    };
  }

  /**
   * Check if user has been deleted (soft delete)
   */
  async isUserDeleted(userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('students')
      .select('deleted_at')
      .eq('student_id', userId)
      .single();

    if (error || !data) {
      return false;
    }

    return data.deleted_at !== null;
  }

  /**
   * Get deletion timestamp for a user
   */
  async getDeletionTimestamp(userId: string): Promise<Date | null> {
    const { data, error } = await supabase
      .from('students')
      .select('deleted_at')
      .eq('student_id', userId)
      .single();

    if (error || !data || !data.deleted_at) {
      return null;
    }

    return new Date(data.deleted_at);
  }
}
