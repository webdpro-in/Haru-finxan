/**
 * ElevenLabs TTS Adapter
 *
 * Streams MP3 from ElevenLabs and returns it as a base64 `data:` URL the
 * frontend can play with `new Audio(...)`. No S3, no extra storage hop.
 *
 * Default voice (Rachel) + `eleven_multilingual_v2` works for English,
 * Hindi, Tamil, Telugu, Kannada, Bengali — the model auto-detects script.
 *
 * Voice IDs are overridable per language via env (ELEVENLABS_VOICE_<LANG>).
 */
import { TTSProvider } from '../../contracts/TTSProvider.js';

const VOICE_BY_LANG: Record<string, string> = {
  en: '21m00Tcm4TlvDq8ikWAM', // Rachel — natural English
  hi: 'pNInz6obpgDQGcFmaJgB', // Adam — handles Hindi well via multilingual_v2
  ta: '21m00Tcm4TlvDq8ikWAM',
  te: '21m00Tcm4TlvDq8ikWAM',
  kn: '21m00Tcm4TlvDq8ikWAM',
  bn: '21m00Tcm4TlvDq8ikWAM',
};

export class ElevenLabsAdapter implements TTSProvider {
  private apiKey: string;
  private model: string;
  // Cached voice ID per gender resolved from the account once a library voice
  // is rejected (free tier: 402 for any non-account voice).
  private cachedVoice: { female: string | null; male: string | null } = {
    female: null, male: null,
  };
  private cacheFetched = false;

  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY || '';
    this.model = process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2';
    if (!this.apiKey) {
      console.warn('[ElevenLabs] ELEVENLABS_API_KEY not set — TTS calls will fail.');
    }
  }

  /**
   * Pick a voice for the (BCP-47) language code passed by the route.
   * Caller-supplied `voiceId` (real ElevenLabs hex IDs) wins first, then per-
   * language env override, then the canonical multilingual map.
   */
  private resolveVoice(voiceId: string, languageCode: string): string {
    // AWS Polly names like "Joanna"/"Aditi" leak through — ignore them.
    const looksLikeElevenLabs = voiceId && voiceId.length >= 18 && /^[A-Za-z0-9]+$/.test(voiceId);
    if (looksLikeElevenLabs) return voiceId;

    const lang = (languageCode || 'en').slice(0, 2).toLowerCase();
    const overrideKey = `ELEVENLABS_VOICE_${lang.toUpperCase()}`;
    return process.env[overrideKey] || VOICE_BY_LANG[lang] || VOICE_BY_LANG.en;
  }

  /**
   * Free-tier accounts cannot use library voice IDs.  Call /v1/voices once,
   * partition the result into male / female buckets, and cache one ID per
   * gender.  Subsequent calls just look up the cache.
   *
   * Per-gender override env vars take priority:
   *   ELEVENLABS_VOICE_FEMALE / ELEVENLABS_VOICE_MALE — specific to a gender
   *   ELEVENLABS_VOICE_ID  — single voice for both genders (legacy)
   */
  private async getAccountVoice(gender: 'male' | 'female' = 'female'): Promise<string | null> {
    // Per-gender env override
    const envOverride = gender === 'male'
      ? process.env.ELEVENLABS_VOICE_MALE
      : process.env.ELEVENLABS_VOICE_FEMALE;
    if (envOverride) return envOverride;

    if (this.cacheFetched) return this.cachedVoice[gender];

    try {
      const res = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: { 'xi-api-key': this.apiKey },
      });
      if (!res.ok) {
        this.cacheFetched = true;
        return null;
      }
      const json: any = await res.json();
      const voices: any[] = Array.isArray(json?.voices) ? json.voices : [];
      this.cacheFetched = true;
      if (voices.length === 0) return null;

      const FEMALE_NAMES = /\b(rachel|bella|elli|domi|grace|charlotte|matilda|sarah|nicole|freya|gigi|glinda|mimi|alice|jessica|lily|aria|emily|laura|stella)\b/i;
      const MALE_NAMES   = /\b(adam|antoni|arnold|sam|josh|callum|charlie|clyde|daniel|david|drew|ethan|fin|george|harry|james|jeremy|liam|matthew|patrick|paul|ryan|thomas)\b/i;

      const classify = (v: any): 'female' | 'male' | 'unknown' => {
        const g = (v.labels?.gender || v.fine_tuning?.language?.gender || '').toLowerCase();
        if (g === 'female') return 'female';
        if (g === 'male') return 'male';
        if (FEMALE_NAMES.test(v.name || '')) return 'female';
        if (MALE_NAMES.test(v.name || ''))   return 'male';
        return 'unknown';
      };

      // Pick the first match per bucket, falling back to "unknown" if needed.
      let firstFemale: any = null, firstMale: any = null, firstAny: any = null;
      for (const v of voices) {
        if (!firstAny) firstAny = v;
        const c = classify(v);
        if (c === 'female' && !firstFemale) firstFemale = v;
        if (c === 'male'   && !firstMale)   firstMale   = v;
        if (firstFemale && firstMale) break;
      }

      this.cachedVoice.female = (firstFemale || firstAny)?.voice_id || null;
      this.cachedVoice.male   = (firstMale   || firstAny)?.voice_id || null;
      console.log(`[ElevenLabs] Cached voices — female:${this.cachedVoice.female}, male:${this.cachedVoice.male}`);
      return this.cachedVoice[gender];
    } catch (err) {
      console.warn('[ElevenLabs] /v1/voices fetch failed:', err);
      this.cacheFetched = true;
      return null;
    }
  }

  private async callTTS(voice: string, text: string): Promise<Response> {
    return fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
      method: 'POST',
      headers: {
        'xi-api-key': this.apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: this.model,
        voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.2, use_speaker_boost: true },
      }),
    });
  }

  async synthesize(
    text: string,
    voiceId: string,
    languageCode: string,
    voiceGender: 'male' | 'female' = 'female',
  ): Promise<string> {
    if (!this.apiKey) throw new Error('ElevenLabs API key missing (ELEVENLABS_API_KEY)');

    // For an explicit ElevenLabs hex ID we trust the caller; otherwise we go
    // straight to the gendered account voice cache so we don't waste a 402
    // round-trip every call.
    const looksLikeElevenLabs = voiceId && voiceId.length >= 18 && /^[A-Za-z0-9]+$/.test(voiceId);
    let voice: string;
    if (looksLikeElevenLabs) {
      voice = voiceId;
    } else {
      const cached = await this.getAccountVoice(voiceGender);
      voice = cached || this.resolveVoice(voiceId, languageCode);
    }

    let res = await this.callTTS(voice, text);

    // Free-tier 402 on library voice → swap to account voice and retry once.
    if (res.status === 402) {
      const fallback = await this.getAccountVoice(voiceGender);
      if (fallback && fallback !== voice) {
        voice = fallback;
        res = await this.callTTS(voice, text);
      }
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`ElevenLabs ${res.status}: ${errText.slice(0, 200)}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    return `data:audio/mpeg;base64,${base64}`;
  }
}
