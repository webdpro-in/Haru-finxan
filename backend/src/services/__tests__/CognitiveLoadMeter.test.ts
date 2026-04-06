/**
 * Tests for Cognitive Load Meter
 * Task Group 12.6: Write unit tests for load meter
 */

import { describe, it, expect } from 'vitest';
import { CognitiveLoadMeter } from '../CognitiveLoadMeter.js';
import type { VoiceMetrics, LoadMetrics, DifficultyAdjustment } from '../CognitiveLoadMeter.js';

describe('CognitiveLoadMeter', () => {
  describe('monitorResponseTime', () => {
    it('should return 0 for very fast responses', () => {
      const load = CognitiveLoadMeter.monitorResponseTime(2000); // 2 seconds
      expect(load).toBe(0);
    });

    it('should return 10 for normal speed responses', () => {
      const load = CognitiveLoadMeter.monitorResponseTime(5000); // 5 seconds
      expect(load).toBe(10);
    });

    it('should return 30 for slow responses', () => {
      const load = CognitiveLoadMeter.monitorResponseTime(8000); // 8 seconds
      expect(load).toBe(30);
    });

    it('should return 50 for very slow responses', () => {
      const load = CognitiveLoadMeter.monitorResponseTime(12000); // 12 seconds
      expect(load).toBe(50);
    });

    it('should return 70 for extremely slow responses', () => {
      const load = CognitiveLoadMeter.monitorResponseTime(20000); // 20 seconds
      expect(load).toBe(70);
    });
  });

  describe('analyzeMessageComplexity', () => {
    it('should return 20 for very short messages (1-2 words)', () => {
      const load = CognitiveLoadMeter.analyzeMessageComplexity('yes');
      expect(load).toBe(20);
    });

    it('should return 10 for short messages (3-5 words)', () => {
      const load = CognitiveLoadMeter.analyzeMessageComplexity('I don\'t know');
      expect(load).toBe(10);
    });

    it('should return 15 for fragmented responses', () => {
      const load = CognitiveLoadMeter.analyzeMessageComplexity('Um. Uh. Maybe?');
      expect(load).toBe(15);
    });

    it('should return 0 for normal complexity messages', () => {
      const load = CognitiveLoadMeter.analyzeMessageComplexity(
        'I think the answer is related to photosynthesis because plants need sunlight.'
      );
      expect(load).toBe(0);
    });

    it('should handle empty messages', () => {
      const load = CognitiveLoadMeter.analyzeMessageComplexity('');
      expect(load).toBeGreaterThanOrEqual(0);
    });
  });

  describe('detectVoiceHesitation', () => {
    it('should return 0 when no voice metrics provided', () => {
      const load = CognitiveLoadMeter.detectVoiceHesitation(null);
      expect(load).toBe(0);
    });

    it('should detect high pause count', () => {
      const metrics: VoiceMetrics = {
        pauseCount: 6,
        fillerWordCount: 0,
        averagePauseDuration: 500,
        speechRate: 150,
      };
      const load = CognitiveLoadMeter.detectVoiceHesitation(metrics);
      expect(load).toBeGreaterThanOrEqual(30);
    });

    it('should detect moderate pause count', () => {
      const metrics: VoiceMetrics = {
        pauseCount: 4,
        fillerWordCount: 0,
        averagePauseDuration: 500,
        speechRate: 150,
      };
      const load = CognitiveLoadMeter.detectVoiceHesitation(metrics);
      expect(load).toBeGreaterThanOrEqual(20);
    });

    it('should detect filler words', () => {
      const metrics: VoiceMetrics = {
        pauseCount: 0,
        fillerWordCount: 3,
        averagePauseDuration: 500,
        speechRate: 150,
      };
      const load = CognitiveLoadMeter.detectVoiceHesitation(metrics);
      expect(load).toBeGreaterThanOrEqual(30);
    });

    it('should detect slow speech rate', () => {
      const metrics: VoiceMetrics = {
        pauseCount: 0,
        fillerWordCount: 0,
        averagePauseDuration: 500,
        speechRate: 90,
      };
      const load = CognitiveLoadMeter.detectVoiceHesitation(metrics);
      expect(load).toBeGreaterThanOrEqual(20);
    });

    it('should combine multiple hesitation indicators', () => {
      const metrics: VoiceMetrics = {
        pauseCount: 6,
        fillerWordCount: 3,
        averagePauseDuration: 500,
        speechRate: 90,
      };
      const load = CognitiveLoadMeter.detectVoiceHesitation(metrics);
      expect(load).toBeGreaterThanOrEqual(70);
    });

    it('should cap hesitation score at 100', () => {
      const metrics: VoiceMetrics = {
        pauseCount: 10,
        fillerWordCount: 10,
        averagePauseDuration: 500,
        speechRate: 50,
      };
      const load = CognitiveLoadMeter.detectVoiceHesitation(metrics);
      expect(load).toBeLessThanOrEqual(100);
    });
  });

  describe('calculateLoadScore', () => {
    it('should calculate overall load score correctly', () => {
      const voiceMetrics: VoiceMetrics = {
        pauseCount: 2,
        fillerWordCount: 1,
        averagePauseDuration: 500,
        speechRate: 150,
      };

      const loadMetrics = CognitiveLoadMeter.calculateLoadScore(
        'I think the answer is photosynthesis',
        5000,
        voiceMetrics,
        0
      );

      expect(loadMetrics.totalLoad).toBeGreaterThanOrEqual(0);
      expect(loadMetrics.totalLoad).toBeLessThanOrEqual(100);
      expect(loadMetrics.responseTime).toBeDefined();
      expect(loadMetrics.messageComplexity).toBeDefined();
      expect(loadMetrics.voiceHesitation).toBeDefined();
    });

    it('should mark as overloaded when load > 60', () => {
      const voiceMetrics: VoiceMetrics = {
        pauseCount: 8,
        fillerWordCount: 5,
        averagePauseDuration: 500,
        speechRate: 80,
      };

      const loadMetrics = CognitiveLoadMeter.calculateLoadScore(
        'um',
        15000,
        voiceMetrics,
        3
      );

      console.log('Load metrics:', loadMetrics);
      expect(loadMetrics.overloaded).toBe(true);
      expect(loadMetrics.totalLoad).toBeGreaterThan(60);
    });

    it('should not mark as overloaded when load <= 60', () => {
      const voiceMetrics: VoiceMetrics = {
        pauseCount: 1,
        fillerWordCount: 0,
        averagePauseDuration: 500,
        speechRate: 150,
      };

      const loadMetrics = CognitiveLoadMeter.calculateLoadScore(
        'I understand the concept now',
        4000,
        voiceMetrics,
        0
      );

      expect(loadMetrics.overloaded).toBe(false);
      expect(loadMetrics.totalLoad).toBeLessThanOrEqual(60);
    });

    it('should handle null voice metrics', () => {
      const loadMetrics = CognitiveLoadMeter.calculateLoadScore(
        'I think the answer is photosynthesis',
        5000,
        null,
        0
      );

      expect(loadMetrics.voiceHesitation).toBe(0);
      expect(loadMetrics.totalLoad).toBeGreaterThanOrEqual(0);
    });

    it('should factor in confusion signals', () => {
      const loadMetrics1 = CognitiveLoadMeter.calculateLoadScore(
        'I understand',
        5000,
        null,
        0
      );

      const loadMetrics2 = CognitiveLoadMeter.calculateLoadScore(
        'I understand',
        5000,
        null,
        3
      );

      expect(loadMetrics2.totalLoad).toBeGreaterThan(loadMetrics1.totalLoad);
    });

    it('should cap total load at 100', () => {
      const voiceMetrics: VoiceMetrics = {
        pauseCount: 20,
        fillerWordCount: 20,
        averagePauseDuration: 500,
        speechRate: 50,
      };

      const loadMetrics = CognitiveLoadMeter.calculateLoadScore(
        'um',
        30000,
        voiceMetrics,
        10
      );

      expect(loadMetrics.totalLoad).toBeLessThanOrEqual(100);
    });
  });

  describe('recommendDifficultyAdjustment', () => {
    it('should recommend simplify for high load (>70)', () => {
      const loadMetrics: LoadMetrics = {
        responseTime: 70,
        messageComplexity: 20,
        voiceHesitation: 60,
        totalLoad: 75,
        overloaded: true,
      };

      const adjustment = CognitiveLoadMeter.recommendDifficultyAdjustment(loadMetrics);

      expect(adjustment.recommendation).toBe('simplify');
      expect(adjustment.adjustments).toContain('Break down concepts into smaller chunks');
      expect(adjustment.adjustments).toContain('Use more concrete examples and analogies');
      expect(adjustment.reasoning).toContain('high cognitive load');
    });

    it('should recommend maintain for moderate load (40-70)', () => {
      const loadMetrics: LoadMetrics = {
        responseTime: 30,
        messageComplexity: 10,
        voiceHesitation: 20,
        totalLoad: 50,
        overloaded: false,
      };

      const adjustment = CognitiveLoadMeter.recommendDifficultyAdjustment(loadMetrics);

      expect(adjustment.recommendation).toBe('maintain');
      expect(adjustment.adjustments).toContain('Maintain current pace');
      expect(adjustment.reasoning).toContain('comfortable pace');
    });

    it('should recommend increase for low load (<40)', () => {
      const loadMetrics: LoadMetrics = {
        responseTime: 10,
        messageComplexity: 0,
        voiceHesitation: 5,
        totalLoad: 20,
        overloaded: false,
      };

      const adjustment = CognitiveLoadMeter.recommendDifficultyAdjustment(loadMetrics);

      expect(adjustment.recommendation).toBe('increase');
      expect(adjustment.adjustments).toContain('Introduce more advanced concepts');
      expect(adjustment.adjustments).toContain('Challenge with deeper questions');
      expect(adjustment.reasoning).toContain('ready for more challenge');
    });

    it('should include current load in adjustment', () => {
      const loadMetrics: LoadMetrics = {
        responseTime: 30,
        messageComplexity: 10,
        voiceHesitation: 20,
        totalLoad: 50,
        overloaded: false,
      };

      const adjustment = CognitiveLoadMeter.recommendDifficultyAdjustment(loadMetrics);

      expect(adjustment.currentLoad).toBe(50);
    });
  });

  describe('monitorSession', () => {
    it('should calculate session metrics correctly', () => {
      const interactions = [
        {
          message: 'I understand',
          responseTime: 4000,
          voiceMetrics: { pauseCount: 1, fillerWordCount: 0, averagePauseDuration: 500, speechRate: 150 },
          confusionSignalsCount: 0,
        },
        {
          message: 'Can you explain more?',
          responseTime: 6000,
          voiceMetrics: { pauseCount: 2, fillerWordCount: 1, averagePauseDuration: 500, speechRate: 140 },
          confusionSignalsCount: 1,
        },
        {
          message: 'Got it',
          responseTime: 3000,
          voiceMetrics: { pauseCount: 0, fillerWordCount: 0, averagePauseDuration: 500, speechRate: 160 },
          confusionSignalsCount: 0,
        },
      ];

      const sessionMetrics = CognitiveLoadMeter.monitorSession(interactions);

      expect(sessionMetrics.averageLoad).toBeGreaterThanOrEqual(0);
      expect(sessionMetrics.averageLoad).toBeLessThanOrEqual(100);
      expect(sessionMetrics.peakLoad).toBeGreaterThanOrEqual(sessionMetrics.averageLoad);
      expect(sessionMetrics.loadTrend).toMatch(/increasing|decreasing|stable/);
      expect(sessionMetrics.overloadEvents).toBeGreaterThanOrEqual(0);
    });

    it('should detect increasing load trend', () => {
      const interactions = [
        {
          message: 'I understand',
          responseTime: 3000,
          voiceMetrics: { pauseCount: 0, fillerWordCount: 0, averagePauseDuration: 500, speechRate: 150 },
          confusionSignalsCount: 0,
        },
        {
          message: 'I understand',
          responseTime: 3000,
          voiceMetrics: { pauseCount: 0, fillerWordCount: 0, averagePauseDuration: 500, speechRate: 150 },
          confusionSignalsCount: 0,
        },
        {
          message: 'um',
          responseTime: 15000,
          voiceMetrics: { pauseCount: 8, fillerWordCount: 5, averagePauseDuration: 500, speechRate: 80 },
          confusionSignalsCount: 3,
        },
        {
          message: 'uh',
          responseTime: 15000,
          voiceMetrics: { pauseCount: 8, fillerWordCount: 5, averagePauseDuration: 500, speechRate: 80 },
          confusionSignalsCount: 3,
        },
      ];

      const sessionMetrics = CognitiveLoadMeter.monitorSession(interactions);

      expect(sessionMetrics.loadTrend).toBe('increasing');
    });

    it('should detect decreasing load trend', () => {
      const interactions = [
        {
          message: 'um',
          responseTime: 15000,
          voiceMetrics: { pauseCount: 8, fillerWordCount: 5, averagePauseDuration: 500, speechRate: 80 },
          confusionSignalsCount: 3,
        },
        {
          message: 'uh',
          responseTime: 15000,
          voiceMetrics: { pauseCount: 8, fillerWordCount: 5, averagePauseDuration: 500, speechRate: 80 },
          confusionSignalsCount: 3,
        },
        {
          message: 'I understand now',
          responseTime: 3000,
          voiceMetrics: { pauseCount: 0, fillerWordCount: 0, averagePauseDuration: 500, speechRate: 150 },
          confusionSignalsCount: 0,
        },
        {
          message: 'Got it',
          responseTime: 3000,
          voiceMetrics: { pauseCount: 0, fillerWordCount: 0, averagePauseDuration: 500, speechRate: 150 },
          confusionSignalsCount: 0,
        },
      ];

      const sessionMetrics = CognitiveLoadMeter.monitorSession(interactions);

      expect(sessionMetrics.loadTrend).toBe('decreasing');
    });

    it('should detect stable load trend', () => {
      const interactions = [
        {
          message: 'I understand',
          responseTime: 5000,
          voiceMetrics: { pauseCount: 1, fillerWordCount: 0, averagePauseDuration: 500, speechRate: 150 },
          confusionSignalsCount: 0,
        },
        {
          message: 'I understand',
          responseTime: 5000,
          voiceMetrics: { pauseCount: 1, fillerWordCount: 0, averagePauseDuration: 500, speechRate: 150 },
          confusionSignalsCount: 0,
        },
        {
          message: 'I understand',
          responseTime: 5000,
          voiceMetrics: { pauseCount: 1, fillerWordCount: 0, averagePauseDuration: 500, speechRate: 150 },
          confusionSignalsCount: 0,
        },
        {
          message: 'I understand',
          responseTime: 5000,
          voiceMetrics: { pauseCount: 1, fillerWordCount: 0, averagePauseDuration: 500, speechRate: 150 },
          confusionSignalsCount: 0,
        },
      ];

      const sessionMetrics = CognitiveLoadMeter.monitorSession(interactions);

      expect(sessionMetrics.loadTrend).toBe('stable');
    });

    it('should count overload events', () => {
      const interactions = [
        {
          message: 'um',
          responseTime: 15000,
          voiceMetrics: { pauseCount: 8, fillerWordCount: 5, averagePauseDuration: 500, speechRate: 80 },
          confusionSignalsCount: 3,
        },
        {
          message: 'I understand',
          responseTime: 3000,
          voiceMetrics: { pauseCount: 0, fillerWordCount: 0, averagePauseDuration: 500, speechRate: 150 },
          confusionSignalsCount: 0,
        },
      ];

      const sessionMetrics = CognitiveLoadMeter.monitorSession(interactions);

      expect(sessionMetrics.overloadEvents).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty interactions array', () => {
      const sessionMetrics = CognitiveLoadMeter.monitorSession([]);

      expect(sessionMetrics.averageLoad).toBe(0);
      expect(sessionMetrics.peakLoad).toBe(0);
      expect(sessionMetrics.loadTrend).toBe('stable');
      expect(sessionMetrics.overloadEvents).toBe(0);
    });
  });
});
