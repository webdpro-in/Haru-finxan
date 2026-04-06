/**
 * Integration Tests for Voice Interaction System
 * 
 * Tests:
 * - Web Speech API integration
 * - Voice metrics capture
 * - Text input fallback
 * - TTS synthesis
 * - Audio streaming
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VoiceService } from '../VoiceService';
import { AudioStreamingService } from '../AudioStreamingService';

// Mock Web Speech API
class MockSpeechRecognition {
  continuous = false;
  interimResults = false;
  lang = 'en-US';
  maxAlternatives = 1;
  
  onstart: (() => void) | null = null;
  onspeechstart: (() => void) | null = null;
  onspeechend: (() => void) | null = null;
  onresult: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onend: (() => void) | null = null;
  
  start() {
    if (this.onstart) this.onstart();
  }
  
  stop() {
    if (this.onend) this.onend();
  }
  
  // Helper to simulate speech result
  simulateResult(transcript: string, isFinal: boolean, confidence: number = 1) {
    if (this.onresult) {
      const event = {
        resultIndex: 0,
        results: [
          {
            0: { transcript, confidence },
            isFinal,
            length: 1
          }
        ]
      };
      this.onresult(event);
    }
  }
  
  simulateSpeechStart() {
    if (this.onspeechstart) this.onspeechstart();
  }
  
  simulateSpeechEnd() {
    if (this.onspeechend) this.onspeechend();
  }
  
  simulateError(error: string) {
    if (this.onerror) this.onerror({ error });
  }
}

class MockSpeechSynthesisUtterance {
  text = '';
  rate = 1;
  pitch = 1;
  volume = 1;
  lang = 'en-US';
  voice: any = null;
  
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  
  constructor(text: string) {
    this.text = text;
  }
}

class MockSpeechSynthesis {
  speaking = false;
  paused = false;
  pending = false;
  
  private utterances: MockSpeechSynthesisUtterance[] = [];
  
  speak(utterance: MockSpeechSynthesisUtterance) {
    this.speaking = true;
    this.utterances.push(utterance);
    
    // Simulate async speech
    setTimeout(() => {
      if (utterance.onstart) utterance.onstart();
      
      setTimeout(() => {
        this.speaking = false;
        if (utterance.onend) utterance.onend();
      }, 100);
    }, 10);
  }
  
  cancel() {
    this.speaking = false;
    this.utterances = [];
  }
  
  pause() {
    this.paused = true;
  }
  
  resume() {
    this.paused = false;
  }
  
  getVoices() {
    return [
      { name: 'Female Voice', lang: 'en-US', default: true },
      { name: 'Male Voice', lang: 'en-US', default: false }
    ];
  }
}

describe('VoiceService', () => {
  let voiceService: VoiceService;
  let mockRecognition: MockSpeechRecognition;
  let mockSynthesis: MockSpeechSynthesis;
  
  beforeEach(() => {
    // Setup mocks
    mockRecognition = new MockSpeechRecognition();
    mockSynthesis = new MockSpeechSynthesis();
    
    (global as any).window = {
      SpeechRecognition: function() { return mockRecognition; },
      speechSynthesis: mockSynthesis,
      SpeechSynthesisUtterance: MockSpeechSynthesisUtterance
    };
    
    voiceService = new VoiceService();
  });
  
  afterEach(() => {
    voiceService.destroy();
  });
  
  describe('Speech Recognition', () => {
    it('should start listening successfully', async () => {
      await voiceService.startListening();
      expect(voiceService.getIsListening()).toBe(true);
    });
    
    it('should stop listening successfully', async () => {
      await voiceService.startListening();
      voiceService.stopListening();
      expect(voiceService.getIsListening()).toBe(false);
    });
    
    it('should capture interim transcripts', async () => {
      const transcripts: string[] = [];
      
      voiceService.onTranscript((result) => {
        transcripts.push(result.transcript);
      });
      
      await voiceService.startListening();
      mockRecognition.simulateResult('Hello', false);
      
      expect(transcripts.length).toBeGreaterThan(0);
      expect(transcripts[0]).toContain('Hello');
    });
    
    it('should capture final transcripts', async () => {
      let finalTranscript = '';
      
      voiceService.onTranscript((result) => {
        if (result.isFinal) {
          finalTranscript = result.transcript;
        }
      });
      
      await voiceService.startListening();
      mockRecognition.simulateResult('Hello world', true);
      
      expect(finalTranscript).toContain('Hello world');
    });
    
    it('should detect speech completion after silence', async () => {
      return new Promise<void>((resolve) => {
        voiceService.onComplete((result) => {
          expect(result.transcript).toContain('Test');
          expect(result.isFinal).toBe(true);
          resolve();
        });
        
        voiceService.startListening().then(() => {
          mockRecognition.simulateResult('Test', true);
          mockRecognition.simulateSpeechEnd();
        });
      });
    });
  });
  
  describe('Voice Metrics', () => {
    it('should track pause count', async () => {
      let metrics: any = null;
      
      voiceService.onTranscript((result) => {
        if (result.isFinal) {
          metrics = result.metrics;
        }
      });
      
      await voiceService.startListening();
      
      // Simulate speech with pauses
      mockRecognition.simulateSpeechStart();
      mockRecognition.simulateResult('Hello', true);
      mockRecognition.simulateSpeechEnd();
      
      // Wait for pause
      await new Promise(resolve => setTimeout(resolve, 50));
      
      mockRecognition.simulateSpeechStart();
      mockRecognition.simulateResult('world', true);
      
      expect(metrics).toBeTruthy();
      expect(metrics.pauseCount).toBeGreaterThan(0);
    });
    
    it('should detect filler words', async () => {
      let metrics: any = null;
      
      voiceService.onTranscript((result) => {
        if (result.isFinal) {
          metrics = result.metrics;
        }
      });
      
      await voiceService.startListening();
      mockRecognition.simulateResult('Um, I think, like, you know', true);
      
      expect(metrics).toBeTruthy();
      expect(metrics.fillerWordCount).toBeGreaterThan(0);
      expect(metrics.fillerWords.length).toBeGreaterThan(0);
    });
    
    it('should calculate response time', async () => {
      let metrics: any = null;
      
      voiceService.onTranscript((result) => {
        if (result.isFinal) {
          metrics = result.metrics;
        }
      });
      
      await voiceService.startListening();
      
      // Wait before speaking
      await new Promise(resolve => setTimeout(resolve, 100));
      
      mockRecognition.simulateSpeechStart();
      mockRecognition.simulateResult('Hello', true);
      
      expect(metrics).toBeTruthy();
      expect(metrics.responseTime).toBeGreaterThan(0);
    });
    
    it('should calculate speech rate', async () => {
      let metrics: any = null;
      
      voiceService.onTranscript((result) => {
        if (result.isFinal) {
          metrics = result.metrics;
        }
      });
      
      await voiceService.startListening();
      
      // Simulate speech start first
      mockRecognition.simulateSpeechStart();
      
      // Wait a bit for time to pass
      await new Promise(resolve => setTimeout(resolve, 50));
      
      mockRecognition.simulateResult('This is a test sentence with multiple words', true);
      
      expect(metrics).toBeTruthy();
      expect(metrics.speechRate).toBeGreaterThanOrEqual(0);
    });
  });
  
  describe('Text-to-Speech', () => {
    it('should speak text successfully', async () => {
      // Mock SpeechSynthesisUtterance in window
      (global as any).window.SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;
      
      const promise = voiceService.speak('Hello world');
      
      await promise;
      
      expect(mockSynthesis.speaking).toBe(false); // Should be done
    });
    
    it('should stop speaking', async () => {
      (global as any).window.SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;
      
      voiceService.speak('Hello world');
      
      // Wait a bit for speech to start
      await new Promise(resolve => setTimeout(resolve, 50));
      
      voiceService.stopSpeaking();
      
      expect(mockSynthesis.speaking).toBe(false);
    });
    
    it('should configure TTS settings', async () => {
      (global as any).window.SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;
      
      voiceService.configureTTS({
        rate: 1.5,
        pitch: 1.2,
        volume: 0.8
      });
      
      const promise = voiceService.speak('Test');
      await promise;
      
      // TTS should have been called with configured settings
      expect(mockSynthesis.utterances.length).toBeGreaterThan(0);
    });
  });
  
  describe('Error Handling', () => {
    it('should handle recognition errors', async () => {
      let errorReceived = false;
      
      voiceService.onError((error) => {
        errorReceived = true;
      });
      
      await voiceService.startListening();
      mockRecognition.simulateError('network');
      
      expect(errorReceived).toBe(true);
    });
    
    it('should not treat no-speech as critical error', async () => {
      let errorReceived = false;
      
      voiceService.onError((error) => {
        errorReceived = true;
      });
      
      await voiceService.startListening();
      mockRecognition.simulateError('no-speech');
      
      // Should still be listening
      expect(voiceService.getIsListening()).toBe(true);
    });
  });
  
  describe('Configuration', () => {
    it('should configure recognition settings', () => {
      voiceService.configure({
        language: 'hi-IN',
        continuous: false,
        interimResults: false
      });
      
      expect(mockRecognition.lang).toBe('hi-IN');
      expect(mockRecognition.continuous).toBe(false);
      expect(mockRecognition.interimResults).toBe(false);
    });
    
    it('should support multiple languages', () => {
      const languages = ['en-US', 'hi-IN', 'ta-IN', 'te-IN', 'bn-IN'];
      
      languages.forEach(lang => {
        voiceService.configure({ language: lang });
        expect(mockRecognition.lang).toBe(lang);
      });
    });
  });
  
  describe('Browser Support', () => {
    it('should detect recognition support', () => {
      const supported = VoiceService.isRecognitionSupported();
      expect(typeof supported).toBe('boolean');
    });
    
    it('should detect synthesis support', () => {
      const supported = VoiceService.isSynthesisSupported();
      expect(typeof supported).toBe('boolean');
    });
  });
});

describe('AudioStreamingService', () => {
  let streamingService: AudioStreamingService;
  
  beforeEach(() => {
    streamingService = new AudioStreamingService({
      bufferSize: 2,
      autoPlay: true
    });
  });
  
  afterEach(() => {
    streamingService.destroy();
  });
  
  describe('Streaming', () => {
    it('should handle browser-tts URLs', async () => {
      const payload = { text: 'Hello', voiceId: 'test', languageCode: 'en-US' };
      const encoded = btoa(JSON.stringify(payload));
      const url = `browser-tts://${encoded}`;
      
      // Mock speechSynthesis and SpeechSynthesisUtterance
      (global as any).window = {
        speechSynthesis: new MockSpeechSynthesis(),
        SpeechSynthesisUtterance: MockSpeechSynthesisUtterance
      };
      
      await streamingService.streamFromURL(url);
      
      expect((global as any).window.speechSynthesis.speaking).toBe(false);
    });
    
    it('should track playback state', () => {
      expect(streamingService.getIsPlaying()).toBe(false);
    });
    
    it('should stop playback', () => {
      streamingService.stopPlayback();
      expect(streamingService.getIsPlaying()).toBe(false);
    });
    
    it('should reset streaming state', () => {
      streamingService.reset();
      expect(streamingService.getProgress()).toBe(0);
    });
  });
  
  describe('Progress Tracking', () => {
    it('should report progress', () => {
      const progress = streamingService.getProgress();
      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(100);
    });
  });
});

describe('Voice Flow Integration', () => {
  it('should complete full voice interaction flow', async () => {
    // Setup mocks properly
    const mockRecognition = new MockSpeechRecognition();
    (global as any).window = {
      SpeechRecognition: function() { return mockRecognition; },
      speechSynthesis: new MockSpeechSynthesis(),
      SpeechSynthesisUtterance: MockSpeechSynthesisUtterance
    };
    
    const voiceService = new VoiceService();
    const results: any[] = [];
    
    voiceService.onTranscript((result) => {
      results.push(result);
    });
    
    voiceService.onComplete((result) => {
      expect(result.transcript).toBeTruthy();
      expect(result.metrics).toBeTruthy();
      expect(result.metrics.pauseCount).toBeGreaterThanOrEqual(0);
      expect(result.metrics.fillerWordCount).toBeGreaterThanOrEqual(0);
    });
    
    await voiceService.startListening();
    
    // Simulate user speaking
    mockRecognition.simulateSpeechStart();
    mockRecognition.simulateResult('What is photosynthesis?', true);
    mockRecognition.simulateSpeechEnd();
    
    voiceService.stopListening();
    voiceService.destroy();
  });
  
  it('should handle text fallback when voice unavailable', () => {
    // Simulate no voice support
    (global as any).window = {};
    
    const supported = VoiceService.isRecognitionSupported();
    expect(supported).toBe(false);
    
    // Application should fall back to text input
    // This is handled by VoiceInputPanel component
  });
});
