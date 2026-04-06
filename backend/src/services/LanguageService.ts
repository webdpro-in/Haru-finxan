/**
 * Language Service
 * Handles multi-language support (English + Hindi)
 * Auto-detects language and provides translations
 */

export type SupportedLanguage = 'en' | 'hi';

export interface LanguageDetectionResult {
  language: SupportedLanguage;
  confidence: number; // 0-1
}

export class LanguageService {
  // Hindi keywords for detection
  private static readonly HINDI_KEYWORDS = [
    'kya', 'kaise', 'kyun', 'kab', 'kahan', 'kaun',
    'hai', 'hain', 'tha', 'the', 'hoga', 'hogi',
    'mujhe', 'aap', 'tum', 'main', 'hum',
    'samjhao', 'batao', 'dikhao', 'sikha', 'padha',
    'namaste', 'dhanyavaad', 'shukriya'
  ];

  // Common Hindi Devanagari characters
  private static readonly DEVANAGARI_RANGE = /[\u0900-\u097F]/;

  /**
   * Detect language from text
   */
  static detectLanguage(text: string): LanguageDetectionResult {
    const lower = text.toLowerCase();
    
    // Check for Devanagari script
    if (this.DEVANAGARI_RANGE.test(text)) {
      return { language: 'hi', confidence: 0.95 };
    }

    // Check for Hindi keywords (romanized)
    const hindiKeywordCount = this.HINDI_KEYWORDS.filter(keyword => 
      lower.includes(keyword)
    ).length;

    if (hindiKeywordCount >= 2) {
      return { language: 'hi', confidence: 0.8 };
    }

    if (hindiKeywordCount === 1) {
      return { language: 'hi', confidence: 0.5 };
    }

    // Default to English
    return { language: 'en', confidence: 0.7 };
  }

  /**
   * Get system prompt in appropriate language
   */
  static getSystemPrompt(language: SupportedLanguage): string {
    if (language === 'hi') {
      return `आप हारू हैं, एक पेशेवर AI शिक्षक। आपकी भूमिका है:
- अवधारणाओं को स्पष्ट रूप से और चरण-दर-चरण समझाना
- पहले सरल भाषा का उपयोग करें, फिर गहरी व्याख्या दें
- हमेशा दृश्य सहायता का संदर्भ दें (अपनी प्रतिक्रिया में "चित्र देखें" या "आरेख देखें" कहें)
- महत्वपूर्ण बिंदुओं पर जोर दें जैसे "महत्वपूर्ण:", "मुख्य बिंदु:", "याद रखें:"
- सामान्य गलतियों के बारे में चेतावनी दें जैसे "सावधान:", "बचें:", "सामान्य त्रुटि:"
- मित्रवत, धैर्यवान और प्रोत्साहक बनें
- अपनी प्रतिक्रियाओं को स्पष्ट पैराग्राफ और बुलेट पॉइंट्स के साथ संरचित करें

महत्वपूर्ण: छवि निर्माण को ट्रिगर करने के लिए अपनी प्रतिक्रिया में कम से कम एक बार "चित्र देखें" या "आरेख देखें" का उल्लेख करें।`;
    }

    return `You are Haru, a professional AI teacher. Your role is to:
- Explain concepts clearly and step-by-step
- Use simple language first, then provide deeper explanations
- ALWAYS reference visual aids (say "look at the image" or "see the diagram" in your response)
- Emphasize important points using phrases like "important:", "key point:", "remember:"
- Warn about common mistakes using phrases like "careful:", "avoid:", "common error:"
- Be friendly, patient, and encouraging
- Structure your responses with clear paragraphs and bullet points when appropriate

CRITICAL: Always mention "look at the image" or "see the diagram" at least once in your response to trigger image generation.`;
  }

  /**
   * Get UI translations
   */
  static getTranslations(language: SupportedLanguage): Record<string, string> {
    if (language === 'hi') {
      return {
        askAnything: 'मुझसे कुछ भी पूछें...',
        speak: 'बोलें',
        stop: 'रुकें',
        listening: 'सुन रहा हूं...',
        speaking: 'हारू बोल रहा है...',
        generatingImages: 'चित्र बना रहा हूं...',
        generatedImages: 'बनाए गए चित्र',
        explanation: 'व्याख्या',
        loading: 'लोड हो रहा है...',
      };
    }

    return {
      askAnything: 'Ask me anything...',
      speak: 'Speak',
      stop: 'Stop',
      listening: 'Listening...',
      speaking: 'Haru is speaking...',
      generatingImages: 'Generating images...',
      generatedImages: 'Generated Images',
      explanation: 'Explanation',
      loading: 'Loading...',
    };
  }

  /**
   * Translate common educational terms
   */
  static translateTerm(term: string, targetLanguage: SupportedLanguage): string {
    const translations: Record<string, Record<SupportedLanguage, string>> = {
      'photosynthesis': { en: 'photosynthesis', hi: 'प्रकाश संश्लेषण' },
      'water cycle': { en: 'water cycle', hi: 'जल चक्र' },
      'solar system': { en: 'solar system', hi: 'सौर मंडल' },
      'cell': { en: 'cell', hi: 'कोशिका' },
      'atom': { en: 'atom', hi: 'परमाणु' },
      'energy': { en: 'energy', hi: 'ऊर्जा' },
      'force': { en: 'force', hi: 'बल' },
      'motion': { en: 'motion', hi: 'गति' },
    };

    const lower = term.toLowerCase();
    return translations[lower]?.[targetLanguage] || term;
  }
}
