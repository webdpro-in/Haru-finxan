/**
 * languageDetect — script-ratio detection across Indian languages.
 *
 * Counts how many letter characters fall into each Indic Unicode block,
 * picks the dominant script if it crosses a 30% threshold, otherwise 'en'.
 *
 * Avoids pulling in a 200kB language-detection lib for what is fundamentally
 * a script test (each Indic language has its own Unicode block).
 */

export type DetectedLanguage = 'en' | 'hi' | 'ta' | 'te' | 'kn' | 'bn';

// Each language's Unicode block. These are non-overlapping.
const BLOCKS: { lang: DetectedLanguage; re: RegExp }[] = [
  { lang: 'hi', re: /[ऀ-ॿ]/ }, // Devanagari (Hindi/Marathi)
  { lang: 'bn', re: /[ঀ-৿]/ }, // Bengali
  { lang: 'ta', re: /[஀-௿]/ }, // Tamil
  { lang: 'te', re: /[ఀ-౿]/ }, // Telugu
  { lang: 'kn', re: /[ಀ-೿]/ }, // Kannada
];

const LETTER = /[\p{L}]/u;
const THRESHOLD = 0.3;

export function detectLanguage(text: string): DetectedLanguage {
  if (!text) return 'en';
  const counts: Record<string, number> = { hi: 0, bn: 0, ta: 0, te: 0, kn: 0 };
  let letters = 0;

  for (const ch of text) {
    if (!LETTER.test(ch)) continue;
    letters++;
    for (const { lang, re } of BLOCKS) {
      if (re.test(ch)) {
        counts[lang]++;
        break;
      }
    }
  }

  if (letters === 0) return 'en';

  // Pick the dominant Indic script if it clears the threshold.
  let topLang: DetectedLanguage = 'en';
  let topRatio = 0;
  for (const [lang, n] of Object.entries(counts)) {
    const r = n / letters;
    if (r > topRatio && r > THRESHOLD) {
      topRatio = r;
      topLang = lang as DetectedLanguage;
    }
  }
  return topLang;
}

/** BCP-47 locale code for Web Speech API + ElevenLabs. */
export function bcp47ForLanguage(lang: DetectedLanguage): string {
  switch (lang) {
    case 'hi': return 'hi-IN';
    case 'ta': return 'ta-IN';
    case 'te': return 'te-IN';
    case 'kn': return 'kn-IN';
    case 'bn': return 'bn-IN';
    default:   return 'en-IN';
  }
}

/** Human-readable native script label for the language switcher pill. */
export function labelForLanguage(lang: DetectedLanguage): string {
  switch (lang) {
    case 'hi': return 'हिं';
    case 'ta': return 'த';
    case 'te': return 'తె';
    case 'kn': return 'ಕ';
    case 'bn': return 'বাং';
    default:   return 'EN';
  }
}
