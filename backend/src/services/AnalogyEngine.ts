/**
 * Analogy Switching Engine
 * 
 * REQ-2.4.1: System SHALL maintain database of 50+ analogies per concept
 * REQ-2.4.2: System SHALL track which analogies have been used per student
 * REQ-2.4.3: System SHALL automatically switch analogy when student remains confused
 * REQ-2.4.4: System SHALL reset analogy usage after all are exhausted
 * REQ-2.4.5: System SHALL select analogies appropriate for student's grade level
 */

import { supabase } from '../config/supabase';

export interface Analogy {
  analogy_id: string;
  concept_id: string;
  concept_name: string;
  analogy_text: string;
  grade_level: number;
  difficulty: 'easy' | 'medium' | 'hard';
  subject: string;
}

export interface AnalogyUsage {
  usage_id: string;
  student_id: string;
  concept_id: string;
  analogy_id: string;
  used_at: Date;
  was_helpful?: boolean;
  confusion_resolved?: boolean;
}

export class AnalogyEngine {
  /**
   * Get the next appropriate analogy for a student
   * 
   * @param conceptId - The concept to get an analogy for
   * @param studentId - The student requesting the analogy
   * @param studentGrade - The student's grade level
   * @param confusionDetected - Whether confusion was detected (triggers switching)
   * @returns The next analogy to use, or null if none available
   * 
   * Preconditions:
   * - conceptId is non-empty string
   * - studentId is valid UUID
   * - studentGrade is between 1 and 12
   * 
   * Postconditions:
   * - Returns an Analogy object appropriate for student's grade level
   * - Returns an analogy that hasn't been used by this student yet
   * - If all analogies used, resets usage and returns first analogy
   * - Tracks the usage in student_analogy_usage table
   */
  async getNextAnalogy(
    conceptId: string,
    studentId: string,
    studentGrade: number,
    confusionDetected: boolean = false
  ): Promise<Analogy | null> {
    try {
      // Step 1: Get all analogies for this concept appropriate for grade level
      // REQ-2.4.5: Select analogies appropriate for student's grade level
      const { data: allAnalogies, error: analogiesError } = await supabase
        .from('analogies')
        .select('*')
        .eq('concept_id', conceptId)
        .lte('grade_level', studentGrade + 2) // Allow up to 2 grades above
        .gte('grade_level', Math.max(1, studentGrade - 1)) // Allow 1 grade below
        .order('grade_level', { ascending: true });

      if (analogiesError) {
        console.error('Error fetching analogies:', analogiesError);
        return null;
      }

      if (!allAnalogies || allAnalogies.length === 0) {
        console.warn(`No analogies found for concept: ${conceptId}`);
        return null;
      }

      // Step 2: Get analogies already used by this student
      // REQ-2.4.2: Track which analogies have been used per student
      const { data: usedAnalogies, error: usageError } = await supabase
        .from('student_analogy_usage')
        .select('analogy_id')
        .eq('student_id', studentId)
        .eq('concept_id', conceptId);

      if (usageError) {
        console.error('Error fetching usage:', usageError);
        return null;
      }

      const usedAnalogyIds = new Set(
        (usedAnalogies || []).map((u: any) => u.analogy_id)
      );

      // Step 3: Find unused analogies
      const unusedAnalogies = allAnalogies.filter(
        (a: any) => !usedAnalogyIds.has(a.analogy_id)
      );

      let selectedAnalogy: Analogy;

      if (unusedAnalogies.length > 0) {
        // Select first unused analogy
        selectedAnalogy = unusedAnalogies[0];
      } else {
        // REQ-2.4.4: Reset analogy usage after all are exhausted
        console.log(`All analogies used for ${conceptId}, resetting for student ${studentId}`);
        
        // Delete all usage records for this student and concept
        await supabase
          .from('student_analogy_usage')
          .delete()
          .eq('student_id', studentId)
          .eq('concept_id', conceptId);

        // Return first analogy
        selectedAnalogy = allAnalogies[0];
      }

      // Step 4: Track the usage
      // REQ-2.4.3: Automatically switch analogy when student remains confused
      const { error: insertError } = await supabase
        .from('student_analogy_usage')
        .insert({
          student_id: studentId,
          concept_id: conceptId,
          analogy_id: selectedAnalogy.analogy_id,
          used_at: new Date().toISOString(),
          confusion_resolved: !confusionDetected
        });

      if (insertError) {
        console.error('Error tracking analogy usage:', insertError);
        // Still return the analogy even if tracking fails
      }

      return selectedAnalogy;
    } catch (error) {
      console.error('Error in getNextAnalogy:', error);
      return null;
    }
  }

  /**
   * Mark an analogy as helpful or not
   * 
   * @param studentId - The student who used the analogy
   * @param analogyId - The analogy that was used
   * @param wasHelpful - Whether the analogy was helpful
   * @param confusionResolved - Whether confusion was resolved
   */
  async markAnalogyFeedback(
    studentId: string,
    analogyId: string,
    wasHelpful: boolean,
    confusionResolved: boolean
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('student_analogy_usage')
        .update({
          was_helpful: wasHelpful,
          confusion_resolved: confusionResolved
        })
        .eq('student_id', studentId)
        .eq('analogy_id', analogyId);

      if (error) {
        console.error('Error updating analogy feedback:', error);
      }
    } catch (error) {
      console.error('Error in markAnalogyFeedback:', error);
    }
  }

  /**
   * Get analogy statistics for a concept
   * 
   * @param conceptId - The concept to get statistics for
   * @returns Statistics about analogy usage and effectiveness
   */
  async getAnalogyStats(conceptId: string): Promise<{
    totalAnalogies: number;
    totalUsages: number;
    helpfulCount: number;
    confusionResolvedCount: number;
    averageHelpfulness: number;
  }> {
    try {
      // Get total analogies
      const { count: totalAnalogies } = await supabase
        .from('analogies')
        .select('*', { count: 'exact', head: true })
        .eq('concept_id', conceptId);

      // Get usage statistics
      const { data: usages } = await supabase
        .from('student_analogy_usage')
        .select('was_helpful, confusion_resolved')
        .eq('concept_id', conceptId);

      const totalUsages = usages?.length || 0;
      const helpfulCount = usages?.filter((u: any) => u.was_helpful === true).length || 0;
      const confusionResolvedCount = usages?.filter((u: any) => u.confusion_resolved === true).length || 0;
      const averageHelpfulness = totalUsages > 0 ? helpfulCount / totalUsages : 0;

      return {
        totalAnalogies: totalAnalogies || 0,
        totalUsages,
        helpfulCount,
        confusionResolvedCount,
        averageHelpfulness
      };
    } catch (error) {
      console.error('Error in getAnalogyStats:', error);
      return {
        totalAnalogies: 0,
        totalUsages: 0,
        helpfulCount: 0,
        confusionResolvedCount: 0,
        averageHelpfulness: 0
      };
    }
  }

  /**
   * Get all available concepts that have analogies
   * 
   * @returns List of unique concepts with analogy counts
   */
  async getAvailableConcepts(): Promise<Array<{
    concept_id: string;
    concept_name: string;
    subject: string;
    analogy_count: number;
  }>> {
    try {
      const { data, error } = await supabase
        .from('analogies')
        .select('concept_id, concept_name, subject');

      if (error) {
        console.error('Error fetching concepts:', error);
        return [];
      }

      // Group by concept and count
      const conceptMap = new Map<string, {
        concept_id: string;
        concept_name: string;
        subject: string;
        analogy_count: number;
      }>();

      data?.forEach((row: any) => {
        if (conceptMap.has(row.concept_id)) {
          conceptMap.get(row.concept_id)!.analogy_count++;
        } else {
          conceptMap.set(row.concept_id, {
            concept_id: row.concept_id,
            concept_name: row.concept_name,
            subject: row.subject,
            analogy_count: 1
          });
        }
      });

      return Array.from(conceptMap.values());
    } catch (error) {
      console.error('Error in getAvailableConcepts:', error);
      return [];
    }
  }

  /**
   * Reset all analogy usage for a student (useful for testing or new school year)
   * 
   * @param studentId - The student to reset usage for
   */
  async resetStudentAnalogyUsage(studentId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('student_analogy_usage')
        .delete()
        .eq('student_id', studentId);

      if (error) {
        console.error('Error resetting student analogy usage:', error);
      }
    } catch (error) {
      console.error('Error in resetStudentAnalogyUsage:', error);
    }
  }
}

// Export singleton instance
export const analogyEngine = new AnalogyEngine();
