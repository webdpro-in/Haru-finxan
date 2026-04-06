/**
 * AudioStreamingService - Handles streaming audio responses
 * 
 * Implements:
 * - Audio chunk streaming
 * - Progressive playback
 * - Queue management for multiple audio segments
 * - Synchronization with lip sync
 */

import { lipSyncService } from './LipSyncService';

export interface AudioChunk {
  data: ArrayBuffer | Blob;
  index: number;
  isFinal: boolean;
}

export interface StreamingConfig {
  bufferSize: number; // Number of chunks to buffer before playing
  autoPlay: boolean;
  onProgress?: (progress: number) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

export class AudioStreamingService {
  private audioContext: AudioContext | null = null;
  private audioQueue: AudioBuffer[] = [];
  private isPlaying = false;
  private currentSource: AudioBufferSourceNode | null = null;
  private nextStartTime = 0;
  private config: StreamingConfig;
  private chunksReceived = 0;
  private chunksPlayed = 0;
  private totalChunks = 0;
  private htmlAudioElement: HTMLAudioElement | null = null;
  
  constructor(config: Partial<StreamingConfig> = {}) {
    this.config = {
      bufferSize: 2,
      autoPlay: true,
      ...config
    };
    
    this.initializeAudioContext();
  }
  
  /**
   * Initialize Web Audio API context
   */
  private initializeAudioContext(): void {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass();
    } catch (error) {
      console.error('Failed to initialize AudioContext:', error);
    }
  }
  
  /**
   * Add audio chunk to streaming queue
   */
  public async addChunk(chunk: AudioChunk): Promise<void> {
    try {
      this.chunksReceived++;
      
      if (chunk.isFinal) {
        this.totalChunks = chunk.index + 1;
      }
      
      // Convert chunk to AudioBuffer
      const audioBuffer = await this.decodeAudioData(chunk.data);
      
      if (audioBuffer) {
        this.audioQueue.push(audioBuffer);
        
        // Start playing if buffer threshold reached
        if (this.config.autoPlay && !this.isPlaying && this.audioQueue.length >= this.config.bufferSize) {
          this.startPlayback();
        }
      }
      
      this.updateProgress();
    } catch (error) {
      console.error('Error adding audio chunk:', error);
      if (this.config.onError) {
        this.config.onError(error as Error);
      }
    }
  }
  
  /**
   * Decode audio data to AudioBuffer
   */
  private async decodeAudioData(data: ArrayBuffer | Blob): Promise<AudioBuffer | null> {
    if (!this.audioContext) {
      console.error('AudioContext not initialized');
      return null;
    }
    
    try {
      let arrayBuffer: ArrayBuffer;
      
      if (data instanceof Blob) {
        arrayBuffer = await data.arrayBuffer();
      } else {
        arrayBuffer = data;
      }
      
      return await this.audioContext.decodeAudioData(arrayBuffer);
    } catch (error) {
      console.error('Error decoding audio data:', error);
      return null;
    }
  }
  
  /**
   * Start playback of queued audio
   */
  private startPlayback(): void {
    if (!this.audioContext || this.isPlaying) {
      return;
    }
    
    this.isPlaying = true;
    this.nextStartTime = this.audioContext.currentTime;
    
    // Start lip sync
    lipSyncService.startSimpleLipSync();
    
    this.playNextChunk();
  }
  
  /**
   * Play next chunk in queue
   */
  private playNextChunk(): void {
    if (!this.audioContext || this.audioQueue.length === 0) {
      // Check if all chunks have been played
      if (this.totalChunks > 0 && this.chunksPlayed >= this.totalChunks) {
        this.handlePlaybackComplete();
      }
      return;
    }
    
    const audioBuffer = this.audioQueue.shift()!;
    
    try {
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      
      // Schedule playback
      source.start(this.nextStartTime);
      this.nextStartTime += audioBuffer.duration;
      
      this.currentSource = source;
      this.chunksPlayed++;
      
      // Play next chunk when this one ends
      source.onended = () => {
        this.updateProgress();
        this.playNextChunk();
      };
      
      this.updateProgress();
    } catch (error) {
      console.error('Error playing audio chunk:', error);
      if (this.config.onError) {
        this.config.onError(error as Error);
      }
    }
  }
  
  /**
   * Update playback progress
   */
  private updateProgress(): void {
    if (this.config.onProgress && this.totalChunks > 0) {
      const progress = (this.chunksPlayed / this.totalChunks) * 100;
      this.config.onProgress(progress);
    }
  }
  
  /**
   * Handle playback completion
   */
  private handlePlaybackComplete(): void {
    this.isPlaying = false;
    this.currentSource = null;
    this.nextStartTime = 0;
    
    // Stop lip sync
    lipSyncService.stopLipSync();
    
    if (this.config.onComplete) {
      this.config.onComplete();
    }
    
    console.log('✅ Audio streaming completed');
  }
  
  /**
   * Stream audio from URL (for non-chunked audio)
   */
  public async streamFromURL(url: string): Promise<void> {
    try {
      // Check if it's a browser-tts:// URL
      if (url.startsWith('browser-tts://')) {
        return this.playBrowserTTS(url);
      }
      
      // Use HTMLAudioElement for HTTP URLs
      return this.playHTMLAudio(url);
    } catch (error) {
      console.error('Error streaming from URL:', error);
      if (this.config.onError) {
        this.config.onError(error as Error);
      }
      throw error;
    }
  }
  
  /**
   * Play browser TTS URL
   */
  private async playBrowserTTS(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const encoded = url.replace('browser-tts://', '');
        const decoded = atob(encoded);
        const payload = JSON.parse(decoded) as { text: string; voiceId: string; languageCode: string };
        
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(payload.text);
        utterance.rate = 0.92;
        utterance.pitch = 1.05;
        utterance.volume = 1.0;
        
        utterance.onstart = () => {
          this.isPlaying = true;
          lipSyncService.startSimpleLipSync();
        };
        
        utterance.onend = () => {
          this.isPlaying = false;
          lipSyncService.stopLipSync();
          if (this.config.onComplete) {
            this.config.onComplete();
          }
          resolve();
        };
        
        utterance.onerror = (event) => {
          this.isPlaying = false;
          lipSyncService.stopLipSync();
          const error = new Error(`TTS error: ${event.error}`);
          if (this.config.onError) {
            this.config.onError(error);
          }
          reject(error);
        };
        
        window.speechSynthesis.speak(utterance);
      } catch (error) {
        this.isPlaying = false;
        lipSyncService.stopLipSync();
        reject(error);
      }
    });
  }
  
  /**
   * Play HTML audio element
   */
  private async playHTMLAudio(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.stopPlayback();
      
      this.htmlAudioElement = new Audio(url);
      
      this.htmlAudioElement.onplay = () => {
        this.isPlaying = true;
        lipSyncService.startLipSync(this.htmlAudioElement!);
      };
      
      this.htmlAudioElement.ontimeupdate = () => {
        if (this.htmlAudioElement && this.config.onProgress) {
          const progress = (this.htmlAudioElement.currentTime / this.htmlAudioElement.duration) * 100;
          this.config.onProgress(progress);
        }
      };
      
      this.htmlAudioElement.onended = () => {
        this.isPlaying = false;
        lipSyncService.stopLipSync();
        if (this.config.onComplete) {
          this.config.onComplete();
        }
        resolve();
      };
      
      this.htmlAudioElement.onerror = () => {
        this.isPlaying = false;
        lipSyncService.stopLipSync();
        const error = new Error('Audio playback failed');
        if (this.config.onError) {
          this.config.onError(error);
        }
        reject(error);
      };
      
      this.htmlAudioElement.play().catch((error) => {
        this.isPlaying = false;
        lipSyncService.stopLipSync();
        if (this.config.onError) {
          this.config.onError(error);
        }
        reject(error);
      });
    });
  }
  
  /**
   * Stop playback
   */
  public stopPlayback(): void {
    // Stop Web Audio API playback
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch (error) {
        // Ignore errors if already stopped
      }
      this.currentSource = null;
    }
    
    // Stop HTML Audio playback
    if (this.htmlAudioElement) {
      this.htmlAudioElement.pause();
      this.htmlAudioElement.currentTime = 0;
      this.htmlAudioElement = null;
    }
    
    // Stop Web Speech API
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    
    // Clear queue
    this.audioQueue = [];
    this.isPlaying = false;
    this.nextStartTime = 0;
    
    // Stop lip sync
    lipSyncService.stopLipSync();
    
    console.log('🛑 Audio playback stopped');
  }
  
  /**
   * Pause playback
   */
  public pausePlayback(): void {
    if (this.htmlAudioElement && !this.htmlAudioElement.paused) {
      this.htmlAudioElement.pause();
      this.isPlaying = false;
      lipSyncService.stopLipSync();
    }
    
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      this.isPlaying = false;
      lipSyncService.stopLipSync();
    }
  }
  
  /**
   * Resume playback
   */
  public resumePlayback(): void {
    if (this.htmlAudioElement && this.htmlAudioElement.paused) {
      this.htmlAudioElement.play();
      this.isPlaying = true;
      lipSyncService.startLipSync(this.htmlAudioElement);
    }
    
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      this.isPlaying = true;
      lipSyncService.startSimpleLipSync();
    }
  }
  
  /**
   * Check if currently playing
   */
  public getIsPlaying(): boolean {
    return this.isPlaying;
  }
  
  /**
   * Get current playback progress (0-100)
   */
  public getProgress(): number {
    if (this.htmlAudioElement) {
      return (this.htmlAudioElement.currentTime / this.htmlAudioElement.duration) * 100;
    }
    
    if (this.totalChunks > 0) {
      return (this.chunksPlayed / this.totalChunks) * 100;
    }
    
    return 0;
  }
  
  /**
   * Reset streaming state
   */
  public reset(): void {
    this.stopPlayback();
    this.chunksReceived = 0;
    this.chunksPlayed = 0;
    this.totalChunks = 0;
  }
  
  /**
   * Cleanup resources
   */
  public destroy(): void {
    this.stopPlayback();
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// Singleton instance
export const audioStreamingService = new AudioStreamingService();
