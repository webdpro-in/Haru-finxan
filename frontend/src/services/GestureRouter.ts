/**
 * Gesture Router - Determines which gesture to use based on content
 * Coordinates text, images, and gestures
 */

import { GestureType, TeachingSegment } from '../types';

export class GestureRouter {
  /**
   * Analyze text and determine appropriate gestures.
   *
   * Sentence-level routing precedence (first match wins):
   *   1. greeting    → opening salutation
   *   2. warning     → "be careful", "avoid"
   *   3. emphasis    → "important", "remember"
   *   4. nodding     → affirmation ("exactly", "yes", "right")
   *   5. thinking    → questions back to the student / Socratic pauses
   *   6. pointRight  → references to a visual ("see the diagram")
   *   7. pointLeft   → default explanation gesture
   *
   * Each rule supports English + Hindi keywords so multilingual replies still
   * get matched.  For other Indic scripts (Tamil/Telugu/Kannada/Bengali) the
   * heuristic falls back to pointLeft + image detection only — better than
   * misclassifying based on English keywords that happen to appear inline.
   */
  public static parseTeachingContent(text: string): TeachingSegment[] {
    const segments: TeachingSegment[] = [];

    // Split by sentence terminators in English + Devanagari (।) + ellipsis.
    const sentences = text.match(/[^.!?।]+[.!?।]+/g) || [text];

    let isFirst = true;
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (!trimmed) continue;

      let gesture: TeachingSegment['gesture'];
      let type: TeachingSegment['type'] = 'text';
      let imageQuery: string | undefined;

      if (isFirst && this.isGreeting(trimmed)) {
        gesture = 'greeting';
      } else if (this.isWarning(trimmed)) {
        gesture = 'warning';
      } else if (this.isEmphasis(trimmed)) {
        gesture = 'emphasis';
        type = 'emphasis';
      } else if (this.isAffirmation(trimmed)) {
        gesture = 'nodding';
      } else if (this.isQuestion(trimmed)) {
        gesture = 'thinking';
      } else if (this.hasImageReference(trimmed)) {
        gesture = 'pointRight';
        type = 'image';
        imageQuery = this.extractImageQuery(trimmed);
      } else {
        gesture = 'pointLeft';
      }

      segments.push({ type, content: trimmed, gesture, imageQuery });
      isFirst = false;
    }

    return segments;
  }

  /** Greeting / salutation at the top of a reply. */
  private static isGreeting(text: string): boolean {
    const t = text.toLowerCase();
    return /\b(hello|hi|hey|welcome|namaste|good morning|good afternoon)\b/.test(t)
      || /(नमस्ते|नमस्कार|स्वागत|वणक्कम்|నమస్కారం|ನಮಸ್ಕಾರ|নমস্কার)/.test(text);
  }

  /** Affirmations — Haru should nod here. */
  private static isAffirmation(text: string): boolean {
    const t = text.toLowerCase();
    return /\b(exactly|that's right|that is right|correct|well done|great job|yes,|nicely done|spot on|perfect)\b/.test(t)
      || /(शाबाश|बिल्कुल सही|बहुत अच्छा|सही|एकदम सही)/.test(text);
  }

  /** Sentence ending in a question mark — "Does that make sense?" cues a thinking pose. */
  private static isQuestion(text: string): boolean {
    if (!/[?？]\s*$/.test(text)) return false;
    const t = text.toLowerCase();
    // Skip rhetoricals where Haru is making a declarative point — those still
    // benefit from pointLeft.  Heuristic: short questions are real prompts.
    return text.split(/\s+/).length < 18 || /\b(what do you think|does that make sense|can you|do you|क्या आप|समझ आया)\b/.test(t);
  }

  /**
   * Check if text contains emphasis keywords
   */
  private static isEmphasis(text: string): boolean {
    const emphasisKeywords = [
      'important',
      'crucial',
      'key point',
      'remember',
      'note that',
      'pay attention',
      'critical',
      'essential',
      'fundamental',
    ];

    const lowerText = text.toLowerCase();
    return emphasisKeywords.some(keyword => lowerText.includes(keyword));
  }

  /**
   * Check if text contains warning keywords (English + Hindi).
   */
  private static isWarning(text: string): boolean {
    const warningKeywords = [
      'warning', 'caution', 'careful', 'avoid', "don't",
      'mistake', 'error', 'wrong', 'incorrect', 'beware',
    ];
    const lowerText = text.toLowerCase();
    if (warningKeywords.some((k) => lowerText.includes(k))) return true;
    return /(सावधान|गलत|गलती|बचें|न करें)/.test(text);
  }

  /**
   * Check if text references a visual aid (English + Hindi).
   */
  private static hasImageReference(text: string): boolean {
    const imageKeywords = [
      'look at', 'see the', 'observe', 'notice', 'image', 'picture',
      'diagram', 'chart', 'graph', 'illustration', 'example here', 'shown here',
      'visual', 'figure',
    ];
    const lowerText = text.toLowerCase();
    if (imageKeywords.some((k) => lowerText.includes(k))) return true;
    return /(देखो|देखिए|चित्र|आरेख|तस्वीर|छवि)/.test(text);
  }

  /**
   * Extract image query from text
   */
  private static extractImageQuery(text: string): string {
    // Simple extraction - can be enhanced with NLP
    const match = text.match(/(?:look at|see|observe|notice)\s+(?:the\s+)?([^.!?]+)/i);
    return match ? match[1].trim() : text.substring(0, 50);
  }

  /**
   * Determine gesture sequence for a teaching session
   */
  public static planGestureSequence(segments: TeachingSegment[]): GestureType[] {
    const gestures: GestureType[] = [];

    for (const segment of segments) {
      if (segment.gesture) {
        gestures.push(segment.gesture);
      }
    }

    return gestures;
  }

  /**
   * Calculate timing for gesture sequence
   */
  public static calculateTiming(segments: TeachingSegment[]): number[] {
    const timings: number[] = [];
    let currentTime = 0;

    for (const segment of segments) {
      // Estimate reading time (words per minute = 150)
      const words = segment.content.split(/\s+/).length;
      const readingTime = (words / 150) * 60 * 1000; // in milliseconds
      
      // Add gesture duration
      const gestureDuration = segment.duration || 3000;
      
      timings.push(currentTime);
      currentTime += Math.max(readingTime, gestureDuration);
    }

    return timings;
  }

  /**
   * Merge consecutive segments of same type
   */
  public static optimizeSegments(segments: TeachingSegment[]): TeachingSegment[] {
    if (segments.length === 0) return segments;

    const optimized: TeachingSegment[] = [];
    let current = { ...segments[0] };

    for (let i = 1; i < segments.length; i++) {
      const segment = segments[i];
      
      // Merge if same gesture and type
      if (segment.gesture === current.gesture && segment.type === current.type) {
        current.content += ' ' + segment.content;
      } else {
        optimized.push(current);
        current = { ...segment };
      }
    }

    optimized.push(current);
    return optimized;
  }
}
