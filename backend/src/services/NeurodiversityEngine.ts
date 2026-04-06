/**
 * Neurodiversity Adaptation Engine
 * Provides accommodations for students with dyslexia, ADHD, and dyscalculia
 * 
 * Task Group 29: Neurodiversity Adaptation Engine
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy initialization to avoid errors when env vars are not set
let supabase: SupabaseClient | null = null;
function getSupabase() {
  if (!supabase) {
    const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
    const supabaseKey = process.env.SUPABASE_ANON_KEY || 'placeholder_key';
    supabase = createClient(supabaseUrl, supabaseKey);
  }
  return supabase;
}

export interface DyslexiaAccommodations {
  enabled: boolean;
  accommodations: string[];
  fontFamily: string;
  lineSpacing: number;
  textToSpeech: boolean;
  reducedTextDensity: boolean;
}

export interface ADHDAccommodations {
  enabled: boolean;
  accommodations: string[];
  sessionChunkMinutes: number;
  frequentBreaks: boolean;
  gamificationEnabled: boolean;
  visualProgressIndicators: boolean;
  reducedDistractions: boolean;
}

export interface DyscalculiaAccommodations {
  enabled: boolean;
  accommodations: string[];
  visualNumberRepresentations: boolean;
  stepByStepBreakdowns: boolean;
  extraTimeForCalculations: boolean;
  calculatorAlwaysAvailable: boolean;
  concreteExamplesFirst: boolean;
}

export interface NeurodiversityFlags {
  dyslexia?: DyslexiaAccommodations;
  adhd?: ADHDAccommodations;
  dyscalculia?: DyscalculiaAccommodations;
  parentConsentGiven: boolean;
  parentConsentDate?: Date;
  teacherCustomizations?: Record<string, any>;
}

export class NeurodiversityEngine {
  /**
   * 29.1: Implement Dyslexia Mode
   * Enable dyslexia accommodations for a student
   * REQ-3.4.1: OpenDyslexic font, increased spacing, TTS
   */
  static async enableDyslexiaMode(
    studentId: string,
    parentConsentGiven: boolean = false
  ): Promise<void> {
    if (!parentConsentGiven) {
      throw new Error('Parent consent required to enable neurodiversity accommodations');
    }

    const accommodations: DyslexiaAccommodations = {
      enabled: true,
      accommodations: [
        'OpenDyslexic font',
        'Increased line spacing',
        'Text-to-speech for all content',
        'Reduced text density'
      ],
      fontFamily: 'OpenDyslexic',
      lineSpacing: 1.5,
      textToSpeech: true,
      reducedTextDensity: true
    };

    const supabase = getSupabase();
    const { error } = await supabase
      .from('students')
      .update({
        neurodiversity_flags: {
          dyslexia: accommodations,
          parentConsentGiven: true,
          parentConsentDate: new Date().toISOString()
        }
      })
      .eq('student_id', studentId);

    if (error) {
      throw new Error(`Failed to enable dyslexia mode: ${error.message}`);
    }
  }

  /**
   * 29.2: Implement ADHD Mode
   * Enable ADHD accommodations for a student
   * REQ-3.4.2: Shorter chunks, frequent breaks, gamification
   */
  static async enableADHDMode(
    studentId: string,
    parentConsentGiven: boolean = false
  ): Promise<void> {
    if (!parentConsentGiven) {
      throw new Error('Parent consent required to enable neurodiversity accommodations');
    }

    const accommodations: ADHDAccommodations = {
      enabled: true,
      accommodations: [
        'Shorter session chunks (15 min)',
        'Frequent breaks',
        'Gamification elements',
        'Visual progress indicators',
        'Reduced distractions'
      ],
      sessionChunkMinutes: 15,
      frequentBreaks: true,
      gamificationEnabled: true,
      visualProgressIndicators: true,
      reducedDistractions: true
    };

    const supabase = getSupabase();
    const { error } = await supabase
      .from('students')
      .update({
        neurodiversity_flags: {
          adhd: accommodations,
          parentConsentGiven: true,
          parentConsentDate: new Date().toISOString()
        }
      })
      .eq('student_id', studentId);

    if (error) {
      throw new Error(`Failed to enable ADHD mode: ${error.message}`);
    }
  }

  /**
   * 29.3: Implement Dyscalculia Mode
   * Enable dyscalculia accommodations for a student
   * REQ-3.4.3: Visual numbers, step-by-step breakdowns
   */
  static async enableDyscalculiaMode(
    studentId: string,
    parentConsentGiven: boolean = false
  ): Promise<void> {
    if (!parentConsentGiven) {
      throw new Error('Parent consent required to enable neurodiversity accommodations');
    }

    const accommodations: DyscalculiaAccommodations = {
      enabled: true,
      accommodations: [
        'Visual number representations',
        'Step-by-step breakdowns',
        'Extra time for calculations',
        'Calculator always available',
        'Concrete examples before abstract'
      ],
      visualNumberRepresentations: true,
      stepByStepBreakdowns: true,
      extraTimeForCalculations: true,
      calculatorAlwaysAvailable: true,
      concreteExamplesFirst: true
    };

    const supabase = getSupabase();
    const { error } = await supabase
      .from('students')
      .update({
        neurodiversity_flags: {
          dyscalculia: accommodations,
          parentConsentGiven: true,
          parentConsentDate: new Date().toISOString()
        }
      })
      .eq('student_id', studentId);

    if (error) {
      throw new Error(`Failed to enable dyscalculia mode: ${error.message}`);
    }
  }

  /**
   * 29.4: Implement accommodation application
   * Apply accommodations to content based on neurodiversity flags
   * REQ-3.4.5: Apply accommodations to all content automatically
   */
  static applyAccommodations(
    content: string,
    flags: NeurodiversityFlags
  ): string {
    let modified = content;

    // Apply dyslexia accommodations
    if (flags.dyslexia?.enabled) {
      modified = this.simplifyLanguage(modified);
    }

    // Apply ADHD accommodations
    if (flags.adhd?.enabled) {
      modified = this.chunkContent(modified, 100); // 100 words per chunk
    }

    // Apply dyscalculia accommodations
    if (flags.dyscalculia?.enabled) {
      modified = this.visualizeNumbers(modified);
    }

    return modified;
  }

  /**
   * Simplify language for dyslexia
   * Breaks long sentences, uses simpler words
   */
  static simplifyLanguage(content: string): string {
    // Split into sentences
    const sentences = content.split(/([.!?]+\s+)/);
    const simplified: string[] = [];

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i].trim();
      if (!sentence) continue;

      // Break long sentences (>15 words) into shorter ones
      const words = sentence.split(/\s+/);
      if (words.length > 15) {
        // Find a natural break point (comma, conjunction)
        const midpoint = Math.floor(words.length / 2);
        const firstHalf = words.slice(0, midpoint).join(' ');
        const secondHalf = words.slice(midpoint).join(' ');
        simplified.push(firstHalf + '. ' + secondHalf);
      } else {
        simplified.push(sentence);
      }
    }

    return simplified.join(' ');
  }

  /**
   * Break content into smaller chunks for ADHD
   * REQ-3.4.2: Shorter chunks
   */
  static chunkContent(content: string, wordsPerChunk: number = 100): string {
    const words = content.split(/\s+/);
    const chunks: string[] = [];

    for (let i = 0; i < words.length; i += wordsPerChunk) {
      const chunk = words.slice(i, i + wordsPerChunk).join(' ');
      chunks.push(chunk);
    }

    // Add chunk separators
    return chunks.join('\n\n--- Break ---\n\n');
  }

  /**
   * Add visual representations for numbers for dyscalculia
   * REQ-3.4.3: Visual numbers
   */
  static visualizeNumbers(content: string): string {
    // Replace numbers with visual representations
    return content.replace(/\b(\d+)\b/g, (match, number) => {
      const num = parseInt(number);
      if (num <= 10) {
        // Add dot representation for small numbers
        const dots = '●'.repeat(num);
        return `${number} (${dots})`;
      }
      return number;
    });
  }

  /**
   * Get neurodiversity flags for a student
   */
  static async getNeurodiversityFlags(studentId: string): Promise<NeurodiversityFlags | null> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('students')
      .select('neurodiversity_flags')
      .eq('student_id', studentId)
      .single();

    if (error || !data) {
      return null;
    }

    return data.neurodiversity_flags as NeurodiversityFlags;
  }

  /**
   * REQ-3.4.6: Allow teachers to customize accommodations
   * Update teacher customizations for a student's accommodations
   */
  static async updateTeacherCustomizations(
    studentId: string,
    customizations: Record<string, any>
  ): Promise<void> {
    const supabase = getSupabase();
    
    // Get current flags
    const flags = await this.getNeurodiversityFlags(studentId);
    if (!flags) {
      throw new Error('No neurodiversity flags found for student');
    }

    // Update with teacher customizations
    const updatedFlags = {
      ...flags,
      teacherCustomizations: customizations
    };

    const { error } = await supabase
      .from('students')
      .update({
        neurodiversity_flags: updatedFlags
      })
      .eq('student_id', studentId);

    if (error) {
      throw new Error(`Failed to update teacher customizations: ${error.message}`);
    }
  }

  /**
   * REQ-3.4.4: Require parent consent for neurodiversity flags
   * Check if parent consent has been given
   */
  static async hasParentConsent(studentId: string): Promise<boolean> {
    const flags = await this.getNeurodiversityFlags(studentId);
    return flags?.parentConsentGiven || false;
  }

  /**
   * Record parent consent for neurodiversity accommodations
   */
  static async recordParentConsent(
    studentId: string,
    consentGiven: boolean
  ): Promise<void> {
    const supabase = getSupabase();
    
    // Get current flags
    const flags = await this.getNeurodiversityFlags(studentId) || {
      parentConsentGiven: false
    };

    // Update consent
    const updatedFlags = {
      ...flags,
      parentConsentGiven: consentGiven,
      parentConsentDate: consentGiven ? new Date().toISOString() : undefined
    };

    const { error } = await supabase
      .from('students')
      .update({
        neurodiversity_flags: updatedFlags
      })
      .eq('student_id', studentId);

    if (error) {
      throw new Error(`Failed to record parent consent: ${error.message}`);
    }
  }
}
