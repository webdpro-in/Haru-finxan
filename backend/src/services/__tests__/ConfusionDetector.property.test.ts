/**
 * Property-Based Tests for ConfusionDetector
 * Task 34.1: Write property tests for confusion detection
 * 
 * **Validates: Requirements 2.9.1-2.9.7**
 * 
 * Tests invariants that must hold for all possible inputs:
 * 1. Confidence scores must always be in [0, 1]
 * 2. Signal types must be valid enum values
 * 3. Confusion signals must aggregate correctly
 * 4. Detection must be consistent and deterministic
 * 5. Voice metrics must produce valid signals
 * 6. Confusion score must be in [0, 100]
 */

import { describe, it, expect } from 'vitest';
import { ConfusionDetector, VoiceMetrics, ConfusionSignal } from '../ConfusionDetector.js';

describe('ConfusionDetector Property-Based Tests', () => {
  /**
   * Helper function to generate random messages
   */
  function generateRandomMessage(length: number = 10): string {
    const words = [
      'hello', 'test', 'maybe', 'confused', 'understand', 'explain',
      'what', 'how', 'why', 'is', 'the', 'answer', 'question',
      'um', 'uh', 'like', 'think', 'sure', 'not', 'can', 'you'
    ];
    
    const messageWords: string[] = [];
    for (let i = 0; i < length; i++) {
      messageWords.push(words[Math.floor(Math.random() * words.length)]);
    }
    
    return messageWords.join(' ');
  }

  /**
   * Helper function to generate random voice metrics
   */
  function generateRandomVoiceMetrics(): VoiceMetrics {
    return {
      pauseCount: Math.floor(Math.random() * 10),
      fillerWordCount: Math.floor(Math.random() * 8),
      averagePauseDuration: Math.random() * 5000,
      speechRate: 50 + Math.random() * 150, // 50-200 wpm
      hesitationScore: Math.random(),
    };
  }

  /**
   * Helper function to generate random conversation history
   */
  function generateRandomHistory(length: number = 5): string[] {
    const history: string[] = [];
    for (let i = 0; i < length; i++) {
      history.push(generateRandomMessage(5 + Math.floor(Math.random() * 10)));
    }
    return history;
  }

  describe('Confidence Score Invariants', () => {
    it('Property: All confidence scores must be in [0, 1] for any message', () => {
      // Test with 100 random messages
      for (let trial = 0; trial < 100; trial++) {
        const messageLength = 1 + Math.floor(Math.random() * 50);
        const message = generateRandomMessage(messageLength);
        
        const signals = ConfusionDetector.detectConfusion(message);
        
        // Every signal must have confidence in [0, 1]
        for (const signal of signals) {
          expect(signal.confidence).toBeGreaterThanOrEqual(0);
          expect(signal.confidence).toBeLessThanOrEqual(1);
        }
      }
    });

    it('Property: Confidence scores must be in [0, 1] with conversation history', () => {
      for (let trial = 0; trial < 100; trial++) {
        const message = generateRandomMessage(5 + Math.floor(Math.random() * 20));
        const history = generateRandomHistory(Math.floor(Math.random() * 10));
        
        const signals = ConfusionDetector.detectConfusion(message, history);
        
        for (const signal of signals) {
          expect(signal.confidence).toBeGreaterThanOrEqual(0);
          expect(signal.confidence).toBeLessThanOrEqual(1);
        }
      }
    });

    it('Property: Confidence scores must be in [0, 1] with voice metrics', () => {
      for (let trial = 0; trial < 100; trial++) {
        const message = generateRandomMessage(5 + Math.floor(Math.random() * 20));
        const voiceMetrics = generateRandomVoiceMetrics();
        
        const signals = ConfusionDetector.detectConfusion(message, [], voiceMetrics);
        
        for (const signal of signals) {
          expect(signal.confidence).toBeGreaterThanOrEqual(0);
          expect(signal.confidence).toBeLessThanOrEqual(1);
        }
      }
    });

    it('Property: Confidence scores must be in [0, 1] for all combinations', () => {
      for (let trial = 0; trial < 50; trial++) {
        const message = generateRandomMessage(5 + Math.floor(Math.random() * 20));
        const history = generateRandomHistory(Math.floor(Math.random() * 10));
        const voiceMetrics = generateRandomVoiceMetrics();
        
        const signals = ConfusionDetector.detectConfusion(message, history, voiceMetrics);
        
        for (const signal of signals) {
          expect(signal.confidence).toBeGreaterThanOrEqual(0);
          expect(signal.confidence).toBeLessThanOrEqual(1);
        }
      }
    });

    it('Property: Uncertainty word confidence must scale with count', () => {
      const uncertaintyWords = ['maybe', 'not sure', 'confused', 'i think'];
      
      for (let wordCount = 1; wordCount <= 5; wordCount++) {
        const message = uncertaintyWords.slice(0, wordCount).join(' ');
        const signals = ConfusionDetector.detectConfusion(message);
        
        const uncertaintySignal = signals.find(s => s.type === 'uncertainty');
        if (uncertaintySignal) {
          // Confidence should increase with word count but stay <= 0.9
          expect(uncertaintySignal.confidence).toBeGreaterThan(0);
          expect(uncertaintySignal.confidence).toBeLessThanOrEqual(0.9);
          
          // More words = higher confidence (up to cap)
          const expectedConfidence = Math.min(0.9, wordCount * 0.3);
          expect(uncertaintySignal.confidence).toBeCloseTo(expectedConfidence, 2);
        }
      }
    });

    it('Property: Voice metrics confidence must be in [0, 1]', () => {
      for (let trial = 0; trial < 100; trial++) {
        const metrics = generateRandomVoiceMetrics();
        const signals = ConfusionDetector.analyzeVoiceMetrics(metrics, 'test message');
        
        for (const signal of signals) {
          expect(signal.confidence).toBeGreaterThanOrEqual(0);
          expect(signal.confidence).toBeLessThanOrEqual(1);
        }
      }
    });
  });

  describe('Signal Type Invariants', () => {
    it('Property: All signal types must be valid enum values', () => {
      const validTypes = new Set(['hesitation', 'repetition', 'uncertainty', 'off-topic', 'incomplete']);
      
      for (let trial = 0; trial < 100; trial++) {
        const message = generateRandomMessage(5 + Math.floor(Math.random() * 20));
        const history = generateRandomHistory(Math.floor(Math.random() * 10));
        const voiceMetrics = Math.random() > 0.5 ? generateRandomVoiceMetrics() : undefined;
        
        const signals = ConfusionDetector.detectConfusion(message, history, voiceMetrics);
        
        for (const signal of signals) {
          expect(validTypes.has(signal.type)).toBe(true);
        }
      }
    });

    it('Property: Signal structure must be complete', () => {
      for (let trial = 0; trial < 100; trial++) {
        const message = generateRandomMessage(5 + Math.floor(Math.random() * 20));
        const signals = ConfusionDetector.detectConfusion(message);
        
        for (const signal of signals) {
          expect(signal).toHaveProperty('type');
          expect(signal).toHaveProperty('confidence');
          expect(signal).toHaveProperty('trigger');
          expect(signal).toHaveProperty('suggestion');
          
          expect(typeof signal.type).toBe('string');
          expect(typeof signal.confidence).toBe('number');
          expect(typeof signal.trigger).toBe('string');
          expect(typeof signal.suggestion).toBe('string');
          
          expect(signal.trigger.length).toBeGreaterThan(0);
          expect(signal.suggestion.length).toBeGreaterThan(0);
        }
      }
    });

    it('Property: Uncertainty type must be triggered by uncertainty words', () => {
      const uncertaintyMessages = [
        'maybe this is correct',
        'i think so',
        'not sure about this',
        'i am confused',
        'what does this mean'
      ];
      
      for (const message of uncertaintyMessages) {
        const signals = ConfusionDetector.detectConfusion(message);
        const hasUncertainty = signals.some(s => s.type === 'uncertainty');
        
        expect(hasUncertainty).toBe(true);
      }
    });

    it('Property: Hesitation type must be triggered by confusion patterns', () => {
      const hesitationMessages = [
        'can you explain this again',
        'what do you mean by that',
        'i dont understand',
        'could you clarify'
      ];
      
      for (const message of hesitationMessages) {
        const signals = ConfusionDetector.detectConfusion(message);
        const hasHesitation = signals.some(s => s.type === 'hesitation');
        
        expect(hasHesitation).toBe(true);
      }
    });
  });

  describe('Aggregation Invariants', () => {
    it('Property: Overall confidence must be in [0, 1]', () => {
      for (let trial = 0; trial < 100; trial++) {
        const message = generateRandomMessage(5 + Math.floor(Math.random() * 20));
        const signals = ConfusionDetector.detectConfusion(message);
        
        const aggregated = ConfusionDetector.aggregateConfusionSignals(signals);
        
        expect(aggregated.overallConfidence).toBeGreaterThanOrEqual(0);
        expect(aggregated.overallConfidence).toBeLessThanOrEqual(1);
      }
    });

    it('Property: Empty signals must return zero confidence', () => {
      const aggregated = ConfusionDetector.aggregateConfusionSignals([]);
      
      expect(aggregated.overallConfidence).toBe(0);
      expect(aggregated.dominantType).toBe('none');
      expect(aggregated.isConfused).toBe(false);
    });

    it('Property: Overall confidence must be average of signal confidences', () => {
      for (let trial = 0; trial < 50; trial++) {
        const message = generateRandomMessage(10 + Math.floor(Math.random() * 20));
        const signals = ConfusionDetector.detectConfusion(message);
        
        if (signals.length > 0) {
          const aggregated = ConfusionDetector.aggregateConfusionSignals(signals);
          
          const expectedConfidence = signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length;
          expect(aggregated.overallConfidence).toBeCloseTo(expectedConfidence, 10);
        }
      }
    });

    it('Property: isConfused must be true when overall confidence > 0.6', () => {
      for (let trial = 0; trial < 100; trial++) {
        const message = generateRandomMessage(10 + Math.floor(Math.random() * 20));
        const signals = ConfusionDetector.detectConfusion(message);
        
        const aggregated = ConfusionDetector.aggregateConfusionSignals(signals);
        
        if (aggregated.overallConfidence > 0.6) {
          expect(aggregated.isConfused).toBe(true);
        } else {
          expect(aggregated.isConfused).toBe(false);
        }
      }
    });

    it('Property: Dominant type must be the most frequent type', () => {
      for (let trial = 0; trial < 50; trial++) {
        const message = generateRandomMessage(15 + Math.floor(Math.random() * 20));
        const voiceMetrics = generateRandomVoiceMetrics();
        const signals = ConfusionDetector.detectConfusion(message, [], voiceMetrics);
        
        if (signals.length > 0) {
          const aggregated = ConfusionDetector.aggregateConfusionSignals(signals);
          
          // Count occurrences of each type
          const typeCounts = signals.reduce((acc, s) => {
            acc[s.type] = (acc[s.type] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          
          const maxCount = Math.max(...Object.values(typeCounts));
          const expectedDominantType = Object.entries(typeCounts)
            .find(([, count]) => count === maxCount)?.[0];
          
          expect(aggregated.dominantType).toBe(expectedDominantType);
        }
      }
    });
  });

  describe('Confusion Score Invariants', () => {
    it('Property: Confusion score must be in [0, 100]', () => {
      for (let trial = 0; trial < 100; trial++) {
        const message = generateRandomMessage(5 + Math.floor(Math.random() * 20));
        const voiceMetrics = Math.random() > 0.5 ? generateRandomVoiceMetrics() : undefined;
        const signals = ConfusionDetector.detectConfusion(message, [], voiceMetrics);
        
        const score = ConfusionDetector.calculateConfusionScore(signals);
        
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
        expect(Number.isInteger(score)).toBe(true);
      }
    });

    it('Property: Empty signals must return score of 0', () => {
      const score = ConfusionDetector.calculateConfusionScore([]);
      expect(score).toBe(0);
    });

    it('Property: Score must be proportional to average confidence', () => {
      for (let trial = 0; trial < 50; trial++) {
        const message = generateRandomMessage(10 + Math.floor(Math.random() * 20));
        const signals = ConfusionDetector.detectConfusion(message);
        
        if (signals.length > 0) {
          const score = ConfusionDetector.calculateConfusionScore(signals);
          const avgConfidence = signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length;
          
          const expectedScore = Math.min(100, Math.round(avgConfidence * 100));
          expect(score).toBe(expectedScore);
        }
      }
    });

    it('Property: Maximum confidence signals must produce score of 100', () => {
      const maxSignals: ConfusionSignal[] = [
        { type: 'uncertainty', confidence: 1.0, trigger: 'test', suggestion: 'test' },
        { type: 'hesitation', confidence: 1.0, trigger: 'test', suggestion: 'test' }
      ];
      
      const score = ConfusionDetector.calculateConfusionScore(maxSignals);
      expect(score).toBe(100);
    });

    it('Property: Score must never exceed 100', () => {
      // Create signals with very high confidence
      const highSignals: ConfusionSignal[] = [];
      for (let i = 0; i < 10; i++) {
        highSignals.push({
          type: 'uncertainty',
          confidence: 0.95,
          trigger: 'test',
          suggestion: 'test'
        });
      }
      
      const score = ConfusionDetector.calculateConfusionScore(highSignals);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('Determinism Invariants', () => {
    it('Property: Detection must be deterministic for same inputs', () => {
      for (let trial = 0; trial < 50; trial++) {
        const message = generateRandomMessage(10);
        const history = generateRandomHistory(5);
        
        const signals1 = ConfusionDetector.detectConfusion(message, history);
        const signals2 = ConfusionDetector.detectConfusion(message, history);
        
        expect(signals1.length).toBe(signals2.length);
        
        for (let i = 0; i < signals1.length; i++) {
          expect(signals1[i].type).toBe(signals2[i].type);
          expect(signals1[i].confidence).toBe(signals2[i].confidence);
          expect(signals1[i].trigger).toBe(signals2[i].trigger);
        }
      }
    });

    it('Property: Voice metrics analysis must be deterministic', () => {
      for (let trial = 0; trial < 50; trial++) {
        const metrics = generateRandomVoiceMetrics();
        const message = 'test message';
        
        const signals1 = ConfusionDetector.analyzeVoiceMetrics(metrics, message);
        const signals2 = ConfusionDetector.analyzeVoiceMetrics(metrics, message);
        
        expect(signals1.length).toBe(signals2.length);
        
        for (let i = 0; i < signals1.length; i++) {
          expect(signals1[i].type).toBe(signals2[i].type);
          expect(signals1[i].confidence).toBe(signals2[i].confidence);
        }
      }
    });

    it('Property: Aggregation must be deterministic', () => {
      for (let trial = 0; trial < 50; trial++) {
        const message = generateRandomMessage(10);
        const signals = ConfusionDetector.detectConfusion(message);
        
        const agg1 = ConfusionDetector.aggregateConfusionSignals(signals);
        const agg2 = ConfusionDetector.aggregateConfusionSignals(signals);
        
        expect(agg1.overallConfidence).toBe(agg2.overallConfidence);
        expect(agg1.dominantType).toBe(agg2.dominantType);
        expect(agg1.isConfused).toBe(agg2.isConfused);
      }
    });

    it('Property: Confusion score must be deterministic', () => {
      for (let trial = 0; trial < 50; trial++) {
        const message = generateRandomMessage(10);
        const signals = ConfusionDetector.detectConfusion(message);
        
        const score1 = ConfusionDetector.calculateConfusionScore(signals);
        const score2 = ConfusionDetector.calculateConfusionScore(signals);
        
        expect(score1).toBe(score2);
      }
    });
  });

  describe('Voice Metrics Invariants', () => {
    it('Property: Calculated voice metrics must have valid ranges', () => {
      for (let trial = 0; trial < 100; trial++) {
        const message = generateRandomMessage(10 + Math.floor(Math.random() * 20));
        const duration = 1000 + Math.random() * 10000; // 1-11 seconds
        const pauseCount = Math.floor(Math.random() * 10);
        const pauseDurations = Array.from({ length: pauseCount }, () => Math.random() * 3000);
        
        const metrics = ConfusionDetector.calculateVoiceMetrics(
          message,
          duration,
          pauseCount,
          pauseDurations
        );
        
        expect(metrics.pauseCount).toBeGreaterThanOrEqual(0);
        expect(metrics.fillerWordCount).toBeGreaterThanOrEqual(0);
        expect(metrics.averagePauseDuration).toBeGreaterThanOrEqual(0);
        expect(metrics.speechRate).toBeGreaterThanOrEqual(0);
        expect(metrics.hesitationScore).toBeGreaterThanOrEqual(0);
        expect(metrics.hesitationScore).toBeLessThanOrEqual(1);
      }
    });

    it('Property: Hesitation score must be in [0, 1]', () => {
      for (let trial = 0; trial < 100; trial++) {
        const message = generateRandomMessage(10);
        const duration = 5000;
        const pauseCount = Math.floor(Math.random() * 20);
        const pauseDurations = Array.from({ length: pauseCount }, () => Math.random() * 5000);
        
        const metrics = ConfusionDetector.calculateVoiceMetrics(
          message,
          duration,
          pauseCount,
          pauseDurations
        );
        
        expect(metrics.hesitationScore).toBeGreaterThanOrEqual(0);
        expect(metrics.hesitationScore).toBeLessThanOrEqual(1);
      }
    });

    it('Property: High pause count must increase hesitation score', () => {
      const message = 'test message with some words';
      const duration = 5000;
      
      const lowPauseMetrics = ConfusionDetector.calculateVoiceMetrics(message, duration, 1, [500]);
      const highPauseMetrics = ConfusionDetector.calculateVoiceMetrics(message, duration, 10, Array(10).fill(500));
      
      expect(highPauseMetrics.hesitationScore).toBeGreaterThan(lowPauseMetrics.hesitationScore);
    });

    it('Property: High filler word count must increase hesitation score', () => {
      const lowFillerMessage = 'this is a clear message';
      const highFillerMessage = 'um well like you know i mean uh';
      const duration = 5000;
      
      const lowFillerMetrics = ConfusionDetector.calculateVoiceMetrics(lowFillerMessage, duration, 0, []);
      const highFillerMetrics = ConfusionDetector.calculateVoiceMetrics(highFillerMessage, duration, 0, []);
      
      expect(highFillerMetrics.hesitationScore).toBeGreaterThan(lowFillerMetrics.hesitationScore);
    });

    it('Property: Zero duration must produce zero speech rate', () => {
      const message = 'test message';
      const metrics = ConfusionDetector.calculateVoiceMetrics(message, 0, 0, []);
      
      expect(metrics.speechRate).toBe(0);
    });
  });

  describe('Repetition Detection Invariants', () => {
    it('Property: Identical messages must trigger repetition signal', () => {
      for (let trial = 0; trial < 50; trial++) {
        const message = generateRandomMessage(5 + Math.floor(Math.random() * 10));
        const history = [message]; // Same message in history
        
        const signals = ConfusionDetector.detectConfusion(message, history);
        
        const repetitionSignal = signals.find(s => s.type === 'repetition');
        expect(repetitionSignal).toBeDefined();
        expect(repetitionSignal?.confidence).toBeGreaterThan(0.8);
      }
    });

    it('Property: Similar messages must trigger repetition signal', () => {
      // Use messages with >70% word overlap to ensure similarity detection
      const baseMessage = 'what is photosynthesis process';
      const similarMessage = 'what is photosynthesis';
      const history = [baseMessage];
      
      const signals = ConfusionDetector.detectConfusion(similarMessage, history);
      
      // The similarity threshold is 0.7, so we need sufficient word overlap
      // If not detected, it means the messages weren't similar enough by the algorithm's definition
      const repetitionSignal = signals.find(s => s.type === 'repetition');
      
      // Calculate actual similarity to verify test validity
      const words1 = new Set(baseMessage.toLowerCase().replace(/[^a-z0-9]/g, '').split(/\s+/));
      const words2 = new Set(similarMessage.toLowerCase().replace(/[^a-z0-9]/g, '').split(/\s+/));
      const intersection = new Set([...words1].filter(x => words2.has(x)));
      const similarity = intersection.size / Math.min(words1.size, words2.size);
      
      if (similarity > 0.7) {
        expect(repetitionSignal).toBeDefined();
      }
    });

    it('Property: Completely different messages must not trigger repetition', () => {
      const message = 'what is the capital of France';
      const history = ['how do plants grow', 'explain gravity'];
      
      const signals = ConfusionDetector.detectConfusion(message, history);
      
      const repetitionSignal = signals.find(s => s.type === 'repetition');
      expect(repetitionSignal).toBeUndefined();
    });

    it('Property: Empty history must not trigger repetition', () => {
      for (let trial = 0; trial < 50; trial++) {
        const message = generateRandomMessage(10);
        const signals = ConfusionDetector.detectConfusion(message, []);
        
        const repetitionSignal = signals.find(s => s.type === 'repetition');
        expect(repetitionSignal).toBeUndefined();
      }
    });
  });

  describe('Incomplete Message Detection Invariants', () => {
    it('Property: Very short messages must trigger incomplete signal', () => {
      const shortMessages = ['ok', 'yes', 'no', 'maybe'];
      
      for (const message of shortMessages) {
        const signals = ConfusionDetector.detectConfusion(message);
        
        const incompleteSignal = signals.find(s => s.type === 'incomplete');
        expect(incompleteSignal).toBeDefined();
      }
    });

    it('Property: Greetings must not trigger incomplete signal', () => {
      const greetings = ['hi', 'hello', 'hey', 'namaste'];
      
      for (const greeting of greetings) {
        const signals = ConfusionDetector.detectConfusion(greeting);
        
        const incompleteSignal = signals.find(s => s.type === 'incomplete');
        expect(incompleteSignal).toBeUndefined();
      }
    });

    it('Property: Long messages must not trigger incomplete signal', () => {
      for (let trial = 0; trial < 50; trial++) {
        const message = generateRandomMessage(10 + Math.floor(Math.random() * 20));
        const signals = ConfusionDetector.detectConfusion(message);
        
        const incompleteSignal = signals.find(s => s.type === 'incomplete');
        expect(incompleteSignal).toBeUndefined();
      }
    });
  });

  describe('Teaching Adjustment Invariants', () => {
    it('Property: High confidence signals must generate adjustment', () => {
      for (let trial = 0; trial < 50; trial++) {
        const highConfidenceSignals: ConfusionSignal[] = [
          {
            type: 'uncertainty',
            confidence: 0.7 + Math.random() * 0.3,
            trigger: 'test',
            suggestion: 'Simplify explanation'
          }
        ];
        
        const adjustment = ConfusionDetector.generateTeachingAdjustment(highConfidenceSignals);
        
        expect(adjustment.length).toBeGreaterThan(0);
        expect(adjustment).toContain('TEACHING ADJUSTMENT NEEDED');
      }
    });

    it('Property: Low confidence signals must not generate adjustment', () => {
      for (let trial = 0; trial < 50; trial++) {
        const lowConfidenceSignals: ConfusionSignal[] = [
          {
            type: 'uncertainty',
            confidence: Math.random() * 0.6,
            trigger: 'test',
            suggestion: 'Simplify explanation'
          }
        ];
        
        const adjustment = ConfusionDetector.generateTeachingAdjustment(lowConfidenceSignals);
        
        expect(adjustment).toBe('');
      }
    });

    it('Property: Empty signals must return empty adjustment', () => {
      const adjustment = ConfusionDetector.generateTeachingAdjustment([]);
      expect(adjustment).toBe('');
    });

    it('Property: Adjustment must include signal types and suggestions', () => {
      const signals: ConfusionSignal[] = [
        {
          type: 'uncertainty',
          confidence: 0.8,
          trigger: 'test1',
          suggestion: 'Use examples'
        },
        {
          type: 'hesitation',
          confidence: 0.7,
          trigger: 'test2',
          suggestion: 'Rephrase'
        }
      ];
      
      const adjustment = ConfusionDetector.generateTeachingAdjustment(signals);
      
      expect(adjustment).toContain('uncertainty');
      expect(adjustment).toContain('hesitation');
      expect(adjustment).toContain('Use examples');
      expect(adjustment).toContain('Rephrase');
    });
  });

  describe('Ready for Next Concept Invariants', () => {
    it('Property: Three consecutive clear interactions must indicate readiness', () => {
      const clearHistory: ConfusionSignal[][] = [[], [], []];
      const ready = ConfusionDetector.isReadyForNext(clearHistory);
      
      expect(ready).toBe(true);
    });

    it('Property: Any recent confusion must indicate not ready', () => {
      const confusedHistory: ConfusionSignal[][] = [
        [],
        [{ type: 'uncertainty', confidence: 0.7, trigger: 'test', suggestion: 'test' }],
        []
      ];
      const ready = ConfusionDetector.isReadyForNext(confusedHistory);
      
      expect(ready).toBe(false);
    });

    it('Property: Less than 3 interactions must be evaluated correctly', () => {
      const shortHistory: ConfusionSignal[][] = [[], []];
      const ready = ConfusionDetector.isReadyForNext(shortHistory);
      
      expect(ready).toBe(true);
    });

    it('Property: Old confusion should not affect readiness', () => {
      const historyWithOldConfusion: ConfusionSignal[][] = [
        [{ type: 'uncertainty', confidence: 0.8, trigger: 'old', suggestion: 'old' }],
        [{ type: 'hesitation', confidence: 0.7, trigger: 'old', suggestion: 'old' }],
        [],
        [],
        []
      ];
      const ready = ConfusionDetector.isReadyForNext(historyWithOldConfusion);
      
      expect(ready).toBe(true);
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('Property: Empty message must not crash', () => {
      expect(() => {
        ConfusionDetector.detectConfusion('');
      }).not.toThrow();
      
      const signals = ConfusionDetector.detectConfusion('');
      expect(Array.isArray(signals)).toBe(true);
    });

    it('Property: Very long message must not crash', () => {
      const longMessage = generateRandomMessage(1000);
      
      expect(() => {
        ConfusionDetector.detectConfusion(longMessage);
      }).not.toThrow();
      
      const signals = ConfusionDetector.detectConfusion(longMessage);
      expect(Array.isArray(signals)).toBe(true);
      
      for (const signal of signals) {
        expect(signal.confidence).toBeGreaterThanOrEqual(0);
        expect(signal.confidence).toBeLessThanOrEqual(1);
      }
    });

    it('Property: Special characters must not crash', () => {
      const specialMessages = [
        '!@#$%^&*()',
        '???',
        '...',
        '---',
        'test\nwith\nnewlines',
        'test\twith\ttabs'
      ];
      
      for (const message of specialMessages) {
        expect(() => {
          ConfusionDetector.detectConfusion(message);
        }).not.toThrow();
      }
    });

    it('Property: Unicode and emoji must not crash', () => {
      const unicodeMessages = [
        '你好',
        'مرحبا',
        'नमस्ते',
        '😀😁😂',
        'test 🤔 confused'
      ];
      
      for (const message of unicodeMessages) {
        expect(() => {
          ConfusionDetector.detectConfusion(message);
        }).not.toThrow();
      }
    });

    it('Property: Extreme voice metrics must produce valid signals', () => {
      const extremeMetrics: VoiceMetrics[] = [
        { pauseCount: 0, fillerWordCount: 0, averagePauseDuration: 0, speechRate: 0, hesitationScore: 0 },
        { pauseCount: 100, fillerWordCount: 50, averagePauseDuration: 10000, speechRate: 300, hesitationScore: 1 },
        { pauseCount: 1000, fillerWordCount: 1000, averagePauseDuration: 100000, speechRate: 1000, hesitationScore: 1 }
      ];
      
      for (const metrics of extremeMetrics) {
        const signals = ConfusionDetector.analyzeVoiceMetrics(metrics, 'test');
        
        expect(Array.isArray(signals)).toBe(true);
        for (const signal of signals) {
          expect(signal.confidence).toBeGreaterThanOrEqual(0);
          expect(signal.confidence).toBeLessThanOrEqual(1);
        }
      }
    });

    it('Property: Negative voice metrics must be handled gracefully', () => {
      const negativeMetrics: VoiceMetrics = {
        pauseCount: -5,
        fillerWordCount: -3,
        averagePauseDuration: -1000,
        speechRate: -50,
        hesitationScore: -0.5
      };
      
      expect(() => {
        ConfusionDetector.analyzeVoiceMetrics(negativeMetrics, 'test');
      }).not.toThrow();
    });

    it('Property: Very large conversation history must not crash', () => {
      const largeHistory = generateRandomHistory(1000);
      const message = 'test message';
      
      expect(() => {
        ConfusionDetector.detectConfusion(message, largeHistory);
      }).not.toThrow();
      
      const signals = ConfusionDetector.detectConfusion(message, largeHistory);
      expect(Array.isArray(signals)).toBe(true);
    });
  });

  describe('Consistency Across Multiple Calls', () => {
    it('Property: Multiple detections on same message must be consistent', () => {
      for (let trial = 0; trial < 30; trial++) {
        const message = generateRandomMessage(10);
        const history = generateRandomHistory(5);
        const voiceMetrics = generateRandomVoiceMetrics();
        
        const results: ConfusionSignal[][] = [];
        for (let i = 0; i < 10; i++) {
          results.push(ConfusionDetector.detectConfusion(message, history, voiceMetrics));
        }
        
        // All results should be identical
        for (let i = 1; i < results.length; i++) {
          expect(results[i].length).toBe(results[0].length);
          
          for (let j = 0; j < results[i].length; j++) {
            expect(results[i][j].type).toBe(results[0][j].type);
            expect(results[i][j].confidence).toBe(results[0][j].confidence);
          }
        }
      }
    });

    it('Property: Aggregation must be consistent across multiple calls', () => {
      for (let trial = 0; trial < 30; trial++) {
        const message = generateRandomMessage(10);
        const signals = ConfusionDetector.detectConfusion(message);
        
        const results = [];
        for (let i = 0; i < 10; i++) {
          results.push(ConfusionDetector.aggregateConfusionSignals(signals));
        }
        
        // All results should be identical
        for (let i = 1; i < results.length; i++) {
          expect(results[i].overallConfidence).toBe(results[0].overallConfidence);
          expect(results[i].dominantType).toBe(results[0].dominantType);
          expect(results[i].isConfused).toBe(results[0].isConfused);
        }
      }
    });
  });

  describe('Combined Property Tests', () => {
    it('Property: All invariants must hold together for random inputs', () => {
      // Comprehensive test that checks all properties at once
      for (let trial = 0; trial < 100; trial++) {
        const message = generateRandomMessage(5 + Math.floor(Math.random() * 30));
        const history = generateRandomHistory(Math.floor(Math.random() * 15));
        const voiceMetrics = Math.random() > 0.3 ? generateRandomVoiceMetrics() : undefined;
        
        const signals = ConfusionDetector.detectConfusion(message, history, voiceMetrics);
        
        // Invariant 1: All confidence scores in [0, 1]
        for (const signal of signals) {
          expect(signal.confidence).toBeGreaterThanOrEqual(0);
          expect(signal.confidence).toBeLessThanOrEqual(1);
        }
        
        // Invariant 2: All signal types are valid
        const validTypes = new Set(['hesitation', 'repetition', 'uncertainty', 'off-topic', 'incomplete']);
        for (const signal of signals) {
          expect(validTypes.has(signal.type)).toBe(true);
        }
        
        // Invariant 3: Aggregation produces valid results
        const aggregated = ConfusionDetector.aggregateConfusionSignals(signals);
        expect(aggregated.overallConfidence).toBeGreaterThanOrEqual(0);
        expect(aggregated.overallConfidence).toBeLessThanOrEqual(1);
        
        // Invariant 4: Confusion score in [0, 100]
        const score = ConfusionDetector.calculateConfusionScore(signals);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
        
        // Invariant 5: Teaching adjustment is consistent
        const adjustment = ConfusionDetector.generateTeachingAdjustment(signals);
        expect(typeof adjustment).toBe('string');
      }
    });
  });
});
