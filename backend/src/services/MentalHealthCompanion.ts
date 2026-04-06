/**
 * Mental Health Companion Service
 * Provides daily mood check-ins and mental health risk detection
 * 
 * REQ-3.3.1: System SHALL provide daily mood check-in prompts
 * REQ-3.3.2: System SHALL support mood options: happy, neutral, sad, anxious, frustrated
 * REQ-3.3.3: System SHALL record energy level (1-5) with each check-in
 * REQ-3.3.4: System SHALL generate empathetic responses based on mood
 * REQ-3.3.5: System SHALL detect mental health risk (7+ negative moods in 10 check-ins)
 * REQ-3.3.6: System SHALL alert school counselor when risk detected
 * REQ-3.3.7: System SHALL require student consent before sharing mood data
 */

import { supabase } from '../config/supabase.js';
import { v4 as uuidv4 } from 'uuid';

export type MoodOption = 'happy' | 'neutral' | 'sad' | 'anxious' | 'frustrated';

export interface MoodCheckInPrompt {
  question: string;
  options: string[];
}

export interface MoodCheckInRecord {
  checkin_id: string;
  student_id: string;
  timestamp: Date;
  mood: MoodOption;
  energy_level: number;
  notes?: string;
  anxiety_detected: boolean;
}

export interface MentalHealthRisk {
  atRisk: boolean;
  reason: string;
  recommendedAction: string;
}

export interface CounselorAlert {
  alert_id: string;
  student_id: string;
  risk_score: number;
  risk_reason: string;
  recommended_action: string;
  alert_sent_at: Date;
  acknowledged_at?: Date;
  acknowledged_by?: string;
  resolved_at?: Date;
  notes?: string;
}

export class MentalHealthCompanion {
  /**
   * Generate daily mood check-in prompt
   * REQ-3.3.1: System SHALL provide daily mood check-in prompts
   * REQ-3.3.2: System SHALL support mood options: happy, neutral, sad, anxious, frustrated
   * 
   * @param studentId - Student identifier
   * @returns Mood check-in prompt with question and options
   */
  static async dailyMoodCheckIn(
    studentId: string
  ): Promise<MoodCheckInPrompt> {
    return {
      question: "How are you feeling today?",
      options: ['😊 Happy', '😐 Neutral', '😔 Sad', '😰 Anxious', '😤 Frustrated']
    };
  }

  /**
   * Record mood check-in and generate empathetic response
   * REQ-3.3.3: System SHALL record energy level (1-5) with each check-in
   * REQ-3.3.4: System SHALL generate empathetic responses based on mood
   * 
   * @param studentId - Student identifier
   * @param mood - Selected mood option
   * @param energyLevel - Energy level (1-5)
   * @param notes - Optional notes from student
   * @returns Empathetic response message
   */
  static async recordMoodCheckIn(
    studentId: string,
    mood: MoodOption,
    energyLevel: number,
    notes?: string
  ): Promise<string> {
    // Validate energy level
    if (energyLevel < 1 || energyLevel > 5) {
      throw new Error('Energy level must be between 1 and 5');
    }

    // Store mood check-in
    const { error } = await supabase.from('mood_checkins').insert({
      checkin_id: uuidv4(),
      student_id: studentId,
      timestamp: new Date().toISOString(),
      mood,
      energy_level: energyLevel,
      notes,
      anxiety_detected: mood === 'anxious'
    });

    if (error) {
      console.error('Error recording mood check-in:', error);
      throw new Error(`Failed to record mood check-in: ${error.message}`);
    }

    // Generate empathetic response
    return this.generateEmpatheticResponse(mood);
  }

  /**
   * Generate empathetic response based on mood
   * REQ-3.3.4: System SHALL generate empathetic responses based on mood
   * 
   * @param mood - Student's mood
   * @returns Empathetic response message
   */
  private static generateEmpatheticResponse(mood: MoodOption): string {
    const responses: Record<MoodOption, string> = {
      happy: "That's wonderful! Let's keep that positive energy going. What would you like to learn today?",
      neutral: "Thanks for sharing. Let's make today a good learning day together!",
      sad: "I'm sorry you're feeling down. Remember, it's okay to have tough days. Would you like to talk about it, or shall we focus on something you enjoy?",
      anxious: "I hear you. Take a deep breath with me. Let's take things one step at a time today. No pressure.",
      frustrated: "I understand. Learning can be challenging sometimes. Let's work through this together at your pace."
    };

    return responses[mood] || responses.neutral;
  }

  /**
   * Detect mental health risk based on recent mood history
   * REQ-3.3.5: System SHALL detect mental health risk (7+ negative moods in 10 check-ins)
   * REQ-3.3.6: System SHALL alert school counselor when risk detected
   * 
   * @param studentId - Student identifier
   * @returns Mental health risk assessment
   */
  static async detectMentalHealthRisk(
    studentId: string
  ): Promise<MentalHealthRisk> {
    // Get recent mood history (last 10 check-ins)
    const { data: recentMoods, error } = await supabase
      .from('mood_checkins')
      .select('*')
      .eq('student_id', studentId)
      .order('timestamp', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching mood history:', error);
      throw new Error(`Failed to fetch mood history: ${error.message}`);
    }

    // If less than 10 check-ins, not enough data
    if (!recentMoods || recentMoods.length < 10) {
      return {
        atRisk: false,
        reason: '',
        recommendedAction: ''
      };
    }

    // Count negative moods (sad, anxious, frustrated)
    const negativeMoods = recentMoods.filter(
      m => ['sad', 'anxious', 'frustrated'].includes(m.mood)
    );

    // Risk criteria: 7+ negative moods in last 10 check-ins
    if (negativeMoods.length >= 7) {
      return {
        atRisk: true,
        reason: 'Persistent negative mood pattern detected',
        recommendedAction: 'Alert school counselor for check-in'
      };
    }

    return {
      atRisk: false,
      reason: '',
      recommendedAction: ''
    };
  }

  /**
   * Get mood history for a student
   * 
   * @param studentId - Student identifier
   * @param limit - Maximum number of records to retrieve
   * @returns Array of mood check-in records
   */
  static async getMoodHistory(
    studentId: string,
    limit: number = 30
  ): Promise<MoodCheckInRecord[]> {
    const { data, error } = await supabase
      .from('mood_checkins')
      .select('*')
      .eq('student_id', studentId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching mood history:', error);
      throw new Error(`Failed to fetch mood history: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Check if student has given consent for mood data sharing
   * REQ-3.3.7: System SHALL require student consent before sharing mood data
   * 
   * @param studentId - Student identifier
   * @returns Whether consent has been granted
   */
  static async hasConsentForMoodSharing(studentId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('consent_records')
      .select('*')
      .eq('user_id', studentId)
      .eq('user_type', 'student')
      .eq('purpose', 'mood_data_sharing')
      .eq('granted', true)
      .is('revoked_at', null)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking consent:', error);
      return false;
    }

    return !!data;
  }

  /**
   * Record consent for mood data sharing
   * REQ-3.3.7: System SHALL require student consent before sharing mood data
   * 
   * @param studentId - Student identifier
   * @param granted - Whether consent is granted
   * @param ipAddress - IP address of the request
   * @param userAgent - User agent of the request
   * @returns Consent record ID
   */
  static async recordMoodSharingConsent(
    studentId: string,
    granted: boolean,
    ipAddress?: string,
    userAgent?: string
  ): Promise<string> {
    const consentId = uuidv4();
    const timestamp = new Date().toISOString();

    const { error } = await supabase.from('consent_records').insert({
      consent_id: consentId,
      user_id: studentId,
      user_type: 'student',
      purpose: 'mood_data_sharing',
      granted,
      granted_at: granted ? timestamp : null,
      ip_address: ipAddress,
      user_agent: userAgent,
      created_at: timestamp
    });

    if (error) {
      console.error('Error recording consent:', error);
      throw new Error(`Failed to record consent: ${error.message}`);
    }

    return consentId;
  }

  /**
   * Alert school counselor when mental health risk is detected
   * REQ-3.3.6: System SHALL alert school counselor when risk detected
   * 
   * @param studentId - Student identifier
   * @param risk - Mental health risk assessment
   * @returns Alert ID
   */
  static async alertCounselor(
    studentId: string,
    risk: MentalHealthRisk
  ): Promise<string> {
    // Check if student has given consent for mood data sharing
    const hasConsent = await this.hasConsentForMoodSharing(studentId);
    
    if (!hasConsent) {
      throw new Error('Cannot alert counselor: Student has not given consent for mood data sharing');
    }

    // Calculate risk score (0-100)
    // For now, we use a simple calculation: if at risk, score is 70+
    const riskScore = risk.atRisk ? 70 : 0;

    // Create alert record
    const alertId = uuidv4();
    const { error } = await supabase.from('counselor_alerts').insert({
      alert_id: alertId,
      student_id: studentId,
      risk_score: riskScore,
      risk_reason: risk.reason,
      recommended_action: risk.recommendedAction,
      alert_sent_at: new Date().toISOString()
    });

    if (error) {
      console.error('Error creating counselor alert:', error);
      throw new Error(`Failed to create counselor alert: ${error.message}`);
    }

    return alertId;
  }

  /**
   * Get unacknowledged alerts for a counselor
   * 
   * @param counselorId - Counselor/teacher identifier (optional)
   * @returns Array of unacknowledged alerts
   */
  static async getUnacknowledgedAlerts(
    counselorId?: string
  ): Promise<CounselorAlert[]> {
    let query = supabase
      .from('counselor_alerts')
      .select('*')
      .is('acknowledged_at', null)
      .order('alert_sent_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching unacknowledged alerts:', error);
      throw new Error(`Failed to fetch unacknowledged alerts: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Acknowledge a counselor alert
   * 
   * @param alertId - Alert identifier
   * @param counselorId - Counselor/teacher identifier
   * @returns Updated alert
   */
  static async acknowledgeAlert(
    alertId: string,
    counselorId: string
  ): Promise<CounselorAlert> {
    const { data, error } = await supabase
      .from('counselor_alerts')
      .update({
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: counselorId
      })
      .eq('alert_id', alertId)
      .select()
      .single();

    if (error) {
      console.error('Error acknowledging alert:', error);
      throw new Error(`Failed to acknowledge alert: ${error.message}`);
    }

    return data;
  }

  /**
   * Resolve a counselor alert
   * 
   * @param alertId - Alert identifier
   * @param notes - Resolution notes
   * @returns Updated alert
   */
  static async resolveAlert(
    alertId: string,
    notes?: string
  ): Promise<CounselorAlert> {
    const updateData: any = {
      resolved_at: new Date().toISOString()
    };

    if (notes) {
      updateData.notes = notes;
    }

    const { data, error } = await supabase
      .from('counselor_alerts')
      .update(updateData)
      .eq('alert_id', alertId)
      .select()
      .single();

    if (error) {
      console.error('Error resolving alert:', error);
      throw new Error(`Failed to resolve alert: ${error.message}`);
    }

    return data;
  }

  /**
   * Get all alerts for a specific student
   * 
   * @param studentId - Student identifier
   * @param limit - Maximum number of alerts to retrieve
   * @returns Array of alerts
   */
  static async getAlertsForStudent(
    studentId: string,
    limit: number = 10
  ): Promise<CounselorAlert[]> {
    const { data, error } = await supabase
      .from('counselor_alerts')
      .select('*')
      .eq('student_id', studentId)
      .order('alert_sent_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching student alerts:', error);
      throw new Error(`Failed to fetch student alerts: ${error.message}`);
    }

    return data || [];
  }
}
