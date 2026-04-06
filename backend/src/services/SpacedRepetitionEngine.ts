/**
 * Spaced Repetition Engine (SM-2 Algorithm)
 * Implements the SuperMemo 2 algorithm for optimal review scheduling
 * 
 * REQ-2.6.1: System SHALL implement SM-2 algorithm for review scheduling
 * REQ-2.6.2: System SHALL track easiness factor (EF) per concept per student
 * REQ-2.6.3: System SHALL calculate next review date based on quality rating (0-5)
 * REQ-2.6.4: System SHALL reset interval to 1 day when quality <3
 * REQ-2.6.5: System SHALL maintain EF ≥1.3 at all times
 * REQ-2.6.6: System SHALL notify students of reviews due
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'placeholder-key';

let supabase: SupabaseClient;
try {
  supabase = createClient(supabaseUrl, supabaseKey);
} catch (error) {
  // Fallback for testing environments
  supabase = createClient('https://placeholder.supabase.co', 'placeholder-key');
}

/**
 * Represents the spaced repetition state for a concept
 */
export interface SpacedRepetitionData {
  studentId: string;
  conceptId: string;
  conceptName: string;
  easinessFactor: number; // EF: starts at 2.5, minimum 1.3
  interval: number; // Days until next review
  repetitions: number; // Number of successful reviews in a row
  nextReviewDate: Date;
  lastReviewDate: Date;
  lastQuality: number; // Last quality rating (0-5)
}

/**
 * Result of calculating next review
 */
export interface ReviewCalculation {
  nextReviewDate: Date;
  newInterval: number;
  newEasinessFactor: number;
  repetitions: number;
}

/**
 * Spaced Repetition Engine implementing SM-2 algorithm
 */
export class SpacedRepetitionEngine {
  private static readonly DEFAULT_EF = 2.5;
  private static readonly MIN_EF = 1.3;
  private static readonly PASSING_QUALITY = 3;

  /**
   * Task 13.2: Calculate easiness factor based on quality rating
   * 
   * Formula: EF' = EF + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
   * 
   * @param currentEF - Current easiness factor
   * @param quality - Quality rating (0-5)
   * @returns New easiness factor (minimum 1.3)
   */
  static calculateEasinessFactor(currentEF: number, quality: number): number {
    // Validate inputs
    if (quality < 0 || quality > 5) {
      throw new Error('Quality rating must be between 0 and 5');
    }
    if (currentEF < this.MIN_EF) {
      currentEF = this.MIN_EF;
    }

    // SM-2 formula for easiness factor
    const newEF = currentEF + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

    // Enforce minimum EF of 1.3 (REQ-2.6.5)
    return Math.max(this.MIN_EF, newEF);
  }

  /**
   * Task 13.3: Calculate interval based on quality and current state
   * 
   * Rules:
   * - If quality < 3: reset to 1 day (REQ-2.6.4)
   * - First review (interval 0): 1 day
   * - Second review (interval 1): 6 days
   * - Subsequent reviews: interval * EF
   * 
   * @param currentInterval - Current interval in days
   * @param easinessFactor - Easiness factor
   * @param quality - Quality rating (0-5)
   * @param repetitions - Number of successful reviews in a row
   * @returns New interval in days
   */
  static calculateInterval(
    currentInterval: number,
    easinessFactor: number,
    quality: number,
    repetitions: number
  ): number {
    // If quality < 3, reset to 1 day (REQ-2.6.4)
    if (quality < this.PASSING_QUALITY) {
      return 1;
    }

    // First review
    if (currentInterval === 0 || repetitions === 0) {
      return 1;
    }

    // Second review
    if (currentInterval === 1 || repetitions === 1) {
      return 6;
    }

    // Subsequent reviews: multiply by easiness factor
    return Math.round(currentInterval * easinessFactor);
  }

  /**
   * Task 13.4: Calculate next review date
   * 
   * @param currentDate - Current date (defaults to now)
   * @param interval - Interval in days
   * @returns Next review date
   */
  static calculateNextReviewDate(currentDate: Date = new Date(), interval: number): Date {
    const nextDate = new Date(currentDate);
    nextDate.setDate(nextDate.getDate() + interval);
    return nextDate;
  }

  /**
   * Task 13.1: Main SM-2 algorithm implementation
   * 
   * Calculates all spaced repetition parameters after a review
   * 
   * @param currentData - Current spaced repetition state
   * @param quality - Quality rating (0-5)
   * @returns Updated review calculation
   */
  static calculateNextReview(
    currentData: SpacedRepetitionData,
    quality: number
  ): ReviewCalculation {
    // Calculate new easiness factor (Task 13.2)
    const newEasinessFactor = this.calculateEasinessFactor(
      currentData.easinessFactor,
      quality
    );

    // Update repetitions count
    let newRepetitions = currentData.repetitions;
    if (quality >= this.PASSING_QUALITY) {
      newRepetitions += 1;
    } else {
      newRepetitions = 0; // Reset on failure
    }

    // Calculate new interval (Task 13.3)
    const newInterval = this.calculateInterval(
      currentData.interval,
      newEasinessFactor,
      quality,
      newRepetitions
    );

    // Calculate next review date (Task 13.4)
    const nextReviewDate = this.calculateNextReviewDate(new Date(), newInterval);

    return {
      nextReviewDate,
      newInterval,
      newEasinessFactor,
      repetitions: newRepetitions,
    };
  }

  /**
   * Task 13.5: Query reviews due for a student
   * 
   * REQ-2.6.6: System SHALL notify students of reviews due
   * 
   * @param studentId - Student ID
   * @param asOfDate - Date to check (defaults to now)
   * @returns Array of concepts due for review
   */
  static async getReviewsDue(
    studentId: string,
    asOfDate: Date = new Date()
  ): Promise<SpacedRepetitionData[]> {
    try {
      const { data, error } = await supabase
        .from('spaced_repetition')
        .select('*')
        .eq('student_id', studentId)
        .lte('next_review_date', asOfDate.toISOString())
        .order('next_review_date', { ascending: true });

      if (error) {
        console.error('Error fetching reviews due:', error);
        throw new Error(`Failed to fetch reviews: ${error.message}`);
      }

      return (data || []).map(this.deserializeSpacedRepetitionData);
    } catch (error) {
      console.error('Error in getReviewsDue:', error);
      throw error;
    }
  }

  /**
   * Initialize spaced repetition for a new concept
   * 
   * @param studentId - Student ID
   * @param conceptId - Concept ID
   * @param conceptName - Concept name
   * @returns Initial spaced repetition data
   */
  static initializeSpacedRepetition(
    studentId: string,
    conceptId: string,
    conceptName: string
  ): SpacedRepetitionData {
    const now = new Date();
    return {
      studentId,
      conceptId,
      conceptName,
      easinessFactor: this.DEFAULT_EF,
      interval: 0,
      repetitions: 0,
      nextReviewDate: now, // Due immediately for first review
      lastReviewDate: now,
      lastQuality: 0,
    };
  }

  /**
   * Update spaced repetition data after a review
   * 
   * @param currentData - Current spaced repetition state
   * @param quality - Quality rating (0-5)
   * @returns Updated spaced repetition data
   */
  static updateAfterReview(
    currentData: SpacedRepetitionData,
    quality: number
  ): SpacedRepetitionData {
    const calculation = this.calculateNextReview(currentData, quality);

    return {
      ...currentData,
      easinessFactor: calculation.newEasinessFactor,
      interval: calculation.newInterval,
      repetitions: calculation.repetitions,
      nextReviewDate: calculation.nextReviewDate,
      lastReviewDate: new Date(),
      lastQuality: quality,
    };
  }

  /**
   * Save spaced repetition data to database
   * 
   * @param data - Spaced repetition data to save
   */
  static async saveSpacedRepetition(data: SpacedRepetitionData): Promise<void> {
    try {
      const { error } = await supabase
        .from('spaced_repetition')
        .upsert({
          student_id: data.studentId,
          concept_id: data.conceptId,
          concept_name: data.conceptName,
          easiness_factor: data.easinessFactor,
          interval: data.interval,
          repetitions: data.repetitions,
          next_review_date: data.nextReviewDate.toISOString(),
          last_review_date: data.lastReviewDate.toISOString(),
          last_quality: data.lastQuality,
        }, {
          onConflict: 'student_id,concept_id',
        });

      if (error) {
        console.error('Error saving spaced repetition data:', error);
        throw new Error(`Failed to save spaced repetition: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in saveSpacedRepetition:', error);
      throw error;
    }
  }

  /**
   * Load spaced repetition data for a concept
   * 
   * @param studentId - Student ID
   * @param conceptId - Concept ID
   * @returns Spaced repetition data or null if not found
   */
  static async loadSpacedRepetition(
    studentId: string,
    conceptId: string
  ): Promise<SpacedRepetitionData | null> {
    try {
      const { data, error } = await supabase
        .from('spaced_repetition')
        .select('*')
        .eq('student_id', studentId)
        .eq('concept_id', conceptId)
        .single();

      if (error || !data) {
        return null;
      }

      return this.deserializeSpacedRepetitionData(data);
    } catch (error) {
      console.error('Error in loadSpacedRepetition:', error);
      return null;
    }
  }

  /**
   * Get count of reviews due for a student
   * 
   * @param studentId - Student ID
   * @param asOfDate - Date to check (defaults to now)
   * @returns Count of reviews due
   */
  static async getReviewsDueCount(
    studentId: string,
    asOfDate: Date = new Date()
  ): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('spaced_repetition')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', studentId)
        .lte('next_review_date', asOfDate.toISOString());

      if (error) {
        console.error('Error counting reviews due:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error in getReviewsDueCount:', error);
      return 0;
    }
  }

  /**
   * Deserialize database record to SpacedRepetitionData
   */
  private static deserializeSpacedRepetitionData(record: any): SpacedRepetitionData {
    return {
      studentId: record.student_id,
      conceptId: record.concept_id,
      conceptName: record.concept_name,
      easinessFactor: record.easiness_factor,
      interval: record.interval,
      repetitions: record.repetitions,
      nextReviewDate: new Date(record.next_review_date),
      lastReviewDate: new Date(record.last_review_date),
      lastQuality: record.last_quality,
    };
  }
}
