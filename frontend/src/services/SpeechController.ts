/**
 * Speech Controller - Handles TTS and STT
 * Supports both browser-native TTS (via browser-tts:// URLs from BrowserTTSAdapter)
 * and cloud TTS (via HTTP audio URLs from AWS Polly etc.)
 */

import axios from 'axios';
import { lipSyncService } from './LipSyncService';
import { idleAnimator } from './IdleAnimator';
import { cleanTextForTTS, mathSymbolsToWords } from '../utils/textCleaner';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export class SpeechController {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private currentAudio: HTMLAudioElement | null = null;

  /**
   * Start recording audio from microphone
   */
  public async startRecording(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) this.audioChunks.push(event.data);
      };
      this.mediaRecorder.start();
      console.log('Recording started');
    } catch (error) {
      console.error('Error starting recording:', error);
      throw new Error('Failed to access microphone');
    }
  }

  /**
   * Stop recording and return audio blob
   */
  public async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) { reject(new Error('No active recording')); return; }
      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.audioChunks = [];
        if (this.mediaRecorder?.stream) {
          this.mediaRecorder.stream.getTracks().forEach(t => t.stop());
        }
        resolve(audioBlob);
      };
      this.mediaRecorder.stop();
    });
  }

  /**
   * Transcribe audio to text via backend STT provider
   */
  public async transcribeAudio(audioBlob: Blob): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      const response = await axios.post(`${API_BASE_URL}/transcribe`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data.text || '';
    } catch (error) {
      console.error('Transcription error:', error);
      throw new Error('Failed to transcribe audio');
    }
  }

  /**
   * Convert text to speech.
   * Tries backend TTS first; on any failure, falls back to in-browser
   * Web Speech API by encoding a browser-tts:// URL inline.
   * The caller's language is read from the store at request time.
   */
  public async textToSpeech(text: string): Promise<string> {
    // Lazy import to avoid circular issues at module init
    const { useAppStore } = await import('../store/useAppStore');
    const { bcp47ForLanguage } = await import('../utils/languageDetect');
    const { getCharacter } = await import('../config/characters');
    const state = useAppStore.getState();
    const language = state.language;
    const character = getCharacter(state.character);
    const languageCode = bcp47ForLanguage(language);
    // voiceId is provider-specific. For ElevenLabs the backend routes by
    // gender + language; for AWS Polly we map to a sensible default.
    const pollyVoice = character.voiceGender === 'male'
      ? (language === 'hi' ? 'Aditya' : 'Matthew')
      : (language === 'hi' ? 'Aditi'  : 'Joanna');
    const voiceId = pollyVoice;
    const voiceGender = character.voiceGender;

    // Clean text: remove special characters but preserve math symbols
    let cleanedText = cleanTextForTTS(text);
    // Convert math symbols to spoken words
    cleanedText = mathSymbolsToWords(cleanedText);

    try {
      const response = await axios.post(`${API_BASE_URL}/synthesize`, {
        text: cleanedText,
        voiceId,
        languageCode,
        voiceGender,
      });
      if (response.data?.audioUrl) return response.data.audioUrl;
    } catch (error) {
      // backend TTS not configured — fall through to browser TTS
      console.info('Backend TTS unavailable, using browser speech.');
    }

    const payload = JSON.stringify({ text: cleanedText, voiceId, languageCode, voiceGender });
    return `browser-tts://${btoa(unescape(encodeURIComponent(payload)))}`;
  }

  /**
   * Play audio from URL with lip sync.
   * Handles browser-tts:// (Web Speech API) and http(s):// (HTMLAudioElement).
   */
  public async playAudio(audioUrl: string): Promise<void> {
    if (audioUrl.startsWith('browser-tts://')) {
      return this.playWithSpeechSynthesis(audioUrl);
    }
    return this.playWithAudioElement(audioUrl);
  }

  /**
   * Decode browser-tts:// URL and play using Web Speech API SpeechSynthesis
   */
  private async playWithSpeechSynthesis(browserTtsUrl: string): Promise<void> {
    return new Promise((resolve) => {
      try {
        const encoded = browserTtsUrl.replace('browser-tts://', '');
        const decoded = atob(encoded);
        const payload = JSON.parse(decoded) as {
          text: string; voiceId: string; languageCode: string;
          voiceGender?: 'male' | 'female';
        };

        console.log('🔊 Web Speech API TTS | length:', payload.text.length);

        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(payload.text);
        const langCode = payload.languageCode || 'en-US';
        const langPrefix = langCode.split('-')[0];
        utterance.lang = langCode;
        utterance.rate = 0.92;
        utterance.pitch = 1.05;
        utterance.volume = 1.0;

        const pickVoice = () => {
          const voices = window.speechSynthesis.getVoices();
          const inLang = voices.filter((v) => v.lang.toLowerCase().startsWith(langPrefix));
          
          // Enhanced voice patterns for better Indian language support
          const FEMALE_RE = /female|samantha|victoria|karen|aria|ava|jenny|zira|kalpana|swara|lekha|veena|google.*hindi.*female|google.*tamil.*female|google.*telugu.*female|google.*kannada.*female|google.*bengali.*female|google.*us.*english.*female|emma|shruti/i;
          const MALE_RE   = /male|david|mark|alex|fred|daniel|google.*hindi.*male|google.*tamil.*male|google.*telugu.*male|google.*kannada.*male|google.*bengali.*male|google.*us.*english.*male|james|aaron|matthew|ravi|hemant/i;
          
          const wantMale = payload.voiceGender === 'male';
          
          // Try to find a voice matching both language and gender
          const preferred = inLang.find((v) => (wantMale ? MALE_RE : FEMALE_RE).test(v.name));
          
          // Fallback: any voice in the target language, or English
          const chosen = preferred || inLang[0] || voices.find((v) => v.lang.startsWith('en'));
          
          if (chosen) {
            utterance.voice = chosen;
            console.log(`🔊 Voice (${payload.voiceGender || 'female'}):`, chosen.name, chosen.lang);
          } else {
            console.warn(`⚠️ No suitable voice found for ${langCode}, using default`);
          }
        };

        if (window.speechSynthesis.getVoices().length === 0) {
          window.speechSynthesis.addEventListener('voiceschanged', pickVoice, { once: true });
        } else {
          pickVoice();
        }

        utterance.onstart = () => { lipSyncService.startSimpleLipSync(); };
        // Drive a mouth pulse per word boundary, plus a sentence-end head nod
        // when the current word ends a sentence — gives Haru rhythm + emphasis.
        utterance.onboundary = (ev) => {
          if (ev.name === 'word') {
            lipSyncService.pulseFromBoundary();
            // SpeechSynthesisEvent doesn't expose the word — use charIndex+length
            // to inspect the trailing punctuation in the source text.
            const idx = ev.charIndex ?? 0;
            const len = (ev as any).charLength ?? 0;
            const tail = payload.text.slice(idx + len, idx + len + 2);
            if (/^\s*[.!?।]/.test(tail)) idleAnimator.nodOnce(0.8);
          }
        };
        utterance.onend = () => { lipSyncService.stopLipSync(); resolve(); };
        utterance.onerror = (e) => {
          console.error('SpeechSynthesis error:', e.error);
          lipSyncService.stopLipSync();
          resolve(); // Graceful — don't block the teaching flow
        };

        window.speechSynthesis.speak(utterance);
      } catch (error) {
        console.error('browser-tts parse error:', error);
        lipSyncService.stopLipSync();
        resolve();
      }
    });
  }

  /**
   * Play from HTTP audio URL using HTMLAudioElement with lip sync.
   * For ElevenLabs (`data:audio/mpeg;base64,...`) and S3 URLs alike.
   * Periodic nods give the impression of natural sentence-end emphasis since
   * HTMLAudio has no word-boundary events to hook into.
   */
  private async playWithAudioElement(audioUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.stopAudio();
      this.currentAudio = new Audio(audioUrl);
      let nodTimer: ReturnType<typeof setInterval> | null = null;
      const stopNods = () => { if (nodTimer) { clearInterval(nodTimer); nodTimer = null; } };

      this.currentAudio.onended = () => { stopNods(); lipSyncService.stopLipSync(); resolve(); };
      this.currentAudio.onerror = () => { stopNods(); lipSyncService.stopLipSync(); reject(new Error('Audio playback failed')); };
      this.currentAudio.onplay = () => {
        lipSyncService.startLipSync(this.currentAudio!);
        // First nod ~700ms in (after the opening clause), then every 6.5s.
        setTimeout(() => idleAnimator.nodOnce(0.7), 700);
        nodTimer = setInterval(() => idleAnimator.nodOnce(0.7), 6500);
      };
      this.currentAudio.play().catch((e) => { stopNods(); lipSyncService.stopLipSync(); reject(e); });
    });
  }

  /**
   * Stop all audio (Web Speech API + HTMLAudio) and lip sync
   */
  public stopAudio(): void {
    if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    lipSyncService.stopLipSync();
  }

  public isPlaying(): boolean {
    return window.speechSynthesis.speaking || (this.currentAudio !== null && !this.currentAudio.paused);
  }

  public destroy(): void {
    this.stopAudio();
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') this.mediaRecorder.stop();
  }
}

// Singleton instance
export const speechController = new SpeechController();
