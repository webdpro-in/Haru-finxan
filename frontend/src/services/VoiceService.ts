/**
 * VoiceService - Comprehensive Voice Interaction System
 * 
 * Implements Task Group 4: Voice Interaction System
 * - Web Speech API integration (STT & TTS)
 * - Voice metrics capture (pause count, filler words)
 * - Text input fallback
 * - Multi-language support
 * - Audio streaming for responses
 */

export interface VoiceMetrics {
  pauseCount: number;
  fillerWordCount: number;
  totalPauseDuration: number; // milliseconds
  fillerWords: string[];
  responseTime: number; // milliseconds from start to first speech
  totalDuration: number; // milliseconds
  averagePauseDuration: number; // milliseconds
  speechRate: number; // words per minute
}

export interface VoiceConfig {
  language: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  silenceThreshold: number; // milliseconds
}

export interface TTSConfig {
  language: string;
  rate: number;
  pitch: number;
  volume: number;
  voiceName?: string;
}

export interface VoiceRecognitionResult {
  transcript: string;
  isFinal: boolean;
  confidence: number;
  metrics: VoiceMetrics;
}

// Filler words to detect across multiple languages
const FILLER_WORDS: Record<string, string[]> = {
  'en': ['um', 'uh', 'like', 'you know', 'i mean', 'sort of', 'kind of', 'basically', 'actually', 'literally'],
  'hi': ['उम', 'आह', 'मतलब', 'यानी', 'जैसे'],
  'ta': ['உம்', 'ஆ', 'அதாவது'],
  'te': ['అమ్', 'ఆ', 'అంటే'],
  'bn': ['উম', 'আহ', 'মানে']
};

export class VoiceService {
  private recognition: SpeechRecognition | null = null;
  private synthesis: SpeechSynthesis | null = null;
  private isListening = false;
  private isSpeaking = false;
  
  // Metrics tracking
  private startTime: number = 0;
  private firstSpeechTime: number = 0;
  private lastSpeechTime: number = 0;
  private pauseStartTime: number = 0;
  private pauseCount = 0;
  private totalPauseDuration = 0;
  private fillerWordCount = 0;
  private detectedFillerWords: string[] = [];
  private wordCount = 0;
  
  // Configuration
  private config: VoiceConfig = {
    language: 'en-US',
    continuous: true,
    interimResults: true,
    maxAlternatives: 1,
    silenceThreshold: 1000
  };
  
  private ttsConfig: TTSConfig = {
    language: 'en-US',
    rate: 0.92,
    pitch: 1.05,
    volume: 1.0
  };
  
  // Callbacks
  private onTranscriptCallback?: (result: VoiceRecognitionResult) => void;
  private onCompleteCallback?: (result: VoiceRecognitionResult) => void;
  private onErrorCallback?: (error: string) => void;
  private onSpeechStartCallback?: () => void;
  private onSpeechEndCallback?: () => void;
  
  // Accumulated text
  private accumulatedText = '';
  private silenceTimer?: NodeJS.Timeout;
  
  constructor() {
    this.initializeSpeechRecognition();
    this.initializeSpeechSynthesis();
  }
  
  /**
   * Initialize Web Speech API Speech Recognition
   */
  private initializeSpeechRecognition(): void {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('Speech Recognition not supported in this browser');
      return;
    }
    
    this.recognition = new SpeechRecognition();
    this.setupRecognitionHandlers();
  }
  
  /**
   * Initialize Web Speech API Speech Synthesis
   */
  private initializeSpeechSynthesis(): void {
    if ('speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis;
    } else {
      console.warn('Speech Synthesis not supported in this browser');
    }
  }
  
  /**
   * Setup recognition event handlers
   */
  private setupRecognitionHandlers(): void {
    if (!this.recognition) return;
    
    this.recognition.continuous = this.config.continuous;
    this.recognition.interimResults = this.config.interimResults;
    this.recognition.lang = this.config.language;
    this.recognition.maxAlternatives = this.config.maxAlternatives;
    
    this.recognition.onstart = () => {
      console.log('🎤 Voice recognition started');
      this.startTime = Date.now();
      this.firstSpeechTime = 0;
      this.resetMetrics();
    };
    
    this.recognition.onspeechstart = () => {
      console.log('🗣️ Speech detected');
      
      if (this.firstSpeechTime === 0) {
        this.firstSpeechTime = Date.now();
      }
      
      // Calculate pause duration if there was a pause
      if (this.pauseStartTime > 0) {
        const pauseDuration = Date.now() - this.pauseStartTime;
        this.totalPauseDuration += pauseDuration;
        this.pauseCount++;
        this.pauseStartTime = 0;
      }
      
      this.lastSpeechTime = Date.now();
      this.clearSilenceTimer();
      
      if (this.onSpeechStartCallback) {
        this.onSpeechStartCallback();
      }
    };
    
    this.recognition.onspeechend = () => {
      console.log('🔇 Speech ended');
      this.pauseStartTime = Date.now();
      this.startSilenceTimer();
      
      if (this.onSpeechEndCallback) {
        this.onSpeechEndCallback();
      }
    };
    
    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      this.clearSilenceTimer();
      
      let interimTranscript = '';
      let finalTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        const confidence = result[0].confidence;
        
        if (result.isFinal) {
          finalTranscript += transcript + ' ';
          this.accumulatedText += transcript + ' ';
          
          // Analyze for filler words
          this.analyzeFillerWords(transcript);
          
          // Count words for speech rate
          this.wordCount += transcript.trim().split(/\s+/).length;
        } else {
          interimTranscript += transcript;
        }
      }
      
      // Send interim results
      if (interimTranscript && this.onTranscriptCallback) {
        const metrics = this.calculateMetrics(false);
        this.onTranscriptCallback({
          transcript: this.accumulatedText + interimTranscript,
          isFinal: false,
          confidence: 0,
          metrics
        });
      }
      
      // Send final results
      if (finalTranscript && this.onTranscriptCallback) {
        const metrics = this.calculateMetrics(true);
        this.onTranscriptCallback({
          transcript: this.accumulatedText.trim(),
          isFinal: true,
          confidence: event.results[event.results.length - 1][0].confidence,
          metrics
        });
      }
      
      this.startSilenceTimer();
    };
    
    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      
      // Don't treat 'no-speech' as critical error
      if (event.error === 'no-speech') {
        console.log('No speech detected, continuing...');
        return;
      }
      
      if (this.onErrorCallback) {
        this.onErrorCallback(event.error);
      }
      
      // Auto-restart on certain errors
      if (event.error === 'network' || event.error === 'audio-capture') {
        setTimeout(() => {
          if (this.isListening) {
            this.restartRecognition();
          }
        }, 1000);
      }
    };
    
    this.recognition.onend = () => {
      console.log('Recognition ended');
      
      // Auto-restart if still supposed to be listening
      if (this.isListening) {
        console.log('Auto-restarting recognition...');
        setTimeout(() => {
          if (this.isListening) {
            this.restartRecognition();
          }
        }, 100);
      }
    };
  }
  
  /**
   * Analyze text for filler words
   */
  private analyzeFillerWords(text: string): void {
    const lowerText = text.toLowerCase();
    const langCode = this.config.language.split('-')[0];
    const fillerWords = FILLER_WORDS[langCode] || FILLER_WORDS['en'];
    
    for (const filler of fillerWords) {
      const regex = new RegExp(`\\b${filler}\\b`, 'gi');
      const matches = lowerText.match(regex);
      
      if (matches) {
        this.fillerWordCount += matches.length;
        this.detectedFillerWords.push(...matches);
      }
    }
  }
  
  /**
   * Calculate current voice metrics
   */
  private calculateMetrics(isFinal: boolean): VoiceMetrics {
    const now = Date.now();
    const totalDuration = now - this.startTime;
    const responseTime = this.firstSpeechTime > 0 ? this.firstSpeechTime - this.startTime : 0;
    
    // Calculate speech rate (words per minute)
    const durationMinutes = totalDuration / 60000;
    const speechRate = durationMinutes > 0 ? this.wordCount / durationMinutes : 0;
    
    // Calculate average pause duration
    const averagePauseDuration = this.pauseCount > 0 ? this.totalPauseDuration / this.pauseCount : 0;
    
    return {
      pauseCount: this.pauseCount,
      fillerWordCount: this.fillerWordCount,
      totalPauseDuration: this.totalPauseDuration,
      fillerWords: [...this.detectedFillerWords],
      responseTime,
      totalDuration,
      averagePauseDuration,
      speechRate: Math.round(speechRate)
    };
  }
  
  /**
   * Reset metrics for new session
   */
  private resetMetrics(): void {
    this.pauseCount = 0;
    this.totalPauseDuration = 0;
    this.fillerWordCount = 0;
    this.detectedFillerWords = [];
    this.wordCount = 0;
    this.pauseStartTime = 0;
  }
  
  /**
   * Start silence detection timer
   */
  private startSilenceTimer(): void {
    this.clearSilenceTimer();
    
    this.silenceTimer = setTimeout(() => {
      if (this.accumulatedText.trim()) {
        console.log('✅ Silence detected - processing speech');
        const finalText = this.accumulatedText.trim();
        const metrics = this.calculateMetrics(true);
        
        this.accumulatedText = '';
        
        if (this.onCompleteCallback) {
          this.onCompleteCallback({
            transcript: finalText,
            isFinal: true,
            confidence: 1,
            metrics
          });
        }
      }
    }, this.config.silenceThreshold);
  }
  
  /**
   * Clear silence timer
   */
  private clearSilenceTimer(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = undefined;
    }
  }
  
  /**
   * Restart recognition
   */
  private restartRecognition(): void {
    try {
      if (this.recognition) {
        this.recognition.stop();
        setTimeout(() => {
          if (this.recognition) {
            this.recognition.start();
          }
        }, 100);
      }
    } catch (error) {
      console.error('Error restarting recognition:', error);
    }
  }
  
  /**
   * Start listening for voice input
   */
  public async startListening(): Promise<void> {
    if (!this.recognition) {
      throw new Error('Speech recognition not supported');
    }
    
    if (this.isListening) {
      console.warn('Already listening');
      return;
    }
    
    try {
      this.isListening = true;
      this.accumulatedText = '';
      this.recognition.start();
      console.log('🎙️ Voice listening started');
    } catch (error) {
      this.isListening = false;
      console.error('Failed to start listening:', error);
      throw error;
    }
  }
  
  /**
   * Stop listening
   */
  public stopListening(): void {
    if (!this.recognition || !this.isListening) {
      return;
    }
    
    this.isListening = false;
    this.clearSilenceTimer();
    
    try {
      this.recognition.stop();
      console.log('🛑 Voice listening stopped');
    } catch (error) {
      console.error('Error stopping recognition:', error);
    }
  }
  
  /**
   * Speak text using TTS
   */
  public async speak(text: string, config?: Partial<TTSConfig>): Promise<void> {
    if (!this.synthesis) {
      throw new Error('Speech synthesis not supported');
    }
    
    if (this.isSpeaking) {
      this.stopSpeaking();
    }
    
    const finalConfig = { ...this.ttsConfig, ...config };
    
    return new Promise((resolve, reject) => {
      try {
        this.synthesis!.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = finalConfig.rate;
        utterance.pitch = finalConfig.pitch;
        utterance.volume = finalConfig.volume;
        utterance.lang = finalConfig.language;
        
        // Select voice
        this.selectVoice(utterance, finalConfig);
        
        utterance.onstart = () => {
          this.isSpeaking = true;
          console.log('🔊 TTS started');
        };
        
        utterance.onend = () => {
          this.isSpeaking = false;
          console.log('✅ TTS completed');
          resolve();
        };
        
        utterance.onerror = (event) => {
          this.isSpeaking = false;
          console.error('TTS error:', event.error);
          reject(new Error(`TTS error: ${event.error}`));
        };
        
        this.synthesis!.speak(utterance);
      } catch (error) {
        this.isSpeaking = false;
        reject(error);
      }
    });
  }
  
  /**
   * Select appropriate voice for TTS
   */
  private selectVoice(utterance: SpeechSynthesisUtterance, config: TTSConfig): void {
    const voices = this.synthesis!.getVoices();
    
    if (voices.length === 0) {
      // Voices not loaded yet, wait for them
      this.synthesis!.addEventListener('voiceschanged', () => {
        this.selectVoiceFromList(utterance, config, this.synthesis!.getVoices());
      }, { once: true });
    } else {
      this.selectVoiceFromList(utterance, config, voices);
    }
  }
  
  /**
   * Select voice from available voices
   */
  private selectVoiceFromList(utterance: SpeechSynthesisUtterance, config: TTSConfig, voices: SpeechSynthesisVoice[]): void {
    const langCode = config.language.split('-')[0];
    
    // Try to find specific voice name if provided
    if (config.voiceName) {
      const namedVoice = voices.find(v => v.name === config.voiceName);
      if (namedVoice) {
        utterance.voice = namedVoice;
        console.log('🔊 Selected voice:', namedVoice.name);
        return;
      }
    }
    
    // Try to find female voice for better student engagement
    const femaleVoice = voices.find(v =>
      v.lang.startsWith(langCode) &&
      (v.name.includes('Female') || v.name.includes('Samantha') ||
       v.name.includes('Victoria') || v.name.includes('Karen') ||
       v.name.includes('Aria') || v.name.includes('Ava') ||
       v.name.includes('Jenny') || v.name.includes('Zira'))
    );
    
    if (femaleVoice) {
      utterance.voice = femaleVoice;
      console.log('🔊 Selected voice:', femaleVoice.name);
      return;
    }
    
    // Fallback to any voice matching language
    const langVoice = voices.find(v => v.lang.startsWith(langCode));
    if (langVoice) {
      utterance.voice = langVoice;
      console.log('🔊 Selected voice:', langVoice.name);
    }
  }
  
  /**
   * Stop speaking
   */
  public stopSpeaking(): void {
    if (this.synthesis && this.isSpeaking) {
      this.synthesis.cancel();
      this.isSpeaking = false;
      console.log('🛑 TTS stopped');
    }
  }
  
  /**
   * Get available voices
   */
  public getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!this.synthesis) {
      return [];
    }
    return this.synthesis.getVoices();
  }
  
  /**
   * Configure voice recognition
   */
  public configure(config: Partial<VoiceConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (this.recognition) {
      this.recognition.lang = this.config.language;
      this.recognition.continuous = this.config.continuous;
      this.recognition.interimResults = this.config.interimResults;
      this.recognition.maxAlternatives = this.config.maxAlternatives;
    }
  }
  
  /**
   * Configure TTS
   */
  public configureTTS(config: Partial<TTSConfig>): void {
    this.ttsConfig = { ...this.ttsConfig, ...config };
  }
  
  /**
   * Register callbacks
   */
  public onTranscript(callback: (result: VoiceRecognitionResult) => void): void {
    this.onTranscriptCallback = callback;
  }
  
  public onComplete(callback: (result: VoiceRecognitionResult) => void): void {
    this.onCompleteCallback = callback;
  }
  
  public onError(callback: (error: string) => void): void {
    this.onErrorCallback = callback;
  }
  
  public onSpeechStart(callback: () => void): void {
    this.onSpeechStartCallback = callback;
  }
  
  public onSpeechEnd(callback: () => void): void {
    this.onSpeechEndCallback = callback;
  }
  
  /**
   * Check if voice recognition is supported
   */
  public static isRecognitionSupported(): boolean {
    return !!(
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    );
  }
  
  /**
   * Check if speech synthesis is supported
   */
  public static isSynthesisSupported(): boolean {
    return 'speechSynthesis' in window;
  }
  
  /**
   * Check if currently listening
   */
  public getIsListening(): boolean {
    return this.isListening;
  }
  
  /**
   * Check if currently speaking
   */
  public getIsSpeaking(): boolean {
    return this.isSpeaking;
  }
  
  /**
   * Cleanup
   */
  public destroy(): void {
    this.stopListening();
    this.stopSpeaking();
    this.clearSilenceTimer();
  }
}

// Singleton instance
export const voiceService = new VoiceService();
