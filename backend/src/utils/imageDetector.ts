/**
 * Image Detector - Analyzes text to determine if images should be generated
 * 
 * This utility detects when the AI response would benefit from visual aids
 * and extracts relevant prompts for image generation.
 */

export interface ImagePrompt {
  prompt: string;
  priority: number; // 1-10, higher = more important
}

export class ImageDetector {
  // Keywords that indicate visual content is needed
  private static readonly VISUAL_KEYWORDS = [
    'diagram', 'picture', 'image', 'illustration', 'chart', 'graph',
    'show', 'visualize', 'draw', 'sketch', 'depict', 'display',
    'look at', 'see the', 'observe', 'view', 'example of',
    'appears', 'looks like', 'resembles', 'similar to',
    'photo', 'photograph', 'scene', 'landscape', 'portrait'
  ];

  // Subjects that work well with images
  private static readonly VISUAL_SUBJECTS = [
    'solar system', 'water cycle', 'cell', 'atom', 'molecule',
    'mountain', 'ocean', 'forest', 'desert', 'city',
    'animal', 'plant', 'flower', 'tree', 'bird',
    'building', 'architecture', 'structure', 'monument',
    'process', 'cycle', 'system', 'mechanism', 'workflow',
    'anatomy', 'biology', 'chemistry', 'physics', 'geography'
  ];

  /**
   * Detect if the text needs visual aids
   */
  static needsImages(text: string): boolean {
    const lowerText = text.toLowerCase();
    
    // Check for visual keywords
    const hasVisualKeyword = this.VISUAL_KEYWORDS.some(keyword => 
      lowerText.includes(keyword)
    );

    // Check for visual subjects
    const hasVisualSubject = this.VISUAL_SUBJECTS.some(subject =>
      lowerText.includes(subject)
    );

    return hasVisualKeyword || hasVisualSubject;
  }

  /**
   * Extract image prompts from text
   * Returns up to 3 prompts with priority scores
   */
  static extractPrompts(text: string, userMessage: string): ImagePrompt[] {
    const prompts: ImagePrompt[] = [];
    const lowerText = text.toLowerCase();

    // Strategy 1: Extract explicit visual references
    const explicitMatches = this.extractExplicitReferences(text);
    prompts.push(...explicitMatches);

    // Strategy 2: Extract main subject from user message
    const subjectPrompt = this.extractMainSubject(userMessage);
    if (subjectPrompt) {
      prompts.push(subjectPrompt);
    }

    // Strategy 3: Extract key concepts from AI response
    const conceptPrompts = this.extractKeyConcepts(text);
    prompts.push(...conceptPrompts);

    // Deduplicate and sort by priority
    const uniquePrompts = this.deduplicatePrompts(prompts);
    return uniquePrompts.slice(0, 3); // Max 3 images
  }

  /**
   * Extract explicit visual references like "look at the diagram of X"
   */
  private static extractExplicitReferences(text: string): ImagePrompt[] {
    const prompts: ImagePrompt[] = [];
    const patterns = [
      /(?:look at|see|view|observe)\s+(?:the|a|an)?\s*(?:diagram|image|picture|illustration|chart)\s+(?:of|showing|depicting)?\s+([^.!?]+)/gi,
      /(?:diagram|image|picture|illustration|chart)\s+(?:of|showing|depicting)\s+([^.!?]+)/gi,
      /(?:shows?|depicts?|illustrates?)\s+([^.!?]+)/gi,
    ];

    for (const pattern of patterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const subject = match[1]?.trim();
        if (subject && subject.length > 3 && subject.length < 100) {
          prompts.push({
            prompt: this.cleanPrompt(subject),
            priority: 10, // Highest priority for explicit references
          });
        }
      }
    }

    return prompts;
  }

  /**
   * Extract main subject from user message
   */
  private static extractMainSubject(userMessage: string): ImagePrompt | null {
    const lowerMessage = userMessage.toLowerCase();

    // Check for "show me", "create", "generate" patterns
    const patterns = [
      /(?:show|create|generate|make|draw)\s+(?:me|a|an)?\s*(?:picture|image|diagram)?\s*(?:of|about)?\s+([^.!?]+)/i,
      /(?:what does|how does)\s+([^.!?]+)\s+look/i,
      /(?:explain|tell me about|describe)\s+([^.!?]+)/i,
    ];

    for (const pattern of patterns) {
      const match = userMessage.match(pattern);
      if (match && match[1]) {
        const subject = match[1].trim();
        if (subject.length > 3 && subject.length < 100) {
          return {
            prompt: this.cleanPrompt(subject),
            priority: 8,
          };
        }
      }
    }

    return null;
  }

  /**
   * Extract key concepts from AI response
   */
  private static extractKeyConcepts(text: string): ImagePrompt[] {
    const prompts: ImagePrompt[] = [];
    
    // Look for sentences with visual subjects
    const sentences = text.split(/[.!?]+/);
    
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      
      // Check if sentence contains visual subjects
      for (const subject of this.VISUAL_SUBJECTS) {
        if (lowerSentence.includes(subject)) {
          // Extract context around the subject
          const words = sentence.trim().split(/\s+/);
          if (words.length >= 3 && words.length <= 20) {
            prompts.push({
              prompt: this.cleanPrompt(sentence.trim()),
              priority: 5,
            });
            break; // One prompt per sentence
          }
        }
      }
    }

    return prompts;
  }

  /**
   * Clean and optimize prompt for image generation
   */
  private static cleanPrompt(prompt: string): string {
    return prompt
      .replace(/\s+/g, ' ')
      .replace(/["""]/g, '')
      .trim()
      .substring(0, 200); // Limit length
  }

  /**
   * Remove duplicate prompts based on similarity
   */
  private static deduplicatePrompts(prompts: ImagePrompt[]): ImagePrompt[] {
    const unique: ImagePrompt[] = [];
    
    for (const prompt of prompts) {
      const isDuplicate = unique.some(existing => 
        this.areSimilar(existing.prompt, prompt.prompt)
      );
      
      if (!isDuplicate) {
        unique.push(prompt);
      }
    }

    // Sort by priority (highest first)
    return unique.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Check if two prompts are similar
   */
  private static areSimilar(a: string, b: string): boolean {
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normA = normalize(a);
    const normB = normalize(b);

    // Check if one contains the other
    if (normA.includes(normB) || normB.includes(normA)) {
      return true;
    }

    // Check word overlap
    const wordsA = new Set(normA.split(/\s+/));
    const wordsB = new Set(normB.split(/\s+/));
    const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
    const union = new Set([...wordsA, ...wordsB]);
    
    const similarity = intersection.size / union.size;
    return similarity > 0.6; // 60% word overlap = similar
  }
}
