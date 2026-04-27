/**
 * LearningSignals — lightweight cognitive-load + prerequisite pivot helpers.
 *
 * Stateless detection (each chat call): scan the user message + last AI turn
 * for confusion signals (keywords, ultra-short replies, English/Hindi).
 *
 * Stateful pivot (per user): keep a tiny in-memory counter of consecutive
 * confusion turns per concept. After 2+ confusions on a known concept,
 * inject "let's build up to this — first {prerequisite}" into the next prompt.
 *
 * No DB. Hackathon-grade. Map clears on server restart.
 */

const CONFUSION_KEYWORDS_EN = [
  // understand
  "don't understand", 'do not understand', 'dont understand',
  'not understand', "didn't understand", 'didnt understand',
  // get / follow
  "i don't get", 'i dont get', "can't follow", 'cant follow',
  // generic confusion
  'confused', 'confusing', 'lost', 'no idea', 'wait what',
  'what?', 'huh', 'huh?', 'too fast', 'still confused',
  // difficulty
  'difficult', 'hard to', 'too hard', 'really hard',
];

const CONFUSION_KEYWORDS_HI = [
  'समझ नहीं', 'समझ नहि', 'नहीं समझा', 'नहीं समझी', 'कठिन', 'मुश्किल',
];

/** Concept → prerequisites graph. Add more entries freely. */
const PREREQS: Record<string, string[]> = {
  'black holes':       ['gravity', 'stars', 'light speed'],
  'calculus':          ['algebra', 'functions', 'limits'],
  'neural networks':   ['linear algebra', 'statistics', 'functions'],
  'derivatives':       ['functions', 'limits'],
  'integrals':         ['derivatives', 'functions'],
  'recursion':         ['functions', 'control flow'],
  'big o':             ['functions', 'loops'],
  'quantum mechanics': ['classical mechanics', 'waves', 'probability'],
  'photosynthesis':    ['cells', 'chemical reactions'],
  'mitosis':           ['cells', 'DNA basics'],
  'machine learning':  ['statistics', 'linear algebra', 'gradients'],
  'gradients':         ['derivatives'],
  'binary search':     ['arrays', 'comparison'],
  'graphs':            ['arrays', 'recursion'],
};

const KNOWN_CONCEPTS = Object.keys(PREREQS);

/** Per-user counters. Map<userId, Map<concept, consecutiveConfusions>> */
const confusionCounters = new Map<string, Map<string, number>>();

/** Sticky "last topic Haru explained" per user — used when the new turn
 *  paraphrases the concept and the substring match fails. */
const lastConcept = new Map<string, string>();

export interface LearningSignal {
  isConfused: boolean;
  detectedConcept: string | null;
  prerequisite: string | null;
  /** True when we should inject prerequisite-pivot guidance. */
  shouldPivot: boolean;
}

export function detectConcept(text: string): string | null {
  const t = text.toLowerCase();
  for (const concept of KNOWN_CONCEPTS) {
    if (t.includes(concept)) return concept;
    // tolerate plural <-> singular (black hole / black holes)
    if (concept.endsWith('s') && t.includes(concept.slice(0, -1))) return concept;
    if (!concept.endsWith('s') && t.includes(concept + 's')) return concept;
  }
  return null;
}

export function isConfusionSignal(message: string, prevAiText?: string): boolean {
  const m = message.toLowerCase().trim();
  // Keyword hit.
  if (CONFUSION_KEYWORDS_EN.some((k) => m.includes(k))) return true;
  if (CONFUSION_KEYWORDS_HI.some((k) => message.includes(k))) return true;
  // Very short reply right after a long explanation = probably lost.
  const wordCount = m.split(/\s+/).filter(Boolean).length;
  if (prevAiText && prevAiText.length > 200 && wordCount > 0 && wordCount < 5) return true;
  return false;
}

/**
 * Update per-user counters and decide whether to pivot to prerequisites.
 * Concept is detected from the LAST AI text (the topic Haru just explained),
 * because the user's confused reply rarely names the concept.
 */
export function evaluate(
  userId: string | undefined,
  userMessage: string,
  prevAiText: string | undefined,
): LearningSignal {
  const isConfused = isConfusionSignal(userMessage, prevAiText);

  // Detect concept from prev AI text or user message; if neither names a
  // known concept, fall back to the sticky last-seen concept for this user
  // (the AI may have paraphrased so the substring match misses).
  let detectedConcept =
    detectConcept(prevAiText || '') || detectConcept(userMessage);
  if (!detectedConcept && userId) {
    detectedConcept = lastConcept.get(userId) ?? null;
  }
  if (detectedConcept && userId) {
    lastConcept.set(userId, detectedConcept);
  }

  let shouldPivot = false;
  let prerequisite: string | null = null;

  if (userId) {
    const userMap = confusionCounters.get(userId) || new Map<string, number>();
    if (detectedConcept) {
      const prev = userMap.get(detectedConcept) || 0;
      const next = isConfused ? prev + 1 : 0;
      userMap.set(detectedConcept, next);
      if (next >= 2 && PREREQS[detectedConcept]?.length) {
        shouldPivot = true;
        prerequisite = PREREQS[detectedConcept][0];
        userMap.set(detectedConcept, 0); // reset so we don't pivot every turn
      }
    }
    confusionCounters.set(userId, userMap);
  }

  return { isConfused, detectedConcept, prerequisite, shouldPivot };
}

/** Build a short instruction line to append to the system prompt. */
export function promptInjection(signal: LearningSignal): string {
  if (signal.shouldPivot && signal.prerequisite && signal.detectedConcept) {
    return `\n\nThe student has shown repeated confusion about "${signal.detectedConcept}". Pivot: open with "Let's build up to this — first let's cover ${signal.prerequisite}." Then explain that prerequisite simply, with one analogy.`;
  }
  if (signal.isConfused) {
    return '\n\nThe student is confused. Simplify dramatically: use a single concrete analogy, shorter sentences, and check in at the end ("Does that part make sense?"). Be encouraging.';
  }
  return '';
}
