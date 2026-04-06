/**
 * Comprehensive unit tests for ConfusionDetector - Additional coverage
 * Targeting 90%+ coverage for core algorithm
 */

import { describe, it, expect } from 'vitest';
import { ConfusionDetector, VoiceMetrics } from '../ConfusionDetector.js';

describe('ConfusionDetector - Comprehensive Coverage', () => {
  describe('Edge Cases - detectConfusion', () => {
    it('should handle multiple uncertainty words in one message', () => {
      const message = 'Maybe I think perhaps this might be correct, but I\'m not sure';
      const signals = ConfusionDetector.detectConfusion(message);

      const uncertaintySignal = signals.find(s => s.type === 'uncertainty');
      expect(uncertaintySignal).toBeDefined();
      expect(uncertaintySignal?.confidence).toBeGreaterThan(0.6);
    });

    it('should handle messages with only punctuation', () => {
      const message = '...';
      const signals = ConfusionDetector.detectConfusion(message);

      expect(signals).toBeDefined();
      expect(Array.isArray(signals)).toBe(true);
    });

    it('should handle very long messages', () => {
      const message = 'I understand the concept of photosynthesis very well. '.repeat(20);
      const signals = ConfusionDetector.detectConfusion(message);

      expect(signals).toBeDefined();
      expect(signals.length).toBe(0);
    });

    it('should detect confusion in questions with "why"', () => {
      const message = 'Why does this work?';
      const signals = ConfusionDetector.detectConfusion(message);

      const hesitationSignal = signals.find(s => s.type === 'hesitation');
      expect(hesitationSignal).toBeDefined();
    });

    it('should detect confusion in questions with "how"', () => {
      const message = 'How can this be true?';
      const signals = ConfusionDetector.detectConfusion(message);

      const hesitationSignal = signals.find(s => s.type === 'hesitation');
      expect(hesitationSignal).toBeDefined();
    });

    it('should handle empty conversation history', () => {
      const message = 'What is photosynthesis?';
      const signals = ConfusionDetector.detectConfusion(message, []);

      expect(signals).toBeDefined();
      expect(Array.isArray(signals)).toBe(true);
    });

    it('should handle conversation history with dissimilar messages', () => {
      const message = 'What is photosynthesis?';
      const history = ['Tell me about gravity', 'Explain electricity'];
      const signals = ConfusionDetector.detectConfusion(message, history);

      const repetitionSignal = signals.find(s => s.type === 'repetition');
      expect(repetitionSignal).toBeUndefined();
    });

    it('should detect similar messages with different wording', () => {
      const message = 'Can you explain photosynthesis?';
      const history = ['What is photosynthesis?', 'Tell me about photosynthesis'];
      const signals = ConfusionDetector.detectConfusion(message, history);

      const repetitionSignal = signals.find(s => s.type === 'repetition');
      expect(repetitionSignal).toBeDefined();
    });

    it('should handle greetings correctly - hi', () => {
      const message = 'hi';
      const signals = ConfusionDetector.detectConfusion(message);

      const incompleteSignal = signals.find(s => s.type === 'incomplete');
      expect(incompleteSignal).toBeUndefined();
    });

    it('should handle greetings correctly - hello there', () => {
      const message = 'hello there';
      const signals = ConfusionDetector.detectConfusion(message);

      const incompleteSignal = signals.find(s => s.type === 'incomplete');
      expect(incompleteSignal).toBeUndefined();
    });

    it('should handle greetings correctly - namaste', () => {
      const message = 'namaste';
      const signals = ConfusionDetector.detectConfusion(message);

      const incompleteSignal = signals.find(s => s.type === 'incomplete');
      expect(incompleteSignal).toBeUndefined();
    });

    it('should handle greetings correctly - good morning', () => {
      const message = 'good morning';
      const signals = ConfusionDetector.detectConfusion(message);

      const incompleteSignal = signals.find(s => s.type === 'incomplete');
      expect(incompleteSignal).toBeUndefined();
    });
  });

  describe('Edge Cases - analyzeVoiceMetrics', () => {
    it('should handle zero values in voice metrics', () => {
      const metrics: VoiceMetrics = {
        pauseCount: 0,
        fillerWordCount: 0,
        averagePauseDuration: 0,
        speechRate: 0,
        hesitationScore: 0,
      };

      const signals = ConfusionDetector.analyzeVoiceMetrics(metrics, 'test');

      expect(signals).toBeDefined();
      expect(Array.isArray(signals)).toBe(true);
    });

    it('should handle extremely high values in voice metrics', () => {
      const metrics: VoiceMetrics = {
        pauseCount: 100,
        fillerWordCount: 50,
        averagePauseDuration: 10000,
        speechRate: 10,
        hesitationScore: 1.0,
      };

      const signals = ConfusionDetector.analyzeVoiceMetrics(metrics, 'test');

      expect(signals.length).toBeGreaterThan(0);
      expect(signals.every(s => s.confidence >= 0 && s.confidence <= 1)).toBe(true);
    });

    it('should handle boundary values - pauseCount exactly 3', () => {
      const metrics: VoiceMetrics = {
        pauseCount: 3,
        fillerWordCount: 0,
        averagePauseDuration: 1000,
        speechRate: 120,
        hesitationScore: 0.5,
      };

      const signals = ConfusionDetector.analyzeVoiceMetrics(metrics, 'test');

      expect(signals).toBeDefined();
    });

    it('should handle boundary values - pauseCount exactly 4', () => {
      const metrics: VoiceMetrics = {
        pauseCount: 4,
        fillerWordCount: 0,
        averagePauseDuration: 1000,
        speechRate: 120,
        hesitationScore: 0.5,
      };

      const signals = ConfusionDetector.analyzeVoiceMetrics(metrics, 'test');

      const pauseSignal = signals.find(s => s.trigger.includes('pauses'));
      expect(pauseSignal).toBeDefined();
    });

    it('should handle boundary values - averagePauseDuration exactly 2000ms', () => {
      const metrics: VoiceMetrics = {
        pauseCount: 1,
        fillerWordCount: 0,
        averagePauseDuration: 2000,
        speechRate: 120,
        hesitationScore: 0.5,
      };

      const signals = ConfusionDetector.analyzeVoiceMetrics(metrics, 'test');

      expect(signals).toBeDefined();
    });

    it('should handle boundary values - fillerWordCount exactly 2', () => {
      const metrics: VoiceMetrics = {
        pauseCount: 1,
        fillerWordCount: 2,
        averagePauseDuration: 1000,
        speechRate: 120,
        hesitationScore: 0.5,
      };

      const signals = ConfusionDetector.analyzeVoiceMetrics(metrics, 'test');

      expect(signals).toBeDefined();
    });

    it('should handle boundary values - speechRate exactly 80', () => {
      const metrics: VoiceMetrics = {
        pauseCount: 1,
        fillerWordCount: 0,
        averagePauseDuration: 1000,
        speechRate: 80,
        hesitationScore: 0.5,
      };

      const signals = ConfusionDetector.analyzeVoiceMetrics(metrics, 'test');

      expect(signals).toBeDefined();
    });

    it('should handle boundary values - hesitationScore exactly 0.6', () => {
      const metrics: VoiceMetrics = {
        pauseCount: 1,
        fillerWordCount: 0,
        averagePauseDuration: 1000,
        speechRate: 120,
        hesitationScore: 0.6,
      };

      const signals = ConfusionDetector.analyzeVoiceMetrics(metrics, 'test');

      expect(signals).toBeDefined();
    });
  });

  describe('Edge Cases - calculateVoiceMetrics', () => {
    it('should handle empty message', () => {
      const metrics = ConfusionDetector.calculateVoiceMetrics('', 1000);

      expect(metrics.fillerWordCount).toBe(0);
      expect(metrics.speechRate).toBe(0);
    });

    it('should handle message with no filler words', () => {
      const message = 'The answer is photosynthesis because plants need sunlight.';
      const metrics = ConfusionDetector.calculateVoiceMetrics(message, 5000);

      expect(metrics.fillerWordCount).toBe(0);
    });

    it('should handle message with multiple filler words', () => {
      const message = 'Um, well, like, you know, I mean, basically, actually, literally, so, uh, er, ah';
      const metrics = ConfusionDetector.calculateVoiceMetrics(message, 10000);

      expect(metrics.fillerWordCount).toBeGreaterThan(5);
    });

    it('should handle empty pause durations array', () => {
      const metrics = ConfusionDetector.calculateVoiceMetrics('test', 1000, 0, []);

      expect(metrics.averagePauseDuration).toBe(0);
    });

    it('should handle single pause duration', () => {
      const metrics = ConfusionDetector.calculateVoiceMetrics('test', 1000, 1, [2000]);

      expect(metrics.averagePauseDuration).toBe(2000);
    });

    it('should calculate average pause duration correctly', () => {
      const metrics = ConfusionDetector.calculateVoiceMetrics('test', 1000, 3, [1000, 2000, 3000]);

      expect(metrics.averagePauseDuration).toBe(2000);
    });

    it('should calculate speech rate correctly', () => {
      const message = 'one two three four five'; // 5 words
      const duration = 5000; // 5 seconds
      const metrics = ConfusionDetector.calculateVoiceMetrics(message, duration);

      // 5 words / 5 seconds = 1 word/second = 60 words/minute
      expect(metrics.speechRate).toBe(60);
    });

    it('should calculate hesitation score within bounds', () => {
      const metrics = ConfusionDetector.calculateVoiceMetrics('um uh test', 5000, 5, [2000, 3000]);

      expect(metrics.hesitationScore).toBeGreaterThanOrEqual(0);
      expect(metrics.hesitationScore).toBeLessThanOrEqual(1);
    });
  });

  describe('Edge Cases - aggregateConfusionSignals', () => {
    it('should handle single signal', () => {
      const signals = [
        {
          type: 'uncertainty' as const,
          confidence: 0.7,
          trigger: 'test',
          suggestion: 'suggestion',
        },
      ];

      const result = ConfusionDetector.aggregateConfusionSignals(signals);

      expect(result.overallConfidence).toBe(0.7);
      expect(result.dominantType).toBe('uncertainty');
      expect(result.isConfused).toBe(true);
    });

    it('should handle signals with equal type counts', () => {
      const signals = [
        {
          type: 'uncertainty' as const,
          confidence: 0.7,
          trigger: 'test1',
          suggestion: 'suggestion1',
        },
        {
          type: 'hesitation' as const,
          confidence: 0.8,
          trigger: 'test2',
          suggestion: 'suggestion2',
        },
      ];

      const result = ConfusionDetector.aggregateConfusionSignals(signals);

      expect(result.dominantType).toMatch(/uncertainty|hesitation/);
    });

    it('should handle boundary confidence - exactly 0.6', () => {
      const signals = [
        {
          type: 'uncertainty' as const,
          confidence: 0.6,
          trigger: 'test',
          suggestion: 'suggestion',
        },
      ];

      const result = ConfusionDetector.aggregateConfusionSignals(signals);

      expect(result.isConfused).toBe(false);
    });

    it('should handle boundary confidence - just above 0.6', () => {
      const signals = [
        {
          type: 'uncertainty' as const,
          confidence: 0.61,
          trigger: 'test',
          suggestion: 'suggestion',
        },
      ];

      const result = ConfusionDetector.aggregateConfusionSignals(signals);

      expect(result.isConfused).toBe(true);
    });
  });

  describe('Edge Cases - isReadyForNext', () => {
    it('should handle empty history', () => {
      const ready = ConfusionDetector.isReadyForNext([]);

      expect(ready).toBe(true);
    });

    it('should handle history with less than 3 interactions', () => {
      const history = [[], []];
      const ready = ConfusionDetector.isReadyForNext(history);

      expect(ready).toBe(true);
    });

    it('should handle history with exactly 3 interactions', () => {
      const history = [[], [], []];
      const ready = ConfusionDetector.isReadyForNext(history);

      expect(ready).toBe(true);
    });

    it('should handle history with more than 3 interactions', () => {
      const history = [[], [], [], [], []];
      const ready = ConfusionDetector.isReadyForNext(history);

      expect(ready).toBe(true);
    });

    it('should return false if any of last 3 have confusion', () => {
      const signal = {
        type: 'uncertainty' as const,
        confidence: 0.7,
        trigger: 'test',
        suggestion: 'suggestion',
      };

      const history = [[], [], [signal], []];
      const ready = ConfusionDetector.isReadyForNext(history);

      expect(ready).toBe(false);
    });
  });

  describe('Edge Cases - calculateConfusionScore', () => {
    it('should handle very low confidence signals', () => {
      const signals = [
        {
          type: 'uncertainty' as const,
          confidence: 0.01,
          trigger: 'test',
          suggestion: 'suggestion',
        },
      ];

      const score = ConfusionDetector.calculateConfusionScore(signals);

      expect(score).toBe(1);
    });

    it('should handle mixed confidence signals', () => {
      const signals = [
        {
          type: 'uncertainty' as const,
          confidence: 0.1,
          trigger: 'test1',
          suggestion: 'suggestion1',
        },
        {
          type: 'hesitation' as const,
          confidence: 0.9,
          trigger: 'test2',
          suggestion: 'suggestion2',
        },
      ];

      const score = ConfusionDetector.calculateConfusionScore(signals);

      expect(score).toBe(50); // (0.1 + 0.9) / 2 * 100
    });

    it('should handle many signals', () => {
      const signals = Array(10).fill(null).map(() => ({
        type: 'uncertainty' as const,
        confidence: 0.5,
        trigger: 'test',
        suggestion: 'suggestion',
      }));

      const score = ConfusionDetector.calculateConfusionScore(signals);

      expect(score).toBe(50);
    });
  });

  describe('Integration - Complex Scenarios', () => {
    it('should handle student with multiple confusion indicators', () => {
      const message = 'Um, I think maybe, like, can you explain this again? I don\'t understand.';
      const history = ['Can you explain this?', 'What does this mean?'];
      const voiceMetrics: VoiceMetrics = {
        pauseCount: 7,
        fillerWordCount: 4,
        averagePauseDuration: 3000,
        speechRate: 70,
        hesitationScore: 0.85,
      };

      const signals = ConfusionDetector.detectConfusion(message, history, voiceMetrics);

      expect(signals.length).toBeGreaterThan(3);
      
      const aggregated = ConfusionDetector.aggregateConfusionSignals(signals);
      expect(aggregated.isConfused).toBe(true);
      expect(aggregated.overallConfidence).toBeGreaterThan(0.7);

      const adjustment = ConfusionDetector.generateTeachingAdjustment(signals);
      expect(adjustment).toContain('TEACHING ADJUSTMENT NEEDED');

      const score = ConfusionDetector.calculateConfusionScore(signals);
      expect(score).toBeGreaterThan(70);
    });

    it('should handle confident student with no confusion', () => {
      const message = 'I understand completely. The answer is 42 because we multiply 6 by 7.';
      const history = ['What is 6 times 7?'];
      const voiceMetrics: VoiceMetrics = {
        pauseCount: 0,
        fillerWordCount: 0,
        averagePauseDuration: 0,
        speechRate: 150,
        hesitationScore: 0.1,
      };

      const signals = ConfusionDetector.detectConfusion(message, history, voiceMetrics);

      expect(signals.length).toBe(0);

      const aggregated = ConfusionDetector.aggregateConfusionSignals(signals);
      expect(aggregated.isConfused).toBe(false);

      const adjustment = ConfusionDetector.generateTeachingAdjustment(signals);
      expect(adjustment).toBe('');

      const score = ConfusionDetector.calculateConfusionScore(signals);
      expect(score).toBe(0);

      const ready = ConfusionDetector.isReadyForNext([signals, signals, signals]);
      expect(ready).toBe(true);
    });
  });
});
