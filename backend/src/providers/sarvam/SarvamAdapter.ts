/**
 * Sarvam AI TTS Adapter
 * 
 * Provides multilingual TTS support with excellent coverage for Indian languages:
 * - Hindi, Tamil, Telugu, Kannada, Bengali, Malayalam, Marathi, Gujarati, Punjabi, Odia
 * - English with Indian accent
 * 
 * API: https://docs.sarvam.ai/api-reference-docs/endpoints/speech
 */
import { TTSProvider } from '../../contracts/TTSProvider.js';

// Language code mapping: BCP-47 to Sarvam language codes
const LANGUAGE_MAP: Record<string, string> = {
  'en-US': 'en-IN',
  'en-GB': 'en-IN',
  'en-IN': 'en-IN',
  'hi-IN': 'hi-IN',
  'ta-IN': 'ta-IN',
  'te-IN': 'te-IN',
  'kn-IN': 'kn-IN',
  'bn-IN': 'bn-IN',
  'ml-IN': 'ml-IN',
  'mr-IN': 'mr-IN',
  'gu-IN': 'gu-IN',
  'pa-IN': 'pa-IN',
  'or-IN': 'or-IN',
};

// Voice selection by language and gender
const VOICE_MAP: Record<string, { male: string; female: string }> = {
  'en-IN': { male: 'arvind', female: 'meera' },
  'hi-IN': { male: 'arvind', female: 'meera' },
  'ta-IN': { male: 'arvind', female: 'meera' },
  'te-IN': { male: 'arvind', female: 'meera' },
  'kn-IN': { male: 'arvind', female: 'meera' },
  'bn-IN': { male: 'arvind', female: 'meera' },
  'ml-IN': { male: 'arvind', female: 'meera' },
  'mr-IN': { male: 'arvind', female: 'meera' },
  'gu-IN': { male: 'arvind', female: 'meera' },
  'pa-IN': { male: 'arvind', female: 'meera' },
  'or-IN': { male: 'arvind', female: 'meera' },
};

export class SarvamAdapter implements TTSProvider {
  private apiKey: string;
  private baseUrl = 'https://api.sarvam.ai';

  constructor() {
    this.apiKey = process.env.SARVAM_API_KEY || '';
    if (!this.apiKey) {
      console.warn('[Sarvam] SARVAM_API_KEY not set — TTS calls will fail.');
    }
  }

  /**
   * Normalize language code to Sarvam format
   */
  private normalizeLanguageCode(languageCode: string): string {
    // Handle short codes (en, hi, ta, etc.)
    const shortCode = languageCode.slice(0, 2).toLowerCase();
    const fullCode = `${shortCode}-IN`;
    
    // Check if we have a direct mapping
    if (LANGUAGE_MAP[languageCode]) {
      return LANGUAGE_MAP[languageCode];
    }
    
    // Check if the full code exists
    if (LANGUAGE_MAP[fullCode]) {
      return LANGUAGE_MAP[fullCode];
    }
    
    // Default to English (Indian)
    return 'en-IN';
  }

  /**
   * Select appropriate voice based on language and gender
   */
  private selectVoice(languageCode: string, voiceGender: 'male' | 'female' = 'female'): string {
    const normalizedLang = this.normalizeLanguageCode(languageCode);
    const voices = VOICE_MAP[normalizedLang] || VOICE_MAP['en-IN'];
    return voices[voiceGender];
  }

  async synthesize(
    text: string,
    voiceId: string,
    languageCode: string,
    voiceGender: 'male' | 'female' = 'female',
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Sarvam API key missing (SARVAM_API_KEY)');
    }

    const normalizedLang = this.normalizeLanguageCode(languageCode);
    const speaker = this.selectVoice(languageCode, voiceGender);

    console.log(`[Sarvam] Synthesizing: lang=${normalizedLang}, speaker=${speaker}, textLength=${text.length}`);

    try {
      const response = await fetch(`${this.baseUrl}/text-to-speech`, {
        method: 'POST',
        headers: {
          'api-subscription-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: [text],
          target_language_code: normalizedLang,
          speaker: speaker,
          pitch: 0,
          pace: 1.0,
          loudness: 1.5,
          speech_sample_rate: 22050,
          enable_preprocessing: true,
          model: 'bulbul:v1',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.error(`[Sarvam] API error ${response.status}:`, errorText);
        
        // If Sarvam fails, log detailed error for debugging
        if (response.status === 401) {
          throw new Error('Sarvam TTS: Invalid API key. Please check SARVAM_API_KEY in .env');
        } else if (response.status === 400) {
          throw new Error(`Sarvam TTS: Bad request - ${errorText.slice(0, 200)}`);
        } else {
          throw new Error(`Sarvam TTS failed: ${response.status} ${errorText.slice(0, 200)}`);
        }
      }

      const data = await response.json();
      
      // Sarvam returns base64 audio in the response
      if ((data as any).audios && (data as any).audios.length > 0) {
        const base64Audio = (data as any).audios[0];
        console.log(`[Sarvam] ✅ Generated audio (${base64Audio.length} chars)`);
        return `data:audio/wav;base64,${base64Audio}`;
      }

      throw new Error('Sarvam TTS: No audio data in response');
    } catch (error: any) {
      console.error('[Sarvam] TTS error:', error);
      
      // Provide helpful error messages
      if (error.message.includes('fetch')) {
        throw new Error('Sarvam TTS: Network error. Please check your internet connection.');
      }
      
      throw error;
    }
  }
}
