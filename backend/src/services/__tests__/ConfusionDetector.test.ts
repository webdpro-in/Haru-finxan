/**
 * Unit tests for ConfusionDetector
 */

import { describe, it, expect } from 'vitest';
import { ConfusionDetector, VoiceMetrics } from '../ConfusionDetector.js';

describe('ConfusionDetector', () => {
  describe('detectConfusion', () => {
    it('should detect uncertainty words', () => {
      const message = 'I think maybe this is correct, but I\'m not sure.';
      const signals = ConfusionDetector.detectConfusion(message);

      expect(signals.length).toBeGreaterThan(0);
      const uncertaintySignal = signals.find(s => s.type === 'uncertainty');
      expect(uncertaintySignal).toBeDefined();
      expect(uncertaintySignal?.confidence).toBeGreaterThan(0);
    });

    it('should detect confusion patterns', () => {
      const message = 'Can you explain this again?';
      const signals = ConfusionDetector.detectConfusion(message);

      expect(signals.length).toBeGreaterThan(0);
      const hesitationSignal = signals.find(s => s.type === 'hesitation');
      expect(hesitationSignal).toBeDefined();
    });

    it('should detect repeated questions', () => {
      const message = 'What is photosynthesis?';
      const history = ['What is photosynthesis?', 'Tell me about plants'];
      const signals = ConfusionDetector.detectConfusion(message, history);

      const repetitionSignal = signals.find(s => s.type === 'repetition');
      expect(repetitionSignal).toBeDefined();
      expect(repetitionSignal?.confidence).toBeGreaterThan(0.8);
    });

    it('should detect incomplete responses', () => {
      const message = 'ok';
      const signals = ConfusionDetector.detectConfusion(message);

      const incompleteSignal = signals.find(s => s.type === 'incomplete');
      expect(incompleteSignal).toBeDefined();
    });

    it('should not flag greetings as incomplete', () => {
      const message = 'hello';
      const signals = ConfusionDetector.detectConfusion(message);

      const incompleteSignal = signals.find(s => s.type === 'incomplete');
      expect(incompleteSignal).toBeUndefined();
    });

    it('should analyze voice metrics', () => {
      const message = 'Um, I think, like, maybe this is right?';
      const voiceMetrics: VoiceMetrics = {
        pauseCount: 5,
        fillerWordCount: 3,
        averagePauseDuration: 2500,
        speechRate: 75,
        hesitationScore: 0.7,
      };

      const signals = ConfusionDetector.detectConfusion(message, [], voiceMetrics);

      expect(signals.length).toBeGreaterThan(0);
      // Should have signals from both text and voice analysis
      const voiceSignals = signals.filter(s => 
        s.trigger.includes('pauses') || s.trigger.includes('filler')
      );
      expect(voiceSignals.length).toBeGreaterThan(0);
    });

    it('should return empty array for clear message', () => {
      const message = 'The answer is 42 because we multiply 6 by 7.';
      const signals = ConfusionDetector.detectConfusion(message);

      expect(signals.length).toBe(0);
    });
  });

  describe('analyzeVoiceMetrics', () => {
    it('should detect high pause count', () => {
      const metrics: VoiceMetrics = {
        pauseCount: 6,
        fillerWordCount: 0,
        averagePauseDuration: 1000,
        speechRate: 120,
        hesitationScore: 0.5,
      };

      const signals = ConfusionDetector.analyzeVoiceMetrics(metrics, 'test');

      const pauseSignal = signals.find(s => s.trigger.includes('pauses'));
      expect(pauseSignal).toBeDefined();
    });

    it('should detect long pause duration', () => {
      const metrics: VoiceMetrics = {
        pauseCount: 2,
        fillerWordCount: 0,
        averagePauseDuration: 3000,
        speechRate: 120,
        hesitationScore: 0.5,
      };

      const signals = ConfusionDetector.analyzeVoiceMetrics(metrics, 'test');

      const pauseSignal = signals.find(s => s.trigger.includes('Long pauses'));
      expect(pauseSignal).toBeDefined();
    });

    it('should detect high filler word count', () => {
      const metrics: VoiceMetrics = {
        pauseCount: 1,
        fillerWordCount: 4,
        averagePauseDuration: 1000,
        speechRate: 120,
        hesitationScore: 0.5,
      };

      const signals = ConfusionDetector.analyzeVoiceMetrics(metrics, 'test');

      const fillerSignal = signals.find(s => s.trigger.includes('filler words'));
      expect(fillerSignal).toBeDefined();
    });

    it('should detect slow speech rate', () => {
      const metrics: VoiceMetrics = {
        pauseCount: 1,
        fillerWordCount: 0,
        averagePauseDuration: 1000,
        speechRate: 70,
        hesitationScore: 0.5,
      };

      const signals = ConfusionDetector.analyzeVoiceMetrics(metrics, 'test');

      const speechSignal = signals.find(s => s.trigger.includes('speech rate'));
      expect(speechSignal).toBeDefined();
    });

    it('should detect high hesitation score', () => {
      const metrics: VoiceMetrics = {
        pauseCount: 1,
        fillerWordCount: 0,
        averagePauseDuration: 1000,
        speechRate: 120,
        hesitationScore: 0.8,
      };

      const signals = ConfusionDetector.analyzeVoiceMetrics(metrics, 'test');

      const hesitationSignal = signals.find(s => s.trigger.includes('hesitation score'));
      expect(hesitationSignal).toBeDefined();
    });
  });

  describe('calculateVoiceMetrics', () => {
    it('should calculate voice metrics correctly', () => {
      const message = 'Um, well, I think this is the answer.';
      const duration = 5000; // 5 seconds
      const pauseCount = 3;
      const pauseDurations = [1000, 1500, 2000];

      const metrics = ConfusionDetector.calculateVoiceMetrics(
        message,
        duration,
        pauseCount,
        pauseDurations
      );

      expect(metrics.pauseCount).toBe(3);
      expect(metrics.fillerWordCount).toBeGreaterThan(0);
      expect(metrics.averagePauseDuration).toBe(1500);
      expect(metrics.speechRate).toBeGreaterThan(0);
      expect(metrics.hesitationScore).toBeGreaterThanOrEqual(0);
      expect(metrics.hesitationScore).toBeLessThanOrEqual(1);
    });

    it('should handle zero duration', () => {
      const message = 'Test message';
      const metrics = ConfusionDetector.calculateVoiceMetrics(message, 0);

      expect(metrics.speechRate).toBe(0);
    });
  });

  describe('generateTeachingAdjustment', () => {
    it('should generate adjustment for high confidence signals', () => {
      const signals = [
        {
          type: 'uncertainty' as const,
          confidence: 0.8,
          trigger: 'test',
          suggestion: 'Simplify explanation',
        },
      ];

      const adjustment = ConfusionDetector.generateTeachingAdjustment(signals);

      expect(adjustment).toContain('TEACHING ADJUSTMENT NEEDED');
      expect(adjustment).toContain('uncertainty');
      expect(adjustment).toContain('Simplify explanation');
    });

    it('should return empty string for low confidence signals', () => {
      const signals = [
        {
          type: 'uncertainty' as const,
          confidence: 0.3,
          trigger: 'test',
          suggestion: 'Simplify explanation',
        },
      ];

      const adjustment = ConfusionDetector.generateTeachingAdjustment(signals);

      expect(adjustment).toBe('');
    });

    it('should return empty string for no signals', () => {
      const adjustment = ConfusionDetector.generateTeachingAdjustment([]);

      expect(adjustment).toBe('');
    });
  });

  describe('aggregateConfusionSignals', () => {
    it('should aggregate multiple signals', () => {
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
        {
          type: 'uncertainty' as const,
          confidence: 0.6,
          trigger: 'test3',
          suggestion: 'suggestion3',
        },
      ];

      const result = ConfusionDetector.aggregateConfusionSignals(signals);

      expect(result.overallConfidence).toBeGreaterThan(0.6);
      expect(result.dominantType).toBe('uncertainty');
      expect(result.isConfused).toBe(true);
    });

    it('should handle no signals', () => {
      const result = ConfusionDetector.aggregateConfusionSignals([]);

      expect(result.overallConfidence).toBe(0);
      expect(result.dominantType).toBe('none');
      expect(result.isConfused).toBe(false);
    });

    it('should identify not confused for low confidence', () => {
      const signals = [
        {
          type: 'uncertainty' as const,
          confidence: 0.3,
          trigger: 'test',
          suggestion: 'suggestion',
        },
      ];

      const result = ConfusionDetector.aggregateConfusionSignals(signals);

      expect(result.isConfused).toBe(false);
    });
  });

  describe('isReadyForNext', () => {
    it('should return true when no recent confusion', () => {
      const history = [[], [], []];
      const ready = ConfusionDetector.isReadyForNext(history);

      expect(ready).toBe(true);
    });

    it('should return false when recent confusion exists', () => {
      const history = [
        [],
        [
          {
            type: 'uncertainty' as const,
            confidence: 0.7,
            trigger: 'test',
            suggestion: 'suggestion',
          },
        ],
        [],
      ];
      const ready = ConfusionDetector.isReadyForNext(history);

      expect(ready).toBe(false);
    });
  });

  describe('calculateConfusionScore', () => {
    it('should calculate score correctly', () => {
      const signals = [
        {
          type: 'uncertainty' as const,
          confidence: 0.7,
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

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
      expect(score).toBe(80); // (0.7 + 0.9) / 2 * 100
    });

    it('should return 0 for no signals', () => {
      const score = ConfusionDetector.calculateConfusionScore([]);

      expect(score).toBe(0);
    });

    it('should cap at 100', () => {
      const signals = [
        {
          type: 'uncertainty' as const,
          confidence: 1.0,
          trigger: 'test1',
          suggestion: 'suggestion1',
        },
        {
          type: 'hesitation' as const,
          confidence: 1.0,
          trigger: 'test2',
          suggestion: 'suggestion2',
        },
      ];

      const score = ConfusionDetector.calculateConfusionScore(signals);

      expect(score).toBe(100);
    });
  });
});
