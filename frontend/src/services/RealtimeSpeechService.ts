/**
 * Real-Time Speech Recognition Service
 * 
 * Provides continuous speech recognition with:
 * - Real-time transcription display
 * - Automatic pause detection (1 second)
 * - Modular design for easy engine replacement
 * - Natural conversation flow
 */

// Speech Recognition Interface (for easy engine replacement)
export interface ISpeechRecognitionEngine {
  start(): Promise<void>;
  stop(): void;
  isListening(): boolean;
  setLanguage(lang: string): void;
  onTranscript(callback: (text: string, isFinal: boolean) => void): void;
  onEnd(callback: (finalText: string) => void): void;
  onError(callback: (error: string) => void): void;
}

// Web Speech API Implementation
class WebSpeechEngine implements ISpeechRecognitionEngine {
  private recognition: any;
  private isActive = false;
  private transcriptCallback?: (text: string, isFinal: boolean) => void;
  private endCallback?: (finalText: string) => void;
  private errorCallback?: (error: string) => void;
  private accumulatedText = '';
  private silenceTimer?: NodeJS.Timeout;
  private readonly SILENCE_THRESHOLD = 1000; // 1 second

  constructor() {
    // Check browser support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      throw new Error('Speech Recognition not supported in this browser');
    }

    this.recognition = new SpeechRecognition();
    this.setupRecognition();
  }

  private setupRecognition() {
    // Configuration for continuous, real-time recognition
    this.recognition.continuous = true; // Keep listening
    this.recognition.interimResults = true; // Get partial results
    this.recognition.lang = 'en-US';
    this.recognition.maxAlternatives = 1;

    // Handle results (real-time transcription)
    this.recognition.onresult = (event: any) => {
      this.clearSilenceTimer();
      
      let interimTranscript = '';
      let finalTranscript = '';

      // Process all results
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
          this.accumulatedText += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      // Send interim results for real-time display
      if (interimTranscript && this.transcriptCallback) {
        this.transcriptCallback(
          this.accumulatedText + interimTranscript,
          false
        );
      }

      // Send final results
      if (finalTranscript && this.transcriptCallback) {
        this.transcriptCallback(this.accumulatedText.trim(), true);
      }

      // Start silence detection timer
      this.startSilenceTimer();
    };

    // Handle speech start
    this.recognition.onspeechstart = () => {
      console.log('🎤 Speech detected');
      this.clearSilenceTimer();
    };

    // Handle speech end
    this.recognition.onspeechend = () => {
      console.log('🔇 Speech ended');
      this.startSilenceTimer();
    };

    // Handle errors
    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      
      // Don't treat 'no-speech' as a critical error
      if (event.error === 'no-speech') {
        console.log('No speech detected, continuing to listen...');
        return;
      }

      if (this.errorCallback) {
        this.errorCallback(event.error);
      }

      // Auto-restart on certain errors
      if (event.error === 'network' || event.error === 'audio-capture') {
        setTimeout(() => {
          if (this.isActive) {
            this.restart();
          }
        }, 1000);
      }
    };

    // Handle recognition end (auto-restart for continuous listening)
    this.recognition.onend = () => {
      console.log('Recognition ended');
      
      // If we're still supposed to be listening, restart
      if (this.isActive) {
        console.log('Auto-restarting recognition...');
        setTimeout(() => {
          if (this.isActive) {
            this.recognition.start();
          }
        }, 100);
      }
    };
  }

  private startSilenceTimer() {
    this.clearSilenceTimer();
    
    // After 1 second of silence, consider speech complete
    this.silenceTimer = setTimeout(() => {
      if (this.accumulatedText.trim()) {
        console.log('✅ Silence detected - processing speech');
        const finalText = this.accumulatedText.trim();
        this.accumulatedText = '';
        
        if (this.endCallback) {
          this.endCallback(finalText);
        }
      }
    }, this.SILENCE_THRESHOLD);
  }

  private clearSilenceTimer() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = undefined;
    }
  }

  private restart() {
    try {
      this.recognition.stop();
      setTimeout(() => {
        this.recognition.start();
      }, 100);
    } catch (error) {
      console.error('Error restarting recognition:', error);
    }
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.isActive = true;
        this.accumulatedText = '';
        this.recognition.start();
        console.log('🎙️ Real-time speech recognition started');
        resolve();
      } catch (error) {
        this.isActive = false;
        reject(error);
      }
    });
  }

  stop() {
    this.isActive = false;
    this.clearSilenceTimer();
    
    try {
      this.recognition.stop();
      console.log('🛑 Speech recognition stopped');
    } catch (error) {
      console.error('Error stopping recognition:', error);
    }
  }

  isListening(): boolean {
    return this.isActive;
  }

  setLanguage(lang: string) {
    this.recognition.lang = lang;
  }

  onTranscript(callback: (text: string, isFinal: boolean) => void) {
    this.transcriptCallback = callback;
  }

  onEnd(callback: (finalText: string) => void) {
    this.endCallback = callback;
  }

  onError(callback: (error: string) => void) {
    this.errorCallback = callback;
  }
}

// Main Real-Time Speech Service
export class RealtimeSpeechService {
  private engine: ISpeechRecognitionEngine;
  private onTranscriptCallback?: (text: string, isFinal: boolean) => void;
  private onCompleteCallback?: (text: string) => void;
  private onErrorCallback?: (error: string) => void;

  constructor(engineType: 'webspeech' | 'deepgram' = 'webspeech') {
    // Factory pattern - easy to add new engines
    switch (engineType) {
      case 'webspeech':
        this.engine = new WebSpeechEngine();
        break;
      case 'deepgram':
        // Future: Implement DeepgramEngine
        throw new Error('Deepgram engine not yet implemented');
      default:
        throw new Error(`Unknown engine type: ${engineType}`);
    }

    this.setupCallbacks();
  }

  private setupCallbacks() {
    // Forward transcript updates
    this.engine.onTranscript((text, isFinal) => {
      if (this.onTranscriptCallback) {
        this.onTranscriptCallback(text, isFinal);
      }
    });

    // Forward completion events
    this.engine.onEnd((finalText) => {
      if (this.onCompleteCallback) {
        this.onCompleteCallback(finalText);
      }
    });

    // Forward errors
    this.engine.onError((error) => {
      if (this.onErrorCallback) {
        this.onErrorCallback(error);
      }
    });
  }

  /**
   * Start continuous listening
   */
  async startListening(): Promise<void> {
    try {
      await this.engine.start();
    } catch (error) {
      console.error('Failed to start listening:', error);
      throw error;
    }
  }

  /**
   * Stop listening
   */
  stopListening() {
    this.engine.stop();
  }

  /**
   * Check if currently listening
   */
  isListening(): boolean {
    return this.engine.isListening();
  }

  /**
   * Set the recognition language (e.g. 'en-US' or 'hi-IN').
   */
  setLanguage(lang: string) {
    this.engine.setLanguage(lang);
  }

  /**
   * Register callback for real-time transcript updates
   * @param callback - Called with (text, isFinal) on each update
   */
  onTranscript(callback: (text: string, isFinal: boolean) => void) {
    this.onTranscriptCallback = callback;
  }

  /**
   * Register callback for speech completion (after 1s pause)
   * @param callback - Called with final text when speech is complete
   */
  onComplete(callback: (text: string) => void) {
    this.onCompleteCallback = callback;
  }

  /**
   * Register callback for errors
   * @param callback - Called with error message
   */
  onError(callback: (error: string) => void) {
    this.onErrorCallback = callback;
  }

  /**
   * Check if browser supports speech recognition
   */
  static isSupported(): boolean {
    return !!(
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    );
  }
}

// Singleton instance
export const realtimeSpeechService = new RealtimeSpeechService('webspeech');
